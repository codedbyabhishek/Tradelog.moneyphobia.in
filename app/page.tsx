import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  ClipboardCheck,
  DatabaseZap,
  Layers3,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Target,
} from 'lucide-react';
import { createPublicMetadata } from '@/lib/seo';
import { Button } from '@/components/ui/button';
import SiteFooter from '@/components/site-footer';
import { HeroBoardIllustration } from '@/components/brand-illustrations';
import PricingCards from '@/components/pricing-cards';
import PublicSiteHeader from '@/components/public-site-header';
import TrackedLink from '@/components/tracked-link';
import HomeHeroSmoke from '@/components/home-hero-smoke';

export const metadata = createPublicMetadata({
  title: 'Trading Journal for Dhan Sync, Screenshots, and Trade Review',
  description: 'Traderlogify helps traders sync Dhan history, annotate screenshots, review setups, and build repeatable trading discipline with a structured journal.',
  path: '/',
});

const featureGroups = [
  {
    icon: DatabaseZap,
    title: 'Broker Sync',
    eyebrow: 'Capture',
    description: 'Import read-only Dhan history into your journal without disturbing manual entries or your review workflow.',
  },
  {
    icon: Layers3,
    title: 'Screenshot Review',
    eyebrow: 'Context',
    description: 'Attach before-and-after trade screenshots, zoom them on the dashboard, and keep visual context with each trade.',
  },
  {
    icon: Target,
    title: 'Setup Tracking',
    eyebrow: 'Structure',
    description: 'Tag setup names, fib levels, notes, emotions, and outcomes so your review process stays structured.',
  },
  {
    icon: Sparkles,
    title: 'Favorites Board',
    eyebrow: 'Recall',
    description: 'Pin the trades and ideas that matter most into a visual favorites wall for quick recall.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    eyebrow: 'Insight',
    description: 'Review P&L, weekly patterns, reports, and advanced analysis from one place instead of scattered notes.',
  },
  {
    icon: Smartphone,
    title: 'Mobile Ready',
    eyebrow: 'Access',
    description: 'Use the journal comfortably on phones and tablets with working bottom navigation, theme controls, and modals.',
  },
];

const workflow = [
  'Sync trades from Dhan or add them manually.',
  'Enrich each trade with setups, fib levels, notes, and screenshots.',
  'Review favorites, reports, and weekly patterns to improve execution.',
];

const reviewPillars: {
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    title: 'Capture the full trade',
    description: 'Import broker fills, keep manual entries, and add the exact context you were trading from.',
    icon: ClipboardCheck,
  },
  {
    title: 'Review with evidence',
    description: 'Screenshots, emotions, setup tags, and notes stay attached to the trade instead of floating in chats or folders.',
    icon: ShieldCheck,
  },
  {
    title: 'Refine your playbook',
    description: 'Use reports, favorites, and analytics to find what deserves repetition and what needs to stop.',
    icon: BarChart3,
  },
];

const spotlightStats = [
  {
    value: '1 journal',
    label: 'for manual trades, synced broker history, and review notes',
  },
  {
    value: '3-step loop',
    label: 'capture, annotate, and review without leaving the product',
  },
  {
    value: 'Free to start',
    label: 'with room to upgrade when your process needs deeper tooling',
  },
];

const insightSnapshots = [
  {
    title: 'Before and after screenshots',
    description: 'Keep the visual story of the trade beside the numbers so your review stays concrete.',
  },
  {
    title: 'Emotion and setup notes',
    description: 'See whether your best outcomes come from discipline, timing, or specific playbook conditions.',
  },
  {
    title: 'Favorites and weekly review',
    description: 'Build a repeatable study habit around the trades worth revisiting, not endless scrolling.',
  },
];

const comparisonRows = [
  {
    feature: 'Trade journal entries',
    free: 'Up to 100 trades',
    pro: 'Unlimited trades',
  },
  {
    feature: 'Trade ideas',
    free: 'Up to 20 ideas',
    pro: 'Unlimited ideas',
  },
  {
    feature: 'Screenshots and favorites',
    free: 'Limited storage',
    pro: 'Unlimited review library',
  },
  {
    feature: 'Manual trade journaling',
    free: 'Included',
    pro: 'Included',
  },
  {
    feature: 'Dhan broker sync',
    free: 'Not included',
    pro: 'Included',
  },
  {
    feature: 'Advanced analytics',
    free: 'Basic dashboard only',
    pro: 'Included',
  },
  {
    feature: 'Emotion analyzer',
    free: 'Not included',
    pro: 'Included',
  },
  {
    feature: 'Exports',
    free: 'Not included',
    pro: 'Included',
  },
];

