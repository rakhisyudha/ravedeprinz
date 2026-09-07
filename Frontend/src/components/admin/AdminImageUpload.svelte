<script lang="ts">
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
      const res = await fetch(`${apiBase}/api/admin/upload`, {
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

  // Stored URLs stay origin-relative (/uploads/…); only the preview is
  // resolved against the API host so production data stays portable.
  const previewSrc = $derived(value ? (value.startsWith('http') ? value : `${apiBase}${value}`) : '');
</script>

<div class="admin-upload">
  <span class="admin-field-label">{label}</span>

  <div class="admin-upload-preview">
    {#if value}
      <div class="admin-upload-frame">
        <img src={previewSrc} alt="Upload preview" />
      </div>
    {:else}
      <div class="admin-upload-empty">NO IMAGE</div>
    {/if}
  </div>

  <div class="admin-upload-actions">
    <button type="button" class="admin-nav-link touch-target" onclick={() => input?.click()} disabled={busy}>
      {busy ? 'UPLOADING…' : value ? 'REPLACE' : 'UPLOAD'}
    </button>
    {#if value}
      <button type="button" class="admin-nav-link touch-target" onclick={() => onChange('')}>REMOVE</button>
    {/if}
  </div>

  <input
    bind:this={input}
    type="file"
    accept="image/jpeg,image/png,image/webp,image/gif"
    hidden
    onchange={(e) => {
      void handleFile(e.currentTarget.files?.[0]);
      e.currentTarget.value = '';
    }}
  />
  {#if error}<p class="auth-error" role="alert" style="margin: 8px 0 0">{error}</p>{/if}
</div>

<style>
  /* next/image `fill` equivalence inside the 120x90 preview frame. */
  .admin-upload-frame img { width: 100%; height: 100%; object-fit: cover; }
</style>
