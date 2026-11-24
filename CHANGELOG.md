# Changelog

## 1.4.0

### Added
- `useSecureStorage(key, initialValue)` React hook, imported from `react-secure-storage/react`. Works like `useState`, persists to secure storage, keeps every component using the same key in sync, and is hydration-safe: the server and the hydration render use `initialValue`, then the stored value appears after mount. Requires React 18+ (optional peer dependency; the core still has no React dependency).
- Cross-tab sync: values changed in another tab or window are picked up through the browser `storage` event, so `getItem` and the hook no longer return stale data.
- `onChange(listener)` to subscribe to changes made in this tab and in other tabs.
- `onError(listener)` to observe unreadable values (`decrypt`), rejected writes such as quota exceeded (`write`), and blocked storage (`unavailable`). Errors never include stored values. While a listener is registered, failed writes are reported instead of thrown.
- Package `exports` map with the `./react` entry. Deep imports under `react-secure-storage/dist/*` keep working.
- Exported TypeScript types: `SecureStorageValue`, `SecureStorageError`, `ChangeListener`, `ErrorListener`, `SetSecureValue`.

### Fixed
- When a write failed (e.g. quota exceeded), `getItem` returned the new value for the rest of the session even though it was never stored.

## 1.3.3

### Fixed
- `clear()` removed **every** key in localStorage, including data from other libraries and the app. It now removes only entries written by react-secure-storage (matching the configured prefix).
- Calling `setItem`, `removeItem` or `clear` during server-side rendering threw `ReferenceError: localStorage is not defined`. On the server all methods are now no-ops and `getItem` returns `null`.
- `import secureLocalStorage from "react-secure-storage"` returned `{ default }` instead of the storage object in servers that load packages with native Node ESM (React Router / Remix / Astro SSR), so `secureLocalStorage.setItem is not a function`. `import`, `require()` and `require().default` now all return the same instance.
- Storage is no longer read and decrypted at import time; data is loaded on first use in the browser. The server keeps no state between requests.
- Changing a value's type for the same key (e.g. string → number) left the old entry behind, and after a reload either value could be returned. Writing a key now keeps a single entry and cleans up duplicates from earlier versions.
- `removeItem()` could remove the wrong entry when the stored value could not be decrypted, leaving it in storage.
- A prefix containing segments like `.b.` or `.s.` (e.g. `a.b.c`) produced wrong keys when reading back.
- Booleans and numbers that could not be decrypted correctly (e.g. after a fingerprint change) could read as `false` or `NaN`; they now read as `null`.
- Crash when canvas is unavailable or blocked (`getContext` returning `null`).
- Blocked localStorage (sandboxed iframes, blocked cookies) no longer throws; methods become no-ops.
- The browser fingerprint was recomputed on every `setItem`; it is now computed once per page load.

### Changed
- The published package now contains only `dist/`, `README.md` and `LICENSE` (previously the whole repository, including the demo app and config files).

### Added
- Test suite: unit tests (jsdom), SSR and hydration tests (Node), compatibility tests against data written by v1.3.2, and end-to-end tests with Next.js (App and Pages Router), Vite and React Router across Chromium, Firefox and WebKit.
- GitHub Actions CI, size budget, and tag-based npm release with provenance.
- `SECURITY.md` describing what the library does and does not protect.

Data written by 1.3.2 is read unchanged by 1.3.3, and data written by 1.3.3 can be read by 1.3.2.

## 1.3.2

- Bug fixes, including [#39](https://github.com/sushinpv/react-secure-storage/issues/39).

## Earlier releases

- Support for Vite (`VITE_`) and Next.js (`NEXT_PUBLIC_`) environment variables.
- Individual fingerprint inputs can be disabled with `SECURE_LOCAL_STORAGE_DISABLED_KEYS` ([#14](https://github.com/sushinpv/react-secure-storage/issues/14)).
- Values no longer read as `null` after the browser window is resized; screen resolution was removed from the fingerprint ([#9](https://github.com/sushinpv/react-secure-storage/issues/9)).
- The browser hostname is part of the key, so each website gets a distinct key.
- Configurable localStorage prefix with `SECURE_LOCAL_STORAGE_PREFIX`.
- Fix for [#2](https://github.com/sushinpv/react-secure-storage/issues/2).
- Support for Cypress (`Cypress.env()` configuration).
- Type definitions for the whole package.
- Support for older ES versions and Next.js.
- First release with `setItem`, `getItem`, `removeItem` and `clear`.
