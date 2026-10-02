<script module lang="ts">
  /** Fraction of the remaining distance covered per frame. */
  const EASE = 0.18;
  /** Interactive shapes are about 2x, so the reaction reads at a glance. */
  const HOVER_SCALE = 1.9;
  /** A diamond turned 45deg is a square: the two states read as different cuts. */
  const HOVER_ROTATE = 45;

  /** Anything the pointer should react to. Mirrors the stylesheet's list. */
  const INTERACTIVE =
    'a, button, summary, label, [role="button"], .row-hover, .bracket-btn, .scene-link, .cut, .cut-small';

  type Paint = {
    setVisible: (value: boolean) => void;
    setHovered: (value: boolean) => void;
  };

  type Runtime = {
    /** Binds the runtime to a (possibly new) element and re-publishes state. */
    attach: (el: HTMLSpanElement, paint: Paint) => void;
    /** Detaches only if `el` is still the attached one, so a stale teardown is inert. */
    release: (el: HTMLSpanElement) => void;
  };

  /**
   * One runtime per JavaScript context, not per island instance.
   *
   * Module scope is the whole point. The Astro client router keeps a single JS
   * context alive across soft navigations, so this binding survives the <body>
   * swap while the island that owns it is destroyed and rebuilt. That is why
   * `attach` exists: the listeners, the rAF loop and the armed state live here
   * and outlive any individual island, so a remount re-points them at the new
   * element instead of building a second cursor. One element, one loop, one set
   * of listeners, no matter how many navigations.
   */
  let runtime: Runtime | null = null;

  function createRuntime(): Runtime | null {
    // Cheap gates first: nothing is attached on touch or under reduced motion.
    if (!window.matchMedia('(pointer: fine) and (hover: hover)').matches) return null;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

    const root = document.documentElement;

    let el: HTMLSpanElement | null = null;
    let setVisible: Paint['setVisible'] = () => {};
    let setHovered: Paint['setHovered'] = () => {};

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let x = targetX;
    let y = targetY;

    let hovering = false;
    let armed = false;
    let frame = 0;

    const paint = () => {
      if (!el) return;
      // translate3d only, never top/left, so this stays on the compositor.
      // No CSS transition on transform: that would fight these per-frame writes.
      el.style.transform =
        `translate3d(${x}px, ${y}px, 0) scale(${hovering ? HOVER_SCALE : 1}) rotate(${hovering ? HOVER_ROTATE : 0}deg)`;
    };

    const step = () => {
      x += (targetX - x) * EASE;
      y += (targetY - y) * EASE;
      paint();
      frame = requestAnimationFrame(step);
    };

    /** Idempotent, so every lifecycle hook can call it without stacking loops. */
    const run = () => {
      if (frame) return;
      frame = requestAnimationFrame(step);
    };

    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    /**
     * `armed` and the `has-custom-cursor` class are one state with exactly two
     * writers, arm and disarm. Nothing else is allowed to add or remove the
     * class. That is the invariant that keeps the failure mode impossible: the
     * native cursor is only ever hidden while the replacement is already
     * visible, so the two can never disagree and leave no cursor at all.
     */
    const arm = () => {
      if (armed) return;
      armed = true;
      setVisible(true);
      root.classList.add('has-custom-cursor');
    };

    const disarm = () => {
      if (!armed) return;
      armed = false;
      hovering = false;
      setHovered(false);
      setVisible(false);
      root.classList.remove('has-custom-cursor');
    };

    const onMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      const node = event.target;
      // The glyph is `pointer-events: none`, so it can never match `:hover`
      // itself; the state has to be published for the stylesheet to react to.
      // The transform is still written per frame, so the scale/rotate follows
      // the same easing as the position rather than snapping.
      hovering = node instanceof Element && node.closest(INTERACTIVE) !== null;
      setHovered(hovering);
      arm();
    };

    const onEnter = () => arm();

    /** Retracts at the window edge instead of stranding itself there. */
    const onLeave = () => disarm();

    /**
     * Reconciles after a lifecycle transition.
     *
     * `astro:page-load` covers soft navigation; `pageshow` covers bfcache
     * restoration, where the DOM comes back but the fresh island has not
     * hydrated. Both paths can otherwise leave the class on <html> with a
     * hidden glyph, which is precisely "the cursor disappeared". Re-asserting
     * from `armed`, the single source of truth, repairs that instead of
     * papering over it, and `run()` restarts a loop a frozen page dropped.
     */
    const resync = () => {
      if (root.classList.contains('has-custom-cursor') !== armed) {
        if (armed) arm();
        else disarm();
      }
      paint();
      run();
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerenter', onEnter);
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('astro:page-load', resync);
    window.addEventListener('pageshow', resync);

    return {
      attach(node, sink) {
        el = node;
        setVisible = sink.setVisible;
        setHovered = sink.setHovered;
        // Re-publish, never inherit. A remount starts with its own component
        // state at the defaults, so the runtime has to push the current armed
        // and hover values into it rather than assuming the new element is in
        // sync. This is what makes a remount mid-hover come back correctly.
        setVisible(armed);
        setHovered(hovering);
        paint();
        run();
      },
      release(node) {
        // A newer island already took over: its teardown is a no-op, and this
        // is what stops the old component's cleanup from disarming a cursor
        // that is still on screen.
        if (el !== node) return;
        el = null;
        stop();
        disarm();
      },
    };
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';

  let cursor: HTMLSpanElement | undefined = $state();

  /**
   * Visibility and hover are Svelte state rather than attributes poked in by
   * hand, for two reasons.
   *
   * Svelte scopes `.pointer-glyph` but silently drops the scope hash from a
   * modifier written as `.pointer-glyph[data-state='inside']`, emitting it as a
   * bare global rule. That left the `opacity: 0` base and the `opacity: 1`
   * modifier tied on specificity, decided only by source order, and leaking to
   * any unrelated element sharing the class. Attribute-based state is therefore
   * not usable in scoped styles at all; plain class modifiers are scoped
   * reliably.
   *
   * And keeping them in `$state` means Svelte owns the class list, so it cannot
   * be reverted out from under the runtime. The per-frame `transform` stays
   * imperative -- it is not in the template and must not cost a re-render per
   * frame.
   *
   * Colour is not handled here at all. Both fills come from tokens
   * (`--cursor-fill`, `--cursor-core`) that the stylesheet re-points per theme
   * and while the red menu is open, so a theme change or a menu toggle needs no
   * script, no re-render and no second cursor.
   */
  let visible = $state(false);
  let hovered = $state(false);

  onMount(() => {
    const el = cursor;
    if (!el) return;

    // Created at most once per JS context; every later remount adopts it.
    if (!runtime) {
      runtime = createRuntime();
      // Coarse pointer or reduced motion: no runtime, no listeners, no class.
      if (!runtime) return;
    }

    const paint: Paint = {
      setVisible: (value) => {
        visible = value;
      },
      setHovered: (value) => {
        hovered = value;
      },
    };

    runtime.attach(el, paint);

    return () => runtime?.release(el);
  });
</script>

<span
  class="pointer-glyph"
  class:pointer-glyph--visible={visible}
  class:pointer-glyph--hover={hovered}
  bind:this={cursor}
  aria-hidden="true"
/>

<style>
  /* Above every layer in the app (the highest is `.auth-denied-overlay` at
     z-index 90), and inert: `pointer-events: none` is what makes that safe, so
     the glyph can sit over the fullscreen menu scene, the admin dropdown or a
     modal without intercepting a single click meant for them. */
  .pointer-glyph {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 9999;
    width: 16px;
    height: 16px;
    /* Half the box back, so translate3d() puts the glyph's centre under the
       pointer and scale/rotate happen about that centre. */
    margin: -8px 0 0 -8px;
    pointer-events: none;
    opacity: 0;
    transform-origin: center;
    transition: opacity .16s ease;
  }

  /* Plain class modifiers, never attribute selectors. Svelte scopes a compound
     class selector reliably but drops the scope hash from a modifier written as
     `.pointer-glyph[data-state=...]`, emitting it as a bare global rule, which
     tied it on specificity with the `opacity: 0` base and left the outcome to
     source order. Repeating the base class in each modifier also beats the base
     rule on specificity outright, so ordering is not load-bearing either way. */
  .pointer-glyph.pointer-glyph--visible { opacity: 1; }

  /* Outer cut: a diamond, echoing the `.project-index` shapes. Filled rather
     than stroked because `clip-path` cannot outline, so the inner reticle below
     supplies the "thin" read instead. */
  .pointer-glyph::before {
    content: '';
    position: absolute;
    inset: 0;
    /* Token, not a literal: the stylesheet re-points this per theme and while
       the red menu is open. */
    background: var(--cursor-fill);
    /* Diamond: no radius, matching the site's clipped-corner language. */
    clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
    opacity: .42;
  }

  /* Inner reticle: a small theme-aware diamond punched out of the accent, so
     the glyph reads as a stamped mark and never as a solid blob. */
  .pointer-glyph::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 5px;
    height: 5px;
    margin: -2.5px 0 0 -2.5px;
    background: var(--cursor-core);
    clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  }

  /* Hover: the transform grows and turns the diamond into a square (both
     written per frame by the rAF loop), and the fill firms up here so the mark
     reads as "this is clickable" rather than merely bigger. Transitioned on
     opacity and size only; a transition on transform would fight the per-frame
     writes. */
  .pointer-glyph.pointer-glyph--hover::before { opacity: .95; transition: opacity .14s ease; }
  .pointer-glyph.pointer-glyph--hover::after { width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px; transition: width .14s ease, height .14s ease, margin .14s ease; }
</style>