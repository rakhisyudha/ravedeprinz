import { Page } from '../../components/Page';

const skills = ['TypeScript', 'Node.js', 'Python', 'PostgreSQL', 'React / Next.js', 'Docker', 'System design', 'Technical writing'];

export default function About() {
  return (
    <Page eyebrow="IDENTITY / 002" title="ABOUT" intro="I build the connective tissue between a good idea and a useful product. Curious by default, precise when it matters.">
      <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <article className="panel cut p-7 sm:p-10">
          <p className="eyebrow mb-8">01 / THE SHORT VERSION</p>
          <p className="max-w-2xl text-xl leading-9 text-[#e8f7ff]">I’m Rave, a computer science student and backend-focused developer based in the space between thoughtful design and dependable engineering.</p>
          <p className="mt-7 max-w-2xl leading-8 text-[#9abaca]">My favorite work makes complexity feel calm. I care about APIs that are easy to reason about, interfaces that respect attention, and teams that leave better documentation than they found.</p>
          <div className="gold-line mt-10 max-w-xs" />
          <p className="mt-7 text-sm leading-7 text-[#79D7FD]">Outside the terminal: JRPGs, systems thinking, long walks, and collecting questions that are better than answers.</p>
        </article>

        <section className="panel cut p-7">
          <p className="eyebrow mb-7">02 / SKILL PANEL</p>
          <div className="space-y-4">
            {skills.map((skill) => <div key={skill} className="border-b border-[#79D7FD]/10 pb-3 text-sm">{skill}</div>)}
          </div>
        </section>
      </div>
    </Page>
  );
}
