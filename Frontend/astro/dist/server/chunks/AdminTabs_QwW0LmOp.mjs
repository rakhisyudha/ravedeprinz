import { a as attr, n as derived, o as escape_html, r as ensure_array_like, t as attr_class } from "./dev_CV5-D1wl.mjs";
//#region src/components/admin/AdminTabs.svelte
function AdminTabs($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const { tabs, defaultId } = $$props;
		const activeId = derived(() => defaultId ?? tabs[0]?.id);
		const current = derived(() => tabs.find((t) => t.id === activeId()) ?? tabs[0]);
		$$renderer.push(`<div class="admin-tabs-shell"><div class="admin-tabs" role="tablist"><!--[-->`);
		const each_array = ensure_array_like(tabs);
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let tab = each_array[$$index];
			$$renderer.push(`<button role="tab"${attr("aria-selected", activeId() === tab.id)}${attr_class("admin-tab touch-target", void 0, { "is-active": activeId() === tab.id })}>${escape_html(tab.label)} `);
			if (tab.count != null) $$renderer.push(`<!--[0--><small>×${escape_html(tab.count)}</small>`);
			else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></button>`);
		}
		$$renderer.push(`<!--]--></div> <div class="admin-tab-panel" role="tabpanel">`);
		if (current()) {
			$$renderer.push("<!--[0-->");
			current().content($$renderer);
			$$renderer.push(`<!---->`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div></div>`);
	});
}
//#endregion
export { AdminTabs as t };
