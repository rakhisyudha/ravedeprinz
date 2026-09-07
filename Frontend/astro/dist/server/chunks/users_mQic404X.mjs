import { t as __exportAll } from "./rolldown-runtime_BBjsoOtd.mjs";
import { A as renderTemplate, w as renderComponent } from "./sequence_DWzfefGn.mjs";
import { a as attr, o as escape_html, r as ensure_array_like } from "./dev_CV5-D1wl.mjs";
import "./index-server_BHvVSAON.mjs";
import { t as createComponent } from "./compiler_D1liazrR.mjs";
import { n as $$Admin } from "./admin_COOrxuH0.mjs";
import { t as AdminTabs } from "./AdminTabs_QwW0LmOp.mjs";
//#region src/components/admin/AdminUsers.svelte
function AdminUsers($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const { apiBase } = $$props;
		let users = [];
		let email = "";
		let password = "";
		let role = "editor";
		let busy = false;
		function registerTab($$renderer) {
			$$renderer.push(`<div class="admin-editor" style="margin-top: 0"><p class="eyebrow">REGISTER A NEW ADMIN</p> <p>Add an email + password. Once stored, that email can sign in. Emails not in this list are always rejected.</p> <form class="admin-form"><label for="admin-new-email">EMAIL</label> <input id="admin-new-email" type="email"${attr("value", email)} required=""/> <label for="admin-new-password">PASSWORD</label> <input id="admin-new-password" type="password"${attr("value", password)} required=""${attr("minlength", 8)}/> <label for="admin-new-role">ROLE</label> `);
			$$renderer.select({
				id: "admin-new-role",
				value: role
			}, ($$renderer) => {
				$$renderer.option({ value: "owner" }, ($$renderer) => {
					$$renderer.push(`owner`);
				});
				$$renderer.option({ value: "editor" }, ($$renderer) => {
					$$renderer.push(`editor`);
				});
			});
			$$renderer.push(` <button type="submit" class="auth-button touch-target"${attr("disabled", busy, true)}>${escape_html("REGISTER ↗")}</button></form> `);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div>`);
		}
		function allowlistTab($$renderer) {
			$$renderer.push(`<div class="admin-editor" style="margin-top: 0"><p class="eyebrow">ALLOWLIST // ${escape_html(users.length)} USERS</p> <div class="admin-accordion"><!--[-->`);
			const each_array = ensure_array_like(users);
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let user = each_array[$$index];
				$$renderer.push(`<div class="admin-accordion-item"><div class="admin-accordion-head" style="cursor: default"><span><b>${escape_html(user.email)}</b> <small>${escape_html(user.role)} · ${escape_html(user.active ? "ACTIVE" : "DISABLED")}</small></span> <span class="admin-row-actions"><button class="admin-nav-link touch-target">${escape_html(user.active ? "DISABLE" : "ENABLE")}</button> <button class="admin-nav-link touch-target">REMOVE</button></span></div></div>`);
			}
			$$renderer.push(`<!--]--></div></div>`);
		}
		$$renderer.push(`<section class="admin-section">`);
		AdminTabs($$renderer, { tabs: [{
			id: "register",
			label: "REGISTER",
			content: registerTab
		}, {
			id: "allowlist",
			label: "ALLOWLIST",
			count: users.length,
			content: allowlistTab
		}] });
		$$renderer.push(`<!----></section>`);
	});
}
//#endregion
//#region src/pages/admin/users.astro
var users_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Users,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
var $$Users = createComponent(($$result, $$props, $$slots) => {
	const apiBase = "http://localhost:4100".replace(/\/$/, "");
	return renderTemplate`${renderComponent($$result, "Admin", $$Admin, {
		"title": "CONTROL — USERS",
		"currentPath": "/admin/users"
	}, { "default": ($$result2) => renderTemplate`${renderComponent($$result2, "AdminUsers", AdminUsers, {
		"client:load": true,
		"apiBase": apiBase,
		"client:component-hydration": "load",
		"client:component-path": "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/components/admin/AdminUsers.svelte",
		"client:component-export": "default"
	})}` })}`;
}, "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/admin/users.astro", void 0);
var $$file = "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/admin/users.astro";
var $$url = "/admin/users";
//#endregion
//#region \0virtual:astro:page:src/pages/admin/users@_@astro
var page = () => users_exports;
//#endregion
export { page };
