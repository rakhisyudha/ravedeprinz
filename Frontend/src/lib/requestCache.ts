// Request-scoped promise cache. Astro renders a page's frontmatter and then
// the layout, and the layout re-fetches the same content the page already
// asked for. Without this the requests queue up in sequence and the total
// CMS wait becomes several timeout windows instead of one. Middleware puts a
// fresh Map on locals for every request, so nothing survives a request and
// two concurrent visitors never share a promise.

export type CmsLocals = { cmsCache?: Map<string, Promise<unknown>> };

export function cached<T>(locals: CmsLocals, key: string, fn: () => Promise<T>): Promise<T> {
  const store = (locals.cmsCache ??= new Map<string, Promise<unknown>>());
  const existing = store.get(key);
  if (existing) return existing as Promise<T>;
  // Stored before awaiting so a second call in the same tick joins the
  // in-flight request instead of starting a competing one.
  const pending = fn();
  store.set(key, pending);
  return pending;
}
