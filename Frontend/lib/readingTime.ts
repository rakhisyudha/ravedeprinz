const WPM = 265;

// Image time per your formula: 12s (1st), 7s, 5s, then 3s each.
const IMAGE_SECONDS = [12, 7, 5, 3, 3, 3, 3, 3];

/** Estimated reading time in minutes (min 1). */
export function readingMinutes(body: string): number {
  const text = body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')   // drop image syntax
    .replace(/[#>*_`~\[\]()\-]/g, ' ')        // strip markdown punctuation
    .replace(/\s+/g, ' ')
    .trim();

  const words = text ? text.split(' ').length : 0;
  const images = (body.match(/!\[/g) || []).length;
  const imageSeconds = IMAGE_SECONDS.slice(0, images).reduce((a, b) => a + b, 0);

  const totalSeconds = (words / WPM) * 60 + imageSeconds;
  return Math.max(1, Math.round(totalSeconds / 60));
}
