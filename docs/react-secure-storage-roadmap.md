# react-secure-storage — Roadmap

**Baseline:** v1.3.2 · 23 November 2026
**Status:** 1.3.3 on branch `release/1.3.3` and 1.4.0 on branch `release/1.4` (24 November 2026), not yet released. v2 work goes on `release/2.0`.
**Reported adoption:** ~75k weekly npm downloads
**Maintainer model:** solo maintainer — this is a prioritised checklist, not a team process. Track each item as a GitHub issue using its ID.

## Goal

1. **Make it correct everywhere it runs** — SSR (Next.js, Remix/React Router) and CSR (Vite, CRA), proven by automated tests and CI on every PR.
2. **Make its security claims honest** — today it is obfuscation at rest, not protection against a determined attacker.
3. **Replace the fingerprint key in v2** with a non-extractable Web Crypto key, which fixes key strength, data loss from fingerprint drift, tamper detection, and the unmaintained `crypto-js` dependency together.

Features (TTL, namespaces, hooks, cross-tab sync) come after these, and only where users ask for them.

## Confirmed issues in v1.3.2 (from source review)

**Status:** C1–C8, C13 and C14 fixed in 1.3.3 with tests; C11 mitigated for booleans and numbers. C9–C12 remain for 2.0.

| # | Issue | Location | Fixed in |
|---|---|---|---|
| C1 | `clear()` calls `localStorage.clear()` and wipes keys the library does not own | `src/lib/index.ts:82` | 1.3.3 |
| C2 | Changing a value's type (e.g. string → number) leaves a stale `@secure.<type>.key` entry; after reload either entry may win | `src/lib/index.ts:23` | 1.3.3 |
| C3 | `removeItem()` derives the storage key from the in-memory copy; if it is missing it removes the wrong key and orphans the real one | `src/lib/index.ts:69-74` | 1.3.3 |
| C4 | `setItem` / `removeItem` / `clear` access `localStorage` unguarded → `ReferenceError` on the server | `src/lib/index.ts:52,74,82` | 1.3.3 |
| C5 | Singleton is created and the cache loaded at import time; on the server it is module-level state shared across requests | `src/lib/index.ts:6,35,86` | 1.3.3 |
| C6 | Server render returns `null` from `getItem`, client returns the value → hydration mismatch unless consumers defer the read; no documented pattern | usage | 1.3.3 (docs) / 1.4 (hook) |
| C7 | `getItem` reads only the startup cache; writes from other tabs are never seen | `src/lib/index.ts:62` | 1.4 |
| C8 | Every `setItem` recomputes the fingerprint (font + canvas probing) | `src/lib/index.ts:51`, `encryption.ts:13` | 1.3.3 |
| C9 | Key = 32-bit murmurhash fingerprint + a hash key shipped in the bundle (default hardcoded) → brute-forceable offline; copied data *can* be decrypted elsewhere | `fingerprint.lib.ts:55`, `fingerprint.ts:5` | 2.0 |
| C10 | Key changes when user agent, screen, fonts or canvas change (browser update, external monitor) → all data silently reads as `null` | `fingerprint.lib.ts:16-50` | 2.0 |
| C11 | AES-CBC via `crypto-js` passphrase mode (MD5 KDF), no authentication. **Measured:** ~0.4% of wrong-key decrypts return garbage instead of `null` (20k trials per value type). 1.3.3 rejects invalid booleans/numbers; strings need v2 | `encryption.ts` | 1.3.3 (partial) / 2.0 |
| C12 | `crypto-js` development discontinued (2023) | `package.json` | 2.0 |
| C13 | No real tests (only the CRA placeholder), no CI, `dist/` committed | repo | 1.3.3 |
| C14 | Found by e2e: native Node ESM `import x from "react-secure-storage"` (React Router / Remix / Astro SSR) returned `{ default }`, so every method was undefined | `dist/index.js` (CJS output) | 1.3.3 |

## Supported environments (target matrix)

