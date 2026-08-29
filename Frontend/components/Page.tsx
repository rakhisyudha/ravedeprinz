'use client';

import { motion } from 'motion/react';

export function Page({ index, title, intro, children }: { index: string; title: string; intro: string; children: React.ReactNode }) {
  return <main className="page" data-page={title}><span className="brand-watermark" aria-hidden="true">R</span>
    <motion.div className="page-head" initial={{ opacity: 0, x: -35 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .45, ease: [0.22, 1, 0.36, 1] }}>
      <div><p className="eyebrow"><span className="slash">//</span> {index}</p><h1 className="display">{title}</h1></div>
      <p className="intro">{intro}</p>
    </motion.div>
    {children}
  </main>;
}
