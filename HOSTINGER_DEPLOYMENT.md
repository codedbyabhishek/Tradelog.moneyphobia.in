# Hostinger Deployment

This app is a Next.js 16 server-rendered application with:
- MySQL-backed API routes
- secure session cookies
- user authentication
- Dhan sync routes

That means it must be deployed as a `Node.js Web App`, not as static hosting.

Recommended Hostinger target:
- `Cloud Hosting` with Node.js Web App support, or
- `VPS` if you want full server control

Recommended deployment source:
- GitHub repository connection

This project uses Node.js `22.x`, which is now declared in `package.json` so Hostinger can auto-detect it correctly.

## 1. Prepare MySQL Database
1. In Hostinger hPanel, create a MySQL database and user.
2. Open phpMyAdmin for that database.
3. Run the SQL from [sql/init.sql](sql/init.sql).

## 2. Configure Environment Variables
Add these variables in your hosting app environment:
- `DB_HOST`
- `DB_PORT` (usually `3306`)
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `NODE_ENV=production`
- `NEXT_PUBLIC_ENABLE_PWA=false`
- `ADMIN_EMAILS`

Template: [.env.example](.env.example)

Use your production MySQL values here, not the temporary local database values.

If you enable paid plans with Razorpay, also add:
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_PLAN_MONTHLY_ID`
- `RAZORPAY_PLAN_YEARLY_ID`

## 3. Create The Node.js Web App In Hostinger
In hPanel:

1. Open `Websites`
2. Choose your site
3. Open `Node.js` or `Node.js Web App`
4. Choose `Deploy from GitHub`
5. Select this repository:
   - `codedbyabhishek/Tradelog.moneyphobia.in`
6. Choose branch:
   - `main`
7. Use app root:
   - `/`

## 4. Build Settings
Use these exact settings:
- Node.js version: `22.x`
- Install command: `npm install`
- Build command: `npm run build`
- Start command: `npm run start`

If Hostinger asks for the app port, use the platform-managed default and do not hardcode your own public port unless Hostinger explicitly requires it.

## 5. Domain + HTTPS
- Point your domain/subdomain to the Node app in Hostinger.
- Ensure HTTPS is enabled.
- Because auth uses secure cookies in production, HTTPS is required.

## 6. First Deployment Checks
1. Open your app URL.
2. Sign up a new account.
3. Login.
4. Add a trade.
5. Verify DB rows in `users`, `user_sessions`, and `trades` tables.
6. Create one idea/goal/filter/template and check their tables too.
7. Open `/api/health` and confirm the API responds.
8. Test Dhan sync with a very small date range first.

## 7. Quick Troubleshooting
If you don't see login/signup or other frontend changes:
1. Make sure the latest code is actually deployed (new build from latest commit).
2. Restart the Node app process after deploy.
3. Check `https://your-domain/api/auth/me`:
   - `401 {"user":null}` means new API is live and unauthenticated state is working.
   - `404` means old build or wrong deployment target.
4. Hard refresh browser (`Ctrl+Shift+R` or `Cmd+Shift+R`).

If the site loads but trades/auth fail:
1. Re-check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`
2. Confirm [sql/init.sql](sql/init.sql) was imported into the same database
3. Confirm the Hostinger Node app can reach that MySQL database

If login works locally but not in production:
1. Make sure HTTPS is enabled on the domain
2. Confirm `NODE_ENV=production`
3. Re-login after the deploy so the browser gets a fresh secure cookie

If `/admin` says access is restricted:
1. Add your admin email to `ADMIN_EMAILS`
2. Use comma-separated emails for multiple admins
3. Sign out and sign back in after updating the env var

If Razorpay upgrades are not activating:
1. Confirm the webhook URL is set in Razorpay Dashboard:
   - `https://your-domain/api/billing/webhook`
2. Confirm the webhook secret matches `RAZORPAY_WEBHOOK_SECRET`
3. Confirm both Razorpay plan IDs are correct