const faqSchema = [
  {
    question: 'Does Traderlogify support Dhan broker sync?',
    answer: 'Yes. The app supports read-only Dhan trade sync so you can import history into the journal and then enrich each trade with notes, setup names, fib levels, and screenshots.',
  },
  {
    question: 'Can I still add manual trades?',
    answer: 'Yes. Manual trade entry continues to work alongside synced broker trades, so you can keep your existing workflow intact.',
  },
  {
    question: 'Can I review trades with screenshots?',
    answer: 'Yes. You can upload before-trade and after-exit screenshots, save them with the trade, and zoom images from the favorites board.',
  },
];

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'Traderlogify',
      url: 'https://traderlogify.online',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Traderlogify',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      description:
        'Trading journal for Dhan sync, screenshots, setup tracking, favorites, and performance review.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: faqSchema.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    },
  ],
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <PublicSiteHeader />

      <section data-hero-shell className="relative overflow-hidden border-b border-border/70">
        <HomeHeroSmoke />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(234,179,8,0.16),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_32%)]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]" />
        <div className="absolute left-[12%] top-28 h-44 w-44 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="absolute right-[10%] top-20 h-52 w-52 rounded-full bg-pink-400/10 blur-3xl" />
        <div className="absolute left-1/2 top-20 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-16 sm:px-6 lg:px-8 lg:flex-row lg:items-center lg:py-24">
          <div data-hero-copy className="max-w-3xl flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary shadow-sm shadow-primary/10">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Trading Journal for Serious Review
            </div>
            <h1 data-hero-title className="mt-4 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Review trades with structure, screenshots, and Dhan sync.
            </h1>
            <div
              aria-hidden="true"
              className="hero-drawing-wordmark mt-5 max-w-[20rem] sm:max-w-[26rem] lg:max-w-[30rem]"
            >
              <svg
                viewBox="0 0 760 130"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-auto w-full"
              >
                <text
                  x="10"
                  y="92"
                  className="hero-drawing-wordmark__text"
                >
                  Trade. Review. Refine.
                </text>
              </svg>
            </div>
            <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Traderlogify gives you one place to import broker history, document trade ideas,
              track setups and fib levels, and study what actually improves your execution.
            </p>
            <div className="mt-6 grid max-w-2xl grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <div className="rounded-2xl border border-white/25 bg-white/45 px-4 py-3 shadow-lg shadow-sky-500/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                <p className="text-xs uppercase tracking-[0.18em] text-primary">Review Depth</p>
                <p className="mt-1 font-medium text-foreground">Emotions, setups, screenshots, and P&amp;L in one loop</p>
              </div>
              <div className="rounded-2xl border border-white/25 bg-white/45 px-4 py-3 shadow-lg shadow-fuchsia-500/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                <p className="text-xs uppercase tracking-[0.18em] text-primary">Clarity</p>
                <p className="mt-1 font-medium text-foreground">Keep manual logs and broker imports together</p>
              </div>
              <div className="rounded-2xl border border-white/25 bg-white/45 px-4 py-3 shadow-lg shadow-amber-500/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                <p className="text-xs uppercase tracking-[0.18em] text-primary">Momentum</p>
                <p className="mt-1 font-medium text-foreground">Build a repeatable habit instead of scattered notes</p>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <TrackedLink
                  href="/signup"
                  eventParams={{
                    content_type: 'cta',
                    content_id: 'hero_signup',
                  }}
                >
                  Create Free Account
                </TrackedLink>
              </Button>
              <Button asChild variant="outline" size="lg">
                <TrackedLink
                  href="/faq"
                  eventParams={{
                    content_type: 'cta',
                    content_id: 'hero_explore_features',
                  }}
                >
                  Explore Features
                </TrackedLink>
              </Button>
            </div>
            <div data-hero-metrics className="mt-8 rounded-3xl border border-border/70 bg-card/75 p-4 shadow-xl shadow-black/5 backdrop-blur sm:p-5">
              <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sync</p>
                  <p className="mt-2 text-lg font-semibold">Read-only Dhan import</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Review</p>
                  <p className="mt-2 text-lg font-semibold">Screenshot journaling</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Insight</p>
                  <p className="mt-2 text-lg font-semibold">Favorites and analytics</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5">Manual + synced trades together</span>
                <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5">Pre-trade to review workflow</span>
                <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5">Built for desktop and mobile</span>
              </div>
            </div>
          </div>

          <div data-hero-visual className="relative w-full max-w-xl flex-1">
            <div className="absolute -left-4 top-8 hidden rounded-2xl border border-white/30 bg-white/55 px-4 py-3 shadow-xl shadow-sky-500/10 backdrop-blur-xl lg:block dark:border-white/10 dark:bg-white/10">
              <p className="text-xs uppercase tracking-[0.18em] text-primary">Pro Insight</p>
              <p className="mt-1 text-sm font-semibold text-foreground">Sync. Screenshot. Study. Improve.</p>
            </div>
            <div className="absolute -bottom-4 right-0 hidden rounded-2xl border border-white/30 bg-white/55 px-4 py-3 shadow-xl shadow-pink-500/10 backdrop-blur-xl lg:block dark:border-white/10 dark:bg-white/10">
              <p className="text-xs uppercase tracking-[0.18em] text-primary">New Theme</p>
              <p className="mt-1 text-sm font-semibold text-foreground">Prism Glass is now available</p>
            </div>
            <HeroBoardIllustration />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="homepage-storyband overflow-hidden rounded-[32px] border border-border/70">
          <div className="grid gap-6 p-6 md:grid-cols-[1.05fr_0.95fr] md:p-8 lg:p-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Review Loop</p>
              <h2 className="mt-3 max-w-xl text-3xl font-bold sm:text-4xl">
                Your edge usually lives in the notes, screenshots, and repeated mistakes.
              </h2>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                Traderlogify is designed for traders who want a usable review system, not just a place to dump numbers.
                It helps you connect execution, context, and follow-up inside one routine.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {spotlightStats.map((stat) => (
                  <div key={stat.value} className="rounded-2xl border border-white/10 bg-background/75 p-4 backdrop-blur">
                    <p className="text-lg font-semibold">{stat.value}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              {reviewPillars.map((pillar) => (
                <div key={pillar.title} className="rounded-2xl border border-white/10 bg-background/75 p-4 backdrop-blur">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                      <pillar.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{pillar.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{pillar.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Why It Works</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">A journal designed around review, not just data entry.</h2>
          <p className="mt-4 text-muted-foreground">
            The product keeps broker imports, manual edits, screenshots, favorites, and analytics in the same workflow,
            so your review process stays practical instead of fragmented.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featureGroups.map((feature) => (
            <div key={feature.title} className="homepage-feature-card rounded-[28px] border border-border/70 bg-card p-5 shadow-lg shadow-black/5 transition-transform duration-200 hover:-translate-y-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{feature.eyebrow}</p>
                  <h3 className="mt-2 text-lg font-semibold">{feature.title}</h3>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border/70 bg-background/70">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">What You See</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">A homepage promise that matches the actual workflow inside the app.</h2>
            <p className="mt-4 text-muted-foreground">
              The experience is built around concrete review artifacts: trade screenshots, setup tags, favorites,
              performance reports, and a private app workspace that keeps your journaling habit organized.
            </p>
            <div className="mt-6 rounded-3xl border border-border/70 bg-card/80 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Inside The Product</p>
              <p className="mt-3 text-base font-semibold">You are not forced into a broker-only or notes-only workflow.</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Manual entries and synced trades can live together, which makes the review layer more useful for discretionary traders.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {insightSnapshots.map((item, index) => (
              <div
                key={item.title}
                className="homepage-snapshot-card rounded-[28px] border border-border/70 p-5 shadow-lg shadow-black/5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  0{index + 1}
                </p>
                <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/70 bg-[linear-gradient(180deg,rgba(250,250,250,0.55),rgba(250,250,250,0.12))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.35),rgba(15,23,42,0.08))]">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Free Vs Pro</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">See exactly what stays free and what unlocks in Pro.</h2>
            <p className="mt-4 text-muted-foreground">
              The free version is enough to build a real journaling habit. Pro is for traders who want sync, deeper analysis,
              unlimited storage, and a more serious review engine.
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl border border-border/70 bg-background/90 shadow-2xl shadow-black/5">
            <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr] border-b border-border/70 bg-card/80">
              <div className="px-4 py-4 text-sm font-semibold sm:px-6">Feature</div>
              <div className="border-l border-border/70 px-4 py-4 text-sm font-semibold sm:px-6">Free</div>
              <div className="border-l border-border/70 bg-primary/5 px-4 py-4 text-sm font-semibold text-primary sm:px-6">Pro</div>
            </div>
            {comparisonRows.map((row, index) => (
              <div
                key={row.feature}
                className={`grid grid-cols-[1.2fr_0.9fr_0.9fr] ${index !== comparisonRows.length - 1 ? 'border-b border-border/70' : ''}`}
              >
                <div className="px-4 py-4 text-sm font-medium sm:px-6">{row.feature}</div>
                <div className="border-l border-border/70 px-4 py-4 text-sm text-muted-foreground sm:px-6">{row.free}</div>
                <div className="border-l border-border/70 bg-primary/5 px-4 py-4 text-sm font-medium sm:px-6">{row.pro}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <TrackedLink
                href="/pricing"
                eventParams={{
                  content_type: 'cta',
                  content_id: 'free_vs_pro_see_pricing',
                }}
              >
                See Full Pricing
              </TrackedLink>
            </Button>
            <Button asChild variant="outline">
              <TrackedLink
                href="/signup"
                eventParams={{
                  content_type: 'cta',
                  content_id: 'free_vs_pro_signup',
                }}
              >
                Try Free Version
              </TrackedLink>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-y border-border/70 bg-card/30">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Workflow</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Keep your trade review loop clean and repeatable.</h2>
            <div className="mt-6 space-y-4">
              {workflow.map((step, index) => (
                <div key={step} className="flex gap-4 rounded-2xl border border-border/70 bg-background/80 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {index + 1}
                  </div>
                  <p className="pt-2 text-sm text-muted-foreground">{step}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-border/70 bg-background/90 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Best Fit</p>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>Traders who want one journal for broker-imported and manual trades.</li>
              <li>Review-focused workflows that rely on screenshots, annotations, and setup tracking.</li>
              <li>Users who want mobile access without losing desktop-level analysis features.</li>
            </ul>
            <div className="mt-6 rounded-2xl border border-border/70 bg-card p-4">
              <p className="text-base font-semibold">Start with the app, keep the review habit.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Your app experience stays private under <span className="font-mono">/app</span>, while the home page stays fast and SEO-friendly.
              </p>
              <Button asChild className="mt-4 w-full">
                <TrackedLink
                  href="/login"
                  eventParams={{
                    content_type: 'cta',
                    content_id: 'best_fit_go_to_login',
                  }}
                >
                  Login to App
                </TrackedLink>
              </Button>
            </div>
            <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-foreground">Pro is built for deeper review</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Unlock Dhan sync, advanced analytics, emotion analysis, exports, and unlimited journals when your process needs more depth.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Pricing</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Start free, then unlock the deeper review stack when you need it.</h2>
          <p className="mt-4 text-muted-foreground">
            Traderlogify starts with a generous free plan and scales into Pro for active traders who need sync,
            exports, and deeper analytics.
          </p>
        </div>
        <div className="mt-8">
          <PricingCards compact />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="homepage-final-cta rounded-[32px] border border-border/70 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Start Reviewing Better</p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Build a cleaner trading routine without rebuilding your entire process.</h2>
              <p className="mt-4 text-muted-foreground">
                Start with the free version, bring your existing manual workflow, and add sync, exports,
                and deeper analytics when you are ready.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <TrackedLink
                  href="/signup"
                  eventParams={{
                    content_type: 'cta',
                    content_id: 'final_cta_signup',
                  }}
                >
                  Create Free Account
                </TrackedLink>
              </Button>
              <Button asChild variant="outline" size="lg">
                <TrackedLink
                  href="/pricing"
                  eventParams={{
                    content_type: 'cta',
                    content_id: 'final_cta_pricing',
                  }}
                >
                  Compare Plans
                </TrackedLink>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Questions</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Common questions from traders evaluating the journal.</h2>
        </div>
        <div className="mt-8 space-y-4">
          {faqSchema.map((item) => (
            <div key={item.question} className="rounded-2xl border border-border/70 bg-card p-5">
              <h3 className="text-lg font-semibold">{item.question}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
