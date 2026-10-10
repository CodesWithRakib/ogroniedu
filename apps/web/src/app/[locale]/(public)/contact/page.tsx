'use client';

import React, { useState, use } from 'react';
import {
  MapPin,
  Mail,
  Phone,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { getDictionary, type Locale } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default function ContactPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';
  const dict = getDictionary(locale);
  const p = dict.contactPage;

  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'general',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setSubmitted(true);
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="outline" className="text-emerald-700 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300">
          {p.badge}
        </Badge>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 font-bengali">
          {p.title}
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-bengali leading-relaxed">
          {p.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact Form */}
        <div className="lg:col-span-7">
          <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-xl font-bold font-bengali text-slate-900 dark:text-slate-100">
                {p.formHeading}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {submitted ? (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/30 p-6 text-center space-y-3">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                  <p className="text-base font-semibold text-emerald-900 dark:text-emerald-200 font-bengali">
                    {p.submitSuccess}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({ name: '', email: '', phone: '', category: 'general', message: '' });
                    }}
                    className="mt-2 text-xs"
                  >
                    {locale === 'bn' ? 'আরেকটি বার্তা পাঠান' : 'Send Another Message'}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 font-bengali">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {p.nameLabel} *
                    </label>
                    <Input
                      required
                      placeholder={p.namePlaceholder}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {p.emailLabel} *
                      </label>
                      <Input
                        type="email"
                        required
                        placeholder={p.emailPlaceholder}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {p.phoneLabel}
                      </label>
                      <Input
                        type="tel"
                        placeholder={p.phonePlaceholder}
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {p.categoryLabel}
                    </label>
                    <select
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="general">{p.catGeneral}</option>
                      <option value="tutorHelp">{p.catTutorHelp}</option>
                      <option value="tutorVerification">{p.catTutorVerification}</option>
                      <option value="paymentSupport">{p.catPaymentSupport}</option>
                      <option value="safetyIncident">{p.catSafetyIncident}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {p.messageLabel} *
                    </label>
                    <textarea
                      required
                      rows={4}
                      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 resize-none"
                      placeholder={p.messagePlaceholder}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold">
                    <Send className="h-4 w-4 mr-2" />
                    {p.submitBtn}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Office Details */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-lg font-bold font-bengali text-slate-900 dark:text-slate-100">
                {p.officeHeading}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0 space-y-5 text-sm text-slate-600 dark:text-slate-300 font-bengali">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{p.addressLine1}</p>
                  <p>{p.addressLine2}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-emerald-600 shrink-0" />
                <a href={`mailto:${p.officialEmail}`} className="text-emerald-700 dark:text-emerald-400 hover:underline">
                  {p.officialEmail}
                </a>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-900 dark:text-slate-100">{p.officialPhone}</span>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{p.operatingHours}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
