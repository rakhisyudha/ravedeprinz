import { a as attr, o as escape_html } from "./dev_CV5-D1wl.mjs";
//#region src/components/admin/AdminField.svelte
function AdminField($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const { label, value, onChange, textarea = false, type = "text", placeholder } = $$props;
		$$renderer.push(`<label class="admin-field"><span>${escape_html(label)}</span> `);
		if (textarea) {
			$$renderer.push(`<!--[0--><textarea${attr("rows", 3)} class="admin-input"${attr("placeholder", placeholder)}>`);
			const $$body = escape_html(value);
			if ($$body) $$renderer.push(`${$$body}`);
			$$renderer.push(`</textarea>`);
		} else $$renderer.push(`<!--[-1--><input${attr("type", type)} class="admin-input"${attr("value", value)}${attr("placeholder", placeholder)}/>`);
		$$renderer.push(`<!--]--></label>`);
	});
}
//#endregion
//#region src/components/admin/AdminSection.svelte
function AdminSection($$renderer, $$props) {
	const { eyebrow, children } = $$props;
	$$renderer.push(`<div class="admin-editor"><p class="eyebrow">${escape_html(eyebrow)}</p> `);
	children($$renderer);
	$$renderer.push(`<!----></div>`);
}
//#endregion
export { AdminField as n, AdminSection as t };
