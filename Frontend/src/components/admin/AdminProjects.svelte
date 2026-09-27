<script lang="ts">
  import { onMount } from 'svelte';
  import { adminApi } from '../../lib/admin';
  import AdminCheckbox from './AdminCheckbox.svelte';
  import AdminField from './AdminField.svelte';
  import AdminSection from './AdminSection.svelte';
  import AdminTabs from './AdminTabs.svelte';
  import AdminAccordion from './AdminAccordion.svelte';
  import AdminImageUpload from './AdminImageUpload.svelte';
  import {
    CASE_STUDY_FIELDS,
    ORDER_RANGE_LABEL,
    labelFor,
    validateCaseStudyInput,
    validateOrderInput,
    type FieldError,
  } from '../../lib/adminValidation';
  import { selectFeaturedProjects } from '../../lib/projects';
  import type { Project } from '../../lib/cms';

  interface Props {
    apiBase: string;
  }

  const { apiBase } = $props();

  type ProjectRow = Record<string, string | number | boolean | null>;

  let projects: ProjectRow[] = $state([]);
  let status = $state('LOADING…');
  let draft: ProjectRow = $state({});

  // Per-row state replaces the single global status string: saving one project
  // must not report success (or failure) for another, and a failed save has to
  // keep its unsaved values with an error next to them.
  let rowStatus = $state<Record<string, { tone: 'ok' | 'error'; message: string; field?: string }>>({});
  let draftStatus = $state<{ tone: 'ok' | 'error'; message: string; field?: string } | null>(null);

  const DRAFT_KEY = 'new';

  function rowKey(row: ProjectRow, index: number): string {
    return String(row.id ?? `${DRAFT_KEY}-${index}`);
  }

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
    return (value: string | boolean) => {
      projects = projects.map((r, i) => (i === index ? { ...r, [key]: value } : r));
    };
  }

  function draftUpdate(key: string) {
    return (value: string | boolean) => {
      draft = { ...draft, [key]: value };
    };
  }

  /**
   * Client-side pre-flight. The API validates the same rules, but running them
   * here means an invalid form never leaves the browser and the typed value
   * stays put with the reason shown next to the field.
   */
  function validateRow(row: ProjectRow): FieldError | null {
    return validateOrderInput(row.sort_order) ?? validateCaseStudyInput(row as never);
  }

  function setRowState(key: string, state: { tone: 'ok' | 'error'; message: string; field?: string }) {
    rowStatus = { ...rowStatus, [key]: state };
  }

  async function saveRow(row: ProjectRow, index: number) {
    const key = rowKey(row, index);
    const isDraft = key.startsWith(DRAFT_KEY);
    const setState = (state: { tone: 'ok' | 'error'; message: string; field?: string }) =>
      isDraft ? (draftStatus = state) : setRowState(key, state);

    const invalid = validateRow(row);
    if (invalid) {
      setState({ tone: 'error', message: invalid.message, field: invalid.field });
      return;
    }

    setState({ tone: 'ok', message: 'SAVING…' });
    const payload = { ...row, year: Number(row.year ?? 0), sort_order: Number(row.sort_order ?? 0) };
    const res = row.id
      ? await adminApi<{ field?: string }>(apiBase, `/api/admin/projects/${row.id}`, {
          method: 'PUT',
          body: payload,
        })
      : await adminApi<{ field?: string }>(apiBase, '/api/admin/projects', {
          method: 'POST',
          body: payload,
        });

    if (res.error) {
      // Keep the unsaved values: load() is deliberately not called here, so a
      // server-side rejection never discards what the owner typed.
      setState({ tone: 'error', message: res.error, field: res.data?.field });
      return;
    }

    setState({ tone: 'ok', message: 'SAVED' });
    // Reload only on success, so the accordion shows the stored values.
    if (row.id) await load();
    else {
      draft = {};
      draftStatus = null;
    }
  }

  async function remove(id: string) {
    const res = await adminApi(apiBase, `/api/admin/projects/${id}`, { method: 'DELETE' });
    if (res.error) {
      setRowState(id, { tone: 'error', message: res.error });
      return;
    }
    await load();
  }

  // The home strip shows at most three featured projects, so the notice names
  // exactly the ones that will appear and in the order they will.
  const featured = $derived(
    selectFeaturedProjects(
      projects.map((row) => ({ ...row, sort_order: Number(row.sort_order ?? 0) })) as unknown as Project[],
      3,
    ),
  );
  const overFeatured = $derived(
    projects.filter(
      (row) => row.featured === true && row.published !== false && row.visible !== false,
    ).length > 3,
  );

  function fieldError(
    state: { tone: 'ok' | 'error'; message: string; field?: string } | null | undefined,
    field: string,
  ): string {
    if (!state || state.tone !== 'error') return '';
    return state.field === field ? state.message : '';
  }
</script>

