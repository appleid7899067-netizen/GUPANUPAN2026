export type AppFeature = {
  priority: number;
  name: string;
  description: string;
};

export type AppSpec = {
  goal: string;
  features: AppFeature[];
  ui: {
    style: string;
    colors: string[];
    responsive: boolean;
    template: "landing" | "dashboard" | "commerce" | "content" | "portfolio" | "app";
    composition: {
      primaryLayout: "two-column" | "bento" | "grid" | "editorial" | "dashboard";
      blocks: string[];
      visualAnchor: "mockup" | "image" | "product" | "dashboard" | "typography";
      density: "airy" | "balanced" | "dense";
    };
    visualAssets: {
      hero: boolean;
      sectionImages: number;
      galleryImages: number;
      ctaImage: boolean;
    };
  };
  data: {
    strategy: "mock" | "localStorage" | "api" | "database";
  };
  constraints: string[];
  verification: {
    build: boolean;
    runtime: boolean;
    preserveExisting: boolean;
  };
};

const FEATURE_PATTERNS: Array<[RegExp, string]> = [
  [/login|sign in|auth|เข้าสู่ระบบ|ล็อกอิน/i, "Authentication"],
  [/dashboard|แดชบอร์ด/i, "Dashboard"],
  [/search|ค้นหา/i, "Search"],
  [/cart|checkout|ตะกร้า|ชำระเงิน/i, "Commerce"],
  [/payment|จ่ายเงิน|ชำระ/i, "Payments"],
  [/booking|จอง|appointment|นัดหมาย/i, "Booking"],
  [/chat|แชท|สนทนา/i, "Chat"],
  [/profile|โปรไฟล์/i, "Profile"],
  [/admin|ผู้ดูแล/i, "Admin"],
  [/upload|อัปโหลด|อัพโหลด/i, "File upload"],
  [/notification|แจ้งเตือน/i, "Notifications"],
];

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function inferFeatures(prompt: string): AppFeature[] {
  const found = FEATURE_PATTERNS
    .filter(([pattern]) => pattern.test(prompt))
    .map(([, name], i) => ({
      priority: i + 1,
      name,
      description: `Implement the ${name.toLowerCase()} flow needed by the goal.`,
    }));

  if (!found.length) {
    found.push({
      priority: 1,
      name: "Core experience",
      description: "Implement the smallest complete user flow required by the goal.",
    });
  }

  return found.slice(0, 5).map((f, i) => ({ ...f, priority: i + 1 }));
}

function inferStyle(prompt: string): string {
  const t = prompt.toLowerCase();
  if (/brutalist|brutalism|ดิบ/.test(t)) return "Brutalist";
  if (/glass|glassmorphism|กระจก/.test(t)) return "Glass";
  if (/editorial|magazine|นิตยสาร/.test(t)) return "Editorial";
  if (/bento/.test(t)) return "Bento";
  if (/luxury|หรู/.test(t)) return "Luxury";
  if (/neo|neobrutal/.test(t)) return "Neo";
  if (/pastel|พาสเทล|ชมพู|ม่วงอ่อน/.test(t)) return "Pastel";
  if (/dark|มืด/.test(t)) return "Dark";
  return "Minimal";
}

function inferTemplate(prompt: string): AppSpec["ui"]["template"] {
  const t = prompt.toLowerCase();

  // Understand the user's requested product first. Specific nouns and flows
  // take priority over generic words such as "app" or "website".
  if (/ร้าน|สินค้า|shop|store|ecommerce|e-commerce|cart|checkout|ตะกร้า|ชำระเงิน|order/.test(t)) return "commerce";
  if (/dashboard|แดชบอร์ด|admin|ผู้ดูแล|analytics|analytics|kpi|metric|report|รายงาน/.test(t)) return "dashboard";
  if (/blog|article|บทความ|ข่าว|magazine|นิตยสาร|สาระ|บทความข่าว/.test(t)) return "content";
  if (/portfolio|พอร์ต|ผลงาน|agency|เอเจนซี|case study|เคสงาน/.test(t)) return "portfolio";
  if (/app|แอป|mobile|saas|software|ระบบ|เครื่องมือ|ตัวจัดการ|จัดการ/.test(t)) return "app";
  return "landing";
}

