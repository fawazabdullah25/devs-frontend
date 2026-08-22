# KStack Devs Frontend

The bilingual web experience for **KStack Devs**, KStack's free practical learning platform. It serves the public course catalog, static HLS lesson playback, downloadable lesson attachments, and the role-protected editorial workspace.

## ✨ Features

- Responsive Arabic and English learning experience with RTL support
- Free course and multi-lesson series discovery
- Adaptive HLS playback, captions, seeking, and playback-speed controls
- Per-lesson PDF, resource, source-code, and image attachments
- Admin content, publication, HLS registration, and direct R2 upload workflows
- Mock mode for isolated design review
- Semantic KStack design tokens, Alexandria typography, and dark mode
- Accessible Base UI-backed ShadCN components and Phosphor icons

## 🧱 Stack

- React 19 and TypeScript
- TanStack Start, Router, and Query
- Tailwind CSS 4
- ShadCN with Base UI primitives
- Vidstack and locally bundled `hls.js`
- Vitest, Testing Library, and Playwright
- Vite/Nitro and Node.js 24

## 🚀 Getting started

Requirements: Node.js 24 and npm 12.

```bash
cp .env.example .env
npm ci
npm run dev
```

Open `http://localhost:3000`. Localized routes live under `/en` and `/ar`.

Use the isolated mock catalog with:

```env
VITE_USE_MOCKS=true
```

Use the real service with:

```env
VITE_API_URL=http://localhost:8080/devs/api/v1
VITE_USE_MOCKS=false
```

## 🧪 Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server on port 3000 |
| `npm run build` | Create the Nitro production output |
| `npm start` | Serve an existing production build |
| `npm run typecheck` | Check TypeScript without emitting files |
| `npm run lint` | Run ESLint |
| `npm run format:check` | Verify Prettier formatting |
| `npm test` | Run component and unit tests |
| `npm run test:e2e` | Run Playwright browser tests |
| `npm run check` | Run formatting, linting, types, and unit tests |

## 📎 Lesson attachments

Learners see attachments directly beneath the relevant video. A course uses its single lesson's list; each series episode has an independent list. The UI shows a localized title, original filename, and size. PDFs open in a new tab, while other resources download.

Admins expand a lesson in the media workspace, enter English and optional Arabic titles, and select an accepted file. The browser uploads directly to R2 with the backend's signed URL and reports progress. The frontend never receives R2 credentials and never sends attachment bytes through Spring Boot.

Deleted attachments disappear publicly immediately and can be restored during the backend's seven-day retention period.

## 🎨 Design system

Brand colors are semantic CSS variables in `src/styles.css`. Components consume tokens such as `bg-primary`, `text-foreground`, and `border-border`; do not add raw palette values or manual dark-mode replacements.

Compose interfaces from the existing ShadCN components in `src/components/ui`. This project uses Base UI, so non-button rendering uses the `render` prop with `nativeButton={false}`. Icons come from Phosphor and use `data-icon` inside buttons. New forms should use `Field`, `FieldGroup`, labels, and accessible inline errors.

## ⚙️ Environment

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Public API base ending in `/devs/api/v1` |
| `VITE_USE_MOCKS` | Enable the self-contained demonstration catalog |
| `VITE_AUTH_URL` | Reserved central KStacks authentication URL |

Vite variables are embedded at build time. Changing them on a running container does not rewrite the frontend bundle; build a new immutable image for a different public API origin.

## 🐳 Delivery

The multi-stage Dockerfile installs from `package-lock.json`, builds Nitro output, runs as the unprivileged Node user, and includes a health check. GitHub Actions validates pull requests and pushes to `master`, then publishes an immutable multi-architecture image such as:

```text
ghcr.io/kstacks-org/devs-frontend:master-<short-sha>
```

Set the GitHub repository variable `VITE_API_URL` before publishing. No runtime credentials or R2 keys belong in this repository or image.

The eventual KStacks GitOps handoff should update the matching deployment in the separate infrastructure repository. It remains disabled until that manifest and an `INFRA_PAT` with only the required repository access exist.

## 🗂️ Repository structure

- `src/routes/`: localized public and admin routes
- `src/components/`: product components and the ShadCN UI layer
- `src/lib/`: API client, localization, and shared utilities
- `src/types/`: API contracts and presentation helpers
- `src/data/`: mock review content
- `e2e/`: Playwright browser coverage

## 🤝 Contributing

Branch from `master`, preserve bilingual and RTL behavior, use the shared design system, and run `npm run check` plus relevant Playwright tests before opening a pull request.