<section class="admin-section">
  <AdminTabs
    tabs={[
      { id: 'new', label: 'NEW', content: newTab },
      { id: 'existing', label: 'EXISTING', count: projects.length, content: existingTab },
    ]}
  />
  <p class={status.startsWith('ERROR') ? 'auth-error' : 'admin-hint'} style="margin-top: 18px">{status}</p>
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
      <AdminCheckbox
        label="FEATURED"
        checked={draft.featured === true}
        onChange={(v) => (draft = { ...draft, featured: v })}
        hint={`Appears on the home page. Only the first ${3} by order are shown.`}
      />
      <AdminField
        label={`ORDER (${ORDER_RANGE_LABEL})`}
        type="number"
        value={String(draft.sort_order ?? '')}
        error={fieldError(draftStatus, 'sort_order')}
        onChange={draftUpdate('sort_order')}
      />
    </div>
    <AdminImageUpload label="IMAGE" value={String(draft.image_url ?? '')} onChange={(v) => (draft = { ...draft, image_url: v })} {apiBase} />
    <AdminField
      label="DESCRIPTION"
      textarea
      editor
      value={String(draft.description ?? '')}
      onChange={(v) => (draft = { ...draft, description: v })}
    />

    {#each CASE_STUDY_FIELDS as field (field)}
      <AdminField
        label={labelFor(field).toUpperCase()}
        textarea
        editor
        value={String(draft[field] ?? '')}
        error={fieldError(draftStatus, field)}
        onChange={draftUpdate(field)}
      />
    {/each}

    {#if draftStatus}
      <p class={draftStatus.tone === 'error' ? 'auth-error' : 'admin-hint'} role="status" style="margin: 14px 0 0">
        {draftStatus.message}
      </p>
    {/if}

    <button class="auth-button touch-target" onclick={() => saveRow(draft, 0)}>CREATE PROJECT</button>
  </AdminSection>
{/snippet}

{#snippet existingTab()}
  <AdminSection eyebrow={`EXISTING // ${projects.length} PROJECTS`}>
    {#if overFeatured}
      <p class="admin-hint" role="status">
        More than 3 projects are marked featured. Only the first 3 by order appear on the home page:
        {featured.map((p) => p.title).join(', ')}.
      </p>
    {/if}

    <div class="admin-accordion">
      {#each projects as project, index (String(project.id))}
        {@const key = rowKey(project, index)}
        {@const state = rowStatus[key]}
        <AdminAccordion title={String(project.title ?? 'UNTITLED')} subtitle={`${project.year ?? ''} · ${project.status ?? ''}`}>
          <div class="admin-grid-2">
            <AdminField label="TITLE" value={String(project.title ?? '')} onChange={update(index, 'title')} />
            <AdminField label="YEAR" type="number" value={String(project.year ?? '')} onChange={update(index, 'year')} />
            <AdminField label="STATUS" value={String(project.status ?? '')} onChange={update(index, 'status')} />
            <AdminField label="DEPLOYMENT" value={String(project.deployment_status ?? '')} onChange={update(index, 'deployment_status')} />
            <AdminField label="STACK" value={String(project.stack ?? '')} onChange={update(index, 'stack')} />
            <AdminField label="LIVE URL" value={String(project.live_url ?? '')} onChange={update(index, 'live_url')} />
            <AdminField label="SOURCE URL" value={String(project.source_url ?? '')} onChange={update(index, 'source_url')} />
            <AdminCheckbox
              label="FEATURED"
              checked={project.featured === true}
              onChange={update(index, 'featured')}
              hint={`Appears on the home page. Only the first ${3} by order are shown.`}
            />
            <AdminField
              label={`ORDER (${ORDER_RANGE_LABEL})`}
              type="number"
              value={String(project.sort_order ?? '')}
              error={fieldError(state, 'sort_order')}
              onChange={update(index, 'sort_order')}
            />
          </div>
          <AdminImageUpload label="IMAGE" value={String(project.image_url ?? '')} onChange={update(index, 'image_url')} {apiBase} />
          <AdminField
            label="DESCRIPTION"
            textarea
            editor
            value={String(project.description ?? '')}
            onChange={update(index, 'description')}
          />

          {#each CASE_STUDY_FIELDS as field (field)}
            <AdminField
              label={labelFor(field).toUpperCase()}
              textarea
              editor
              value={String(project[field] ?? '')}
              error={fieldError(state, field)}
              onChange={update(index, field)}
            />
          {/each}

          {#if state}
            <p
              class={state.tone === 'error' ? 'auth-error' : 'admin-hint'}
              role="status"
              style="margin: 14px 0 0"
            >
              {state.message}
              {#if state.tone === 'error' && state.field}
                — check {labelFor(state.field).toLowerCase()}.
              {/if}
            </p>
          {/if}

          <div class="admin-row-actions">
            <button class="admin-nav-link touch-target" onclick={() => saveRow(project, index)}>SAVE</button>
            <button class="admin-nav-link touch-target" onclick={() => remove(String(project.id))}>DELETE</button>
          </div>
        </AdminAccordion>
      {/each}
    </div>
  </AdminSection>
{/snippet}
