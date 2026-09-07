import { o as escape_html } from "./dev_CV5-D1wl.mjs";
//#region src/components/admin/AdminSaveBar.svelte
function AdminSaveBar($$renderer, $$props) {
	const { status, onSave, onPublish } = $$props;
	$$renderer.push(`<div class="admin-savebar"><span>${escape_html(status)}</span> <div>`);
	if (onPublish) $$renderer.push(`<!--[0--><button type="button" class="admin-nav-link touch-target">PUBLISH</button>`);
	else $$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--> <button type="button" class="auth-button touch-target">SAVE</button></div></div>`);
}
//#endregion
export { AdminSaveBar as t };
