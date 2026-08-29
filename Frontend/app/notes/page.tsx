import { Page } from '../../components/Page';
import { getNotesContent } from '../../lib/cms';

export default async function Notes() {
  const { notes } = await getNotesContent();

  return (
    <Page index="TRANSMISSIONS / 005" title="NOTES" intro="Short transmissions from the workbench. Mostly unfinished thoughts, left legible on purpose.">
      <section className="notes-list">{notes.map((note) => <article className="note lift" key={note.slug ?? note.id}><span className="note-date">{note.published_at ? new Date(note.published_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase() : ''}<small>READ / 04 MIN</small></span><div><p className="eyebrow">{note.tag}</p><h2>{note.title}</h2><p>{note.body}</p></div><span className="note-arrow">↗</span></article>)}</section>
    </Page>
  );
}
