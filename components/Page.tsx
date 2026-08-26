'use client';

import { motion } from 'framer-motion';

type PageProps = {
  eyebrow: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
};

export function Page({ eyebrow, title, intro, children }: PageProps) {
  return (
    <main className="mx-auto min-h-screen max-w-7xl overflow-x-hidden px-4 pb-16 pt-28 sm:px-5 sm:pt-32 lg:px-10 lg:pb-20">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-10 grid gap-6 sm:mb-14 lg:grid-cols-[1fr_360px] lg:items-end"
      >
        <div className="min-w-0">
          <p className="eyebrow mb-4 sm:mb-5">
            <span className="slash">//</span> {eyebrow}
          </p>
          <h1 className="display break-words text-6xl font-bold leading-[0.82] text-[#e8f7ff] sm:text-8xl lg:text-[10rem]">
            {title}
          </h1>
        </div>
        {intro && (
          <p className="max-w-sm border-l border-[#00BBFA] pl-4 text-sm leading-7 text-[#a8c6d3] sm:pl-5">
            {intro}
          </p>
        )}
      </motion.div>
      {children}
    </main>
  );
}
