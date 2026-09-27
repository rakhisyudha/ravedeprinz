import { errorResponse, notFound, toApiError } from '../errors';
import { loadUpload } from '../services/upload';

// Public file serving for CMS uploads. Same contract as before:
// extension allowlist, traversal guard, immutable caching, nosniff.
export async function filesRouter(request: Request, url: URL): Promise<Response> {
  try {
    if (request.method === 'GET' && url.pathname.startsWith('/uploads/')) {
      const name = decodeURIComponent(url.pathname.slice('/uploads/'.length));
      const file = await loadUpload(name);
      if (!file.ok) return errorResponse({ status: file.status, message: file.message });
      const headers: Record<string, string> = {
        'Content-Type': file.contentType,
        'Content-Length': String(file.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      };
      // Documents (the CV) download rather than render inline, so a
      // browser never interprets an uploaded PDF as a page of this origin.
      if (file.contentType === 'application/pdf') {
        headers['Content-Disposition'] = 'attachment';
      }
      return new Response(Bun.file(file.path), { headers });
    }

    return errorResponse(notFound());
  } catch (error) {
    return errorResponse(toApiError(error));
  }
}
