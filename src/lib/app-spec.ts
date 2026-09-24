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
  if (/dashboard|แดชบอร์ด|admin|ผู้ดูแล/.test(t)) return "dashboard";
  if (/shop|store|ร้าน|สินค้า|ecommerce|e-commerce|cart|checkout|ตะกร้า/.test(t)) return "commerce";
  if (/blog|article|บทความ|ข่าว|magazine|นิตยสาร/.test(t)) return "content";
  if (/portfolio|พอร์ต|ผลงาน|agency|เอเจนซี/.test(t)) return "portfolio";
  if (/app|แอป|mobile|saas|software/.test(t)) return "app";
  return "landing";
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
    features: inferFeatures(goal),
    ui: {
      style: inferStyle(goal),
      colors: unique(
        /purple|ม่วง/i.test(goal) ? ["purple"] :
        /pink|ชมพู/i.test(goal) ? ["pink"] :
        /blue|น้ำเงิน/i.test(goal) ? ["blue"] : ["neutral"],
      ),
      responsive: true,
      template: inferTemplate(goal),
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
    `Responsive: ${spec.ui.responsive ? "yes" : "no"}`,
    `Data strategy: ${spec.data.strategy}`,
    "Core features (maximum 5):",
    featureLines,
    "Constraints:",
    ...spec.constraints.map((x) => `- ${x}`),
    `Existing app: ${existingHtml ? "yes, preserve it and make the smallest relevant change" : "no, create the MVP from scratch"}`,
    "Visual template contract:",
    "- Build the complete visual composition in the first render, including image assets required by the template.",
    "- Never leave an empty media placeholder when an asset is required; use a valid image URL or an existing project asset.",
    "- Confirm the requested asset counts and responsive image behavior before declaring the page complete.",
    "Verification contract:",
    "- Produce runnable output.",
    "- Check that the requested flow is represented in the generated result.",
    "- If an existing app is present, do not silently remove unrelated functionality.",
    "=== END APP SPECIFICATION ===",
  ].join("\n");
}
