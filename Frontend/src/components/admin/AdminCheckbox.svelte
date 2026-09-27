<script lang="ts">
  interface Props {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    hint?: string;
  }

  const { label, checked, onChange, hint = '' }: Props = $props();
</script>

<label class="admin-field admin-checkbox">
  <span class="admin-checkbox-row">
    <input
      type="checkbox"
      class="admin-input"
      {checked}
      onchange={(e) => onChange(e.currentTarget.checked)}
    />
    <span>{label}</span>
  </span>
  {#if hint}<small class="admin-hint">{hint}</small>{/if}
</label>
