<script lang="ts">
  // Email + password login against the Bun API. The browser talks to Bun
  // over HTTP; Astro never sees passwords, hashes, or session tokens.

  interface Props {
    apiBase: string;
  }

  const { apiBase } = $props();

  let email = $state('');
  let password = $state('');
  let busy = $state(false);
  let error = $state('');
  let shakeTick = $state(0);

  function fail(message: string) {
    error = message;
    busy = false;
    shakeTick += 1;
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (busy) return;
    busy = true;
    error = '';
    try {
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        window.location.href = '/admin';
        return;
      }
      fail(res.status === 401 ? 'INVALID EMAIL OR PASSWORD.' : 'ARCHIVE UNREACHABLE. TRY AGAIN.');
    } catch {
      fail('ARCHIVE UNREACHABLE. TRY AGAIN.');
    }
  }
</script>

{#key shakeTick}
  <div class="auth-actions-in" class:auth-shake={error !== ''}>
    {#if error !== ''}
      <p class="auth-error" role="alert">{error}</p>
    {/if}
    <form class="auth-form" onsubmit={submit}>
      <label for="login-email">EMAIL</label>
      <input
        id="login-email"
        type="email"
        name="email"
        required
        autocomplete="email"
        bind:value={email}
        disabled={busy}
      />
      <label for="login-password">PASSWORD</label>
      <input
        id="login-password"
        type="password"
        name="password"
        required
        autocomplete="current-password"
        bind:value={password}
        disabled={busy}
      />
      <button type="submit" class="auth-button auth-button-primary touch-target" disabled={busy}>
        {busy ? 'SIGNING IN…' : 'SIGN IN →'}
      </button>
    </form>
  </div>
{/key}

<style>
  .auth-actions-in { animation: auth-actions-rise 0.34s ease-out 0.3s both; }
  @keyframes auth-actions-rise { from { opacity: 0; transform: translateY(14px); } }
  .auth-shake { animation: auth-shake 0.36s cubic-bezier(0.65, 0, 0.35, 1); }
  @keyframes auth-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .auth-actions-in,
    .auth-shake { animation: none; }
  }
</style>
