import { t as __exportAll } from "./rolldown-runtime_BBjsoOtd.mjs";
//#region src/pages/uploads/[...path].ts
var ____path__exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	prerender: () => false
});
var apiBase = "http://localhost:4100".replace(/\/$/, "");
var GET = async ({ params }) => {
	const segments = params.path;
	const parts = Array.isArray(segments) ? segments : typeof segments === "string" ? [segments] : [];
	if (parts.length !== 1 || !parts[0] || parts[0].includes("\0")) return new Response("Not found", { status: 404 });
	const name = parts[0];
	let upstream;
	try {
		upstream = await fetch(`${apiBase}/uploads/${encodeURIComponent(name)}`);
	} catch {
		return new Response("Not found", { status: 404 });
	}
	if (!upstream.ok) return new Response("Not found", { status: upstream.status === 415 ? 415 : 404 });
	const headers = new Headers();
	for (const key of [
		"content-type",
		"content-length",
		"cache-control"
	]) {
		const value = upstream.headers.get(key);
		if (value) headers.set(key, value);
	}
	headers.set("X-Content-Type-Options", "nosniff");
	return new Response(upstream.body, {
		status: 200,
		headers
	});
};
//#endregion
//#region \0virtual:astro:page:src/pages/uploads/[...path]@_@ts
var page = () => ____path__exports;
//#endregion
export { page };
