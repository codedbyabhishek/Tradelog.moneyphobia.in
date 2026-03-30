# Trading Journal - Quick Start Guide

## Getting Started

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
trading-journal/
├── /app                    # Next.js app directory
│   ├── layout.tsx         # Root layout with error boundary
│   ├── page.tsx           # Main page
│   └── globals.css        # Global styles
├── /components            # React components
│   ├── trade-form.tsx     # Add/edit trades
│   ├── trade-log.tsx      # View all trades
│   ├── dashboard.tsx      # Main dashboard
│   ├── calendar-view.tsx  # Monthly calendar
│   ├── analytics.tsx      # Performance charts
│   ├── error-boundary.tsx # Error handler
│   └── /ui/               # Shadcn UI components
├── /lib                   # Utilities and logic
│   ├── trade-context.tsx  # State management
│   ├── trade-utils.ts     # Calculations
│   ├── validation.ts      # Input validation
│   ├── logger.ts          # Logging utility
│   ├── github-service.ts  # GitHub integration
│   ├── types.ts           # TypeScript interfaces
│   └── utils.ts           # Helper functions
└── public/                # Static assets
```

---

## Key Features

### 1. Add Trades
- Enter mandatory fields: Symbol, Setup, Time Frame, Limit, Exit, P&L, R Factor, Fees
- Optional fields: Entry Price, Exit Price
- Mark as Win/Loss
- Add pre/post-trade notes and screenshots

### 2. View Trades
- See all trades in log format
- View detailed trade information
- Delete trades
- Export as CSV or JSON

### 3. Track Performance
- Dashboard with key metrics
- Monthly calendar view with daily P&L
- Performance charts and analytics
- Win rate and profit statistics

### 4. Sync to GitHub
- One-click GitHub sync
- Trades saved as markdown files
- Screenshots organized by date
- Complete backup of journal

---

## Core Modules

### Trade Context (`/lib/trade-context.tsx`)
Main state management for trades. Handles:
- Add, delete, update trades
- Export/import functionality
- localStorage persistence
- Error state management

**Usage:**
```tsx
const { trades, addTrade, deleteTrade, error } = useTrades();
```

### Validation (`/lib/validation.ts`)
Centralized input validation. Provides:
- `validateTradeForm()` - Full form validation
- `sanitizeString()` - XSS prevention
- `validateNumber()` - Numeric validation
- `validateImageFile()` - Image validation
- `validateGitHubCredentials()` - GitHub auth

**Usage:**
```tsx
const errors = validateTradeForm(formData);
const safe = sanitizeString(userInput);
```

### Logger (`/lib/logger.ts`)
Centralized logging system. Provides:
- `logger.info()` - Info logs
- `logger.error()` - Error logs
- `logger.warn()` - Warning logs
- `logger.debug()` - Debug logs
- `logger.getLogs()` - Retrieve all logs
- `logger.exportLogs()` - Export as JSON

**Usage:**
```tsx
import { logger } from '@/lib/logger';

