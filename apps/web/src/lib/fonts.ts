import {
  Plus_Jakarta_Sans,
  Inter,
  Noto_Sans_Bengali,
  Hind_Siliguri,
  Instrument_Serif,
  Caveat,
} from 'next/font/google';

/**
 * Premium Bilingual Typography Stack:
 * - Plus Jakarta Sans & Inter: Modern, high-clarity Latin/English interface fonts
 * - Noto Sans Bengali & Hind Siliguri: Authentic, beautifully rendered Bengali typography with full ligature & conjunct support
 * - Instrument Serif: Editorial luxury italic accent
 * - Caveat: Hand-drawn annotations & doodles
 */
export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const notoSansBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-noto-bengali',
  display: 'swap',
});

export const hindSiliguri = Hind_Siliguri({
  weight: ['400', '500', '600', '700'],
  subsets: ['bengali', 'latin'],
  variable: '--font-hind-siliguri',
  display: 'swap',
});

export const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

export const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
  display: 'swap',
});

export const fontVariables = `${plusJakartaSans.variable} ${inter.variable} ${notoSansBengali.variable} ${hindSiliguri.variable} ${instrumentSerif.variable} ${caveat.variable}`;
