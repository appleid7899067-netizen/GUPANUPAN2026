import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as cn } from "./utils-wU4Hs1yY.mjs";
import { v as Slot, x as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/button-RQCafFQ_.js
var import_jsx_runtime = require_jsx_runtime();
function ForgeMark({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 32 32",
		className: cn("size-7", className),
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				width: "32",
				height: "32",
				rx: "8",
				className: "fill-accent"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "8",
				y: "9",
				width: "16",
				height: "3.2",
				rx: "1.4",
				className: "fill-accent-fg"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "8",
				y: "14.4",
				width: "12",
				height: "3.2",
				rx: "1.4",
				className: "fill-accent-fg"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "8",
				y: "19.8",
				width: "8",
				height: "3.2",
				rx: "1.4",
				className: "fill-accent-fg"
			})
		]
	});
}
function ForgeWordmark({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: cn("inline-flex items-center gap-2", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ForgeMark, { className: "size-7" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-display text-lg font-semibold tracking-tight",
			children: "Forge"
		})]
	});
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-[opacity,background-color,transform,box-shadow] duration-[var(--motion-quick)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]", {
	variants: {
		variant: {
			default: "bg-accent text-accent-fg hover:opacity-90",
			secondary: "bg-surface text-fg shadow-border hover:shadow-border-hover",
			outline: "bg-transparent text-fg shadow-border hover:bg-muted-fill",
			ghost: "bg-transparent text-muted hover:bg-muted-fill hover:text-fg",
			destructive: "bg-danger text-danger-fg hover:opacity-90"
		},
		size: {
			default: "h-10 rounded-md px-4",
			sm: "h-8 rounded-sm px-3 text-xs",
			lg: "h-11 rounded-lg px-5",
			icon: "size-10 rounded-md",
			"icon-sm": "size-8 rounded-sm"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Button({ className, variant, size, asChild, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
//#endregion
export { ForgeMark as n, ForgeWordmark as r, Button as t };
