import { t as __exportAll } from "./rolldown-runtime_BBjsoOtd.mjs";
import { A as renderTemplate, w as renderComponent } from "./sequence_DWzfefGn.mjs";
import { r as ensure_array_like } from "./dev_CV5-D1wl.mjs";
import "./index-server_BHvVSAON.mjs";
import { t as createComponent } from "./compiler_D1liazrR.mjs";
import { n as $$Admin, t as adminApi } from "./admin_COOrxuH0.mjs";
import { n as AdminField, t as AdminSection } from "./AdminSection_B3VX3zwP.mjs";
import { t as AdminSaveBar } from "./AdminSaveBar_nygP9H7_.mjs";
import { t as AdminTabs } from "./AdminTabs_QwW0LmOp.mjs";
import { t as AdminAccordion } from "./AdminAccordion_B1rLDaqs.mjs";
//#region src/components/admin/AdminWork.svelte
function AdminWork($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const { apiBase } = $$props;
		let work = [];
		let education = [];
		let status = "LOADING…";
		async function load() {
			const res = await adminApi(apiBase, "/api/admin/work");
			if (res.data) {
				work = res.data.work ?? [];
				education = res.data.education ?? [];
				status = "LOADED";
			} else status = res.error ?? "ERROR";
		}
		async function save() {
			status = "SAVING…";
			const res = await adminApi(apiBase, "/api/admin/work", {
				method: "PUT",
				body: {
					work,
					education
				}
			});
			status = res.error ? `ERROR // ${res.error}` : "SAVED";
			if (!res.error) await load();
		}
		function updateWork(index, key) {
			return (value) => {
				work = work.map((r, i) => i === index ? {
					...r,
					[key]: value
				} : r);
			};
		}
		function updateEdu(index, key) {
			return (value) => {
				education = education.map((r, i) => i === index ? {
					...r,
					[key]: value
				} : r);
			};
		}
		function workTab($$renderer) {
			AdminSection($$renderer, {
				eyebrow: `WORK // ${work.length} ROLES`,
				children: ($$renderer) => {
					$$renderer.push(`<button class="admin-nav-link touch-target">+ ADD ROLE</button> <div class="admin-accordion" style="margin-top: 16px"><!--[-->`);
					const each_array = ensure_array_like(work);
					for (let index = 0, $$length = each_array.length; index < $$length; index++) {
						let row = each_array[index];
						AdminAccordion($$renderer, {
							title: row.role || "NEW ROLE",
							subtitle: row.company || "NO COMPANY",
							defaultOpen: index === work.length - 1,
							children: ($$renderer) => {
								$$renderer.push(`<div class="admin-grid-2">`);
								AdminField($$renderer, {
									label: "ROLE",
									value: row.role ?? "",
									onChange: updateWork(index, "role")
								});
								$$renderer.push(`<!----> `);
								AdminField($$renderer, {
									label: "COMPANY",
									value: row.company ?? "",
									onChange: updateWork(index, "company")
								});
								$$renderer.push(`<!----> `);
								AdminField($$renderer, {
									label: "LOCATION",
									value: row.location ?? "",
									onChange: updateWork(index, "location")
								});
								$$renderer.push(`<!----> `);
								AdminField($$renderer, {
									label: "DATE",
									value: row.date_label ?? "",
									onChange: updateWork(index, "date_label")
								});
								$$renderer.push(`<!----> `);
								AdminField($$renderer, {
									label: "STACK",
									value: row.stack ?? "",
									onChange: updateWork(index, "stack")
								});
								$$renderer.push(`<!----> `);
								AdminField($$renderer, {
									label: "COMPANY URL",
									value: row.company_url ?? "",
									onChange: updateWork(index, "company_url")
								});
								$$renderer.push(`<!----></div> `);
								AdminField($$renderer, {
									label: "DESCRIPTION",
									textarea: true,
									value: row.description ?? "",
									onChange: updateWork(index, "description")
								});
								$$renderer.push(`<!----> <button class="admin-nav-link touch-target">REMOVE</button>`);
							},
							$$slots: { default: true }
						});
					}
					$$renderer.push(`<!--]--></div>`);
				},
				$$slots: { default: true }
			});
		}
		function eduTab($$renderer) {
			AdminSection($$renderer, {
				eyebrow: `EDUCATION // ${education.length} ITEMS`,
				children: ($$renderer) => {
					$$renderer.push(`<button class="admin-nav-link touch-target">+ ADD EDUCATION</button> <div class="admin-accordion" style="margin-top: 16px"><!--[-->`);
					const each_array_1 = ensure_array_like(education);
					for (let index = 0, $$length = each_array_1.length; index < $$length; index++) {
						let row = each_array_1[index];
						AdminAccordion($$renderer, {
							title: row.title || "NEW EDUCATION",
							subtitle: row.institution || "NO INSTITUTION",
							defaultOpen: index === education.length - 1,
							children: ($$renderer) => {
								$$renderer.push(`<div class="admin-grid-2">`);
								AdminField($$renderer, {
									label: "TITLE",
									value: row.title ?? "",
									onChange: updateEdu(index, "title")
								});
								$$renderer.push(`<!----> `);
								AdminField($$renderer, {
									label: "INSTITUTION",
									value: row.institution ?? "",
									onChange: updateEdu(index, "institution")
								});
								$$renderer.push(`<!----> `);
								AdminField($$renderer, {
									label: "DATE",
									value: row.date_label ?? "",
									onChange: updateEdu(index, "date_label")
								});
								$$renderer.push(`<!----></div> `);
								AdminField($$renderer, {
									label: "DESCRIPTION",
									textarea: true,
									value: row.description ?? "",
									onChange: updateEdu(index, "description")
								});
								$$renderer.push(`<!----> <button class="admin-nav-link touch-target">REMOVE</button>`);
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
			id: "work",
			label: "WORK",
			count: work.length,
			content: workTab
		}, {
			id: "edu",
			label: "EDUCATION",
			count: education.length,
			content: eduTab
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
//#region src/pages/admin/work.astro
var work_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Work,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
var $$Work = createComponent(($$result, $$props, $$slots) => {
	const apiBase = "http://localhost:4100".replace(/\/$/, "");
	return renderTemplate`${renderComponent($$result, "Admin", $$Admin, {
		"title": "CONTROL — WORK",
		"currentPath": "/admin/work"
	}, { "default": ($$result2) => renderTemplate`${renderComponent($$result2, "AdminWork", AdminWork, {
		"client:load": true,
		"apiBase": apiBase,
		"client:component-hydration": "load",
		"client:component-path": "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/components/admin/AdminWork.svelte",
		"client:component-export": "default"
	})}` })}`;
}, "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/admin/work.astro", void 0);
var $$file = "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/admin/work.astro";
var $$url = "/admin/work";
//#endregion
//#region \0virtual:astro:page:src/pages/admin/work@_@astro
var page = () => work_exports;
//#endregion
export { page };
