<script lang="ts">
  interface Props {
    email?: string | null;
    apiBase: string;
  }

  const { email, apiBase } = $props();

  let open = $state(false);
  let busy = $state(false);

  async function signOut() {
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

<div class="admin-user-menu">
  <span class="admin-user admin-user--desktop">{email}</span>
  <button type="button" class="admin-signout admin-signout--desktop touch-target" onclick={signOut}>
    SIGN OUT
  </button>

  <div class="admin-user-mobile">
    <button
      type="button"
      class="admin-user-icon touch-target"
      aria-label="User menu"
      aria-expanded={open}
      onclick={() => (open = !open)}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </button>
    {#if open}
      <div class="admin-user-dropdown cut-small">
        <span class="admin-user-dropdown-email">{email}</span>
        <button type="button" class="admin-signout admin-signout--dropdown touch-target" onclick={signOut}>
          SIGN OUT
        </button>
      </div>
    {/if}
  </div>
</div>
