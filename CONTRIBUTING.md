# Contributing to react-secure-storage

Thanks for helping improve react-secure-storage. Bug reports, documentation fixes, tests and focused pull requests are all welcome.

## Before you start

- **Bugs:** open an [issue](https://github.com/sushinpv/react-secure-storage/issues/new/choose) with the version, framework (Next.js, Vite, React Router, …), browser and a minimal reproduction.
- **Features:** open an issue first so we can agree on the API before you write code. Check the [roadmap](docs/react-secure-storage-roadmap.md) for planned work.
- **Security issues:** don't open a public issue; follow the [security policy](SECURITY.md).

## Local setup

Requires Node.js 20 or newer.

```sh
git clone https://github.com/sushinpv/react-secure-storage.git
cd react-secure-storage
npm install
```

| Command | What it does |
| --- | --- |
| `npm run build:lib` | Builds the library into `dist/` |
| `npm run typecheck` | Type-checks the library, tests and scripts |
| `npm test` | Builds, then runs unit (jsdom), SSR and hydration (Node) and 1.3.2 compatibility tests |
| `npm run test:coverage` | Same as `npm test`, with coverage thresholds |
| `npm run size` | Checks the built size against the budget |
| `node scripts/setup-e2e.mjs [next\|vite\|react-router]` | Packs the library and builds the end-to-end test apps |
| `npx playwright install` | Downloads the browsers for end-to-end tests (once) |
| `npm run test:e2e` | Runs Playwright against the test apps |

## Project layout

| Path | Contents |
| --- | --- |
| `src/lib/` | Library source |
| `tests/unit/` | Behaviour tests in a simulated browser (jsdom) |
| `tests/ssr/` | Server-side and hydration tests against the built package |
| `tests/legacy/` | Compatibility with data written by the published 1.3.2 |
| `tests/fixtures/` | Next.js, Vite and React Router apps used by end-to-end tests |
| `tests/e2e/` | Playwright tests |
| `scripts/` | Build, packaging and size scripts |

## Pull request checklist

- [ ] Branch from `master`, named `dev/<feature-or-fix>`.
- [ ] Tests added or updated. For SSR-related changes, cover both `tests/ssr` and the end-to-end apps.
- [ ] `npm run typecheck` and `npm test` pass locally.
- [ ] Data written by previous versions still reads correctly (`tests/legacy`).
- [ ] `CHANGELOG.md` and the README updated for user-visible changes.
- [ ] `dist/` not committed; it is built in CI and on publish.

## Releasing (maintainers)

1. Update the version in `package.json` and the `CHANGELOG.md` entry.
2. Merge to `master` with CI green.
3. Tag and push: `git tag v<version> && git push origin v<version>`. The release workflow runs CI and publishes to npm with provenance.
