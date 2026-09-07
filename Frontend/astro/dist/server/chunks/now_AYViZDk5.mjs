import { t as __exportAll } from "./rolldown-runtime_BBjsoOtd.mjs";
import { A as renderTemplate, w as renderComponent } from "./sequence_DWzfefGn.mjs";
import { o as escape_html, r as ensure_array_like } from "./dev_CV5-D1wl.mjs";
import "./index-server_BHvVSAON.mjs";
import { t as createComponent } from "./compiler_D1liazrR.mjs";
import { n as $$Admin, t as adminApi } from "./admin_COOrxuH0.mjs";
import { n as AdminField, t as AdminSection } from "./AdminSection_B3VX3zwP.mjs";
import { t as AdminSaveBar } from "./AdminSaveBar_nygP9H7_.mjs";
import { t as AdminTabs } from "./AdminTabs_QwW0LmOp.mjs";
//#region src/components/admin/AdminNow.svelte
function AdminNow($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const { apiBase } = $$props;
		let current = {};
		let attention = [];
		let history = [];
		let historyDate = "";
		let historyText = "";
		let status = "LOADING…";
		function set(key) {
			return (value) => {
				current = {
					...current,
					[key]: value
				};
			};
		}
		async function save() {
			status = "SAVING…";
			const res = await adminApi(apiBase, "/api/admin/now/current", {
				method: "PUT",
				body: {
					current,
					attention,
					historyItem: historyText.trim() ? {
						date_label: historyDate || "NOW",
						text: historyText
					} : void 0
				}
			});
			status = res.error ? `ERROR // ${res.error}` : "SAVED · HISTORY APPENDED";
			if (res.error) return;
			historyText = "";
			historyDate = "";
			const reload = await adminApi(apiBase, "/api/admin/now/history");
			if (reload.data) history = reload.data.history;
		}
		function currentTab($$renderer) {
			AdminSection($$renderer, {
				eyebrow: "CURRENTLY",
				children: ($$renderer) => {
					$$renderer.push(`<div class="admin-grid-2">`);
					AdminField($$renderer, {
						label: "UPDATED LABEL",
						value: String(current.updated_label ?? ""),
						onChange: set("updated_label")
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "LABEL",
						value: String(current.label ?? ""),
						onChange: set("label")
					});
					$$renderer.push(`<!----> `);
					AdminField($$renderer, {
						label: "TITLE",
						value: String(current.title ?? ""),
						onChange: set("title")
					});
					$$renderer.push(`<!----></div> `);
					AdminField($$renderer, {
						label: "DESCRIPTION",
						textarea: true,
						value: String(current.description ?? ""),
						onChange: set("description")
					});
					$$renderer.push(`<!---->`);
				},
				$$slots: { default: true }
			});
		}
		function attentionTab($$renderer) {
			AdminSection($$renderer, {
				eyebrow: `ATTENTION // ${attention.length} ITEMS`,
				children: ($$renderer) => {
					$$renderer.push(`<!--[-->`);
					const each_array = ensure_array_like(attention);
					for (let index = 0, $$length = each_array.length; index < $$length; index++) {
						let item = each_array[index];
						$$renderer.push(`<div class="admin-card-stack"><div class="admin-grid-2">`);
						AdminField($$renderer, {
							label: "NUMBER",
							value: item.number,
							onChange: (v) => attention = attention.map((x, i) => i === index ? {
								...x,
								number: v
							} : x)
						});
						$$renderer.push(`<!----> `);
						AdminField($$renderer, {
							label: "LABEL",
							value: item.label,
							onChange: (v) => attention = attention.map((x, i) => i === index ? {
								...x,
								label: v
							} : x)
						});
						$$renderer.push(`<!----></div> `);
						AdminField($$renderer, {
							label: "TITLE",
							value: item.title,
							onChange: (v) => attention = attention.map((x, i) => i === index ? {
								...x,
								title: v
							} : x)
						});
						$$renderer.push(`<!----> `);
						AdminField($$renderer, {
							label: "NOTE",
							textarea: true,
							value: item.note,
							onChange: (v) => attention = attention.map((x, i) => i === index ? {
								...x,
								note: v
							} : x)
						});
						$$renderer.push(`<!----> <button class="admin-nav-link touch-target">REMOVE</button></div>`);
					}
					$$renderer.push(`<!--]--> <button class="admin-nav-link touch-target">+ ADD ATTENTION</button>`);
				},
				$$slots: { default: true }
			});
		}
		function historyTab($$renderer) {
			AdminSection($$renderer, {
				eyebrow: "APPEND HISTORY — KEPT FOREVER",
				children: ($$renderer) => {
					$$renderer.push(`<div class="admin-grid-2">`);
					AdminField($$renderer, {
						label: "DATE LABEL",
						value: historyDate,
						onChange: (v) => historyDate = v
					});
					$$renderer.push(`<!----></div> `);
					AdminField($$renderer, {
						label: "TEXT",
						textarea: true,
						value: historyText,
						onChange: (v) => historyText = v
					});
					$$renderer.push(`<!----> <p class="admin-hint">Saving the current Now content also appends this history entry. The public page shows only the three latest entries.</p>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			AdminSection($$renderer, {
				eyebrow: `PERMANENT HISTORY // ${history.length}`,
				children: ($$renderer) => {
					$$renderer.push(`<div class="admin-accordion"><!--[-->`);
					const each_array_1 = ensure_array_like(history);
					for (let index = 0, $$length = each_array_1.length; index < $$length; index++) {
						let item = each_array_1[index];
						$$renderer.push(`<div class="admin-accordion-item"><div class="admin-accordion-head" style="cursor: default"><span><b>${escape_html(item.date_label)}</b> <small>${escape_html(item.text.slice(0, 60))}</small></span> <small>${escape_html(item.created_at ? new Date(item.created_at).toLocaleDateString() : "")}</small></div></div>`);
					}
					$$renderer.push(`<!--]--></div>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!---->`);
		}
		$$renderer.push(`<section class="admin-section">`);
		AdminTabs($$renderer, { tabs: [
			{
				id: "current",
				label: "CURRENT",
				content: currentTab
			},
			{
				id: "attention",
				label: "ATTENTION",
				count: attention.length,
				content: attentionTab
			},
			{
				id: "history",
				label: "HISTORY",
				count: history.length,
				content: historyTab
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
//#region src/pages/admin/now.astro
var now_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Now,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
var $$Now = createComponent(($$result, $$props, $$slots) => {
	const apiBase = "http://localhost:4100".replace(/\/$/, "");
	return renderTemplate`${renderComponent($$result, "Admin", $$Admin, {
		"title": "CONTROL — NOW",
		"currentPath": "/admin/now"
	}, { "default": ($$result2) => renderTemplate`${renderComponent($$result2, "AdminNow", AdminNow, {
		"client:load": true,
		"apiBase": apiBase,
		"client:component-hydration": "load",
		"client:component-path": "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/components/admin/AdminNow.svelte",
		"client:component-export": "default"
	})}` })}`;
}, "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/admin/now.astro", void 0);
var $$file = "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/admin/now.astro";
var $$url = "/admin/now";
//#endregion
//#region \0virtual:astro:page:src/pages/admin/now@_@astro
var page = () => now_exports;
//#endregion
export { page };
