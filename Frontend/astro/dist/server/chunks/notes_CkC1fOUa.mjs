import { t as __exportAll } from "./rolldown-runtime_BBjsoOtd.mjs";
import { A as renderTemplate, N as addAttribute, j as maybeRenderHead, w as renderComponent } from "./sequence_DWzfefGn.mjs";
import { t as createComponent } from "./compiler_D1liazrR.mjs";
import { c as slugify, d as fetchNotes, t as $$Base } from "./Base_Ch7LxtAO.mjs";
import { t as $$PageHead } from "./PageHead_ucoriEh5.mjs";
import { n as notes } from "./content_Cbxw4wkk.mjs";
import { t as readingMinutes } from "./readingTime_OPgEsFKp.mjs";
//#region src/pages/notes.astro
var notes_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Notes,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
var $$Notes = createComponent(async ($$result, $$props, $$slots) => {
	const notes$1 = (await fetchNotes())?.notes ?? notes.map((n) => ({
		title: n.title,
		slug: slugify(n.title),
		body: n.text,
		tag: n.tag,
		author: "Rakhis",
		subtitle: null,
		image_url: null,
		published_at: null
	}));
	function dateLabel(publishedAt) {
		if (!publishedAt) return "";
		const parsed = new Date(publishedAt);
		if (Number.isNaN(parsed.getTime())) return "";
		return parsed.toLocaleDateString("en-GB", {
			day: "2-digit",
			month: "short"
		}).toUpperCase();
	}
	return renderTemplate`${renderComponent($$result, "Base", $$Base, {
		"title": "NOTES",
		"currentPath": "/notes"
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "PageHead", $$PageHead, {
		"index": "TRANSMISSIONS / 005",
		"title": "NOTES",
		"intro": "Short transmissions from the workbench. Mostly unfinished thoughts, left legible on purpose."
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<section class="notes-list">${notes$1.map((note) => {
		const slug = note.slug?.trim() || slugify(note.title);
		const minutes = readingMinutes(note.body ?? "", note.image_url);
		return renderTemplate`<article class="note lift"><a${addAttribute(`/notes/${slug}`, "href")} class="note-link"><span class="note-date">${dateLabel(note.published_at)}<small>READ ${String(minutes).padStart(2, "0")} MIN</small></span><div class="note-body"><p class="eyebrow">${note.tag}${note.author ? ` · ${note.author}` : ""}</p><h2>${note.title}</h2><p>${note.subtitle || note.body}</p></div>${note.image_url && renderTemplate`<div class="note-thumb"><img${addAttribute(note.image_url, "src")} alt="" loading="lazy"></div>`}</a></article>`;
	})}</section>` })}` })}`;
}, "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/notes.astro", void 0);
var $$file = "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/notes.astro";
var $$url = "/notes";
//#endregion
//#region \0virtual:astro:page:src/pages/notes@_@astro
var page = () => notes_exports;
//#endregion
export { page };
