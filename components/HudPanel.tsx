'use client';

import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const stats = [
  ['LOCATION', 'BOGOR, ID'],
  ['FOCUS', 'BACKEND DEVELOPMENT'],
  ['STACK', 'GO · REACT · POSTGRES'],
] as const;

export function HudPanel() {
  const panelRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(panelRef, { once: true, amount: 0.35 });
  const [years, setYears] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    const start = performance.now();
    const duration = 900;

    function count(timestamp: number) {
      const progress = Math.min((timestamp - start) / duration, 1);
      setYears(Math.floor(progress * 4));
      if (progress < 1) requestAnimationFrame(count);
    }

    requestAnimationFrame(count);
  }, [isInView]);

  return (
    <div ref={panelRef} className="hud-panel cut relative isolate overflow-hidden bg-[#00183E] p-6 sm:p-8">
      <div className="hud-scanline pointer-events-none absolute inset-x-0 z-10 h-px bg-[#00BBFA]/70" />
      <div className="pointer-events-none absolute inset-3 border border-[#00BBFA]/20" />

      <span className="hud-corner hud-corner-tl" />
      <span className="hud-corner hud-corner-tr" />
      <span className="hud-corner hud-corner-bl" />
      <span className="hud-corner hud-corner-br" />

      <div className="relative z-20">
        <p className="eyebrow mb-8"><span className="slash">//</span> BUILD PROFILE</p>

        <div className="flex items-end gap-4 border-b border-[#79D7FD]/20 pb-6">
          <motion.span
            className="display text-8xl font-bold leading-none text-[#00BBFA] sm:text-9xl"
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.35 }}
          >
            {years}
          </motion.span>
          <span className="display max-w-[130px] pb-2 text-2xl font-bold leading-[0.9] text-[#e8f7ff]">YEARS BUILDING</span>
        </div>

        <div className="mt-6 space-y-4">
          {stats.map(([label, value], index) => (
            <motion.div
              key={label}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[#79D7FD]/10 pb-3"
              initial={{ opacity: 0, x: -14 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -14 }}
              transition={{ delay: 0.2 + index * 0.1, duration: 0.25 }}
            >
              <span className="mono text-[10px] tracking-widest text-[#79D7FD]">{label}</span>
              <span className="mono text-right text-[10px] text-[#e8f7ff]">{value}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-7 flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.55, duration: 0.3 }}
        >
          <span className="hud-status-dot h-2.5 w-2.5 bg-[#FFC54A]" />
          <span className="mono text-[10px] tracking-widest text-[#FFC54A]">ACTIVELY BUILDING</span>
        </motion.div>
      </div>
    </div>
  );
}
