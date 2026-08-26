import Link from 'next/link';

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
            <h1 className="display text-[clamp(5rem,14vw,12rem)] font-black">MAKE<br /><span className="text-[#00BBFA]">USEFUL</span><br />THINGS<span className="text-[#FFC54A]">.</span></h1>
            <p className="mt-8 max-w-md text-base leading-7 text-[#a8c6d3]">Backend developer & CS student. I like robust systems, clear interfaces, and learning in public.</p>
            <Link href="/projects" className="cut-small mt-8 inline-flex bg-[#FFC54A] px-7 py-4 font-bold tracking-widest text-[#001736] transition hover:bg-[#79D7FD]">ENTER THE ARCHIVE <span className="ml-5">↗</span></Link>
          </div>

          <div className="relative hidden h-full min-h-[340px] lg:block">
            <div className="absolute right-5 top-10 h-64 w-64 rotate-12 border border-[#00BBFA]/50" />
            <div className="absolute right-20 top-24 h-64 w-64 -rotate-[18deg] border border-[#79D7FD]/30" />
            <div className="absolute bottom-10 right-3 max-w-[220px] border-l-2 border-[#FFC54A] pl-4 text-right"><p className="mono text-xs leading-6 text-[#79D7FD]">CURRENT MODE<br /><span className="text-[#e8f7ff]">OBSERVE / BUILD / REPEAT</span></p></div>
          </div>
        </div>

        <div className="cyan-line mb-7" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {tiles.map(([href, title, desc]) => (
            <Link href={href} key={href} className="panel cut-small lift group min-h-[145px] p-5">
              <h2 className="display mt-8 text-3xl font-bold group-hover:text-[#79D7FD]">{title}</h2>
              <p className="mt-2 text-xs leading-5 text-[#86adbe]">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
