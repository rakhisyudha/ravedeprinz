'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { TransitionLink } from './TransitionLink';

const links = [['/', 'Home'], ['/about', 'About'], ['/work', 'Work'], ['/projects', 'Projects'], ['/notes', 'Notes'], ['/now', 'Now']] as const;

export function Shell({ children, footerName = 'ravedepr1nz', footerLabel = 'PERSONAL ARCHIVE' }: { children: React.ReactNode; footerName?: string; footerLabel?: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuPreview, setMenuPreview] = useState('SELECT');
  const current = links.find(([href]) => href === path)?.[1] ?? 'Home';

  useEffect(() => { setOpen(false); window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); }, [path]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    function handleScroll() { setScrolled(window.scrollY > 24); }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Admin, auth, and standalone note article use their own shells.
  if (path.startsWith('/admin') || path === '/login' || /^\/notes\/[^/]+$/.test(path)) {
    return <>{children}</>;
  }

  return <>
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <TransitionLink href="/" className="site-mark" aria-label="ravedeprinz home"><strong>r</strong>avedeprinz_</TransitionLink>
      <div className="header-state"><span>{current}</span></div>
      <motion.button type="button" className={`menu-trigger ${open ? 'is-open' : ''}`} aria-expanded={open} onClick={() => setOpen((value) => !value)} whileTap={{ scale: 0.94 }} transition={{ duration: .18 }}>
        <motion.span className="bracket bracket-left" animate={{ width: open ? 9 : 14 }} transition={{ duration: .25, ease: [0.65, 0, 0.35, 1] }}>[</motion.span>
        <span className="menu-trigger-label"><AnimatePresence mode="wait" initial={false}><motion.span key={open ? 'close' : 'index'} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .2, ease: 'easeOut' }}>{open ? 'CLOSE' : 'INDEX'}</motion.span></AnimatePresence></span>
        <motion.span className="bracket bracket-right" animate={{ width: open ? 9 : 14 }} transition={{ duration: .25, ease: [0.65, 0, 0.35, 1] }}>]</motion.span>
      </motion.button>
    </header>

    <AnimatePresence>
       {open && <motion.div className="menu-scene" initial={{ clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }} animate={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }} exit={{ clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' }} transition={{ duration: .48, ease: [0.76, 0, 0.24, 1] }}>
         <span className="menu-preview" aria-hidden="true">{menuPreview}</span>
         <motion.button type="button" className="scene-close touch-target" onClick={() => setOpen(false)} whileHover={{ x: 4 }} whileTap={{ scale: .94 }} transition={{ duration: .15 }}><span>[</span> CLOSE <span>]</span></motion.button>
         <nav aria-label="Primary navigation">{links.map(([href, label], index) => <motion.div key={href} initial={{ opacity: 0, x: index % 2 ? 60 : -60 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .08 + index * .045 }}><TransitionLink href={href} onMouseEnter={() => setMenuPreview(label.toUpperCase())} onFocus={() => setMenuPreview(label.toUpperCase())} className={`scene-link ${path === href ? 'active' : ''}`}><span>0{index + 1}</span>{label}</TransitionLink></motion.div>)}</nav>
        <p className="scene-note">A personal archive of work, experiments, observations, and the things currently taking up space in my head.</p>
      </motion.div>}
    </AnimatePresence>

     <AnimatePresence mode="wait"><motion.div key={path} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} transition={{ duration: .32, ease: 'easeOut' }}>{children}</motion.div></AnimatePresence>
    <footer className="site-footer"><span>{footerName}</span><span>{footerLabel} <b>◆</b></span></footer>
  </>;
}
