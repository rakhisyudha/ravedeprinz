import { t as __exportAll } from "./rolldown-runtime_BBjsoOtd.mjs";
import { A as renderTemplate, N as addAttribute, j as maybeRenderHead, w as renderComponent } from "./sequence_DWzfefGn.mjs";
import { n as derived, o as escape_html, t as attr_class } from "./dev_CV5-D1wl.mjs";
import { t as createComponent } from "./compiler_D1liazrR.mjs";
import { i as navigation, r as homeContent, t as $$Base, u as fetchHome } from "./Base_Ch7LxtAO.mjs";
//#region src/components/HudPanel.svelte
function HudPanel($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const { years: targetYears = 4, label = "YEARS BUILDING", noiseTop = "// SYSTEM_04", noiseBottom = "BUILD / REPEAT / SHIP" } = $$props;
		let years = 0;
		let shown = false;
		const labelParts = derived(() => label.split(" "));
		$$renderer.push(`<div class="hud-panel cut relative isolate overflow-hidden p-6 sm:p-8"><div class="hud-slice hud-slice-one pointer-events-none absolute z-10"></div> <div class="hud-slice hud-slice-two pointer-events-none absolute z-10"></div> <span class="hud-notch hud-notch-top"></span> <span class="hud-notch hud-notch-bottom"></span> <div class="relative z-20 flex min-h-[300px] flex-col justify-center"><span class="hud-noise hud-noise-top">${escape_html(noiseTop)}</span> <span${attr_class("display hud-number hud-number-reversed block text-[clamp(9rem,22vw,15rem)] font-bold italic leading-[0.72] hud-count-in svelte-1v4hi9j", void 0, { "hud-count-on": shown })}>${escape_html(String(years).padStart(2, "0"))}</span> <span${attr_class("display mt-8 block max-w-[220px] text-3xl font-bold leading-[0.86] text-white sm:text-4xl hud-label-in svelte-1v4hi9j", void 0, { "hud-label-on": shown })}>${escape_html(labelParts()[0] ?? "")} <strong class="hud-of">0F</strong> ${escape_html(labelParts().slice(1).join(" "))}</span> <span class="hud-noise hud-noise-bottom">${escape_html(noiseBottom)}</span></div></div>`);
	});
}
//#endregion
//#region src/pages/index.astro
var pages_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	prerender: () => false,
	url: () => ""
});
var $$Index = createComponent(async ($$result, $$props, $$slots) => {
	const liveHome = await fetchHome();
	const content = liveHome?.content ?? homeContent;
	const navigation$1 = liveHome?.navigation ?? navigation;
	return renderTemplate`${renderComponent($$result, "Base", $$Base, {
		"title": "Rakhis de Yudha // Personal archive",
		"currentPath": "/"
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<main class="home-page"><div class="home-layout"><section class="home-copy"><p class="eyebrow"><span class="slash">//</span> ${content.archive_label} / ${content.archive_number}</p><h1 class="display">${content.headline_line_one}<br><span class="accent-word">${content.headline_line_two}</span>${content.headline_line_three}<span class="accent-dot">${content.headline_period}</span></h1><div class="headline-meta"><span>${content.headline_meta}</span><i></i></div><p class="lede">${content.intro}</p><a${addAttribute(content.cta_url, "href")} class="home-cta">${content.cta_label} <b>↗</b></a></section><aside class="profile-column"><div class="hud-only">${renderComponent($$result, "HudPanel", HudPanel, {
		"client:visible": true,
		"years": content.years_building,
		"label": content.hud_label,
		"noiseTop": content.hud_noise_top,
		"noiseBottom": content.hud_noise_bottom,
		"client:component-hydration": "visible",
		"client:component-path": "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/components/HudPanel.svelte",
		"client:component-export": "default"
	})}</div><div class="quick-links">${navigation$1.slice(-2).reverse().map((item) => renderTemplate`<a${addAttribute(item.href, "href")}><span>${item.display_number}</span> ${item.label.toUpperCase()}</a>`)}</div></aside></div><nav class="home-rule" aria-label="Explore the archive"><p class="home-rule-label">ARCHIVE INDEX <span>// SELECT A RECORD</span></p><div class="home-records">${navigation$1.map((item, index) => renderTemplate`<a${addAttribute(item.href, "href")}${addAttribute(`home-record home-record-${index}`, "class")}><span class="home-record-number">${item.display_number}</span><span class="home-record-copy"><b>${item.label}</b><small>${item.description}</small></span><span class="home-record-arrow">↗</span></a>`)}</div></nav></main>` })}`;
}, "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/index.astro", void 0);
var $$file = "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/index.astro";
//#endregion
//#region \0virtual:astro:page:src/pages/index@_@astro
var page = () => pages_exports;
//#endregion
export { page };
