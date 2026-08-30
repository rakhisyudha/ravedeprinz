import { stat, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const contentTypes: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const filename = basename(path.join('/'));
  const extension = filename.split('.').pop()?.toLowerCase() ?? '';

  if (!contentTypes[extension]) {
    return new NextResponse('Unsupported file', { status: 415 });
  }

  const filePath = join(process.cwd(), 'public', 'uploads', filename);

  try {
    const info = await stat(filePath);
    if (!info.isFile()) return new NextResponse('Not found', { status: 404 });
    const file = await readFile(filePath);
    return new NextResponse(file, {
      headers: {
        'Content-Type': contentTypes[extension],
        'Content-Length': String(file.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
