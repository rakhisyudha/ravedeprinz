import { A as renderTemplate, B as createAstro, D as renderSlot, M as renderHead, N as addAttribute, P as createRenderInstruction, w as renderComponent } from "./sequence_DWzfefGn.mjs";
import { a as attr, o as escape_html, t as attr_class } from "./dev_CV5-D1wl.mjs";
import { t as createComponent } from "./compiler_D1liazrR.mjs";
//#region node_modules/astro/dist/runtime/server/render/script.js
async function renderScript(result, id) {
	const inlined = result.inlinedScripts.get(id);
	let content = "";
	if (inlined != null) {
		if (inlined) content = `<script type="module">${inlined}<\/script>`;
	} else {
		const resolved = await result.resolve(id);
		content = `<script type="module" src="${result.userAssetsBase ? (result.base === "/" ? "" : result.base) + result.userAssetsBase : ""}${resolved}"><\/script>`;
	}
	return createRenderInstruction({
		type: "script",
		id,
		content
	});
}
//#endregion
//#region node_modules/astro/components/ClientRouter.astro
createAstro("https://astro.build");
var $$ClientRouter = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$ClientRouter;
	const { fallback = "animate" } = Astro.props;
	return renderTemplate`<meta name="astro-view-transitions-enabled" content="true"><meta name="astro-view-transitions-fallback"${addAttribute(fallback, "content")}>${renderScript($$result, "D:/Projects/Personal/ravedeprinz/Frontend/astro/node_modules/astro/components/ClientRouter.astro?astro&type=script&index=0&lang.ts")}`;
}, "D:/Projects/Personal/ravedeprinz/Frontend/astro/node_modules/astro/components/ClientRouter.astro", void 0);
//#endregion
//#region src/components/Menu.svelte
function Menu($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const { currentPath = "/" } = $$props;
		const current = [
			{
				href: "/",
				label: "Home"
			},
			{
				href: "/about",
				label: "About"
			},
			{
				href: "/work",
				label: "Work"
			},
			{
				href: "/projects",
				label: "Projects"
			},
			{
				href: "/notes",
				label: "Notes"
			},
			{
				href: "/now",
				label: "Now"
			}
		].find((l) => l.href === currentPath)?.label ?? "Home";
		let open = false;
		current.toUpperCase();
		$$renderer.push(`<header${attr_class(`site-header`, "svelte-1qo109d")}><a href="/" class="site-mark" aria-label="ravedeprinz home"><strong>r</strong>avedeprinz_</a> <div class="header-state"><span>${escape_html(current)}</span></div> <button type="button"${attr_class(`menu-trigger`, "svelte-1qo109d")}${attr("aria-expanded", open)}><span${attr_class("bracket bracket-left svelte-1qo109d", void 0, { "open-bracket": open })}>[</span> <span class="menu-trigger-label"><!---->`);
		$$renderer.push(`<span class="menu-trigger-swap svelte-1qo109d">${escape_html("INDEX")}</span>`);
		$$renderer.push(`<!----></span> <span${attr_class("bracket bracket-right svelte-1qo109d", void 0, { "open-bracket": open })}>]</span></button></header> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/lib/api.ts
var BASE = "http://localhost:4100";
var TIMEOUT_MS = 8e3;
async function apiGet(path) {
	let res;
	try {
		res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
	} catch {
		return {
			status: "unavailable",
			message: "CMS unreachable"
		};
	}
	if (res.status === 404) return { status: "not-found" };
	if (!res.ok) return {
		status: "unavailable",
		message: `CMS responded ${res.status}`
	};
	try {
		return {
			status: "ok",
			data: await res.json()
		};
	} catch {
		return {
			status: "unavailable",
			message: "CMS returned an invalid response"
		};
	}
}
//#endregion
//#region src/lib/cms.ts
async function fetchSite() {
	const res = await apiGet("/api/content/site");
	return res.status === "ok" && res.data?.site_name ? res.data : null;
}
async function fetchHome() {
	const res = await apiGet("/api/content/home");
	return res.status === "ok" ? res.data : null;
}
async function fetchAbout() {
	const res = await apiGet("/api/content/about");
	return res.status === "ok" ? res.data : null;
}
async function fetchWork() {
	const res = await apiGet("/api/content/work");
	return res.status === "ok" ? res.data : null;
}
async function fetchProjects() {
	const res = await apiGet("/api/content/projects");
	return res.status === "ok" ? res.data : null;
}
async function fetchNotes() {
	const res = await apiGet("/api/content/notes");
	return res.status === "ok" ? res.data : null;
}
async function fetchNow() {
	const res = await apiGet("/api/content/now");
	return res.status === "ok" ? res.data : null;
}
//#endregion
//#region src/data/site.ts
var siteSettings = {
	site_name: "ravedeprinz",
	footer_name: "ravedepr1nz",
	footer_label: "PERSONAL ARCHIVE",
	hero_tagline: "I DON'T GUESS. I DEBUG."
};
var homeContent = {
	archive_label: "PERSONAL ARCHIVE",
	archive_number: "001",
	headline_line_one: "I DON'T",
	headline_line_two: "GUESS.",
	headline_line_three: "I DEBUG.",
	headline_accent: "GUESS.",
	headline_period: ".",
	headline_meta: "BACKEND / SYSTEMS / GO",
	intro: "I’m Rakhis de Yudha. I study computer science at Binus Online Learning and spend most of my building time around Go, PostgreSQL, React, Docker, and the questions underneath a product’s interface.",
	cta_label: "ENTER THE ARCHIVE",
	cta_url: "/projects",
	hud_label: "YEARS BUILDING",
	hud_subtitle: "BACKEND / SYSTEMS / GO",
	years_building: 4,
	hud_noise_top: "// SYSTEM_04",
	hud_noise_bottom: "BUILD / REPEAT / SHIP"
};
var navigation = [
	{
		page_key: "about",
		label: "About",
		description: "The person behind the systems.",
		display_number: "02",
		href: "/about"
	},
	{
		page_key: "work",
		label: "Work",
		description: "Roles, teams, and shipped software.",
		display_number: "03",
		href: "/work"
	},
	{
		page_key: "projects",
		label: "Projects",
		description: "Things built while learning.",
		display_number: "04",
		href: "/projects"
	},
	{
		page_key: "notes",
		label: "Notes",
		description: "Short thoughts from the workbench.",
		display_number: "05",
		href: "/notes"
	},
	{
		page_key: "now",
		label: "Now",
		description: "What currently has my attention.",
		display_number: "06",
		href: "/now"
	}
];
var aboutContent = {
	eyebrow: "IDENTITY / 002",
	quote: "I like work that is",
	quote_accent: "clear, useful,",
	paragraph_one: "I’m a computer science student from Bogor, Indonesia. My strongest area is backend development, but I enjoy following a problem all the way through to the interface people actually touch.",
	paragraph_two: "I’m interested in systems that feel calm under pressure, small tools that remove friction, and the difference between software that technically works and software someone can trust."
};
var nowContent = {
	current: {
		updated_label: "27 AUG 2026",
		label: "CURRENTLY BUILDING",
		title: "A CRM.",
		description: "I'm working on the backend side of a CRM at Radius Data Solusi. Most of my attention is currently going into Go, Gin, APIs, authentication, database structure, and keeping the system understandable as it grows."
	},
	attention: [
		{
			number: "01",
			label: "LEARNING",
			title: "gRPC",
			note: "Trying to understand the trade-offs instead of treating it as just 'REST, but faster.'"
		},
		{
			number: "02",
			label: "READING",
			title: "Designing Data-Intensive Applications",
			note: "Slowly. Usually with more tabs open than necessary."
		},
		{
			number: "03",
			label: "THINKING ABOUT",
			title: "How much complexity can a good name remove?",
			note: "Naming things is still harder than it should be."
		}
	],
	history: [
		{
			date_label: "27 AUG",
			text: "Working on the backend side of a CRM."
		},
		{
			date_label: "22 AUG",
			text: "Refactored an API surface that had outgrown its first assumptions."
		},
		{
			date_label: "18 AUG",
			text: "Started learning more seriously about gRPC."
		}
	]
};
function slugify(input) {
	return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
var projectImages = {
	"simple-portfolio": "/img/Projects/portfolio.png",
	"pakis-hills": "/img/Projects/pakis.png",
	"outbound-design": "/img/Projects/outbound.png",
	"web-auction": "/img/Projects/auction.png",
	"currency-converter": "/img/Projects/convert.png",
	"quiz-app": "/img/Projects/quiz-portrait.png",
	"online-wedding-invitation": "/img/Projects/wedding.png",
	"online-marketplace": "/img/Projects/market.png"
};
var portraitImage = "/img/Profile/ini.jpeg";
//#endregion
//#region src/layouts/Base.astro
createAstro("https://astro.build");
var $$Base = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Base;
	const { title = "Rakhis de Yudha // Personal archive", description = "A personal archive of work, projects, notes, and what is happening now.", currentPath = "/", chrome = true } = Astro.props;
	const liveSite = await fetchSite();
	const footerName = liveSite?.footer_name ?? siteSettings.footer_name;
	const footerLabel = liveSite?.footer_label ?? siteSettings.footer_label;
	return renderTemplate`<html lang="en" data-astro-cid-hkbrpulz><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>${title}</title><meta name="description"${addAttribute(description, "content")}>${renderComponent($$result, "ClientRouter", $$ClientRouter, { "data-astro-cid-hkbrpulz": true })}${renderHead($$result)}</head><body data-astro-cid-hkbrpulz>${chrome && renderTemplate`${renderComponent($$result, "Menu", Menu, {
		"client:load": true,
		"currentPath": currentPath,
		"data-astro-cid-hkbrpulz": true,
		"client:component-hydration": "load",
		"client:component-path": "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/components/Menu.svelte",
		"client:component-export": "default"
	})}`}${renderSlot($$result, $$slots["default"])}${chrome && renderTemplate`<footer class="site-footer" data-astro-cid-hkbrpulz><span data-astro-cid-hkbrpulz>${footerName}</span><span data-astro-cid-hkbrpulz>${footerLabel} <b data-astro-cid-hkbrpulz>◆</b></span></footer>`}</body></html>`;
}, "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/layouts/Base.astro", void 0);
//#endregion
export { nowContent as a, slugify as c, fetchNotes as d, fetchNow as f, navigation as i, fetchAbout as l, fetchWork as m, aboutContent as n, portraitImage as o, fetchProjects as p, homeContent as r, projectImages as s, $$Base as t, fetchHome as u };
