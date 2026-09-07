<script lang="ts">
  interface Props {
    apiBase: string;
  }

  const { apiBase } = $props();

  let busy = $state(false);

  async function logout() {
    if (busy) return;
    busy = true;
    try {
      await fetch(`${apiBase}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {
      // Logout is idempotent server-side; always leave the control room.
    }
    window.location.href = '/login';
  }
</script>

<button type="button" class="auth-button touch-target" onclick={logout} disabled={busy}>
  {busy ? 'SIGNING OUT…' : 'SIGN OUT →'}
</button>
