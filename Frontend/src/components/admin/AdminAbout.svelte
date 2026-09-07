<script lang="ts">
  import { onMount } from 'svelte';
  import { adminApi } from '../../lib/admin';
  import AdminField from './AdminField.svelte';
  import AdminSection from './AdminSection.svelte';
  import AdminSaveBar from './AdminSaveBar.svelte';
  import AdminTabs from './AdminTabs.svelte';
  import AdminAccordion from './AdminAccordion.svelte';
  import AdminImageUpload from './AdminImageUpload.svelte';

  interface Props {
    apiBase: string;
  }

  const { apiBase } = $props();

  type Skill = { id?: string; category: string; skill_name: string };

  let content: Record<string, unknown> = $state({});
  let skills: Skill[] = $state([]);
  let status = $state('LOADING…');

  onMount(async () => {
    const res = await adminApi<{ content: Record<string, unknown> | null; skills: Skill[] }>(
      apiBase,
      '/api/admin/about',
    );
    if (res.data) {
      content = res.data.content ?? {};
      skills = res.data.skills ?? [];
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

  async function save() {
    status = 'SAVING…';
    const res = await adminApi(apiBase, '/api/admin/about', { method: 'PUT', body: { content, skills } });
    status = res.error ? `ERROR // ${res.error}` : 'SAVED';
  }

  const groups = $derived.by(() => {
    const acc: Record<string, number> = {};
    for (const s of skills) acc[s.category] = (acc[s.category] ?? 0) + 1;
    return acc;
  });
</script>

<section class="admin-section">
  <AdminTabs
    tabs={[
      { id: 'copy', label: 'COPY', content: copyTab },
      { id: 'skills', label: 'SKILLS', count: skills.length, content: skillsTab },
    ]}
  />
  <AdminSaveBar {status} onSave={save} />
</section>

{#snippet copyTab()}
  <AdminSection eyebrow="ABOUT COPY">
    <div class="admin-grid-2">
      <AdminField label="EYEBROW" value={String(content.eyebrow ?? '')} onChange={set('eyebrow')} />
      <AdminField label="QUOTE" value={String(content.quote ?? '')} onChange={set('quote')} />
      <AdminField label="QUOTE ACCENT" value={String(content.quote_accent ?? '')} onChange={set('quote_accent')} />
    </div>
    <AdminImageUpload label="PORTRAIT" value={String(content.portrait_url ?? '')} onChange={set('portrait_url')} {apiBase} />
    <AdminField label="PARAGRAPH ONE" textarea value={String(content.paragraph_one ?? '')} onChange={set('paragraph_one')} />
    <AdminField label="PARAGRAPH TWO" textarea value={String(content.paragraph_two ?? '')} onChange={set('paragraph_two')} />
  </AdminSection>
{/snippet}

{#snippet skillsTab()}
  <AdminSection eyebrow={`SKILLS // ${skills.length} ITEMS — ${Object.keys(groups).length} GROUPS`}>
    <button class="admin-nav-link touch-target" onclick={() => (skills = [...skills, { category: '', skill_name: '' }])}>
      + ADD SKILL
    </button>
    <div class="admin-accordion" style="margin-top: 16px">
      {#each skills as skill, index (index)}
        <AdminAccordion title={skill.skill_name || 'NEW SKILL'} subtitle={skill.category || 'NO CATEGORY'} defaultOpen={index === skills.length - 1}>
          <div class="admin-grid-2">
            <AdminField label="CATEGORY" value={skill.category} onChange={(v) => (skills = skills.map((x, i) => (i === index ? { ...x, category: v } : x)))} />
            <AdminField label="SKILL" value={skill.skill_name} onChange={(v) => (skills = skills.map((x, i) => (i === index ? { ...x, skill_name: v } : x)))} />
          </div>
          <button class="admin-nav-link touch-target" onclick={() => (skills = skills.filter((_, i) => i !== index))}>
            REMOVE
          </button>
        </AdminAccordion>
      {/each}
    </div>
  </AdminSection>
{/snippet}
