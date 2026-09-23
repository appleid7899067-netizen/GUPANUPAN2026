import { x as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as Marketing, t as FeatureGrid } from "./marketing-BG3QaJ_u.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/features-BcUK3vMQ.js
var import_jsx_runtime = require_jsx_runtime();
function FeaturesPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Marketing, {
		eyebrow: "Features",
		title: "Everything the builder does",
		lead: "A working first version from a sentence, a live preview beside the chat, and tools to refine what you see. Projects stay in this browser until you download them.",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FeatureGrid, {
				heading: "Building",
				items: [
					{
						title: "Plain-language builds",
						body: "Describe an app or a site and get a complete first version: layout, logic, and sensible default content — not a skeleton."
					},
					{
						title: "Follow-up chat",
						body: "Ask for a darker palette, a new section, or a bug fix. Each turn returns the full updated page."
					},
					{
						title: "Starter ideas",
						body: "Tap a chip — to-do list, portfolio, timer, recipe book — to drop a detailed prompt into the composer."
					},
					{
						title: "Example apps",
						body: "Open a finished example and remix it. The preview is live immediately so you can start from something real."
					}
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FeatureGrid, {
				heading: "Preview and editing",
				items: [
					{
						title: "Live preview",
						body: "The app runs beside the conversation. Click through it, type into it, and use it the way a visitor would."
					},
					{
						title: "Select to edit",
						body: "Point at an element in the preview and tell Forge exactly what to change, without hunting through code."
					},
					{
						title: "Device frames",
						body: "Switch the preview between desktop, tablet, and phone widths while you refine the layout."
					},
					{
						title: "Code view",
						body: "Open the HTML whenever you want to read or copy it. Download a single file you can host anywhere."
					}
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FeatureGrid, {
				heading: "History",
				items: [{
					title: "Version snapshots",
					body: "Every successful build is saved. Restore an earlier version if an experiment goes sideways."
				}, {
					title: "Project list",
					body: "All of your conversations live in the sidebar, searchable, and stored locally on this device."
				}]
			})
		]
	});
}
//#endregion
export { FeaturesPage as component };
