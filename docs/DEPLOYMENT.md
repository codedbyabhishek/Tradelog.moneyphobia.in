# Deployment Guide

This project is a Next.js application with MySQL-backed server routes.

## Requirements

- Node.js hosting
- MySQL database
- environment variable support
- HTTPS in production

## Required environment variables

Use values that match your production database:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
NODE_ENV=production
NEXT_PUBLIC_ENABLE_PWA=false
```

Base template: [.env.example](../.env.example)

## Database setup

Run the schema in:

- [sql/init.sql](../sql/init.sql)

This creates tables for:

- users
- sessions
- trades
- ideas
- goals
- filters
- templates
- settings
- rate limits

## Vercel deployment

### Recommended use case

Use Vercel when:

- you want easy Next.js hosting
- your database is hosted separately
- you want preview deployments

### Steps

1. Push the repo to GitHub.
2. Import the repo into Vercel.
3. Add the required environment variables in the Vercel project settings.
4. Deploy.
5. Verify signup, login, trade create, and Dhan sync.

### Build settings

- Install command: `npm install`
- Build command: `npm run build`
- Output: default Next.js output

## Hostinger deployment

### Recommended use case

Use Hostinger when:

- you already host MySQL there
- you want app and database under one provider

### Steps

1. Create a MySQL database and user in hPanel.
2. Open phpMyAdmin.
3. Run [sql/init.sql](../sql/init.sql).
4. Upload or connect the project repository.
5. Configure environment variables.
6. Use:
   - Install: `npm install`
   - Build: `npm run build`
   - Start: `npm run start`
   - Node.js version: `22.x`
7. Enable HTTPS.

See also: [HOSTINGER_DEPLOYMENT.md](../HOSTINGER_DEPLOYMENT.md)

## Post-deploy checks

After deployment verify:

1. Home page loads
2. Signup works
3. Login works
4. Trade save works
5. Trade log reloads correctly
6. Theme toggle works
7. Mobile navigation works
8. Dhan status check works
9. Dhan sync works with a small date range

## Troubleshooting

### App loads but auth or trades fail

- Check DB credentials
- Confirm schema was imported
- Confirm server can reach MySQL

### Login works locally but not in production

- Ensure HTTPS is enabled
- Secure cookies need HTTPS in production

### Dhan sync fails

- Re-check saved `clientId`
- Replace expired access token
- Try a smaller date range first

### Build warnings

The `baseline-browser-mapping` warning is non-blocking and does not stop the build.
