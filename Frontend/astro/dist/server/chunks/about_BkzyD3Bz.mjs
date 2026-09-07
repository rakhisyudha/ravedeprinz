import { t as __exportAll } from "./rolldown-runtime_BBjsoOtd.mjs";
import { A as renderTemplate, N as addAttribute, j as maybeRenderHead, w as renderComponent } from "./sequence_DWzfefGn.mjs";
import { t as createComponent } from "./compiler_D1liazrR.mjs";
import { l as fetchAbout, m as fetchWork, n as aboutContent, t as $$Base } from "./Base_Ch7LxtAO.mjs";
import { t as $$PageHead } from "./PageHead_ucoriEh5.mjs";
import { i as skills, t as education } from "./content_Cbxw4wkk.mjs";
//#region src/pages/about.astro
var about_exports = /* @__PURE__ */ __exportAll({
	default: () => $$About,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
var $$About = createComponent(async ($$result, $$props, $$slots) => {
	const liveAbout = await fetchAbout();
	const liveWork = await fetchWork();
	const content = liveAbout?.content ?? aboutContent;
	const skillList = liveAbout?.skills ?? skills.flatMap((group) => group.skills.map((skill_name) => ({
		category: group.category,
		skill_name
	})));
	const educationList = liveWork?.education ?? education.map((e) => ({
		title: e.type,
		institution: e.place,
		date_label: e.time,
		description: e.info
	}));
	const grouped = {};
	for (const item of skillList) (grouped[item.category] ??= []).push(item.skill_name);
	const portrait = content.portrait_url?.trim() || "/img/Profile/ini.jpeg";
	return renderTemplate`${renderComponent($$result, "Base", $$Base, {
		"title": "ABOUT",
		"currentPath": "/about",
		"data-astro-cid-ta2fbyqs": true
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "PageHead", $$PageHead, {
		"index": content.eyebrow,
		"title": "ABOUT",
		"intro": "The person behind the systems. More interested in a good question than a polished job title.",
		"data-astro-cid-ta2fbyqs": true
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<section class="about-grid" data-astro-cid-ta2fbyqs><article class="panel cut about-story p-6 sm:p-10" data-astro-cid-ta2fbyqs><div class="about-portrait about-portrait-sticker" data-astro-cid-ta2fbyqs><img${addAttribute(portrait, "src")} alt="Rakhis de Yudha" width="260" height="275" data-astro-cid-ta2fbyqs><span class="about-photo-label" data-astro-cid-ta2fbyqs>RDP / 001</span><span class="about-photo-badge" data-astro-cid-ta2fbyqs>BUILDING</span></div><p class="eyebrow" data-astro-cid-ta2fbyqs>01 / THE SHORT VERSION</p><p class="about-quote" data-astro-cid-ta2fbyqs>${content.quote} <span data-astro-cid-ta2fbyqs>${content.quote_accent}</span> and built to last.</p><p data-astro-cid-ta2fbyqs>${content.paragraph_one}</p><p data-astro-cid-ta2fbyqs>${content.paragraph_two}</p></article><aside class="panel cut p-6 sm:p-8" data-astro-cid-ta2fbyqs><p class="eyebrow mb-7" data-astro-cid-ta2fbyqs>02 / WORKING MATERIALS</p>${Object.entries(grouped).map(([category, list]) => renderTemplate`<div class="skill-group" data-astro-cid-ta2fbyqs><span data-astro-cid-ta2fbyqs>${category}</span><p data-astro-cid-ta2fbyqs>${list.join(" / ")}</p></div>`)}</aside></section><section class="about-timeline" data-astro-cid-ta2fbyqs><p class="eyebrow" data-astro-cid-ta2fbyqs>03 / WHERE I CAME FROM</p>${educationList.map((item, index) => renderTemplate`<article class="record" data-astro-cid-ta2fbyqs><span class="record-number" data-astro-cid-ta2fbyqs>0${index + 1}<small data-astro-cid-ta2fbyqs>${item.date_label}</small></span><div data-astro-cid-ta2fbyqs><p class="eyebrow" data-astro-cid-ta2fbyqs>${item.institution}</p><h2 data-astro-cid-ta2fbyqs>${item.title}</h2><p data-astro-cid-ta2fbyqs>${item.description}</p></div></article>`)}</section>` })}` })}`;
}, "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/about.astro", void 0);
var $$file = "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/about.astro";
var $$url = "/about";
//#endregion
//#region \0virtual:astro:page:src/pages/about@_@astro
var page = () => about_exports;
//#endregion
export { page };
