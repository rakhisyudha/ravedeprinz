import { errorResponse, json, notFound, toApiError } from '../errors';
import * as content from '../services/content';

type Handler = () => Promise<unknown>;

// Table of public GET handlers. Missing/unpublished rows surface as null
// here and become 404s at the boundary below — never empty fakes.
const handlers: Record<string, Handler> = {
  '/api/content/site': () => content.getSiteSettings().then((data) => data ?? {}),
  '/api/content/home': () => content.getHome(),
  '/api/content/about': () => content.getAbout(),
  '/api/content/work': () => content.getWork(),
  '/api/content/projects': () => content.getProjects(),
  '/api/content/notes': () => content.getNotes(),
  '/api/content/now': () => content.getNow(),
  '/api/content/now/history': () => content.getNowHistory(),
};

export async function contentRouter(request: Request, url: URL): Promise<Response> {
  try {
    if (url.pathname === '/api/health') {
      return json({ ok: true, service: 'ravedeprinz-cms' });
    }

    const handler = handlers[url.pathname];
    if (handler) return json(await handler());

    if (url.pathname.startsWith('/api/content/notes/')) {
      const key = url.pathname.split('/').pop() ?? '';
      if (!key) return errorResponse(notFound());
      const note = await content.getNote(key);
      if (!note) return errorResponse(notFound());
      return json(note);
    }

    return errorResponse(notFound());
  } catch (error) {
    return errorResponse(toApiError(error));
  }
}
