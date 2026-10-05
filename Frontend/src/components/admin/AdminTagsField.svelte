<script lang="ts">
  import { untrack } from 'svelte';
  import {
    NOTE_TAGS_MAX,
    NOTE_TAG_MAX_LENGTH,
    parseTagsText,
    validateNoteTagsInput,
  } from '../../lib/adminValidation';

  interface Props {
    label?: string;
    /** The note's current tags. Replacing it (after a save or reload) replaces the text. */
    value: string[];
    /** Tags already used elsewhere, offered as click-to-add buttons. */
    suggestions?: string[];
    onChange: (tags: string[]) => void;
    /** A server-side message for this field, shown in place of the live one. */
    error?: string;
  }

  const { label = 'TAGS', value, suggestions = [], onChange, error = '' }: Props = $props();

  // The raw text is kept here, not derived from `value`: a trailing comma or
  // space is a half-typed tag, and rebuilding the text from the parsed list on
  // every keystroke would eat it and fight the cursor.
  let text = $state(untrack(() => value.join(', ')));

  const parsed = $derived(parseTagsText(text));
  const liveError = $derived.by(() => {
    const result = validateNoteTagsInput({ tags: parsed });
    return result.ok ? '' : result.error.message;
  });
  const shownError = $derived(error || liveError);
  const available = $derived(suggestions.filter((tag) => !parsed.includes(tag)));
  const full = $derived(parsed.length >= NOTE_TAGS_MAX);

  const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((tag, i) => tag === b[i]);

  // Adopt a list the parent replaced (a reload after saving). While typing, the
  // parent's list is always the parse of `text`, so this stays quiet.
  $effect(() => {
    const incoming = value;
    if (!sameList(parseTagsText(untrack(() => text)), incoming)) text = incoming.join(', ');
  });

  function handleInput(event: Event & { currentTarget: HTMLInputElement }) {
    text = event.currentTarget.value;
    onChange(parseTagsText(text));
  }

  function add(tag: string) {
    const next = [...parsed, tag];
    text = next.join(', ');
    onChange(next);
  }
</script>

<div class="admin-tags">
  <label class="admin-field">
    <span>{label}</span>
    <input
      type="text"
      class="admin-input"
      autocomplete="off"
      placeholder="REFLECTION, MEMOIR"
      aria-invalid={shownError ? 'true' : undefined}
      value={text}
      oninput={handleInput}
    />
  </label>
  <p class="admin-hint admin-tags-meta">
    <span class="admin-tags-count" class:is-over={parsed.length > NOTE_TAGS_MAX}>{parsed.length}/{NOTE_TAGS_MAX}</span>
    · up to {NOTE_TAGS_MAX} tags, separated by commas, {NOTE_TAG_MAX_LENGTH} characters each
  </p>
  {#if shownError}<span class="auth-error" role="alert">{shownError}</span>{/if}
  {#if available.length > 0}
    <div class="admin-tags-suggest" role="group" aria-label="Add an existing tag">
      {#each available as tag (tag)}
        <button type="button" class="admin-nav-link touch-target" disabled={full} onclick={() => add(tag)}>
          + {tag}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .admin-tags { margin-bottom:12px; }
  .admin-tags :global(.admin-field) { margin-bottom:6px; }
  .admin-tags-meta { margin:0 0 8px; }
  .admin-tags-count { color:var(--text); font-weight:700; }
  .admin-tags-count.is-over { color:var(--red); }
  .admin-tags-suggest { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .admin-tags-suggest button:disabled { opacity:.4; cursor:not-allowed; }
</style>
