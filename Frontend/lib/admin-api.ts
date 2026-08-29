'use client';

import { createClient } from './supabase/browser';

const API = process.env.NEXT_PUBLIC_CMS_API_URL ?? 'http://localhost:4000';

export type AdminApiOptions = { method?: string; body?: unknown };

export async function adminApi<T = unknown>(path: string, options: AdminApiOptions = {}): Promise<{ data?: T; error?: string }> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Not signed in' };

  try {
    const res = await fetch(`${API}${path}`, {
      method: options.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) {
      const parsed = await res.json().catch(() => ({}));
      return { error: parsed.error ?? `Request failed (${res.status})` };
    }
    return { data: (await res.json()) as T };
  } catch {
    return { error: 'Could not reach the CMS API' };
  }
}
