'use client';

import { motion } from 'motion/react';
import { Page } from '../../components/Page';

const now = {
  updated: '27 AUG 2026',
  current: {
    label: 'CURRENTLY BUILDING',
    title: 'A CRM.',
    description: "I'm working on the backend side of a CRM at Radius Data Solusi. Most of my attention is currently going into Go, Gin, APIs, authentication, database structure, and keeping the system understandable as it grows.",
  },
  attention: [
    { number: '01', label: 'LEARNING', title: 'gRPC', note: "Trying to understand the trade-offs instead of treating it as just 'REST, but faster.'" },
    { number: '02', label: 'READING', title: 'Designing Data-Intensive Applications', note: 'Slowly. Usually with more tabs open than necessary.' },
    { number: '03', label: 'THINKING ABOUT', title: 'How much complexity can a good name remove?', note: 'Naming things is still harder than it should be.' },
  ],
  recently: [
    ['27 AUG', 'Working on the backend side of a CRM.'],
    ['22 AUG', 'Refactored an API surface that had outgrown its first assumptions.'],
    ['18 AUG', 'Started learning more seriously about gRPC.'],
  ],
};

export default function Now() {
  return <Page index="NOW / 006" title="NOW" intro="This page changes. So does everything on it.">
    <header className="now-intro"><span className="eyebrow">NOW</span><span className="now-updated">{now.updated}</span><p>This page changes.<br />So does everything on it.</p></header>
    <section className="now-current"><div className="now-current-label"><span className="eyebrow">{now.current.label}</span><span className="now-current-number">[01]</span></div><h2 className="display">A<br /><span>CRM.</span></h2><p>{now.current.description}</p></section>
    <section className="now-attention"><div className="now-section-heading"><span className="eyebrow">WHAT HAS MY ATTENTION</span><span className="stripe" /></div>{now.attention.map((item, index) => <motion.article key={item.number} className={`attention-item attention-item-${index}`} initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: .25 }} transition={{ delay: index * .1 }}><span className="attention-number">{item.number}</span><div><p className="eyebrow">{item.label}</p><h3>{item.title}</h3><p>{item.note}</p></div></motion.article>)}</section>
    <section className="now-recent"><div className="now-section-heading"><span className="eyebrow">RECENTLY</span><span className="stripe" /></div>{now.recently.map(([date, text]) => <p key={date}><span>{date}</span><i />{text}</p>)}</section>
  </Page>;
}
