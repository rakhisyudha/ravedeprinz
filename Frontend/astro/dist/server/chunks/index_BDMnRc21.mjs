import { t as __exportAll } from "./rolldown-runtime_BBjsoOtd.mjs";
import { A as renderTemplate, w as renderComponent } from "./sequence_DWzfefGn.mjs";
import { a as attr, n as derived, o as escape_html, r as ensure_array_like } from "./dev_CV5-D1wl.mjs";
import "./index-server_BHvVSAON.mjs";
import { t as createComponent } from "./compiler_D1liazrR.mjs";
import { n as $$Admin } from "./admin_COOrxuH0.mjs";
//#region src/components/admin/AdminDashboard.svelte
function AdminDashboard($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const { apiBase } = $$props;
		const cards = derived(() => [
			[
				"/admin/home",
				"HOME",
				"—"
			],
			[
				"/admin/about",
				"ABOUT",
				"—"
			],
			[
				"/admin/work",
				"WORK",
				"—"
			],
			[
				"/admin/projects",
				"PROJECTS",
				"—"
			],
			[
				"/admin/notes",
				"NOTES",
				"—"
			],
			[
				"/admin/now",
				"NOW",
				"—"
			]
		]);
		$$renderer.push(`<section class="admin-dashboard"><div class="admin-grid"><!--[-->`);
		const each_array = ensure_array_like(cards());
		for (let index = 0, $$length = each_array.length; index < $$length; index++) {
			let [href, label, count] = each_array[index];
			$$renderer.push(`<a${attr("href", href)} class="admin-card cut touch-target"><span>0${escape_html(index + 1)}</span> <h2 class="display">${escape_html(label)}</h2> <p>${escape_html(count)} records</p></a>`);
		}
		$$renderer.push(`<!--]--></div> <div class="admin-dashboard-footer"><a href="/admin/users" class="admin-nav-link touch-target">+ REGISTER A NEW ADMIN EMAIL</a> <a href="/" target="_blank" rel="noreferrer" class="admin-nav-link touch-target">VIEW PUBLIC SITE ↗</a></div></section>`);
	});
}
//#endregion
//#region src/pages/admin/index.astro
var admin_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
var $$Index = createComponent(($$result, $$props, $$slots) => {
	const apiBase = "http://localhost:4100".replace(/\/$/, "");
	return renderTemplate`${renderComponent($$result, "Admin", $$Admin, {
		"title": "CONTROL",
		"currentPath": "/admin"
	}, { "default": ($$result2) => renderTemplate`${renderComponent($$result2, "AdminDashboard", AdminDashboard, {
		"client:load": true,
		"apiBase": apiBase,
		"client:component-hydration": "load",
		"client:component-path": "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/components/admin/AdminDashboard.svelte",
		"client:component-export": "default"
	})}` })}`;
}, "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/admin/index.astro", void 0);
var $$file = "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/admin/index.astro";
var $$url = "/admin";
//#endregion
//#region \0virtual:astro:page:src/pages/admin/index@_@astro
var page = () => admin_exports;
//#endregion
export { page };
