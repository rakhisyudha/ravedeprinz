import { t as __exportAll } from "./rolldown-runtime_BBjsoOtd.mjs";
import { A as renderTemplate, w as renderComponent } from "./sequence_DWzfefGn.mjs";
import { o as escape_html, r as ensure_array_like } from "./dev_CV5-D1wl.mjs";
import "./index-server_BHvVSAON.mjs";
import { t as createComponent } from "./compiler_D1liazrR.mjs";
import { n as $$Admin } from "./admin_COOrxuH0.mjs";
import { n as AdminField, t as AdminSection } from "./AdminSection_B3VX3zwP.mjs";
import { t as AdminTabs } from "./AdminTabs_QwW0LmOp.mjs";
import { t as AdminAccordion } from "./AdminAccordion_B1rLDaqs.mjs";
import { t as AdminImageUpload } from "./AdminImageUpload_Bbdzywc9.mjs";
//#region src/components/admin/AdminProjects.svelte
function AdminProjects($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const { apiBase } = $$props;
		let projects = [];
		let status = "LOADING…";
		let draft = {};
		function slugify(input) {
			return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
		}
		function update(index, key) {
			return (value) => {
				projects = projects.map((r, i) => i === index ? {
					...r,
					[key]: value
				} : r);
			};
		}
		function newTab($$renderer) {
			AdminSection($$renderer, {
				eyebrow: "NEW PROJECT",
				children: ($$renderer) => {
					$$renderer.push(`<div class="admin-grid-2">`);
					AdminField($$renderer, {
						label: "TITLE",
						value: String(draft.title ?? ""),
						onChange: (v) => draft = {
							...draft,
							title: v,
							slug: slugify(v)
						}
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "YEAR",
						type: "number",
						value: String(draft.year ?? ""),
						onChange: (v) => draft = {
							...draft,
							year: v
						}
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "STATUS",
						value: String(draft.status ?? "FINISHED"),
						onChange: (v) => draft = {
							...draft,
							status: v
						}
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "DEPLOYMENT",
						value: String(draft.deployment_status ?? "DEPLOYED"),
						onChange: (v) => draft = {
							...draft,
							deployment_status: v
						}
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "STACK",
						value: String(draft.stack ?? ""),
						onChange: (v) => draft = {
							...draft,
							stack: v
						}
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "LIVE URL",
						value: String(draft.live_url ?? ""),
						onChange: (v) => draft = {
							...draft,
							live_url: v
						}
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "SOURCE URL",
						value: String(draft.source_url ?? ""),
						onChange: (v) => draft = {
							...draft,
							source_url: v
						}
					});
					$$renderer.push(`<!----></div> `);
					AdminImageUpload($$renderer, {
						label: "IMAGE",
						value: String(draft.image_url ?? ""),
						onChange: (v) => draft = {
							...draft,
							image_url: v
						},
						apiBase
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "DESCRIPTION",
						textarea: true,
						value: String(draft.description ?? ""),
						onChange: (v) => draft = {
							...draft,
							description: v
						}
					});
					$$renderer.push(`<!----> <button class="auth-button touch-target">CREATE PROJECT</button>`);
				},
				$$slots: { default: true }
			});
		}
		function existingTab($$renderer) {
			AdminSection($$renderer, {
				eyebrow: `EXISTING // ${projects.length} PROJECTS`,
				children: ($$renderer) => {
					$$renderer.push(`<div class="admin-accordion"><!--[-->`);
					const each_array = ensure_array_like(projects);
					for (let index = 0, $$length = each_array.length; index < $$length; index++) {
						let project = each_array[index];
						AdminAccordion($$renderer, {
							title: String(project.title ?? "UNTITLED"),
							subtitle: `${project.year ?? ""} · ${project.status ?? ""}`,
							children: ($$renderer) => {
								$$renderer.push(`<div class="admin-grid-2">`);
								AdminField($$renderer, {
									label: "TITLE",
									value: String(project.title ?? ""),
									onChange: update(index, "title")
								});
								$$renderer.push(`<!----> `);
								AdminField($$renderer, {
									label: "YEAR",
									type: "number",
									value: String(project.year ?? ""),
									onChange: update(index, "year")
								});
								$$renderer.push(`<!----> `);
								AdminField($$renderer, {
									label: "STATUS",
									value: String(project.status ?? ""),
									onChange: update(index, "status")
								});
								$$renderer.push(`<!----> `);
								AdminField($$renderer, {
									label: "DEPLOYMENT",
									value: String(project.deployment_status ?? ""),
									onChange: update(index, "deployment_status")
								});
								$$renderer.push(`<!----> `);
								AdminField($$renderer, {
									label: "STACK",
									value: String(project.stack ?? ""),
									onChange: update(index, "stack")
								});
								$$renderer.push(`<!----> `);
								AdminField($$renderer, {
									label: "LIVE URL",
									value: String(project.live_url ?? ""),
									onChange: update(index, "live_url")
								});
								$$renderer.push(`<!----> `);
								AdminField($$renderer, {
									label: "SOURCE URL",
									value: String(project.source_url ?? ""),
									onChange: update(index, "source_url")
								});
								$$renderer.push(`<!----></div> `);
								AdminImageUpload($$renderer, {
									label: "IMAGE",
									value: String(project.image_url ?? ""),
									onChange: update(index, "image_url"),
									apiBase
								});
								$$renderer.push(`<!----> `);
								AdminField($$renderer, {
									label: "DESCRIPTION",
									textarea: true,
									value: String(project.description ?? ""),
									onChange: update(index, "description")
								});
								$$renderer.push(`<!----> <div class="admin-row-actions"><button class="admin-nav-link touch-target">SAVE</button> <button class="admin-nav-link touch-target">DELETE</button></div>`);
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
			id: "new",
			label: "NEW",
			content: newTab
		}, {
			id: "existing",
			label: "EXISTING",
			count: projects.length,
			content: existingTab
		}] });
		$$renderer.push(`<!----> <p class="auth-error" style="margin-top: 18px">${escape_html(status)}</p></section>`);
	});
}
//#endregion
//#region src/pages/admin/projects.astro
var projects_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Projects,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
var $$Projects = createComponent(($$result, $$props, $$slots) => {
	const apiBase = "http://localhost:4100".replace(/\/$/, "");
	return renderTemplate`${renderComponent($$result, "Admin", $$Admin, {
		"title": "CONTROL — PROJECTS",
		"currentPath": "/admin/projects"
	}, { "default": ($$result2) => renderTemplate`${renderComponent($$result2, "AdminProjects", AdminProjects, {
		"client:load": true,
		"apiBase": apiBase,
		"client:component-hydration": "load",
		"client:component-path": "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/components/admin/AdminProjects.svelte",
		"client:component-export": "default"
	})}` })}`;
}, "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/admin/projects.astro", void 0);
var $$file = "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/admin/projects.astro";
var $$url = "/admin/projects";
//#endregion
//#region \0virtual:astro:page:src/pages/admin/projects@_@astro
var page = () => projects_exports;
//#endregion
export { page };
