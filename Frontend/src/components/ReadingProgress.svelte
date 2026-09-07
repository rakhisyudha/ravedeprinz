<script lang="ts">
  import { onMount } from 'svelte';

  let progress = $state(0);

  onMount(() => {
    function onScroll() {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      progress = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  });
</script>

<div class="reading-progress" style={`transform: scaleX(${progress / 100})`} aria-hidden="true"></div>
