<script lang="ts">
  import { shareNoteStory, canShareFiles } from '../lib/sharing/shareNote';
  import type { NoteShareData } from '../lib/sharing/noteStoryRenderer';

  interface Props {
    url: string;
    title: string;
    description: string;
    noteData?: NoteShareData | null;
  }

  const { url, title, description: _description, noteData = null }: Props = $props();

  let generating = $state(false);
  let copied = $state(false);

  async function flashCopied() {
    copied = true;
    setTimeout(() => copied = false, 2000);
  }

  // True only on devices that can actually receive a file in the share
  // sheet. Computed once at mount — share capability doesn't change
  // during the page lifetime. Used only as a hint to swap the button
  // label to "GENERATING..." while a story is being rendered; if the
  // browser later reports it cannot share files, shareNoteStory()
  // returns 'unsupported' and we silently fall through to the URL
  // share path below.
  const fileShareSupported = typeof navigator !== 'undefined' && canShareFiles();

  // X / Twitter intent. Real share destination, never a hardcoded URL:
  // the current note's title and canonical URL are encoded at click
  // time. The user already opted into opening X by tapping the chip.
  const xIntent =
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} // ravedeprinz`)}` +
    `&url=${encodeURIComponent(url)}`;

  // Facebook sharer. Same approach — the current note URL is encoded
  // at click time, no hardcoding.
  const fbIntent = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

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
        // 'shared' = success, 'cancelled' = user closed the sheet
        // (not an error). Either way, leave the existing URL fallback
        // untouched.
        if (result.kind === 'shared' || result.kind === 'cancelled') return;
        // 'unsupported' / 'failed': fall through silently.
      } finally {
        generating = false;
      }
    }

    // URL-share fallback. Same path used for browsers without file
    // share support.
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title, text: title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    // On browsers that lack both file share and Web Share API, do
    // nothing — the user can copy the URL from the address bar or
    // use the dedicated COPY chip below.
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      await flashCopied();
    } catch {
      /* clipboard unavailable — leave the label alone */
    }
  }
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
      {generating ? 'GENERATING…' : 'SHARE ↗'}
    </button>
    <a
      href={xIntent}
      target="_blank"
      rel="noopener noreferrer"
      class="note-share-copy touch-target"
      aria-label="Share on X"
      title="Share on X"
    >
      X
    </a>
    <a
      href={fbIntent}
      target="_blank"
      rel="noopener noreferrer"
      class="note-share-copy touch-target"
      aria-label="Share on Facebook"
      title="Share on Facebook"
    >
      FB
    </a>
    <button
      type="button"
      class="note-share-copy touch-target"
      onclick={handleCopy}
      aria-label="Copy link to this note"
      title="Copy link to this note"
    >
      {copied ? 'COPIED ✓' : 'COPY'}
    </button>
  </div>
</div>
