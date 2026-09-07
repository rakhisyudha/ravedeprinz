//#region src/lib/readingTime.ts
var WPM = 265;
var IMAGE_SECONDS = [
	12,
	7,
	5,
	3,
	3,
	3,
	3,
	3
];
/** Estimated reading time in minutes (min 1). Cover image counts as one image if present. */
function readingMinutes(body, coverImageUrl) {
	const text = body.replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/[#>*_`~\[\]()\-]/g, " ").replace(/\s+/g, " ").trim();
	const words = text ? text.split(" ").length : 0;
	const images = (body.match(/!\[/g) || []).length + (coverImageUrl ? 1 : 0);
	const imageSeconds = IMAGE_SECONDS.slice(0, images).reduce((a, b) => a + b, 0);
	const totalSeconds = words / WPM * 60 + imageSeconds;
	return Math.max(1, Math.round(totalSeconds / 60));
}
//#endregion
export { readingMinutes as t };
