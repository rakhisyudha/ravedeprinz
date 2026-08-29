'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/admin-api';

export default function AdminDashboard() {
  const [counts, setCounts] = useState<{ projects?: number; notes?: number; users?: number; history?: number } | null>(null);

  useEffect(() => {
    (async () => {
      const [projects, notes, users, history] = await Promise.all([
        adminApi<{ projects: unknown[] }>('/api/admin/projects'),
        adminApi<{ notes: unknown[] }>('/api/admin/notes'),
        adminApi<{ users: unknown[] }>('/api/admin/users'),
        adminApi<{ history: unknown[] }>('/api/admin/now/history'),
      ]);
      setCounts({
        projects: projects.data?.projects.length,
        notes: notes.data?.notes.length,
        users: users.data?.users.length,
        history: history.data?.history.length,
      });
    })();
  }, []);

  const cards = [
    ['/admin/home', 'HOME', counts ? String(counts.projects ?? '') : '—'],
    ['/admin/about', 'ABOUT', counts ? String(counts.users ?? '') : '—'],
    ['/admin/work', 'WORK', counts ? String(counts.projects ?? '') : '—'],
    ['/admin/projects', 'PROJECTS', counts ? String(counts.projects ?? '') : '—'],
    ['/admin/notes', 'NOTES', counts ? String(counts.notes ?? '') : '—'],
    ['/admin/now', 'NOW', counts ? String(counts.history ?? '') : '—'],
  ] as const;

  return (
    <section className="admin-dashboard">
      <div className="admin-grid">
        {cards.map(([href, label, count], index) => (
          <Link href={href} key={href} className="admin-card cut touch-target">
            <span>0{index + 1}</span>
            <h2 className="display">{label}</h2>
            <p>{count} records</p>
          </Link>
        ))}
      </div>
      <div className="admin-dashboard-footer">
        <Link href="/admin/users" className="admin-nav-link touch-target">+ REGISTER A NEW ADMIN EMAIL</Link>
        <a href="/" target="_blank" rel="noreferrer" className="admin-nav-link touch-target">VIEW PUBLIC SITE ↗</a>
      </div>
    </section>
  );
}
