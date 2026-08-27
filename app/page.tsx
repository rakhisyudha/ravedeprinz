import { TransitionLink } from '../components/TransitionLink';
import { HudPanel } from '../components/HudPanel';

const links = [
  ['/about', 'About', 'The person behind the systems.'],
  ['/work', 'Work', 'Roles, teams, and shipped software.'],
  ['/projects', 'Projects', 'Things built while learning.'],
  ['/notes', 'Notes', 'Short thoughts from the workbench.'],
  ['/now', 'Now', 'What currently has my attention.'],
] as const;

export default function Home() {
  return <main className="home-page">
    <div className="home-layout">
      <section className="home-copy">
        <p className="eyebrow"><span className="slash">//</span> PERSONAL ARCHIVE / 001</p>
        <h1 className="display">I DON&apos;T<br /><span className="accent-word">GUESS.</span>I DEBUG<span className="accent-dot">.</span></h1>
        <div className="headline-meta"><span>BACKEND / SYSTEMS / GO</span><i /></div>
        <p className="lede">I’m Rakhis de Yudha. I study computer science at Binus Online Learning and spend most of my building time around Go, PostgreSQL, React, Docker, and the questions underneath a product’s interface.</p>
        <TransitionLink href="/projects" className="home-cta">ENTER THE ARCHIVE <b>↗</b></TransitionLink>
      </section>
      <aside className="profile-column">
        <div className="hud-only"><HudPanel /></div>
        <div className="quick-links"><TransitionLink href="/now"><span>06</span> NOW</TransitionLink><TransitionLink href="/notes"><span>05</span> NOTES</TransitionLink></div>
      </aside>
    </div>
    <nav className="home-rule" aria-label="Explore the archive">
      <p className="home-rule-label">ARCHIVE INDEX <span>// SELECT A RECORD</span></p>
      <div className="home-records">
        {links.map(([href, label, description], index) => (
          <TransitionLink href={href} key={href} className={`home-record home-record-${index}`}>
            <span className="home-record-number">0{index + 2}</span>
            <span className="home-record-copy"><b>{label}</b><small>{description}</small></span>
            <span className="home-record-arrow">↗</span>
          </TransitionLink>
        ))}
      </div>
    </nav>
  </main>;
}
