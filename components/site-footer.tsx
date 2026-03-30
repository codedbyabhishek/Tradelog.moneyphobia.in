import Link from 'next/link';

const footerLinks = [
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact Us' },
  { href: '/faq', label: 'FAQ' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/cookies', label: 'Cookie Policy' },
  { href: '/disclaimer', label: 'Disclaimer' },
  { href: '/account', label: 'Account Settings' },
  { href: '/delete-account', label: 'Delete Account / Data Request' },
  { href: '/support', label: 'Support / Help Center' },
  { href: '/404', label: '404 Page' },
  { href: '/sitemap.xml', label: 'Sitemap' },
];

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t border-border/70 bg-gradient-to-b from-background to-card/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs tracking-[0.12em] uppercase text-muted-foreground/80">Trading Journal</p>
          <p className="text-xs text-muted-foreground/70">{year}</p>
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-lg border border-border/70 bg-card/40 px-3 py-2 text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-card hover:text-foreground"
            >
              {link.label}
              <span className="mt-1 block h-px w-0 bg-primary/70 transition-all duration-200 group-hover:w-8" />
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
