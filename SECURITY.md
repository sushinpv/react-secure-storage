# Security policy

## What react-secure-storage protects

react-secure-storage encrypts values before writing them to `localStorage`.

### Version 2 (Web Crypto)

On first use, the browser generates a random 256-bit AES-GCM key with `extractable: false` and keeps it in IndexedDB. JavaScript can use the key to encrypt and decrypt, but can't read or export its bytes. Every write uses a fresh random nonce, and the storage key name is authenticated with the value.

| Threat | Protected? |
| --- | --- |
| Someone reading localStorage in DevTools | Yes: values are encrypted |
| Stored values copied (leaked logs, a script that dumps localStorage, backups) and decrypted in another browser or profile | **Yes**: the key never leaves the browser profile that created it |
| Tampering with a stored value, or copying a value to a different key | **Yes**: detected; the value reads as `null` and a `decrypt` error is reported |
| Cross-site scripting (XSS) or malicious browser extensions on your page | **No**: they can't export the key, but they can call the library and read decrypted values |
| Malware, or someone who copies the whole browser profile from disk | **No**: browsers store IndexedDB keys in the profile without extra OS-level encryption |

### Fallback mode (no Web Crypto)

Browsers only provide Web Crypto on secure origins (HTTPS and localhost), and some private modes block IndexedDB. There, the library falls back to the v1 key: a 32-bit hash of browser properties plus a hash key that ships in your JavaScript bundle. That key can be brute-forced, so copied values **can** be decrypted elsewhere. A `fallback` error is reported when this happens.

- Serve your site over HTTPS.
- Set `fallback: false` (or `SECURE_LOCAL_STORAGE_FALLBACK=false`) if you'd rather have storage turn into no-ops than use the weaker key.

### Version 1.x

Version 1 always used the fingerprint key described above. See the [changelog](CHANGELOG.md) for upgrading.

**In every version: don't store authentication tokens, passwords or other secrets in client-side storage.** Use `httpOnly`, `Secure` cookies for session tokens.

## Reporting a vulnerability

Please report security issues privately through [GitHub security advisories](https://github.com/sushinpv/react-secure-storage/security/advisories/new) rather than public issues. Include the affected version, a description, and steps to reproduce.
