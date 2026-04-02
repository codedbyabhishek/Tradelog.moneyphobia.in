'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription';
import RazorpayUpgradeButton from '@/components/razorpay-upgrade-button';

interface PricingCardsProps {
  compact?: boolean;
}

export default function PricingCards({ compact = false }: PricingCardsProps) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2', compact && 'gap-3')}>
      {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
        const isPro = plan.id === 'pro';
        return (
          <Card
            key={plan.id}
            className={cn(
              'relative overflow-hidden border-border/70',
              isPro && 'border-primary/40 bg-primary/5'
            )}
          >
            {isPro && (
              <Badge className="absolute right-4 top-4">Most Popular</Badge>
            )}
            <CardHeader className={compact ? 'pb-3' : undefined}>
              <CardTitle className="flex items-center gap-2 text-2xl">
                {plan.name}
              </CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1">
                <p className="text-3xl font-bold">{plan.priceMonthly}</p>
                <p className="text-sm text-muted-foreground">{plan.priceYearly}</p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              {isPro ? (
                <div className="space-y-2">
                  <RazorpayUpgradeButton billingCycle="monthly" label="Upgrade Monthly" className="w-full" />
                  <RazorpayUpgradeButton billingCycle="yearly" label="Upgrade Yearly" className="w-full" />
                </div>
              ) : (
                <Button asChild className="w-full" variant="outline">
                  <Link href="/app">{plan.cta}</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
