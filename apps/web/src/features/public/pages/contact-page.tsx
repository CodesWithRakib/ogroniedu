'use client';

import { MapPin, Mail, Phone, Clock, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { getDictionary, type Locale } from '@/lib/i18n';
import { useContactForm } from '../hooks/use-contact-form';

/** Public contact entry: message form persisted via the support-ticket API. */
export function ContactPage({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const p = dict.contactPage;
  const {
    submitted,
    ticketRef,
    submitError,
    isSubmitting,
    formData,
    handleSubmit,
    handleReset,
    updateField,
  } = useContactForm(locale);

  return (
    <div className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge
          variant="outline"
          className="text-primary border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full"
        >
          {p.badge}
        </Badge>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground font-bengali">
          {p.title}
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground font-bengali leading-relaxed">
          {p.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact Form */}
        <div className="lg:col-span-7">
          <Card className="bg-card/90 backdrop-blur-xl border-border/80 rounded-3xl shadow-xl p-6 sm:p-10">
            <CardHeader className="px-0 pt-0 pb-6">
              <CardTitle className="text-xl sm:text-2xl font-bold font-bengali text-foreground">
                {p.formHeading}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {submitted ? (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-8 text-center space-y-4">
                  <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <p className="text-lg font-bold text-foreground font-bengali">
                    {p.submitSuccess}
                  </p>
                  {ticketRef && (
                    <p
                      className="text-xs font-mono text-primary font-bold bg-card p-2 rounded-xl inline-block border border-border/80"
                      data-testid="contact-ticket-ref"
                    >
                      {locale === 'bn' ? 'রেফারেন্স' : 'Reference'}: {ticketRef}
                    </p>
                  )}
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      className="mt-2 rounded-full px-5 text-xs font-semibold"
                    >
                      {locale === 'bn' ? 'আরেকটি বার্তা পাঠান' : 'Send Another Message'}
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5 font-bengali">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      {p.nameLabel} *
                    </label>
                    <Input
                      required
                      placeholder={p.namePlaceholder}
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className="rounded-xl h-11"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        {p.emailLabel} *
                      </label>
                      <Input
                        type="email"
                        required
                        placeholder={p.emailPlaceholder}
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        className="rounded-xl h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        {p.phoneLabel}
                      </label>
                      <Input
                        type="tel"
                        placeholder={p.phonePlaceholder}
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        className="rounded-xl h-11"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      {p.categoryLabel}
                    </label>
                    <select
                      className="w-full rounded-xl border border-border/80 bg-card px-3.5 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      value={formData.category}
                      onChange={(e) => updateField('category', e.target.value)}
                    >
                      <option value="general">{p.catGeneral}</option>
                      <option value="tutorHelp">{p.catTutorHelp}</option>
                      <option value="tutorVerification">{p.catTutorVerification}</option>
                      <option value="paymentSupport">{p.catPaymentSupport}</option>
                      <option value="safetyIncident">{p.catSafetyIncident}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      {p.messageLabel} *
                    </label>
                    <textarea
                      required
                      rows={4}
                      className="w-full rounded-xl border border-border/80 bg-card p-3.5 text-sm text-foreground resize-none focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      placeholder={p.messagePlaceholder}
                      value={formData.message}
                      onChange={(e) => updateField('message', e.target.value)}
                    />
                  </div>

                  {submitError && (
                    <div
                      role="alert"
                      data-testid="contact-submit-error"
                      className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl h-11 font-bold shadow-md shadow-primary/25"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? (locale === 'bn' ? 'পাঠানো হচ্ছে…' : 'Sending…') : p.submitBtn}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Office Details */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-card/85 backdrop-blur-sm border-border/80 rounded-3xl shadow-sm p-6 sm:p-8">
            <CardHeader className="px-0 pt-0 pb-4">
              <CardTitle className="text-lg font-bold font-bengali text-foreground">
                {p.officeHeading}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0 space-y-5 text-sm text-muted-foreground font-bengali">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-foreground">{p.addressLine1}</p>
                  <p>{p.addressLine2}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <a
                  href={`mailto:${p.officialEmail}`}
                  className="text-primary font-semibold hover:underline"
                >
                  {p.officialEmail}
                </a>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <span className="font-bold text-foreground">{p.officialPhone}</span>
              </div>

              <div className="flex items-start gap-3 pt-4 border-t border-border/60 text-xs text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                <p>{p.operatingHours}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
