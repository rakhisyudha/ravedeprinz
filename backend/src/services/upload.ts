import { randomUUID } from 'node:crypto';
import { mkdir, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';

export const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? (process.env.NODE_ENV === 'production' ? '/data/uploads' : './uploads');

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const MIME_BY_SNIFF: Array<{ mime: string; ext: string }> = [
  { mime: 'image/jpeg', ext: 'jpeg' },
  { mime: 'image/png', ext: 'png' },
  { mime: 'image/webp', ext: 'webp' },
  { mime: 'image/gif', ext: 'gif' },
];

export const SERVE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

// Real MIME from file magic bytes — never the extension or Content-Type.
export function sniffMime(bytes: Uint8Array): { mime: string; ext: string } | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return MIME_BY_SNIFF[0]!;
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return MIME_BY_SNIFF[1]!;
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return MIME_BY_SNIFF[2]!;
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return MIME_BY_SNIFF[3]!;
  }
  return null;
}

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; status: 400 | 413 | 415; message: string };

export async function storeUpload(file: unknown): Promise<UploadResult> {
  if (!(file instanceof File)) {
    return { ok: false, status: 400, message: 'No file provided' };
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, status: 413, message: 'File too large (max 5MB)' };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffMime(new Uint8Array(buffer));
  if (!sniffed) {
    return { ok: false, status: 415, message: 'Unsupported file type' };
  }

  // Client names are never trusted: timestamp + random id + real extension.
  const name = `${Date.now()}_${randomUUID().replace(/-/g, '')}.${sniffed.ext}`;
  await mkdir(UPLOADS_DIR, { recursive: true });
  await Bun.write(join(UPLOADS_DIR, name), buffer);
  return { ok: true, url: `/uploads/${name}` };
}

export type ServedFile =
  | { ok: true; path: string; contentType: string; size: number }
  | { ok: false; status: 404 | 415; message: string };

export async function loadUpload(rawName: string): Promise<ServedFile> {
  // Single path segment only: no traversal, no nested paths.
  const filename = basename(rawName);
  if (!filename || filename !== rawName || filename.includes('\0')) {
    return { ok: false, status: 404, message: 'Not found' };
  }
  const extension = filename.split('.').pop()?.toLowerCase() ?? '';
  const contentType = SERVE_TYPES[extension];
  if (!contentType) {
    return { ok: false, status: 415, message: 'Unsupported file' };
  }
  const path = join(UPLOADS_DIR, filename);
  try {
    const info = await stat(path);
    if (!info.isFile()) return { ok: false, status: 404, message: 'Not found' };
    return { ok: true, path, contentType, size: info.size };
  } catch {
    return { ok: false, status: 404, message: 'Not found' };
  }
}
