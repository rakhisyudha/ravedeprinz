<script lang="ts">
  import { onMount } from 'svelte';
  import { adminApi } from '../../lib/admin';
  import { readingMinutes } from '../../lib/readingTime';
  import AdminField from './AdminField.svelte';
import AdminMarkdownPreview from './AdminMarkdownPreview.svelte';
  import AdminSection from './AdminSection.svelte';
  import AdminTabs from './AdminTabs.svelte';
  import AdminAccordion from './AdminAccordion.svelte';
  import AdminImageUpload from './AdminImageUpload.svelte';
  import AdminTagsField from './AdminTagsField.svelte';
  import { validateNoteTagsInput } from '../../lib/adminValidation';
  import { collectTags, noteTagList } from '../../lib/noteTags';
  import type { Note } from '../../lib/cms';

  interface Props {
    apiBase: string;
  }

  const { apiBase } = $props();

  type NoteRow = Record<string, string | number | boolean | string[] | null>;

  let notes: NoteRow[] = $state([]);
  let status = $state('LOADING…');
  let draft: NoteRow = $state({});

  // A row's tags. A list the form has set (even an empty one, mid-edit) is
  // taken as it is, so clearing the field is not undone behind your back. Only
  // a row with no list at all falls back: to the single `tag` from a server that
  // predates multi-tag notes, or, for a brand-new draft, to `fallback`.
  function tagsOf(row: NoteRow, fallback: string[] = []): string[] {
    if (Array.isArray(row.tags)) return row.tags.filter((tag): tag is string => typeof tag === 'string');
    const legacy = noteTagList({ tag: String(row.tag ?? '') });
    return legacy.length > 0 ? legacy : fallback;
  }

  // Every tag already in use, most-used first, offered as click-to-add buttons
  // so a typo cannot quietly create a near-duplicate tag.
  const knownTags = $derived(
    collectTags(notes.map((row) => ({ title: '', slug: '', body: '', tag: String(row.tag ?? ''), tags: tagsOf(row) })) as Note[]).map(
      (entry) => entry.tag,
    ),
  );

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
    // Same rules as the API, checked here first so a bad tag list keeps what was
    // typed instead of making a request that is certain to be refused.
    const checked = validateNoteTagsInput({ tags: tagsOf(row, ['REFLECTION']) });
    if (!checked.ok) {
      status = `ERROR // ${checked.error.message}`;
      return;
    }
    status = 'SAVING…';
    // `tag` is the server's copy of the first tag. Sending the stale value back
    // next to the edited list would be noise, so only `tags` goes.
    const { tag: _legacyTag, ...rest } = row;
    const payload = { ...rest, tags: checked.tags, published: publish ? true : (row.published ?? false) };
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
  <p class={status.startsWith('ERROR') ? 'auth-error' : 'admin-hint'} style="margin-top: 18px">{status}</p>
</section>

{#snippet newTab()}
  <AdminSection eyebrow="NEW NOTE">
    <div class="admin-grid-2">
      <AdminField label="TITLE" value={String(draft.title ?? '')} onChange={(v) => (draft = { ...draft, title: v })} />
      <AdminTagsField
        value={tagsOf(draft, ['REFLECTION'])}
        suggestions={knownTags}
        onChange={(tags) => (draft = { ...draft, tags })}
      />
      <AdminField label="SUBTITLE (META DESC)" value={String(draft.subtitle ?? '')} onChange={(v) => (draft = { ...draft, subtitle: v })} />
      <AdminField label="AUTHOR" value={String(draft.author ?? '')} onChange={(v) => (draft = { ...draft, author: v })} />
      <div class="admin-field"><span class="admin-field-label">READ (COMPUTED)</span><span class="admin-read-preview">{readPreview(draft)}</span></div>
    </div>
    <AdminImageUpload label="COVER IMAGE" value={String(draft.image_url ?? '')} onChange={(v) => (draft = { ...draft, image_url: v })} {apiBase} />
    <AdminTabs
      tabs={[
        { id: 'write', label: 'WRITE', content: draftWrite },
        { id: 'preview', label: 'PREVIEW', content: draftPreview },
      ]}
    />
    {#snippet draftWrite()}
      <AdminField label="BODY (MARKDOWN)" textarea editor value={String(draft.body ?? '')} onChange={(v) => (draft = { ...draft, body: v })} />
    {/snippet}
    {#snippet draftPreview()}
      <AdminMarkdownPreview value={String(draft.body ?? '')} />
    {/snippet}
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
          subtitle={`${tagsOf(note).join(' / ')} · ${note.published ? 'PUBLISHED' : 'DRAFT'}`}
          defaultOpen={index === 0}
        >
          <div class="admin-grid-2">
            <AdminField label="TITLE" value={String(note.title ?? '')} onChange={update(index, 'title')} />
            <AdminTagsField
              value={tagsOf(note)}
              suggestions={knownTags}
              onChange={(tags) => (notes = notes.map((r, i) => (i === index ? { ...r, tags } : r)))}
            />
            <AdminField label="SUBTITLE (META DESC)" value={String(note.subtitle ?? '')} onChange={update(index, 'subtitle')} />
            <AdminField label="AUTHOR" value={String(note.author ?? '')} onChange={update(index, 'author')} />
            <div class="admin-field"><span class="admin-field-label">READ (COMPUTED)</span><span class="admin-read-preview">{readPreview(note)}</span></div>
          </div>
          <AdminImageUpload label="COVER IMAGE" value={String(note.image_url ?? '')} onChange={update(index, 'image_url')} {apiBase} />
          <AdminTabs
            tabs={[
              { id: 'write', label: 'WRITE', content: noteWrite },
              { id: 'preview', label: 'PREVIEW', content: notePreview },
            ]}
          />
          {#snippet noteWrite()}
            <AdminField label="BODY (MARKDOWN)" textarea editor value={String(note.body ?? '')} onChange={update(index, 'body')} />
          {/snippet}
          {#snippet notePreview()}
            <AdminMarkdownPreview value={String(note.body ?? '')} />
          {/snippet}
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
