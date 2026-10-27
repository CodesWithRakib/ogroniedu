import React from 'react';
import Link from 'next/link';
import {
  Heart,
  ShieldCheck,
  Lock,
  Award,
  PhoneCall,
  Mail,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { OgroniEduBrand } from '../brand/OgroniEduBrand';
import { getDictionary, type Locale } from '@/lib/i18n';

export interface FooterProps {
  locale: Locale;
}

export function Footer({ locale }: FooterProps) {
  const dict = getDictionary(locale);
  const isBn = locale === 'bn';

  return (
    <footer className="border-t border-border bg-card/80 text-foreground backdrop-blur-xl transition-colors">
      {/* Trust & Compliance Ribbon */}
      <div className="border-b border-border bg-surface-muted/40 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <span className="font-bold text-foreground block">
                  {isBn ? 'এসক্রো পেমেন্ট সুরক্ষা' : 'Escrow Protection'}
                </span>
                <span className="text-[11px]">
                  {isBn ? 'ক্লাস শেষ হলে ফি রিলিজ' : 'Pay after class verified'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Award className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <span className="font-bold text-foreground block">
                  {isBn ? '১০০% যাচাইকৃত শিক্ষক' : '100% Screened Tutors'}
                </span>
                <span className="text-[11px]">
                  {isBn ? 'এনআইডি ও সনদ ভেরিফাইড' : 'NID & Degree Verified'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Lock className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <span className="font-bold text-foreground block">
                  {isBn ? '২৫৬-বিট এনক্রিপশন' : '256-Bit SSL Security'}
                </span>
                <span className="text-[11px]">
                  {isBn ? 'সম্পূর্ণ নিরাপদ ডেটা' : 'End-to-end data security'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary ">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <span className="font-bold text-foreground block">
                  {isBn ? 'অভিভাবক ট্র্যাকিং' : 'Guardian Transparency'}
                </span>
                <span className="text-[11px]">
                  {isBn ? 'লাইভ উপস্থিতি ও প্রগ্রেস' : 'Real-time logs & alerts'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Multi-Column Directory */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand & Organization Bio */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <OgroniEduBrand locale={locale} />

            <p className="max-w-md text-sm text-muted-foreground leading-relaxed font-bengali">
              {dict.footer.about}
            </p>

            <div className="pt-2 flex flex-col gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>
                  {isBn ? 'গুলশান-২, ঢাকা-১২১২, বাংলাদেশ' : 'Gulshan-2, Dhaka-1212, Bangladesh'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <PhoneCall className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>
                  {isBn
                    ? 'হটলাইন: ০৯৬১২-অগ্রণী (সকাল ৯টা - রাত ১০টা)'
                    : 'Hotline: +880 9612-OGRONI (9 AM - 10 PM)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>support@ogroni.edu.bd</span>
              </div>
            </div>
          </div>

          {/* Column 2: Discover & Learn */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              {dict.footer.quickLinks}
            </h4>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground font-medium">
              <li>
                <Link href={`/${locale}`} className="hover:text-primary transition-colors">
                  {dict.nav.home}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/tutors`}
                  className="hover:text-primary transition-colors font-semibold text-primary flex items-center gap-1.5"
                >
                  <span>{dict.nav.findTutors}</span>
                  <span className="rounded-full bg-primary/10 text-primary px-1.5 py-0.2 text-[9px] font-bold">
                    HOT
                  </span>
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
                <Link href={`/${locale}/pricing`} className="hover:text-primary transition-colors">
                  {dict.nav.pricing}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/register`} className="hover:text-primary transition-colors">
                  {isBn ? 'শিক্ষক হিসেবে যুক্ত হোন' : 'Become a Tutor'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Trust, Safety & Standards */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              {dict.safetyPage.badge}
            </h4>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground font-medium">
              <li>
                <Link href={`/${locale}/safety`} className="hover:text-primary transition-colors">
                  {dict.nav.safety}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/safety#verification`}
                  className="hover:text-primary transition-colors"
                >
                  {isBn ? 'এনআইডি ব্যাকগ্রাউন্ড যাচাই' : 'Identity Verification'}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/safety#escrow`}
                  className="hover:text-primary transition-colors"
                >
                  {isBn ? 'এসক্রো পেমেন্ট নিয়মাবলী' : 'Escrow Guidelines'}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/safety#minor-policy`}
                  className="hover:text-primary transition-colors"
                >
                  {isBn ? 'নাবালক শিক্ষার্থী সুরক্ষা নীতি' : 'Minor Safety Policy'}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/safety#disputes`}
                  className="hover:text-primary transition-colors"
                >
                  {isBn ? 'অভিযোগ ও নিষ্পত্তি' : 'Dispute Resolution'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Support & Legal */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              {isBn ? 'সহায়তা ও শর্তাবলী' : 'Support & Legal'}
            </h4>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground font-medium">
              <li>
                <Link href={`/${locale}/faq`} className="hover:text-primary transition-colors">
                  {dict.nav.faq}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/contact`} className="hover:text-primary transition-colors">
                  {dict.nav.contact}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/privacy`} className="hover:text-primary transition-colors">
                  {dict.footer.privacy}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/terms`} className="hover:text-primary transition-colors">
                  {dict.footer.terms}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/contact#report`}
                  className="hover:text-primary transition-colors"
                >
                  {isBn ? 'জরুরি রিপোর্ট ও হেল্প' : 'Emergency Report'}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Operational Status */}
        <div className="mt-12 border-t border-border pt-6 pb-14 md:pb-0 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <p>
              © {new Date().getFullYear()} {dict.common.appName}. {dict.footer.rightsReserved}
            </p>
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary  border border-primary/20">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span>{isBn ? 'সকল সিস্টেম সক্রিয়' : 'All Systems Operational'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span>{dict.footer.tagline}</span>
            <Heart
              className="h-3.5 w-3.5 text-destructive inline fill-destructive animate-pulse"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
