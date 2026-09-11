<script lang="ts">
  import { parseBlocks } from '../../lib/markdown';
  import type { Inline } from '../../lib/markdown';

  interface Props {
    value: string;
  }

  const { value }: Props = $props();
  const blocks = $derived(parseBlocks(value ?? ''));
</script>

{#snippet InlineParts(parts: Inline[])}
  {#each parts as part}
    {#if part.kind === 'image'}
      <img src={part.src} alt={part.alt} width={640} height={360} class="note-inline-image" loading="lazy" />
    {:else if part.kind === 'strong'}
      <strong>{part.text}</strong>
    {:else if part.kind === 'em'}
      <em>{part.text}</em>
    {:else}
      {part.text}
    {/if}
  {/each}
{/snippet}

<div class="note-article-body admin-preview-body">
  {#if blocks.length === 0}
    <p class="admin-hint">Nothing to preview yet — write Markdown on the WRITE tab.</p>
  {/if}
  {#each blocks as block}
    {#if block.kind === 'list'}
      <ul>
        {#each block.items as inline}
          <li>{@render InlineParts(inline)}</li>
        {/each}
      </ul>
    {:else if block.kind === 'quote'}
      <blockquote>
        {#each block.inlines as inline}
          <p>{@render InlineParts(inline)}</p>
        {/each}
      </blockquote>
    {:else if block.kind === 'heading'}
      <h2>{@render InlineParts(block.inline)}</h2>
      {#each block.rest as inline}
        <p>{@render InlineParts(inline)}</p>
      {/each}
    {:else}
      {#each block.inlines as inline}
        <p>{@render InlineParts(inline)}</p>
      {/each}
    {/if}
  {/each}
</div>
