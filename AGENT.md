# AGENT.md

## Project

Traderlogify is a Next.js 16 trading journal app for manual trade logging, broker-imported history, analytics, screenshots, goals, ideas, and reports.

Primary stack:

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- MySQL

## Important app structure

- `app/page.tsx`: marketing landing page
- `app/login/page.tsx`: standalone login page
- `app/signup/page.tsx`: standalone signup page
- `app/app/page.tsx`: compatibility entry that redirects legacy `/app#...` URLs
- `app/app/[page]/page.tsx`: authenticated app route entry
- `components/journal-app.tsx`: authenticated app shell and lazy page loader
- `components/sidebar.tsx`: desktop navigation
- `components/mobile-nav.tsx`: mobile navigation
- `components/dashboard.tsx`: main dashboard
- `components/advanced-analytics.tsx`: advanced analytics screen
- `components/screenshot-gallery.tsx`: gallery view with screenshot type, day-wise, and search filtering
- `components/trade-form.tsx`: manual trade entry, screenshots, and emotion capture
- `components/auth-page-shell.tsx`: auth page wrapper for `/login` and `/signup`
- `components/app-entry-redirect.tsx`: legacy hash-to-path redirect
- `lib/app-routes.ts`: canonical app route map
- `app/api/*`: server routes
- `lib/server/*`: DB, auth, billing, broker, and email helpers

## Development commands

```bash
npm install
./scripts/setup-temp-mysql.sh
npm run dev
npm run lint
npm run build
```

## Current routing architecture

The app now uses real App Router paths for authenticated screens.

Examples:

- `/login`
- `/signup`
- `/app/dashboard`
- `/app/analytics`
- `/app/advanced-analytics`

How it works today:

- canonical app pages are defined in `lib/app-routes.ts`
- `app/app/[page]/page.tsx` validates the route segment and renders `JournalApp`
- `components/sidebar.tsx` and `components/mobile-nav.tsx` use real links instead of hash state
- `components/journal-app.tsx` renders the selected page from the route param
- `app/app/page.tsx` keeps backward compatibility by redirecting legacy `/app#...` URLs to real paths

## Auth entry points

Authentication now has standalone public URLs:

- `/login`
- `/signup`
- `/reset-password`
- `/verify-email`

Notes:

- `components/auth-screen.tsx` supports route-aware login/signup toggles
- `components/auth-page-shell.tsx` redirects authenticated users to `/app/dashboard`
- public site CTAs should prefer `/login` or `/signup` instead of `/app`

## App loading and recovery

The authenticated app uses lazy-loaded page chunks inside `components/journal-app.tsx`.

Important behavior:

- page imports are dynamically loaded for screens like `weekly-review`, `advanced-analytics`, and others
- heavy app pages are preloaded in the background after the authenticated shell becomes idle
- chunk-load failures attempt a one-time auto-reload
- if recovery still fails, the app shows an in-app fallback with a reload button

## Auth/bootstrap caching

The app caches auth/bootstrap data client-side to speed up the immediate post-login transition.

Important behavior:

- auth cookies remain the source of truth on the server
- cached bootstrap data is used only for the immediate post-auth fast path
- `lib/client-bootstrap.ts` has an in-memory fallback when `sessionStorage` quota is exceeded
- do not assume cached client bootstrap is authoritative for access control

## Trade and analytics notes

Important behavior:

- `components/trade-form.tsx` now captures `emotionEntry` and `emotionExit`
- the emotion analyzer depends on those fields, so older trades without them will not contribute to psychology patterns
- `components/screenshot-gallery.tsx` supports day-wise filtering in addition to screenshot type, layout, and search
- `components/advanced-analytics.tsx` has several dense KPI cards; be careful with text wrapping and overflow when adjusting card grids or typography

## Editing guidance

- Prefer small targeted changes; this repo may have unrelated local edits
- Do not revert user changes outside the requested scope
- Validate with `npm run lint` after UI or routing changes
- Prefer `npm run build` too when changing auth, routing, or dynamic imports
- Be careful with authenticated flows, billing gates, and broker sync behavior
