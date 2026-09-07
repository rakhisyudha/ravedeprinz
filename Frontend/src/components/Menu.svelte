<script lang="ts">
  // Port of components/Shell.tsx (menu half). Interaction parity:
  // clip-path wipe open/close, staggered rows with split numeral/label
  // timing, delayed close + login entrances, scroll-aware header.

  interface Props {
    currentPath?: string;
  }

  const { currentPath = '/' } = $props();

  const links = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/work', label: 'Work' },
    { href: '/projects', label: 'Projects' },
    { href: '/notes', label: 'Notes' },
    { href: '/now', label: 'Now' },
  ] as const;

  const current = links.find((l) => l.href === currentPath)?.label ?? 'Home';

  let open = $state(false);
  let scrolled = $state(false);
  let preview = $state(current.toUpperCase());

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
    <span class="menu-preview" aria-hidden="true">{preview}</span>
    <button type="button" class="scene-close touch-target menu-close-in" onclick={() => (open = false)}>
      <span>[</span> CLOSE <span>]</span>
    </button>
    <nav aria-label="Primary navigation" onmouseleave={resetPreview}>
      {#each links as link, index}
        {@const active = link.href === currentPath}
        <div class="scene-row" style={`animation-delay: ${120 + index * 50}ms`}>
          <a
            href={link.href}
            onmouseenter={() => (preview = link.label.toUpperCase())}
            onfocus={() => (preview = link.label.toUpperCase())}
            class={`scene-link touch-target${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span class="scene-num menu-num-in" style={`animation-delay: ${160 + index * 50}ms`}>
              0{index + 1}
            </span>
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
