import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Page-level checks for the notes reading tools (newer/older links, tag
// filter, RSS discoverability). Like the home-page suite, these are source
// invariants on the markup wiring: the decision logic lives in src/lib and
// has its own property tests, and this runner does not compile .astro files.
const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

const notePage = read('../../src/pages/notes/[slug].astro');
const adjacent = read('../../src/components/NoteAdjacent.astro');

const markup = (source: string) => source.slice(source.lastIndexOf('---') + 3);

describe('newer / older links on the note page', () => {
  test('the note list is fetched beside the note, through the request cache', () => {
    expect(notePage).toContain("cached(Astro.locals, 'notes', fetchNotes)");
    expect(notePage).toContain('Promise.all([');
  });

  test('neighbours come from the same source as the note', () => {
    // A fallback note chains through the fallback list; a live note through
    // the live list; a failed list fetch leaves the nav out.
    expect(notePage).toContain('fromFallback ? fallbackNoteList() : (notesList?.notes ?? null)');
    expect(notePage).toContain('adjacentNotes(neighbourSource, slug)');
  });

  test('the nav renders after the footer pill and uses the shared slug helper', () => {
    const body = markup(notePage);
    expect(body.indexOf('<NoteAdjacent')).toBeGreaterThan(body.indexOf('class="note-article-footer"'));
    expect(notePage).toContain('href: `/notes/${noteSlug(n)}`');
  });

  test('the component renders nothing without a neighbour, and omits a missing side', () => {
    expect(adjacent).toContain('{(newer || older) && (');
    expect(adjacent).toContain('{newer && (');
    expect(adjacent).toContain('{older && (');
  });

  test('links carry prev/next relations and an accessible nav name', () => {
    expect(adjacent).toContain('aria-label="More notes"');
    expect(adjacent).toContain('rel="prev"');
    expect(adjacent).toContain('rel="next"');
    expect(adjacent).toContain('← NEWER');
    expect(adjacent).toContain('OLDER →');
  });

  test('it reuses the shared bracket control and stacks at mobile width', () => {
    expect(adjacent).toContain('bracket-btn row-hover--accent');
    expect(adjacent).toMatch(/@media \(max-width: 480px\) \{[^}]*grid-template-columns:minmax\(0, 1fr\)/);
    expect(adjacent).toContain('text-overflow:ellipsis');
    expect(adjacent).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});

describe('tag filter on the notes list', () => {
  const notesPage = read('../../src/pages/notes.astro');
  const filter = read('../../src/components/NoteTagFilter.astro');
  const css = read('../../src/styles/global.css');

  test('the list is built from the filtered notes, the chips from the full list', () => {
    expect(notesPage).toContain('const activeTags = parseTagParams(Astro.url.searchParams);');
    expect(notesPage).toContain('const chips = facetChips(allNotes, activeTags);');
    expect(notesPage).toContain('const notes = filterNotesByTags(allNotes, activeTags);');
    expect(notesPage).toContain(
      '<NoteTagFilter chips={chips} selectedCount={activeTags.length} total={allNotes.length} />',
    );
    expect(notesPage).toContain('{notes.map((note) => {');
  });

  test('the chip row sits before the list', () => {
    const body = notesPage.slice(notesPage.indexOf('<Base '));
    expect(body.indexOf('<NoteTagFilter')).toBeGreaterThan(-1);
    expect(body.indexOf('<NoteTagFilter')).toBeLessThan(body.indexOf('<section class="notes-list">'));
  });

  test('every filtered view canonicalises to the plain list', () => {
    expect(notesPage).toContain('<link rel="canonical" href={`${getSiteUrl()}/notes`} />');
  });

  test('a selection nothing matches is an empty state with a way back, not an error', () => {
    expect(notesPage).toContain('{activeTags.length > 0 && notes.length === 0 && (');
    expect(notesPage).toContain('href="/notes">[ ALL NOTES ]</a>');
    expect(notesPage).toContain("'NO NOTES TAGGED WITH ALL OF '");
    expect(notesPage).not.toContain('Astro.response.status');
  });

  test('the chips hide below two tags and a selected chip is marked', () => {
    expect(filter).toContain('{chips.length >= 2 && (');
    expect(filter).toContain("aria-current={selectedCount === 0 ? 'page' : undefined}");
    expect(filter).toContain("aria-current={chip.selected ? 'true' : undefined}");
    expect(filter).toContain('aria-label="Filter notes by tag"');
  });

  test('an unusable chip is a disabled label, not a link', () => {
    const disabled = filter.slice(filter.indexOf('{chip.disabled ? ('), filter.indexOf(') : ('));
    expect(disabled).toContain('<span class="note-tag-chip bracket-btn is-disabled" aria-disabled="true">');
    expect(disabled).not.toContain('<a');
    expect(disabled).not.toContain('href');
    expect(filter).toContain('.note-tag-chip.is-disabled');
  });

  test('enabled chips are plain links using the href the model computed', () => {
    expect(filter).toContain('href={chip.href}');
    expect(filter).toContain('href="/notes"');
    expect(filter).toContain('bracket-btn row-hover--accent');
    expect(filter).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(filter).not.toContain('<script');
  });

  test('the decorative brackets are hidden from assistive technology', () => {
    // ALL, a disabled chip, and an enabled chip.
    expect(filter.match(/<span aria-hidden="true">\[ <\/span>/g)).toHaveLength(3);
    expect(filter.match(/<span aria-hidden="true"> \]<\/span>/g)).toHaveLength(3);
  });

  test('the feed link is not among the tag chips', () => {
    // It used to sit in this row, where it read as a tag called RSS.
    expect(filter).not.toContain('rss.xml');
    expect(filter).not.toContain('RSS');
  });

  test('the note page shows one pill per tag, each leading to that tag\'s filtered list', () => {
    expect(notePage).toContain('{tags.map((tag) => (');
    expect(notePage).toContain('href={tagHref(tag)}');
    expect(notePage).toContain('class="note-pill"');
    // The pill already had a hover state in the shared sheet.
    expect(css).toContain('.note-pill:hover');
    // Three pills must be able to wrap on a narrow screen.
    expect(css).toMatch(/\.note-article-footer \{[^}]*flex-wrap: wrap/);
  });

  test('the existing list markup is untouched', () => {
    expect(notesPage).toContain('<article class="note">');
    expect(notesPage).toContain('class="note-link lift"');
  });
});
describe('feed discoverability', () => {
  const base = read('../../src/layouts/Base.astro');
  const notesPage = read('../../src/pages/notes.astro');

  test('every page advertises the feed with an absolute URL', () => {
    expect(base).toContain("import { getSiteUrl } from '../lib/seo';");
    expect(base).toContain(
      '<link rel="alternate" type="application/rss+xml" title="ravedeprinz // Notes" href={`${getSiteUrl()}/rss.xml`} />',
    );
    // In the <head>, before the client router.
    const head = base.slice(base.indexOf('<head>'), base.indexOf('</head>'));
    expect(head).toContain('rel="alternate"');
    expect(head.indexOf('rel="alternate"')).toBeLessThan(head.indexOf('<ClientRouter />'));
  });

  test('the alternate link appears exactly once', () => {
    expect(base.match(/rel="alternate"/g)).toHaveLength(1);
  });

  test('the notes page has no visible feed line; the feed is advertised from the head only', () => {
    expect(notesPage).not.toContain('notes-feed');
    expect(notesPage).not.toContain('FOLLOW');
    expect(notesPage).not.toContain('rss.xml');
    // Readers still find it: the alternate link in Base.astro is unchanged.
    expect(base).toContain('rel="alternate" type="application/rss+xml"');
  });
});

describe('same-page navigation skips the page wipe', () => {
  const base = read('../../src/layouts/Base.astro');

  test('a before-swap listener flags navigations that stay on the same path', () => {
    expect(base).toContain('event.from.pathname === event.to.pathname');
    expect(base).toContain("nextRoot.setAttribute('data-same-route', '')");
    // A cross-page swap clears it, so the wipe is never lost.
    expect(base).toContain("nextRoot.removeAttribute('data-same-route')");
  });

  test('the flag goes on the incoming document, not only the outgoing one', () => {
    // The wipe is styled from the root that is current after the swap.
    expect(base).toContain('const nextRoot = event.newDocument?.documentElement;');
    expect(base).toMatch(/nextRoot\.setAttribute\('data-same-route'/);
  });

  test('the flagged root turns both wipe animations off, and the wipe itself is intact', () => {
    expect(base).toContain('html[data-same-route]::view-transition-old(root),');
    expect(base).toMatch(/html\[data-same-route\]::view-transition-new\(root\) \{ animation: none; \}/);
    // The cross-page animations are unchanged.
    expect(base).toContain('animation: page-wipe-out 0.34s cubic-bezier(0.76, 0, 0.24, 1) both;');
    expect(base).toContain('animation: page-wipe-in 0.4s cubic-bezier(0.76, 0, 0.24, 1) 0.12s both;');
  });

  test('the theme carry-over listener is untouched', () => {
    expect(base).toContain("nextRoot.setAttribute('data-theme', activeTheme);");
  });
});

describe('tags on cards, rows and the note page', () => {
  const tagsComponent = read('../../src/components/NoteTags.astro');
  const notesPage = read('../../src/pages/notes.astro');
  const homeRow = read('../../src/components/home/HomeRow.astro');
  const homeNotes = read('../../src/components/home/LatestNotes.astro');
  const homePreview = read('../../src/lib/homePreview.ts');

  test('the tags line wraps only between tags', () => {
    // Each tag, with its slash, is one unbreakable unit; the line itself wraps.
    expect(tagsComponent).toMatch(/\.tags-line \{[^}]*display:flex; flex-wrap:wrap/);
    expect(tagsComponent).toMatch(/\.tags-item \{ white-space:nowrap; \}/);
    // The slash follows its tag and is absent after the last one, so a wrapped
    // line never starts with a slash.
    expect(tagsComponent).toContain('{index < tags.length - 1 && (');
  });

  test('separators are decoration, and screen readers still hear separate tags', () => {
    expect(tagsComponent).toContain('<span class="tags-sep" aria-hidden="true">/</span>');
    expect(tagsComponent).toContain('<span class="tags-sr">, </span>');
    expect(tagsComponent).toMatch(/\.tags-sr \{[^}]*clip:rect\(0 0 0 0\)/);
  });

  test('the component takes its look from where it is placed', () => {
    expect(tagsComponent).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    const style = tagsComponent.slice(tagsComponent.indexOf('<style>'));
    expect(style).not.toMatch(/font-size|letter-spacing|color:/);
    expect(tagsComponent).not.toContain('<a ');
  });

  test('a /notes card reads tags, author, title, subtitle', () => {
    const body = notesPage.slice(notesPage.indexOf('<div class="note-body">'));
    const tags = body.indexOf('<NoteTags tags={noteTagList(note)} />');
    const author = body.indexOf('<p class="note-author">');
    const title = body.indexOf('<h2>{note.title}</h2>');
    const subtitle = body.indexOf('{note.subtitle || note.body}');
    expect(tags).toBeGreaterThan(-1);
    expect(author).toBeGreaterThan(tags);
    expect(title).toBeGreaterThan(author);
    expect(subtitle).toBeGreaterThan(title);
  });

  test('the author has its own line at every width and is omitted when there is none', () => {
    expect(notesPage).toContain('{note.author && <p class="note-author">{note.author}</p>}');
    // Not folded into the tags line with a dot any more.
    expect(notesPage).not.toContain("` · ${note.author}`");
    // Beats the shared `.note p` rule on specificity, so its size and colour hold.
    expect(notesPage).toContain('.note .note-author {');
  });

  test('the card subtitle is still the last paragraph the shared card rule targets', () => {
    const body = notesPage.slice(notesPage.indexOf('<div class="note-body">'), notesPage.indexOf('</div>', notesPage.indexOf('<div class="note-body">')));
    expect(body.trimEnd().endsWith('<p>{note.subtitle || note.body}</p>')).toBe(true);
  });

  test('the home row has a tags slot beside the status badge', () => {
    expect(homeRow).toContain('tags?: string[];');
    expect(homeRow).toContain('{tags.length > 0 && <span class="row-badge"><NoteTags tags={tags} /></span>}');
    expect(homeRow).toContain('{badge && <span class="row-badge">{badge}</span>}');
    // The mobile grid is unchanged: the badge slot already has its own row.
    expect(homeRow).toContain('.row-badge { grid-row:3; grid-column:1; text-align:left; }');
  });

  test('the home strip passes the list and names every tag for assistive technology', () => {
    expect(homeNotes).toContain('tags={entry.tags}');
    expect(homeNotes).toContain('ariaLabel={[entry.title, ...entry.tags, entry.readLabel].join(\', \')}');
    expect(homePreview).toContain('tags: noteTagList(note),');
  });

  test('the note page header shows the tags line, and the archive card does too', () => {
    const head = notePage.slice(notePage.indexOf('<header class="note-article-head">'));
    expect(head.indexOf('<p class="eyebrow"><NoteTags tags={tags} /></p>')).toBeGreaterThan(-1);
    expect(head.indexOf('<p class="eyebrow"><NoteTags tags={tags} /></p>')).toBeLessThan(head.indexOf('<h1 class="display">'));
    // Neither surface reads the single tag any more.
    expect(notePage).not.toContain('<p class=\"eyebrow\">{note.tag}');
    expect(notePage).not.toContain('tagHref(note.tag)');
  });
});
describe('tags in the note page meta and the share story', () => {
  test('article:tag is emitted once per tag', () => {
    expect(notePage).toContain('{tags.map((tag) => <meta property="article:tag" content={tag} />)}');
    expect(notePage).not.toContain('content={note.tag}');
  });

  test('the share story takes the first tag as its one label', () => {
    expect(notePage).toContain('category: primaryTag(note),');
  });
});