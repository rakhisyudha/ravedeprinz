import { A as renderTemplate, B as createAstro, D as renderSlot, N as addAttribute, j as maybeRenderHead } from "./sequence_DWzfefGn.mjs";
import { t as createComponent } from "./compiler_D1liazrR.mjs";
//#region src/components/PageHead.astro
createAstro("https://astro.build");
var $$PageHead = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$PageHead;
	const { index, title, intro } = Astro.props;
	return renderTemplate`${maybeRenderHead($$result)}<main class="page"${addAttribute(title, "data-page")}><span class="brand-watermark" aria-hidden="true">R</span><div class="page-head"><div><p class="eyebrow"><span class="slash">//</span> ${index}</p><h1 class="display">${title}</h1></div><p class="intro">${intro}</p></div>${renderSlot($$result, $$slots["default"])}</main>`;
}, "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/components/PageHead.astro", void 0);
//#endregion
export { $$PageHead as t };
