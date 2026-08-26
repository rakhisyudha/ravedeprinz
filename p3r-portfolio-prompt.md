# Prompt: Personal Website — Persona 3 Reload Theme

Copy everything below into your AI coding tool (Claude Code, v0, Cursor, etc.) as the build brief.

---

## Project Brief

Build a personal website in **Next.js** (App Router) with the following routes:

| Route | Purpose |
|---|---|
| `/` | Personal landing page — hero intro, quick nav into the rest of the site |
| `/about` | Who I am — background, story, skills |
| `/work` | Professional portfolio — internships, roles, case studies |
| `/projects` | Projects, finished and unfinished — a builder's log |
| `/notes` | Writing / thoughts — blog-style or note-style entries |
| `/now` | What I'm currently doing — a living status page |

Use TypeScript, Tailwind CSS, and Framer Motion for animation. Content should be structured (MDX or JSON/CMS-like data files) so pages are easy to update later.

---

## Color Palette (strict — no colors outside this set + neutrals)

```
--p3-sky:      #79D7FD   rgb(121, 215, 253)   // accent / highlight, hover states
--p3-cyan:     #00BBFA   rgb(0, 187, 250)     // primary accent, links, active states
--p3-navy:     #001736   rgb(0, 23, 54)       // primary background (darkest)
--p3-navy-2:   #00183E   rgb(0, 24, 62)       // secondary background, cards, panels
--p3-gold:     #FFC54A   rgb(255, 197, 74)    // premium accent — CTAs, section markers, "velvet" highlight, used sparingly
```

Usage rules:
- Background: navy (`#001736`) as the base canvas, `#00183E` for elevated surfaces (cards, nav bar, modals).
- Cyan (`#00BBFA`) is the primary interactive color — links, buttons, progress indicators, glowing edges.
- Sky (`#79D7FD`) is for secondary highlights, subtle glows, hover lightening, gradient tops.
- Gold (`#FFC54A`) is a **rare accent** — reserved for one focal element per view (a CTA, a section number, a signature mark) so it reads as premium, not decorative clutter.
- White/off-white text on navy for body copy; avoid pure black anywhere.

---

## Design Direction: Persona 3 Reload UI Language

The site should feel like navigating the P3R menu system / Velvet Room, translated into a clean web portfolio — not a literal reskin, but the same *design grammar*:

**Shapes & Layout**
- Sharp diagonal cuts and angled panel edges (clip-path polygons) instead of soft rounded corners — think menu tabs and dialogue boxes sliced at an angle.
- Asymmetric grid layouts; avoid centered, symmetric "template" compositions.
- Layered depth: background panels in `navy-2`, foreground content in navy with cyan/gold edge lines, subtle drop shadows with a cyan glow instead of black shadow.
- Thin 1–2px cyan or gold rule lines used as dividers, often diagonal, echoing UI HUD elements.

**Typography**
- A bold, condensed, slightly aggressive display typeface for headings and nav (something like a tall sans-serif or a distressed/handwritten-poster hybrid — e.g. pairing a strong grotesk with an accent display font for section titles), all-caps for nav/section labels with wide letter-spacing.
- Clean, readable sans-serif for body text (Inter, Manrope, or similar) — legibility first.
- Numbers/dates styled like UI counters (monospace or tabular figures) for things like project years or "day count" on `/now`.

**Motion**
- Page transitions as quick diagonal wipe/slide transitions (cyan or gold sweeping across on route change), echoing P3R's menu-swap animations.
- Hover states: subtle glow pulse in cyan, slight skew or scale-up on cards.
- Scroll-triggered reveals: elements slide in from an angle, not a plain fade.
- Keep motion snappy (150–300ms), not slow/dreamy — P3R UI is energetic and percussive, not ambient.

**Texture & Detail**
- Optional subtle halftone/dot pattern or fine diagonal hatching in background panels at low opacity, evoking the UI's print-collage texture.
- Card components styled like "Persona/Tarot cards" or menu tiles: angled corner cut, thin glowing border, small label tag in the corner (e.g. role, year, stack).
- A recurring motif element (e.g. a small angled arrow, chevron, or "cut corner" shape) reused consistently across buttons, nav indicators, and section markers for cohesion.

**What to avoid**
- No literal Persona characters, logos, or copyrighted game assets/artwork.
- No soft neumorphism, no pastel gradients unrelated to the palette, no generic "SaaS landing page" look (large rounded hero cards, stock gradients).
- Don't overuse gold — it should feel earned/rare, like an S-Link rank-up, not a background color.

---

## Page-Specific Notes

**`/` (Landing)**
- Full-height hero: name, short tagline (e.g. "Backend Developer & CS Student"), one strong CTA.
- Quick-nav tiles/cards linking to About / Work / Projects / Notes / Now, styled as angled menu tiles.

**`/about`**
- Short narrative bio, skills list (styled like a stat/skill panel), and a personal note on interests (JRPGs / Persona, systems thinking) if you want to let personality show.

**`/work`**
- Timeline or card grid of internships/roles (e.g. Backend Intern, Frontend Intern), each with role, stack, and impact — case-study style, can link out to `/projects` for deep dives.

**`/projects`**
- Grid of project cards, each taggable as **Finished** / **In Progress** / **Shelved** — use color-coded corner tags (cyan = done, gold = active, muted = shelved) rather than text-heavy labels.

**`/notes`**
- List of short writings/thoughts, reverse-chronological, minimal card or list-row style, generous whitespace, since this is a reading-focused page (motion/texture should recede here in favor of legibility).

**`/now`**
- A single-focus "status" page — what you're currently building/learning/playing — styled like a live HUD readout. Include a last-updated timestamp.

---

## Technical Notes
- Fully responsive (mobile-first), test the diagonal/angled elements carefully at small breakpoints since clip-paths can break awkwardly.
- Respect `prefers-reduced-motion`.
- Keep contrast ratios accessible (WCAG AA) despite the dark palette — verify body text against `#001736`/`#00183E`.
- Content-driven: pull `/projects` and `/notes` from local MDX/JSON so new entries don't require touching layout code.
