'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '../../../lib/admin-api';
import { Field, Section, SaveBar } from '../../../components/admin/AdminFields';
import { AdminTabs, AccordionItem } from '../../../components/admin/AdminTabs';
import { AdminImageUpload } from '../../../components/admin/AdminImageUpload';

type Skill = { id?: string; category: string; skill_name: string };

export default function AdminAbout() {
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [skills, setSkills] = useState<Skill[]>([]);
  const [status, setStatus] = useState('LOADING…');

  useEffect(() => {
    (async () => {
      const res = await adminApi<{ content: Record<string, unknown> | null; skills: Skill[] }>('/api/admin/about');
      if (res.data) {
        setContent(res.data.content ?? {});
        setSkills(res.data.skills ?? []);
        setStatus('LOADED');
      } else setStatus(res.error ?? 'ERROR');
    })();
  }, []);

  const set = (key: string) => (value: string) => setContent((c) => ({ ...c, [key]: value }));

  async function save() {
    setStatus('SAVING…');
    const res = await adminApi('/api/admin/about', { method: 'PUT', body: { content, skills } });
    setStatus(res.error ? `ERROR // ${res.error}` : 'SAVED');
  }

  // group skills for count
  const grouped = skills.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="admin-section">
      <AdminTabs
        tabs={[
          {
            id: 'copy',
            label: 'COPY',
            content: (
              <Section eyebrow="ABOUT COPY">
                <div className="admin-grid-2">
                  <Field label="EYEBROW" value={String(content.eyebrow ?? '')} onChange={set('eyebrow')} />
                  <Field label="QUOTE" value={String(content.quote ?? '')} onChange={set('quote')} />
                  <Field label="QUOTE ACCENT" value={String(content.quote_accent ?? '')} onChange={set('quote_accent')} />
                </div>
                <AdminImageUpload label="PORTRAIT" value={String(content.portrait_url ?? '')} onChange={set('portrait_url')} />
                <Field label="PARAGRAPH ONE" textarea value={String(content.paragraph_one ?? '')} onChange={set('paragraph_one')} />
                <Field label="PARAGRAPH TWO" textarea value={String(content.paragraph_two ?? '')} onChange={set('paragraph_two')} />
              </Section>
            ),
          },
          {
            id: 'skills',
            label: 'SKILLS',
            count: skills.length,
            content: (
              <Section eyebrow={`SKILLS // ${skills.length} ITEMS — ${Object.keys(grouped).length} GROUPS`}>
                <button className="admin-nav-link touch-target" onClick={() => setSkills((s) => [...s, { category: '', skill_name: '' }])}>+ ADD SKILL</button>
                <div className="admin-accordion" style={{ marginTop: 16 }}>
                  {skills.map((skill, index) => (
                    <AccordionItem key={index} title={skill.skill_name || 'NEW SKILL'} subtitle={skill.category || 'NO CATEGORY'} defaultOpen={index === skills.length - 1}>
                      <div className="admin-grid-2">
                        <Field label="CATEGORY" value={skill.category} onChange={(v) => setSkills((s) => s.map((x, i) => (i === index ? { ...x, category: v } : x)))} />
                        <Field label="SKILL" value={skill.skill_name} onChange={(v) => setSkills((s) => s.map((x, i) => (i === index ? { ...x, skill_name: v } : x)))} />
                      </div>
                      <button className="admin-nav-link touch-target" onClick={() => setSkills((s) => s.filter((_, i) => i !== index))}>REMOVE</button>
                    </AccordionItem>
                  ))}
                </div>
              </Section>
            ),
          },
        ]}
      />
      <SaveBar status={status} onSave={save} />
    </section>
  );
}
