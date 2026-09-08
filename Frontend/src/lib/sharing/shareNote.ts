// Web Share API orchestration for note stories.
//
// Two responsibilities:
//   1. file-share capability detection (navigator.canShare with files)
//   2. generate the story blob and call navigator.share({ files })
//
// User-cancel of the native share sheet is treated as a normal outcome,
// not an error. Anything else (file share unsupported, share rejected
// with a real error) is reported back so the caller can fall through
// to its existing URL/clipboard behavior.

import { generateNoteStoryBlob, type NoteShareData } from './noteStoryRenderer';

export type ShareNoteResult =
  | { kind: 'shared' }
  | { kind: 'cancelled' }
  | { kind: 'unsupported' }
  | { kind: 'failed'; reason: string };

// Generates a 1080x1920 PNG Blob for the note via the canvas renderer.
// Re-exported for callers that want to build the File themselves.
export async function generateNoteStoryBlobSafe(data: NoteShareData): Promise<Blob> {
  return generateNoteStoryBlob(data);
}

// Returns true when the current browser can hand a generated File to
// the Android-native share sheet. We probe with a tiny PNG so we don't
// actually have to render the story to know whether files are shareable.
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (typeof navigator.canShare !== 'function') return false;
  try {
    // 1x1 transparent PNG — the minimal payload that satisfies File.
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82,
    ]);
    const file = new File([png], 'probe.png', { type: 'image/png' });
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

// Renders the story, packs it into a File, hands it to the native
// share sheet. The article URL is intentionally NOT included in the
// payload — the image is the primary share content per the brief.
export async function shareNoteStory(
  data: NoteShareData,
  opts: { filename?: string } = {},
): Promise<ShareNoteResult> {
  if (!canShareFiles()) return { kind: 'unsupported' };
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return { kind: 'unsupported' };
  }

  let blob: Blob;
  try {
    blob = await generateNoteStoryBlob(data);
  } catch (err) {
    return {
      kind: 'failed',
      reason: err instanceof Error ? err.message : 'render failed',
    };
  }

  const filename = opts.filename || 'ravedeprinz-story.png';
  const file = new File([blob], filename, { type: 'image/png' });

  try {
    await navigator.share({ files: [file] });
    return { kind: 'shared' };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { kind: 'cancelled' };
    }
    return {
      kind: 'failed',
      reason: err instanceof Error ? err.message : 'share failed',
    };
  }
}
