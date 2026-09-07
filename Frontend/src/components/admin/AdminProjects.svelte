<script lang="ts">
  import { onMount } from 'svelte';
  import { adminApi } from '../../lib/admin';
  import AdminField from './AdminField.svelte';
  import AdminSection from './AdminSection.svelte';
  import AdminTabs from './AdminTabs.svelte';
  import AdminAccordion from './AdminAccordion.svelte';
  import AdminImageUpload from './AdminImageUpload.svelte';

  interface Props {
    apiBase: string;
  }

  const { apiBase } = $props();

  type ProjectRow = Record<string, string | number | boolean | null>;

  let projects: ProjectRow[] = $state([]);
  let status = $state('LOADING…');
  let draft: ProjectRow = $state({});

  function slugify(input: string): string {
    return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  async function load() {
    const res = await adminApi<{ projects: ProjectRow[] }>(apiBase, '/api/admin/projects');
    if (res.data) {
      projects = res.data.projects;
      status = 'LOADED';
    } else {
      status = res.error ?? 'ERROR';
    }
  }

  onMount(load);

  function update(index: number, key: string) {
    return (value: string) => {
      projects = projects.map((r, i) => (i === index ? { ...r, [key]: value } : r));
    };
  }

  async function saveRow(row: ProjectRow) {
    status = 'SAVING…';
    const payload = { ...row, year: Number(row.year ?? 0) };
    const res = row.id
      ? await adminApi(apiBase, `/api/admin/projects/${row.id}`, { method: 'PUT', body: payload })
      : await adminApi(apiBase, '/api/admin/projects', { method: 'POST', body: payload });
    status = res.error ? `ERROR // ${res.error}` : 'SAVED';
    await load();
  }

  async function remove(id: string) {
    await adminApi(apiBase, `/api/admin/projects/${id}`, { method: 'DELETE' });
    status = 'DELETED';
    await load();
  }
</script>

<section class="admin-section">
  <AdminTabs
    tabs={[
      { id: 'new', label: 'NEW', content: newTab },
      { id: 'existing', label: 'EXISTING', count: projects.length, content: existingTab },
    ]}
  />
  <p class="auth-error" style="margin-top: 18px">{status}</p>
</section>

{#snippet newTab()}
  <AdminSection eyebrow="NEW PROJECT">
    <div class="admin-grid-2">
      <AdminField label="TITLE" value={String(draft.title ?? '')} onChange={(v) => (draft = { ...draft, title: v, slug: slugify(v) })} />
      <AdminField label="YEAR" type="number" value={String(draft.year ?? '')} onChange={(v) => (draft = { ...draft, year: v })} />
      <AdminField label="STATUS" value={String(draft.status ?? 'FINISHED')} onChange={(v) => (draft = { ...draft, status: v })} />
      <AdminField label="DEPLOYMENT" value={String(draft.deployment_status ?? 'DEPLOYED')} onChange={(v) => (draft = { ...draft, deployment_status: v })} />
      <AdminField label="STACK" value={String(draft.stack ?? '')} onChange={(v) => (draft = { ...draft, stack: v })} />
      <AdminField label="LIVE URL" value={String(draft.live_url ?? '')} onChange={(v) => (draft = { ...draft, live_url: v })} />
      <AdminField label="SOURCE URL" value={String(draft.source_url ?? '')} onChange={(v) => (draft = { ...draft, source_url: v })} />
    </div>
    <AdminImageUpload label="IMAGE" value={String(draft.image_url ?? '')} onChange={(v) => (draft = { ...draft, image_url: v })} {apiBase} />
    <AdminField label="DESCRIPTION" textarea value={String(draft.description ?? '')} onChange={(v) => (draft = { ...draft, description: v })} />
    <button class="auth-button touch-target" onclick={() => saveRow(draft)}>CREATE PROJECT</button>
  </AdminSection>
{/snippet}

{#snippet existingTab()}
  <AdminSection eyebrow={`EXISTING // ${projects.length} PROJECTS`}>
    <div class="admin-accordion">
      {#each projects as project, index (String(project.id))}
        <AdminAccordion title={String(project.title ?? 'UNTITLED')} subtitle={`${project.year ?? ''} · ${project.status ?? ''}`}>
          <div class="admin-grid-2">
            <AdminField label="TITLE" value={String(project.title ?? '')} onChange={update(index, 'title')} />
            <AdminField label="YEAR" type="number" value={String(project.year ?? '')} onChange={update(index, 'year')} />
            <AdminField label="STATUS" value={String(project.status ?? '')} onChange={update(index, 'status')} />
            <AdminField label="DEPLOYMENT" value={String(project.deployment_status ?? '')} onChange={update(index, 'deployment_status')} />
            <AdminField label="STACK" value={String(project.stack ?? '')} onChange={update(index, 'stack')} />
            <AdminField label="LIVE URL" value={String(project.live_url ?? '')} onChange={update(index, 'live_url')} />
            <AdminField label="SOURCE URL" value={String(project.source_url ?? '')} onChange={update(index, 'source_url')} />
          </div>
          <AdminImageUpload label="IMAGE" value={String(project.image_url ?? '')} onChange={update(index, 'image_url')} {apiBase} />
          <AdminField label="DESCRIPTION" textarea value={String(project.description ?? '')} onChange={update(index, 'description')} />
          <div class="admin-row-actions">
            <button class="admin-nav-link touch-target" onclick={() => saveRow(project)}>SAVE</button>
            <button class="admin-nav-link touch-target" onclick={() => remove(String(project.id))}>DELETE</button>
          </div>
        </AdminAccordion>
      {/each}
    </div>
  </AdminSection>
{/snippet}
