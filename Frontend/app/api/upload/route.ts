import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '../../../lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXT: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

// Detect real MIME from file magic bytes, not the client-provided type or extension.
function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'image/gif';
  return null;
}

function extForMime(mime: string): string {
  const ext = Object.keys(ALLOWED_EXT).find((key) => ALLOWED_EXT[key] === mime);
  return ext ?? 'bin';
}

export async function POST(request: Request) {
  // Only allowlisted admins may upload.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: allowed } = await supabase.rpc('is_admin_user', { target_email: user.email });
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = sniffMime(new Uint8Array(buffer));
  if (!mime) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 });
  }

  // Sanitized, collision-safe filename: timestamp + random UUID + real extension.
  const ext = extForMime(mime);
  const name = `${Date.now()}_${crypto.randomUUID().replace(/-/g, '')}.${ext}`;

  const dir = join(process.cwd(), 'public', 'uploads');
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), buffer);

  return NextResponse.json({ url: `/uploads/${name}` });
}
