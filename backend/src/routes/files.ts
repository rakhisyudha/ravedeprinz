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
      return new Response(Bun.file(file.path), {
        headers: {
          'Content-Type': file.contentType,
          'Content-Length': String(file.size),
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    return errorResponse(notFound());
  } catch (error) {
    return errorResponse(toApiError(error));
  }
}
