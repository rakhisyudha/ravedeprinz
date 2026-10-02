import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The themed scrollbar and the custom pointer are both progressive
// enhancements sitting on top of the shared design tokens, so what is asserted
// here is the contract that makes them safe: the pointer must never be able to
// take the native cursor away from someone who cannot use it, and the
// scrollbar must stay visible and themed rather than hardcoded to the dark
// shell.
const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

const css = read('../../src/styles/global.css');
const pointer = read('../../src/components/PointerGlyph.svelte');
const base = read('../../src/layouts/Base.astro');
const menu = read('../../src/components/Menu.svelte');

describe('themed scrollbar', () => {
  test('it stays visible and functional, only restyled', () => {
    // Regression guard: `scrollbar-width: none` or `display: none` anywhere in
    // the scrollbar block would leave keyboard users with no way to see where
    // they are on the page.
    expect(css).not.toMatch(/scrollbar-width:\s*none/);
    expect(css).not.toMatch(/::-webkit-scrollbar[^{]*\{[^}]*display:\s*none/);
    expect(css).toContain('scrollbar-width:thin;');
  });

  test('both engines are covered from one token set', () => {
    // Standard (Firefox) on the root so it inherits, plus the WebKit family
    // for Chromium and Safari. Both resolve the same tokens, so the palette
    // cannot differ between engines.
    expect(css).toMatch(/html \{ scrollbar-color:var\(--scrollbar-thumb\) var\(--scrollbar-track\); scrollbar-width:thin; \}/);
    expect(css).toContain('::-webkit-scrollbar { width:var(--scrollbar-size);');
    expect(css).toContain('::-webkit-scrollbar-track { background:var(--scrollbar-track); }');
    expect(css).toContain('::-webkit-scrollbar-thumb { background:var(--scrollbar-thumb); border:0; border-radius:0; }');
    expect(css).toContain('::-webkit-scrollbar-thumb:hover,\n::-webkit-scrollbar-thumb:active { background:var(--scrollbar-thumb-active); }');
  });

  test('the thumb is the accent, muted at rest and full under the pointer', () => {
    expect(css).toMatch(/--scrollbar-thumb:\s*color-mix\(in srgb, var\(--red\) \d+%, var\(--background\)\)/);
    expect(css).toMatch(/--scrollbar-thumb-active:\s*var\(--red\)/);
  });

  test('the light theme follows its own surface rather than the dark values', () => {
    // Regression guard: reusing `var(--background)` here is what makes a themed
    // scrollbar silently keep the dark shell's track on a light page. Matched
    // directly rather than by slice, because the sheet has two `:root` blocks
    // and the scrollbar one is not the first.
    expect(css).toMatch(/--scrollbar-track:\s*var\(--background\);/);
    expect(css).toMatch(/--scrollbar-track:\s*var\(--surface\);/);
    expect(css).toMatch(/--scrollbar-thumb:\s*color-mix\(in srgb, var\(--red\) \d+%, var\(--surface\)\);/);
    // Each shell value appears exactly once, so neither theme can be
    // shadowed by the other's.
    expect(css.match(/--scrollbar-track:/g)).toHaveLength(2);
    // And the light overrides really do sit in the light theme block.
    const lightStart = css.indexOf('html[data-theme="light"] {', css.indexOf('--scrollbar-track:'));
    expect(lightStart).toBeGreaterThan(0);
    expect(css.slice(lightStart, css.indexOf('}', lightStart))).toMatch(/--scrollbar-track:\s*var\(--surface\)/);
  });

  test('it stays angular and thin, and stays out of the reading-progress bar', () => {
    // No pill: everything else on this site is clipped corners and skewed
    // rules, and a rounded bar reads as borrowed OS chrome.
    expect(css).toContain('border-radius:0;');
    expect(css).not.toMatch(/::-webkit-scrollbar-thumb[^{]*\{[^}]*border-radius:\s*[1-9]/);
    expect(css).toMatch(/--scrollbar-size:\s*9px/);
    expect(css).toMatch(/@media \(max-width:600px\) \{ :root \{ --scrollbar-size:7px; \} \}/);
    // Deliberately separate: `.reading-progress` is the prominent horizontal
    // scroll indicator on note pages and must not be restyled or merged here.
    expect(css).toContain('.reading-progress { position: fixed; top: 0; left: 0; z-index: 80;');
  });
});

describe('custom pointer', () => {
  test('it is mounted once, from the root layout', () => {
    expect(base).toContain("import PointerGlyph from '../components/PointerGlyph.svelte';");
    // `client:load`, not idle/visible: it must exist before the first move or
    // the native cursor flashes and is then hidden.
    expect(base).toContain('<PointerGlyph client:load />');
    expect(base.match(/<PointerGlyph/g)).toHaveLength(1);
  });

  test('touch and reduced-motion users get no listeners at all', () => {
    // The gates run inside createRuntime(), before any `addEventListener`, so a
    // phone pays nothing: the function returns null and no runtime exists.
    const gates = pointer.slice(
      pointer.indexOf('function createRuntime()'),
      pointer.indexOf('const paint = () => {')
    );
    expect(gates).toContain("if (!window.matchMedia('(pointer: fine) and (hover: hover)').matches) return null;");
    expect(gates).toContain("if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;");
    // Both gates are early returns, so the loop never starts.
    expect(pointer).toContain('cancelAnimationFrame(frame)');
    // The instance script only bails on the same null, so a touch device never
    // reaches attach() either.
    expect(pointer).toContain('if (!runtime) return;');
  });

  test('the native cursor is only hidden once the custom one is confirmed', () => {
    // Progressive enhancement: the stylesheet keys off a class the script adds
    // after its gate passes, so a script failure leaves a working cursor rather
    // than an invisible one. The media query is a second gate on the same
    // condition.
    expect(pointer).toContain("root.classList.add('has-custom-cursor');");
    expect(pointer).toContain("root.classList.remove('has-custom-cursor');");
    expect(css).toMatch(/@media \(pointer: fine\) and \(hover: hover\) \{\n\s*html\.has-custom-cursor,/);
    // Text entry keeps its caret.
    expect(css).toMatch(/html\.has-custom-cursor input,\n\s*html\.has-custom-cursor textarea,\n\s*html\.has-custom-cursor select,\n\s*html\.has-custom-cursor \[contenteditable\] \{ cursor:auto; \}/);
  });

  test('the takeover is armed on proof of life, never on assumption', () => {
    // The regression that produced a page with no cursor at all: the class used
    // to be added at mount, gated only on the media queries, while the glyph
    // stayed at `opacity: 0` until its FIRST pointermove. Any environment where
    // `pointermove` on document never arrived (an input emulator or extension, a
    // blocked script, a container swallowing events) hid the native cursor and
    // showed nothing in its place.
    //
    // So the ordering is the contract, and it is asserted:
    //   gates -> guarded first paint -> listeners -> arm() on a real event -> class.
    //
    // arm() and disarm() are now the ONLY two writers of the class. That is the
    // invariant that makes the failure mode unrepresentable: the native cursor
    // is hidden if and only if the replacement is already visible.
    expect(pointer.match(/classList\.add\('has-custom-cursor'\)/g)).toHaveLength(1);
    expect(pointer.match(/classList\.remove\('has-custom-cursor'\)/g)).toHaveLength(1);

    const arm = pointer.slice(pointer.indexOf('const arm = () => {'), pointer.indexOf('const disarm = () => {'));
    expect(arm).toContain("root.classList.add('has-custom-cursor');");
    // Visibility is published in the same breath as the class, never after it.
    expect(arm).toContain('setVisible(true);');
    expect(arm.indexOf('setVisible(true);')).toBeLessThan(arm.indexOf("classList.add('has-custom-cursor')"));

    const disarm = pointer.slice(pointer.indexOf('const disarm = () => {'), pointer.indexOf('const onMove ='));
    expect(disarm).toContain("root.classList.remove('has-custom-cursor');");
    expect(disarm).toContain('setVisible(false);');

    // arm() is reached only from a real pointer event.
    expect(pointer).toMatch(/const onMove = \(event: PointerEvent\) => \{[\s\S]*?\barm\(\);/);
    expect(pointer).toContain('const onEnter = () => arm();');
  });

  test('the glyph is shown by a scoped class, never an unscoped attribute selector', () => {
    // The regression that left the glyph at opacity 0 forever. Svelte scopes
    // `.pointer-glyph` but drops the scope hash from a modifier written as
    // `.pointer-glyph[data-state='inside']`, emitting it as a BARE GLOBAL rule.
    // That tied it on specificity with the `opacity: 0` base, so the outcome
    // depended on source order, and it leaked to any element sharing the
    // class. Attribute-based state is therefore unusable in scoped styles.
    // Scoped to the style block: the prose in the component deliberately quotes
    // the broken selector to explain why it is gone, and a bare-word search over
    // the whole file would match those comments.
    const styles = pointer.slice(pointer.indexOf('<style>'));
    expect(styles).not.toMatch(/^\s*\.pointer-glyph\[/m);
    expect(styles).not.toMatch(/^\s*\.pointer-glyph:\[/m);
    // Class modifiers are scoped reliably, and repeating the base class makes
    // the modifier beat the base rule on specificity outright, so neither
    // scoping nor source order is load-bearing.
    expect(styles).toContain('.pointer-glyph.pointer-glyph--visible { opacity: 1; }');
    expect(pointer).toContain('class:pointer-glyph--visible={visible}');
    expect(pointer).toContain('class:pointer-glyph--hover={hovered}');
    // The base still starts hidden, so nothing is visible until it is armed.
    expect(pointer).toMatch(/\.pointer-glyph \{[^}]*opacity:\s*0;/);
    // No imperative attribute writes: Svelte owns the class list, so it cannot
    // be reverted out from under the script. Bounded to the markup, since the
    // comments quote the removed attribute to explain why it is gone.
    expect(pointer).not.toContain('dataset');
    const markup = pointer.slice(pointer.lastIndexOf('</script>'));
    expect(markup).toContain('class:pointer-glyph--visible={visible}');
    expect(markup).toContain('class:pointer-glyph--hover={hovered}');
    expect(pointer).toContain('let visible = $state(false);');
    expect(pointer).toContain('let hovered = $state(false);');
  });

  test('a mounted failure cannot leave the native cursor hidden', () => {
    // The failure simulation, as an ordering proof. Every path that does NOT
    // reach a confirmed pointer event must leave the class off:
    //   - no fine pointer            -> createRuntime returns null
    //   - prefers-reduced-motion     -> createRuntime returns null
    //   - no element                 -> onMount returns before attach()
    //   - mounted, but no event ever -> loop runs, class is never added
    // and only the last path, a real event arriving, arms it.
    expect(pointer).toContain('const el = cursor;');
    expect(pointer).toMatch(/const el = cursor;\s*\n\s*if \(!el\) return;/);
    // The class add is reachable only from arm(), and arm() only from events.
    const beforeArm = pointer.slice(0, pointer.indexOf('const arm = () => {'));
    expect(beforeArm).not.toContain("classList.add('has-custom-cursor')");
    // Teardown removes it regardless, so a client-side navigation cannot strand
    // the page without a cursor either.
    expect(pointer).toContain("root.classList.remove('has-custom-cursor');");
  });

  test('one runtime per document, so a remount cannot duplicate the cursor', () => {
    // The disappearing-cursor bug was a lifecycle bug, not a CSS bug. The client
    // router swaps <body> on every soft navigation, destroying and rebuilding
    // the island, while <html> persists. State that lived in the island died with
    // it and left `has-custom-cursor` on <html> with no visible glyph behind it.
    //
    // The fix is scope, not retry: the runtime lives at MODULE scope, so it
    // outlives the island and is re-pointed at the new element. One rAF loop,
    // one set of listeners, one cursor, however many navigations.
    expect(pointer).toContain('<script module lang="ts">');
    expect(pointer).toContain('let runtime: Runtime | null = null;');
    // Created lazily and only once: the second mount adopts rather than rebuilds.
    expect(pointer).toMatch(/if \(!runtime\) \{\s*\n\s*runtime = createRuntime\(\);/);
    expect(pointer).toContain('runtime.attach(el, paint);');
    expect(pointer).toContain('return () => runtime?.release(el);');

    // attach() re-publishes state into the NEW element rather than assuming it
    // is in sync: a fresh island starts with its own component state at the
    // defaults, so a remount mid-hover would otherwise drop the hover.
    const attach = pointer.slice(pointer.indexOf('attach(node, sink) {'), pointer.indexOf('release(node) {'));
    expect(attach).toContain('setVisible(armed);');
    expect(attach).toContain('setHovered(hovering);');

    // release() is a no-op unless it still owns the element, which is what stops
    // a stale teardown from disarming the cursor the new island just attached.
    const release = pointer.slice(pointer.indexOf('release(node) {'), pointer.indexOf('}\n</script>'));
    expect(release).toContain('if (el !== node) return;');
    expect(release).toContain('disarm();');

    // No polling, and the loop start is idempotent so repeated lifecycle hooks
    // cannot stack up duplicate rAF loops.
    expect(pointer).not.toContain('setInterval');
    expect(pointer).toMatch(/const run = \(\) => \{\s*\n\s*if \(frame\) return;/);
  });

  test('it reconciles on soft navigation and on bfcache restore', () => {
    // Both lifecycle events can otherwise land the page in the broken state:
    // `has-custom-cursor` still on <html> from the previous page, with a fresh
    // island whose glyph is at `opacity: 0`. That is exactly "the cursor
    // vanished, a hard refresh brings it back".
    expect(pointer).toContain("document.addEventListener('astro:page-load', resync);");
    expect(pointer).toContain("window.addEventListener('pageshow', resync);");

    // resync re-asserts from `armed`, the single source of truth, so the class
    // and the visible glyph cannot disagree, and restarts a loop a frozen page
    // dropped while in the back/forward cache.
    const resync = pointer.slice(
      pointer.indexOf('const resync = () => {'),
      pointer.indexOf("document.addEventListener('pointermove'")
    );
    expect(resync).toMatch(/root\.classList\.contains\('has-custom-cursor'\) !== armed/);
    expect(resync).toContain('paint();');
    expect(resync).toContain('run();');
  });

  test('the follow runs on rAF and moves with translate3d only', () => {
    // pointermove records a target; the loop eases and writes. No top/left, so
    // the element stays on the compositor and there is one write per frame.
    expect(pointer).toContain('el.style.transform =\n        `translate3d(${x}px, ${y}px, 0) scale(${hovering ? HOVER_SCALE : 1})');
    expect(pointer).toContain('frame = requestAnimationFrame(step);');
    expect(pointer).toContain("document.addEventListener('pointermove', onMove, { passive: true });");
    // A CSS transition on transform would fight the per-frame writes.
    expect(pointer).toMatch(/\.pointer-glyph \{[^}]*transition:\s*opacity/);
    expect(pointer).not.toMatch(/\.pointer-glyph \{[^}]*transition:[^}]*transform/);
  });

  test('it is inert and above every layer', () => {
    // pointer-events: none is what makes a z-index above the menu scene, the
    // auth overlay and the admin dropdown safe; it can never intercept a click
    // meant for them. Highest layer in the app is z-index 90.
    expect(pointer).toMatch(/\.pointer-glyph \{[^}]*z-index:\s*9999;[^}]*pointer-events:\s*none;/);
  });

  test('it borrows the site\'s shapes and takes its colour from tokens', () => {
    // Diamond cuts like `.project-index`, no radius. The component picks NO
    // colour at all: both fills read tokens that the stylesheet re-points per
    // theme and while the red menu is open, so a theme toggle or a menu toggle
    // needs no script and no re-render.
    expect(pointer.match(/clip-path:\s*polygon\(50% 0, 100% 50%, 50% 100%, 0 50%\)/g)).toHaveLength(2);
    expect(pointer).toMatch(/\.pointer-glyph::before \{[^}]*background:\s*var\(--cursor-fill\)/);
    expect(pointer).toMatch(/\.pointer-glyph::after \{[^}]*background:\s*var\(--cursor-core\)/);
    // No literal colour anywhere, so the cursor cannot drift from the theme.
    expect(pointer).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba?\(/);
    expect(pointer).not.toContain('border-radius');
    // Hover reaction, published because a pointer-events:none element can
    // never match :hover itself.
    expect(pointer).toContain('hovering = node instanceof Element && node.closest(INTERACTIVE) !== null;');
    expect(pointer).toContain('setHovered(hovering);');
    expect(pointer).toMatch(/\.pointer-glyph\.pointer-glyph--hover::before \{ opacity: \.95;/);
    expect(pointer).toContain('const HOVER_SCALE = 1.9;');
    expect(pointer).toContain('const HOVER_ROTATE = 45;');
  });
});

describe('cursor colour across themes and the red menu', () => {
  test('the default is the red accent, and light mode flips to the near-black', () => {
    // Dark mode keeps the existing red cursor unchanged; light mode uses the
    // site's own near-black so it stays legible on the light background. Both
    // come from tokens the component reads, so no JS is involved.
    expect(css).toMatch(/--cursor-fill:var\(--red\); --cursor-core:var\(--paper\);/);
    const light = css.slice(css.indexOf('html[data-theme="light"] {'), css.indexOf('html.menu-open'));
    expect(light).toMatch(/--cursor-fill:\s*var\(--ink\)/);
  });

  test('the red menu forces the near-black fill in BOTH themes', () => {
    // The menu paints the viewport red regardless of theme, so the red cursor
    // has to flip in dark mode too. `--ink` and `--paper` are declared in :root
    // only and never overridden in the light block, which is what makes one rule
    // valid in both themes.
    expect(css).toContain('html.menu-open { --cursor-fill:var(--ink); }');
    // Same specificity as the light rule, and both override :root, so neither
    // depends on winning a source-order race against the other.
    const rootFill = css.indexOf('--cursor-fill:var(--red)');
    const lightFill = css.indexOf('--cursor-fill:var(--ink)');
    const menuFill = css.indexOf('html.menu-open { --cursor-fill:var(--ink); }');
    expect(rootFill).toBeLessThan(lightFill);
    expect(lightFill).toBeLessThan(menuFill);
    // The reticle stays `--paper` so it reads against the near-black fill; a
    // dark reticle on a black cursor would vanish.
    expect(css).not.toMatch(/html\.menu-open \{[^}]*--cursor-core/);
  });

  test('the menu state is published from the menu\'s own open flag', () => {
    // Not from viewport width, pointer type or hover capability: the menu opens
    // at any size and a mouse opens it just as well as a finger, so all three
    // would be wrong. One class on <html>, straight from `open`.
    expect(menu).toMatch(/\$effect\(\(\) => \{\s*\n\s*document\.documentElement\.classList\.toggle\('menu-open', open\);/);
    // Removed on destroy rather than in the effect cleanup, which would also run
    // before every re-run and flicker the class on each toggle. Without this a
    // navigation with the menu open would strand `menu-open` on <html>.
    expect(menu).toMatch(/onDestroy\(\(\) => \{\s*\n\s*if \(typeof document === 'undefined'\) return;\s*\n\s*document\.documentElement\.classList\.remove\('menu-open'\);/);
    expect(menu).toContain("import { onDestroy } from 'svelte';");
    // Pure state plumbing: the menu chooses no colours and the cursor never
    // learns a menu exists.
    expect(menu).not.toContain('--cursor-fill');
    expect(menu).not.toContain('matchMedia');
    expect(menu).not.toContain('innerWidth');
  });

  test('the menu state never depends on geometry, input type or blending', () => {
    // Guard against a "fix" that infers the red background instead of reading
    // the real state. All three would break real usage.
    expect(pointer).not.toContain('menu-open');
    expect(pointer).not.toContain('mix-blend-mode');
    expect(css).not.toContain('mix-blend-mode: difference');
    // No second cursor: one element, mounted once from the layout.
    expect(base.match(/<PointerGlyph/g)).toHaveLength(1);
  });

  test('the theme architecture and menu animation are untouched', () => {
    // The colour change is additive tokens only: no theme block, transition or
    // responsive rule was edited.
    expect(base).toContain('name="color-scheme" content="dark light"');
    expect(base).toContain("root.setAttribute('data-theme', theme);");
    expect(base).toContain('<ClientRouter />');
    // The menu's own wipe transition is unchanged.
    expect(menu).toContain('<div class="menu-scene" in:wipeIn out:wipeOut>');
  });
});