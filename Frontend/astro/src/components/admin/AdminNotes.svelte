<script lang="ts">
  import { onMount } from 'svelte';
  import { adminApi } from '../../lib/admin';
  import { readingMinutes } from '../../lib/readingTime';
  import AdminField from './AdminField.svelte';
  import AdminSection from './AdminSection.svelte';
  import AdminTabs from './AdminTabs.svelte';
  import AdminAccordion from './AdminAccordion.svelte';
  import AdminImageUpload from './AdminImageUpload.svelte';

  interface Props {
    apiBase: string;
  }

  const { apiBase } = $props();

  type NoteRow = Record<string, string | number | boolean | null>;

  let notes: NoteRow[] = $state([]);
  let status = $state('LOADING…');
  let draft: NoteRow = $state({});

  function slugify(input: string): string {
    return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function readPreview(row: NoteRow): string {
    return `READ ${String(readingMinutes(String(row.body ?? ''), String(row.image_url ?? ''))).padStart(2, '0')} MIN`;
  }

  async function load() {
    const res = await adminApi<{ notes: NoteRow[] }>(apiBase, '/api/admin/notes');
    if (res.data) {
      notes = res.data.notes;
      status = 'LOADED';
    } else {
      status = res.error ?? 'ERROR';
    }
  }

  onMount(load);

  function update(index: number, key: string) {
    return (value: string) => {
      notes = notes.map((r, i) => (i === index ? { ...r, [key]: value } : r));
    };
  }

  async function saveRow(row: NoteRow, publish = false) {
    status = 'SAVING…';
    const payload = { ...row, published: publish ? true : (row.published ?? false) };
    const res = row.id
      ? await adminApi(apiBase, `/api/admin/notes/${row.id}`, { method: 'PUT', body: payload })
      : await adminApi(apiBase, '/api/admin/notes', { method: 'POST', body: payload });
    status = res.error ? `ERROR // ${res.error}` : publish ? 'PUBLISHED' : 'SAVED';
    await load();
  }

  async function remove(id: string) {
    await adminApi(apiBase, `/api/admin/notes/${id}`, { method: 'DELETE' });
    status = 'DELETED';
    await load();
  }
</script>

<section class="admin-section">
  <AdminTabs
    tabs={[
      { id: 'new', label: 'NEW', content: newTab },
      { id: 'existing', label: 'NOTES', count: notes.length, content: existingTab },
    ]}
  />
  <p class="auth-error" style="margin-top: 18px">{status}</p>
</section>

{#snippet newTab()}
  <AdminSection eyebrow="NEW NOTE">
    <div class="admin-grid-2">
      <AdminField label="TITLE" value={String(draft.title ?? '')} onChange={(v) => (draft = { ...draft, title: v, slug: slugify(v) })} />
      <AdminField label="TAG" value={String(draft.tag ?? 'REFLECTION')} onChange={(v) => (draft = { ...draft, tag: v })} />
      <AdminField label="SUBTITLE (META DESC)" value={String(draft.subtitle ?? '')} onChange={(v) => (draft = { ...draft, subtitle: v })} />
      <AdminField label="AUTHOR" value={String(draft.author ?? '')} onChange={(v) => (draft = { ...draft, author: v })} />
      <div class="admin-field"><span class="admin-field-label">READ (COMPUTED)</span><span class="admin-read-preview">{readPreview(draft)}</span></div>
    </div>
    <AdminImageUpload label="COVER IMAGE" value={String(draft.image_url ?? '')} onChange={(v) => (draft = { ...draft, image_url: v })} {apiBase} />
    <AdminField label="BODY (MARKDOWN)" textarea value={String(draft.body ?? '')} onChange={(v) => (draft = { ...draft, body: v })} />
    <div class="admin-row-actions">
      <button class="auth-button touch-target" onclick={() => saveRow(draft, false)}>SAVE DRAFT</button>
      <button class="auth-button touch-target" onclick={() => saveRow(draft, true)}>PUBLISH</button>
    </div>
  </AdminSection>
{/snippet}

{#snippet existingTab()}
  <AdminSection eyebrow={`NOTES // ${notes.length} ITEMS`}>
    <div class="admin-accordion">
      {#each notes as note, index (String(note.id))}
        <AdminAccordion
          title={String(note.title ?? 'UNTITLED')}
          subtitle={`${note.tag ?? ''} · ${note.published ? 'PUBLISHED' : 'DRAFT'}`}
          defaultOpen={index === 0}
        >
          <div class="admin-grid-2">
            <AdminField label="TITLE" value={String(note.title ?? '')} onChange={update(index, 'title')} />
            <AdminField label="TAG" value={String(note.tag ?? '')} onChange={update(index, 'tag')} />
            <AdminField label="SUBTITLE (META DESC)" value={String(note.subtitle ?? '')} onChange={update(index, 'subtitle')} />
            <AdminField label="AUTHOR" value={String(note.author ?? '')} onChange={update(index, 'author')} />
            <div class="admin-field"><span class="admin-field-label">READ (COMPUTED)</span><span class="admin-read-preview">{readPreview(note)}</span></div>
          </div>
          <AdminImageUpload label="COVER IMAGE" value={String(note.image_url ?? '')} onChange={update(index, 'image_url')} {apiBase} />
          <AdminField label="BODY (MARKDOWN)" textarea value={String(note.body ?? '')} onChange={update(index, 'body')} />
          <div class="admin-row-actions">
            <span class="auth-error" style="margin: 0">{note.published ? 'PUBLISHED' : 'DRAFT'}</span>
            <button class="admin-nav-link touch-target" onclick={() => saveRow(note, false)}>SAVE</button>
            {#if !note.published}
              <button class="admin-nav-link touch-target" onclick={() => saveRow(note, true)}>PUBLISH</button>
            {/if}
            <button class="admin-nav-link touch-target" onclick={() => remove(String(note.id))}>DELETE</button>
          </div>
        </AdminAccordion>
      {/each}
    </div>
  </AdminSection>
{/snippet}
