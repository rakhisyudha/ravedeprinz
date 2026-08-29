'use client';

import { motion, useInView } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

export function HudPanel({ years: targetYears = 4, label = 'YEARS BUILDING', noiseTop = '// SYSTEM_04', noiseBottom = 'BUILD / REPEAT / SHIP' }: {
  years?: number;
  label?: string;
  noiseTop?: string;
  noiseBottom?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(panelRef, { once: true, amount: 0.35 });
  const [years, setYears] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    const start = performance.now();
    const duration = 900;
    let frame = 0;

    function count(timestamp: number) {
      const progress = Math.min((timestamp - start) / duration, 1);
      setYears(Math.floor(progress * targetYears));

      if (progress < 1) {
        frame = requestAnimationFrame(count);
      } else {
        setYears(targetYears);
      }
    }

    frame = requestAnimationFrame(count);
    return () => cancelAnimationFrame(frame);
  }, [isInView, targetYears]);

  return (
    <div ref={panelRef} className="hud-panel cut relative isolate overflow-hidden p-6 sm:p-8">
      <div className="hud-slice hud-slice-one pointer-events-none absolute z-10" />
      <div className="hud-slice hud-slice-two pointer-events-none absolute z-10" />
      <span className="hud-notch hud-notch-top" />
      <span className="hud-notch hud-notch-bottom" />

      <div className="relative z-20 flex min-h-[300px] flex-col justify-center">
        <span className="hud-noise hud-noise-top">{noiseTop}</span>
        <motion.span
          className="display hud-number hud-number-reversed block text-[clamp(9rem,22vw,15rem)] font-bold italic leading-[0.72]"
          initial={{ opacity: 0, y: 18 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.35 }}
        >
          {String(years).padStart(2, '0')}
        </motion.span>
        <motion.span
          className="display mt-8 block max-w-[220px] text-3xl font-bold leading-[0.86] text-white sm:text-4xl"
          initial={{ opacity: 0, x: -14 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -14 }}
          transition={{ delay: 0.25, duration: 0.3 }}
        >
          {(() => { const [before = '', ...rest] = label.split(' '); return (<>{before} <strong className="hud-of">0F</strong> {rest.join(' ')}</>); })()}
        </motion.span>
        <span className="hud-noise hud-noise-bottom">{noiseBottom}</span>
      </div>
    </div>
  );
}