function inferIntent(prompt: string): string {
  const t = prompt.toLowerCase();
  if (/สร้าง|ทำ|build|create|make|design|ออกแบบ/.test(t)) return "create";
  if (/แก้|ปรับ|เปลี่ยน|เพิ่ม|ลบ|edit|update|change|add|remove|ปรับปรุง/.test(t)) return "modify";
  if (/ขาย|ร้าน|สินค้า|shop|store|checkout|cart/.test(t)) return "commerce";
  if (/จอง|booking|appointment|นัดหมาย/.test(t)) return "booking";
  if (/เรียน|course|lesson|quiz|education|การศึกษา/.test(t)) return "education";
  if (/จด|note|notes|บันทึก|notebook/.test(t)) return "notes";
  if (/แชท|chat|คุย|conversation|messaging/.test(t)) return "chat";
  if (/ค้นหา|search|ค้น/.test(t)) return "search";
  if (/ติดตาม|tracker|tracking|ติดตามงาน|progress/.test(t)) return "tracking";
  return "general";
}

function inferComposition(prompt: string, template: AppSpec["ui"]["template"], style: string): AppSpec["ui"]["composition"] {
  const t = prompt.toLowerCase();
  const primaryLayout =
    template === "dashboard" || template === "app" ? "dashboard" :
    /bento/.test(t) ? "bento" :
    template === "content" ? "editorial" :
    template === "portfolio" ? "grid" :
    "two-column";
  const visualAnchor =
    template === "dashboard" || template === "app" ? "dashboard" :
    template === "commerce" ? "product" :
    /typography|text[- ]led|ตัวอักษร/.test(t) ? "typography" :
    "mockup";
  const blocksByTemplate: Record<AppSpec["ui"]["template"], string[]> = {
    landing: ["header", "hero-two-column", "feature-grid", "split-showcase", "proof-or-bento", "cta", "footer"],
    dashboard: ["app-shell", "overview", "metric-grid", "dashboard-preview", "activity", "footer"],
    commerce: ["header", "hero-two-column", "category-row", "product-grid", "split-showcase", "cta", "footer"],
    content: ["header", "editorial-hero", "article-grid", "split-story", "newsletter", "footer"],
    portfolio: ["header", "hero-two-column", "selected-work-grid", "split-case-study", "gallery", "cta", "footer"],
    app: ["header", "hero-two-column", "product-mockup", "feature-grid", "workflow-split", "cta", "footer"],
  };
  const density = /dense|compact|แน่น|ข้อมูลเยอะ/.test(t) ? "dense" : /airy|spacious|โล่ง/.test(t) ? "airy" : "balanced";
  return { primaryLayout, blocks: blocksByTemplate[template], visualAnchor, density };
}
function inferVisualAssets(prompt: string, template: AppSpec["ui"]["template"]): AppSpec["ui"]["visualAssets"] {
  const t = prompt.toLowerCase();
  const noImages = /no image|without image|ไม่เอารูป|ไม่มีรูป/.test(t);
  if (noImages) return { hero: false, sectionImages: 0, galleryImages: 0, ctaImage: false };
  if (template === "commerce") return { hero: true, sectionImages: 3, galleryImages: 6, ctaImage: true };
  if (template === "portfolio") return { hero: true, sectionImages: 4, galleryImages: 8, ctaImage: true };
  if (template === "content") return { hero: true, sectionImages: 3, galleryImages: 4, ctaImage: true };
  if (template === "dashboard" || template === "app") return { hero: true, sectionImages: 2, galleryImages: 0, ctaImage: false };
  return { hero: true, sectionImages: 3, galleryImages: 3, ctaImage: true };
}

function inferDataStrategy(prompt: string, hasExistingHtml: boolean): AppSpec["data"]["strategy"] {
  const t = prompt.toLowerCase();
  if (/database|postgres|mysql|ฐานข้อมูล/.test(t)) return "database";
  if (/api|backend|rest|graphql/.test(t)) return "api";
  if (/localstorage|local storage|บันทึกในเครื่อง/.test(t)) return "localStorage";
  return hasExistingHtml ? "localStorage" : "mock";
}

