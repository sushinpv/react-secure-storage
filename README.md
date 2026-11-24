<div align="center">

# react-secure-storage

**Encrypted localStorage for React and any browser app, with typed values and safe server-side rendering.**

[![npm version](https://img.shields.io/npm/v/react-secure-storage.svg)](https://www.npmjs.com/package/react-secure-storage)
[![npm downloads](https://img.shields.io/npm/dm/react-secure-storage.svg)](https://npm-stat.com/charts.html?package=react-secure-storage)
[![CI](https://github.com/sushinpv/react-secure-storage/actions/workflows/ci.yml/badge.svg)](https://github.com/sushinpv/react-secure-storage/actions/workflows/ci.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-22c55e)](LICENSE)

[Install](#install) · [Quick start](#quick-start) · [React hook](#react-hook) · [SSR](#server-side-rendering) · [Configuration](#configuration) · [Security](#security-model) · [Contribute](CONTRIBUTING.md)

</div>

react-secure-storage is a drop-in wrapper around `localStorage` that encrypts every value before it is written. The key is derived from the browser and an optional app-specific hash key, so values pasted into another browser don't decrypt with that browser's key.

It keeps your data types: store a string, number, boolean or object and get the same type back, with no `JSON.stringify` or `JSON.parse` calls in your code. It works in Create React App, Vite, Next.js, React Router and plain JavaScript, and it is safe to import during server-side rendering.

> **Obfuscation, not a vault.** Values aren't readable as plain text, but the key can be guessed and any script on your page can read the data. Don't store auth tokens or secrets with it. See the [security model](#security-model).

## Features

- **Encrypted at rest.** AES encryption with a key derived from the browser fingerprint plus your own hash key.
- **Typed values.** Strings, numbers, booleans and objects come back with the type you stored.
- **React hook.** `useSecureStorage` gives you state backed by encrypted storage, hydration-safe out of the box.
- **Synced across tabs.** Changes made in one tab show up in every other open tab of your site.
- **SSR-safe.** No errors on the server, nothing read at import time, and no data shared between server requests.
- **Framework-agnostic.** The core has no React dependency; the same API works in any browser app.
- **Configurable.** Storage prefix, hash key and fingerprint inputs are set through environment variables, with built-in support for React, Vite and Next.js prefixes.
- **Tested in real apps.** Every change runs against Next.js (App Router and Pages Router), Vite and React Router builds in Chromium, Firefox and WebKit.

## Install

```sh
npm install react-secure-storage
```

```sh
yarn add react-secure-storage
```

## Quick start

```tsx
import { useEffect, useState } from "react";
import secureLocalStorage from "react-secure-storage";

export default function App() {
  const [settings, setSettings] = useState<object | null>(null);

  useEffect(() => {
    secureLocalStorage.setItem("settings", { theme: "dark", fontSize: 14 });
    secureLocalStorage.setItem("visits", 12);
    secureLocalStorage.setItem("onboarded", true);

    setSettings(secureLocalStorage.getItem("settings") as object); // { theme: "dark", fontSize: 14 }
  }, []);

  return <pre>{JSON.stringify(settings)}</pre>;
}
```

### API

The default export is a single shared instance.

| Method | Description |
| --- | --- |
| `setItem(key, value)` | Encrypts and stores a string, number, boolean or object. Passing `null` or `undefined` removes the key. |
| `getItem(key)` | Returns the stored value with its original type, or `null` if missing or unreadable. |
| `removeItem(key)` | Removes the key. |
| `clear()` | Removes every value written by react-secure-storage. Other localStorage keys are kept. |
| `onChange(listener)` | Calls `listener(key)` when a key changes in this tab or another tab (`key` is `null` after `clear`). Returns an unsubscribe function. |
| `onError(listener)` | Calls `listener({ type, key, error })` for unreadable values, rejected writes and blocked storage. Returns an unsubscribe function. |

Values are stored as `<prefix><type>.<key>`, for example `@secure.j.settings`. The data is decrypted once, on the first call in the browser, and later reads are served from memory. Writes from other tabs are picked up automatically through the browser's `storage` event.

## React hook

`useSecureStorage` works like `useState`, but the value is kept in secure storage and shared by every component and tab using the same key.

```tsx
import { useSecureStorage } from "react-secure-storage/react";

export default function ThemeToggle() {
  const [theme, setTheme, removeTheme] = useSecureStorage("theme", "light");

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
| `value` | The stored value, or `initialValue` when nothing is stored. Without an initial value, `null`. |
| `setValue(next)` | Stores a value, or computes it from the previous one: `setValue((n) => n + 1)`. `setValue(null)` removes the key. |
| `removeValue()` | Removes the key; `value` falls back to `initialValue`. |

The hook is **hydration-safe**: on the server and during hydration it returns `initialValue`, then switches to the stored value once the component is mounted. In client-only apps the stored value is returned on the first render. Requires React 18 or newer; the core API works without React.

## Handling errors

Values become unreadable when the browser fingerprint changes, and writes can fail when storage is full. Register a listener to find out:

```ts
secureLocalStorage.onError(({ type, key }) => {
  // type: "decrypt" | "write" | "unavailable"
  reportToMonitoring(`secure storage ${type} error`, { key }); // stored values are never included
});
```

While at least one error listener is registered, failed writes are reported to it instead of thrown.

## Server-side rendering

localStorage only exists in the browser. On the server (Next.js, React Router, Remix, Astro), every method is a no-op and `getItem` returns `null`.

The [React hook](#react-hook) handles this for you. If you use the core API in components, **read values after the component mounts**. If you read during render, the server HTML and the first browser render differ, and React reports a hydration mismatch.

```tsx
"use client"; // Next.js App Router only
import { useEffect, useState } from "react";
import secureLocalStorage from "react-secure-storage";

export default function Profile() {
  const [user, setUser] = useState<{ name: string } | null>(null); // same on server and first client render

  useEffect(() => {
    setUser(secureLocalStorage.getItem("user") as { name: string } | null); // runs only in the browser
  }, []);

  return <p>{user ? user.name : "Loading…"}</p>;
}
```

```tsx
// ❌ The server renders null, the browser renders the stored value: hydration mismatch
const user = secureLocalStorage.getItem("user");
```

## Configuration

All settings are optional environment variables. Use the prefix your framework exposes to client code; the unprefixed name works too.

| Variable | Default | Purpose |
| --- | --- | --- |
| `SECURE_LOCAL_STORAGE_HASH_KEY` | built-in value | App-specific part of the encryption key |
| `SECURE_LOCAL_STORAGE_PREFIX` | `@secure.` | Prefix for every localStorage key the library writes |
| `SECURE_LOCAL_STORAGE_DISABLED_KEYS` | none | Browser properties to leave out of the key, separated by `\|` |

| Framework | Prefix | Example |
| --- | --- | --- |
| Create React App | `REACT_APP_` | `REACT_APP_SECURE_LOCAL_STORAGE_HASH_KEY=xxxx` |
| Vite | `VITE_` | `VITE_SECURE_LOCAL_STORAGE_HASH_KEY=xxxx` (see [Vite setup](#vite)) |
| Next.js | `NEXT_PUBLIC_` | `NEXT_PUBLIC_SECURE_LOCAL_STORAGE_HASH_KEY=xxxx` |
| Cypress | none | Read from `Cypress.env()` when tests run inside Cypress |

Changing the hash key, prefix or disabled keys makes existing stored values unreadable.

### Vite

Vite exposes `import.meta.env` rather than `process.env`. Define `process.env` in `vite.config.ts` and pass in the variables you use:

```ts
import { defineConfig } from "vite";

export default defineConfig({
  define: {
    "process.env": {
      VITE_SECURE_LOCAL_STORAGE_HASH_KEY: "xxxx",
      VITE_SECURE_LOCAL_STORAGE_PREFIX: "my-app",
    },
  },
});
```

Without this, the library still works and uses the default prefix and hash key.

### Fingerprint inputs

The browser part of the key is built from these properties:

`UserAgent` · `ScreenPrint` · `Plugins` · `Fonts` · `LocalStorage` · `SessionStorage` · `TimeZone` · `Language` · `SystemLanguage` · `Cookie` · `Canvas` · `Hostname`

If a property changes, for example the user agent after a browser update, stored values read as `null`. You can trade uniqueness for stability by disabling inputs:

```sh
SECURE_LOCAL_STORAGE_DISABLED_KEYS=UserAgent|Canvas
```

## Security model

| Threat | Protected? |
| --- | --- |
| Someone glancing at localStorage in DevTools | ✅ Values aren't plain text |
| Copied values decrypted in another browser | ⚠️ Not reliably. The browser part of the key is a 32-bit hash and the hash key ships in your bundle, so the key can be brute-forced |
| XSS or malicious browser extensions | ❌ Any script on the page can call the library |
| Malware or physical access to the device | ❌ |
| Tampering with stored values | ⚠️ Corrupted values usually read as `null`, but there is no integrity check |

Keep session and auth tokens in `httpOnly`, `Secure` cookies. Version 2 will replace the fingerprint key with a non-extractable Web Crypto key; see the [security policy](SECURITY.md) and [roadmap](docs/react-secure-storage-roadmap.md).

## Compatibility

| Environment | Status |
| --- | --- |
| Next.js App Router and Pages Router | ✅ Tested end-to-end (SSR, hydration, server components) |
| React Router / Remix framework mode | ✅ Tested end-to-end (SSR, loaders, native Node ESM) |
| Vite + React | ✅ Tested end-to-end in Chromium, Firefox and WebKit |
| Create React App | ✅ `REACT_APP_` configuration covered by unit tests |
| Node.js 20, 22, 24 (server) | ✅ Tested in CI |
| Cross-tab sync | ✅ Tested end-to-end with two open tabs |
| React | Hook requires React 18+; core API has no React dependency |
| Data written by 1.3.2 | ✅ Read unchanged; 1.3.2 can read data written by later 1.x versions |

## Documentation

| Guide | Contents |
| --- | --- |
| [Changelog](CHANGELOG.md) | Fixes and changes by release |
| [Security policy](SECURITY.md) | What is and isn't protected, how to report a vulnerability |
| [Roadmap](docs/react-secure-storage-roadmap.md) | Known issues, planned work, v2 design |
| [Contributing](CONTRIBUTING.md) | Local setup, tests, pull request checklist |
| [Code of conduct](CODE_OF_CONDUCT.md) | Expected behaviour in issues, pull requests and discussions |

## Contributing

Bug reports, documentation improvements and focused pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) or open an [issue](https://github.com/sushinpv/react-secure-storage/issues/new/choose).

```sh
npm install
npm run typecheck
npm test                     # unit, hook, SSR, hydration and 1.3.2 compatibility tests
node scripts/setup-e2e.mjs   # build the Next.js, Vite and React Router test apps
npm run test:e2e             # Playwright end-to-end tests
```

All checks run in GitHub Actions on every pull request. Please report security issues privately as described in the [security policy](SECURITY.md), and follow the [code of conduct](CODE_OF_CONDUCT.md).

## Project status and license

react-secure-storage is independently maintained. Version 1.x focuses on correctness and compatibility. Version 2 plans a Web Crypto key stored in IndexedDB, authenticated encryption and an async API; see the [roadmap](docs/react-secure-storage-roadmap.md). Release dates are not promised.

Licensed under the [MIT License](LICENSE). Built with [crypto-js](https://github.com/brix/crypto-js) and [murmurhash-js](https://github.com/garycourt/murmurhash-js); the fingerprint is adapted from [ClientJS](https://github.com/jackspirou/clientjs).

[![Star History Chart](https://api.star-history.com/svg?repos=sushinpv/react-secure-storage&type=Date)](https://star-history.com/#sushinpv/react-secure-storage&Date)
