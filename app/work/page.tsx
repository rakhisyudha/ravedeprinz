import { Page } from '../../components/Page';
import { work, education } from '../../data/content';

export default function Work() {
  return (
    <Page eyebrow="FIELD RECORD / 003" title="WORK" intro="A record of the teams and projects that shaped how I work.">
      <section className="space-y-4">
        <p className="eyebrow mb-6">EXPERIENCE</p>
        {work.map((r, i) => (
          <article className="panel cut-small lift grid gap-6 p-6 md:grid-cols-[150px_1fr_180px] md:p-8" key={r.company}>
            <span className="mono text-xs text-[#FFC54A]">{r.date}</span>
            <div>
              <p className="eyebrow mb-3">0{i + 1} / {r.company}{r.location ? ` · ${r.location}` : ''}</p>
              <h2 className="display text-4xl font-bold">{r.role}</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#a8c6d3]">{r.desc}</p>
            </div>
            <span className="self-end text-xs leading-6 text-[#79D7FD] md:self-center">{r.stack}</span>
          </article>
        ))}
      </section>

      <section className="mt-16">
        <p className="eyebrow mb-6">EDUCATION</p>
        <div className="space-y-4">
          {education.map((e, i) => (
            <article className="panel cut-small lift grid gap-6 p-6 md:grid-cols-[150px_1fr_180px] md:p-8" key={e.type}>
              <span className="mono text-xs text-[#FFC54A]">{e.time}</span>
              <div>
                <p className="eyebrow mb-3">0{i + 1} / {e.place}</p>
                <h2 className="display text-3xl font-bold">{e.type}</h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-[#a8c6d3]">{e.info}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </Page>
  );
}
