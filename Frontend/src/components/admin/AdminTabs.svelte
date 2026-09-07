<script lang="ts">
  import type { Snippet } from 'svelte';

  export interface AdminTab {
    id: string;
    label: string;
    count?: number;
    content: Snippet;
  }

  interface Props {
    tabs: AdminTab[];
    defaultId?: string;
  }

  const { tabs, defaultId }: Props = $props();

  // Selection is user-owned after mount: it must NOT snap back to the
  // default every time the parent passes a new tabs array (counts update
  // on every keystroke elsewhere). The effective tab stays derived so a
  // removed selection still falls back gracefully.
  let selected: string | undefined = $state();
  const activeId = $derived(selected ?? defaultId ?? tabs[0]?.id);
  const current = $derived(tabs.find((t) => t.id === activeId) ?? tabs[0]);
</script>

<div class="admin-tabs-shell">
  <div class="admin-tabs" role="tablist">
    {#each tabs as tab}
      <button
        role="tab"
        aria-selected={activeId === tab.id}
        class="admin-tab touch-target"
        class:is-active={activeId === tab.id}
        onclick={() => (selected = tab.id)}
      >
        {tab.label}
        {#if tab.count != null}<small>×{tab.count}</small>{/if}
      </button>
    {/each}
  </div>
  <div class="admin-tab-panel" role="tabpanel">
    {#if current}
      {@render current.content()}
    {/if}
  </div>
</div>
