'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getDictionary, type Locale } from '@/lib/i18n';

/** Public terms entry: localized legal sections. */
export function TermsPage({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const p = dict.legalTermsPage;

  const sections = [
    { title: p.sec1Title, text: p.sec1Text },
    { title: p.sec2Title, text: p.sec2Text },
    { title: p.sec3Title, text: p.sec3Text },
    { title: p.sec4Title, text: p.sec4Text },
    { title: p.sec5Title, text: p.sec5Text },
  ];

  return (
    <div className="py-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex flex-col gap-12">
      {/* Header Banner */}
      <div className="text-center flex flex-col gap-4">
        <Badge
          variant="outline"
          className="text-primary border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full"
        >
          {p.badge}
        </Badge>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground font-bengali">
          {p.title}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground font-bengali">{p.subtitle}</p>
      </div>

      <Card className="bg-card border border-border rounded-xl p-6 sm:p-10 flex flex-col gap-6">
        <p className="text-sm sm:text-base text-foreground font-bengali leading-relaxed border-b border-border pb-6">
          {p.introText}
        </p>

        <div className="flex flex-col gap-6">
          {sections.map((sec, idx) => (
            <div key={idx} className="flex flex-col gap-2">
              <h2 className="text-lg font-bold text-foreground font-bengali">{sec.title}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground font-bengali leading-relaxed">
                {sec.text}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
