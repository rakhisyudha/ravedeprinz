<script lang="ts">
  import { countWords } from '../../lib/markdown';
  import { readingMinutes } from '../../lib/readingTime';

  interface Props {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    textarea?: boolean;
    // Long-form writing surface: roomy, grows with content up to a cap,
    // then scrolls internally. Plain textarea semantics preserved.
    editor?: boolean;
    type?: string;
    placeholder?: string;
    // Field-level validation message. Rendering it here keeps the message
    // next to the input that caused it and leaves the typed value in place.
    error?: string;
    maxlength?: number;
  }

  const {
    label,
    value,
    onChange,
    textarea = false,
    editor = false,
    type = 'text',
    placeholder,
    error = '',
    maxlength,
  }: Props = $props();

  let area: HTMLTextAreaElement | undefined = $state();

  function syncHeight() {
    if (!area) return;
    area.style.height = 'auto';
    area.style.height = `${area.scrollHeight}px`;
  }

  // Re-fit when the value arrives late (edit load) as well as while typing.
  // Value flow itself is untouched: oninput still just forwards the text.
  $effect(() => {
    void String(value ?? '');
    if (editor) syncHeight();
  });

  const words = $derived(countWords(String(value ?? '')));
  const minutes = $derived(readingMinutes(String(value ?? '')));
</script>

<label class="admin-field">
  <span>{label}</span>
  {#if textarea}
    <textarea
      rows={editor ? 12 : 4}
      class="admin-input"
      class:admin-editor-area={editor}
      aria-invalid={error ? 'true' : undefined}
      bind:this={area}
      {value}
      {placeholder}
      {maxlength}
      oninput={(e) => {
        if (editor) syncHeight();
        onChange(e.currentTarget.value);
      }}
    ></textarea>
    {#if editor}
      <span class="admin-editor-meta">
        <span>{words.toLocaleString('en-US')} WORDS</span>
        <span>READ {String(minutes).padStart(2, '0')} MIN</span>
      </span>
    {/if}
  {:else}
    <input
      {type}
      class="admin-input"
      aria-invalid={error ? 'true' : undefined}
      {value}
      {placeholder}
      {maxlength}
      oninput={(e) => onChange(e.currentTarget.value)}
    />
  {/if}
  {#if error}<span class="auth-error" role="alert">{error}</span>{/if}
</label>
