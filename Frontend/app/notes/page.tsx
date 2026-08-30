import Link from 'next/link';
import { Page } from '../../components/Page';
import { getNotesContent } from '../../lib/cms';
import { readingMinutes } from '../../lib/readingTime';

export default async function Notes() {
  const { notes } = await getNotesContent();

  return (
    <Page index="TRANSMISSIONS / 005" title="NOTES" intro="Short transmissions from the workbench. Mostly unfinished thoughts, left legible on purpose.">
      <section className="notes-list">
        {notes.map((note) => {
          const href = `/notes/${note.id ?? note.slug}`;
          const date = note.published_at ? new Date(note.published_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase() : '';
          const minutes = readingMinutes(note.body ?? '');
          return (
            <article className="note lift" key={note.id ?? note.slug}>
              <Link href={href} target="_blank" rel="noopener noreferrer" className="note-link">
                <span className="note-date">{date}<small>READ {String(minutes).padStart(2, '0')} MIN</small></span>
                <div className="note-body">
                  <p className="eyebrow">{note.tag}{note.author ? ` · ${note.author}` : ''}</p>
                  <h2>{note.title}</h2>
                  <p>{note.subtitle || note.body}</p>
                </div>
                <span className="note-arrow">↗</span>
              </Link>
            </article>
          );
        })}
      </section>
    </Page>
  );
}
