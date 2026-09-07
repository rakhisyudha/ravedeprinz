import { t as sequence, ut as defineMiddleware } from "./chunks/sequence_DWzfefGn.mjs";
//#region src/middleware.ts
var onRequest$1 = defineMiddleware(async (context, next) => {
	if (!context.url.pathname.startsWith("/admin")) return next();
	const apiBase = "http://localhost:4100".replace(/\/$/, "");
	try {
		const res = await fetch(`${apiBase}/api/auth/session`, {
			headers: { cookie: context.request.headers.get("cookie") ?? "" },
			signal: AbortSignal.timeout(8e3)
		});
		if (!res.ok) {
			context.locals.adminGate = {
				reachable: false,
				user: null
			};
			return next();
		}
		const session = await res.json();
		if (!session.authenticated) return context.redirect("/login");
		context.locals.adminGate = {
			reachable: true,
			user: session.user
		};
		return next();
	} catch {
		context.locals.adminGate = {
			reachable: false,
			user: null
		};
		return next();
	}
});
//#endregion
//#region \0virtual:astro:middleware
var onRequest = sequence(onRequest$1);
//#endregion
export { onRequest };
