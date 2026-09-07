// Browser client for the Bun admin API. Session travels in the HttpOnly
// cookie (credentials: 'include'); the server re-verifies admin status on
// every call, so nothing here is a security boundary.

export type AdminApiOptions = { method?: string; body?: unknown };

export async function adminApi<T = unknown>(
  apiBase: string,
  path: string,
  options: AdminApiOptions = {},
): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(`${apiBase}${path}`, {
      method: options.method ?? 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const parsed = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      return { error: typeof parsed.error === 'string' ? parsed.error : `Request failed (${res.status})` };
    }
    return { data: parsed as T };
  } catch {
    return { error: 'Could not reach the CMS API' };
  }
}
