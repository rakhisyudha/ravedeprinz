'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Page } from '../../components/Page';
import type { NowContent } from '../../lib/types';

const API = process.env.NEXT_PUBLIC_CMS_API_URL ?? 'http://localhost:4000';

const fallback: NowContent = {
  current: {
    updated_label: '27 AUG 2026',
    label: 'CURRENTLY BUILDING',
    title: 'A CRM.',
    description: "I'm working on the backend side of a CRM at Radius Data Solusi. Most of my attention is currently going into Go, Gin, APIs, authentication, database structure, and keeping the system understandable as it grows.",
  },
  attention: [
    { number: '01', label: 'LEARNING', title: 'gRPC', note: "Trying to understand the trade-offs instead of treating it as just 'REST, but faster.'" },
    { number: '02', label: 'READING', title: 'Designing Data-Intensive Applications', note: 'Slowly. Usually with more tabs open than necessary.' },
    { number: '03', label: 'THINKING ABOUT', title: 'How much complexity can a good name remove?', note: 'Naming things is still harder than it should be.' },
  ],
  history: [
    { date_label: '27 AUG', text: 'Working on the backend side of a CRM.' },
    { date_label: '22 AUG', text: 'Refactored an API surface that had outgrown its first assumptions.' },
    { date_label: '18 AUG', text: 'Started learning more seriously about gRPC.' },
  ],
};

export default function Now() {
  const [data, setData] = useState<NowContent>(fallback);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/content/now`, { cache: 'no-store' });
        if (res.ok) {
          const json = (await res.json()) as NowContent;
          if (json.current) setData(json);
        }
      } catch { /* keep fallback */ }
    })();
  }, []);

  const current = data.current ?? fallback.current!;

  return <Page index="NOW / 006" title="NOW" intro="This page changes. So does everything on it.">
    <header className="now-intro"><span className="eyebrow">NOW</span><span className="now-updated">{current.updated_label}</span><p>This page changes.<br />So does everything on it.</p></header>
    <section className="now-current"><div className="now-current-label"><span className="eyebrow">{current.label}</span><span className="now-current-number">[01]</span></div><h2 className="display">{current.title.split(' ')[0]}<br /><span>{current.title.split(' ').slice(1).join(' ')}</span></h2><p>{current.description}</p></section>
    <section className="now-attention"><div className="now-section-heading"><span className="eyebrow">WHAT HAS MY ATTENTION</span><span className="stripe" /></div>{data.attention.map((item, index) => <motion.article key={item.number} className={`attention-item attention-item-${index}`} initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: .25 }} transition={{ delay: index * .1 }}><span className="attention-number">{item.number}</span><div><p className="eyebrow">{item.label}</p><h3>{item.title}</h3><p>{item.note}</p></div></motion.article>)}</section>
    <section className="now-recent"><div className="now-section-heading"><span className="eyebrow">RECENTLY</span><span className="stripe" /></div>{data.history.map((item, index) => <p key={index}><span>{item.date_label}</span><i />{item.text}</p>)}</section>
  </Page>;
}
