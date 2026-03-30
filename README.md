# Moneyphobia Journal

A trading journal built with Next.js for logging trades, reviewing ideas, syncing broker history, and keeping favorite setups visible in one place.

## What is included

- Manual trade journaling with setup, fib levels, notes, and screenshots
- Favorite trades and favorite trade ideas board on the dashboard
- Click-to-zoom screenshots for favorite trade images
- Read-only Dhan broker sync with reusable saved credentials
- Post-sync trade enrichment:
  setup name, time frame, fib levels, notes, and screenshots
- Trade badges for `Dhan Synced` and `Journal Enriched`
- Trade ideas and backtesting workspace
- Theme switching and improved mobile navigation with a `More` sheet
- Local temporary MySQL setup and PHP database admin for development

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Start the temporary MySQL database

```bash
./scripts/setup-temp-mysql.sh
```

This creates a disposable MySQL instance for local development using:

- Host: `127.0.0.1`
- Port: `3307`
- User: `root`
- Password: empty
- Database: `trading_journal_temp`

### 3. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Optional: run the PHP database admin

```bash
./scripts/start-php-db-admin.sh
```

Open [http://127.0.0.1:8081](http://127.0.0.1:8081).

## Dhan sync

The Dhan integration is intentionally read-only so it does not disturb your normal journaling flow.

### What it does

- Stores your Dhan `clientId` and access token server-side
- Checks holdings, positions, and available balance
- Imports matched closed trades from Dhan history
- Re-syncs without duplicating imported trades

### What it does not do

- It does not place live orders
- It does not overwrite your manual trades
- It does not require re-entering credentials on every sync unless you replace or remove them

### After sync

You can edit synced trades from `Trade Log` and add:

- setup name
- time frame
- Fibonacci limit and exit levels
- pre/post trade notes
- before-trade and after-exit screenshots

## Dashboard updates

The dashboard includes:

- compact Dhan sync card
- favorite trades board
- favorite trade ideas board
- quick metrics and calendar

## Mobile improvements

On mobile:

- the bottom navigation keeps primary pages visible
- a `More` sheet exposes the rest of the pages
- theme switching is available from the mobile sheet

## Useful scripts

```bash
# start temp mysql
./scripts/setup-temp-mysql.sh

# stop temp mysql
./scripts/stop-temp-mysql.sh

# start php db admin
./scripts/start-php-db-admin.sh

# build app
npm run build
```

## Main files

- `components/dashboard.tsx`
- `components/dhan-sync-card.tsx`
- `components/favorites-board.tsx`
- `components/trade-log.tsx`
- `lib/server/dhan.ts`
- `app/api/brokers/dhan/*`

## Notes

- The project currently uses a local `.env.local` for development database settings.
- Dhan trade matching is based on imported fill history and closed-leg pairing.
- `baseline-browser-mapping` shows an outdated-data warning during build, but the app still builds successfully.
