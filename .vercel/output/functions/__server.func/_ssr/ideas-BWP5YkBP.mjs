import { x as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as Marketing } from "./marketing-BG3QaJ_u.mjs";
import { n as useBuilder } from "./router-DoBO8eUV.mjs";
import { t as STARTERS } from "./starters-C_JKZ5Yy.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ideas-BWP5YkBP.js
var import_jsx_runtime = require_jsx_runtime();
function IdeasPage() {
	const setDraft = useBuilder((s) => s.setDraft);
	const newProject = useBuilder((s) => s.newProject);
	const navigate = useNavigate();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Marketing, {
		eyebrow: "What to build",
		title: "A dozen starting points",
		lead: "Each idea is a complete prompt. Tap one to drop it into Forge and start a build.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "grid gap-3 sm:grid-cols-2",
			children: STARTERS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => {
					newProject();
					setDraft(s.prompt);
					navigate({ to: "/" });
				},
				className: "h-full w-full rounded-xl bg-surface p-4 text-left shadow-border transition-[box-shadow] hover:shadow-border-hover",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-semibold",
					children: s.label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 line-clamp-3 text-sm leading-relaxed text-muted",
					children: s.prompt
				})]
			}) }, s.label))
		})
	});
}
//#endregion
export { IdeasPage as component };
