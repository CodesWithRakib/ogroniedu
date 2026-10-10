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
    <footer className="border-t border-slate-200/80 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-bengali">
                {dict.common.appName}
              </span>
            </div>
            <p className="max-w-md text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-bengali">
              {dict.footer.about}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              {dict.footer.quickLinks}
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link
                  href={`/${locale}`}
                  className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                >
                  {dict.nav.home}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}#features`}
                  className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                >
                  {dict.nav.howItWorks}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}#find-tutors`}
                  className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                >
                  {dict.nav.findTutors}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              {dict.footer.contact}
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link
                  href={`/${locale}/privacy`}
                  className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                >
                  {dict.footer.privacy}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/terms`}
                  className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                >
                  {dict.footer.terms}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t border-slate-200/60 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 gap-4">
          <p>
            © {new Date().getFullYear()} {dict.common.appName}. {dict.footer.rightsReserved}
          </p>
          <div className="flex items-center gap-1">
            <span>Built with care for Bangladesh</span>
            <Heart className="h-3.5 w-3.5 text-rose-500 inline fill-rose-500" />
          </div>
        </div>
      </div>
    </footer>
  );
}
