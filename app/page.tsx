import Link from 'next/link';
import { createPublicMetadata } from '@/lib/seo';
import { Button } from '@/components/ui/button';
import SiteFooter from '@/components/site-footer';
import { HeroBoardIllustration } from '@/components/brand-illustrations';
import PricingCards from '@/components/pricing-cards';

export const metadata = createPublicMetadata({
  title: 'Trading Journal for Dhan Sync, Screenshots, and Trade Review',
  description: 'Traderlogify helps traders sync Dhan history, annotate screenshots, review setups, and build repeatable trading discipline with a structured journal.',
  path: '/',
});

const featureGroups = [
  {
    title: 'Broker Sync',
    description: 'Import read-only Dhan history into your journal without disturbing manual entries or your review workflow.',
  },
  {
    title: 'Screenshot Review',
    description: 'Attach before-and-after trade screenshots, zoom them on the dashboard, and keep visual context with each trade.',
  },
  {
    title: 'Setup Tracking',
    description: 'Tag setup names, fib levels, notes, emotions, and outcomes so your review process stays structured.',
  },
  {
    title: 'Favorites Board',
    description: 'Pin the trades and ideas that matter most into a visual favorites wall for quick recall.',
  },
  {
    title: 'Analytics',
    description: 'Review P&L, weekly patterns, reports, and advanced analysis from one place instead of scattered notes.',
  },
  {
    title: 'Mobile Ready',
    description: 'Use the journal comfortably on phones and tablets with working bottom navigation, theme controls, and modals.',
  },
];

const workflow = [
  'Sync trades from Dhan or add them manually.',
  'Enrich each trade with setups, fib levels, notes, and screenshots.',
  'Review favorites, reports, and weekly patterns to improve execution.',
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

      <section className="relative overflow-hidden border-b border-border/70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(234,179,8,0.16),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_32%)]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-16 sm:px-6 lg:px-8 lg:flex-row lg:items-center lg:py-24">
          <div className="max-w-3xl flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Trading Journal for Serious Review</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Review trades with structure, screenshots, and Dhan sync.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Traderlogify gives you one place to import broker history, document trade ideas,
              track setups and fib levels, and study what actually improves your execution.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/app">Open Journal App</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/faq">Explore Features</Link>
              </Button>
            </div>
            <div className="mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sync</p>
                <p className="mt-2 text-lg font-semibold">Read-only Dhan import</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Review</p>
                <p className="mt-2 text-lg font-semibold">Screenshot journaling</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Insight</p>
                <p className="mt-2 text-lg font-semibold">Favorites and analytics</p>
              </div>
            </div>
          </div>

          <div className="w-full max-w-xl flex-1">
            <HeroBoardIllustration />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
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
            <div key={feature.title} className="rounded-2xl border border-border/70 bg-card p-5">
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
            </div>
          ))}
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
                <Link href="/app">Go to App</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Pricing</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Start free, upgrade when your review workflow gets serious.</h2>
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
