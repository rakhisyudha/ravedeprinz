'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { TransitionLink } from './TransitionLink';
import { NavigationContext } from './navigation-context';

const links = [
  ['/', 'Home'],
  ['/about', 'About'],
  ['/work', 'Work'],
  ['/projects', 'Projects'],
  ['/notes', 'Notes'],
  ['/now', 'Now'],
] as const;

type Router = { push: (href: string) => void };

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsTransitioning(false);
  }, [path]);

  useEffect(() => {
    function closeMenu(event: PointerEvent) {
      if (menuOpen && !menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }

    document.addEventListener('pointerdown', closeMenu);
    return () => document.removeEventListener('pointerdown', closeMenu);
  }, [menuOpen]);

  function startTransition(href: string, router: Router) {
    if (isTransitioning) return;
    setMenuOpen(false);
    setIsTransitioning(true);
    window.setTimeout(() => router.push(href), 500);
  }

  return (
    <NavigationContext.Provider value={{ startTransition }}>
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-50 bg-[#00BBFA]"
            initial={{ clipPath: 'circle(0% at 50% 100%)' }}
            animate={{ clipPath: 'circle(150% at 50% 100%)' }}
            exit={{ clipPath: 'circle(0% at 50% 0%)' }}
            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
          />
        )}
      </AnimatePresence>

      <header className="fixed top-0 z-40 w-full border-b border-cyan/20 bg-[#00183E]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 lg:px-10">
          <TransitionLink href="/" className="logo display shrink-0 text-2xl font-bold tracking-wider" aria-label="ravedeprinz home">
            <span className="text-[#00BBFA]">r</span>avedeprinz<span className="text-[#FFC54A]">_</span>
          </TransitionLink>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
            {links.map(([href, label]) => (
              <TransitionLink key={href} href={href} className={`text-sm font-semibold tracking-wide transition-colors hover:text-[#79D7FD] ${path === href ? 'text-[#00BBFA]' : 'text-[#b4d4e2]'}`}>
                {label}
              </TransitionLink>
            ))}
          </nav>

          <div ref={menuRef} className="relative md:hidden">
            <button type="button" className="cut-small border border-[#00BBFA]/60 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#79D7FD]" aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen((open) => !open)}>
              Menu <motion.span animate={{ rotate: menuOpen ? 45 : 0 }} className="ml-2 inline-block text-[#FFC54A]">+</motion.span>
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.nav id="mobile-navigation" className="panel cut-small absolute right-0 top-12 w-52 origin-top-right p-2" initial={{ opacity: 0, scale: 0.9, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -8 }} transition={{ duration: 0.16, ease: 'easeOut' }} aria-label="Mobile navigation">
                  {links.map(([href, label]) => (
                    <TransitionLink key={href} href={href} onClick={() => setMenuOpen(false)} className={`menu-link lift block cut-small px-4 py-3 text-sm font-semibold ${path === href ? 'text-[#00BBFA]' : 'text-[#b4d4e2]'}`}>
                      {label}
                    </TransitionLink>
                  ))}
                </motion.nav>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {children}

      <footer className="mx-auto flex max-w-7xl justify-between border-t border-cyan/20 px-5 py-8 text-[10px] text-[#79a3b7] lg:px-10">
        <span className="mono">RAVEDEPRINZ // 2024 TO 2025</span>
        <span className="mono">BUILT WITH INTENT <b className="text-[#FFC54A]">◆</b></span>
      </footer>
    </NavigationContext.Provider>
  );
}
