import { Page } from '../../components/Page';
import { projects } from '../../data/content';
import Image from 'next/image';
import portfolioImage from '../../img/Projects/portfolio.png';
import pakisImage from '../../img/Projects/pakis.png';
import outboundImage from '../../img/Projects/outbound.png';
import auctionImage from '../../img/Projects/auction.png';
import convertImage from '../../img/Projects/convert.png';
import quizImage from '../../img/Projects/quiz-portrait.png';
import weddingImage from '../../img/Projects/wedding.png';
import marketImage from '../../img/Projects/market.png';

const projectImages = {
  portfolio: portfolioImage,
  pakis: pakisImage,
  outbound: outboundImage,
  auction: auctionImage,
  convert: convertImage,
  'quiz-portrait': quizImage,
  wedding: weddingImage,
  market: marketImage,
} as const;

const badge = {
  gold: 'bg-[#FFC54A] text-[#001736]',
  cyan: 'bg-[#00BBFA] text-[#001736]',
  muted: 'bg-[#426178] text-[#b8ced8]',
} as const;

export default function Projects() {
  return (
    <Page eyebrow="BUILD LOG / 004" title="PROJECTS" intro="A collection of things I made while learning how to make better software.">
      <div className="grid gap-5 md:grid-cols-2">
        {projects.map((p, i) => (
          <article className="panel cut lift relative flex min-h-[290px] min-w-0 flex-col p-5 sm:p-7" key={p.title}>
            <span className={`absolute right-2 top-2 z-20 max-w-[calc(100%-2rem)] px-3 py-2 text-[9px] font-bold tracking-widest sm:px-4 sm:text-[10px] ${badge[p.accent]}`}>{p.type}</span>
            <span className="mono text-xs text-[#79D7FD]">0{i + 1} / {p.year}</span>
            {p.image && (
              <div className="browser-frame relative mt-6 aspect-video overflow-hidden">
                <div className="browser-bar absolute inset-x-0 top-0 z-10 flex h-7 items-center gap-1.5 border-b border-[#00BBFA]/50 bg-[#00183E] px-3">
                  <span className="h-2 w-2 rounded-full bg-[#FFC54A]" />
                  <span className="h-2 w-2 rounded-full bg-[#79D7FD]" />
                  <span className="h-2 w-2 rounded-full bg-[#00BBFA]" />
                </div>
                <Image src={projectImages[p.image as keyof typeof projectImages]} alt={`${p.title} project preview`} fill className="object-cover pt-7 transition duration-300 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 50vw" />
                <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-[#001736]/65 via-transparent to-transparent" />
              </div>
            )}
            <h2 className="display mt-6 break-words text-4xl font-bold sm:mt-7">{p.title}</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-[#a8c6d3]">{p.desc}</p>
            <p className="mono mt-6 text-[10px] tracking-wide text-[#79D7FD]">{p.stack}</p>
            <div className="mt-auto flex items-center gap-5 pt-6">
              {p.link && (
                <a href={p.link} target="_blank" rel="noreferrer" className="text-xs font-bold uppercase tracking-widest text-[#00BBFA] hover:text-[#79D7FD]">
                  Live ↗
                </a>
              )}
              {p.github && (
                <a href={p.github} target="_blank" rel="noreferrer" className="text-xs font-bold uppercase tracking-widest text-[#a8c6d3] hover:text-[#79D7FD]">
                  Source ↗
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </Page>
  );
}
