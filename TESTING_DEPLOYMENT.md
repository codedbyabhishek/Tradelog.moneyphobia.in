# Testing & Deployment Guide

## Testing Setup

### Unit Tests

```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

### Test Files
- `__tests__/utils.test.ts` - Core utility functions
- `__tests__/filters.test.ts` - Advanced filtering logic
- `__tests__/analytics.test.ts` - Analytics calculations

### Key Test Areas

1. **Trade Calculations**
   - P&L computation (buy/sell positions)
   - R-Factor calculations
   - Win rate calculations

2. **Filtering**
   - Date range filters
   - Symbol/Setup filters
   - P&L range filters
   - Emotion filters

3. **Analytics**
   - Weekly/Monthly P&L
   - Equity curve generation
   - Performance metrics

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Build succeeds: `npm run build`
- [ ] No console errors/warnings
- [ ] ENV variables configured
- [ ] Database migrations run
- [ ] Service worker tested offline

### Vercel Deployment (Recommended)

```bash
# 1. Connect GitHub repo to Vercel
# 2. Set environment variables in Vercel dashboard

NODE_ENV=production
NEXT_PUBLIC_API_URL=https://yourdomain.com

# 3. Deploy
vercel deploy --prod
```

### Environment Variables

```
# .env.production
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://yourdomain.com
NEXT_PUBLIC_GTM_ID=GTM-XXXXX  # For analytics
```

---

## Performance Optimization

### Bundle Size
- Current: ~250KB (gzipped)
- Target: < 300KB

### Metrics
- First Contentful Paint (FCP): < 2s
- Largest Contentful Paint (LCP): < 2.5s
- Cumulative Layout Shift (CLS): < 0.1

### Optimization Tips
```bash
# Analyze bundle
npm install --save-dev @next/bundle-analyzer

# In next.config.mjs
import withBundleAnalyzer from '@next/bundle-analyzer';
export default withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })(config);

# Run
ANALYZE=true npm run build
```

---

## Production Monitoring

### Setup Monitoring
1. **Sentry** (Error tracking)
2. **Vercel Analytics** (Performance)
3. **Google Analytics** (User behavior)

### Critical Metrics to Track
- Error rate
- API response times
- Database query times
- User engagement
- Revenue (if applicable)

---

## Backup & Recovery

### Data Backup
```bash
# Export all trades as JSON weekly
# Setup automated exports to cloud storage (S3, GCS, etc.)

# Export script
npm run export-trades

# Restore from backup
npm run import-trades -- backups/trades-2024-01-15.json
```

### Disaster Recovery Plan
1. **Daily backups** to cloud storage
2. **Weekly full exports** to long-term storage
3. **Monthly snapshots** of database
4. **Quick recovery**: < 1 hour data loss acceptable

---

## Security Checklist

- [ ] HTTPS enabled
- [ ] Environment variables not in code
- [ ] API endpoints validated/sanitized
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] Security headers set
- [ ] Dependencies updated
- [ ] No hardcoded secrets

### Security Headers (next.config.mjs)
```javascript
headers: async () => [
  {
    source: '/(.*)',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ],
  },
],
```

---

## Rollback Plan

### Immediate Rollback
```bash
# Vercel automatic rollback
vercel rollback

# Or deploy previous version
vercel deploy --prod --ref=main~1
```

### After Rollback
1. Investigate error
2. Fix in new branch
3. Test thoroughly
4. Deploy to staging first
5. Gradual rollout (25% → 50% → 100%)

---

## Post-Deployment Monitoring (First 24h)

- [ ] Error rates normal
- [ ] Performance metrics good
- [ ] No data loss
- [ ] PWA working offline
- [ ] Notifications sending
- [ ] Database responsive
- [ ] API latency < 500ms

## Deployment Timeline

**Week 1: Testing**
- Unit tests: 20% coverage
- Integration tests: Critical paths
- Manual QA: Full app

**Week 2: Staging**
- Deploy to staging environment
- Load testing
- Security audit
- Final QA

**Week 3: Production**
- Blue-green deployment
- Gradual rollout (monitored)
- 24/7 monitoring
- Support team on-call
