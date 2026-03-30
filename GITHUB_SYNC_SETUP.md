# GitHub Integration Setup Guide

Your Trading Journal now supports syncing all trades to GitHub! This guide will help you set it up.

## Overview

The GitHub sync feature allows you to:
- Export individual trades as markdown files
- Export all trades as a CSV file
- Generate monthly summaries
- Organize trades by date in folder structure
- Store everything in your own GitHub repository

## Repository Structure

When you sync your trades, they'll be organized like this:

```
trading-journal/
├── trades/
│   ├── all_trades.csv                    # Complete trade export
│   ├── 2026/
│   │   ├── 02/
│   │   │   ├── summary.md                # Monthly summary
│   │   │   ├── 04/
│   │   │   │   ├── trade-id-123.md       # Individual trade
│   │   │   │   └── screenshots/
│   │   │   │       ├── before-trade.png
│   │   │   │       └── after-exit.png
│   │   │   ├── 05/
│   │   │   │   └── trade-id-456.md
│   │   └── 03/
│   │       └── summary.md
```

## Step-by-Step Setup

### 1. Create a GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository (e.g., `trading-journal`)
3. Initialize with a README if you want
4. Take note of the repository name and your GitHub username

### 2. Generate a Personal Access Token

1. Go to [GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name (e.g., "Trading Journal Sync")
4. Set expiration (90 days is recommended for security)
5. Select scopes: Check `repo` (Full control of private repositories)
6. Click "Generate token"
7. **IMPORTANT:** Copy the token immediately and save it somewhere safe (it won't be shown again)

### 3. Use the Sync Button in Trading Dashboard

1. Open your Trading Journal
2. Click the **"Sync to GitHub"** button in the top-right of the dashboard
3. Fill in the dialog:
   - **Repository Owner:** Your GitHub username (e.g., `johndoe`)
   - **Repository Name:** Your repo name (e.g., `trading-journal`)
   - **GitHub Personal Access Token:** Paste the token you generated in step 2
   - **Branch:** Leave as `main` (or change if using a different branch)
4. Click **"Sync [X] Trades"**
5. Wait for the sync to complete (you'll see a success message)

## What Gets Exported

### Individual Trade Files (Markdown)
Each trade is saved as a markdown file with:
- Trade date and ID
- Symbol and position type
- Entry/exit prices (or N/A if process-based)
- Stop loss, quantity, and fees
- P&L and R Factor
- Time frame and Fibonacci levels
- Confidence rating
- Pre-trade and post-trade notes
- Mistake tags and learning points
- Screenshot references

### CSV Export
A complete CSV file with all trades containing:
- Date, day, symbol, trade type, setup name
- Position, entry price, exit price, stop loss
- Quantity, fees, P&L, R-Factor
- Win/Loss status, confidence level
- Time frame, Fibonacci limit and exit levels
- Mistake tags

### Monthly Summaries
Auto-generated monthly reports showing:
- Total trades and win rate
- Total P&L for the month
- Trade type distribution
- Average confidence rating
- List of all trades for the month

## Security Best Practices

1. **Never commit your token to Git** - It's meant to be kept private
2. **Use a token with limited scope** - Only grant the `repo` scope
3. **Rotate tokens regularly** - Regenerate tokens every 90 days
4. **Use environment variables** - For production deployments, store the token in environment variables (not shown here)

## Troubleshooting

### "Failed to upload" Error
- Check your GitHub username and repository name
- Verify your token is correct and has `repo` scope
- Ensure the repository is accessible (not private if using a limited token)

### "Missing Information" Error
- Fill in all three required fields: Owner, Repository, and Token

### Token Expired
- Generate a new token following Step 2
- Use the new token in the sync dialog

## Accessing Your Synced Trades

Once synced, you can:
1. View trades directly on GitHub
2. Read the markdown files in your browser
3. Download the CSV for analysis
4. Use the monthly summaries for planning
5. Share specific trades with others

## Syncing Again

Each time you click "Sync to GitHub":
- New trades are added
- Existing trades are updated
- Monthly summary is regenerated
- All changes are committed with a descriptive message

## Additional Features

### View on GitHub
Click the repository link to view your trading journal on GitHub:
```
https://github.com/YOUR_USERNAME/YOUR_REPO
```

### Download Trades Locally
Clone your repository to have a local backup:
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd trading-journal
```

### Analyze CSV
Import the exported CSV into:
- Excel or Google Sheets for detailed analysis
- Pandas/Python for data science analysis
- Any trading analysis tool

## Example Trade File

A synced trade might look like:
```markdown
# Trade Journal Entry

**Date:** Wednesday, February 05, 2026
**Trade ID:** `1707154800000`

---

## Trade Information

| Field | Value |
|-------|-------|
| **Symbol** | AAPL |
| **Trade Type** | Intraday |
| **Position** | Buy |
| **Setup Name** | Golden Cross |
| **Time Frame** | 5m |
| **Confidence** | 8/10 |

---

## Risk & Reward

| Metric | Value |
|--------|-------|
| **P&L** | $245.50 |
| **R Factor** | 2.5 |
| **Total Fees** | $10.00 |
| **Outcome** | ✓ **WIN** |
```

## Support

If you encounter issues:
1. Check the error message in the sync dialog
2. Verify your GitHub credentials
3. Ensure your repository is properly set up
4. Check the repository is accessible from your account

## Privacy Notes

- Your trades are stored in your own GitHub repository
- You control who has access (public/private settings)
- No data is sent to external servers (direct GitHub API calls)
- Keep your token secure and regenerate it periodically
