<div align="center">

# react-secure-storage

**Encrypted localStorage for React and any browser app: Web Crypto encryption, typed values, safe server-side rendering.**

[![npm version](https://img.shields.io/npm/v/react-secure-storage.svg)](https://www.npmjs.com/package/react-secure-storage)
[![npm downloads](https://img.shields.io/npm/dm/react-secure-storage.svg)](https://npm-stat.com/charts.html?package=react-secure-storage)
[![CI](https://github.com/sushinpv/react-secure-storage/actions/workflows/ci.yml/badge.svg)](https://github.com/sushinpv/react-secure-storage/actions/workflows/ci.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-22c55e)](LICENSE)

[Install](#install) · [Quick start](#quick-start) · [Async or sync](#async-or-sync) · [React hook](#react-hook) · [SSR](#server-side-rendering) · [Configuration](#configuration) · [Security](#security-model) · [Upgrading from v1](#upgrading-from-v1)

</div>

react-secure-storage encrypts every value before writing it to `localStorage`. Version 2 uses the browser's built-in Web Crypto API: each site gets a random AES-GCM key that is kept in IndexedDB and can't be exported, so values copied out of localStorage can't be decrypted in another browser, and tampered values are detected.

It keeps your data types: store a string, number, boolean or object and get the same type back. It works in Next.js, React Router, Vite, Create React App and plain JavaScript, and it is safe to import during server-side rendering.

> **Protects stored data, not your page.** Any script running on your page (XSS, malicious extensions) can still read values through the library. Keep auth tokens in `httpOnly` cookies. See the [security model](#security-model).

## Features

- **Real encryption.** AES-GCM with a random 256-bit key that never leaves the browser, a fresh nonce per write, and tamper detection.
- **Async by default, sync when you want it.** Decrypt each key on demand, or load everything once and read synchronously from memory.
- **Typed values.** Strings, numbers, booleans and objects come back with the type you stored.
- **React hook.** `useSecureStorage` gives you state backed by encrypted storage, with a loading state and safe hydration.
- **Synced across tabs.** Changes in one tab show up in every other open tab of your site.
- **SSR-safe.** No errors on the server, nothing read at import time, and no data shared between requests.
- **Works on plain http too.** Where Web Crypto isn't available, it falls back to the v1 fingerprint key (or refuses, in strict mode).
- **Tested in real apps.** Every change runs against Next.js, Vite and React Router builds in Chromium, Firefox and WebKit.

## Install

```sh
npm install react-secure-storage
```

```sh
yarn add react-secure-storage
```

## Quick start

```ts
import secureLocalStorage from "react-secure-storage";

await secureLocalStorage.setItem("settings", { theme: "dark", fontSize: 14 });
await secureLocalStorage.setItem("visits", 12);
await secureLocalStorage.setItem("onboarded", true);

const settings = await secureLocalStorage.getItem("settings"); // { theme: "dark", fontSize: 14 }
```

| Method | Description |
| --- | --- |
| `await getItem(key)` | The stored value with its original type, or `null` if missing or unreadable. |
| `await setItem(key, value)` | Encrypts and stores a string, number, boolean or object. `null` or `undefined` removes the key. |
| `await removeItem(key)` | Removes the key. |
| `await clear()` | Removes every value written by react-secure-storage, including v1 data. Other localStorage keys are kept. |
| `onChange(listener)` | Calls `listener(key)` when a key changes in this tab or another tab (`null` after `clear`). Returns an unsubscribe function. |
| `onError(listener)` | Calls `listener({ type, key, error })` for problems such as unreadable values or failed writes. Returns an unsubscribe function. |

Writes run in the order you call them, and a read always sees writes started before it, so you don't have to `await` every `setItem` before reading.

## Async or sync

Web Crypto only decrypts asynchronously. The library offers two ways to deal with that:

| Import | How it reads | Best for |
| --- | --- | --- |
| `react-secure-storage` (default) | `await getItem(key)` decrypts that key on demand | Most apps, and any app with lots of stored data |
| `react-secure-storage/sync` | `await ready()` once decrypts everything into memory; then `getItem(key)` is synchronous | Small amounts of data, or code that wants v1-style synchronous reads |

```ts
import secureLocalStorage from "react-secure-storage/sync";

await secureLocalStorage.ready(); // once, at startup

secureLocalStorage.setItem("visits", 13); // memory updates immediately; saved in the background
const visits = secureLocalStorage.getItem("visits"); // 13, no await
```

Before `ready()` resolves, sync reads return `null`. Writes made before then are kept.

**How long `ready()` takes** grows with the amount of stored data, while async reads stay fast:

| Stored data | sync `ready()` (laptop) | sync `ready()` (4× CPU slowdown) | async first `getItem` | async per `getItem` |
| --- | --- | --- | --- | --- |
| 10 entries | 1.6 ms | 4.4 ms | 0.8 ms | 0.02 ms |
| 100 entries | 2.2 ms | 9.8 ms | 0.8 ms | 0.01 ms |
| 1,000 entries | 12 ms | 52 ms | 0.7 ms | 0.02 ms |
| ~4 MB (localStorage nearly full) | 22 ms | 97 ms | 0.7 ms | 0.03 ms |

Chromium 159 on an Apple M1 Pro laptop, median of 5 cold page loads. The 4× CPU slowdown is a rough stand-in for a mid-range phone. Run `node scripts/benchmark.mjs` to measure on your own hardware.

**Rule of thumb:** the sync entry is fine up to a few hundred entries. With around 1,000 entries or more, or large values, use the async default so startup isn't delayed by decrypting data you may not read.

## React hook

`useSecureStorage` works like `useState`, but the value is encrypted in storage and shared by every component and tab using the same key.

```tsx
import { useSecureStorage } from "react-secure-storage/react";

export default function ThemeToggle() {
  const [theme, setTheme, removeTheme, { loading }] = useSecureStorage("theme", "light");

  if (loading) return null;
  return (
    <>
      <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>Theme: {theme}</button>
      <button onClick={removeTheme}>Reset</button>
    </>
  );
}
```

| Returned | Description |
| --- | --- |
| `value` | The stored value, or `initialValue` while loading or when nothing is stored. Without an initial value, `null`. |
| `setValue(next)` | Stores a value, or computes it from the previous one: `setValue((n) => n + 1)`. `setValue(null)` removes the key. |
| `removeValue()` | Removes the key; `value` falls back to `initialValue`. |
| `{ loading }` | `true` on the server, during hydration and until the stored value is decrypted. |

The hook is hydration-safe: the server and the first browser render both use `initialValue`. Requires React 18 or newer; the other entries don't need React.

## Server-side rendering

localStorage and the encryption key only exist in the browser. On the server (Next.js, React Router, Remix, Astro):

- async methods resolve without doing anything, and `getItem` resolves to `null`
- the sync entry's `ready()` resolves immediately and reads return `null`
- the hook returns `initialValue` with `loading: true`

Use the [React hook](#react-hook), or read with the async API in `useEffect`. Don't read storage during render, because the server and browser would render different HTML.

## Configuration

Every option can be set with an environment variable or with `configure()`. Values passed to `configure()` win.

```ts
import { configure } from "react-secure-storage";

configure({
  prefix: "my-app",       // localStorage key prefix
  migrate: true,          // move v1 data into the v2 format
  fallback: true,         // allow the v1 fingerprint key where Web Crypto is unavailable
});
```

Call `configure()` once at startup, before the first storage call. Later calls are reported as a `config` error and ignored, so the prefix or key can't change while the app is running. `configure` is exported from every entry point and configures the same shared instance.

| Option | Environment variable | Default | Purpose |
| --- | --- | --- | --- |
| `prefix` | `SECURE_LOCAL_STORAGE_PREFIX` | `@secure.` | Prefix for every localStorage key the library writes |
| `migrate` | `SECURE_LOCAL_STORAGE_MIGRATE` | `false` | Move readable v1 data into the v2 format on first load |
| `fallback` | `SECURE_LOCAL_STORAGE_FALLBACK` | `true` | Use the v1 fingerprint key when Web Crypto is unavailable. `false` makes storage unavailable instead |
| `hashKey` | `SECURE_LOCAL_STORAGE_HASH_KEY` | built-in value | Part of the v1 fingerprint key; fallback mode and migration only |
| `disabledKeys` | `SECURE_LOCAL_STORAGE_DISABLED_KEYS` | none | Browser properties to leave out of the v1 fingerprint key (`\|`-separated in the variable); fallback mode and migration only |

Use the prefix your framework exposes to client code; the unprefixed name works too.

| Framework | Prefix | Example |
| --- | --- | --- |
| Create React App | `REACT_APP_` | `REACT_APP_SECURE_LOCAL_STORAGE_MIGRATE=true` |
| Vite | `VITE_` | `VITE_SECURE_LOCAL_STORAGE_MIGRATE=true` (see [Vite](#vite)) |
| Next.js | `NEXT_PUBLIC_` | `NEXT_PUBLIC_SECURE_LOCAL_STORAGE_MIGRATE=true` |
| Cypress | none | Read from `Cypress.env()` when tests run inside Cypress |

### Vite

Vite exposes `import.meta.env` rather than `process.env`. Either use `configure()`, or define `process.env` in `vite.config.ts`:

```ts
import { defineConfig } from "vite";

export default defineConfig({
  define: {
    "process.env": { VITE_SECURE_LOCAL_STORAGE_PREFIX: "my-app" },
  },
});
```

### Handling errors

Subscribe once at startup, before any component uses storage, so no error is missed:

```ts
secureLocalStorage.onError(({ type, key, error }) => {
  reportToMonitoring(`secure storage ${type}`, { key }); // stored values are never included
});
```

| `type` | When |
| --- | --- |
| `decrypt` | A value can't be decrypted or was tampered with (for example, copied from another browser). It reads as `null`. |
| `write` | localStorage rejected a write, usually because it is full. |
| `fallback` | Web Crypto or IndexedDB is unavailable, so the weaker v1 fingerprint key is used. `error` explains why, if IndexedDB failed. |
| `unavailable` | Storage can't be used: localStorage is blocked, or Web Crypto is unavailable with `fallback: false`. Calls are no-ops. |
| `config` | `configure()` was called after storage was first used. The call was ignored. |

While at least one error listener is registered, failed writes are reported to it instead of rejecting the promise.

## Security model

| Threat | v2 (Web Crypto) | Fallback mode (plain http) |
| --- | --- | --- |
| Someone reading localStorage in DevTools | ✅ Values are encrypted | ✅ Values are encrypted |
| Values copied and decrypted in another browser or profile | ✅ The key never leaves this browser profile | ⚠️ The key can be brute-forced |
| Tampered or swapped values | ✅ Detected; read as `null` | ⚠️ Swaps between keys detected; no integrity check |
| XSS or malicious browser extensions on your page | ❌ They can use the key through the library | ❌ |
| Malware or disk access to the browser profile | ❌ | ❌ |

Serve your site over HTTPS so Web Crypto is available. Set `fallback: false` if you'd rather lose storage than use the weaker key. See the [security policy](SECURITY.md) for details.

## Upgrading from v1

Version 2 is a major release with a new storage format and an async API.

1. **`getItem` now returns a Promise.** Add `await`. In plain JavaScript, unchanged code like `if (secureLocalStorage.getItem("loggedIn"))` is **always true**, because a Promise is an object. TypeScript only catches this where the result is typed as a primitive, because stored values can be objects.
2. **Want synchronous calls?** Change the import to `react-secure-storage/sync` and `await ready()` once at startup.
3. **v1 data is kept but not read.** v2 stores data under `<prefix>2.<key>` and leaves v1 entries untouched. Set `migrate: true` (or `SECURE_LOCAL_STORAGE_MIGRATE=true`) to move readable v1 values into v2. Do it in your first v2 release if you want the data: v1 values become unreadable as browsers update.
4. **`clear()` also removes v1 data.**
5. **The hook** returns a 4th item, `{ loading }`, and no longer has the stored value on the first render in client-only apps. Existing 3-item destructuring keeps working.
6. **Deep imports** such as `react-secure-storage/dist/...` are no longer available. Use `react-secure-storage`, `/sync` or `/react`.

See the [changelog](CHANGELOG.md) for the full list.

## Compatibility

| Environment | Status |
| --- | --- |
| Next.js App Router and Pages Router | ✅ Tested end-to-end (SSR, hydration, server components) |
| React Router / Remix framework mode | ✅ Tested end-to-end (SSR, loaders, native Node ESM) |
| Vite + React | ✅ Tested end-to-end in Chromium, Firefox and WebKit, plus fallback on plain http |
| Create React App | ✅ `REACT_APP_` configuration covered by unit tests |
| Node.js 20, 22, 24 (server) | ✅ Tested in CI |
| Cross-tab sync | ✅ Tested end-to-end with two open tabs |
| React | Hook requires React 18+; the async and sync entries have no React dependency |

## Documentation

| Guide | Contents |
| --- | --- |
| [Changelog](CHANGELOG.md) | Changes by release, including the v2 migration notes |
| [Security policy](SECURITY.md) | What is and isn't protected, how to report a vulnerability |
| [Roadmap](docs/react-secure-storage-roadmap.md) | Design decisions and planned work |
| [Contributing](CONTRIBUTING.md) | Local setup, tests, pull request checklist |
| [Code of conduct](CODE_OF_CONDUCT.md) | Expected behaviour in issues, pull requests and discussions |

## Contributing

Bug reports, documentation improvements and focused pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) or open an [issue](https://github.com/sushinpv/react-secure-storage/issues/new/choose).

```sh
npm install
npm run typecheck
npm test                     # unit, fallback, migration, sync, hook, SSR and hydration tests
node scripts/setup-e2e.mjs   # build the Next.js, Vite and React Router test apps
npm run test:e2e             # Playwright end-to-end tests
```

All checks run in GitHub Actions on every pull request. Please report security issues privately as described in the [security policy](SECURITY.md), and follow the [code of conduct](CODE_OF_CONDUCT.md).

## Project status and license

react-secure-storage is independently maintained. See the [roadmap](docs/react-secure-storage-roadmap.md) for planned work; release dates are not promised.

Licensed under the [MIT License](LICENSE). Encryption uses the browser's [Web Crypto API](https://developer.mozilla.org/docs/Web/API/Web_Crypto_API). The fallback uses [crypto-js](https://github.com/brix/crypto-js) and [murmurhash-js](https://github.com/garycourt/murmurhash-js), with a fingerprint adapted from [ClientJS](https://github.com/jackspirou/clientjs).

[![Star History Chart](https://api.star-history.com/svg?repos=sushinpv/react-secure-storage&type=Date)](https://star-history.com/#sushinpv/react-secure-storage&Date)
