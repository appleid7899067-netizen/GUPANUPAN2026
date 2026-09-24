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
    `Colors: ${spec.ui.colors.join(", ")}`,
    `Responsive: ${spec.ui.responsive ? "yes" : "no"}`,
    `Data strategy: ${spec.data.strategy}`,
    "Core features (maximum 5):",
    featureLines,
    "Constraints:",
    ...spec.constraints.map((x) => `- ${x}`),
    `Existing app: ${existingHtml ? "yes, preserve it and make the smallest relevant change" : "no, create the MVP from scratch"}`,
    "Verification contract:",
    "- Produce runnable output.",
    "- Check that the requested flow is represented in the generated result.",
    "- If an existing app is present, do not silently remove unrelated functionality.",
    "=== END APP SPECIFICATION ===",
  ].join("\n");
}
