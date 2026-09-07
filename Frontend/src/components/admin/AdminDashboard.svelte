<script lang="ts">
  import { onMount } from 'svelte';
  import { adminApi } from '../../lib/admin';

  interface Props {
    apiBase: string;
  }

  const { apiBase } = $props();

  let counts: { projects?: number; notes?: number; users?: number; history?: number } | null = $state(null);

  onMount(async () => {
    const [projects, notes, users, history] = await Promise.all([
      adminApi<{ projects: unknown[] }>(apiBase, '/api/admin/projects'),
      adminApi<{ notes: unknown[] }>(apiBase, '/api/admin/notes'),
      adminApi<{ users: unknown[] }>(apiBase, '/api/admin/users'),
      adminApi<{ history: unknown[] }>(apiBase, '/api/admin/now/history'),
    ]);
    counts = {
      projects: projects.data?.projects.length,
      notes: notes.data?.notes.length,
      users: users.data?.users.length,
      history: history.data?.history.length,
    };
  });

  // Card counts mirror the previous dashboard exactly. Derived (not
  // captured) so late-arriving counts re-render the cards.
  const cards = $derived([
    ['/admin/home', 'HOME', counts ? String(counts.projects ?? '') : '—'],
    ['/admin/about', 'ABOUT', counts ? String(counts.users ?? '') : '—'],
    ['/admin/work', 'WORK', counts ? String(counts.projects ?? '') : '—'],
    ['/admin/projects', 'PROJECTS', counts ? String(counts.projects ?? '') : '—'],
    ['/admin/notes', 'NOTES', counts ? String(counts.notes ?? '') : '—'],
    ['/admin/now', 'NOW', counts ? String(counts.history ?? '') : '—'],
  ] as const);
</script>

<section class="admin-dashboard">
  <div class="admin-grid">
    {#each cards as [href, label, count], index}
      <a {href} class="admin-card cut touch-target">
        <span>0{index + 1}</span>
        <h2 class="display">{label}</h2>
        <p>{count} records</p>
      </a>
    {/each}
  </div>
  <div class="admin-dashboard-footer">
    <a href="/admin/users" class="admin-nav-link touch-target">+ REGISTER A NEW ADMIN EMAIL</a>
    <a href="/" target="_blank" rel="noreferrer" class="admin-nav-link touch-target">VIEW PUBLIC SITE ↗</a>
  </div>
</section>
