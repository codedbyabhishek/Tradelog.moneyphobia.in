'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface UpgradeBannerProps {
  title: string;
  description: string;
}

export default function UpgradeBanner({ title, description }: UpgradeBannerProps) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            Pro feature
          </div>
          <h3 className="mt-2 text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/pricing">View Pricing</Link>
          </Button>
          <Button asChild>
            <Link href="mailto:hello@traderlogify.online?subject=Traderlogify%20Pro%20Upgrade">Upgrade to Pro</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
