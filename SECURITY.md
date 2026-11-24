# Security policy

## What react-secure-storage protects

react-secure-storage encrypts values before writing them to `localStorage`, so they are not readable as plain text by someone casually inspecting the browser's storage.

It is **obfuscation at rest**, not strong protection. In v1.x:

| Threat | Protected? |
|---|---|
| Someone glancing at localStorage in DevTools | Yes: values are not plain text |
| Someone copying the stored values and decrypting them elsewhere | **No**: the key is derived from browser properties (a 32-bit hash) plus a hash key that ships in your JavaScript bundle, so it can be recovered by brute force |
| Cross-site scripting (XSS) or malicious browser extensions on your page | **No**: any script on the page can call the library |
| Malware or physical access to the device | **No** |
| Tampering with stored values | Partially: corrupted values usually read as `null`, but there is no integrity check |

Values can also become unreadable (read as `null`) when the browser fingerprint changes, for example after a browser update, a screen change, or in browsers that randomise fingerprinting data.

**Do not store authentication tokens, passwords or other secrets with this library.** Use `httpOnly`, `Secure` cookies for session tokens.

## Planned improvements

Version 2 will replace the fingerprint-derived key with a non-extractable Web Crypto AES-GCM key kept in IndexedDB, so copied values cannot be decrypted in another browser and tampering is detected. See `docs/react-secure-storage-roadmap.md`.

## Reporting a vulnerability

Please report security issues privately through [GitHub security advisories](https://github.com/sushinpv/react-secure-storage/security/advisories/new) rather than public issues. Include the affected version, a description, and steps to reproduce.
