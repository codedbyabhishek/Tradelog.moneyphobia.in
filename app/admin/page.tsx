import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, Activity, Crown, Wallet, Database, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/server/auth';
import { dbQuery } from '@/lib/server/db';
import { canAccessAdmin } from '@/lib/server/admin';
import { normalizeBillingState } from '@/lib/subscription';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Traderlogify',
  description: 'Private admin dashboard for Traderlogify operators.',
  robots: {
    index: false,
    follow: false,
  },
};

interface CountRow {
  count: number;
}

interface SettingsRow {
  user_id: number;
  value_json: string;
}

interface RecentUserRow {
  id: number;
  email: string;
  name: string | null;
  created_at: string;
}

interface SubscriptionRow {
  user_id: number;
  email: string;
  name: string | null;
  subscription_id: string;
  plan_code: string;
  billing_cycle: string;
  status: string;
  updated_at: string;
}

interface ActivityRow {
  email: string;
  trade_count: number;
  last_trade_date: string | null;
}

function formatDate(value: string | null) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDateOnly(value: string | null) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    dateStyle: 'medium',
  });
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: typeof Users;
}) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Admin Sign-In Required</CardTitle>
              <CardDescription>
                Sign in with an admin account to view Traderlogify business metrics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/app">Open App Login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (!canAccessAdmin(user)) {
    return (
      <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Admin Access Restricted</CardTitle>
              <CardDescription>
                Your signed-in account is not currently on the admin allowlist.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Add your email to the <code>ADMIN_EMAILS</code> environment variable to enable admin access.
              </p>
              <p>
                Example: <code>ADMIN_EMAILS=you@example.com,team@example.com</code>
              </p>
              <Button asChild variant="outline">
                <Link href="/app">Back to App</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const [
    userCountRows,
    activeSessionRows,
    tradeCountRows,
    ideaCountRows,
    dhanConfigRows,
    billingRows,
    recentUsers,
    recentSubscriptions,
    topActivityRows,
  ] = await Promise.all([
    dbQuery<CountRow[]>('SELECT COUNT(*) AS count FROM users'),
    dbQuery<CountRow[]>('SELECT COUNT(DISTINCT user_id) AS count FROM user_sessions WHERE expires_at > NOW()'),
    dbQuery<CountRow[]>('SELECT COUNT(*) AS count FROM trades'),
    dbQuery<CountRow[]>('SELECT COUNT(*) AS count FROM ideas'),
    dbQuery<CountRow[]>("SELECT COUNT(*) AS count FROM user_settings WHERE key_name = 'broker_dhan_config'"),
    dbQuery<SettingsRow[]>("SELECT user_id, value_json FROM user_settings WHERE key_name = 'billing'"),
    dbQuery<RecentUserRow[]>(
      `SELECT id, email, name, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT 12`
    ),
    dbQuery<SubscriptionRow[]>(
      `SELECT b.user_id, u.email, u.name, b.subscription_id, b.plan_code, b.billing_cycle, b.status, b.updated_at
       FROM billing_subscriptions b
       INNER JOIN users u ON u.id = b.user_id
       ORDER BY b.updated_at DESC
       LIMIT 12`
    ),
    dbQuery<ActivityRow[]>(
      `SELECT u.email, COUNT(t.id) AS trade_count, MAX(t.trade_date) AS last_trade_date
       FROM users u
       LEFT JOIN trades t ON t.user_id = u.id
       GROUP BY u.id, u.email
       ORDER BY trade_count DESC, last_trade_date DESC
       LIMIT 10`
    ),
  ]);

  let proUsers = 0;
  let trialingUsers = 0;
  let monthlyProUsers = 0;
  let yearlyProUsers = 0;

  for (const row of billingRows) {
    const billing = normalizeBillingState(JSON.parse(row.value_json));
    if (billing.plan === 'pro') {
      proUsers += 1;
      if (billing.status === 'trialing') {
        trialingUsers += 1;
      }
      if (billing.billingCycle === 'yearly') {
        yearlyProUsers += 1;
      } else {
        monthlyProUsers += 1;
      }
    }
  }

  const activeUsers = activeSessionRows[0]?.count ?? 0;
  const totalUsers = userCountRows[0]?.count ?? 0;
  const totalTrades = tradeCountRows[0]?.count ?? 0;
  const totalIdeas = ideaCountRows[0]?.count ?? 0;
  const dhanUsers = dhanConfigRows[0]?.count ?? 0;
  const estimatedMrr = monthlyProUsers * 499 + Math.round((yearlyProUsers * 4999) / 12);

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Private admin area
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">Traderlogify Admin Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Track signups, product usage, billing health, and the growth of your trading journal business.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm">
              <p className="font-medium">Signed in as</p>
              <p className="mt-1 text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard title="Total Users" value={totalUsers} description="All registered accounts" icon={Users} />
          <MetricCard title="Active Sessions" value={activeUsers} description="Users with live sessions" icon={Activity} />
          <MetricCard title="Pro Users" value={proUsers} description={`${trialingUsers} currently trialing`} icon={Crown} />
          <MetricCard title="Estimated MRR" value={`₹${estimatedMrr}`} description="Blended monthly recurring revenue estimate" icon={Wallet} />
          <MetricCard title="Dhan Connected" value={dhanUsers} description="Users with saved Dhan broker config" icon={Database} />
          <MetricCard title="Content Created" value={`${totalTrades} trades / ${totalIdeas} ideas`} description="Core journal usage volume" icon={ShieldCheck} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Recent Signups</CardTitle>
              <CardDescription>Latest user registrations across the product.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-3 pr-4 font-medium">User</th>
                    <th className="py-3 pr-4 font-medium">Email</th>
                    <th className="py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((row) => (
                    <tr key={row.id} className="border-b border-border/60">
                      <td className="py-3 pr-4">{row.name || 'No name'}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{row.email}</td>
                      <td className="py-3 text-muted-foreground">{formatDate(row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Plan Snapshot</CardTitle>
              <CardDescription>Quick distribution between free and paid usage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Free users</span>
                  <Badge variant="secondary">{Math.max(totalUsers - proUsers, 0)}</Badge>
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pro monthly</span>
                  <Badge>{monthlyProUsers}</Badge>
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pro yearly</span>
                  <Badge>{yearlyProUsers}</Badge>
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Trialing</span>
                  <Badge variant="outline">{trialingUsers}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Recent Subscription Activity</CardTitle>
              <CardDescription>Latest Razorpay subscription records saved by the app.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-3 pr-4 font-medium">User</th>
                    <th className="py-3 pr-4 font-medium">Plan</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSubscriptions.length > 0 ? (
                    recentSubscriptions.map((row) => (
                      <tr key={row.subscription_id} className="border-b border-border/60">
                        <td className="py-3 pr-4">
                          <div>{row.name || 'No name'}</div>
                          <div className="text-xs text-muted-foreground">{row.email}</div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="font-medium">{row.plan_code.toUpperCase()}</div>
                          <div className="text-xs text-muted-foreground capitalize">{row.billing_cycle}</div>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={row.status === 'active' ? 'default' : 'outline'}>{row.status}</Badge>
                        </td>
                        <td className="py-3 text-muted-foreground">{formatDate(row.updated_at)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-4 text-muted-foreground" colSpan={4}>
                        No subscriptions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Top User Activity</CardTitle>
              <CardDescription>Most active accounts by trade volume.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topActivityRows.map((row) => (
                <div key={row.email} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.email}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Last trade: {formatDateOnly(row.last_trade_date)}
                      </p>
                    </div>
                    <Badge variant="secondary">{row.trade_count} trades</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
