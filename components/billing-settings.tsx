'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useIdeas } from '@/lib/ideas-context';
import { useSettings } from '@/lib/settings-context';
import { useTrades } from '@/lib/trade-context';
import { getPlanLabel, getUsageProgress, isProPlan, SUBSCRIPTION_LIMITS } from '@/lib/subscription';
import RazorpayUpgradeButton from '@/components/razorpay-upgrade-button';

export default function BillingSettings() {
  const { billingState } = useSettings();
  const { trades } = useTrades();
  const { ideas } = useIdeas();

  const plan = billingState.plan;
  const planLabel = getPlanLabel(plan);
  const limits = SUBSCRIPTION_LIMITS[plan];
  const pro = isProPlan(billingState);
  const screenshotCount = trades.filter((trade) => trade.beforeTradeScreenshot || trade.afterExitScreenshot).length;

  const usageItems = [
    { label: 'Trades', used: trades.length, limit: limits.trades },
    { label: 'Trade Ideas', used: ideas.length, limit: limits.ideas },
    { label: 'Screenshots', used: screenshotCount, limit: limits.screenshots },
  ];

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Billing & Plan</CardTitle>
            <CardDescription>Start free, then upgrade when you need deeper review features.</CardDescription>
          </div>
          <Badge variant={pro ? 'default' : 'secondary'}>{planLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
          <p className="text-sm font-medium">Current plan: {planLabel}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {pro
              ? 'You have access to unlimited journaling, Dhan sync, exports, and advanced review tools.'
              : 'You are on the Free plan with usage limits and basic review features.'}
          </p>
        </div>

        <div className="space-y-4">
          {usageItems.map((item) => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{item.label}</span>
                <span className="text-muted-foreground">
                  {item.used}
                  {Number.isFinite(item.limit) ? ` / ${item.limit}` : ' / Unlimited'}
                </span>
              </div>
              <Progress value={getUsageProgress(item.used, item.limit)} className="h-2" />
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium">Pro unlocks</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>• Dhan broker sync</li>
            <li>• Unlimited trades, ideas, and screenshots</li>
            <li>• Advanced analytics and emotion analyzer</li>
            <li>• CSV/JSON exports and deeper reporting</li>
          </ul>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {!pro ? <RazorpayUpgradeButton billingCycle="monthly" label="Upgrade Monthly" /> : null}
          {!pro ? <RazorpayUpgradeButton billingCycle="yearly" label="Upgrade Yearly" /> : null}
          <Button asChild variant="outline">
            <Link href="/pricing">Open Pricing</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
