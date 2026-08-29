'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '../../../lib/admin-api';
import { Field, Section, SaveBar } from '../../../components/admin/AdminFields';
import { AdminTabs } from '../../../components/admin/AdminTabs';

type Attention = { number: string; label: string; title: string; note: string };

export default function AdminNow() {
  const [current, setCurrent] = useState<Record<string, unknown>>({});
  const [attention, setAttention] = useState<Attention[]>([]);
  const [history, setHistory] = useState<{ date_label: string; text: string; created_at?: string }[]>([]);
  const [historyDate, setHistoryDate] = useState('');
  const [historyText, setHistoryText] = useState('');
  const [status, setStatus] = useState('LOADING…');

  useEffect(() => {
    (async () => {
      const res = await adminApi<{ current: Record<string, unknown> | null; attention: Attention[]; history: { date_label: string; text: string; created_at?: string }[] }>('/api/admin/now');
      if (res.data) {
        setCurrent(res.data.current ?? {});
        setAttention(res.data.attention ?? []);
        setHistory(res.data.history ?? []);
        setStatus('LOADED');
      } else setStatus(res.error ?? 'ERROR');
    })();
  }, []);

  const set = (key: string) => (value: string) => setCurrent((c) => ({ ...c, [key]: value }));

  async function save() {
    setStatus('SAVING…');
    const res = await adminApi('/api/admin/now/current', {
      method: 'PUT',
      body: {
        current,
        attention,
        historyItem: historyText.trim() ? { date_label: historyDate || 'NOW', text: historyText } : undefined,
      },
    });
    setStatus(res.error ? `ERROR // ${res.error}` : 'SAVED · HISTORY APPENDED');
    if (res.error) return;
    setHistoryText('');
    setHistoryDate('');
    const reload = await adminApi<{ history: { date_label: string; text: string; created_at?: string }[] }>('/api/admin/now/history');
    if (reload.data) setHistory(reload.data.history);
  }

  return (
    <section className="admin-section">
      <AdminTabs
        tabs={[
          {
            id: 'current',
            label: 'CURRENT',
            content: (
              <Section eyebrow="CURRENTLY">
                <div className="admin-grid-2">
                  <Field label="UPDATED LABEL" value={String(current.updated_label ?? '')} onChange={set('updated_label')} />
                  <Field label="LABEL" value={String(current.label ?? '')} onChange={set('label')} />
                  <Field label="TITLE" value={String(current.title ?? '')} onChange={set('title')} />
                </div>
                <Field label="DESCRIPTION" textarea value={String(current.description ?? '')} onChange={set('description')} />
              </Section>
            ),
          },
          {
            id: 'attention',
            label: 'ATTENTION',
            count: attention.length,
            content: (
              <Section eyebrow={`ATTENTION // ${attention.length} ITEMS`}>
                {attention.map((item, index) => (
                  <div className="admin-card-stack" key={index}>
                    <div className="admin-grid-2">
                      <Field label="NUMBER" value={item.number} onChange={(v) => setAttention((a) => a.map((x, i) => (i === index ? { ...x, number: v } : x)))} />
                      <Field label="LABEL" value={item.label} onChange={(v) => setAttention((a) => a.map((x, i) => (i === index ? { ...x, label: v } : x)))} />
                    </div>
                    <Field label="TITLE" value={item.title} onChange={(v) => setAttention((a) => a.map((x, i) => (i === index ? { ...x, title: v } : x)))} />
                    <Field label="NOTE" textarea value={item.note} onChange={(v) => setAttention((a) => a.map((x, i) => (i === index ? { ...x, note: v } : x)))} />
                    <button className="admin-nav-link touch-target" onClick={() => setAttention((a) => a.filter((_, i) => i !== index))}>REMOVE</button>
                  </div>
                ))}
                <button className="admin-nav-link touch-target" onClick={() => setAttention((a) => [...a, { number: `0${a.length + 1}`, label: '', title: '', note: '' }])}>+ ADD ATTENTION</button>
              </Section>
            ),
          },
          {
            id: 'history',
            label: 'HISTORY',
            count: history.length,
            content: (
              <>
                <Section eyebrow="APPEND HISTORY — KEPT FOREVER">
                  <div className="admin-grid-2">
                    <Field label="DATE LABEL" value={historyDate} onChange={setHistoryDate} />
                  </div>
                  <Field label="TEXT" textarea value={historyText} onChange={setHistoryText} />
                  <p className="admin-hint">Saving the current Now content also appends this history entry. The public page shows only the three latest entries.</p>
                </Section>
                <Section eyebrow={`PERMANENT HISTORY // ${history.length}`}>
                  <div className="admin-accordion">
                    {history.map((item, index) => (
                      <div className="admin-accordion-item" key={index} style={{ opacity: 1 }}>
                        <div className="admin-accordion-head" style={{ cursor: 'default' }}>
                          <span><b>{item.date_label}</b> <small>{item.text.slice(0, 60)}</small></span>
                          <small>{item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              </>
            ),
          },
        ]}
      />
      <SaveBar status={status} onSave={save} />
    </section>
  );
}
