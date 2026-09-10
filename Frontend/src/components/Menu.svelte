<script lang="ts">
  // Port of components/Shell.tsx (menu half). Interaction parity:
  // clip-path wipe open/close, staggered rows with split numeral/label
  // timing, delayed close + login entrances, scroll-aware header.

  interface NavItem {
    href: string;
    label: string;
    display_number?: string | null;
  }

  interface Props {
    currentPath?: string;
    // Live CMS navigation (same rows the home page renders). Empty when the
    // CMS is unreachable — the island falls back to FALLBACK_LINKS below.
    navigation?: NavItem[];
  }

  const { currentPath = '/', navigation = [] } = $props();

  // Home (/) is structural, not CMS-editable, so it is prepended here while
  // every other entry comes from the single CMS navigation source.
  const FALLBACK_LINKS = [
    { href: '/', label: 'Home', display_number: '01' },
    { href: '/about', label: 'About', display_number: '02' },
    { href: '/work', label: 'Work', display_number: '03' },
    { href: '/projects', label: 'Projects', display_number: '04' },
    { href: '/notes', label: 'Notes', display_number: '05' },
    { href: '/now', label: 'Now', display_number: '06' },
  ] as const;

  const links = $derived(
    navigation.length > 0
      ? [{ href: '/', label: 'Home', display_number: '01' }, ...navigation]
      : [...FALLBACK_LINKS],
  );

  const current = $derived(links.find((l) => l.href === currentPath)?.label ?? 'Home');

  let open = $state(false);
  let scrolled = $state(false);
  let preview = $state(current.toUpperCase());

  // Independent active + hover indicators: each row reserves a fixed
  // caret slot between number and label, so showing or hiding a `>`
  // never shifts text. Active follows the route, hover follows the
  // pointer/focus; a row showing both renders a single mark.
  let hoveredHref: string | null = $state(null);

  $effect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  });

  $effect(() => {
    function onScroll() {
      scrolled = window.scrollY > 24;
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  });

  function resetPreview() {
    preview = current.toUpperCase();
  }

  function pointAt(href: string, label: string) {
    preview = label.toUpperCase();
    hoveredHref = href;
  }

  function leaveNav() {
    resetPreview();
    hoveredHref = null;
  }

  function navFocusOut(event: FocusEvent) {
    const nav = event.currentTarget;
    const related = event.relatedTarget;
    if (!(nav instanceof HTMLElement) || (related instanceof Node && nav.contains(related))) return;
    hoveredHref = null;
  }

  // easeInOutQuint — matches the previous [0.76, 0, 0.24, 1] wipe curve.
  function quint(t: number): number {
    return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
  }

  function wipeIn(node: Element, { duration = 480 }: { duration?: number } = {}) {
    return {
      duration,
      easing: quint,
      css: (t: number) => `clip-path: polygon(0 0, ${t * 100}% 0, ${t * 100}% 100%, 0 100%)`,
    };
  }

  function wipeOut(node: Element, { duration = 480 }: { duration?: number } = {}) {
    return {
      duration,
      easing: quint,
      css: (t: number) => {
        const p = (1 - t) * 100;
        return `clip-path: polygon(${p}% 0, 100% 0, 100% 100%, ${p}% 100%)`;
      },
    };
  }
</script>

<header class={`site-header${scrolled ? ' is-scrolled' : ''}`}>
  <a href="/" class="site-mark" aria-label="ravedeprinz home"><strong>r</strong>avedeprinz_</a>
  <div class="header-state"><span>{current}</span></div>
  <button
    type="button"
    class={`menu-trigger${open ? ' is-open' : ''}`}
    aria-expanded={open}
    onclick={() => (open = !open)}
  >
    <span class="bracket bracket-left" class:open-bracket={open}>[</span>
    <span class="menu-trigger-label">
      {#key open}<span class="menu-trigger-swap">{open ? 'CLOSE' : 'INDEX'}</span>{/key}
    </span>
    <span class="bracket bracket-right" class:open-bracket={open}>]</span>
  </button>
</header>

{#if open}
  <div class="menu-scene" in:wipeIn out:wipeOut>
    <span class="menu-scene-dots" aria-hidden="true"></span>
    <span class="menu-preview" aria-hidden="true">{preview}</span>
    <button type="button" class="scene-close touch-target menu-close-in" onclick={() => (open = false)}>
      <span>[</span> CLOSE <span>]</span>
    </button>
    <nav aria-label="Primary navigation" onmouseleave={leaveNav} onfocusout={navFocusOut}>
      {#each links as link, index}
        {@const active = link.href === currentPath}
        {@const hovered = hoveredHref === link.href}
        <div class="scene-row" style={`animation-delay: ${120 + index * 50}ms`}>
          <a
            href={link.href}
            onmouseenter={() => pointAt(link.href, link.label)}
            onfocus={() => pointAt(link.href, link.label)}
            class={`scene-link touch-target${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span class="scene-num menu-num-in" style={`animation-delay: ${160 + index * 50}ms`}>
              {link.display_number ?? `0${index + 1}`}
            </span>
            <span class="scene-caret-mark" class:is-on={active || hovered} aria-hidden="true">&gt;</span>
            <span class="scene-label menu-label-in" style={`animation-delay: ${200 + index * 50}ms`}>
              {link.label}
            </span>
          </a>
        </div>
      {/each}
    </nav>
    <div class="scene-login-wrap menu-login-in">
      <a href="/login" class="scene-login touch-target" aria-label="Log in">
        <span>[</span> LOGIN <span>]</span>
      </a>
    </div>
    <p class="scene-note">
      A personal archive of work, experiments, observations, and the things currently taking up space in my head.
    </p>
  </div>
{/if}

<style>
  /* Trigger label swap (was AnimatePresence y-fade in Shell). */
  .menu-trigger-swap { display: inline-block; animation: trigger-swap 0.2s ease-out; }
  @keyframes trigger-swap { from { opacity: 0; transform: translateY(6px); } }
  .bracket { transition: width 0.25s cubic-bezier(0.65, 0, 0.35, 1); }
  .open-bracket { width: 9px; }

  /* Row stagger: rows fade as a group, numerals/labels slide on split timing. */
  .scene-row { animation: scene-row-in 0.01s both; }
  @keyframes scene-row-in { from { opacity: 0; } }
  .menu-num-in { display: inline-block; animation: scene-num-in 0.28s ease-out both; }
  @keyframes scene-num-in { from { opacity: 0; transform: translateX(-14px); } }
  .menu-label-in { display: inline-block; animation: scene-label-in 0.34s cubic-bezier(0.22, 1, 0.36, 1) both; }
  @keyframes scene-label-in { from { opacity: 0; transform: translateX(-36px); } }

  /* Delayed utility entrances (close travels with the surface, login last). */
  .menu-close-in { animation: menu-util-in 0.25s ease-out 0.1s both; }
  .menu-login-in { animation: menu-login-rise 0.3s ease-out 0.45s both; }
  @keyframes menu-util-in { from { opacity: 0; transform: translateY(-12px); } }
  @keyframes menu-login-rise { from { opacity: 0; transform: translateY(14px); } }

  /* Hover/tap language (was framer whileHover/whileTap), base rotations kept. */
  .scene-close { transition: transform 0.15s ease; }
  .scene-close:hover { transform: rotate(4deg) translateX(4px); }
  .scene-close:active { transform: rotate(4deg) scale(0.94); }
  .scene-login-wrap { transition: transform 0.2s ease-out; }
  .scene-login-wrap:hover { transform: rotate(-4deg) translateY(-4px) scale(1.03); }
  .scene-login-wrap:active { transform: rotate(-4deg) translateY(1px) scale(0.92); }
  .menu-trigger:active { transform: scale(0.94); }

  @media (prefers-reduced-motion: reduce) {
    .menu-trigger-swap,
    .scene-row,
    .menu-num-in,
    .menu-label-in,
    .menu-close-in,
    .menu-login-in { animation: none; }
  }
</style>
