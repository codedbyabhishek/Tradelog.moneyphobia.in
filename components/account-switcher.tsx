'use client';

import { Landmark, WalletCards } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccounts } from '@/lib/accounts-context';
import { getBrokerDefinition } from '@/lib/brokers';
import { cn } from '@/lib/utils';

interface AccountSwitcherProps {
  className?: string;
  compact?: boolean;
}

function accountLabel(name: string, last4: string | null) {
  return last4 ? `${name} ••••${last4}` : name;
}

export default function AccountSwitcher({ className, compact = false }: AccountSwitcherProps) {
  const { accounts, activeAccountId, isLoading, setActiveAccountId } = useAccounts();

  if (compact) {
    return (
      <div className={cn('flex justify-center', className)} title="Active broker account">
        <span className="flex size-9 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent text-sidebar-foreground">
          <WalletCards className="size-4" />
        </span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 px-2 text-xs font-semibold text-sidebar-foreground">
        <WalletCards className="size-3.5" />
        Active account
      </div>
      <Select value={activeAccountId} onValueChange={setActiveAccountId} disabled={isLoading}>
        <SelectTrigger className="h-10 border-sidebar-border bg-sidebar-accent/70 text-xs text-sidebar-foreground">
          <SelectValue placeholder="Loading accounts…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All accounts</SelectItem>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              <span className="inline-flex items-center gap-2">
                <Landmark className="size-3.5 text-primary" />
                {accountLabel(account.name, account.accountNumberLast4)} · {getBrokerDefinition(account.brokerId).shortLabel}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
