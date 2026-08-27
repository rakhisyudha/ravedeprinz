import { Page } from '../../components/Page';
import { notes } from '../../data/content';

export default function Notes() {
  return <Page index="TRANSMISSIONS / 005" title="NOTES" intro="Short transmissions from the workbench. Mostly unfinished thoughts, left legible on purpose.">
    <section className="notes-list">{notes.map((note) => <article className="note lift" key={note.title}><span className="note-date">{note.date}<small>READ / 04 MIN</small></span><div><p className="eyebrow">{note.tag}</p><h2>{note.title}</h2><p>{note.text}</p></div><span className="note-arrow">↗</span></article>)}</section>
  </Page>;
}
