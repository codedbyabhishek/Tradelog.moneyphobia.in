'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DhanSyncCard from '@/components/dhan-sync-card';
import { BROKER_DEFINITIONS } from '@/lib/brokers';
import { Landmark, RadioTower, ShieldCheck } from 'lucide-react';

function brokerIcon(id: string) {
  switch (id) {
    case 'zerodha':
      return Landmark;
    case 'upstox':
      return RadioTower;
    case 'angelone':
      return ShieldCheck;
    default:
      return Landmark;
  }
}

export default function BrokerSyncCards() {
  const upcomingBrokers = BROKER_DEFINITIONS.filter(
    (broker) => broker.id !== 'manual' && broker.id !== 'dhan'
  );

  return (
    <>
      <DhanSyncCard />
      {upcomingBrokers.map((broker) => {
        const Icon = brokerIcon(broker.id);
        return (
          <Card
            key={broker.id}
            className="h-full rounded-xl border-border bg-card/90 transition-colors hover:border-primary/30"
          >
            <CardHeader className="p-3 pb-1.5 sm:p-3.5 sm:pb-1.5 lg:p-4 lg:pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-[11px] sm:text-xs font-medium text-muted-foreground">
                  {broker.label} Sync
                </CardTitle>
                <Icon className="h-4 w-4 text-primary/80" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-0 sm:p-3.5 sm:pt-0 lg:p-4 lg:pt-0">
              <div className="flex items-center gap-2">
                <div className="text-base font-bold leading-tight text-foreground">Coming Soon</div>
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                  Planned
                </Badge>
              </div>
              <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
                The broker hub is now ready for multiple connectors. {broker.label} can plug into the same sync flow next.
              </p>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}
