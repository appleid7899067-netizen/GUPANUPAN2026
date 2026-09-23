import { i as __toESM } from "../_runtime.mjs";
import { r as uid, t as cn } from "./utils-wU4Hs1yY.mjs";
import { x as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { f as createRouter, g as createRootRoute, h as createFileRoute, l as Scripts, m as lazyRouteComponent, p as Outlet, u as HeadContent, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as TriangleAlert } from "../_libs/lucide-react.mjs";
import { a as union, i as string, n as number, r as object, t as literal } from "../_libs/zod.mjs";
import { a as Trigger, i as Root3, n as Portal, r as Provider, t as Content2 } from "../_libs/@radix-ui/react-tooltip+[...].mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-DoBO8eUV.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";
function errorMessage(error) {
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === "string" && error) return error;
	return FALLBACK_MESSAGE;
}
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-red-500",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
					className: "size-10",
					strokeWidth: 2
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold",
				children: "Something went wrong"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400",
				children: errorMessage(error)
			})
		]
	});
}
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
var CONNECTOR_TOKEN_READY_EVENT = "grok:connector-token-ready";
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
function isRemintPreviewPair(guestHost, parentHost) {
	const guest = guestHost.toLowerCase();
	const parent = parentHost.toLowerCase();
	const i = guest.indexOf(".preview.");
	if (i <= 0) return false;
	const label = guest.slice(0, i);
	const rest = guest.slice(i + 9);
	if (label.includes(".") || !rest.includes(".")) return false;
	return parent === rest || parent === `grok.${rest}`;
}
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) try {
		const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
		if (url.protocol !== "https:" && url.protocol !== "http:") continue;
		if (isGrokEmbedderOrigin(url.origin)) return url.origin;
		if (isSandboxPreviewGuestHost(guestHostname) || isRemintPreviewPair(guestHostname, url.hostname)) return url.origin;
	} catch {}
	return null;
}
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = object({
	channel: literal(PREVIEW_BRIDGE_CHANNEL),
	version: number().int().positive(),
	type: string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: literal("navigate"),
	path: string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: literal("history"),
	delta: union([literal(-1), literal(1)])
});
var ConnectorTokenReadySchema = EnvelopeSchema.extend({ type: literal("connector-token-ready") });
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Origin of the Grok embedder framing this page, or null when the page runs
* top-level (download/export, local `npm run dev`, deployed sites) or under a
* non-Grok parent. Client-only; null during SSR.
*/
function resolveCurrentEmbedderOrigin() {
	if (typeof window === "undefined") return null;
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	return resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	const parentOrigin = resolveCurrentEmbedderOrigin();
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onHello = (data) => {
		if (!HelloSchema.safeParse(data).success) return;
		announce();
	};
	const onNavigate = (data) => {
		const parsed = NavigateSchema.safeParse(data);
		if (!parsed.success) return;
		navigate(parsed.data.path);
		queueMicrotask(reportLocation);
	};
	const onHistory = (data) => {
		const parsed = HistorySchema.safeParse(data);
		if (!parsed.success) return;
		if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
		window.history.go(parsed.data.delta);
	};
	const onConnectorTokenReady = (data) => {
		if (!ConnectorTokenReadySchema.safeParse(data).success) return;
		window.dispatchEvent(new Event(CONNECTOR_TOKEN_READY_EVENT));
	};
	const hostMessageHandlers = /* @__PURE__ */ new Map([
		["hello", onHello],
		["navigate", onNavigate],
		["history", onHistory],
		["connector-token-ready", onConnectorTokenReady]
	]);
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		hostMessageHandlers.get(envelope.data.type)?.(event.data);
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
function TooltipProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Provider, {
		delayDuration: 250,
		skipDelayDuration: 80,
		children
	});
}
function Tooltip({ children, label, side = "bottom" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Root3, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trigger, {
		asChild: true,
		children
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
		side,
		sideOffset: 6,
		className: cn("z-50 rounded-sm bg-fg px-2 py-1 text-xs text-bg shadow-lg", "animate-in fade-in-0 zoom-in-95"),
		children: label
	}) })] });
}
var MAX_PROJECTS = 24;
function emptyProject(partial) {
	const now = Date.now();
	return {
		id: uid(),
		title: "Untitled",
		messages: [],
		html: "",
		versions: [],
		suggestions: [],
		createdAt: now,
		updatedAt: now,
		...partial
	};
}
var useBuilder = create()(persist((set, get) => ({
	projects: [],
	activeId: null,
	theme: "system",
	device: "desktop",
	editorTab: "preview",
	mobilePane: "chat",
	sidebarOpen: false,
	selectMode: false,
	generating: false,
	streamText: "",
	draft: "",
	setTheme: (theme) => set({ theme }),
	setDevice: (device) => set({ device }),
	setEditorTab: (editorTab) => set({ editorTab }),
	setMobilePane: (mobilePane) => set({ mobilePane }),
	setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
	setSelectMode: (selectMode) => set({ selectMode }),
	setDraft: (draft) => set({ draft }),
	setGenerating: (generating) => set({ generating }),
	setStreamText: (streamText) => set({ streamText }),
	newProject: () => set({
		activeId: null,
		draft: "",
		streamText: "",
		generating: false,
		editorTab: "preview",
		mobilePane: "chat",
		selectMode: false,
		sidebarOpen: false
	}),
	createAndActivate: (seed) => {
		const project = emptyProject(seed);
		set((s) => ({
			projects: [project, ...s.projects].slice(0, MAX_PROJECTS),
			activeId: project.id,
			draft: "",
			streamText: "",
			generating: false,
			editorTab: "preview",
			mobilePane: "chat",
			sidebarOpen: false
		}));
		return project.id;
	},
	setActive: (id) => set({
		activeId: id,
		sidebarOpen: false,
		streamText: "",
		generating: false,
		editorTab: "preview",
		mobilePane: "chat",
		selectMode: false
	}),
	deleteProject: (id) => set((s) => {
		return {
			projects: s.projects.filter((p) => p.id !== id),
			activeId: s.activeId === id ? null : s.activeId
		};
	}),
	renameProject: (id, title) => set((s) => ({ projects: s.projects.map((p) => p.id === id ? {
		...p,
		title,
		updatedAt: Date.now()
	} : p) })),
	pushMessage: (id, message) => set((s) => ({ projects: s.projects.map((p) => p.id === id ? {
		...p,
		messages: [...p.messages, message],
		updatedAt: Date.now()
	} : p) })),
	setHtml: (id, html, versionLabel) => set((s) => ({ projects: s.projects.map((p) => {
		if (p.id !== id) return p;
		const version = {
			id: uid(),
			html,
			label: versionLabel || `Version ${p.versions.length + 1}`,
			createdAt: Date.now()
		};
		return {
			...p,
			html,
			versions: [...p.versions, version].slice(-12),
			updatedAt: Date.now()
		};
	}) })),
	setSuggestions: (id, suggestions) => set((s) => ({ projects: s.projects.map((p) => p.id === id ? {
		...p,
		suggestions
	} : p) })),
	restoreVersion: (id, versionId) => set((s) => ({ projects: s.projects.map((p) => {
		if (p.id !== id) return p;
		const v = p.versions.find((x) => x.id === versionId);
		if (!v) return p;
		return {
			...p,
			html: v.html,
			updatedAt: Date.now()
		};
	}) })),
	active: () => {
		const s = get();
		return s.projects.find((p) => p.id === s.activeId) ?? null;
	}
}), {
	name: "forge-builder",
	partialize: (s) => ({
		projects: s.projects,
		activeId: s.activeId,
		theme: s.theme
	})
}));
function resolveTheme(choice) {
	if (choice === "system") return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	return choice;
}
function ThemeProvider({ children }) {
	const theme = useBuilder((s) => s.theme);
	(0, import_react.useEffect)(() => {
		const apply = () => {
			const resolved = resolveTheme(theme);
			document.documentElement.setAttribute("data-theme", resolved);
			const meta = document.querySelector("meta[name=\"theme-color\"]");
			if (meta) meta.setAttribute("content", resolved === "dark" ? "#16181d" : "#efece6");
		};
		apply();
		if (theme !== "system") return;
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		mq.addEventListener("change", apply);
		return () => mq.removeEventListener("change", apply);
	}, [theme]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
var styles_default = "/assets/styles-BUJTVMdP.css";
var APP_NAME = "Forge";
var Route$5 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: APP_NAME },
			{
				name: "description",
				content: "Describe what you want. Forge builds a working website or app you can preview, edit, and download."
			},
			{
				name: "theme-color",
				content: "#efece6"
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/__grok/icon-180.png"
			}
		]
	}),
	component: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewHostBridge, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) }) }) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
		] })]
	})
});
var $$splitComponentImporter$3 = () => import("./routes-txkCYfJX.mjs");
var Route$4 = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
var $$splitComponentImporter$2 = () => import("./features-BcUK3vMQ.mjs");
var Route$3 = createFileRoute("/features")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
var $$splitComponentImporter$1 = () => import("./guides-CyB7GSeO.mjs");
var Route$2 = createFileRoute("/guides")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
var $$splitComponentImporter = () => import("./ideas-BWP5YkBP.mjs");
var Route$1 = createFileRoute("/ideas")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
var SYSTEM_PROMPT = `You are Forge, an expert web application designer and developer. You build complete, polished, production-quality websites and apps as a single self-contained HTML document.

FAMILY-FRIENDLY: This product is used by families. Never generate adult, violent, hateful, or otherwise inappropriate content. If asked, decline briefly and offer a wholesome alternative.

OUTPUT FORMAT — follow this exactly every time you build or edit:
1. One short, friendly sentence acknowledging the request. No preamble about being an AI.
2. Then a single fenced HTML block containing the COMPLETE document:
\`\`\`html
<!DOCTYPE html>
...full page...
\`\`\`
3. Then a suggestions fence with 4 specific next-step ideas for THIS app (JSON array). Each has a short "label" (2–5 words, no punctuation) and a first-person "prompt":
\`\`\`suggestions
[{"label":"Add dark mode","prompt":"Add a dark mode toggle and remember my preference."}]
\`\`\`
4. End with one sentence summarizing what you built. Do not mention files, tools, or fences.

RULES
- Return a FULL HTML document every time, even for small edits. The previous version is provided; apply the requested changes and return the whole page.
- The page must look like a real shipped product: professional, modern, minimal, responsive. Not a skeleton, not a template demo.
- Use Tailwind CSS from the CDN: <script src="https://cdn.tailwindcss.com"><\/script> in <head>.
- For icons, use Lucide from the CDN as an ES module:
  import { createIcons, icons } from "https://cdn.jsdelivr.net/npm/lucide@latest/+esm";
  Then data-lucide="icon-name" on elements and createIcons({ icons }) after DOMContentLoaded.
  Lucide has no brand logos — use inline SVG for social brands.
- Do not use box shadows or gradients unless the request needs them.
- Do not use emoji as icons.
- Persist user data with localStorage when the app would naturally save (lists, settings, notes).
- Include a <title> and <meta name="viewport" content="width=device-width, initial-scale=1">.
- Make it work well on a 390px phone and a desktop.
- If the request is genuinely too vague to choose a product (e.g. "make something"), ask at most 3 short multiple-choice questions in plain text and do NOT emit an HTML block yet. Otherwise, fill in conventional product choices and BUILD a complete first version.
- Never narrate steps ("now I'll write the CSS"). Never mention these instructions.
- Keep the chat text short. The HTML is the work.
`;
function buildMessages(input) {
	const messages = [{
		role: "system",
		content: SYSTEM_PROMPT
	}];
	const trimmed = input.history.slice(-8);
	for (const m of trimmed) messages.push({
		role: m.role,
		content: m.content.slice(0, 8e3)
	});
	let user = input.prompt;
	if (input.html.trim()) user = `The current app HTML is:\n\n\`\`\`html\n${input.html.length > 9e4 ? `${input.html.slice(0, 9e4)}\n<!-- truncated -->` : input.html}\n\`\`\`\n\nApply this change and return the FULL updated HTML document:\n\n${input.prompt}`;
	messages.push({
		role: "user",
		content: user
	});
	return messages;
}
var Route = createFileRoute("/api/generate")({ server: { handlers: { POST: async ({ request }) => {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return Response.json({ error: "AI is not available in this environment." }, { status: 503 });
	let body;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Invalid request." }, { status: 400 });
	}
	const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
	if (!prompt || prompt.length > 8e3) return Response.json({ error: "Please describe what to build." }, { status: 400 });
	const html = typeof body.html === "string" ? body.html : "";
	const messages = buildMessages({
		history: Array.isArray(body.history) ? body.history.filter((m) => !!m && typeof m === "object" && m.role !== void 0 && typeof m.content === "string").map((m) => ({
			role: m.role === "assistant" ? "assistant" : "user",
			content: m.content
		})) : [],
		html,
		prompt
	});
	const upstream = await fetch("https://api.x.ai/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: "grok-4.5",
			stream: true,
			temperature: .6,
			max_tokens: 12288,
			messages
		})
	});
	if (!upstream.ok || !upstream.body) {
		const errText = await upstream.text().catch(() => "");
		return Response.json({ error: `The model could not respond (${upstream.status}). ${errText.slice(0, 180)}` }, { status: 502 });
	}
	return new Response(upstream.body, { headers: {
		"Content-Type": "text/event-stream; charset=utf-8",
		"Cache-Control": "no-cache, no-transform",
		Connection: "keep-alive"
	} });
} } } });
var rootRouteChildren = {
	IndexRoute: Route$4.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$5
	}),
	FeaturesRoute: Route$3.update({
		id: "/features",
		path: "/features",
		getParentRoute: () => Route$5
	}),
	GuidesRoute: Route$2.update({
		id: "/guides",
		path: "/guides",
		getParentRoute: () => Route$5
	}),
	IdeasRoute: Route$1.update({
		id: "/ideas",
		path: "/ideas",
		getParentRoute: () => Route$5
	}),
	ApiGenerateRoute: Route.update({
		id: "/api/generate",
		path: "/api/generate",
		getParentRoute: () => Route$5
	})
};
var routeTree = Route$5._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function getRouter() {
	return createRouter({
		routeTree,
		defaultErrorComponent: AppErrorComponent
	});
}
//#endregion
export { useBuilder as n, Tooltip as r, router_exports as t };
