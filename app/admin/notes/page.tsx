'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '../../../lib/admin-api';
import { Field, Section } from '../../../components/admin/AdminFields';
import { AdminTabs, AccordionItem } from '../../../components/admin/AdminTabs';

type NoteRow = Record<string, string | number | boolean | null>;

export default function AdminNotes() {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [status, setStatus] = useState('LOADING…');
  const [draft, setDraft] = useState<NoteRow>({});

  async function load() {
    const res = await adminApi<{ notes: NoteRow[] }>('/api/admin/notes');
    if (res.data) { setNotes(res.data.notes); setStatus('LOADED'); }
    else setStatus(res.error ?? 'ERROR');
  }

  useEffect(() => { load(); }, []);

  const update = (index: number, key: string) => (value: string) => setNotes((rows) => rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)));

  async function saveRow(row: NoteRow, publish = false) {
    setStatus('SAVING…');
    const payload = { ...row, published: publish ? true : (row.published ?? false) };
    const res = row.id
      ? await adminApi(`/api/admin/notes/${row.id}`, { method: 'PUT', body: payload })
      : await adminApi('/api/admin/notes', { method: 'POST', body: payload });
    setStatus(res.error ? `ERROR // ${res.error}` : publish ? 'PUBLISHED' : 'SAVED');
    await load();
  }

  async function remove(id: string) {
    await adminApi(`/api/admin/notes/${id}`, { method: 'DELETE' });
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
              <Section eyebrow="NEW NOTE">
                <div className="admin-grid-2">
                  <Field label="TITLE" value={String(draft.title ?? '')} onChange={(v) => setDraft((d) => ({ ...d, title: v, slug: v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') }))} />
                  <Field label="TAG" value={String(draft.tag ?? 'REFLECTION')} onChange={(v) => setDraft((d) => ({ ...d, tag: v }))} />
                </div>
                <Field label="BODY" textarea value={String(draft.body ?? '')} onChange={(v) => setDraft((d) => ({ ...d, body: v }))} />
                <div className="admin-row-actions">
                  <button className="auth-button touch-target" onClick={() => saveRow(draft, false)}>SAVE DRAFT</button>
                  <button className="auth-button touch-target" onClick={() => saveRow(draft, true)}>PUBLISH</button>
                </div>
              </Section>
            ),
          },
          {
            id: 'existing',
            label: 'NOTES',
            count: notes.length,
            content: (
              <Section eyebrow={`NOTES // ${notes.length} ITEMS`}>
                <div className="admin-accordion">
                  {notes.map((note, index) => (
                    <AccordionItem key={String(note.id)} title={String(note.title ?? 'UNTITLED')} subtitle={`${note.tag ?? ''} · ${note.published ? 'PUBLISHED' : 'DRAFT'}`} defaultOpen={index === 0}>
                      <div className="admin-grid-2">
                        <Field label="TITLE" value={String(note.title ?? '')} onChange={update(index, 'title')} />
                        <Field label="TAG" value={String(note.tag ?? '')} onChange={update(index, 'tag')} />
                      </div>
                      <Field label="BODY" textarea value={String(note.body ?? '')} onChange={update(index, 'body')} />
                      <div className="admin-row-actions">
                        <span className="auth-error" style={{ margin: 0 }}>{note.published ? 'PUBLISHED' : 'DRAFT'}</span>
                        <button className="admin-nav-link touch-target" onClick={() => saveRow(note, false)}>SAVE</button>
                        {!note.published && <button className="admin-nav-link touch-target" onClick={() => saveRow(note, true)}>PUBLISH</button>}
                        <button className="admin-nav-link touch-target" onClick={() => remove(String(note.id))}>DELETE</button>
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
