import { a as attr, n as derived, o as escape_html } from "./dev_CV5-D1wl.mjs";
//#region src/components/admin/AdminAccordion.svelte
function AdminAccordion($$renderer, $$props) {
	const { title, subtitle, defaultOpen = false, children } = $$props;
	const open = derived(() => defaultOpen);
	$$renderer.push(`<div class="admin-accordion-item"><button type="button" class="admin-accordion-head touch-target"${attr("aria-expanded", open())}><span><b>${escape_html(title)}</b> `);
	if (subtitle) $$renderer.push(`<!--[0--><small>${escape_html(subtitle)}</small>`);
	else $$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--></span> <span class="admin-accordion-icon">${escape_html(open() ? "—" : "+")}</span></button> `);
	if (open()) {
		$$renderer.push(`<!--[0--><div class="admin-accordion-body">`);
		children($$renderer);
		$$renderer.push(`<!----></div>`);
	} else $$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--></div>`);
}
//#endregion
export { AdminAccordion as t };
