import { t as __exportAll } from "./rolldown-runtime_BBjsoOtd.mjs";
import { A as renderTemplate, N as addAttribute, j as maybeRenderHead, w as renderComponent } from "./sequence_DWzfefGn.mjs";
import { t as createComponent } from "./compiler_D1liazrR.mjs";
import { c as slugify, p as fetchProjects, s as projectImages, t as $$Base } from "./Base_Ch7LxtAO.mjs";
import { t as $$PageHead } from "./PageHead_ucoriEh5.mjs";
import { r as projects } from "./content_Cbxw4wkk.mjs";
//#region src/pages/projects.astro
var projects_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Projects,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
var $$Projects = createComponent(async ($$result, $$props, $$slots) => {
	const projects$1 = (await fetchProjects())?.projects ?? projects.map((p) => ({
		title: p.title,
		slug: slugify(p.title),
		description: p.desc,
		year: Number(p.year) || 0,
		status: p.type,
		deployment_status: p.title === "Web Auction" ? "NOT_DEPLOYED" : "DEPLOYED",
		stack: p.stack,
		live_url: p.link ?? null,
		source_url: p.github ?? null,
		image_url: null,
		featured: false
	}));
	const statusClass = {
		FINISHED: "status-shipped",
		"IN PROGRESS": "status-in-progress",
		SHELVED: "status"
	};
	const stickerKinds = [
		"solid",
		"outline",
		"text",
		"stamp"
	];
	return renderTemplate`${renderComponent($$result, "Base", $$Base, {
		"title": "PROJECTS",
		"currentPath": "/projects"
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "PageHead", $$PageHead, {
		"index": "BUILD LOG / 004",
		"title": "PROJECTS",
		"intro": "Things made while learning how to make better software. Finished, experimental, paused, and still worth remembering."
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<section class="record-list">${projects$1.map((project, index) => {
		const slug = project.slug?.trim() || slugify(project.title);
		const image = project.image_url || projectImages[slug];
		const deployed = project.title !== "Web Auction";
		const stickerKind = stickerKinds[index % stickerKinds.length];
		return renderTemplate`<article class="record project-record lift"><span class="record-number">0${index + 1}<small>${project.year}</small></span><div class="project-content"><div class="project-media"><div${addAttribute(`project-frame project-card-${index % 4}`, "class")}><div class="project-chrome" aria-hidden="true"><i></i><i></i><i></i></div>${image && renderTemplate`<div class="project-image"><img${addAttribute(image, "src")}${addAttribute(`${project.title} preview`, "alt")} loading="lazy"></div>`}</div><span${addAttribute(`project-sticker status sticker-${stickerKind} sticker-status-slot ${statusClass[project.type]}`, "class")}>${project.type}</span><span${addAttribute(`deploy-sticker deploy-${stickerKinds[(index + 1) % stickerKinds.length]} deploy-slot ${deployed ? "" : "deploy-sticker-pending"}`, "class")}>${deployed ? "DEPLOYED" : "NOT DEPLOYED"}</span><span${addAttribute(`project-index index-slot index-style-${index % 4}`, "class")}>0${index + 1} / ${project.year}</span></div><h2>${project.title}</h2><p>${project.desc}</p><p class="metadata">${project.stack}</p><div class="project-links">${project.link && renderTemplate`<a${addAttribute(project.link, "href")} target="_blank" rel="noreferrer">Live ↗</a>`}${project.github && renderTemplate`<a${addAttribute(project.github, "href")} target="_blank" rel="noreferrer">Source ↗</a>`}</div></div><aside><span>ARCHIVE NOTE</span><p>${project.type === "SHELVED" ? "Not finished. Still useful." : "A record of making, testing, and learning."}</p></aside></article>`;
	})}</section>` })}` })}`;
}, "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/projects.astro", void 0);
var $$file = "D:/Projects/Personal/ravedeprinz/Frontend/astro/src/pages/projects.astro";
var $$url = "/projects";
//#endregion
//#region \0virtual:astro:page:src/pages/projects@_@astro
var page = () => projects_exports;
//#endregion
export { page };
