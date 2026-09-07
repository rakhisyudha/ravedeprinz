import { createHash, randomBytes } from 'node:crypto';

// Opaque session tokens: 256 bits from a CSPRNG. The raw token only ever
// travels inside the HttpOnly cookie; PostgreSQL stores its SHA-256 hash,
// so a database read alone can never impersonate a session.
export function newSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function sessionExpiry(from: number = Date.now()): Date {
  return new Date(from + SESSION_LIFETIME_MS);
}
