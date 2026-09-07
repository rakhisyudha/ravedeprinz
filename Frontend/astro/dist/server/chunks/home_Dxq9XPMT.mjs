import { t as __exportAll } from "./rolldown-runtime_BBjsoOtd.mjs";
import { A as renderTemplate, w as renderComponent } from "./sequence_DWzfefGn.mjs";
import { r as ensure_array_like } from "./dev_CV5-D1wl.mjs";
import "./index-server_BHvVSAON.mjs";
import { t as createComponent } from "./compiler_D1liazrR.mjs";
import { n as $$Admin, t as adminApi } from "./admin_COOrxuH0.mjs";
import { n as AdminField, t as AdminSection } from "./AdminSection_B3VX3zwP.mjs";
import { t as AdminSaveBar } from "./AdminSaveBar_nygP9H7_.mjs";
import { t as AdminTabs } from "./AdminTabs_QwW0LmOp.mjs";
//#region src/components/admin/AdminHome.svelte
function AdminHome($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const { apiBase } = $$props;
		let content = {};
		let nav = [];
		let status = "LOADING…";
		function set(key) {
			return (value) => {
				content = {
					...content,
					[key]: value
				};
			};
		}
		function setNav(index, key) {
			return (value) => {
				nav = nav.map((r, i) => i === index ? {
					...r,
					[key]: value
				} : r);
			};
		}
		async function save() {
			status = "SAVING…";
			const res = await adminApi(apiBase, "/api/admin/home", {
				method: "PUT",
				body: {
					content,
					navigation: nav
				}
			});
			status = res.error ? `ERROR // ${res.error}` : "SAVED";
		}
		function heroTab($$renderer) {
			AdminSection($$renderer, {
				eyebrow: "HERO TEXT",
				children: ($$renderer) => {
					$$renderer.push(`<div class="admin-grid-2">`);
					AdminField($$renderer, {
						label: "ARCHIVE LABEL",
						value: String(content.archive_label ?? ""),
						onChange: set("archive_label")
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "ARCHIVE NUMBER",
						value: String(content.archive_number ?? ""),
						onChange: set("archive_number")
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "HEADLINE LINE ONE",
						value: String(content.headline_line_one ?? ""),
						onChange: set("headline_line_one")
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "HEADLINE LINE TWO",
						value: String(content.headline_line_two ?? ""),
						onChange: set("headline_line_two")
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "HEADLINE LINE THREE",
						value: String(content.headline_line_three ?? ""),
						onChange: set("headline_line_three")
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "HEADLINE ACCENT",
						value: String(content.headline_accent ?? ""),
						onChange: set("headline_accent")
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "HEADLINE META",
						value: String(content.headline_meta ?? ""),
						onChange: set("headline_meta")
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "CTA LABEL",
						value: String(content.cta_label ?? ""),
						onChange: set("cta_label")
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "CTA URL",
						value: String(content.cta_url ?? ""),
						onChange: set("cta_url")
					});
					$$renderer.push(`<!----></div> `);
					AdminField($$renderer, {
						label: "INTRO",
						textarea: true,
						value: String(content.intro ?? ""),
						onChange: set("intro")
					});
					$$renderer.push(`<!---->`);
				},
				$$slots: { default: true }
			});
		}
		function hudTab($$renderer) {
			AdminSection($$renderer, {
				eyebrow: "HUD // 04 → 05 HERE",
				children: ($$renderer) => {
					$$renderer.push(`<div class="admin-grid-2">`);
					AdminField($$renderer, {
						label: "YEARS BUILDING",
						type: "number",
						value: String(content.years_building ?? 4),
						onChange: set("years_building")
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "HUD LABEL",
						value: String(content.hud_label ?? ""),
						onChange: set("hud_label")
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "HUD SUBTITLE",
						value: String(content.hud_subtitle ?? ""),
						onChange: set("hud_subtitle")
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "NOISE TOP",
						value: String(content.hud_noise_top ?? ""),
						onChange: set("hud_noise_top")
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "NOISE BOTTOM",
						value: String(content.hud_noise_bottom ?? ""),
						onChange: set("hud_noise_bottom")
					});
					$$renderer.push(`<!----></div>`);
				},
				$$slots: { default: true }
			});
		}
		function navTab($$renderer) {
			AdminSection($$renderer, {
				eyebrow: `ARCHIVE NAV // ${nav.length} ITEMS`,
				children: ($$renderer) => {
					$$renderer.push(`<!--[-->`);
					const each_array = ensure_array_like(nav);
					for (let index = 0, $$length = each_array.length; index < $$length; index++) {
						let row = each_array[index];
						$$renderer.push(`<div class="admin-card-stack"><div class="admin-grid-2">`);
						AdminField($$renderer, {
							label: "KEY",
							value: row.page_key,
							onChange: setNav(index, "page_key")
						});
						$$renderer.push(`<!----> `);
						AdminField($$renderer, {
							label: "LABEL",
							value: row.label,
							onChange: setNav(index, "label")
						});
						$$renderer.push(`<!----> `);
						AdminField($$renderer, {
							label: "NUMBER",
							value: row.display_number,
							onChange: setNav(index, "display_number")
						});
						$$renderer.push(`<!----> `);
						AdminField($$renderer, {
							label: "HREF",
							value: row.href,
							onChange: setNav(index, "href")
						});
						$$renderer.push(`<!----></div> `);
						AdminField($$renderer, {
							label: "DESCRIPTION",
							value: row.description,
							onChange: setNav(index, "description")
						});
						$$renderer.push(`<!----></div>`);
					}
					$$renderer.push(`<!--]-->`);
				},
				$$slots: { default: true }
			});
		}
		$$renderer.push(`<section class="admin-section">`);
		AdminTabs($$renderer, { tabs: [
			{
				id: "hero",
				label: "HERO",
				content: heroTab
			},
			{
				id: "hud",
				label: "HUD",
				content: hudTab
			},
			{
				id: "nav",
				label: "NAV",
				count: nav.length,
				content: navTab
			}
		] });
		$$renderer.push(`<!----> `);
		AdminSaveBar($$renderer, {
			status,
			onSave: save
		});
		$$renderer.push(`<!----></section>`);
	});
}
//#endregion
//#region src/pages/admin/home.astro
var home_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Home,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
var $$Home = createComponent(($$result, $$props, $$slots) => {
	const apiBase = "http://localhost:4100".replace(/\/$/, "");
	return renderTemplate`${renderComponent($$result, "Admin", $$Admin, {
		"title": "CONTROL — HOME",
		"currentPath": "/admin/home"
	}, { "default": ($$result2) => renderTemplate`${renderComponent($$result2, "AdminHome", AdminHome, {
		"client:load": true,
		"apiBase": apiBase,
		"client:component-hydration": "load",
		"client:component-path": "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/components/admin/AdminHome.svelte",
		"client:component-export": "default"
	})}` })}`;
}, "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/admin/home.astro", void 0);
var $$file = "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/admin/home.astro";
var $$url = "/admin/home";
//#endregion
//#region \0virtual:astro:page:src/pages/admin/home@_@astro
var page = () => home_exports;
//#endregion
export { page };
