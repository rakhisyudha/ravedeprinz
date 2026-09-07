import { A as renderTemplate, B as createAstro, D as renderSlot, N as addAttribute, T as Fragment, j as maybeRenderHead, w as renderComponent } from "./sequence_DWzfefGn.mjs";
import { a as attr, o as escape_html } from "./dev_CV5-D1wl.mjs";
import "./index-server_BHvVSAON.mjs";
import { t as createComponent } from "./compiler_D1liazrR.mjs";
import { t as $$Base } from "./Base_Ch7LxtAO.mjs";
//#region src/components/admin/AdminNav.astro
createAstro("https://astro.build");
var $$AdminNav = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$AdminNav;
	const { currentPath = "/admin" } = Astro.props;
	return renderTemplate`${maybeRenderHead($$result)}<nav class="admin-nav" aria-label="CMS navigation">${[
		["/admin", "DASHBOARD"],
		["/admin/home", "HOME"],
		["/admin/about", "ABOUT"],
		["/admin/work", "WORK"],
		["/admin/projects", "PROJECTS"],
		["/admin/notes", "NOTES"],
		["/admin/now", "NOW"],
		["/admin/users", "USERS"]
	].map(([href, label]) => {
		const active = href === "/admin" ? currentPath === "/admin" : currentPath === href || currentPath.startsWith(href + "/");
		return renderTemplate`<a${addAttribute(href, "href")}${addAttribute(`admin-nav-link touch-target${active ? " is-active" : ""}`, "class")}>${label}</a>`;
	})}</nav>`;
}, "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/components/admin/AdminNav.astro", void 0);
//#endregion
//#region src/components/admin/AdminUserMenu.svelte
function AdminUserMenu($$renderer, $$props) {
	const { email, apiBase } = $$props;
	$$renderer.push(`<div class="admin-user-menu"><span class="admin-user admin-user--desktop">${escape_html(email)}</span> <button type="button" class="admin-signout admin-signout--desktop touch-target">SIGN OUT</button> <div class="admin-user-mobile"><button type="button" class="admin-user-icon touch-target" aria-label="User menu"${attr("aria-expanded", false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></button> `);
	$$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--></div></div>`);
}
//#endregion
//#region src/components/admin/AdminWelcome.svelte
function AdminWelcome($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/layouts/Admin.astro
createAstro("https://astro.build");
var $$Admin = createComponent(($$result, $$props, $$slots) => {
	const Astro2 = $$result.createAstro($$props, $$slots);
	Astro2.self = $$Admin;
	const { title = "CONTROL", currentPath = "/admin" } = Astro2.props;
	const apiBase = "http://localhost:4100".replace(/\/$/, "");
	const gate = Astro2.locals.adminGate ?? {
		reachable: false,
		user: null
	};
	const reachable = gate.reachable;
	const user = gate.user;
	return renderTemplate`${renderComponent($$result, "Base", $$Base, {
		"title": title,
		"currentPath": currentPath,
		"chrome": false
	}, { "default": ($$result2) => renderTemplate`${maybeRenderHead($$result2)}<main class="admin-page"><div class="admin-shell">${!reachable ? renderTemplate`<div class="auth-denied cut" role="alert"><span class="auth-denied-stamp">503</span><div class="auth-denied-body"><p class="auth-denied-kicker">// ARCHIVE OFFLINE</p><p class="auth-denied-title display">NOTHING TO SEE RIGHT NOW.</p><p class="auth-denied-hint">The archive isn’t responding. Give it a moment and try again.</p></div><a href="/" class="auth-denied-close touch-target">[ HOME ]</a></div>` : !user || !user.is_admin ? renderTemplate`<div class="auth-denied cut" role="alert"><span class="auth-denied-stamp">403</span><div class="auth-denied-body"><p class="auth-denied-kicker">// ACCESS DENIED</p><p class="auth-denied-title display">YOU’RE NOT ON THE LIST.</p><p class="auth-denied-hint">This archive is private. Your account isn’t cleared for entry.</p></div><a href="/" class="auth-denied-close touch-target">[ HOME ]</a></div>` : renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": ($$result3) => renderTemplate`<header class="admin-header"><div class="admin-header-top"><div><p class="eyebrow">// CONTENT CONTROL</p><h1 class="display">CMS</h1></div>${renderComponent($$result3, "AdminUserMenu", AdminUserMenu, {
		"client:load": true,
		"email": user.email,
		"apiBase": apiBase,
		"client:component-hydration": "load",
		"client:component-path": "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/components/admin/AdminUserMenu.svelte",
		"client:component-export": "default"
	})}</div>${renderComponent($$result3, "AdminWelcome", AdminWelcome, {
		"client:load": true,
		"client:component-hydration": "load",
		"client:component-path": "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/components/admin/AdminWelcome.svelte",
		"client:component-export": "default"
	})}</header>${renderComponent($$result3, "AdminNav", $$AdminNav, { "currentPath": currentPath })}${renderSlot($$result3, $$slots["default"])}` })}`}</div></main>` })}`;
}, "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/layouts/Admin.astro", void 0);
//#endregion
//#region src/lib/admin.ts
async function adminApi(apiBase, path, options = {}) {
	try {
		const res = await fetch(`${apiBase}${path}`, {
			method: options.method ?? "GET",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: options.body !== void 0 ? JSON.stringify(options.body) : void 0
		});
		const parsed = await res.json().catch(() => ({}));
		if (!res.ok) return { error: typeof parsed.error === "string" ? parsed.error : `Request failed (${res.status})` };
		return { data: parsed };
	} catch {
		return { error: "Could not reach the CMS API" };
	}
}
//#endregion
export { $$Admin as n, adminApi as t };
