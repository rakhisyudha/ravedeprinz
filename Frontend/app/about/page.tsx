import Image from 'next/image';
import { Page } from '../../components/Page';
import { getAboutContent, getWorkContent } from '../../lib/cms';
import profileImage from '../../img/Profile/ini.jpeg';

export default async function About() {
  const about = await getAboutContent();
  const work = await getWorkContent();
  const content = about.content;
  const grouped = about.skills.reduce<Record<string, string[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item.skill_name);
    return acc;
  }, {});

  return (
    <Page index={content?.eyebrow ?? 'IDENTITY / 002'} title="ABOUT" intro="The person behind the systems. More interested in a good question than a polished job title.">
      <section className="about-grid">
        <article className="panel cut about-story p-6 sm:p-10">
          <div className="about-portrait about-portrait-sticker">
            <Image src={profileImage} alt="Rakhis de Yudha" fill sizes="260px" />
            <span className="about-photo-label">RDP / 001</span>
            <span className="about-photo-badge">BUILDING</span>
          </div>
          <p className="eyebrow">01 / THE SHORT VERSION</p>
          <p className="about-quote">{content?.quote ?? 'I like work that is'} <span>{content?.quote_accent ?? 'clear, useful,'}</span> and built to last.</p>
          <p>{content?.paragraph_one ?? ''}</p>
          <p>{content?.paragraph_two ?? ''}</p>
        </article>
        <aside className="panel cut p-6 sm:p-8">
          <p className="eyebrow mb-7">02 / WORKING MATERIALS</p>
          {Object.entries(grouped).map(([category, skills]) => <div className="skill-group" key={category}><span>{category}</span><p>{skills.join(' / ')}</p></div>)}
        </aside>
      </section>
      <section className="about-timeline"><p className="eyebrow">03 / WHERE I CAME FROM</p>{work.education.map((item, index) => <article className="record" key={item.id ?? item.title}><span className="record-number">0{index + 1}<small>{item.date_label}</small></span><div><p className="eyebrow">{item.institution}</p><h2>{item.title}</h2><p>{item.description}</p></div></article>)}</section>
    </Page>
  );
}
