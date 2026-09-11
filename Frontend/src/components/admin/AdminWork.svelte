<script lang="ts">
  import { onMount } from 'svelte';
  import { adminApi } from '../../lib/admin';
  import AdminField from './AdminField.svelte';
  import AdminSection from './AdminSection.svelte';
  import AdminSaveBar from './AdminSaveBar.svelte';
  import AdminTabs from './AdminTabs.svelte';
  import AdminAccordion from './AdminAccordion.svelte';

  interface Props {
    apiBase: string;
  }

  const { apiBase } = $props();

  type WorkRow = Record<string, string | undefined>;
  type EduRow = Record<string, string | undefined>;

  let work: WorkRow[] = $state([]);
  let education: EduRow[] = $state([]);
  let status = $state('LOADING…');

  async function load() {
    const res = await adminApi<{ work: WorkRow[]; education: EduRow[] }>(apiBase, '/api/admin/work');
    if (res.data) {
      work = res.data.work ?? [];
      education = res.data.education ?? [];
      status = 'LOADED';
    } else {
      status = res.error ?? 'ERROR';
    }
  }

  onMount(load);

  async function save() {
    status = 'SAVING…';
    const res = await adminApi(apiBase, '/api/admin/work', { method: 'PUT', body: { work, education } });
    status = res.error ? `ERROR // ${res.error}` : 'SAVED';
    // Reload so newly added rows carry their real DB ids (prevents duplicates on next save).
    if (!res.error) await load();
  }

  function updateWork(index: number, key: string) {
    return (value: string) => {
      work = work.map((r, i) => (i === index ? { ...r, [key]: value } : r));
    };
  }

  function updateEdu(index: number, key: string) {
    return (value: string) => {
      education = education.map((r, i) => (i === index ? { ...r, [key]: value } : r));
    };
  }
</script>

<section class="admin-section">
  <AdminTabs
    tabs={[
      { id: 'work', label: 'WORK', count: work.length, content: workTab },
      { id: 'edu', label: 'EDUCATION', count: education.length, content: eduTab },
    ]}
  />
  <AdminSaveBar {status} onSave={save} />
</section>

{#snippet workTab()}
  <AdminSection eyebrow={`WORK // ${work.length} ROLES`}>
    <button class="admin-nav-link touch-target" onclick={() => (work = [...work, {}])}>+ ADD ROLE</button>
    <div class="admin-accordion" style="margin-top: 16px">
      {#each work as row, index (index)}
        <AdminAccordion title={row.role || 'NEW ROLE'} subtitle={row.company || 'NO COMPANY'} defaultOpen={index === work.length - 1}>
          <div class="admin-grid-2">
            <AdminField label="ROLE" value={row.role ?? ''} onChange={updateWork(index, 'role')} />
            <AdminField label="COMPANY" value={row.company ?? ''} onChange={updateWork(index, 'company')} />
            <AdminField label="LOCATION" value={row.location ?? ''} onChange={updateWork(index, 'location')} />
            <AdminField label="DATE" value={row.date_label ?? ''} onChange={updateWork(index, 'date_label')} />
            <AdminField label="STACK" value={row.stack ?? ''} onChange={updateWork(index, 'stack')} />
            <AdminField label="COMPANY URL" value={row.company_url ?? ''} onChange={updateWork(index, 'company_url')} />
          </div>
          <AdminField label="DESCRIPTION" textarea editor value={row.description ?? ''} onChange={updateWork(index, 'description')} />
          <button class="admin-nav-link touch-target" onclick={() => (work = work.filter((_, i) => i !== index))}>
            REMOVE
          </button>
        </AdminAccordion>
      {/each}
    </div>
  </AdminSection>
{/snippet}

{#snippet eduTab()}
  <AdminSection eyebrow={`EDUCATION // ${education.length} ITEMS`}>
    <button class="admin-nav-link touch-target" onclick={() => (education = [...education, {}])}>+ ADD EDUCATION</button>
    <div class="admin-accordion" style="margin-top: 16px">
      {#each education as row, index (index)}
        <AdminAccordion title={row.title || 'NEW EDUCATION'} subtitle={row.institution || 'NO INSTITUTION'} defaultOpen={index === education.length - 1}>
          <div class="admin-grid-2">
            <AdminField label="TITLE" value={row.title ?? ''} onChange={updateEdu(index, 'title')} />
            <AdminField label="INSTITUTION" value={row.institution ?? ''} onChange={updateEdu(index, 'institution')} />
            <AdminField label="DATE" value={row.date_label ?? ''} onChange={updateEdu(index, 'date_label')} />
          </div>
          <AdminField label="DESCRIPTION" textarea editor value={row.description ?? ''} onChange={updateEdu(index, 'description')} />
          <button class="admin-nav-link touch-target" onclick={() => (education = education.filter((_, i) => i !== index))}>
            REMOVE
          </button>
        </AdminAccordion>
      {/each}
    </div>
  </AdminSection>
{/snippet}