| Environment | Rendering | Must hold |
|---|---|---|
| Node.js 20 / 22 / 24, no `window` (Node 18 is EOL and unsupported by the test tooling) | SSR | Import never throws; `getItem` → `null`; `setItem`/`removeItem`/`clear` are no-ops (no throw, no shared state) |
| Next.js App Router (client component) | SSR + hydration | No hydration warning with the documented pattern; value present after mount |
| Next.js Pages Router | SSR + hydration | Same as above |
| React Router v7 / Remix (framework mode) | SSR + hydration | Same as above |
| Vite + React | CSR | Read/write/persist across reload; `VITE_` env vars honoured |
| Create React App | CSR | Not tested end-to-end: CRA is deprecated. `REACT_APP_` env vars covered by unit tests |
| Chromium, Firefox, WebKit | Browser | Data stable across reloads; identical results across engines |

## Phase 1 — Test harness and CI ✅ (1.3.3)

**Implementation notes**
- Unit/SSR/legacy: `vitest.config.mts`, `tests/unit`, `tests/ssr`, `tests/legacy` (84 tests). Coverage thresholds enforced (currently ~91% lines).
- Legacy fixtures are generated live from the published 1.3.2 package (`react-secure-storage-legacy` devDependency) instead of committed ciphertext files, covering upgrade and downgrade.
- E2E: `tests/fixtures/{next,vite,react-router}`, `tests/e2e/storage.spec.ts`, `scripts/setup-e2e.mjs`, `playwright.config.ts` (22 tests).
- CI: `.github/workflows/ci.yml`, `release.yml`, `.github/dependabot.yml`.
- Not done: ESLint (typecheck only), CRA fixture (deprecated), Node 18 matrix (EOL).

### RST-001 — Unit test suite [P0]
- [x] Replace the CRA test runner with **Vitest** (per-file environments: `jsdom` for browser, `node` for SSR).
- [x] `setItem`/`getItem`/`removeItem`/`clear` for string, number, boolean, object, Unicode, empty string, `0`, `false`.
- [x] Prefix behaviour: default `@secure.`, custom prefix with and without trailing `.`, unrelated keys untouched (C1).
- [x] Type change on same key leaves exactly one storage entry (C2); `removeItem` removes the right entry when cache is missing (C3).
- [x] Corrupted ciphertext, unknown type letter, and changed fingerprint → `null`, never throws (C10, C11).
- [x] `SECURE_LOCAL_STORAGE_DISABLED_KEYS` / `_PREFIX` / `_HASH_KEY` with each framework prefix (`REACT_APP_`, `NEXT_PUBLIC_`, `VITE_`, none).
- [x] Fingerprint computed once per page load (C8).

**Acceptance:** `npm test` runs locally and in CI; coverage of `src/lib` ≥ 90% lines.

### RST-002 — SSR test suite [P0]
- [x] `@vitest-environment node` test: `import` the **built** package with no `window`, `document`, `localStorage`, or `navigator` defined → no throw (C4, C5).
- [x] On the server: `getItem` → `null`; `setItem`/`removeItem`/`clear` do not throw and do not leak state between two simulated requests.
- [x] `renderToString` of a component that reads secure storage succeeds.
- [x] Hydration test: `renderToString` in node → `hydrateRoot` in jsdom with stored data present → no hydration mismatch warning when using the documented pattern (C6).
- [x] Guard test: covered by importing the built package in plain Node (any top-level browser global access throws) and by a jsdom test asserting localStorage is not touched at import.
- [x] Native Node ESM, `require()` and `require().default` all return the same instance (C14).

**Acceptance:** SSR suite runs in CI on Node 18/20/22.

### RST-003 — Legacy ciphertext fixtures [P0]
- [x] Write entries with the published v1.3.2 (each data type, custom prefix, custom hash key, disabled keys) in a fixed fingerprint environment, read with current code, and vice versa. Commit static fixtures before v2 changes the format.
- [x] Test every future version reads them (1.x) or migrates them (2.0).
- [x] Measure how often a wrong-key decrypt returns garbage rather than `null` (C11).

