/**
 * ═══ runner ที่รันในพรีวิว (iframe) ════════════════════════════════════════
 *
 * โค้ดในไฟล์นี้คือ **สตริง JavaScript** ที่ฝังลง `<script>` ของเอกสารพรีวิว
 * (ไม่ใช่โค้ดที่รันในหน้าเว็บของบิลเดอร์) ทำหน้าที่เป็น bundler/runtime ขนาดเล็ก:
 *
 *   - ลงทะเบียนโมดูลที่คอมไพล์แล้ว (CommonJS) และให้ `require()` ที่แก้พาธ
 *     แบบเดียวกับที่ `transform.ts` จับคู่ไว้
 *   - ให้โมดูล npm ที่ vendor ไว้: react, react-dom, react/jsx-runtime,
 *     prop-types, classnames/clsx และตัวจำลอง react-router กับ Next บางตัว
 *   - ไม่ปลอมแพ็กเกจที่ไม่มีใน runtime: dependency ที่ไม่มีจะทำให้ preview ถูกวินิจฉัยว่า
 *     "ยัง build ไม่ผ่าน" แทนการแสดง UI ปลอมที่ดูเหมือนใช้งานได้
 *   - ข้อผิดพลาดทุกอย่างต้องเห็นได้: console ของบิลเดอร์รับ log/warn/error อยู่แล้ว
 *     และ runner ยังโชว์แบนเนอร์สรุปเมื่อมีปัญหา
 *
 * ⚠️ รันใน sandbox="allow-scripts" (ไม่มี same-origin) และ CSP ปิดเครือข่าย
 * ทุกอย่างจึงอยู่ในความจำของ iframe เท่านั้น
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

function gupanRunner(): void {
  var cfg = (window as any).__GUPAN_BOOT__;
  if (!cfg) return;

  // ── 1) สไตล์ทั้งหมด (เรียงตามลำดับที่เก็บ) ────────────────────────────
  var head = document.head || document.getElementsByTagName("head")[0];
  for (var s = 0; s < cfg.styles.length; s++) {
    var styleTag = document.createElement("style");
    styleTag.setAttribute("data-file", cfg.styles[s].path);
    styleTag.textContent = cfg.styles[s].css;
    head.appendChild(styleTag);
  }

  // ── 2) ประกาศปัญหาไว้ก่อน แล้วรายงานทีหลัง ────────────────────────────
  var problems: string[] = [];
  var iconsStub = new Set<string>();

  var React = (window as any).React;
  var ReactDOM = (window as any).ReactDOM;
  var Fragment = React ? React.Fragment : "div";

  /** ไอคอน/ตัวช่วยที่ไม่มีในออฟไลน์ → คอมโพเนนต์เปล่า (ไม่ทำให้หน้าพัง) */
  function iconStub(): any {
    var Empty = function () {
      return null;
    };
    return new Proxy(Empty, {
      get: function (target: any, key: string) {
        if (key === "__esModule") return true;
        if (key === "default") return target;
        if (key === "then") return undefined;
        if (typeof key !== "string") return (target as any)[key];
        if (key === "$$typeof") return undefined;
        return (target as any)[key] !== undefined
          ? (target as any)[key]
          : function () {
              return null;
            };
      },
    });
  }

  /** คอมโพเนนต์ที่ครอบเด็ก ๆ ไว้เฉย ๆ (react-helmet ฯลฯ) */
  function passthrough(): any {
    var Wrapper = function (props: any) {
      return props && props.children !== undefined ? props.children : null;
    };
    return new Proxy(Wrapper, {
      get: function (target: any, key: string) {
        if (key === "__esModule" || key === "default") return key === "default" ? target : true;
        if (typeof key !== "string") return (target as any)[key];
        return function (props: any) {
          return props && props.children !== undefined ? props.children : null;
        };
      },
    });
  }

  function makePropTypes(): any {
    var chain: any = function () {
      return chain;
    };
    chain.isRequired = chain;
    return new Proxy(chain, {
      get: function (target: any, key: string) {
        if (key in target) return (target as any)[key];
        if (typeof key !== "string") return undefined;
        return chain;
      },
    });
  }

  function cx(): string {
    var out: string[] = [];
    for (var i = 0; i < arguments.length; i++) {
      var value = arguments[i];
      if (!value) continue;
      if (typeof value === "string" || typeof value === "number") out.push(String(value));
      else if (Array.isArray(value)) out.push(cx.apply(null, value as any));
      else if (typeof value === "object") {
        for (var key in value) if (value[key]) out.push(key);
      }
    }
    return out.join(" ");
  }

  // ── 3) ตัวจำลอง react-router (พอให้ SPA หลายหน้าเรนเดอร์ได้) ──────────
  function createRouterShim(): any {
    var Ctx = React.createContext(null);

    function matchPath(pattern: string, pathname: string): any {
      if (!pattern || pattern === "*") return { params: {} };
      var patternParts = pattern.replace(/\/+$/, "").split("/").filter(Boolean);
      var pathParts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
      if (patternParts[patternParts.length - 1] === "*") {
        if (pathParts.length < patternParts.length - 1) return null;
        return { params: {} };
      }
      if (patternParts.length !== pathParts.length) return null;
      var params: any = {};
      for (var i = 0; i < patternParts.length; i++) {
        var expected = patternParts[i];
        var actual = pathParts[i];
        if (expected.charAt(0) === ":") params[expected.slice(1)] = decodeURIComponent(actual);
        else if (expected !== actual) return null;
      }
      return { params: params };
    }

    function useRouter(): any {
      var ctx = React.useContext(Ctx);
      if (ctx) return ctx;
      return {
        path: "/",
        params: {},
        navigate: function () {
          problems.push("ลิงก์ถูกกดแต่ไม่มี Router ครอบ — ใช้ MemoryRouter แทน");
        },
      };
    }

    function MemoryRouter(props: any) {
      var state = React.useState(props && props.initialEntries ? props.initialEntries[0] : "/");
      var path = state[0];
      var setPath = state[1];
      var value = {
        path: path,
        params: {},
        navigate: function (to: any) {
          var next = typeof to === "string" ? to : (to && to.pathname) || "/";
          setPath(next.split("?")[0] || "/");
        },
      };
      return React.createElement(Ctx.Provider, { value: value }, props.children);
    }

    var Router = MemoryRouter;
    var BrowserRouter = MemoryRouter;
    var HashRouter = MemoryRouter;
    var StaticRouter = MemoryRouter;

    function renderRouteChild(child: any, params: any): any {
      if (!child || !child.props) return null;
      var p = child.props;
      if (p.element !== undefined) return p.element;
      if (p.component) return React.createElement(p.component, params);
      if (typeof p.render === "function") return p.render(params);
      if (typeof p.children === "function") return p.children(params);
      return p.children !== undefined ? p.children : null;
    }

    function selectRoute(children: any, path: string): any {
      var list = Array.isArray(children) ? children : [children];
      var fallback: any = null;
      for (var i = 0; i < list.length; i++) {
        var child = list[i];
        if (!child || !child.props) continue;
        var p = child.props;
        if (p.index) {
          if (path === "/" && !fallback) fallback = child;
          continue;
        }
        if (p.path === undefined) {
          if (!fallback) fallback = child;
          continue;
        }
        var matched = matchPath(String(p.path), path);
        if (matched) return { child: child, params: matched.params };
        if (String(p.path) === "*") fallback = child;
      }
      return fallback ? { child: fallback, params: {} } : null;
    }

    function Routes(props: any) {
      var ctx = useRouter();
      var picked = selectRoute(props.children, ctx.path);
      if (!picked) return null;
      var params = picked.params;
      var inner = renderRouteChild(picked.child, params);
      var path = String((picked.child.props && picked.child.props.path) || "");
      var nextCtx = {
        path: ctx.path,
        params: params,
        base: path,
        navigate: ctx.navigate,
      };
      return React.createElement(Ctx.Provider, { value: nextCtx }, inner);
    }

    function Route(props: any) {
      return renderRouteChild({ props: props }, {});
    }

    function Outlet() {
      var ctx = React.useContext(Ctx);
      return ctx && ctx.outlet !== undefined ? ctx.outlet : null;
    }

    function Link(props: any) {
      var ctx = useRouter();
      var to = typeof props.to === "string" ? props.to : (props.to && props.to.pathname) || "#";
      return React.createElement(
        "a",
        {
          href: to,
          className: props.className,
          style: props.style,
          title: props.title,
          "aria-label": props["aria-label"],
          onClick: function (event: any) {
            event.preventDefault();
            if (props.onClick) props.onClick(event);
            ctx.navigate(to);
          },
        },
        props.children,
      );
    }

    function NavLink(props: any) {
      var ctx = useRouter();
      var to = typeof props.to === "string" ? props.to : (props.to && props.to.pathname) || "#";
      var active = ctx.path === to || (to !== "/" && ctx.path.indexOf(to) === 0);
      var className =
        typeof props.className === "function"
          ? props.className({ isActive: active, isPending: false })
          : props.className;
      return React.createElement(
        "a",
        {
          href: to,
          className: active ? (className ? className + " active" : "active") : className,
          style: typeof props.style === "function" ? props.style({ isActive: active }) : props.style,
          onClick: function (event: any) {
            event.preventDefault();
            ctx.navigate(to);
          },
        },
        props.children,
      );
    }

    function Navigate(props: any) {
      var ctx = useRouter();
      React.useEffect(function () {
        ctx.navigate(props.to);
      }, [props.to]);
      return null;
    }

    function withRouter(Component: any): any {
      return function (props: any) {
        var ctx = useRouter();
        return React.createElement(Component, Object.assign({}, props, { history: ctx, location: { pathname: ctx.path }, match: { params: ctx.params } }));
      };
    }

    return {
      __esModule: true,
      default: { MemoryRouter: MemoryRouter, BrowserRouter: BrowserRouter, Routes: Routes, Route: Route, Link: Link },
      MemoryRouter: MemoryRouter,
      BrowserRouter: BrowserRouter,
      HashRouter: HashRouter,
      StaticRouter: StaticRouter,
      Router: Router,
      Routes: Routes,
      Route: Route,
      Switch: Routes,
      Link: Link,
      NavLink: NavLink,
      Navigate: Navigate,
      Redirect: Navigate,
      Outlet: Outlet,
      withRouter: withRouter,
      useNavigate: function () {
        return useRouter().navigate;
      },
      useHistory: function () {
        var ctx = useRouter();
        return { push: ctx.navigate, replace: ctx.navigate, location: { pathname: ctx.path }, goBack: function () {} };
      },
      useLocation: function () {
        return { pathname: useRouter().path, search: "", hash: "", state: null };
      },
      useParams: function () {
        return useRouter().params || {};
      },
      useRouteMatch: function () {
        return { path: useRouter().path, url: useRouter().path, params: useRouter().params || {} };
      },
      useSearchParams: function () {
        return [new URLSearchParams(""), function () {}];
      },
      createBrowserRouter: function (routes: any) {
        return { routes: routes };
      },
      RouterProvider: function (props: any) {
        var routes = (props && props.router && props.router.routes) || [];
        var children = routes.map(function (route: any, index: number) {
          return React.createElement(Route, { key: index, path: route.path, element: route.element, Component: route.Component, children: route.children });
        });
        return React.createElement(MemoryRouter, null, React.createElement(Routes, null, children));
      },
    };
  }

  // ── 4) ตัวจำลอง Next.js บางส่วน ───────────────────────────────────────
  function createNextShims(): any {
    function Link(props: any) {
      var href = typeof props.href === "string" ? props.href : (props.href && props.href.pathname) || "#";
      var rest: any = {};
      for (var key in props) if (key !== "href" && key !== "children" && key !== "legacyBehavior") rest[key] = props[key];
      var child = props.children;
      if (React.isValidElement && React.isValidElement(child) && child.type === "a") {
        return React.cloneElement(child, Object.assign({}, rest, { href: href }));
      }
      return React.createElement("a", Object.assign({ href: href }, rest), child);
    }
    function Image(props: any) {
      var rest: any = {};
      for (var key in props) {
        if (key === "layout" || key === "priority" || key === "loader" || key === "placeholder" || key === "blurDataURL" || key === "fill" || key === "quality" || key === "unoptimized") continue;
        rest[key] = props[key];
      }
      if (props.fill) {
        rest.style = Object.assign({ position: "absolute", inset: 0, width: "100%", height: "100%" }, props.style || {});
      }
      if (typeof rest.width === "number") rest.width = String(rest.width);
      if (typeof rest.height === "number") rest.height = String(rest.height);
      return React.createElement("img", rest);
    }
    function Head(props: any) {
      React.useEffect(function () {
        var kids = Array.isArray(props.children) ? props.children : [props.children];
        for (var i = 0; i < kids.length; i++) {
          var child = kids[i];
          if (!child || !child.props) continue;
          if (child.type === "title" && child.props.children) {
            document.title = String(child.props.children);
          }
        }
      });
      return null;
    }
    var router = {
      pathname: "/",
      route: "/",
      query: {},
      asPath: "/",
      push: function () {
        problems.push("next/router.push ใช้ไม่ได้ในพรีวิว (ไม่มีเซิร์ฟเวอร์)");
        return Promise.resolve(false);
      },
      replace: function () {
        return Promise.resolve(false);
      },
      back: function () {},
      events: { on: function () {}, off: function () {}, emit: function () {} },
      prefetch: function () {
        return Promise.resolve();
      },
    };
    return {
      Link: Link,
      Image: Image,
      Head: Head,
      default: Head,
      useRouter: function () {
        return router;
      },
      withRouter: function (Component: any) {
        return function (props: any) {
          return React.createElement(Component, Object.assign({}, props, { router: router }));
        };
      },
      usePathname: function () {
        return "/";
      },
      useSearchParams: function () {
        return new URLSearchParams("");
      },
      useParams: function () {
        return {};
      },
      notFound: function () {
        return { notFound: true };
      },
      redirect: function (to: any) {
        return { redirect: to };
      },
      Script: function (props: any) {
        var rest: any = {};
        for (var key in props) if (key !== "strategy" && key !== "onLoad" && key !== "onError") rest[key] = props[key];
        return React.createElement("script", rest);
      },
    };
  }

  // ── 5) ทะเบียนโมดูลภายนอก ───────────────────────────────────────────
  /** ห่อ element ด้วย error boundary เพื่อไม่ให้เจอหน้าเปล่าเมื่อแอปเรนเดอร์ไม่ผ่าน */
  function withBoundary(element: any): any {
    var factory = (window as any).__gupanMountWithBoundary;
    return factory ? factory(element) : element;
  }

  /** createRoot/hydrateRoot ที่ห่อ boundary ให้อัตโนมัติ */
  function gupanCreateRoot(container: any, options?: any): any {
    var root = ReactDOM.createRoot(container, options);
    return {
      render: function (element: any) {
        return root.render(withBoundary(element));
      },
      unmount: function () {
        return root.unmount();
      },
    };
  }
  function gupanHydrateRoot(container: any, element: any, options?: any): any {
    return ReactDOM.hydrateRoot(container, withBoundary(element), options);
  }

  var shims: any = {};
  if (React) {
    shims["react"] = React;
    shims["react-dom"] = ReactDOM;
    shims["react-dom/client"] = {
      __esModule: true,
      default: { createRoot: gupanCreateRoot, hydrateRoot: gupanHydrateRoot },
      createRoot: gupanCreateRoot,
      hydrateRoot: gupanHydrateRoot,
    };
    shims["react-dom/server"] = {
      __esModule: true,
      renderToString: function () {
        return "";
      },
      renderToStaticMarkup: function () {
        return "";
      },
      default: {},
    };
    var jsxRuntime: any = {
      __esModule: true,
      Fragment: Fragment,
      jsx: function (type: any, props: any, key: any) {
        var copy: any = {};
        for (var name in props) if (name !== "key") copy[name] = props[name];
        if (key !== undefined && key !== null) copy.key = key;
        return React.createElement(type, copy);
      },
      jsxs: function (type: any, props: any, key: any) {
        return jsxRuntime.jsx(type, props, key);
      },
    };
    jsxRuntime.jsxDEV = jsxRuntime.jsx;
    // production runtime ของ React ใช้ jsxs กับ children เป็นอาร์เรย์
    jsxRuntime.jsxs = jsxRuntime.jsx;
    shims["react/jsx-runtime"] = jsxRuntime;
    shims["react/jsx-dev-runtime"] = Object.assign({}, jsxRuntime, {
      jsxDEV: function (type: any, props: any, key: any, isStatic: any, source: any, self: any) {
        return jsxRuntime.jsx(type, props, key);
      },
    });
    shims["scheduler"] = {
      __esModule: true,
      unstable_scheduleCallback: function (priority: any, callback: any) {
        return setTimeout(callback, 0);
      },
      unstable_cancelCallback: function (id: any) {
        clearTimeout(id);
      },
      unstable_shouldYield: function () {
        return false;
      },
      unstable_now: function () {
        return Date.now();
      },
      unstable_requestPaint: function () {},
      default: {},
    };
  }
  shims["prop-types"] = { __esModule: true, default: makePropTypes() };
  shims["classnames"] = { __esModule: true, default: cx };
  shims["clsx"] = { __esModule: true, default: cx, clsx: cx };

  /**
   * `class-variance-authority` + `tailwind-merge` — สองตัวนี้อยู่ในแทบทุกโปรเจกต์
   * ที่ใช้ shadcn/ui และถูกเรียกใช้เป็นฟังก์ชันจริง จึงต้องจำลองให้คืนสตริงคลาส
   */
  function toClassList(input: any): string {
    if (!input) return "";
    if (typeof input === "string") return input;
    if (Array.isArray(input)) {
      return input
        .map(toClassList)
        .filter(function (value) { return !!value; })
        .join(" ");
    }
    if (typeof input === "object") {
      var keys = Object.keys(input);
      var parts: string[] = [];
      for (var i = 0; i < keys.length; i++) {
        if (input[keys[i]]) parts.push(keys[i]);
      }
      return parts.join(" ");
    }
    return "";
  }
  function mergeClasses(input: any): string {
    var seen: any = {};
    var order: string[] = [];
    var parts = toClassList(input).split(/\s+/);
    for (var i = 0; i < parts.length; i++) {
      var token = parts[i];
      if (!token) continue;
      var group = token.indexOf("-") >= 0 ? token.split("-")[0] : token;
      if (seen[group] !== undefined) {
        order[seen[group]] = token; // ค่าหลังชนะ เหมือน tailwind-merge
      } else {
        seen[group] = order.length;
        order.push(token);
      }
    }
    return order.join(" ");
  }
  function makeCva(): any {
    var cva: any = function (base: any, config: any) {
      return function (props: any) {
        var out: any[] = [toClassList(base)];
        var options = config || {};
        var variants = options.variants || {};
        var keys = Object.keys(variants);
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          var table = variants[key] || {};
          var value = props && props[key] !== undefined ? props[key] : options.defaultVariants ? options.defaultVariants[key] : undefined;
          if (value !== undefined && table[value] !== undefined) out.push(toClassList(table[value]));
        }
        var compound = options.compoundVariants || [];
        for (var c = 0; c < compound.length; c++) {
          var rule = compound[c];
          var match = true;
          var ruleKeys = Object.keys(rule);
          for (var k = 0; k < ruleKeys.length; k++) {
            if (ruleKeys[k] === "class" || ruleKeys[k] === "className") continue;
            var expected = rule[ruleKeys[k]];
            var actual = props ? props[ruleKeys[k]] : undefined;
            if (actual === undefined && options.defaultVariants) actual = options.defaultVariants[ruleKeys[k]];
            if (String(actual) !== String(expected)) match = false;
          }
          if (match) out.push(toClassList(rule.class || rule.className));
        }
        if (props && props.class) out.push(toClassList(props.class));
        if (props && props.className) out.push(toClassList(props.className));
        return mergeClasses(out);
      };
    };
    return cva;
  }
  var cvaShim = makeCva();
  shims["class-variance-authority"] = { __esModule: true, cva: cvaShim, cx: cx, default: cvaShim };
  shims["tailwind-merge"] = {
    __esModule: true,
    twMerge: mergeClasses,
    twJoin: toClassList,
    extendTailwindMerge: function () {
      return mergeClasses;
    },
    default: mergeClasses,
  };
  if (typeof window !== "undefined") {
    (window as any).__gupanTwMerge = mergeClasses;
  }
  if (React) {
    var routerShim = createRouterShim();
    shims["react-router"] = routerShim;
    shims["react-router-dom"] = Object.assign({}, routerShim, {
      default: Object.assign({}, routerShim.default, { MemoryRouter: routerShim.MemoryRouter }),
    });
    var nextShims = createNextShims();
    shims["next/link"] = { __esModule: true, default: nextShims.Link };
    shims["next/image"] = { __esModule: true, default: nextShims.Image };
    shims["next/head"] = { __esModule: true, default: nextShims.Head };
    shims["next/router"] = Object.assign({ __esModule: true }, nextShims, { default: nextShims });
    shims["next/navigation"] = Object.assign({ __esModule: true }, nextShims);
    shims["next/app"] = { __esModule: true, default: function (props: any) { return props.Component ? React.createElement(props.Component, props.pageProps || {}) : null; } };
    shims["next/document"] = { __esModule: true, default: { Head: nextShims.Head, Main: function () { return null; }, NextScript: function () { return null; } } };
    /**
     * ฟอนต์ของ Next: ทั้ง `import { Inter } from "next/font/google"` และ
     * `inter.variable` ต้องได้ค่าเป็นสตริง ไม่ใช่ undefined — ไม่งั้นแอปพังตอน
     * ประกอบ className
     */
    var fontFactory: any = function () {
      var font = { className: "", variable: "", style: {}, subsets: [], weight: [] };
      return new Proxy(font, {
        get: function (target: any, key: any) {
          if (key in target) return target[key];
          if (typeof key === "string") return "";
          return undefined;
        },
      });
    };
    var fontModule: any = new Proxy(
      { __esModule: true, default: fontFactory },
      {
        get: function (target: any, key: any) {
          if (key in target) return target[key];
          if (typeof key === "string") return fontFactory;
          return undefined;
        },
      },
    );
    shims["next/font/google"] = fontModule;
    shims["next/font/local"] = fontModule;

    // แพ็กเกจที่พบบ่อยในโปรเจกต์ Next — จำลองพอให้หน้าแรกเรนเดอร์ได้
    shims["next-themes"] = {
      __esModule: true,
      ThemeProvider: function (props: any) { return props && props.children !== undefined ? props.children : null; },
      useTheme: function () {
        return { theme: "light", setTheme: function () {}, resolvedTheme: "light", systemTheme: "light", themes: ["light"] };
      },
    };
    shims["next-seo"] = {
      __esModule: true,
      default: function () { return null; },
      NextSeo: function () { return null; },
      ArticleJsonLd: function () { return null; },
    };
    shims["next-auth/react"] = {
      __esModule: true,
      useSession: function () { return { data: null, status: "unauthenticated", update: function () {} }; },
      signIn: function () {},
      signOut: function () {},
      SessionProvider: function (props: any) { return props && props.children !== undefined ? props.children : null; },
    };
    shims["@vercel/analytics/react"] = { __esModule: true, Analytics: function () { return null; }, default: function () { return null; } };
    shims["@vercel/speed-insights/next"] = { __esModule: true, SpeedInsights: function () { return null; } };
  }

  /**
   * Preview ต้องซื่อสัตย์กับแอปจริง: ห้ามแทน dependency ที่ไม่มีด้วย stub เพราะ
   * stub ทำให้หน้าตา/interaction ต่างจาก build จริงและทำให้ผู้ใช้คิดว่าแอปผ่านแล้ว.
   * Dependency ที่รองรับต้องมี shim ระบุไว้ด้านบนเท่านั้น.
   */
  function unsupportedPackage(name: string): never {
    var message =
      "แพ็กเกจ " + name + " ยังไม่มีใน Preview Runtime — ต้องติดตั้งและ build โปรเจกต์จริงก่อน";
    problems.push(message);
    throw new Error(message);
  }

  var moduleCache: any = {};
  var factories: any = {};
  var loading: any = {};
  var env = cfg.env || {};
  var importMeta = { env: env, url: cfg.url || "about:srcdoc", hot: undefined };
  var processShim = {
    env: env,
    platform: "browser",
    browser: true,
    version: "v18.0.0",
    versions: {},
    nextTick: function (fn: any) {
      setTimeout(fn, 0);
    },
    argv: [],
    cwd: function () {
      return "/";
    },
  };

  function normalize(spec: string, from: string): string {
    if (spec.charAt(0) === "/") return spec.replace(/^\/+/, "");
    if (spec.charAt(0) !== ".") return spec;
    var base = from ? from.split("/") : [];
    if (base.length) base.pop();
    var parts = spec.split("/");
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (part === "" || part === ".") continue;
      if (part === "..") {
        base.pop();
        continue;
      }
      base.push(part);
    }
    return base.join("/");
  }

  var EXTS = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs", ".json", ".css"];
  /** สไตล์ที่ถูกฉีดไปแล้ว — import CSS ต้องไม่ทำให้แอพพัง */
  var stylePaths: any = {};
  for (var styleIndex = 0; styleIndex < cfg.styles.length; styleIndex++) {
    stylePaths[cfg.styles[styleIndex].path] = true;
  }
  function hasModule(path: string): boolean {
    return cfg.modules[path] !== undefined || stylePaths[path] === true;
  }
  function resolveLocal(path: string): string | null {
    if (hasModule(path)) return path;
    for (var i = 0; i < EXTS.length; i++) if (hasModule(path + EXTS[i])) return path + EXTS[i];
    for (var j = 0; j < EXTS.length; j++) if (hasModule(path + "/index" + EXTS[j])) return path + "/index" + EXTS[j];
    return null;
  }

  function cssModuleProxy(): any {
    var cache: any = {};
    return new Proxy(cache, {
      get: function (target: any, key: string) {
        if (key === "__esModule") return true;
        if (key === "default") return target;
        if (typeof key !== "string") return (target as any)[key];
        if (target[key] === undefined) target[key] = key;
        return target[key];
      },
    });
  }

  function factoryFor(path: string): any {
    if (factories[path]) return factories[path];
    var code = cfg.modules[path];
    var fn = new Function(
      "module",
      "exports",
      "require",
      "process",
      "__gupanEnv",
      "__gupanImportMeta",
      "__gupanUrl",
      "__gupanImport",
      code,
    );
    var modulePath = path;
    factories["__import:" + path] = function () {
      return function (spec: string) {
        return gupanImport(spec, modulePath);
      };
    };
    factories[path] = fn;
    return fn;
  }

  function load(path: string): any {
    if (moduleCache[path]) return moduleCache[path].exports;
    if (loading[path]) return loading[path].exports || {};
    var module = { exports: {}, id: path, loaded: false };
    moduleCache[path] = module;
    loading[path] = module;
    try {
      var fn = factoryFor(path);
      fn(
        module,
        module.exports,
        makeRequire(path),
        processShim,
        env,
        importMeta,
        importMeta.url,
        factories["__import:" + path](),
      );
      module.loaded = true;
    } catch (error) {
      var message = error && (error as any).message ? (error as any).message : String(error);
      problems.push("โมดูล " + path + " ทำงานไม่สำเร็จ: " + message);
      console.error("[gupan] " + path + " → " + message);
      if ((error as any) && (error as any).stack) console.error((error as any).stack);
      if (path === cfg.entry) throw error;
    } finally {
      delete loading[path];
    }
    return module.exports;
  }

  function requireExternal(spec: string): any {
    if (shims[spec] !== undefined) return shims[spec];
    // deep import ของแพ็กเกจที่ shim ไว้ (เช่น lucide-react/dist/…)
    var keys = Object.keys(shims);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (spec.indexOf(key + "/") === 0) return shims[key];
    }
    return undefined;
  }

  /** `import("…")` ที่ถูกเขียนทับให้ใช้ require + แปลงเป็น namespace แบบ ESM */
  function gupanImport(spec: string, from: string): Promise<any> {
    return new Promise(function (resolve, reject) {
      try {
        var value = makeRequire(from)(spec);
        resolve(value && value.__esModule ? value : { __esModule: true, default: value });
      } catch (error) {
        reject(error);
      }
    });
  }

  function makeRequire(from: string): any {
    var req: any = function (spec: string) {
      var external = requireExternal(spec);
      if (external !== undefined) return external;
      var pkgName = spec.charAt(0) === "@" ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
      var hit = resolveLocal(normalize(spec, from));
      if (hit) {
        if (/\.css$/.test(hit)) return /\.module\.css$/.test(hit) ? cssModuleProxy() : {};
        return load(hit);
      }
      if (spec.charAt(0) === "." || spec.charAt(0) === "/") {
        var message = "ไม่พบโมดูล " + spec + ' (import จาก ' + from + ") ในโปรเจกต์นี้";
        problems.push(message);
        throw new Error(message);
      }
      unsupportedPackage(pkgName);
    };
    req.resolve = function (spec: string) {
      return normalize(spec, from);
    };
    req.cache = moduleCache;
    req.keys = function () {
      return Object.keys(cfg.modules);
    };
    return req;
  }

  /**
   * การ์ดกลางจอสำหรับกรณีที่ "ไม่มีอะไรเรนเดอร์ได้เลย" — จอขาวคือสิ่งที่ผู้ใช้
   * ตีความว่าแอปพัง จึงต้องมีข้อความบอกเสมอ
   */
  function showFatal(title: string, detail: string): void {
    function mount(): void {
      if (!document.body) return;
      if (document.querySelector("[data-gupan-fatal]")) return;
      var box = document.createElement("div");
      box.setAttribute("data-gupan-fatal", "1");
      box.style.cssText =
        "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:28px;" +
        "background:#16151a;color:#f3f0ff;font:14px/1.75 system-ui,-apple-system,Segoe UI,sans-serif;" +
        "text-align:left;z-index:2147483646;overflow:auto";
      var inner = document.createElement("div");
      inner.style.cssText = "max-width:560px";
      var heading = document.createElement("div");
      heading.style.cssText = "font-weight:600;font-size:17px;margin-bottom:10px;color:#fff";
      heading.textContent = title;
      var body = document.createElement("div");
      body.style.cssText = "white-space:pre-wrap;opacity:.9";
      body.textContent = detail;
      var hint = document.createElement("div");
      hint.style.cssText = "margin-top:14px;opacity:.7";
      hint.textContent =
        "นี่เป็น browser preview เท่านั้น ไม่ใช่ผล build จริง — ให้รันโปรเจกต์ใน E2B เพื่อยืนยัน dependency และ runtime";
      inner.appendChild(heading);
      inner.appendChild(body);
      inner.appendChild(hint);
      box.appendChild(inner);
      document.body.appendChild(box);
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount);
    } else {
      mount();
    }
  }

  // ── 6) แบนเนอร์วินิจฉัย (เฉพาะเมื่อมีปัญหา) ────────────────────────────
  function showDiagnostics(): void {
    if (!problems.length) return;
    var unique = problems.filter(function (item, index) {
      return problems.indexOf(item) === index;
    });
    var box = document.createElement("div");
    box.setAttribute("role", "status");
    box.setAttribute("data-gupan-diagnostics", "1");
    box.style.cssText =
      "position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;max-height:38vh;overflow:auto;" +
      "background:#1b1c20;color:#f3f0ff;border:1px solid #3a3b42;border-radius:12px;padding:10px 12px;" +
      "font:12px/1.6 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.45)";
    var title = document.createElement("div");
    title.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:600";
    var label = document.createElement("span");
    label.textContent = "พรีวิวนี้มีข้อจำกัด " + unique.length + " ข้อ (รันในเบราว์เซอร์)";
    var close = document.createElement("button");
    close.textContent = "ปิด";
    close.style.cssText = "background:#2c2d33;color:#e8e6f0;border:1px solid #45464e;border-radius:8px;padding:2px 8px;font:inherit;cursor:pointer";
    close.onclick = function () {
      box.remove();
    };
    title.appendChild(label);
    title.appendChild(close);
    box.appendChild(title);
    var list = document.createElement("ul");
    list.style.cssText = "margin:8px 0 0;padding-left:18px";
    for (var i = 0; i < unique.length && i < 12; i++) {
      var item = document.createElement("li");
      item.textContent = unique[i];
      list.appendChild(item);
    }
    box.appendChild(list);
    var hint = document.createElement("p");
    hint.style.cssText = "margin:8px 0 0;opacity:.75";
    hint.textContent = "ยังไม่ถือว่าแอปผ่านจนกว่า Build/Run/Verify ใน E2B จะผ่าน";
    box.appendChild(hint);
    document.body.appendChild(box);
  }

  // ── 7) รัน entry ─────────────────────────────────────────────────────
  /**
   * ถ้าแอปโยน error ตอนเรนเดอร์ (เช่น พึ่ง API/แพ็กเกจที่ออฟไลน์ไม่มี) React จะ
   * unmount ทั้งต้นไม้จนได้หน้าเปล่า — boundary นี้ทำให้เห็นข้อความที่อ่านรู้เรื่อง
   */
  function mountWithBoundary(element: any): any {
    if (!React || !React.Component) return element;
    function Boundary(this: any, props: any) {
      React.Component.call(this, props);
      this.state = { error: null };
    }
    Boundary.prototype = Object.create(React.Component.prototype);
    Boundary.prototype.constructor = Boundary;
    Boundary.getDerivedStateFromError = function (error: any) {
      return { error: error };
    };
    Boundary.prototype.componentDidCatch = function (error: any) {
      problems.push("แอปเรนเดอร์ไม่ครบ: " + (error && error.message ? error.message : String(error)));
      showDiagnostics();
    };
    Boundary.prototype.render = function () {
      if (this.state.error) {
        // ต้องเป็น React element เท่านั้น — คืน DOM node ตรง ๆ ไม่ได้ (React error #31)
        var message =
          (this.state.error && this.state.error.message) || String(this.state.error);
        return React.createElement(
          "div",
          {
            style: {
              margin: 0,
              padding: "24px",
              font: "14px/1.7 system-ui,-apple-system,Segoe UI,sans-serif",
              color: "#241f2e",
              background: "#fdf7ff",
            },
          },
          React.createElement(
            "h2",
            { style: { margin: "0 0 8px", fontSize: "17px" } },
            "หน้านี้รันได้ไม่ครบในพรีวิว",
          ),
          React.createElement("p", { style: { margin: "0 0 8px" } }, message),
          React.createElement(
            "p",
            { style: { margin: 0, opacity: 0.7 } },
            "Preview นี้ไม่สามารถยืนยัน npm dependency หรือ server runtime ได้ — ต้อง Build/Run ใน E2B เพื่อยืนยันแอปจริง",
          ),
        );
      }
      return this.props.children;
    };
    return React.createElement(Boundary, null, element);
  }
  (window as any).__gupanMountWithBoundary = mountWithBoundary;

  var entryFailed: any = null;
  if (!React) {
    problems.push("ไม่พบ React ในเอกสารพรีวิว (ไฟล์ vendor ไม่ถูกโหลด)");
    showFatal(
      "โหลด React สำหรับพรีวิวไม่สำเร็จ",
      "ไฟล์ React ที่ฝังมากับเอกสารพรีวิวไม่ถูกเรียกใช้ — ลองกดปุ่มโหลดพรีวิวใหม่ หรือตรวจว่าหน้าแอปเสิร์ฟ /vendor/react/* ได้",
    );
  } else if (!cfg.entry) {
    problems.push("ไม่พบโมดูลตั้งต้นของโปรเจกต์");
    showFatal(
      "หาไฟล์ตั้งต้นของแอปไม่เจอ",
      "หน้า HTML ไม่ได้อ้าง <script src> และไม่พบไฟล์ src/main.* หรือ src/index.* ในโปรเจกต์\n" +
        "ตรวจชื่อไฟล์ในแท็บ Code แล้วกดโหลดพรีวิวใหม่",
    );
  } else {
    try {
      load(cfg.entry);
    } catch (error) {
      entryFailed = error;
      // รายละเอียดถูกส่งเข้า console แล้วด้านบน
    }
  }
  if (entryFailed) {
    showFatal(
      "แอปนี้ยังรันในพรีวิวไม่ได้",
      (entryFailed && entryFailed.message) || String(entryFailed),
    );
  }

  // เก็บกวาด: ถ้ามีปัญหาแต่ยังไม่ทัน append ให้รอ DOM พร้อมก่อน
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showDiagnostics);
  } else {
    showDiagnostics();
  }
}

/** ซอร์สของ runner ที่ฝังลงเอกสารพรีวิว (เรียกใช้ทันทีเมื่อโหลด) */
export function runnerSource(): string {
  return `;(${gupanRunner.toString()})();`;
}
