/**
 * BOSSNU Puter Abstraction Layer (PAL)
 * Zero-config runtime facade for generated apps.
 *
 * The host app owns model/auth selection. Generated apps receive only this
 * safe browser facade, never server secrets.
 */

export type BossnuBackend = {
  db: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<unknown>;
    list: (prefix?: string) => Promise<unknown>;
  };
  storage: {
    write: (path: string, data: unknown) => Promise<unknown>;
    read: (path: string) => Promise<unknown>;
  };
  auth: {
    getUser: () => Promise<unknown>;
    signIn: () => Promise<unknown>;
    signOut: () => Promise<unknown>;
  };
  available: () => boolean;
};

function puter() {
  return typeof window !== "undefined" ? (window as Window & { puter?: any }).puter : undefined;
}

export function createBossnuBackend(): BossnuBackend {
  return {
    db: {
      get: async (key) => {
        const p = puter();
        if (!p?.kv?.get) throw new Error("PUTER_KV_UNAVAILABLE");
        return p.kv.get(key);
      },
      set: async (key, value) => {
        const p = puter();
        if (!p?.kv?.set) throw new Error("PUTER_KV_UNAVAILABLE");
        return p.kv.set(key, typeof value === "string" ? value : JSON.stringify(value));
      },
      list: async (prefix = "") => {
        const p = puter();
        if (!p?.kv?.list) throw new Error("PUTER_KV_UNAVAILABLE");
        return p.kv.list(prefix);
      },
    },
    storage: {
      write: async (path, data) => {
        const p = puter();
        if (!p?.fs?.write) throw new Error("PUTER_FS_UNAVAILABLE");
        return p.fs.write(path, data);
      },
      read: async (path) => {
        const p = puter();
        if (!p?.fs?.read) throw new Error("PUTER_FS_UNAVAILABLE");
        return p.fs.read(path);
      },
    },
    auth: {
      getUser: async () => {
        const p = puter();
        if (!p?.auth?.getUser) throw new Error("PUTER_AUTH_UNAVAILABLE");
        return p.auth.getUser();
      },
      signIn: async () => {
        const p = puter();
        if (!p?.auth?.signIn) throw new Error("PUTER_AUTH_UNAVAILABLE");
        return p.auth.signIn();
      },
      signOut: async () => {
        const p = puter();
        if (!p?.auth?.signOut) throw new Error("PUTER_AUTH_UNAVAILABLE");
        return p.auth.signOut();
      },
    },
    available: () => Boolean(puter()),
  };
}

/**
 * Injected into generated artifacts. The generated app can call
 * window.BossnuBackend.db/auth/storage without configuring another backend.
 */
export function buildBossnuClientSdkInjection(): string {
  return `<script src="https://js.puter.com/v2/"></script>
<script>
(() => {
  const p = window.puter;
  window.BossnuBackend = {
    db: {
      get: async (key) => p?.kv?.get ? p.kv.get(key) : Promise.reject(new Error("PUTER_KV_UNAVAILABLE")),
      set: async (key, val) => p?.kv?.set ? p.kv.set(key, typeof val === "string" ? val : JSON.stringify(val)) : Promise.reject(new Error("PUTER_KV_UNAVAILABLE")),
      list: async (prefix = "") => p?.kv?.list ? p.kv.list(prefix) : Promise.reject(new Error("PUTER_KV_UNAVAILABLE"))
    },
    storage: {
      write: async (path, data) => p?.fs?.write ? p.fs.write(path, data) : Promise.reject(new Error("PUTER_FS_UNAVAILABLE")),
      read: async (path) => p?.fs?.read ? p.fs.read(path) : Promise.reject(new Error("PUTER_FS_UNAVAILABLE"))
    },
    auth: {
      getUser: async () => p?.auth?.getUser ? p.auth.getUser() : Promise.reject(new Error("PUTER_AUTH_UNAVAILABLE")),
      signIn: async () => p?.auth?.signIn ? p.auth.signIn() : Promise.reject(new Error("PUTER_AUTH_UNAVAILABLE")),
      signOut: async () => p?.auth?.signOut ? p.auth.signOut() : Promise.reject(new Error("PUTER_AUTH_UNAVAILABLE"))
    }
  };
})();
</script>`;
}


export function injectBossnuRuntime(html: string, options: { telemetry?: boolean } = {}): string {
  if (!html.trim() || /BossnuBackend|bossnu-preview/.test(html)) return html;
  const sdk = buildBossnuClientSdkInjection();
  const telemetry = options.telemetry ? `\n<script>\n(() => {\n  const send = (event) => window.parent?.postMessage({ source: "bossnu-preview", ...event }, "*");\n  window.addEventListener("error", (e) => send({ kind: "runtime", message: e.message || "Runtime error", stack: e.error?.stack || "" }));\n  window.addEventListener("unhandledrejection", (e) => send({ kind: "runtime", message: String(e.reason?.message || e.reason || "Unhandled rejection"), stack: e.reason?.stack || "" }));\n  const original = console.error;\n  console.error = (...args) => { try { send({ kind: "runtime", message: args.map(String).join(" ") }); } catch {} original(...args); };\n})();\n</script>` : "";
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, sdk + telemetry + "\n</head>");
  if (/<body[\s>]/i.test(html)) return html.replace(/<body([\s>])/i, sdk + telemetry + "\n<body$1");
  return sdk + telemetry + html;
}
