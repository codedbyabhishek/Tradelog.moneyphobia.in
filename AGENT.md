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
- `app/app/page.tsx`: authenticated app entry
- `components/journal-app.tsx`: current in-app navigation shell
- `components/sidebar.tsx`: desktop navigation
- `components/mobile-nav.tsx`: mobile navigation
- `components/dashboard.tsx`: main dashboard
- `components/advanced-analytics.tsx`: advanced analytics screen
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

The authenticated app currently uses client-side hash routing inside `components/journal-app.tsx`.

Examples:

- `/app#dashboard`
- `/app#analytics`
- `/app#advanced-analytics`

How it works today:

- `getInitialPage()` reads `window.location.hash`
- `currentPage` state determines which screen component renders
- navigation updates the URL with `window.history.replaceState(..., "#page")`
- `hashchange` keeps the UI in sync

## Known architecture issue

Hash-based URLs are a known limitation and should be treated as technical debt.

Problems:

- The server never receives the actual in-app route
- Links are not true permalinks for sharing or bookmarking
- SEO and analytics are weaker because path-level navigation is hidden from the server
- Route-specific metadata, caching, and loading boundaries are harder to implement cleanly

Preferred direction:

- Migrate authenticated screens from hash state to real App Router paths
- Use routes such as `/app/dashboard`, `/app/analytics`, `/app/advanced-analytics`
- Keep shared layout/state at the layout level instead of inside one large switch statement
- Replace manual hash parsing with `next/navigation`

## Recommended migration outline

1. Create nested App Router pages under `app/app/...`
2. Move each major screen to its own route segment
3. Convert sidebar and mobile nav to use real links
4. Preserve providers in a shared layout so page transitions do not drop app context
5. Add redirects from legacy hash-based entry points if needed

## Editing guidance

- Prefer small targeted changes; this repo may have unrelated local edits
- Do not revert user changes outside the requested scope
- Validate with `npm run lint` after UI or routing changes
- Be careful with authenticated flows, billing gates, and broker sync behavior

