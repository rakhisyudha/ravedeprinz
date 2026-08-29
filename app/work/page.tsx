import { Page } from '../../components/Page';
import { getWorkContent } from '../../lib/cms';

export default async function Work() {
  const { work } = await getWorkContent();

  return (
    <Page index="FIELD RECORD / 003" title="WORK" intro="A record of the teams and responsibilities that shaped how I work. Not a résumé. A map of decisions and outcomes.">
      <section className="record-list">{work.map((item, index) => <article className="record lift" key={item.id ?? item.company}><span className="record-number">0{index + 1}<small>{item.date_label}</small></span><div><p className="eyebrow">{item.company}{item.location ? ` / ${item.location}` : ''}</p><h2>{item.role}</h2><p>{item.description}</p><p className="metadata">{item.stack}</p></div><aside><span>CONTRIBUTION</span><p>Built the structure behind a more dependable daily workflow.</p></aside></article>)}</section>
    </Page>
  );
}
