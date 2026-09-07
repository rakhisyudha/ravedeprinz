<script lang="ts">
  import { onMount } from 'svelte';
  import { adminApi } from '../../lib/admin';
  import AdminField from './AdminField.svelte';
  import AdminSection from './AdminSection.svelte';
  import AdminSaveBar from './AdminSaveBar.svelte';
  import AdminTabs from './AdminTabs.svelte';

  interface Props {
    apiBase: string;
  }

  const { apiBase } = $props();

  type Attention = { number: string; label: string; title: string; note: string };
  type History = { date_label: string; text: string; created_at?: string };

  let current: Record<string, unknown> = $state({});
  let attention: Attention[] = $state([]);
  let history: History[] = $state([]);
  let historyDate = $state('');
  let historyText = $state('');
  let status = $state('LOADING…');

  onMount(async () => {
    const res = await adminApi<{ current: Record<string, unknown> | null; attention: Attention[]; history: History[] }>(
      apiBase,
      '/api/admin/now',
    );
    if (res.data) {
      current = res.data.current ?? {};
      attention = res.data.attention ?? [];
      history = res.data.history ?? [];
      status = 'LOADED';
    } else {
      status = res.error ?? 'ERROR';
    }
  });

  function set(key: string) {
    return (value: string) => {
      current = { ...current, [key]: value };
    };
  }

  async function save() {
    status = 'SAVING…';
    const res = await adminApi(apiBase, '/api/admin/now/current', {
      method: 'PUT',
      body: {
        current,
        attention,
        historyItem: historyText.trim() ? { date_label: historyDate || 'NOW', text: historyText } : undefined,
      },
    });
    status = res.error ? `ERROR // ${res.error}` : 'SAVED · HISTORY APPENDED';
    if (res.error) return;
    historyText = '';
    historyDate = '';
    const reload = await adminApi<{ history: History[] }>(apiBase, '/api/admin/now/history');
    if (reload.data) history = reload.data.history;
  }
</script>

<section class="admin-section">
  <AdminTabs
    tabs={[
      { id: 'current', label: 'CURRENT', content: currentTab },
      { id: 'attention', label: 'ATTENTION', count: attention.length, content: attentionTab },
      { id: 'history', label: 'HISTORY', count: history.length, content: historyTab },
    ]}
  />
  <AdminSaveBar {status} onSave={save} />
</section>

{#snippet currentTab()}
  <AdminSection eyebrow="CURRENTLY">
    <div class="admin-grid-2">
      <AdminField label="UPDATED LABEL" value={String(current.updated_label ?? '')} onChange={set('updated_label')} />
      <AdminField label="LABEL" value={String(current.label ?? '')} onChange={set('label')} />
      <AdminField label="TITLE" value={String(current.title ?? '')} onChange={set('title')} />
    </div>
    <AdminField label="DESCRIPTION" textarea value={String(current.description ?? '')} onChange={set('description')} />
  </AdminSection>
{/snippet}

{#snippet attentionTab()}
  <AdminSection eyebrow={`ATTENTION // ${attention.length} ITEMS`}>
    {#each attention as item, index (index)}
      <div class="admin-card-stack">
        <div class="admin-grid-2">
          <AdminField label="NUMBER" value={item.number} onChange={(v) => (attention = attention.map((x, i) => (i === index ? { ...x, number: v } : x)))} />
          <AdminField label="LABEL" value={item.label} onChange={(v) => (attention = attention.map((x, i) => (i === index ? { ...x, label: v } : x)))} />
        </div>
        <AdminField label="TITLE" value={item.title} onChange={(v) => (attention = attention.map((x, i) => (i === index ? { ...x, title: v } : x)))} />
        <AdminField label="NOTE" textarea value={item.note} onChange={(v) => (attention = attention.map((x, i) => (i === index ? { ...x, note: v } : x)))} />
        <button class="admin-nav-link touch-target" onclick={() => (attention = attention.filter((_, i) => i !== index))}>
          REMOVE
        </button>
      </div>
    {/each}
    <button class="admin-nav-link touch-target" onclick={() => (attention = [...attention, { number: `0${attention.length + 1}`, label: '', title: '', note: '' }])}>
      + ADD ATTENTION
    </button>
  </AdminSection>
{/snippet}

{#snippet historyTab()}
  <AdminSection eyebrow="APPEND HISTORY — KEPT FOREVER">
    <div class="admin-grid-2">
      <AdminField label="DATE LABEL" value={historyDate} onChange={(v) => (historyDate = v)} />
    </div>
    <AdminField label="TEXT" textarea value={historyText} onChange={(v) => (historyText = v)} />
    <p class="admin-hint">Saving the current Now content also appends this history entry. The public page shows only the three latest entries.</p>
  </AdminSection>
  <AdminSection eyebrow={`PERMANENT HISTORY // ${history.length}`}>
    <div class="admin-accordion">
      {#each history as item, index (index)}
        <div class="admin-accordion-item">
          <div class="admin-accordion-head" style="cursor: default">
            <span><b>{item.date_label}</b> <small>{item.text.slice(0, 60)}</small></span>
            <small>{item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</small>
          </div>
        </div>
      {/each}
    </div>
  </AdminSection>
{/snippet}
