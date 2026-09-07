<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    eyebrow: string;
    children: Snippet;
  }

  const { eyebrow, children }: Props = $props();
</script>

<div class="admin-editor">
  <p class="eyebrow">{eyebrow}</p>
  {@render children()}
</div>
