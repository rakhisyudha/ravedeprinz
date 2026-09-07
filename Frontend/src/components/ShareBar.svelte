<script lang="ts">
  import { getShareUrls } from '../lib/seo';

  interface Props {
    url: string;
    title: string;
    description: string;
  }

  const { url, title, description }: Props = $props();

  let copied = $state(false);

  async function flashCopied() {
    copied = true;
    setTimeout(() => copied = false, 2000);
  }

  function platformLabel(label: string): string {
    if (label === 'FB') return 'Facebook';
    if (label === 'IN') return 'LinkedIn';
    if (label === 'WA') return 'WhatsApp';
    return label.charAt(0) + label.slice(1).toLowerCase();
  }

  async function handleShare() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title, text: description || title, url });
        return;
      } catch (error) {
        // User cancellation is not an error; anything else falls back to copy.
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      await flashCopied();
    } catch {
      /* clipboard unavailable — the copy button remains */
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      await flashCopied();
    } catch {
      /* clipboard unavailable — leave the label alone */
    }
  }

  const targets = getShareUrls({ title, url, description });
</script>

<div class="note-share">
  <div class="note-share-label">
    <span>SHARE THIS TRANSMISSION</span>
    <i />
  </div>
  <div class="note-share-actions">
    <button type="button" class="note-share-btn cut-small touch-target" onclick={handleShare} aria-label="Share this note">
      {copied ? 'COPIED ✓' : 'SHARE ↗'}
    </button>
    {#each targets as target}
      <a
        href={target.href}
        target={target.external ? '_blank' : undefined}
        rel={target.external ? 'noopener noreferrer' : undefined}
        class="note-share-copy touch-target"
        aria-label={`Share on ${platformLabel(target.label)}`}
      >
        {target.label}
      </a>
    {/each}
    <button type="button" class="note-share-copy touch-target" onclick={handleCopy} aria-label="Copy link to this note">
      {copied ? 'COPIED ✓' : 'COPY'}
    </button>
  </div>
</div>
