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

  type NavRow = { id?: string; page_key: string; label: string; description: string; display_number: string; href: string };

  let content: Record<string, unknown> = $state({});
  let nav: NavRow[] = $state([]);
  let status = $state('LOADING…');

  onMount(async () => {
    const res = await adminApi<{ content: Record<string, unknown> | null; navigation: NavRow[] }>(
      apiBase,
      '/api/admin/home',
    );
    if (res.data) {
      content = res.data.content ?? {};
      nav = res.data.navigation ?? [];
      status = 'LOADED';
    } else {
      status = res.error ?? 'ERROR';
    }
  });

  function set(key: string) {
    return (value: string) => {
      content = { ...content, [key]: value };
    };
  }

  function setNav(index: number, key: keyof NavRow) {
    return (value: string) => {
      nav = nav.map((r, i) => (i === index ? { ...r, [key]: value } : r));
    };
  }

  async function save() {
    status = 'SAVING…';
    const res = await adminApi(apiBase, '/api/admin/home', { method: 'PUT', body: { content, navigation: nav } });
    status = res.error ? `ERROR // ${res.error}` : 'SAVED';
  }
</script>

<section class="admin-section">
  <AdminTabs
    tabs={[
      {
        id: 'hero',
        label: 'HERO',
        content: heroTab,
      },
      {
        id: 'hud',
        label: 'HUD',
        content: hudTab,
      },
      {
        id: 'nav',
        label: 'NAV',
        count: nav.length,
        content: navTab,
      },
    ]}
  />
  <AdminSaveBar {status} onSave={save} />
</section>

{#snippet heroTab()}
  <AdminSection eyebrow="HERO TEXT">
    <div class="admin-grid-2">
      <AdminField label="ARCHIVE LABEL" value={String(content.archive_label ?? '')} onChange={set('archive_label')} />
      <AdminField label="ARCHIVE NUMBER" value={String(content.archive_number ?? '')} onChange={set('archive_number')} />
      <AdminField label="HEADLINE LINE ONE" value={String(content.headline_line_one ?? '')} onChange={set('headline_line_one')} />
      <AdminField label="HEADLINE LINE TWO" value={String(content.headline_line_two ?? '')} onChange={set('headline_line_two')} />
      <AdminField label="HEADLINE LINE THREE" value={String(content.headline_line_three ?? '')} onChange={set('headline_line_three')} />
      <AdminField label="HEADLINE ACCENT" value={String(content.headline_accent ?? '')} onChange={set('headline_accent')} />
      <AdminField label="HEADLINE META" value={String(content.headline_meta ?? '')} onChange={set('headline_meta')} />
      <AdminField label="CTA LABEL" value={String(content.cta_label ?? '')} onChange={set('cta_label')} />
      <AdminField label="CTA URL" value={String(content.cta_url ?? '')} onChange={set('cta_url')} />
    </div>
    <AdminField label="INTRO" textarea value={String(content.intro ?? '')} onChange={set('intro')} />
  </AdminSection>
{/snippet}

{#snippet hudTab()}
  <AdminSection eyebrow="HUD // 04 → 05 HERE">
    <div class="admin-grid-2">
      <AdminField label="YEARS BUILDING" type="number" value={String(content.years_building ?? 4)} onChange={set('years_building')} />
      <AdminField label="HUD LABEL" value={String(content.hud_label ?? '')} onChange={set('hud_label')} />
      <AdminField label="HUD SUBTITLE" value={String(content.hud_subtitle ?? '')} onChange={set('hud_subtitle')} />
      <AdminField label="NOISE TOP" value={String(content.hud_noise_top ?? '')} onChange={set('hud_noise_top')} />
      <AdminField label="NOISE BOTTOM" value={String(content.hud_noise_bottom ?? '')} onChange={set('hud_noise_bottom')} />
    </div>
  </AdminSection>
{/snippet}

{#snippet navTab()}
  <AdminSection eyebrow={`ARCHIVE NAV // ${nav.length} ITEMS`}>
    {#each nav as row, index}
      <div class="admin-card-stack">
        <div class="admin-grid-2">
          <AdminField label="KEY" value={row.page_key} onChange={setNav(index, 'page_key')} />
          <AdminField label="LABEL" value={row.label} onChange={setNav(index, 'label')} />
          <AdminField label="NUMBER" value={row.display_number} onChange={setNav(index, 'display_number')} />
          <AdminField label="HREF" value={row.href} onChange={setNav(index, 'href')} />
        </div>
        <AdminField label="DESCRIPTION" value={row.description} onChange={setNav(index, 'description')} />
      </div>
    {/each}
  </AdminSection>
{/snippet}