logger.error('Trade submission failed', error);
const logs = logger.getLogs();
```

### GitHub Service (`/lib/github-service.ts`)
GitHub integration for backup. Provides:
- `commitToGithub()` - Push files to repo
- `uploadTradesToGithub()` - Batch upload with validation

**Usage:**
```tsx
const result = await commitToGithub(
  'trades/2026-02.md',
  content,
  'Update trades',
  { owner: 'user', repo: 'trading-journal', token: 'token' }
);
```

---

## Common Tasks

### Add a New Trade
1. Click "Add Trade" button
2. Fill mandatory fields
3. Optionally add prices and screenshots
4. Click "Submit"
5. Trade appears in log immediately

### Export Journal
1. Open Trade Log
2. Click "Export CSV" or "Export JSON"
3. File downloads automatically
4. Use CSV in Excel for analysis

### Sync to GitHub
1. Create GitHub repo (e.g., `my-trading-journal`)
2. Generate personal access token (Settings → Developer settings → Personal access tokens)
3. Click "Sync to GitHub" button
4. Enter username, repo, and token
5. Click "Sync All Trades"

### Debug Issues
1. Open browser console (F12)
2. Check logs prefixed with `[v0]`
3. Use `logger.getLogs()` in console
4. Export logs: `copy(logger.exportLogs())`

---

## Form Field Guide

### Mandatory Fields
| Field | Format | Example | Notes |
|-------|--------|---------|-------|
| Symbol | Text | AAPL, BTC/USD | Alphanumeric + / - |
| Setup | Text | Head & Shoulders | Name of setup pattern |
| Time Frame | Text | 5m, 15m, 1h, Daily | Entry timeframe |
| Limit (Fibonacci) | Select | L0, L0.5, L0.702, L0.382, L0.283 | Fibonacci level |
| Exit (Fibonacci) | Select | L0, L0.5, L0.702, L0.382, L0.283 | Exit target level |
| P&L | Number | 250.50, -125.00 | Profit or loss |
| R Factor | Number | +2.5, -0.5 | Risk multiple |
| Fees | Number | 15.00 | Total fees paid |
| Win/Loss | Checkbox | ✓ or ✗ | Trade outcome |

### Optional Fields
| Field | Format | Example | Notes |
|-------|--------|---------|-------|
| Entry Price | Number | 150.25 | Leave empty for process-only |
| Exit Price | Number | 155.75 | Leave empty for process-only |
| Stop Loss | Number | 148.00 | Price level |
| Quantity | Number | 100 | Shares/contracts |
| Confidence | Slider | 1-10 | Self-assessed confidence |
| Pre-Notes | Text | Setup identified on... | Trade setup notes |
| Post-Notes | Text | Exited due to... | Trade analysis notes |
| Screenshots | File | Image (JPEG, PNG) | Before/after images |

---

## Validation Rules

### Numbers
- Must be valid decimals (e.g., 150.25, 100, -50)
- Positive validation where required
- Max 2 decimal places recommended

### Text
- Max 500 characters
- Dangerous characters removed (< > " ')
- Whitespace trimmed

### Symbols
- 1-20 alphanumeric characters
- Hyphens and slashes allowed (BTC/USD)
- Case-insensitive (aapl → AAPL)

### Files
- Max 5MB size
- Allowed types: JPEG, PNG, WebP
- Validated before upload

---

## Keyboard Shortcuts

| Action | Shortcut | Status |
|--------|----------|--------|
| Focus first field | Tab | ✓ Working |
| Submit form | Ctrl+Enter | ✓ Working |
| Clear form | Ctrl+Shift+C | Potential |
| Search trades | Ctrl+K | Potential |
| Export trades | Ctrl+E | Potential |

---

## Responsive Breakpoints

### Device Sizes
- **Mobile**: 320px - 639px
- **Tablet**: 640px - 1023px  
- **Desktop**: 1024px+

### Testing Devices
- iPhone SE (375px)
- iPhone 12 (390px)
- iPad (768px)
- MacBook (1440px+)

### Browser DevTools
Press F12 and use device emulation:
1. Device Toolbar icon (or Ctrl+Shift+M)
2. Select device from dropdown
3. Test responsiveness

---

## Troubleshooting

### Issue: Trades not saving
**Solution:**
1. Check browser console for errors
2. Verify localStorage is enabled
3. Check browser storage quota
4. Use `logger.getLogs()` to debug

### Issue: Form validation errors
**Solution:**
1. Ensure all mandatory fields filled
2. Check field formats match examples
3. Verify numbers are valid
4. Try clearing and re-entering

### Issue: GitHub sync fails
**Solution:**
1. Verify GitHub credentials correct
2. Check token has `repo` scope
3. Verify repo exists on GitHub
4. Try again - might be network issue

### Issue: Responsive layout broken
**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+Shift+R)
3. Check browser zoom (Ctrl+0)
4. Try different browser

---

## Performance Tips

### For Best Performance
1. Keep trades database under 10,000 entries
2. Export old trades to backup
3. Clear browser cache monthly
4. Use modern browser (Chrome, Safari, Firefox)
5. Enable hardware acceleration in browser

### Storage Management
1. Check used storage: Settings → Storage
2. Clear unused browser data
3. Archive old trades to JSON
4. Back up important trades to GitHub

---

## Getting Help

### Documentation
- `/CODE_QUALITY_GUIDE.md` - Architecture details
- `/RESPONSIVE_DESIGN_GUIDE.md` - Design standards
- `/GITHUB_SYNC_SETUP.md` - GitHub integration
- Inline JSDoc comments in source code

### Debugging
1. Enable browser DevTools (F12)
2. Check Console tab for errors
3. Use Network tab for GitHub issues
4. Check Application → Storage for localStorage

### Contact
For bugs or features, create an issue with:
- Specific error message
- Steps to reproduce
- Device/browser used
- Screenshots if applicable

---

## Best Practices

### Journaling
1. Log trades immediately after exit
2. Add detailed pre-trade notes
3. Analyze trades in post-notes
4. Be honest about wins/losses
5. Review mistakes weekly

### Organization
1. Use consistent setup names
2. Include timeframe in journal
3. Add screenshots for important trades
4. Keep notes concise but detailed
5. Export monthly backups

### Data Safety
1. Export trades monthly
2. Sync to GitHub regularly
3. Use consistent symbols
4. Backup browser data
5. Don't share access tokens

---

## Version Info

- **Next.js**: 16.0.10
- **React**: 19.2.0
- **TypeScript**: 5+
- **Tailwind CSS**: 4.1.9
- **Status**: Production Ready

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Shadcn UI](https://ui.shadcn.com)
- [GitHub REST API](https://docs.github.com/rest)
- [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
