<script lang="ts">
  import { getShareUrls } from '../lib/seo';
  import { shareNoteStory, canShareFiles } from '../lib/sharing/shareNote';
  import type { NoteShareData } from '../lib/sharing/noteStoryRenderer';

  interface Props {
    url: string;
    title: string;
    description: string;
    noteData?: NoteShareData | null;
  }

  const { url, title, description, noteData = null }: Props = $props();

  let copied = $state(false);
  let generating = $state(false);

  async function flashCopied() {
    copied = true;
    setTimeout(() => copied = false, 2000);
  }

  function platformLabel(label: string): string {
    if (label === 'FB') return 'Facebook';
    return label.charAt(0) + label.slice(1).toLowerCase();
  }

  // True only on devices that can actually receive a file in the share
  // sheet. Computed once at mount — share capability doesn't change
  // during the page lifetime.
  const fileShareSupported = typeof navigator !== 'undefined' && canShareFiles();

  // Build a slug-based filename so users saving the image see the
  // article they're looking at. Falls back to "ravedeprinz-story".
  function storyFilename(): string {
    const raw = url.split('/').filter(Boolean).pop() || 'ravedeprinz-story';
    const safe = raw
      .toString()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60);
    return `${safe || 'ravedeprinz-story'}.png`;
  }

  async function handleShare() {
    // File-share path: only when the page actually supplied note data
    // and the browser passed the capability probe. The image itself
    // is the primary payload — no URL is included.
    if (noteData && fileShareSupported && typeof navigator !== 'undefined' && 'share' in navigator) {
      generating = true;
      try {
        const result = await shareNoteStory(noteData, { filename: storyFilename() });
        if (result.kind === 'shared' || result.kind === 'cancelled') return;
        // unsupported/failed: fall through to the existing clipboard path below
      } finally {
        generating = false;
      }
    }

    // URL-share fallback (also the path for browsers without file share).
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title, text: description || title, url });
        return;
      } catch (error) {
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
    <button
      type="button"
      class="note-share-btn cut-small touch-target"
      onclick={handleShare}
      disabled={generating}
      aria-label="Share this note"
    >
      {#if generating}
        GENERATING…
      {:else if copied}
        COPIED ✓
      {:else}
        SHARE ↗
      {/if}
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
