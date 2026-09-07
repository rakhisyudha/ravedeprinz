import { t as __exportAll } from "./rolldown-runtime_BBjsoOtd.mjs";
import { A as renderTemplate, w as renderComponent } from "./sequence_DWzfefGn.mjs";
import { n as derived, r as ensure_array_like } from "./dev_CV5-D1wl.mjs";
import "./index-server_BHvVSAON.mjs";
import { t as createComponent } from "./compiler_D1liazrR.mjs";
import { n as $$Admin, t as adminApi } from "./admin_COOrxuH0.mjs";
import { n as AdminField, t as AdminSection } from "./AdminSection_B3VX3zwP.mjs";
import { t as AdminSaveBar } from "./AdminSaveBar_nygP9H7_.mjs";
import { t as AdminTabs } from "./AdminTabs_QwW0LmOp.mjs";
import { t as AdminAccordion } from "./AdminAccordion_B1rLDaqs.mjs";
import { t as AdminImageUpload } from "./AdminImageUpload_Bbdzywc9.mjs";
//#region src/components/admin/AdminAbout.svelte
function AdminAbout($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const { apiBase } = $$props;
		let content = {};
		let skills = [];
		let status = "LOADING…";
		function set(key) {
			return (value) => {
				content = {
					...content,
					[key]: value
				};
			};
		}
		async function save() {
			status = "SAVING…";
			const res = await adminApi(apiBase, "/api/admin/about", {
				method: "PUT",
				body: {
					content,
					skills
				}
			});
			status = res.error ? `ERROR // ${res.error}` : "SAVED";
		}
		const groups = derived(() => {
			const acc = {};
			for (const s of skills) acc[s.category] = (acc[s.category] ?? 0) + 1;
			return acc;
		});
		function copyTab($$renderer) {
			AdminSection($$renderer, {
				eyebrow: "ABOUT COPY",
				children: ($$renderer) => {
					$$renderer.push(`<div class="admin-grid-2">`);
					AdminField($$renderer, {
						label: "EYEBROW",
						value: String(content.eyebrow ?? ""),
						onChange: set("eyebrow")
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "QUOTE",
						value: String(content.quote ?? ""),
						onChange: set("quote")
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "QUOTE ACCENT",
						value: String(content.quote_accent ?? ""),
						onChange: set("quote_accent")
					});
					$$renderer.push(`<!----></div> `);
					AdminImageUpload($$renderer, {
						label: "PORTRAIT",
						value: String(content.portrait_url ?? ""),
						onChange: set("portrait_url"),
						apiBase
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "PARAGRAPH ONE",
						textarea: true,
						value: String(content.paragraph_one ?? ""),
						onChange: set("paragraph_one")
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "PARAGRAPH TWO",
						textarea: true,
						value: String(content.paragraph_two ?? ""),
						onChange: set("paragraph_two")
					});
					$$renderer.push(`<!---->`);
				},
				$$slots: { default: true }
			});
		}
		function skillsTab($$renderer) {
			AdminSection($$renderer, {
				eyebrow: `SKILLS // ${skills.length} ITEMS — ${Object.keys(groups()).length} GROUPS`,
				children: ($$renderer) => {
					$$renderer.push(`<button class="admin-nav-link touch-target">+ ADD SKILL</button> <div class="admin-accordion" style="margin-top: 16px"><!--[-->`);
					const each_array = ensure_array_like(skills);
					for (let index = 0, $$length = each_array.length; index < $$length; index++) {
						let skill = each_array[index];
						AdminAccordion($$renderer, {
							title: skill.skill_name || "NEW SKILL",
							subtitle: skill.category || "NO CATEGORY",
							defaultOpen: index === skills.length - 1,
							children: ($$renderer) => {
								$$renderer.push(`<div class="admin-grid-2">`);
								AdminField($$renderer, {
									label: "CATEGORY",
									value: skill.category,
									onChange: (v) => skills = skills.map((x, i) => i === index ? {
										...x,
										category: v
									} : x)
								});
								$$renderer.push(`<!----> `);
								AdminField($$renderer, {
									label: "SKILL",
									value: skill.skill_name,
									onChange: (v) => skills = skills.map((x, i) => i === index ? {
										...x,
										skill_name: v
									} : x)
								});
								$$renderer.push(`<!----></div> <button class="admin-nav-link touch-target">REMOVE</button>`);
							},
							$$slots: { default: true }
						});
					}
					$$renderer.push(`<!--]--></div>`);
				},
				$$slots: { default: true }
			});
		}
		$$renderer.push(`<section class="admin-section">`);
		AdminTabs($$renderer, { tabs: [{
			id: "copy",
			label: "COPY",
			content: copyTab
		}, {
			id: "skills",
			label: "SKILLS",
			count: skills.length,
			content: skillsTab
		}] });
		$$renderer.push(`<!----> `);
		AdminSaveBar($$renderer, {
			status,
			onSave: save
		});
		$$renderer.push(`<!----></section>`);
	});
}
//#endregion
//#region src/pages/admin/about.astro
var about_exports = /* @__PURE__ */ __exportAll({
	default: () => $$About,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
var $$About = createComponent(($$result, $$props, $$slots) => {
	const apiBase = "http://localhost:4100".replace(/\/$/, "");
	return renderTemplate`${renderComponent($$result, "Admin", $$Admin, {
		"title": "CONTROL — ABOUT",
		"currentPath": "/admin/about"
	}, { "default": ($$result2) => renderTemplate`${renderComponent($$result2, "AdminAbout", AdminAbout, {
		"client:load": true,
		"apiBase": apiBase,
		"client:component-hydration": "load",
		"client:component-path": "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/components/admin/AdminAbout.svelte",
		"client:component-export": "default"
	})}` })}`;
}, "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/admin/about.astro", void 0);
var $$file = "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/admin/about.astro";
var $$url = "/admin/about";
//#endregion
//#region \0virtual:astro:page:src/pages/admin/about@_@astro
var page = () => about_exports;
//#endregion
export { page };
