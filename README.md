# Traderlogify

Traderlogify is a Next.js trading journal for logging manual trades, importing broker history, reviewing setups, and building a visual library of favorite trades and trade ideas.

## Highlights

- Manual trade journaling with notes, screenshots, setup tags, and Fibonacci levels
- Read-only Dhan broker sync with saved credentials
- Post-sync enrichment for broker-imported trades
- Favorite trades board and favorite ideas board on the dashboard
- Trade badges for `Dhan Synced` and `Journal Enriched`
- Trade ideas and backtesting workspace
- Mobile-friendly navigation with a `More` sheet
- Local temp MySQL setup plus lightweight PHP DB admin for development

## Feature overview

### Trading workflow

- Add trades manually with setup, fib limit, fib exit, confidence, and notes
- Import closed trades from Dhan without overwriting manual entries
- Edit synced trades afterward to add screenshots and journal-specific fields
- Export journal data as JSON or CSV

### Dashboard

- Core performance metrics
- Compact Dhan sync card
- Calendar and quick insights
- Favorite trade wall
- Favorite trade idea wall

### Trade research

- Trade ideas and backtesting notes
- Status tracking for ideas
- Screenshot support
- Search and filtering tools

## Local development

### Install

```bash
npm install
```

### Start the temporary MySQL database

```bash
./scripts/setup-temp-mysql.sh
```

Local temp DB defaults:

- Host: `127.0.0.1`
- Port: `3307`
- User: `root`
- Password: empty
- Database: `trading_journal_temp`

### Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Optional PHP database admin

```bash
./scripts/start-php-db-admin.sh
```

Open [http://127.0.0.1:8081](http://127.0.0.1:8081)

## Dhan sync

The Dhan integration is intentionally read-only.

### It does

- Save `clientId` and access token server-side
- Check holdings, positions, and available balance
- Import matched closed trades from Dhan history
- Re-sync imported trades without duplicating them

### It does not

- Place broker orders
- Overwrite unrelated manual trades
- Require credentials on every sync unless you replace or remove them

### After import

From `Trade Log`, synced trades can be enriched with:

- setup name
- time frame
- Fibonacci limit level
- Fibonacci exit level
- pre/post trade notes
- before-trade and after-exit screenshots

More details: [docs/DHAN_SYNC.md](docs/DHAN_SYNC.md)

## Deployment

Deployment instructions:

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [HOSTINGER_DEPLOYMENT.md](HOSTINGER_DEPLOYMENT.md)

The app supports:

- Vercel
- Hostinger
- any Node-compatible host with MySQL access

## Main project areas

- `components/dashboard.tsx`
- `components/dhan-sync-card.tsx`
- `components/favorites-board.tsx`
- `components/trade-log.tsx`
- `lib/server/dhan.ts`
- `app/api/brokers/dhan/*`

## Useful scripts

```bash
# temp mysql up
./scripts/setup-temp-mysql.sh

# temp mysql down
./scripts/stop-temp-mysql.sh

# php db admin
./scripts/start-php-db-admin.sh

# dev server
npm run dev

# production build
npm run build
```

## Notes

- Local dev uses `.env.local`, which is ignored from git
- Dhan trade pairing is based on imported fill history and closed-leg matching
- `baseline-browser-mapping` may show an outdated-data warning during builds, but the app still builds successfully
