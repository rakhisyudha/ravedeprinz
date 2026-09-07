<script lang="ts">
  interface Props {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    textarea?: boolean;
    type?: string;
    placeholder?: string;
  }

  const { label, value, onChange, textarea = false, type = 'text', placeholder }: Props = $props();
</script>

<label class="admin-field">
  <span>{label}</span>
  {#if textarea}
    <textarea rows={3} class="admin-input" {value} {placeholder} oninput={(e) => onChange(e.currentTarget.value)}></textarea>
  {:else}
    <input {type} class="admin-input" {value} {placeholder} oninput={(e) => onChange(e.currentTarget.value)} />
  {/if}
</label>
