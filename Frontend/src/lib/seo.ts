import type { Note } from './cms';

export function getSiteUrl(): string {
  // Server: prefer runtime env (see lib/api.ts); falls back to build-baked
  // values, then the production origin.
  const runtime =
    typeof process !== 'undefined'
      ? (process.env.SITE_URL ?? process.env.PUBLIC_SITE_URL)
      : undefined;
  return (
    runtime ??
    import.meta.env.SITE_URL ??
    import.meta.env.PUBLIC_SITE_URL ??
    'https://ravedeprinz.me'
  ).replace(/\/$/, '');
}

// Strip the light markdown subset the notes support down to plain readable
// text: images vanish entirely, links keep their label, formatting chars go.
export function cleanDescription(body: string | null | undefined, subtitle?: string | null, max = 160): string {
  if (subtitle?.trim()) return subtitle.trim().slice(0, max);
  const text = (body ?? '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~\-!|[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

// Slug-based canonical when the CMS provides a stable slug; id-based URLs
// keep resolving through the backend, so nothing breaks either way.
export function getNoteCanonicalUrl(note: Pick<Note, 'id' | 'slug'>, idFallback: string): string {
  const key = note.slug?.trim() || note.id || idFallback;
  return `${getSiteUrl()}/notes/${key}`;
}

export function getNoteOgImageUrl(note: Pick<Note, 'id' | 'slug'>, idFallback: string): string {
  return `${getNoteCanonicalUrl(note, idFallback)}/opengraph-image`;
}

export function absolutizeUpload(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${getSiteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

export type ShareLink = { label: string; href: string; external: boolean };

export function getShareUrls(note: { title: string; url: string; description: string }): ShareLink[] {
  const { title, url, description } = note;
  const text = `${title} // ravedeprinz`;
  return [
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, external: true },
    { label: 'FB', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, external: true },
    { label: 'IN', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, external: true },
    { label: 'REDDIT', href: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`, external: true },
    { label: 'WA', href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, external: true },
    { label: 'TELEGRAM', href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(description || text)}`, external: true },
    { label: 'EMAIL', href: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(description ? `${description}\n\n${url}` : url)}`, external: false },
  ];
}
