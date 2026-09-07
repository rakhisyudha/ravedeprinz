import { t as __exportAll } from "./rolldown-runtime_BBjsoOtd.mjs";
import { A as renderTemplate, j as maybeRenderHead, w as renderComponent } from "./sequence_DWzfefGn.mjs";
import { t as createComponent } from "./compiler_D1liazrR.mjs";
import { m as fetchWork, t as $$Base } from "./Base_Ch7LxtAO.mjs";
import { t as $$PageHead } from "./PageHead_ucoriEh5.mjs";
import { a as work } from "./content_Cbxw4wkk.mjs";
//#region src/pages/work.astro
var work_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Work,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
var $$Work = createComponent(async ($$result, $$props, $$slots) => {
	const work$1 = (await fetchWork())?.work ?? work.map((w) => ({
		role: w.role,
		company: w.company,
		location: w.location ?? "",
		date_label: w.date,
		description: w.desc,
		stack: w.stack,
		company_url: w.companyLink ?? null
	}));
	return renderTemplate`${renderComponent($$result, "Base", $$Base, {
		"title": "WORK",
		"currentPath": "/work"
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "PageHead", $$PageHead, {
		"index": "FIELD RECORD / 003",
		"title": "WORK",
		"intro": "A record of the teams and responsibilities that shaped how I work. Not a résumé. A map of decisions and outcomes."
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<section class="record-list">${work$1.map((item, index) => renderTemplate`<article class="record lift"><span class="record-number">0${index + 1}<small>${item.date}</small></span><div><p class="eyebrow">${item.company}${item.location ? ` / ${item.location}` : ""}</p><h2>${item.role}</h2><p>${item.desc}</p><p class="metadata">${item.stack}</p></div><aside><span>CONTRIBUTION</span><p>Built the structure behind a more dependable daily workflow.</p></aside></article>`)}</section>` })}` })}`;
}, "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/work.astro", void 0);
var $$file = "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/work.astro";
var $$url = "/work";
//#endregion
//#region \0virtual:astro:page:src/pages/work@_@astro
var page = () => work_exports;
//#endregion
export { page };
