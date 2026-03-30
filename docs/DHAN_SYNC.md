# Dhan Sync Notes

## Goal

Add a safe broker sync path without disturbing existing manual trading journal features.

## Design choices

- Read-only integration
- Credentials saved server-side in user settings
- Imported trades use stable `dhan:` IDs
- Manual trades and synced trades can live together
- Synced trades can be enriched later through the trade editor

## Current behavior

### Dashboard

- A compact Dhan sync card appears with the other dashboard cards
- Clicking it opens the full sync dialog

### Status

- Holdings count
- Positions count
- Open positions count
- Available balance

### Sync

- Syncs a selected date range
- Imports matched closed trades only
- Updates already-synced trades instead of duplicating them

### Post-sync editing

Users can enrich synced trades with:

- setup name
- time frame
- Fibonacci limit level
- Fibonacci exit level
- notes
- screenshots

### Visual markers

- `Dhan Synced`
- `Journal Enriched`

## Important limitation

This integration is intentionally conservative. It does not place orders or modify broker data.
