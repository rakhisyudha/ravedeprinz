<script lang="ts">
  // Port of components/HudPanel.tsx. The count-up is genuinely stateful,
  // so it stays a client island (client:visible).

  interface Props {
    years?: number;
    label?: string;
    noiseTop?: string;
    noiseBottom?: string;
  }

  const {
    years: targetYears = 4,
    label = 'YEARS BUILDING',
    noiseTop = '// SYSTEM_04',
    noiseBottom = 'BUILD / REPEAT / SHIP',
  } = $props();

  let panel: HTMLDivElement | undefined = $state();
  let years = $state(0);
  let shown = $state(false);

  $effect(() => {
    if (!panel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          shown = true;
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(panel);
    return () => observer.disconnect();
  });

  $effect(() => {
    if (!shown) return;
    const start = performance.now();
    const duration = 900;
    let frame = 0;
    function count(timestamp: number) {
      const progress = Math.min((timestamp - start) / duration, 1);
      years = Math.floor(progress * targetYears);
      if (progress < 1) {
        frame = requestAnimationFrame(count);
      } else {
        years = targetYears;
      }
    }
    frame = requestAnimationFrame(count);
    return () => cancelAnimationFrame(frame);
  });

  const labelParts = $derived(label.split(' '));
</script>

<div bind:this={panel} class="hud-panel cut relative isolate overflow-hidden p-6 sm:p-8">
  <div class="hud-slice hud-slice-one pointer-events-none absolute z-10"></div>
  <div class="hud-slice hud-slice-two pointer-events-none absolute z-10"></div>
  <span class="hud-notch hud-notch-top"></span>
  <span class="hud-notch hud-notch-bottom"></span>

  <div class="relative z-20 flex min-h-[300px] flex-col justify-center">
    <span class="hud-noise hud-noise-top">{noiseTop}</span>
    <span
      class="display hud-number hud-number-reversed block text-[clamp(9rem,22vw,15rem)] italic leading-[0.72] hud-count-in"
      class:hud-count-on={shown}
    >
      {String(years).padStart(2, '0')}
    </span>
    <span
      class="display mt-8 block max-w-[220px] text-3xl leading-[0.86] text-white sm:text-4xl hud-label-in"
      class:hud-label-on={shown}
    >
      {labelParts[0] ?? ''} <strong class="hud-of">0F</strong> {labelParts.slice(1).join(' ')}
    </span>
    <span class="hud-noise hud-noise-bottom">{noiseBottom}</span>
  </div>
</div>

<style>
  /* Entrance pair (was framer: number y/opacity, label x/opacity delay .25). */
  .hud-count-in,
  .hud-label-in { opacity: 0; }
  .hud-count-on { animation: hud-count-in 0.35s ease-out both; }
  .hud-label-on { animation: hud-label-in 0.3s ease-out 0.25s both; }
  @keyframes hud-count-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes hud-label-in { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: translateX(0); } }

  @media (prefers-reduced-motion: reduce) {
    .hud-count-in,
    .hud-label-in { opacity: 1; }
    .hud-count-on,
    .hud-label-on { animation: none; }
  }
</style>
