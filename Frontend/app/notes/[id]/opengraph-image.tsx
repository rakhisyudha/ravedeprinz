import { ImageResponse } from 'next/og';
import { getNoteById } from '../../../lib/cms';
import { absolutizeUpload, cleanDescription } from '../../../lib/seo';

export const runtime = 'nodejs';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const RED = '#d92323';
const DARK_RED = '#732424';
const BLACK = '#0d0d0d';
const WHITE = '#ffffff';
const GRAY = '#7b7b7b';

async function embedCover(path: string | null | undefined): Promise<string | null> {
  const url = absolutizeUpload(path);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? 'image/jpeg';
    if (!type.startsWith('image/')) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0 || buffer.length > 6 * 1024 * 1024) return null;
    return `data:${type};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

export default async function NoteOgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const note = await getNoteById(id).catch(() => null);

  const tag = (note?.tag ?? 'NOTES').toUpperCase();
  const title = (note?.title ?? 'ravedeprinz').slice(0, 110);
  const excerpt = cleanDescription(note?.body, note?.subtitle, 140) || 'Short transmissions from the workbench.';
  const cover = await embedCover(note?.image_url);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          height: '100%',
          backgroundColor: BLACK,
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, backgroundColor: RED }} />
        <div style={{ position: 'absolute', left: 24, top: 0, bottom: 0, width: 5, backgroundColor: DARK_RED }} />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: 1,
            padding: '60px 56px 52px 88px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: RED, fontSize: 30, fontWeight: 800, letterSpacing: 6 }}>{tag}</div>
            <div style={{ color: GRAY, fontSize: 26, fontWeight: 700, letterSpacing: 5 }}>NOTES</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                color: WHITE,
                fontSize: 78,
                fontWeight: 800,
                lineHeight: 1.02,
                height: 240,
                overflow: 'hidden',
                textTransform: 'uppercase',
              }}
            >
              {title}
            </div>
            <div
              style={{
                color: GRAY,
                fontSize: 30,
                lineHeight: 1.4,
                height: 84,
                overflow: 'hidden',
                marginTop: 18,
              }}
            >
              {excerpt}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <div style={{ width: 18, height: 18, backgroundColor: RED, marginRight: 16 }} />
            <div style={{ color: WHITE, fontSize: 30, fontWeight: 800, letterSpacing: 3 }}>RAVEDEPRINZ</div>
            <div style={{ color: GRAY, fontSize: 24, fontWeight: 700, letterSpacing: 4, marginLeft: 18 }}>
              PERSONAL ARCHIVE
            </div>
          </div>
        </div>

        {cover ? (
          <div style={{ display: 'flex', width: 430, position: 'relative', borderLeft: `4px solid ${RED}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ) : null}
      </div>
    ),
    { ...size },
  );
}