export function compileAppSpec(
  prompt: string,
  options: { hasExistingHtml?: boolean } = {},
): AppSpec {
  const goal = prompt.trim();
  const hasExistingHtml = Boolean(options.hasExistingHtml);

  return {
    goal,
    features: inferFeatures(goal),\n    // Keep the user's actual intent available to the generation contract.\n    intent: inferIntent(goal),
    ui: {
      style: inferStyle(goal),
      colors: unique(
        /purple|ม่วง/i.test(goal) ? ["purple"] :
        /pink|ชมพู/i.test(goal) ? ["pink"] :
        /blue|น้ำเงิน/i.test(goal) ? ["blue"] : ["neutral"],
      ),
      responsive: true,
      template: inferTemplate(goal),
      composition: inferComposition(goal, inferTemplate(goal), inferStyle(goal)),
      visualAssets: inferVisualAssets(goal, inferTemplate(goal)),
    },
    data: { strategy: inferDataStrategy(goal, hasExistingHtml) },
    constraints: [
      "MVP first: keep the first implementation small and runnable.",
      "One change per iteration: implement the current request without unrelated rewrites.",
      "Preserve existing features and working code unless the request explicitly replaces them.",
      "Prefer mock data first when no real backend is required.",
      "Do not claim success without concrete verification evidence.",
      "DESIGN SYSTEM LOCK: every generated page must inherit the existing app visual system. Never create an isolated page theme.",
      "GLOBAL CSS: preserve and reuse the existing global stylesheet, CSS variables, typography, colors, spacing, radii, and responsive rules. Never remove or replace the global style foundation.",
      "SHARED LAYOUT: every page/route must render inside the same root/shared layout shell so the background, typography, navigation, theme, and global providers remain consistent.",
      "TAILWIND COVERAGE: if Tailwind is used, ensure its source/content scan covers every generated source/page folder. Never introduce classes in an unscanned folder.",
      "THEME VARIABLES: reuse existing CSS variables/design tokens. If a token is needed, define it centrally in the global stylesheet rather than locally on one page.",
      "MULTI-PAGE PARITY: before finishing, inspect every requested page and confirm none has fallen back to browser-default white backgrounds, default fonts, missing spacing, or missing theme classes.",
      "NO STYLE REGRESSION: a new page must not require copying ad-hoc CSS from another page. Fix the shared layer instead so future pages inherit the design automatically.",
      "PRESERVE EXISTING FEATURES: never delete working routes, components, interactions, or style files while adding a page.",
      "SELF-HEALING CHECK: if styling appears missing, trace Root Layout → global CSS import → theme variables → Tailwind scan → page classes, repair the shared cause, then re-check all routes.",
      "PANUPAN VISUAL BASELINE: for this product, preserve the established dark deep-space, restrained glass, violet-energy visual language unless the user explicitly requests another app-wide theme.",
      "VISUAL-FIRST TEMPLATE: generated apps must start from a complete page composition, not a wireframe. Every major section must have its intended layout, typography, content slots, and visual assets in place.",
      "IMAGE-AS-STRUCTURE: images are part of the page architecture. Do not leave empty boxes labelled IMAGE HERE, unsplash placeholders, or blank media slots in a finished MVP when the requested design calls for imagery.",
      "ASSET FALLBACK: when real assets are unavailable, use tasteful remote image URLs or deterministic gradient/photo-like CSS only where appropriate, but keep the media slot visually complete and replaceable. Never invent fake local asset paths.",
      "HERO ASSET: landing, portfolio, commerce, content, and app templates should include a deliberate hero visual unless the user explicitly requests a text-only design.",
      "SECTION MEDIA: feature/product/story sections should use image-led composition where the visual asset is part of the information hierarchy, not merely decoration.",
      "RESPONSIVE MEDIA: every image must use responsive sizing, object-fit/object-position, useful alt text, and a stable aspect-ratio container to prevent layout shift.",
      "TEMPLATE COMPOSITION: Landing = hero visual + benefits/features + proof/gallery + CTA visual. Commerce = product imagery + categories + product grid + CTA. Portfolio = work imagery + case-study sections + gallery. Content = editorial hero + article cards + imagery. Dashboard/App = visual overview/preview where relevant.",
    "V0-STYLE COMPONENT SYSTEM: organize the generated UI as reusable product primitives: AppShell, Header, Sidebar or Tabs when useful, Section, Card, Button, Input, Badge, Table/List, Dialog/Drawer, Toast/Feedback, EmptyState, LoadingState, ErrorState. Do not literally print component names unless useful; reproduce their structure, consistency, and behavior in the HTML.",
    "V0-STYLE COMPOSITION: choose the information architecture before styling. Apps should have a clear shell and primary workspace. Marketing pages should have a deliberate story arc. Avoid one giant uninterrupted vertical block when the product naturally calls for multiple sections or screens.",
    "INTERACTION CONTRACT: every primary visible action must work in the browser. Use anchors for navigation, real event handlers for actions, client-side state for toggles/filters/forms, and localStorage for natural persistence when no backend is requested.",
    "STATE CONTRACT: interactive surfaces should account for useful empty, loading, success, error, selected, disabled, and validation states instead of only the happy path.",
    "RESPONSIVE CONTRACT: design desktop and mobile compositions separately where necessary. Do not merely shrink desktop. Navigation, grids, toolbars, tables, dialogs, and two-column blocks must collapse into usable mobile patterns.",
    "VISUAL HIERARCHY CONTRACT: every screen needs one dominant focal point, one clear primary action, and an obvious content hierarchy. Use restrained borders, typography, spacing, and one coherent accent system instead of visual noise.",
      "ASSET COUNTS: honor the AppSpec visual asset counts. If the spec requests 6 product/gallery images, the generated page should actually contain that many meaningful visual items.",
      "NO EMPTY SCAFFOLD: a finished page must feel populated and presentation-ready on first render. Avoid excessive placeholder copy, empty cards, blank charts, or unimplemented media regions.",
      "VISUAL CONSISTENCY: use one coherent image treatment across the page: shared aspect ratios, radii, crop behavior, overlays, and caption style. Do not mix unrelated stock-photo treatments.",
      "IMAGE PERFORMANCE: lazy-load below-the-fold images, eager-load the primary hero image, and use width/height or aspect-ratio to minimize layout shift.",
    ],
    verification: {
      build: true,
      runtime: true,
      preserveExisting: true,
    },
  };
}

