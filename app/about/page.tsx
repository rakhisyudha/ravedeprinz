import Image from 'next/image';
import { Page } from '../../components/Page';
import { education, skills } from '../../data/content';
import profileImage from '../../img/Profile/ini.jpeg';

export default function About() {
  return <Page index="IDENTITY / 002" title="ABOUT" intro="The person behind the systems. More interested in a good question than a polished job title.">
    <section className="about-grid">
      <article className="panel cut about-story p-6 sm:p-10">
        <div className="about-portrait about-portrait-sticker">
          <Image src={profileImage} alt="Rakhis de Yudha" fill sizes="260px" />
          <span className="about-photo-label">RDP / 001</span>
          <span className="about-photo-badge">BUILDING</span>
        </div>
        <p className="eyebrow">01 / THE SHORT VERSION</p>
        <p className="about-quote">I like work that is <span>clear, useful,</span> and built to last.</p>
        <p>I’m a computer science student from Bogor, Indonesia. My strongest area is backend development, but I enjoy following a problem all the way through to the interface people actually touch.</p>
        <p>I’m interested in systems that feel calm under pressure, small tools that remove friction, and the difference between software that technically works and software someone can trust.</p>
      </article>
      <aside className="panel cut p-6 sm:p-8">
        <p className="eyebrow mb-7">02 / WORKING MATERIALS</p>
        {skills.map((group) => <div className="skill-group" key={group.category}><span>{group.category}</span><p>{group.skills.join(' / ')}</p></div>)}
      </aside>
    </section>
    <section className="about-timeline"><p className="eyebrow">03 / WHERE I CAME FROM</p>{education.map((item, index) => <article className="record" key={item.type}><span className="record-number">0{index + 1}<small>{item.time}</small></span><div><p className="eyebrow">{item.place}</p><h2>{item.type}</h2><p>{item.info}</p></div></article>)}</section>
  </Page>;
}
