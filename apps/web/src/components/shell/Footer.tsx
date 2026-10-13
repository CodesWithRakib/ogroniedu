import React from 'react';
import Link from 'next/link';
import { GraduationCap, Heart } from 'lucide-react';
import { getDictionary, type Locale } from '../../lib/i18n';

export interface FooterProps {
  locale: Locale;
}

export function Footer({ locale }: FooterProps) {
  const dict = getDictionary(locale);

  return (
    <footer className="border-t border-border bg-card/70 text-foreground backdrop-blur-md transition-colors">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/25">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground font-bengali">
                {dict.common.appName}
              </span>
            </div>
            <p className="max-w-md text-sm text-muted-foreground leading-relaxed font-bengali">
              {dict.footer.about}
            </p>
          </div>

          {/* Discover & Learning Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              {dict.footer.quickLinks}
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href={`/${locale}`}
                  className="hover:text-primary transition-colors"
                >
                  {dict.nav.home}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/tutors`}
                  className="hover:text-primary transition-colors font-semibold text-primary"
                >
                  {dict.nav.findTutors}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/how-it-works`}
                  className="hover:text-primary transition-colors"
                >
                  {dict.nav.howItWorks}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/pricing`}
                  className="hover:text-primary transition-colors"
                >
                  {dict.nav.pricing}
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust, Safety & Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              {dict.safetyPage.badge}
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href={`/${locale}/safety`}
                  className="hover:text-primary transition-colors"
                >
                  {dict.nav.safety}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/faq`}
                  className="hover:text-primary transition-colors"
                >
                  {dict.nav.faq}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/contact`}
                  className="hover:text-primary transition-colors"
                >
                  {dict.nav.contact}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/privacy`}
                  className="hover:text-primary transition-colors"
                >
                  {dict.footer.privacy}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/terms`}
                  className="hover:text-primary transition-colors"
                >
                  {dict.footer.terms}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t border-border/70 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4">
          <p>
            © {new Date().getFullYear()} {dict.common.appName}. {dict.footer.rightsReserved}
          </p>
          <div className="flex items-center gap-1">
            <span>{dict.footer.tagline}</span>
            <Heart className="h-3.5 w-3.5 text-rose-500 inline fill-rose-500" />
          </div>
        </div>
      </div>
    </footer>
  );
}
