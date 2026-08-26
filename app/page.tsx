import { TransitionLink } from '../components/TransitionLink';
import { HudPanel } from '../components/HudPanel';

const tiles = [
  ['/about', 'ABOUT', 'The person behind the systems.'],
  ['/work', 'WORK', 'Selected roles & impact.'],
  ['/projects', 'PROJECTS', 'Experiments, shipped or not.'],
  ['/notes', 'NOTES', 'Thoughts in progress.'],
  ['/now', 'NOW', 'Current status readout.'],
] as const;

export default function Home() {
  return (
    <main className="grid-bg relative min-h-screen overflow-hidden px-5 pb-20 pt-32 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid min-h-[53vh] items-center gap-12 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <p className="eyebrow mb-7"><span className="slash">//</span> PERSONAL PORTFOLIO / 001</p>
            <h1 className="display text-[clamp(4rem,10vw,8.5rem)] font-black">EVERY<br /><span className="text-[#00BBFA]">SYSTEM</span><br />HAS A STORY<span className="text-[#FFC54A]">.</span></h1>
            <p className="mt-8 max-w-md text-base leading-7 text-[#a8c6d3]">I build full-stack products with a backend focus. I like to understand the shape of a problem before I start writing code.</p>
            <div className="mt-8 lg:hidden"><HudPanel /></div>
            <TransitionLink href="/projects" className="cut-small mt-8 inline-flex bg-[#FFC54A] px-7 py-4 font-bold tracking-widest text-[#001736] transition hover:bg-[#79D7FD]">ENTER THE ARCHIVE <span className="ml-5">↗</span></TransitionLink>
          </div>

          <div className="relative hidden min-h-[510px] lg:block">
            <div className="absolute right-7 top-8 h-[440px] w-[370px] border border-[#00BBFA]/35 bg-[#00183E]" />
            <div className="absolute right-0 top-20 h-[440px] w-[370px] border border-[#79D7FD]/25 [clip-path:polygon(15%_0,100%_0,100%_85%,85%_100%,0_100%,0_15%)]" />
            <div className="relative ml-auto w-[370px]"><HudPanel /></div>
          </div>
        </div>

        <div className="cyan-line mb-7" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {tiles.map(([href, title, desc]) => (
            <TransitionLink href={href} key={href} className="panel cut-small lift group min-h-[145px] p-5">
              <h2 className="display mt-8 text-3xl font-bold group-hover:text-[#79D7FD]">{title}</h2>
              <p className="mt-2 text-xs leading-5 text-[#86adbe]">{desc}</p>
            </TransitionLink>
          ))}
        </div>
      </div>
    </main>
  );
}
