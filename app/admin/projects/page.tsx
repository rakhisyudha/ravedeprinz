'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '../../../lib/admin-api';
import { Field, Section } from '../../../components/admin/AdminFields';
import { AdminTabs, AccordionItem } from '../../../components/admin/AdminTabs';

type ProjectRow = Record<string, string | number | boolean | null>;

export default function AdminProjects() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [status, setStatus] = useState('LOADING…');
  const [draft, setDraft] = useState<ProjectRow>({});

  async function load() {
    const res = await adminApi<{ projects: ProjectRow[] }>('/api/admin/projects');
    if (res.data) { setProjects(res.data.projects); setStatus('LOADED'); }
    else setStatus(res.error ?? 'ERROR');
  }

  useEffect(() => { load(); }, []);

  const update = (index: number, key: string) => (value: string) => setProjects((rows) => rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)));

  async function saveRow(row: ProjectRow) {
    setStatus('SAVING…');
    const payload = { ...row, year: Number(row.year ?? 0) };
    const res = row.id
      ? await adminApi(`/api/admin/projects/${row.id}`, { method: 'PUT', body: payload })
      : await adminApi('/api/admin/projects', { method: 'POST', body: payload });
    setStatus(res.error ? `ERROR // ${res.error}` : 'SAVED');
    await load();
  }

  async function remove(id: string) {
    await adminApi(`/api/admin/projects/${id}`, { method: 'DELETE' });
    setStatus('DELETED');
    await load();
  }

  return (
    <section className="admin-section">
      <AdminTabs
        tabs={[
          {
            id: 'new',
            label: 'NEW',
            content: (
              <Section eyebrow="NEW PROJECT">
                <div className="admin-grid-2">
                  <Field label="TITLE" value={String(draft.title ?? '')} onChange={(v) => setDraft((d) => ({ ...d, title: v, slug: v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') }))} />
                  <Field label="YEAR" type="number" value={String(draft.year ?? '')} onChange={(v) => setDraft((d) => ({ ...d, year: v }))} />
                  <Field label="STATUS" value={String(draft.status ?? 'FINISHED')} onChange={(v) => setDraft((d) => ({ ...d, status: v }))} />
                  <Field label="DEPLOYMENT" value={String(draft.deployment_status ?? 'DEPLOYED')} onChange={(v) => setDraft((d) => ({ ...d, deployment_status: v }))} />
                  <Field label="STACK" value={String(draft.stack ?? '')} onChange={(v) => setDraft((d) => ({ ...d, stack: v }))} />
                  <Field label="LIVE URL" value={String(draft.live_url ?? '')} onChange={(v) => setDraft((d) => ({ ...d, live_url: v }))} />
                  <Field label="SOURCE URL" value={String(draft.source_url ?? '')} onChange={(v) => setDraft((d) => ({ ...d, source_url: v }))} />
                </div>
                <Field label="DESCRIPTION" textarea value={String(draft.description ?? '')} onChange={(v) => setDraft((d) => ({ ...d, description: v }))} />
                <button className="auth-button touch-target" onClick={() => saveRow(draft)}>CREATE PROJECT</button>
              </Section>
            ),
          },
          {
            id: 'existing',
            label: 'EXISTING',
            count: projects.length,
            content: (
              <Section eyebrow={`EXISTING // ${projects.length} PROJECTS`}>
                <div className="admin-accordion">
                  {projects.map((project, index) => (
                    <AccordionItem key={String(project.id)} title={String(project.title ?? 'UNTITLED')} subtitle={`${project.year ?? ''} · ${project.status ?? ''}`}>
                      <div className="admin-grid-2">
                        <Field label="TITLE" value={String(project.title ?? '')} onChange={update(index, 'title')} />
                        <Field label="YEAR" type="number" value={String(project.year ?? '')} onChange={update(index, 'year')} />
                        <Field label="STATUS" value={String(project.status ?? '')} onChange={update(index, 'status')} />
                        <Field label="DEPLOYMENT" value={String(project.deployment_status ?? '')} onChange={update(index, 'deployment_status')} />
                        <Field label="STACK" value={String(project.stack ?? '')} onChange={update(index, 'stack')} />
                        <Field label="LIVE URL" value={String(project.live_url ?? '')} onChange={update(index, 'live_url')} />
                        <Field label="SOURCE URL" value={String(project.source_url ?? '')} onChange={update(index, 'source_url')} />
                      </div>
                      <Field label="DESCRIPTION" textarea value={String(project.description ?? '')} onChange={update(index, 'description')} />
                      <div className="admin-row-actions">
                        <button className="admin-nav-link touch-target" onClick={() => saveRow(project)}>SAVE</button>
                        <button className="admin-nav-link touch-target" onClick={() => remove(String(project.id))}>DELETE</button>
                      </div>
                    </AccordionItem>
                  ))}
                </div>
              </Section>
            ),
          },
        ]}
      />
      <p className="auth-error" style={{ marginTop: 18 }}>{status}</p>
    </section>
  );
}
