<script lang="ts">
  import { onMount } from 'svelte';
  import { adminApi } from '../../lib/admin';
  import AdminField from './AdminField.svelte';
  import AdminFileUpload from './AdminFileUpload.svelte';
  import AdminSection from './AdminSection.svelte';
  import {
    AVAILABILITY_NOTE_MAX,
    AVAILABILITY_VALUES,
    labelFor,
    validateSiteSettingsInput,
    type FieldError,
  } from '../../lib/adminValidation';

  interface Props {
    apiBase: string;
  }

  const { apiBase }: Props = $props();

  type SiteSettings = {
    contact_email: string | null;
    cv_url: string | null;
    availability_status: string;
    availability_note: string | null;
  };

  const DEFAULTS: SiteSettings = {
    contact_email: '',
    cv_url: '',
    availability_status: 'OPEN_TO_WORK',
    availability_note: '',
  };

  let form = $state<SiteSettings>({ ...DEFAULTS });
  let loading = $state(true);
  let saving = $state(false);
  let error = $state<FieldError | null>(null);
  let notice = $state('');

  function apply(settings: Partial<SiteSettings> | null | undefined) {
    form = {
      contact_email: settings?.contact_email ?? '',
      cv_url: settings?.cv_url ?? '',
      availability_status: settings?.availability_status ?? DEFAULTS.availability_status,
      availability_note: settings?.availability_note ?? '',
    };
  }

  async function load() {
    loading = true;
    const res = await adminApi<SiteSettings>(apiBase, '/api/admin/site-settings');
    // A 401/403 has no data; keep the form usable so the owner still sees the
    // fields rather than an empty page.
    apply(res.data);
    loading = false;
  }

  onMount(load);

  function fieldError(field: string): string {
    return error?.field === field ? error.message : '';
  }

  async function save() {
    saving = true;
    error = null;
    notice = '';

    // Client-side pre-flight: the same rules the API enforces, so an invalid
    // form never leaves the browser and the typed values stay put.
    const validated = validateSiteSettingsInput(form);
    if (!validated.ok) {
      error = validated.error;
      saving = false;
      return;
    }

    const res = await adminApi<SiteSettings & { field?: string }>(apiBase, '/api/admin/site-settings', {
      method: 'PUT',
      body: validated.value,
    });
    if (res.error) {
      error = { field: res.data?.field ?? '', message: res.error };
      saving = false;
      return;
    }

    // Reload from GET so the view shows exactly what was stored.
    await load();
    notice = 'SAVED';
    saving = false;
  }
</script>

<AdminSection eyebrow="CONTACT // AVAILABILITY">
  {#if loading}
    <p class="admin-hint">LOADING…</p>
  {/if}

  <div class="admin-grid-2">
    <AdminField
      label="CONTACT EMAIL"
      value={form.contact_email}
      error={fieldError('contact_email')}
      onChange={(v) => (form = { ...form, contact_email: v })}
    />

    <label class="admin-field">
      <span>AVAILABILITY</span>
      <select
        class="admin-input"
        value={form.availability_status}
        onchange={(e) => (form = { ...form, availability_status: e.currentTarget.value })}
      >
        {#each AVAILABILITY_VALUES as value (value)}
          <option {value}>{value}</option>
        {/each}
      </select>
      {#if fieldError('availability_status')}
        <span class="auth-error" role="alert">{fieldError('availability_status')}</span>
      {/if}
    </label>
  </div>

  <label class="admin-field">
    <span>NOTE ({form.availability_note.length}/{AVAILABILITY_NOTE_MAX})</span>
    <input
      class="admin-input"
      maxlength={AVAILABILITY_NOTE_MAX}
      value={form.availability_note}
      aria-invalid={fieldError('availability_note') ? 'true' : undefined}
      oninput={(e) => (form = { ...form, availability_note: e.currentTarget.value })}
    />
    {#if fieldError('availability_note')}
      <span class="auth-error" role="alert">{fieldError('availability_note')}</span>
    {/if}
  </label>

  <AdminFileUpload
    label="CV (PDF)"
    value={form.cv_url}
    onChange={(v) => (form = { ...form, cv_url: v })}
    {apiBase}
  />
  {#if fieldError('cv_url')}
    <p class="auth-error" role="alert">{labelFor('cv_url')}: {fieldError('cv_url')}</p>
  {/if}

  <div class="admin-row-actions">
    <button class="auth-button touch-target" onclick={save} disabled={saving || loading}>
      {saving ? 'SAVING…' : 'SAVE SETTINGS'}
    </button>
  </div>

  {#if notice}
    <p class="admin-hint" role="status" style="margin: 14px 0 0">{notice}</p>
  {/if}
  {#if error && !error.field}
    <p class="auth-error" role="alert" style="margin: 14px 0 0">{error.message}</p>
  {/if}
</AdminSection>
