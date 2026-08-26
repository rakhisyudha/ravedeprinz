'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  ['/', 'Home'],
  ['/about', 'About'],
  ['/work', 'Work'],
  ['/projects', 'Projects'],
  ['/notes', 'Notes'],
  ['/now', 'Now'],
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <>
      <header className="fixed top-0 z-40 w-full border-b border-cyan/20 bg-[#00183E]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 lg:px-10">
          <Link href="/" className="display shrink-0 text-2xl font-bold tracking-wider" aria-label="ravedeprinz home">
            <span className="text-[#00BBFA]">R</span>AVEDEPRINZ<span className="text-[#FFC54A]">_</span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={`text-sm font-semibold tracking-wide transition-colors hover:text-[#79D7FD] ${path === href ? 'text-[#00BBFA]' : 'text-[#b4d4e2]'}`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <details className="relative md:hidden">
            <summary className="cut-small cursor-pointer list-none border border-[#00BBFA]/60 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#79D7FD]">
              Menu <span className="ml-2 text-[#FFC54A]">+</span>
            </summary>
            <nav className="panel cut-small absolute right-0 top-12 w-48 p-2" aria-label="Mobile navigation">
              {links.map(([href, label]) => (
                <Link key={href} href={href} className={`block px-4 py-3 text-sm font-semibold ${path === href ? 'text-[#00BBFA]' : 'text-[#b4d4e2]'}`}>
                  {label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </header>

      {children}

      <footer className="mx-auto flex max-w-7xl justify-between border-t border-cyan/20 px-5 py-8 text-[10px] text-[#79a3b7] lg:px-10">
        <span className="mono">RAVEDEPRINZ // 2024—2025</span>
        <span className="mono">BUILT WITH INTENT <b className="text-[#FFC54A]">◆</b></span>
      </footer>
    </>
  );
}
