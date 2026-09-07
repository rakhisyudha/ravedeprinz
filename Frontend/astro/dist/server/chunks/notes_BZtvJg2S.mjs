import { t as __exportAll } from "./rolldown-runtime_BBjsoOtd.mjs";
import { A as renderTemplate, w as renderComponent } from "./sequence_DWzfefGn.mjs";
import { o as escape_html, r as ensure_array_like } from "./dev_CV5-D1wl.mjs";
import "./index-server_BHvVSAON.mjs";
import { t as createComponent } from "./compiler_D1liazrR.mjs";
import { n as $$Admin } from "./admin_COOrxuH0.mjs";
import { n as AdminField, t as AdminSection } from "./AdminSection_B3VX3zwP.mjs";
import { t as AdminTabs } from "./AdminTabs_QwW0LmOp.mjs";
import { t as AdminAccordion } from "./AdminAccordion_B1rLDaqs.mjs";
import { t as AdminImageUpload } from "./AdminImageUpload_Bbdzywc9.mjs";
import { t as readingMinutes } from "./readingTime_OPgEsFKp.mjs";
//#region src/components/admin/AdminNotes.svelte
function AdminNotes($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const { apiBase } = $$props;
		let notes = [];
		let status = "LOADING…";
		let draft = {};
		function slugify(input) {
			return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
		}
		function readPreview(row) {
			return `READ ${String(readingMinutes(String(row.body ?? ""), String(row.image_url ?? ""))).padStart(2, "0")} MIN`;
		}
		function update(index, key) {
			return (value) => {
				notes = notes.map((r, i) => i === index ? {
					...r,
					[key]: value
				} : r);
			};
		}
		function newTab($$renderer) {
			AdminSection($$renderer, {
				eyebrow: "NEW NOTE",
				children: ($$renderer) => {
					$$renderer.push(`<div class="admin-grid-2">`);
					AdminField($$renderer, {
						label: "TITLE",
						value: String(draft.title ?? ""),
						onChange: (v) => draft = {
							...draft,
							title: v,
							slug: slugify(v)
						}
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "TAG",
						value: String(draft.tag ?? "REFLECTION"),
						onChange: (v) => draft = {
							...draft,
							tag: v
						}
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "SUBTITLE (META DESC)",
						value: String(draft.subtitle ?? ""),
						onChange: (v) => draft = {
							...draft,
							subtitle: v
						}
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "AUTHOR",
						value: String(draft.author ?? ""),
						onChange: (v) => draft = {
							...draft,
							author: v
						}
					});
					$$renderer.push(`<!----> <div class="admin-field"><span class="admin-field-label">READ (COMPUTED)</span><span class="admin-read-preview">${escape_html(readPreview(draft))}</span></div></div> `);
					AdminImageUpload($$renderer, {
						label: "COVER IMAGE",
						value: String(draft.image_url ?? ""),
						onChange: (v) => draft = {
							...draft,
							image_url: v
						},
						apiBase
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "BODY (MARKDOWN)",
						textarea: true,
						value: String(draft.body ?? ""),
						onChange: (v) => draft = {
							...draft,
							body: v
						}
					});
					$$renderer.push(`<!----> <div class="admin-row-actions"><button class="auth-button touch-target">SAVE DRAFT</button> <button class="auth-button touch-target">PUBLISH</button></div>`);
				},
				$$slots: { default: true }
			});
		}
		function existingTab($$renderer) {
			AdminSection($$renderer, {
				eyebrow: `NOTES // ${notes.length} ITEMS`,
				children: ($$renderer) => {
					$$renderer.push(`<div class="admin-accordion"><!--[-->`);
					const each_array = ensure_array_like(notes);
					for (let index = 0, $$length = each_array.length; index < $$length; index++) {
						let note = each_array[index];
						AdminAccordion($$renderer, {
							title: String(note.title ?? "UNTITLED"),
							subtitle: `${note.tag ?? ""} · ${note.published ? "PUBLISHED" : "DRAFT"}`,
							defaultOpen: index === 0,
							children: ($$renderer) => {
								$$renderer.push(`<div class="admin-grid-2">`);
								AdminField($$renderer, {
									label: "TITLE",
									value: String(note.title ?? ""),
									onChange: update(index, "title")
								});
								$$renderer.push(`<!----> `);
								AdminField($$renderer, {
									label: "TAG",
									value: String(note.tag ?? ""),
									onChange: update(index, "tag")
								});
								$$renderer.push(`<!----> `);
								AdminField($$renderer, {
									label: "SUBTITLE (META DESC)",
									value: String(note.subtitle ?? ""),
									onChange: update(index, "subtitle")
								});
								$$renderer.push(`<!----> `);
								AdminField($$renderer, {
									label: "AUTHOR",
									value: String(note.author ?? ""),
									onChange: update(index, "author")
								});
								$$renderer.push(`<!----> <div class="admin-field"><span class="admin-field-label">READ (COMPUTED)</span><span class="admin-read-preview">${escape_html(readPreview(note))}</span></div></div> `);
								AdminImageUpload($$renderer, {
									label: "COVER IMAGE",
									value: String(note.image_url ?? ""),
									onChange: update(index, "image_url"),
									apiBase
								});
								$$renderer.push(`<!----> `);
								AdminField($$renderer, {
									label: "BODY (MARKDOWN)",
									textarea: true,
									value: String(note.body ?? ""),
									onChange: update(index, "body")
								});
								$$renderer.push(`<!----> <div class="admin-row-actions"><span class="auth-error" style="margin: 0">${escape_html(note.published ? "PUBLISHED" : "DRAFT")}</span> <button class="admin-nav-link touch-target">SAVE</button> `);
								if (!note.published) $$renderer.push(`<!--[0--><button class="admin-nav-link touch-target">PUBLISH</button>`);
								else $$renderer.push("<!--[-1-->");
								$$renderer.push(`<!--]--> <button class="admin-nav-link touch-target">DELETE</button></div>`);
							},
							$$slots: { default: true }
						});
					}
					$$renderer.push(`<!--]--></div>`);
				},
				$$slots: { default: true }
			});
		}
		$$renderer.push(`<section class="admin-section">`);
		AdminTabs($$renderer, { tabs: [{
			id: "new",
			label: "NEW",
			content: newTab
		}, {
			id: "existing",
			label: "NOTES",
			count: notes.length,
			content: existingTab
		}] });
		$$renderer.push(`<!----> <p class="auth-error" style="margin-top: 18px">${escape_html(status)}</p></section>`);
	});
}
//#endregion
//#region src/pages/admin/notes.astro
var notes_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Notes,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
var $$Notes = createComponent(($$result, $$props, $$slots) => {
	const apiBase = "http://localhost:4100".replace(/\/$/, "");
	return renderTemplate`${renderComponent($$result, "Admin", $$Admin, {
		"title": "CONTROL — NOTES",
		"currentPath": "/admin/notes"
	}, { "default": ($$result2) => renderTemplate`${renderComponent($$result2, "AdminNotes", AdminNotes, {
		"client:load": true,
		"apiBase": apiBase,
		"client:component-hydration": "load",
		"client:component-path": "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/components/admin/AdminNotes.svelte",
		"client:component-export": "default"
	})}` })}`;
}, "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/admin/notes.astro", void 0);
var $$file = "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/admin/notes.astro";
var $$url = "/admin/notes";
//#endregion
//#region \0virtual:astro:page:src/pages/admin/notes@_@astro
var page = () => notes_exports;
//#endregion
export { page };
