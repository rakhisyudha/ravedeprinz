'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '../../../lib/admin-api';
import { Field, Section, SaveBar } from '../../../components/admin/AdminFields';
import { AdminTabs } from '../../../components/admin/AdminTabs';

type NavRow = { id?: string; page_key: string; label: string; description: string; display_number: string; href: string };

export default function AdminHome() {
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [nav, setNav] = useState<NavRow[]>([]);
  const [status, setStatus] = useState('LOADING…');

  useEffect(() => {
    (async () => {
      const res = await adminApi<{ content: Record<string, unknown> | null; navigation: NavRow[] }>('/api/admin/home');
      if (res.data) {
        setContent(res.data.content ?? {});
        setNav(res.data.navigation ?? []);
        setStatus('LOADED');
      } else setStatus(res.error ?? 'ERROR');
    })();
  }, []);

  const set = (key: string) => (value: string) => setContent((c) => ({ ...c, [key]: value }));

  async function save() {
    setStatus('SAVING…');
    const res = await adminApi('/api/admin/home', { method: 'PUT', body: { content, navigation: nav } });
    setStatus(res.error ? `ERROR // ${res.error}` : 'SAVED');
  }

  return (
    <section className="admin-section">
      <AdminTabs
        tabs={[
          {
            id: 'hero',
            label: 'HERO',
            content: (
              <Section eyebrow="HERO TEXT">
                <div className="admin-grid-2">
                  <Field label="ARCHIVE LABEL" value={String(content.archive_label ?? '')} onChange={set('archive_label')} />
                  <Field label="ARCHIVE NUMBER" value={String(content.archive_number ?? '')} onChange={set('archive_number')} />
                  <Field label="HEADLINE LINE ONE" value={String(content.headline_line_one ?? '')} onChange={set('headline_line_one')} />
                  <Field label="HEADLINE LINE TWO" value={String(content.headline_line_two ?? '')} onChange={set('headline_line_two')} />
                  <Field label="HEADLINE LINE THREE" value={String(content.headline_line_three ?? '')} onChange={set('headline_line_three')} />
                  <Field label="HEADLINE ACCENT" value={String(content.headline_accent ?? '')} onChange={set('headline_accent')} />
                  <Field label="HEADLINE META" value={String(content.headline_meta ?? '')} onChange={set('headline_meta')} />
                  <Field label="CTA LABEL" value={String(content.cta_label ?? '')} onChange={set('cta_label')} />
                  <Field label="CTA URL" value={String(content.cta_url ?? '')} onChange={set('cta_url')} />
                </div>
                <Field label="INTRO" textarea value={String(content.intro ?? '')} onChange={set('intro')} />
              </Section>
            ),
          },
          {
            id: 'hud',
            label: 'HUD',
            content: (
              <Section eyebrow="HUD // 04 → 05 HERE">
                <div className="admin-grid-2">
                  <Field label="YEARS BUILDING" type="number" value={String(content.years_building ?? 4)} onChange={set('years_building')} />
                  <Field label="HUD LABEL" value={String(content.hud_label ?? '')} onChange={set('hud_label')} />
                  <Field label="HUD SUBTITLE" value={String(content.hud_subtitle ?? '')} onChange={set('hud_subtitle')} />
                  <Field label="NOISE TOP" value={String(content.hud_noise_top ?? '')} onChange={set('hud_noise_top')} />
                  <Field label="NOISE BOTTOM" value={String(content.hud_noise_bottom ?? '')} onChange={set('hud_noise_bottom')} />
                </div>
              </Section>
            ),
          },
          {
            id: 'nav',
            label: 'NAV',
            count: nav.length,
            content: (
              <Section eyebrow={`ARCHIVE NAV // ${nav.length} ITEMS`}>
                {nav.map((row, index) => (
                  <div className="admin-card-stack" key={row.id ?? row.page_key}>
                    <div className="admin-grid-2">
                      <Field label="KEY" value={row.page_key} onChange={(v) => setNav((n) => n.map((r, i) => (i === index ? { ...r, page_key: v } : r)))} />
                      <Field label="LABEL" value={row.label} onChange={(v) => setNav((n) => n.map((r, i) => (i === index ? { ...r, label: v } : r)))} />
                      <Field label="NUMBER" value={row.display_number} onChange={(v) => setNav((n) => n.map((r, i) => (i === index ? { ...r, display_number: v } : r)))} />
                      <Field label="HREF" value={row.href} onChange={(v) => setNav((n) => n.map((r, i) => (i === index ? { ...r, href: v } : r)))} />
                    </div>
                    <Field label="DESCRIPTION" value={row.description} onChange={(v) => setNav((n) => n.map((r, i) => (i === index ? { ...r, description: v } : r)))} />
                  </div>
                ))}
              </Section>
            ),
          },
        ]}
      />
      <SaveBar status={status} onSave={save} />
    </section>
  );
}
