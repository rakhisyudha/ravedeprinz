import { config } from './config';

export const corsHeaders = {
  // Exact origin (never *) plus credentials: the browser talks to this API
  // directly and the session travels in an HttpOnly cookie.
  'Access-Control-Allow-Origin': config.frontendOrigin,
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...corsHeaders, ...extra } });
}

/** Explicit public-read contract: 200 ok, 404 missing/unpublished, 503 db down, 500 anything else. */
export type ApiError = { status: 404 | 503 | 500; message: string };

export const notFound = (): ApiError => ({ status: 404, message: 'Not found' });

const CONNECTION_HINTS = [
  'ECONNREFUSED',
  'ENOTFOUND',
  'ECONNRESET',
  'ETIMEDOUT',
  'connection refused',
  'could not connect',
  'connection terminated',
  'timeout',
];

export function isConnectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return CONNECTION_HINTS.some((hint) => message.toLowerCase().includes(hint.toLowerCase()));
}

export function toApiError(error: unknown): ApiError {
  if (isConnectionError(error)) {
    return { status: 503, message: 'Content service unavailable' };
  }
  const message = error instanceof Error ? error.message : String(error);
  console.error('[api] unexpected error', message);
  return { status: 500, message: 'Unexpected server error' };
}

export function errorResponse(error: ApiError | { status: number; message: string }): Response {
  const body = error.status === 404 ? { error: 'Not found' } : { error: error.message };
  return json(body, error.status);
}
