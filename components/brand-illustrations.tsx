import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface IllustrationProps {
  className?: string;
}

function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[28px] border border-border/70 bg-card/90 shadow-2xl shadow-black/10',
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_34%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}

export function HeroBoardIllustration({ className }: IllustrationProps) {
  const cards = [
    { label: 'BTC/USDT', tone: 'rgba(56,189,248,0.35)' },
    { label: 'Strategy 02', tone: 'rgba(245,158,11,0.32)' },
    { label: 'Favorite', tone: 'rgba(16,185,129,0.32)' },
    { label: 'ADA/USDT', tone: 'rgba(59,130,246,0.32)' },
    { label: 'DOGE/USDT', tone: 'rgba(239,68,68,0.28)' },
    { label: 'Review', tone: 'rgba(168,85,247,0.24)' },
  ];

  return (
    <Frame className={cn('p-5', className)}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((card, index) => (
          <div key={card.label} className="rounded-2xl border border-border/70 bg-background/80 p-3">
            <svg viewBox="0 0 160 96" className="h-24 w-full rounded-xl bg-[#09111b]">
              <rect x="0" y="0" width="160" height="96" rx="14" fill="#09111b" />
              <rect x="10" y="10" width="64" height="10" rx="5" fill="rgba(255,255,255,0.08)" />
              <rect x="108" y="12" width="42" height="6" rx="3" fill="rgba(255,255,255,0.1)" />
              <path
                d={`M10 ${62 - index * 2} C 28 ${52 - index}, 34 ${72 - index}, 50 ${54 + index} S 86 ${34 + index}, 104 ${52 - index} S 132 ${44 + index}, 150 ${40 - index}`}
                stroke="#f8fafc"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              <rect x="70" y="26" width="50" height="34" rx="8" fill={card.tone} />
              <rect x="70" y="26" width="50" height="34" rx="8" fill="none" stroke="rgba(255,255,255,0.18)" />
              <line x1="70" y1="60" x2="120" y2="60" stroke="rgba(239,68,68,0.72)" strokeWidth="2" />
              <circle cx="142" cy="16" r="2.5" fill="rgba(248,250,252,0.35)" />
              <circle cx="148" cy="16" r="2.5" fill="rgba(248,250,252,0.18)" />
            </svg>
            <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Card {index + 1}
            </p>
            <p className="mt-1 text-sm font-semibold">{card.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
        <p className="text-sm font-medium">Favorite trades and trade ideas stay visible for fast review.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep your best setups, screenshots, and post-trade notes together in one visual board.
        </p>
      </div>
    </Frame>
  );
}

export function AuthSceneIllustration({ className }: IllustrationProps) {
  return (
    <Frame className={cn('p-6', className)}>
      <div className="grid gap-4">
        <div className="rounded-3xl border border-border/70 bg-background/80 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Review Loop</p>
              <p className="mt-1 text-lg font-semibold text-foreground">Trade discipline system</p>
            </div>
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400/80" />
            </div>
          </div>
          <svg viewBox="0 0 420 190" className="h-44 w-full rounded-2xl bg-[#081018]">
            <rect x="0" y="0" width="420" height="190" rx="18" fill="#081018" />
            <rect x="18" y="22" width="104" height="22" rx="11" fill="rgba(255,255,255,0.08)" />
            <rect x="18" y="58" width="180" height="10" rx="5" fill="rgba(255,255,255,0.08)" />
            <rect x="18" y="78" width="144" height="10" rx="5" fill="rgba(255,255,255,0.05)" />
            <rect x="250" y="24" width="138" height="56" rx="14" fill="rgba(15,118,110,0.18)" stroke="rgba(45,212,191,0.25)" />
            <rect x="250" y="94" width="138" height="72" rx="14" fill="rgba(37,99,235,0.16)" stroke="rgba(96,165,250,0.25)" />
            <path d="M24 150 C 70 126, 92 164, 136 134 S 210 92, 258 118 S 328 148, 394 92" stroke="#f8fafc" strokeWidth="3" fill="none" strokeLinecap="round" />
            <rect x="158" y="82" width="82" height="46" rx="10" fill="rgba(245,158,11,0.22)" stroke="rgba(251,191,36,0.32)" />
            <line x1="158" y1="128" x2="240" y2="128" stroke="rgba(239,68,68,0.72)" strokeWidth="2.5" />
          </svg>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Sync', 'Read-only broker import'],
            ['Annotate', 'Screenshots and notes'],
            ['Review', 'Analytics and favorites'],
          ].map(([title, copy]) => (
            <div key={title} className="rounded-2xl border border-border/70 bg-background/80 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
              <p className="mt-2 text-sm font-medium text-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export function EmptyStateIllustration({ className }: IllustrationProps) {
  return (
    <div className={cn('mx-auto w-full max-w-[280px]', className)}>
      <svg viewBox="0 0 280 220" className="h-auto w-full">
        <defs>
          <linearGradient id="panel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(15,23,42,1)" />
            <stop offset="100%" stopColor="rgba(10,10,15,1)" />
          </linearGradient>
        </defs>
        <rect x="20" y="18" width="240" height="170" rx="28" fill="url(#panel)" stroke="rgba(148,163,184,0.18)" />
        <rect x="36" y="36" width="96" height="12" rx="6" fill="rgba(255,255,255,0.08)" />
        <rect x="196" y="38" width="46" height="8" rx="4" fill="rgba(255,255,255,0.08)" />
        <path d="M38 122 C 58 110, 74 138, 96 116 S 138 84, 160 108 S 196 132, 238 90" stroke="#f8fafc" strokeWidth="3" fill="none" strokeLinecap="round" />
        <rect x="108" y="72" width="54" height="40" rx="12" fill="rgba(14,165,233,0.24)" stroke="rgba(56,189,248,0.35)" />
        <line x1="108" y1="112" x2="162" y2="112" stroke="rgba(239,68,68,0.75)" strokeWidth="2.5" />
        <rect x="50" y="152" width="70" height="14" rx="7" fill="rgba(255,255,255,0.05)" />
        <rect x="130" y="152" width="40" height="14" rx="7" fill="rgba(245,158,11,0.22)" />
        <rect x="178" y="152" width="52" height="14" rx="7" fill="rgba(255,255,255,0.05)" />
        <circle cx="58" cy="196" r="12" fill="rgba(245,158,11,0.15)" />
        <circle cx="228" cy="18" r="16" fill="rgba(14,165,233,0.12)" />
      </svg>
    </div>
  );
}
