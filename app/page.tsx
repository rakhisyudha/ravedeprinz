import { TransitionLink } from '../components/TransitionLink';
import { HudPanel } from '../components/HudPanel';
import { getHomeContent } from '../lib/cms';

export default async function Home() {
  const { content, navigation } = await getHomeContent();

  return (
    <main className="home-page">
      <div className="home-layout">
        <section className="home-copy">
          <p className="eyebrow"><span className="slash">//</span> {content?.archive_label ?? 'PERSONAL ARCHIVE'} / {content?.archive_number ?? '001'}</p>
          <h1 className="display">{content?.headline_line_one ?? "I DON'T"}<br /><span className="accent-word">{content?.headline_line_two ?? 'GUESS.'}</span>{content?.headline_line_three ?? 'I DEBUG'}<span className="accent-dot">{content?.headline_period ?? '.'}</span></h1>
          <div className="headline-meta"><span>{content?.headline_meta ?? 'BACKEND / SYSTEMS / GO'}</span><i /></div>
          <p className="lede">{content?.intro ?? ''}</p>
          <TransitionLink href={content?.cta_url ?? '/projects'} className="home-cta">{content?.cta_label ?? 'ENTER THE ARCHIVE'} <b>↗</b></TransitionLink>
        </section>
        <aside className="profile-column">
          <div className="hud-only"><HudPanel years={content?.years_building ?? 4} label={content?.hud_label ?? 'YEARS BUILDING'} noiseTop={content?.hud_noise_top ?? '// SYSTEM_04'} noiseBottom={content?.hud_noise_bottom ?? 'BUILD / REPEAT / SHIP'} /></div>
          <div className="quick-links">{navigation.length > 0 ? navigation.slice(-2).reverse().map((item) => <TransitionLink href={item.href} key={item.page_key}><span>{item.display_number}</span> {item.label.toUpperCase()}</TransitionLink>) : null}</div>
        </aside>
      </div>
      <nav className="home-rule" aria-label="Explore the archive">
        <p className="home-rule-label">ARCHIVE INDEX <span>// SELECT A RECORD</span></p>
        <div className="home-records">
          {navigation.map((item, index) => (
            <TransitionLink href={item.href} key={item.page_key} className={`home-record home-record-${index}`}>
              <span className="home-record-number">{item.display_number}</span>
              <span className="home-record-copy"><b>{item.label}</b><small>{item.description}</small></span>
              <span className="home-record-arrow">↗</span>
            </TransitionLink>
          ))}
        </div>
      </nav>
    </main>
  );
}
