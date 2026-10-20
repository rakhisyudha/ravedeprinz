<script lang="ts">
  // Decorative "live system" graphic: the letter R drawn as a
  // GitHub-contribution-style grid of small square cells with thin gaps.
  // It replaced the card's "04 years" claim — a shape instead of a number.
  //
  // Decorative only — the cells encode nothing. Kept aria-hidden so
  // assistive tech never narrates a fake heatmap, and never labelled
  // "commits" or "contributions": it says nothing.

  // Hand-authored bitmap mask (13 cols x 17 rows). Only 'X' cells render, so
  // the R reads clearly at any scale: top bowl on the left stem, and the leg
  // breaking out below the bowl in clean one-column diagonal steps.
  const MASK = [
    'XXXXXXXXX....',
    'XXXXXXXXXX...',
    'XXX....XXX...',
    'XXX.....XXX..',
    'XXX.....XXX..',
    'XXX.....XXX..',
    'XXX.....XXX..',
    'XXX....XXX...',
    'XXXXXXXXXX...',
    'XXX...XXXX...',
    'XXX....XXXX..',
    'XXX.....XXXX.',
    'XXX......XXXX',
    'XXX......XXXX',
    'XXX.......XXX',
    'XXX.......XXX',
    'XXX.......XXX',
  ];

  // Sweep pacing. delay = (x + y) * STEP walks a diagonal band across the R;
  // the longest path (12 + 16) * 90ms lands the far leg corner at ~2.5s, so
  // the wave reads as slow without stalling the page.
  const SWEEP_STEP_MS = 90;

  interface Cell {
    key: string;
    /** 4 contribution-style intensity levels (0 faintest -> 3 strongest). */
    level: number;
    style: string;
  }

  // Everything here is pure and deterministic: identical results on the
  // server render and the client, so hydration never disagrees. The intensity
  // hash is a stable pseudo-random spread over the mask — a seeded formula,
  // never Math.random, which would mismatch SSR. Thresholds put ~37% of
  // cells in the top two levels at rest, so the grid never reads washed-out.
  const cells: Cell[] = [];
  MASK.forEach((row, y) => {
    [...row].forEach((mask, x) => {
      if (mask !== 'X') return;
      const h = (x * 1273 + y * 4219 + x * y * 929) % 97;
      const level = h < 34 ? 0 : h < 62 ? 1 : h < 84 ? 2 : 3;
      const delay = (x + y) * SWEEP_STEP_MS;
      cells.push({
        key: `${x}:${y}`,
        level,
        style: `grid-column:${x + 1};grid-row:${y + 1};--delay:${delay}ms;`,
      });
    });
  });

  // Randomness lives only here, after mount: a handful of cells (never the
  // whole grid) get individual flicker periods. $effect is a browser-only
  // lifecycle, and the reduced-motion check keeps the gesture out of static
  // contexts entirely. The CSS below independently disarms the animations.
  interface Flicker {
    duration: number;
    delay: number;
  }
  let flickers = $state<Record<string, Flicker>>({});

  $effect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const count = 3 + Math.floor(Math.random() * 3); // 3-5 of ~118 cells
    const picked: Record<string, Flicker> = {};
    while (Object.keys(picked).length < count) {
      const cell = cells[Math.floor(Math.random() * cells.length)];
      if (!cell || cell.key in picked) continue;
      picked[cell.key] = {
        duration: 1800 + Math.random() * 2600,
        delay: Math.random() * 4000,
      };
    }
    flickers = picked;
  });

  function flickStyle(flicker: Flicker | undefined): string {
    if (!flicker) return '';
    return `--flicker-duration:${Math.round(flicker.duration)}ms;--flicker-delay:${Math.round(flicker.delay)}ms;`;
  }
</script>

