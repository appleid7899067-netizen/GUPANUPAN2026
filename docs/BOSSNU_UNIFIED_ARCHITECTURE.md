# BOSSNU UNIFIED Architecture

## Runtime pipeline

```text
User Browser / Canvas UI
        │
        ▼
Boss Core / Agent Orchestrator
        │
        ├── Architect / Intent
        ├── Code Generator
        ├── Tool Router
        └── Verification Gate
                │
                ▼
        Preview / Sandbox Adapter
                │
        ┌───────┴────────┐
        │ Telemetry      │
        │ build/static/  │
        │ runtime        │
        └───────┬────────┘
                │
          error? ─────────────── no ──► Preview OK
                │
                ▼
       Context Minimizer
                │
                ▼
       Remediation / Patch Agent
                │
        exact search/replace
                │
                ▼
        Sandbox re-run
                │
                └──────────► Verify
                              │
                     max 3 healing attempts
                              │
                              ▼
                       Known-good artifact
                              │
                              ▼
                    Puter Zero-Config Layer
                    ├── Auth
                    ├── KV / app data
                    ├── File storage
                    └── Hosting
```

## Self-healing contract

1. Telemetry is captured from build, static analysis, and preview runtime.
2. Errors are classified as dependency, syntax, type, runtime, or unknown.
3. Context is minimized before a remediation model is called.
4. Dependency failures can be handled deterministically.
5. Remediation returns exact search/replace patches, not whole-file rewrites.
6. Patches are applied only when the search target is unique.
7. The artifact is re-run and verified after each repair.
8. The healing guard stops after three attempts.
9. When the guard is exhausted, the last known-good artifact is preserved and the concrete evidence is surfaced.

## Puter Abstraction Layer

Generated apps receive window.BossnuBackend automatically:

- BossnuBackend.db.get/set/list
- BossnuBackend.storage.read/write
- BossnuBackend.auth.getUser/signIn/signOut

The generated artifact also receives the Puter.js runtime and preview telemetry bridge.

Puter's current documentation confirms KV storage, filesystem writes, authentication, and programmatic hosting through puter.hosting.create(subdomain, dirPath). The application should still verify the actual hosting result before showing a publish-success state.

## Publish contract

```text
Generated artifact
   ↓
Verification Gate
   ↓
Write artifact to Puter filesystem
   ↓
puter.hosting.create(subdomain, dirPath)
   ↓
Read returned Subdomain evidence
   ↓
Show https://<subdomain>.puter.site
```

Publishing is deliberately separated from generation. A model response is never treated as deployment evidence.

## Current implementation boundaries

- Existing boss-engine.ts remains the lower-level planning, routing, recovery, and verification engine.
- boss-core.ts is the higher-level control contract.
- boss-self-healing.ts provides telemetry diagnosis, context minimization, bounded retries, and patch primitives.
- puter-backend.ts provides the generated-app zero-config facade.
- puter-publisher.ts provides the hosting capability boundary.
- builder/send.ts connects generated artifacts to the Puter runtime and existing verification gates.

The sandbox adapter remains intentionally separate so a WebContainer or Sandpack implementation can be connected without replacing the current builder.