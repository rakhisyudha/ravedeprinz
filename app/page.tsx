import { TransitionLink } from '../components/TransitionLink';
import Image from 'next/image';
import profileImage from '../img/Profile/rakhis.jpg';

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
            <div className="image-frame cut-small about-image-frame relative mb-8 h-[340px] w-full overflow-hidden lg:hidden">
              <Image src={profileImage} alt="Rakhis de Yudha" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 370px" priority />
              <div className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-[#00BBFA]" />
              <div className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-[#FFC54A]" />
            </div>
            <h1 className="display text-[clamp(4.5rem,11vw,9rem)] font-black">MAKE<br /><span className="text-[#00BBFA]">USEFUL</span><br />THINGS<span className="text-[#FFC54A]">.</span></h1>
            <p className="mt-8 max-w-md text-base leading-7 text-[#a8c6d3]">I build full-stack products with a backend focus. I like to understand the shape of a problem before I start writing code.</p>
            <TransitionLink href="/projects" className="cut-small mt-8 inline-flex bg-[#FFC54A] px-7 py-4 font-bold tracking-widest text-[#001736] transition hover:bg-[#79D7FD]">ENTER THE ARCHIVE <span className="ml-5">↗</span></TransitionLink>
          </div>

          <div className="relative hidden min-h-[510px] lg:block">
            <div className="absolute right-7 top-8 h-[440px] w-[370px] border border-[#00BBFA]/35 bg-[#00183E]" />
            <div className="absolute right-0 top-20 h-[440px] w-[370px] border border-[#79D7FD]/25 [clip-path:polygon(15%_0,100%_0,100%_85%,85%_100%,0_100%,0_15%)]" />
            <div className="image-frame relative ml-auto h-[440px] w-[370px] bg-[#00183E]">
              <Image src={profileImage} alt="Rakhis de Yudha" fill className="object-contain grayscale-[15%]" sizes="370px" priority />
              <div className="pointer-events-none absolute inset-2 z-10 bg-gradient-to-br from-[#001736]/25 via-transparent to-[#00BBFA]/20 mix-blend-multiply" />
              <div className="pointer-events-none absolute inset-2 z-10 bg-gradient-to-t from-[#001736]/30 via-transparent to-transparent" />
            </div>
            <div className="cut-small absolute -bottom-2 right-[-35px] z-20 border border-[#00BBFA]/60 bg-[#00183E]/95 px-5 py-4 shadow-[6px_6px_0_rgba(0,187,250,.14)] backdrop-blur-sm">
              <p className="mono text-xs leading-6 text-[#79D7FD]">CURRENT MODE<br /><span className="text-[#e8f7ff]">OBSERVE / BUILD / REPEAT</span></p>
            </div>
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