export function buildVisualAssetPrompt(spec: AppSpec): string {
  const v = spec.ui.visualAssets;
  if (!v.hero && v.sectionImages === 0 && v.galleryImages === 0 && !v.ctaImage) return "Visual assets: none requested. Keep the composition intentional and text-led.";
  const urls = [
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=85",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1000&q=85",
  ];
  return [
    "VISUAL ASSET PLAN (mandatory):",
    "- Template: " + spec.ui.template,
    "- Hero image: " + (v.hero ? "required" : "not required"),
    "- Section images: " + v.sectionImages,
    "- Gallery images: " + v.galleryImages,
    "- CTA image: " + (v.ctaImage ? "required" : "not required"),
    "- Use existing project assets first. If none are available, these stable remote image URLs are approved fallbacks:",
    ...urls.map((url, i) => (i + 1) + ". " + url),
    "- Reuse/crop these coherently rather than inventing broken local paths.",
    "- Every image needs meaningful alt text and responsive object-cover behavior.",
  ].join("\n");
}
export function buildAppSpecPrompt(spec: AppSpec, existingHtml: boolean): string {
  const featureLines = spec.features
    .map((f) => `${f.priority}. ${f.name}: ${f.description}`)
    .join("\n");

  return [
    "=== APP SPECIFICATION ===",
    `Goal: ${spec.goal}`,
    `UI style: ${spec.ui.style}`,
    `Template: ${spec.ui.template}`,
    `Colors: ${spec.ui.colors.join(", ")}`,
    `Visual assets: hero=${spec.ui.visualAssets.hero ? "yes" : "no"}, sectionImages=${spec.ui.visualAssets.sectionImages}, galleryImages=${spec.ui.visualAssets.galleryImages}, ctaImage=${spec.ui.visualAssets.ctaImage ? "yes" : "no"}`,
    `Composition: layout=${spec.ui.composition.primaryLayout}, visualAnchor=${spec.ui.composition.visualAnchor}, density=${spec.ui.composition.density}`,
    `Blocks: ${spec.ui.composition.blocks.join(" → ")}`,
    `Responsive: ${spec.ui.responsive ? "yes" : "no"}`,
    `Data strategy: ${spec.data.strategy}`,
    "Core features (maximum 5):",
    featureLines,
    "Constraints:",
    ...spec.constraints.map((x) => `- ${x}`),
    `Existing app: ${existingHtml ? "yes, preserve it and make the smallest relevant change" : "no, create the MVP from scratch"}`,
    "Visual template contract:",
    "- Build the complete visual composition in the first render, including image assets required by the template.",
    "- COMPOSITION-FIRST: treat the page as a sequence of designed blocks, not one uninterrupted vertical column.",
    "- TWO-BLOCK RULE: when meaningful text and a visual belong together, prefer a balanced two-column composition on desktop, then stack intentionally on mobile.",
    "- MOCKUP + HTML: the visual mockup is part of the same HTML layout and must use the same colors, typography, spacing, radii, and tokens as the surrounding page. Do not make it a detached image when an HTML/CSS mockup is appropriate.",
    "- VISUAL ANCHOR: each major page should have one clear visual anchor such as a product mockup, dashboard preview, product image, or editorial image.",
    "- BLOCK RHYTHM: alternate composition types across sections: two-column, grid/bento, split content, and CTA. Avoid repeating centered text-only sections.",
    "- SECTION BOUNDARIES: give each major block deliberate vertical breathing room, consistent max-width, and clear hierarchy. Do not collapse unrelated content into one long section.",
    "- MOCKUP QUALITY: build believable lightweight UI inside the mockup with browser/device chrome, cards, controls, data, or content relevant to the requested product.",
    "- Never leave an empty media placeholder when an asset is required; use a valid image URL or an existing project asset.",
    "- Confirm the requested asset counts and responsive image behavior before declaring the page complete.",
    "Verification contract:",
    "- Produce runnable output.",
    "- Check that the requested flow is represented in the generated result.",
    "- If an existing app is present, do not silently remove unrelated functionality.",
    "=== END APP SPECIFICATION ===",
  ].join("\n");
}
