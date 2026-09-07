import { a as attr, n as derived, o as escape_html } from "./dev_CV5-D1wl.mjs";
//#region src/components/admin/AdminImageUpload.svelte
function AdminImageUpload($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const { label, value, onChange, apiBase } = $$props;
		let busy = false;
		const previewSrc = derived(() => value ? value.startsWith("http") ? value : `${apiBase}${value}` : "");
		$$renderer.push(`<div class="admin-upload"><span class="admin-field-label">${escape_html(label)}</span> <div class="admin-upload-preview">`);
		if (value) $$renderer.push(`<!--[0--><div class="admin-upload-frame svelte-1tycpkf"><img${attr("src", previewSrc())} alt="Upload preview" class="svelte-1tycpkf"/></div>`);
		else $$renderer.push(`<!--[-1--><div class="admin-upload-empty">NO IMAGE</div>`);
		$$renderer.push(`<!--]--></div> <div class="admin-upload-actions"><button type="button" class="admin-nav-link touch-target"${attr("disabled", busy, true)}>${escape_html(value ? "REPLACE" : "UPLOAD")}</button> `);
		if (value) $$renderer.push(`<!--[0--><button type="button" class="admin-nav-link touch-target">REMOVE</button>`);
		else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div> <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden=""/> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div>`);
	});
}
//#endregion
export { AdminImageUpload as t };
