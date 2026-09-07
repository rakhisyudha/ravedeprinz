import { t as __exportAll } from "./rolldown-runtime_BBjsoOtd.mjs";
import { A as renderTemplate, N as addAttribute, j as maybeRenderHead, w as renderComponent } from "./sequence_DWzfefGn.mjs";
import { t as createComponent } from "./compiler_D1liazrR.mjs";
import { a as nowContent, f as fetchNow, t as $$Base } from "./Base_Ch7LxtAO.mjs";
import { t as $$PageHead } from "./PageHead_ucoriEh5.mjs";
//#region src/pages/now.astro
var now_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Now,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
var $$Now = createComponent(async ($$result, $$props, $$slots) => {
	const liveNow = await fetchNow();
	const data = {
		current: liveNow?.current ?? nowContent.current,
		attention: liveNow?.attention ?? nowContent.attention,
		history: liveNow?.history ?? nowContent.history
	};
	const current = data.current;
	return renderTemplate`${renderComponent($$result, "Base", $$Base, {
		"title": "NOW",
		"currentPath": "/now"
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "PageHead", $$PageHead, {
		"index": "NOW / 006",
		"title": "NOW",
		"intro": "This page changes. So does everything on it."
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<header class="now-intro"><span class="eyebrow">NOW</span><span class="now-updated">${current.updated_label}</span><p>This page changes.<br>So does everything on it.</p></header><section class="now-current"><div class="now-current-label"><span class="eyebrow">${current.label}</span><span class="now-current-number">[01]</span></div><h2 class="display">${current.title.split(" ")[0]}<br><span>${current.title.split(" ").slice(1).join(" ")}</span></h2><p>${current.description}</p></section><section class="now-attention"><div class="now-section-heading"><span class="eyebrow">WHAT HAS MY ATTENTION</span><span class="stripe"></span></div>${data.attention.map((item, index) => renderTemplate`<article${addAttribute(`attention-item attention-item-${index}`, "class")}><span class="attention-number">${item.number}</span><div><p class="eyebrow">${item.label}</p><h3>${item.title}</h3><p>${item.note}</p></div></article>`)}</section><section class="now-recent"><div class="now-section-heading"><span class="eyebrow">RECENTLY</span><span class="stripe"></span></div>${data.history.map((item) => renderTemplate`<p><span>${item.date_label}</span><i></i>${item.text}</p>`)}</section>` })}` })}`;
}, "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/now.astro", void 0);
var $$file = "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/now.astro";
var $$url = "/now";
//#endregion
//#region \0virtual:astro:page:src/pages/now@_@astro
var page = () => now_exports;
//#endregion
export { page };