**Acceptance:** Fixtures committed; compatibility test part of CI.

### RST-004 — Real-framework integration tests [P0]
- [x] Fixture apps under `tests/fixtures/`: `next-app-router`, `next-pages-router`, `react-router-ssr`, `vite-react`, `cra`.
- [x] Each installs the library from an `npm pack` tarball (tests the published artifact, not `src`).
- [x] Each runs a production build (`next build`, `vite build`, …) — build must not fail or warn about browser globals.
- [x] **Playwright** against each served app: set value → reload → value persists; no hydration errors in console; value correct after first client render.
- [x] Browser engines: Chromium, Firefox, WebKit (on the Vite fixture at minimum; Chromium for the rest).
- [ ] Cross-tab: write in tab A, read in tab B (once C7 is fixed in 1.4).

**Acceptance:** All fixtures green in CI; a failing SSR/CSR scenario blocks merge.

### RST-005 — GitHub Actions [P0]
- [x] `.github/workflows/ci.yml` on `push` and `pull_request`:
  - `lint-typecheck` — ESLint + `tsc --noEmit`
  - `unit-ssr` — Vitest unit + SSR suites, matrix Node 18 / 20 / 22
  - `build-pack` — build library, verify `dist/` contents and `types`, `npm pack`, upload tarball artifact
  - `integration` — download tarball, run RST-004 fixtures + Playwright (matrix per fixture)
  - `size` — bundle-size check against baseline budget
- [x] Cache npm and Playwright browsers; upload Playwright traces on failure.
- [ ] Branch protection on `master`: all jobs required. **Manual step in GitHub settings.**
- [ ] Add `NPM_TOKEN` repository secret for `release.yml`. **Manual step.**
- [x] Stop committing `dist/`; build it in CI and on publish.
- [x] `.github/workflows/release.yml`: on tag, run full CI then `npm publish --provenance`.
- [x] Dependabot for npm and GitHub Actions.

**Acceptance:** Required checks visible on every PR; release only possible from a green tag.

## Phase 2 — v1.3.3 patch: correctness and SSR/CSR safety (non-breaking)

### RST-010 — Storage-safe operations [P0]
- [x] `clear()` removes only keys with the library prefix (C1).
- [x] `setItem` removes other-type entries for the same key before writing (C2).
- [x] `removeItem` removes all `@secure.{b,j,n,s}.key` variants (C3).

### RST-011 — SSR-safe core [P0]
- [x] Single `isBrowser()` check (`typeof window !== "undefined" && window.localStorage`), also handling blocked storage (Safari private mode, sandboxed iframes) via try/catch.
- [x] Lazy initialisation: load cache and compute fingerprint on first client-side call, not at import (C5, C8).
- [x] Server-side calls are no-ops and keep no module-level data (C4, C5).
- [x] `"sideEffects": false`, `"files": ["dist"]`.
- [ ] **Moved to 1.4:** `exports` map / ESM build. An `exports` map blocks deep imports (breaking for a patch), and a separate ESM build would create a second singleton (dual-package hazard). 1.3.3 instead makes the single CommonJS entry work for native ESM imports (C14).

### RST-012 — Docs for SSR/CSR [P0]
- [x] README section "Using with SSR" with the hydration-safe pattern (read in `useEffect`, or the hook from RST-020) for Next.js App/Pages Router and React Router.
- [x] README section for Vite: existing `process.env` define setup verified by the Vite fixture.
- [x] Replace "secure"/"can't be decrypted in another browser" wording with an honest limitations section; add `SECURITY.md` (C9).

**Acceptance (1.3.3):** RST-001–005 green; no public API change; legacy fixtures still readable. ✅ (pending first CI run on GitHub)

**Behaviour changes to call out in release notes:** `clear()` keeps non-library keys; `require("react-secure-storage")` now returns the instance directly (`.default` still works).

