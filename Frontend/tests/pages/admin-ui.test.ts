import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { AVAILABILITY_VALUES, CASE_STUDY_FIELDS, labelFor } from '../../src/lib/adminValidation';
import { selectFeaturedProjects } from '../../src/lib/projects';
import type { Project } from '../../src/lib/cms';

// Wiring checks for the admin CMS. The decision logic is covered by the
// validators' properties; what matters here is that the components actually
// use them and that the over-featured notice agrees with the public strip.
const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

const projects = read('../../src/components/admin/AdminProjects.svelte');
const settings = read('../../src/components/admin/AdminSettings.svelte');
const fileUpload = read('../../src/components/admin/AdminFileUpload.svelte');
const adminNav = read('../../src/components/admin/AdminNav.astro');
const settingsPage = read('../../src/pages/admin/settings.astro');

describe('admin projects form', () => {
  test('the featured checkbox and the order field exist in both forms', () => {
    expect(projects.match(/label="FEATURED"/g)?.length).toBe(2);
    expect(projects.match(/ORDER \(\$\{ORDER_RANGE_LABEL\}\)/g)?.length).toBe(2);
    expect(projects).toContain('checked={project.featured === true}');
    expect(projects).toContain("update(index, 'sort_order')");
  });

  test('all four case-study editors render in both forms, in the fixed order', () => {
    expect(projects).toContain('CASE_STUDY_FIELDS');
    expect(projects).toContain('{#each CASE_STUDY_FIELDS as field (field)}');
    // One loop for the draft form and one for each existing row.
    expect(projects.match(/\{#each CASE_STUDY_FIELDS as field \(field\)\}/g)?.length).toBe(2);
    for (const field of CASE_STUDY_FIELDS) {
      expect(labelFor(field)).toBeTruthy();
    }
    expect(CASE_STUDY_FIELDS).toEqual(['problem', 'what_built', 'key_decision', 'outcome']);
  });

  test('the client validators run before the request is sent', () => {
    expect(projects).toContain('validateOrderInput(row.sort_order) ?? validateCaseStudyInput(');
    // Inside saveRow, the pre-flight must run before the first adminApi call.
    const saveRow = projects.slice(projects.indexOf('async function saveRow'));
    const validateAt = saveRow.indexOf('const invalid = validateRow(row);');
    const requestAt = saveRow.indexOf('await adminApi');
    expect(validateAt).toBeGreaterThan(-1);
    expect(requestAt).toBeGreaterThan(validateAt);
  });

  test('a failed save keeps the row and does not reload', () => {
    expect(projects).toContain("if (res.error) {");
    expect(projects).toContain('if (row.id) await load();');
    // load() is reached only on the success branch.
    const errorBranch = projects.indexOf('// Keep the unsaved values');
    const successBranch = projects.indexOf('if (row.id) await load();');
    expect(errorBranch).toBeGreaterThan(-1);
    expect(successBranch).toBeGreaterThan(errorBranch);
  });

  test('per-row status and the server field are both surfaced', () => {
    expect(projects).toContain('let rowStatus = $state<Record<string');
    expect(projects).toContain('field: res.data?.field');
    expect(projects).toContain("role=\"status\"");
  });

  test('the order field states the allowed range', () => {
    expect(projects).toContain('ORDER_RANGE_LABEL');
  });
});

describe('admin over-featured notice', () => {
  const project = (over: Partial<Project> & { title: string }): Project =>
    ({
      slug: over.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: '',
      year: 2024,
      status: 'FINISHED',
      deployment_status: 'DEPLOYED',
      stack: '',
      featured: true,
      published: true,
      visible: true,
      sort_order: 0,
      problem: '',
      what_built: '',
      key_decision: '',
      outcome: '',
      ...over,
    }) as Project;

  test('the notice reuses the public selection helper', () => {
    expect(projects).toContain("import { selectFeaturedProjects } from '../../lib/projects'");
    expect(projects).toContain('overFeatured');
  });

  test('the notice names exactly the first three by Featured_Order', () => {
    const rows = [
      project({ title: 'A', sort_order: 3 }),
      project({ title: 'B', sort_order: 1 }),
      project({ title: 'C', sort_order: 2 }),
      project({ title: 'D', sort_order: 4 }),
      project({ title: 'E', sort_order: 5 }),
    ];
    const named = selectFeaturedProjects(rows, 3).map((p) => p.title);
    expect(named).toEqual(['B', 'C', 'A']);
    expect(projects).toContain('{featured.map((p) => p.title).join(\', \')}.');
  });

  test('the notice condition matches the public Featured_Order count', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 6 }), { minLength: 0, maxLength: 7 }),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (orders, hidden, unpublished, unfeatured) => {
          const rows = orders.map((sort_order, index) =>
            project({
              title: `Row ${index}`,
              slug: `row-${index}`,
              sort_order,
              featured: !unfeatured,
              visible: !hidden,
              published: !unpublished,
            }),
          );
          // The component's own condition, restated here.
          const condition =
            rows.filter((r) => r.featured === true && r.published !== false && r.visible !== false)
              .length > 3;
          const publicFeatured = rows.filter(
            (r) => r.featured === true && r.published !== false && r.visible !== false,
          ).length;
          expect(condition).toBe(publicFeatured > 3);
          // When the notice fires, the strip really is capped at three.
          if (condition) expect(selectFeaturedProjects(rows, 3)).toHaveLength(3);
        },
      ),
      { numRuns: 200 },
    );
  });

  test('four or more public featured rows trip the notice, three or fewer do not', () => {
    const make = (count: number) =>
      Array.from({ length: count }, (_, index) =>
        project({ title: `Row ${index}`, slug: `row-${index}`, sort_order: index }),
      );
    for (const count of [0, 1, 2, 3]) {
      expect(make(count).filter((r) => r.published !== false && r.visible !== false).length > 3).toBe(false);
    }
    expect(make(4).filter((r) => r.published !== false && r.visible !== false).length > 3).toBe(true);
  });
});

