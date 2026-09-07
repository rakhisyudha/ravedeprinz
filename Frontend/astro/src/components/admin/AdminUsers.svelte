<script lang="ts">
  import { onMount } from 'svelte';
  import { adminApi } from '../../lib/admin';
  import AdminTabs from './AdminTabs.svelte';

  interface Props {
    apiBase: string;
  }

  const { apiBase } = $props();

  type UserRow = { id: string; email: string; role: string; active: boolean };

  let users: UserRow[] = $state([]);
  let email = $state('');
  let password = $state('');
  let role = $state('editor');
  let message = $state('');
  let busy = $state(false);

  async function load() {
    const res = await adminApi<{ users: UserRow[] }>(apiBase, '/api/admin/users');
    if (res.data) users = res.data.users;
  }

  onMount(load);

  async function register(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    message = '';
    const res = await adminApi(apiBase, '/api/admin/users', { method: 'POST', body: { email, password, role } });
    if (res.error) {
      message = `ERROR // ${res.error}`;
    } else {
      message = 'REGISTERED. The email can now sign in with email + password.';
      email = '';
      password = '';
      await load();
    }
    busy = false;
  }

  async function toggleActive(user: UserRow) {
    await adminApi(apiBase, `/api/admin/users/${user.id}`, { method: 'PUT', body: { active: !user.active } });
    await load();
  }

  async function remove(user: UserRow) {
    await adminApi(apiBase, `/api/admin/users/${user.id}`, { method: 'DELETE' });
    await load();
  }
</script>

<section class="admin-section">
  <AdminTabs
    tabs={[
      { id: 'register', label: 'REGISTER', content: registerTab },
      { id: 'allowlist', label: 'ALLOWLIST', count: users.length, content: allowlistTab },
    ]}
  />
</section>

{#snippet registerTab()}
  <div class="admin-editor" style="margin-top: 0">
    <p class="eyebrow">REGISTER A NEW ADMIN</p>
    <p>Add an email + password. Once stored, that email can sign in. Emails not in this list are always rejected.</p>
    <form class="admin-form" onsubmit={register}>
      <label for="admin-new-email">EMAIL</label>
      <input id="admin-new-email" type="email" bind:value={email} required />
      <label for="admin-new-password">PASSWORD</label>
      <input id="admin-new-password" type="password" bind:value={password} required minlength={8} />
      <label for="admin-new-role">ROLE</label>
      <select id="admin-new-role" bind:value={role}>
        <option value="owner">owner</option>
        <option value="editor">editor</option>
      </select>
      <button type="submit" class="auth-button touch-target" disabled={busy}>
        {busy ? 'REGISTERING…' : 'REGISTER ↗'}
      </button>
    </form>
    {#if message}<p class="auth-error">{message}</p>{/if}
  </div>
{/snippet}

{#snippet allowlistTab()}
  <div class="admin-editor" style="margin-top: 0">
    <p class="eyebrow">ALLOWLIST // {users.length} USERS</p>
    <div class="admin-accordion">
      {#each users as user (user.id)}
        <div class="admin-accordion-item">
          <div class="admin-accordion-head" style="cursor: default">
            <span><b>{user.email}</b> <small>{user.role} · {user.active ? 'ACTIVE' : 'DISABLED'}</small></span>
            <span class="admin-row-actions">
              <button class="admin-nav-link touch-target" onclick={() => toggleActive(user)}>
                {user.active ? 'DISABLE' : 'ENABLE'}
              </button>
              <button class="admin-nav-link touch-target" onclick={() => remove(user)}>REMOVE</button>
            </span>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/snippet}
