<script lang="ts">
  interface Props {
    status: string;
    onSave: () => void;
    onPublish?: () => void;
  }

  const { status, onSave, onPublish }: Props = $props();
</script>

<div class="admin-savebar">
  <span>{status}</span>
  <div>
    {#if onPublish}
      <button type="button" class="admin-nav-link touch-target" onclick={onPublish}>PUBLISH</button>
    {/if}
    <button type="button" class="auth-button touch-target" onclick={onSave}>SAVE</button>
  </div>
</div>
