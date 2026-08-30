import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getNoteById } from '../../../lib/cms';
import { readingMinutes } from '../../../lib/readingTime';
import ReadingProgress from './ReadingProgress';

function renderInline(text: string) {
  const parts: React.ReactNode[] = [];
  const regex = /(!\[[^\]]*\]\([^)]*\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1]) {
      const src = match[1].match(/\(([^)]+)\)/)?.[1] ?? '';
      const alt = match[1].match(/\[([^\]]*)\]/)?.[1] ?? '';
      if (src) parts.push(<Image key={key++} src={src} alt={alt} width={640} height={360} className="note-inline-image" />);
    } else if (match[2]) {
      parts.push(<strong key={key++}>{match[2].slice(2, -2)}</strong>);
    } else if (match[3]) {
      parts.push(<em key={key++}>{match[3].slice(1, -1)}</em>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function NoteBody({ body }: { body: string }) {
  const blocks = body.split(/\n{2,}/).filter((b) => b.trim().length > 0);

  return (
    <div className="note-article-body">
      {blocks.map((block, i) => {
        const lines = block.split('\n').filter((l) => l.trim().length > 0);

        if (lines.every((l) => l.startsWith('- '))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => <li key={j}>{renderInline(l.slice(2))}</li>)}
            </ul>
          );
        }

        const first = lines[0];
        if (first.startsWith('## ')) {
          return (
            <div key={i}>
              <h2>{renderInline(first.slice(3))}</h2>
              {lines.slice(1).map((l, j) => <p key={j}>{renderInline(l)}</p>)}
            </div>
          );
        }

        return lines.map((l, j) => <p key={`${i}-${j}`}>{renderInline(l)}</p>);
      })}
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const note = await getNoteById(id);
  if (!note) return { title: 'Note not found' };
  const description = note.subtitle || note.body?.replace(/[#>*_`~\[\]()\-!]/g, '').slice(0, 160);
  return { title: `${note.title} // ravedeprinz`, description };
}

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const note = await getNoteById(id);
  if (!note) notFound();

  const minutes = readingMinutes(note.body ?? '');
  const date = note.published_at
    ? new Date(note.published_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
    : '';
  const href = `/notes/${note.id ?? note.slug}`;

  return (
    <>
      <header className="note-header">
        <Link href="/notes" className="note-header-back touch-target" aria-label="Back to notes">
          <span aria-hidden="true">←</span>
        </Link>
        <span className="note-header-title">NOTES</span>
        <span className="note-header-spacer" aria-hidden="true" />
      </header>
      <main className="page note-page" data-page="NOTES">
        <span className="brand-watermark" aria-hidden="true">R</span>
        <ReadingProgress />

        <div className="note-article">

        <header className="note-article-head">
          <p className="eyebrow">{note.tag}</p>
          <h1 className="display">{note.title}</h1>
          {note.subtitle && <p className="note-article-subtitle">{note.subtitle}</p>}
          <div className="note-article-meta">
            {note.author && <><span className="note-meta-author">{note.author}</span><span className="note-meta-dot">·</span></>}
            <span className="note-meta-date">{date}</span>
            <span className="note-meta-dot">·</span>
            <span className="note-meta-read">READ {String(minutes).padStart(2, '0')} MIN</span>
          </div>
          {note.image_url && (
            <div className="note-article-image">
              <Image src={note.image_url} alt={note.title} fill sizes="(max-width: 768px) 100vw, 700px" />
            </div>
          )}
        </header>

        <NoteBody body={note.body ?? ''} />

        <footer className="note-article-footer">
          <span className="note-pill"># {note.tag}</span>
        </footer>
      </div>
      </main>
      <footer className="note-footer">
        <Link href="/" className="note-footer-mark"><strong>r</strong>avedeprinz_</Link>
        <span>PERSONAL ARCHIVE <b>◆</b></span>
      </footer>
    </>
  );
}
