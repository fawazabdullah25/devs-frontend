# Devs frontend

The Devs web application uses React 19, TanStack Start/Router, Tailwind CSS 4, Base UI-backed ShadCN components, Phosphor icons, Alexandria, and Mux Player.

## Commands

```bash
npm install
npm run dev
npm run check
VITE_USE_MOCKS=true npm run build
npm start
```

`npm start` serves the production Nitro output after a build. Routes are localized under `/en` and `/ar`; `/` redirects to `/en`.

## Environment

| Variable | Meaning |
|---|---|
| `VITE_API_URL` | Public API base ending in `/devs/api/v1` |
| `VITE_USE_MOCKS` | `true` for the self-contained review/demo catalog |

Production requires a real API URL or an explicit `VITE_USE_MOCKS=true`; this prevents accidental mock deployments. The admin route disables SSR so the browser can send KStacks' HTTP-only auth cookie to the gateway.

Brand colors live only as semantic CSS variables in `src/styles.css`. Application components should consume ShadCN tokens such as `bg-primary`, `text-foreground`, and `border-border`, not introduce raw palette values.
