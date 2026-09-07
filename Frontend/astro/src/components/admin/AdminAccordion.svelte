<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    subtitle?: string;
    defaultOpen?: boolean;
    children: Snippet;
  }

  const { title, subtitle, defaultOpen = false, children }: Props = $props();

  // User-owned after mount: stays open/closed across parent re-renders
  // instead of snapping back to the default.
  let toggled: boolean | undefined = $state();
  const open = $derived(toggled ?? defaultOpen);
</script>

<div class="admin-accordion-item">
  <button
    type="button"
    class="admin-accordion-head touch-target"
    onclick={() => (toggled = !open)}
    aria-expanded={open}
  >
    <span><b>{title}</b> {#if subtitle}<small>{subtitle}</small>{/if}</span>
    <span class="admin-accordion-icon">{open ? '—' : '+'}</span>
  </button>
  {#if open}
    <div class="admin-accordion-body">{@render children()}</div>
  {/if}
</div>
