<script lang="ts">
  import { onMount } from 'svelte';
  import { generateWelcomeMessage } from '../../lib/welcome';

  // Generated on mount (not SSR) so server and client markup agree.
  let text = $state('');

  onMount(() => {
    text = generateWelcomeMessage();
  });
</script>

{#if text}
  <div class="admin-welcome cut-small" role="status" aria-live="polite">
    <p class="admin-welcome-text">{text}</p>
  </div>
{/if}