## Phase 3 — v1.4 ✅ (implemented on branch `release/1.4`)

### RST-020 — `useSecureStorage` hook [P1] ✅
- [x] `const [value, setValue, remove] = useSecureStorage(key, initial)`, built on `useSyncExternalStore` with a server snapshot: `initial` during SSR and hydration, the stored value after mount; in client-only apps the stored value on the first render.
- [x] Exported from `react-secure-storage/react`; React is an optional peer dependency (>=18), the core has no React dependency.
- [x] Tests: unit (updates, updater function, removal, shared key, key change, unmount), SSR render, hydration without mismatch, e2e in Next.js, Vite and React Router.

### RST-021 — Read-through cache and cross-tab sync [P1] ✅
- [x] `storage` event listener updates the cache per key (handles type changes and `localStorage.clear()` in other tabs) (C7).
- [x] `onChange(listener)`; the hook re-renders on changes from this tab and other tabs.
- [x] E2E: two real tabs stay in sync for set, increment and clear.

### RST-022 — Error visibility [P1] ✅
- [x] `onError(listener)` for `decrypt`, `write` (quota) and `unavailable` errors; never includes values.
- [x] With a listener registered, failed writes are reported instead of thrown; without one, the previous throwing behaviour is kept.
- [x] Fixed: a failed write no longer leaves the unsaved value in the in-memory cache.

### RST-023 — Package exports [P1] ✅
- [x] `exports` map: `.`, `./react`, `./dist/*` (keeps deep imports working), `./package.json`; `react/package.json` fallback for resolvers without `exports` support.
- [x] **Decision:** no separate ESM build. A single CommonJS entry per path avoids two storage instances (dual-package hazard); the post-build interop step makes native Node ESM default and named imports work for both entries. Verified by resolving the package by name in Node ESM and CommonJS.
- [x] Size budget split into core (12.5 KB) and the optional React entry (1.5 KB).

## Phase 4 — v2.0: replace the fingerprint key (breaking)

### RST-030 — Web Crypto key design [P0 for v2]
- [ ] Generate a **non-extractable AES-GCM `CryptoKey`** per origin, persist it in IndexedDB; random 96-bit nonce per write (fixes C9–C12).
- [ ] Versioned payload: `{ v, alg, iv, ct }`.
- [ ] Async API (`await storage.getItem(key)`) with an in-memory cache for fast reads; document why it is async.
- [ ] SSR: same no-op contract as v1; key creation only in the browser.
- [ ] Document what it does and does not protect: copied localStorage is unreadable elsewhere; same-origin XSS can still *use* the key.

### RST-031 — Migration from v1 [P0 for v2]
- [ ] On first load, read v1 entries with the legacy fingerprint key, re-encrypt with the new key, remove old entries; interruption-safe.
- [ ] Entries that fail legacy decryption are left untouched and reported via `onError`.
- [ ] Verified against RST-003 fixtures; migration guide published.

### RST-032 — Remove `crypto-js` and `murmurhash-js` [P1 for v2]
- [ ] Keep a minimal legacy decrypt path only for migration (or a separate `react-secure-storage/legacy` entry), then drop in v3.

## Deferred (only if users ask)

- TTL / `expiresIn`
- Namespaces beyond the existing prefix
- sessionStorage adapter
- Key rotation
- Custom serialisers, bulk operations

## Release plan

| Version | Scope | Gate |
|---|---|---|
| 1.3.3 | RST-001–005, RST-010–012 | CI green incl. SSR + all framework fixtures; legacy fixtures readable |
| 1.4.0 | RST-020–023 | Hook SSR/hydration tests green ✅ |
| 2.0.0 | RST-030–032 | Migration tests on fixtures; migration guide; prerelease tested in at least one Next.js and one Vite app |

## Definition of done

- [ ] Tests added (unit + SSR where relevant) and CI green.
- [ ] No regression in legacy fixtures.
- [ ] README / CHANGELOG updated.
