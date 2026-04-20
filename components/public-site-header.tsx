'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LineChart, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
];

export default function PublicSiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateScrolled = () => {
      setScrolled(window.scrollY > 12);
    };

    updateScrolled();
    window.addEventListener('scroll', updateScrolled, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateScrolled);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6 lg:px-8">
      <div
        className={cn(
          'mx-auto flex w-full max-w-6xl items-center justify-between gap-4 rounded-[28px] border px-4 py-3 backdrop-blur-2xl transition-all duration-300 supports-[backdrop-filter]:bg-background/45 sm:px-5',
          scrolled
            ? 'border-white/30 bg-background/78 shadow-[0_24px_80px_rgba(15,23,42,0.16)]'
            : 'border-white/20 bg-background/60 shadow-[0_20px_60px_rgba(15,23,42,0.10)]'
        )}
      >
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(59,130,246,0.2))] text-primary shadow-inner shadow-white/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.35),transparent_52%)]" />
            <LineChart className="relative h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">Traderlogify</p>
            <p className="truncate text-xs text-muted-foreground">Journal. Review. Improve.</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-full px-4 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link
              href="/login"
              onClick={() =>
                trackEvent('select_content', {
                  content_type: 'cta',
                  content_id: 'header_login',
                })
              }
            >
              Login
            </Link>
          </Button>
          <Button asChild>
            <Link
              href="/signup"
              onClick={() =>
                trackEvent('select_content', {
                  content_type: 'cta',
                  content_id: 'header_signup',
                })
              }
            >
              Sign Up
            </Link>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Open navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="border-white/20 bg-background/90 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/80"
            >
              <SheetHeader className="px-0">
                <SheetTitle className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(59,130,246,0.2))] text-primary">
                    <LineChart className="h-4 w-4" />
                  </span>
                  Traderlogify
                </SheetTitle>
                <SheetDescription>
                  Move between the public pages and jump into the app from one place.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 flex flex-col gap-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Button
                      key={item.href}
                      asChild
                      variant={isActive ? 'default' : 'ghost'}
                      className="justify-start"
                    >
                      <Link href={item.href}>{item.label}</Link>
                    </Button>
                  );
                })}
              </div>

              <div className="mt-6 grid gap-3">
                <Button asChild variant="outline">
                  <Link
                    href="/login"
                    onClick={() =>
                      trackEvent('select_content', {
                        content_type: 'cta',
                        content_id: 'mobile_header_login',
                      })
                    }
                  >
                    Login
                  </Link>
                </Button>
                <Button asChild>
                  <Link
                    href="/signup"
                    onClick={() =>
                      trackEvent('select_content', {
                        content_type: 'cta',
                        content_id: 'mobile_header_signup',
                      })
                    }
                  >
                    Sign Up
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
