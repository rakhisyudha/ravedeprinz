import Image, { StaticImageData } from 'next/image';
import { Page } from '../../components/Page';
import { getProjectsContent } from '../../lib/cms';
import type { ProjectContent } from '../../lib/types';
import portfolioImage from '../../img/Projects/portfolio.png';
import pakisImage from '../../img/Projects/pakis.png';
import outboundImage from '../../img/Projects/outbound.png';
import auctionImage from '../../img/Projects/auction.png';
import convertImage from '../../img/Projects/convert.png';
import quizImage from '../../img/Projects/quiz-portrait.png';
import weddingImage from '../../img/Projects/wedding.png';
import marketImage from '../../img/Projects/market.png';

const projectImages: Record<string, StaticImageData> = { 'simple-portfolio': portfolioImage, 'pakis-hills': pakisImage, 'outbound-design': outboundImage, 'web-auction': auctionImage, 'currency-converter': convertImage, 'quiz-app': quizImage, 'online-wedding-invitation': weddingImage, 'online-marketplace': marketImage };
const statusClass = { FINISHED: 'status-shipped', 'IN PROGRESS': 'status-in-progress', SHELVED: 'status' } as const;
const stickerKinds = ['solid', 'outline', 'text', 'stamp'] as const;

function ProjectFrame({ project, index }: { project: ProjectContent; index: number }) {
  const deployed = project.deployment_status === 'DEPLOYED';
  const image = projectImages[project.slug];
  const stickerKind = stickerKinds[index % stickerKinds.length];
  return <div className="project-media">
    <div className={`project-frame project-card-${index % 4}`}>
      <div className="project-chrome" aria-hidden="true"><i /><i /><i /></div>
      {image && <div className="project-image"><Image src={image} alt={`${project.title} preview`} fill sizes="(max-width: 900px) 90vw, 520px" /></div>}
    </div>
    <span className={`project-sticker status sticker-${stickerKind} sticker-status-slot ${statusClass[project.status]}`}>{project.status}</span>
    <span className={`deploy-sticker deploy-${stickerKinds[(index + 1) % stickerKinds.length]} deploy-slot ${deployed ? '' : 'deploy-sticker-pending'}`}>{deployed ? 'DEPLOYED' : 'NOT DEPLOYED'}</span>
    <span className={`project-index index-slot index-style-${index % 4}`}>0{index + 1} / {project.year}</span>
  </div>;
}

export default async function Projects() {
  const { projects } = await getProjectsContent();

  return (
    <Page index="BUILD LOG / 004" title="PROJECTS" intro="Things made while learning how to make better software. Finished, experimental, paused, and still worth remembering.">
      <section className="record-list">
        {projects.map((project, index) => <article className="record project-record lift" key={project.slug ?? project.id}>
          <span className="record-number">0{index + 1}<small>{project.year}</small></span>
          <div className="project-content"><ProjectFrame project={project} index={index} /><h2>{project.title}</h2><p>{project.description}</p><p className="metadata">{project.stack}</p><div className="project-links">{project.live_url && <a href={project.live_url} target="_blank" rel="noreferrer">Live ↗</a>}{project.source_url && <a href={project.source_url} target="_blank" rel="noreferrer">Source ↗</a>}</div></div>
          <aside><span>ARCHIVE NOTE</span><p>{project.status === 'SHELVED' ? 'Not finished. Still useful.' : 'A record of making, testing, and learning.'}</p></aside>
        </article>)}
      </section>
    </Page>
  );
}
