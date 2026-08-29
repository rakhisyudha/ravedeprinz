'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '../../../lib/admin-api';
import { Field, Section, SaveBar } from '../../../components/admin/AdminFields';
import { AdminTabs, AccordionItem } from '../../../components/admin/AdminTabs';

type WorkRow = Record<string, string | undefined>;
type EduRow = Record<string, string | undefined>;

export default function AdminWork() {
  const [work, setWork] = useState<WorkRow[]>([]);
  const [education, setEducation] = useState<EduRow[]>([]);
  const [status, setStatus] = useState('LOADING…');

  useEffect(() => {
    (async () => {
      const res = await adminApi<{ work: WorkRow[]; education: EduRow[] }>('/api/admin/work');
      if (res.data) {
        setWork(res.data.work ?? []);
        setEducation(res.data.education ?? []);
        setStatus('LOADED');
      } else setStatus(res.error ?? 'ERROR');
    })();
  }, []);

  async function save() {
    setStatus('SAVING…');
    const res = await adminApi('/api/admin/work', { method: 'PUT', body: { work, education } });
    setStatus(res.error ? `ERROR // ${res.error}` : 'SAVED');
  }

  const updateWork = (index: number, key: string) => (value: string) => setWork((rows) => rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  const updateEdu = (index: number, key: string) => (value: string) => setEducation((rows) => rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)));

  return (
    <section className="admin-section">
      <AdminTabs
        tabs={[
          {
            id: 'work',
            label: 'WORK',
            count: work.length,
            content: (
              <Section eyebrow={`WORK // ${work.length} ROLES`}>
                <button className="admin-nav-link touch-target" onClick={() => setWork((rows) => [...rows, {}])}>+ ADD ROLE</button>
                <div className="admin-accordion" style={{ marginTop: 16 }}>
                  {work.map((row, index) => (
                    <AccordionItem key={index} title={row.role || 'NEW ROLE'} subtitle={row.company || 'NO COMPANY'} defaultOpen={index === work.length - 1}>
                      <div className="admin-grid-2">
                        <Field label="ROLE" value={row.role ?? ''} onChange={updateWork(index, 'role')} />
                        <Field label="COMPANY" value={row.company ?? ''} onChange={updateWork(index, 'company')} />
                        <Field label="LOCATION" value={row.location ?? ''} onChange={updateWork(index, 'location')} />
                        <Field label="DATE" value={row.date_label ?? ''} onChange={updateWork(index, 'date_label')} />
                        <Field label="STACK" value={row.stack ?? ''} onChange={updateWork(index, 'stack')} />
                        <Field label="COMPANY URL" value={row.company_url ?? ''} onChange={updateWork(index, 'company_url')} />
                      </div>
                      <Field label="DESCRIPTION" textarea value={row.description ?? ''} onChange={updateWork(index, 'description')} />
                      <button className="admin-nav-link touch-target" onClick={() => setWork((rows) => rows.filter((_, i) => i !== index))}>REMOVE</button>
                    </AccordionItem>
                  ))}
                </div>
              </Section>
            ),
          },
          {
            id: 'edu',
            label: 'EDUCATION',
            count: education.length,
            content: (
              <Section eyebrow={`EDUCATION // ${education.length} ITEMS`}>
                <button className="admin-nav-link touch-target" onClick={() => setEducation((rows) => [...rows, {}])}>+ ADD EDUCATION</button>
                <div className="admin-accordion" style={{ marginTop: 16 }}>
                  {education.map((row, index) => (
                    <AccordionItem key={index} title={row.title || 'NEW EDUCATION'} subtitle={row.institution || 'NO INSTITUTION'} defaultOpen={index === education.length - 1}>
                      <div className="admin-grid-2">
                        <Field label="TITLE" value={row.title ?? ''} onChange={updateEdu(index, 'title')} />
                        <Field label="INSTITUTION" value={row.institution ?? ''} onChange={updateEdu(index, 'institution')} />
                        <Field label="DATE" value={row.date_label ?? ''} onChange={updateEdu(index, 'date_label')} />
                      </div>
                      <Field label="DESCRIPTION" textarea value={row.description ?? ''} onChange={updateEdu(index, 'description')} />
                      <button className="admin-nav-link touch-target" onClick={() => setEducation((rows) => rows.filter((_, i) => i !== index))}>REMOVE</button>
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
