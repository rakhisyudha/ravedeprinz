<script lang="ts">
  // Document upload, modelled on AdminImageUpload but pointed at the CV
  // endpoint: PDFs only, and the server sniffs the magic bytes. The 5 MB limit
  // is checked here as well so an oversized file never leaves the browser.
  interface Props {
    label: string;
    value: string;
    onChange: (url: string) => void;
    apiBase: string;
  }

  const { label, value, onChange, apiBase }: Props = $props();

  let input: HTMLInputElement | undefined = $state();
  let busy = $state(false);
  let error = $state('');

  async function handleFile(file: File | undefined) {
    if (!file || busy) return;
    busy = true;
    error = '';

    if (file.size > 5 * 1024 * 1024) {
      error = 'Too large. Max 5MB.';
      busy = false;
      return;
    }

    const body = new FormData();
    body.append('file', file);

    try {
      const res = await fetch(`${apiBase}/api/admin/upload/cv`, {
        method: 'POST',
        credentials: 'include',
        body,
      });
      const parsed = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) {
        error = parsed.error ?? 'Upload failed.';
      } else if (parsed.url) {
        onChange(parsed.url);
      }
    } catch {
      error = 'Could not reach the server.';
    }
    busy = false;
  }

  const href = $derived(value ? (value.startsWith('http') ? value : `${apiBase}${value}`) : '');
</script>

<div class="admin-upload">
  <span class="admin-field-label">{label}</span>

  <div class="admin-upload-actions">
    <button type="button" class="admin-nav-link touch-target" onclick={() => input?.click()} disabled={busy}>
      {busy ? 'UPLOADING…' : value ? 'REPLACE' : 'UPLOAD'}
    </button>
    {#if value}
      <a class="admin-nav-link touch-target" href={href} target="_blank" rel="noreferrer">OPEN CURRENT</a>
      <button type="button" class="admin-nav-link touch-target" onclick={() => onChange('')}>REMOVE</button>
    {/if}
  </div>

  <input
    bind:this={input}
    type="file"
    accept="application/pdf"
    hidden
    onchange={(e) => {
      void handleFile(e.currentTarget.files?.[0]);
      e.currentTarget.value = '';
    }}
  />
  <small class="admin-hint">PDF only, max 5MB. Uploading does not save it — press SAVE to store the link.</small>
  {#if error}<p class="auth-error" role="alert" style="margin: 8px 0 0">{error}</p>{/if}
</div>