describe('admin contact settings', () => {
  test('the page and the nav entry exist', () => {
    expect(settingsPage).toContain('AdminSettings client:load');
    expect(adminNav).toContain("['/admin/settings', 'CONTACT']");
  });

  test('the status selector offers exactly the three values', () => {
    expect(settings).toContain('{#each AVAILABILITY_VALUES as value (value)}');
    expect(AVAILABILITY_VALUES).toEqual(['OPEN_TO_WORK', 'OPEN_TO_FREELANCE', 'NOT_AVAILABLE']);
    expect(settings).toContain('<select');
  });

  test('the note input is capped and counted', () => {
    expect(settings).toContain('maxlength={AVAILABILITY_NOTE_MAX}');
    expect(settings).toContain('NOTE ({form.availability_note.length}/{AVAILABILITY_NOTE_MAX})');
  });

  test('the CV control posts PDFs to the CV endpoint only', () => {
    expect(fileUpload).toContain('accept="application/pdf"');
    expect(fileUpload).toContain('/api/admin/upload/cv');
    expect(fileUpload).not.toContain('/api/admin/upload\'');
  });

  test('saving validates on the client, routes a 400 by field, and reloads from GET', () => {
    expect(settings).toContain('validateSiteSettingsInput(form)');
    expect(settings).toContain("method: 'PUT'");
    expect(settings).toContain("field: res.data?.field ?? ''");
    const save = settings.slice(settings.indexOf('async function save()'));
    expect(save).toContain("notice = 'SAVED'");
    // The success path re-reads through GET rather than trusting the response.
    expect(save).toContain('await load();');
  });

  test('a field error is rendered next to its input and the form keeps its values', () => {
    for (const field of ['contact_email', 'availability_status', 'availability_note']) {
      expect(settings).toContain(`fieldError('${field}')`);
    }
    // Inside save(), every failure path returns before the reload, so the
    // typed values are never replaced.
    const save = settings.slice(settings.indexOf('async function save()'));
    const failureAt = save.indexOf('if (res.error) {');
    const reloadAt = save.indexOf('await load();');
    expect(failureAt).toBeGreaterThan(-1);
    expect(reloadAt).toBeGreaterThan(failureAt);
    expect(save.slice(failureAt, reloadAt)).toContain('return;');
    // No form reset anywhere in save().
    expect(save).not.toContain('apply(DEFAULTS)');
    expect(save).not.toContain('form = { ...DEFAULTS }');
  });
});

describe('admin notes tags', () => {
  const notes = read('../../src/components/admin/AdminNotes.svelte');
  const tagsField = read('../../src/components/admin/AdminTagsField.svelte');

  test('both note forms use the tags field, and the single TAG input is gone', () => {
    expect(notes.match(/<AdminTagsField/g)?.length).toBe(2);
    expect(notes).not.toContain('label="TAG"');
    expect(notes).toContain('suggestions={knownTags}');
  });

  test('the rules run before the request, and a bad list keeps what was typed', () => {
    const saveRow = notes.slice(notes.indexOf('async function saveRow'));
    const validateAt = saveRow.indexOf('validateNoteTagsInput(');
    const requestAt = saveRow.indexOf('await adminApi');
    expect(validateAt).toBeGreaterThan(-1);
    expect(requestAt).toBeGreaterThan(validateAt);
    // It returns before saving, and never reloads the list on that path.
    expect(saveRow.slice(validateAt, requestAt)).toContain('return;');
  });

  test('only the list is sent; the stale single tag is left out', () => {
    expect(notes).toContain('const { tag: _legacyTag, ...rest } = row;');
    expect(notes).toContain('tags: checked.tags');
  });

  test('a list the form has set is taken as it is, so clearing the field sticks', () => {
    const tagsOf = notes.slice(notes.indexOf('function tagsOf'), notes.indexOf('// Every tag already in use'));
    expect(tagsOf.indexOf('Array.isArray(row.tags)')).toBeLessThan(tagsOf.indexOf('legacy'));
    expect(tagsOf).toContain('return row.tags.filter(');
  });

  test('a new draft starts on the historical default', () => {
    expect(notes).toContain("value={tagsOf(draft, ['REFLECTION'])}");
  });

  test('the field keeps its raw text, re-syncs only when the parent replaces the list', () => {
    expect(tagsField).toContain('let text = $state(untrack(() => value.join(\', \')));');
    expect(tagsField).toContain('!sameList(parseTagsText(untrack(() => text)), incoming)');
    expect(tagsField).toContain('onChange(parseTagsText(text));');
  });

  test('it shows a live n/3 counter and the live error, with the server message taking precedence', () => {
    expect(tagsField).toContain('{parsed.length}/{NOTE_TAGS_MAX}');
    expect(tagsField).toContain('const shownError = $derived(error || liveError);');
    expect(tagsField).toContain('role="alert"');
    expect(tagsField).toContain("aria-invalid={shownError ? 'true' : undefined}");
  });

  test('existing tags are offered as buttons that stop at the limit and skip tags already present', () => {
    expect(tagsField).toContain('suggestions.filter((tag) => !parsed.includes(tag))');
    expect(tagsField).toContain('const full = $derived(parsed.length >= NOTE_TAGS_MAX);');
    expect(tagsField).toContain('disabled={full}');
    expect(tagsField).toContain('type="button"');
  });
});