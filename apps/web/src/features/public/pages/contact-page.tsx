'use client';

import { MapPin, Mail, Phone, Clock, Send, CheckCircle2 } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Textarea,
  Label,
  Alert,
  AlertDescription,
  Separator,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
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
    <div className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col gap-16">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto flex flex-col gap-4">
        <Badge
          variant="secondary"
          className="text-primary border border-primary/20 bg-primary-soft px-3.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full"
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
          <Card className="bg-card border-border rounded-xl p-6 sm:p-8">
            <CardHeader className="px-0 pt-0 pb-6">
              <CardTitle className="text-xl sm:text-2xl font-bold font-bengali text-foreground">
                {p.formHeading}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {submitted ? (
                <div className="rounded-xl bg-primary-soft/50 border border-primary/20 p-8 text-center flex flex-col gap-4">
                  <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
                  <p className="text-lg font-bold text-foreground font-bengali">
                    {p.submitSuccess}
                  </p>
                  {ticketRef && (
                    <p
                      className="text-xs font-mono text-primary font-bold bg-card p-2 rounded-xl inline-block border border-border"
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
                      className="mt-2 rounded-xl px-5 text-xs font-semibold"
                    >
                      {locale === 'bn' ? 'আরেকটি বার্তা পাঠান' : 'Send Another Message'}
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 font-bengali">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="contact-name" className="text-xs font-semibold text-foreground">
                      {p.nameLabel} *
                    </Label>
                    <Input
                      id="contact-name"
                      required
                      placeholder={p.namePlaceholder}
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className="rounded-xl h-11"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label
                        htmlFor="contact-email"
                        className="text-xs font-semibold text-foreground"
                      >
                        {p.emailLabel} *
                      </Label>
                      <Input
                        id="contact-email"
                        type="email"
                        required
                        placeholder={p.emailPlaceholder}
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        className="rounded-xl h-11"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label
                        htmlFor="contact-phone"
                        className="text-xs font-semibold text-foreground"
                      >
                        {p.phoneLabel}
                      </Label>
                      <Input
                        id="contact-phone"
                        type="tel"
                        placeholder={p.phonePlaceholder}
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        className="rounded-xl h-11"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      {p.categoryLabel}
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={(val) => updateField('category', val)}
                    >
                      <SelectTrigger className="w-full h-11 rounded-xl bg-card border-border text-sm">
                        <SelectValue placeholder={p.catGeneral} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">{p.catGeneral}</SelectItem>
                        <SelectItem value="tutorHelp">{p.catTutorHelp}</SelectItem>
                        <SelectItem value="tutorVerification">{p.catTutorVerification}</SelectItem>
                        <SelectItem value="paymentSupport">{p.catPaymentSupport}</SelectItem>
                        <SelectItem value="safetyIncident">{p.catSafetyIncident}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="contact-message"
                      className="text-xs font-semibold text-foreground"
                    >
                      {p.messageLabel} *
                    </Label>
                    <Textarea
                      id="contact-message"
                      required
                      rows={4}
                      className="rounded-xl border-border bg-card p-3.5 text-sm resize-none"
                      placeholder={p.messagePlaceholder}
                      value={formData.message}
                      onChange={(e) => updateField('message', e.target.value)}
                    />
                  </div>

                  {submitError && (
                    <Alert
                      variant="destructive"
                      data-testid="contact-submit-error"
                      className="rounded-xl"
                    >
                      <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl h-11 font-semibold shadow-xs"
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
        <div className="lg:col-span-5 flex flex-col gap-6">
          <Card className="bg-card border-border rounded-xl p-6 sm:p-8">
            <CardHeader className="px-0 pt-0 pb-4">
              <CardTitle className="text-lg font-bold font-bengali text-foreground">
                {p.officeHeading}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0 flex flex-col gap-5 text-sm text-muted-foreground font-bengali">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary-soft flex items-center justify-center text-primary shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-foreground">{p.addressLine1}</p>
                  <p>{p.addressLine2}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary-soft flex items-center justify-center text-primary shrink-0">
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
                <div className="h-9 w-9 rounded-xl bg-primary-soft flex items-center justify-center text-primary shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <span className="font-bold text-foreground">{p.officialPhone}</span>
              </div>

              <div className="pt-2">
                <Separator className="my-3" />
                <div className="flex items-start gap-3 text-xs text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                  <p>{p.operatingHours}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