<div class="r-grid" aria-hidden="true">
  {#each cells as cell (cell.key)}
    <i
      class="r-cell r-cell--{cell.level}"
      class:r-cell--flicker={cell.key in flickers}
      style={cell.style + flickStyle(flickers[cell.key])}
    ></i>
  {/each}
</div>

<style>
  /* The R is sized off the headline itself: the display block runs three
     lines at --type-display-xl (--font-display, line-height .84), so its
     visible block is ~2.5em of that same clamp token. Deriving --r-h from
     the token — instead of a px value — keeps the grid as tall as the
     headline block on desktop and scales it down proportionally on
     tablet/mobile, where the same token shrinks. The 180px floor keeps the
     letter legible on phones once the headline hits the clamp minimum. */
  .r-grid {
    --r-h: max(calc(var(--type-display-xl) * 2.55), 180px);
    --r-gap: calc(var(--r-h) / 110);
    --r-cell: calc((var(--r-h) - 16 * var(--r-gap)) / 17);
    display: grid;
    grid-template-columns: repeat(13, var(--r-cell));
    grid-auto-rows: var(--r-cell);
    gap: var(--r-gap);
    justify-content: center;
  }

  /* 4 intensity levels, theme-safe by construction: the site red at four
     mixes over the page background, so dark and light both derive from the
     same tokens (no hardcoded hex anywhere in this component). Lit levels
     sit well above half-strength so the card carries its own weight. */
  .r-cell {
    position: relative;
    opacity: 0;
    animation: r-grid-in 0.85s cubic-bezier(0.22, 1, 0.36, 1) var(--delay, 0ms) both;
  }
  .r-cell--0 { background: color-mix(in srgb, var(--primary) 32%, var(--background)); }
  .r-cell--1 { background: color-mix(in srgb, var(--primary) 52%, var(--background)); }
  .r-cell--2 { background: color-mix(in srgb, var(--primary) 78%, var(--background)); }
  .r-cell--3 { background: color-mix(in srgb, var(--primary) 100%, var(--background)); }
  /* Subtle red glow on the brightest cells, off the theme token entirely. */
  .r-cell--3 { filter: drop-shadow(0 0 6px color-mix(in srgb, var(--primary) 60%, transparent)); }

  @keyframes r-grid-in {
    from {
      opacity: 0;
      transform: translateY(6px) scale(0.85);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  /* The traveling band: every cell raises to near-full red as the diagonal
     passes over it, then falls away. The overlay rides on top of the resting
     level, so the band is clearly brighter than any resting cell — and since
     ~9 diagonals are lit per keyframe window, roughly 35-40% of the grid
     reads at the top level at any moment. A glow rides with the band via
     box-shadow themed off --primary. */
  .r-cell::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--primary);
    opacity: 0;
    pointer-events: none;
    box-shadow: 0 0 14px color-mix(in srgb, var(--primary) 50%, transparent);
    animation: r-cell-band 8s linear calc(var(--delay, 0ms) + 3.4s) infinite;
  }
  @keyframes r-cell-band {
    0%, 6% { opacity: 0; }
    11% { opacity: 0.92; }
    16% { opacity: 0.4; }
    22%, 100% { opacity: 0; }
  }

  /* The flicker rides on an overlay so it can step a cell brighter than its
     resting mix without animating the background itself. Irregular peaks,
     not a uniform pulse — the grid reads as one live signal, not strobing
     noise. */
  .r-cell::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--primary);
    opacity: 0;
    pointer-events: none;
  }
  .r-cell--flicker::after {
    animation: r-cell-flicker var(--flicker-duration, 2.4s) linear var(--flicker-delay, 0s) infinite;
  }
  @keyframes r-cell-flicker {
    0%, 54%, 86%, 100% { opacity: 0; }
    58% { opacity: 0.8; }
    63% { opacity: 0.08; }
    68% { opacity: 0.6; }
    78% { opacity: 0.24; }
  }

  /* ---- phones (<=640px) --------------------------------------------------
     The R zone (HeroCard) is a size container, so the cell is derived from
     the zone itself instead of the headline token: 13 columns + 12 gaps at
     gap = 0.18 * cell span 15.16 cells, so 5.4cqw keeps the letter within
     ~82% of the zone width; 17 rows + 16 gaps span 19.88 cells, so 4.12cqh
     keeps it within ~82% of the height. min() picks the binding axis, which
     always leaves ~9% breathing room and never crops the R. Centered in the
     zone; no rotation or skew here — the card tilt above is the only tilt. */
  @media (max-width: 640px) {
    .r-grid {
      --r-cell: min(5.4cqw, 4.12cqh);
      --r-gap: calc(var(--r-cell) * 0.18);
      width: 100%;
      height: 100%;
      justify-content: center;
      align-content: center;
    }
    /* Tighter glow so ~13px cells don't bleed into each other. */
    .r-cell--3 {
      filter: drop-shadow(0 0 3px color-mix(in srgb, var(--primary) 45%, transparent));
    }
    .r-cell::before {
      box-shadow: 0 0 6px color-mix(in srgb, var(--primary) 35%, transparent);
    }
  }

  /* Reduced motion: everything static and fully drawn — no sweep, no band,
     no flicker. */
  @media (prefers-reduced-motion: reduce) {
    .r-cell {
      animation: none;
      opacity: 1;
      transform: none;
    }
    .r-cell::before,
    .r-cell::after,
    .r-cell--flicker::after {
      animation: none;
    }
  }
</style>
