'use client';

import React, { useState } from 'react';
import { BookOpen, Search, Copy, Check, Atom, Binary, FlaskConical, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/Input';

interface FormulaItem {
  id: string;
  category: 'physics' | 'math' | 'chemistry';
  titleEn: string;
  titleBn: string;
  formula: string;
  descriptionEn: string;
  descriptionBn: string;
}

const FORMULAS_DATA: FormulaItem[] = [
  // Physics
  {
    id: 'phy-1',
    category: 'physics',
    titleEn: 'Equations of Motion (Kinematics)',
    titleBn: 'গতির সমীকরণমালা',
    formula: 'v = u + at | s = ut + ½at² | v² = u² + 2as',
    descriptionEn: 'Uniform acceleration linear motion equations',
    descriptionBn: 'সুষম ত্বরণে সরলরৈখিক গতির সমীকরণ',
  },
  {
    id: 'phy-2',
    category: 'physics',
    titleEn: "Newton's Second Law",
    titleBn: 'নিউটনের গতির দ্বিতীয় সূত্র',
    formula: 'F = ma = m(v - u)/t = dp/dt',
    descriptionEn: 'Force equals mass times acceleration or rate of change of momentum',
    descriptionBn: 'বল = ভর × ত্বরণ অথবা ভরবেগের পরিবর্তনের হার',
  },
  {
    id: 'phy-3',
    category: 'physics',
    titleEn: 'Work, Power and Kinetic Energy',
    titleBn: 'কাজ, ক্ষমতা ও গতিশক্তি',
    formula: 'W = F·s·cosθ | E_k = ½mv² | P = W/t = F·v',
    descriptionEn: 'Work done by force, kinetic energy and rate of doing work',
    descriptionBn: 'বলের দ্বারা কাজ, গতিশক্তি এবং ক্ষমতা',
  },
  {
    id: 'phy-4',
    category: 'physics',
    titleEn: "Ohm's Law & Electrical Power",
    titleBn: 'ওহমের সূত্র ও তড়িৎ ক্ষমতা',
    formula: 'V = IR | P = VI = I²R = V²/R',
    descriptionEn: 'Potential difference, current, resistance and power dissipation',
    descriptionBn: 'বিভব পার্থক্য, তড়িৎ প্রবাহ, রোধ এবং তড়িৎ ক্ষমতা',
  },
  {
    id: 'phy-5',
    category: 'physics',
    titleEn: "Newton's Law of Gravitation",
    titleBn: 'নিউটনের মহাকর্ষ সূত্র',
    formula: 'F = G · (m₁ · m₂) / r² | g = GM / R²',
    descriptionEn: 'Gravitational attraction force and acceleration due to gravity',
    descriptionBn: 'মহাকর্ষ বল ও অভিকর্ষজ ত্বরণ',
  },

  // Higher Math
  {
    id: 'math-1',
    category: 'math',
    titleEn: 'Calculus: Fundamental Derivatives',
    titleBn: 'ক্যালকুলাস: মৌলিক ব্যবকলন',
    formula: 'd/dx(xⁿ) = n·xⁿ⁻¹ | d/dx(sin x) = cos x | d/dx(eˣ) = eˣ',
    descriptionEn: 'Power rule, trigonometric, and exponential standard derivatives',
    descriptionBn: 'ঘাত নিয়ম, ত্রিকোণমিতিক ও সূচকীয় অন্তরীকরণ সূত্রাবলী',
  },
  {
    id: 'math-2',
    category: 'math',
    titleEn: 'Calculus: Standard Integrals',
    titleBn: 'ক্যালকুলাস: আদর্শ যোগজীকরণ',
    formula: '∫ xⁿ dx = xⁿ⁺¹/(n+1) + c (n ≠ -1) | ∫ 1/x dx = ln|x| + c',
    descriptionEn: 'Standard indefinite integrals and logarithmic forms',
    descriptionBn: 'অনির্দিষ্ট যোগজীকরণ ও লগারিদমিক রূপ',
  },
  {
    id: 'math-3',
    category: 'math',
    titleEn: 'Trigonometry: Compound Angles',
    titleBn: 'ত্রিকোণমিতি: যৌগিক কোণ',
    formula: 'sin(A ± B) = sinA·cosB ± cosA·sinB | cos(A ± B) = cosA·cosB ∓ sinA·sinB',
    descriptionEn: 'Addition and subtraction formulas for sine and cosine',
    descriptionBn: 'সাইন ও কোসাইনের যোগ ও বিয়োগের সূত্র',
  },
  {
    id: 'math-4',
    category: 'math',
    titleEn: 'Coordinate Geometry: Distance & Slope',
    titleBn: 'স্থানাঙ্ক জ্যামিতি: দূরত্ব ও ঢাল',
    formula: 'd = √[(x₂ - x₁)² + (y₂ - y₁)²] | m = (y₂ - y₁) / (x₂ - x₁)',
    descriptionEn: 'Euclidean distance and slope of a line between two Cartesian points',
    descriptionBn: 'কার্তেসীয় স্থানাঙ্কে দুটি বিন্দুর সরলরৈখিক দূরত্ব ও নতি/ঢাল',
  },
  {
    id: 'math-5',
    category: 'math',
    titleEn: 'Quadratic Equation Roots',
    titleBn: 'দ্বিঘাত সমীকরণের মূল নির্ণয়',
    formula: 'x = [-b ± √(b² - 4ac)] / (2a)',
    descriptionEn: 'Standard discriminant and solution roots for ax² + bx + c = 0',
    descriptionBn: 'ax² + bx + c = 0 সমীকরণের পৃথায়ক ও সমাধান',
  },

  // Chemistry
  {
    id: 'chem-1',
    category: 'chemistry',
    titleEn: 'Ideal Gas Equation',
    titleBn: 'আদর্শ গ্যাস সমীকরণ',
    formula: 'PV = nRT = (w/M)·RT | P₁V₁/T₁ = P₂V₂/T₂',
    descriptionEn: 'Relationship between pressure, volume, temperature and gas constant R',
    descriptionBn: 'চাপ, আয়তন, তাপমাত্রা ও সার্বজনীন গ্যাস ধ্রুবকের সম্পর্ক',
  },
  {
    id: 'chem-2',
    category: 'chemistry',
    titleEn: 'Solution Concentration (Molarity)',
    titleBn: 'দ্রবণের ঘনমাত্রা (মোলারিটি)',
    formula: 'S = (1000 · w) / (M · V_ml) | V₁S₁ = V₂S₂',
    descriptionEn: 'Molar concentration calculation and dilution equation',
    descriptionBn: 'মোলারিটি নির্ণয় এবং দ্রবণের লঘুকরণ সমীকরণ',
  },
  {
    id: 'chem-3',
    category: 'chemistry',
    titleEn: 'First Law of Thermodynamics',
    titleBn: 'তাপগতিবিদ্যার ১ম সূত্র',
    formula: 'ΔQ = ΔU + ΔW = ΔU + P·ΔV',
    descriptionEn: 'Conservation of energy, internal energy change and work done',
    descriptionBn: 'শক্তির সংরক্ষণশীলতা, অভ্যন্তরীণ শক্তির পরিবর্তন এবং কৃতকাজ',
  },
];

interface ClassroomFormulasDrawerProps {
  locale?: 'bn' | 'en';
}

export function ClassroomFormulasDrawer({ locale = 'bn' }: ClassroomFormulasDrawerProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'physics' | 'math' | 'chemistry'>(
    'all',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredFormulas = FORMULAS_DATA.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      item.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.titleBn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.formula.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCopy = (formula: string, id: string) => {
    navigator.clipboard.writeText(formula);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-5 text-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-interactive/10 border border-info/40 text-info-soft-foreground">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <span>{locale === 'bn' ? 'ফর্মুলা ও নোটস চিটশিট' : 'Formulas & Quick Notes'}</span>
              <Sparkles className="w-4 h-4 text-warning-soft-foreground" />
            </h3>
            <p className="text-xs text-muted-foreground">
              {locale === 'bn'
                ? 'NCTB কারিকুলাম ভিত্তিক পদার্থ, উচ্চতর গণিত ও রসায়নের প্রয়োজনীয় সূত্রাবলী'
                : 'Essential NCTB formulas for Physics, Higher Math & Chemistry'}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={locale === 'bn' ? 'সূত্র খুঁজুন...' : 'Search formulas...'}
            className="w-full h-8 pl-8 pr-3 text-xs rounded-xl"
            data-testid="formula-search-input"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
            activeCategory === 'all'
              ? 'bg-interactive text-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
          data-testid="formula-tab-all"
        >
          {locale === 'bn' ? 'সকল সূত্র' : 'All Formulas'}
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('physics')}
          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
            activeCategory === 'physics'
              ? 'bg-interactive text-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
          data-testid="formula-tab-physics"
        >
          <Atom className="w-3.5 h-3.5" />
          <span>{locale === 'bn' ? 'পদার্থবিজ্ঞান' : 'Physics'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('math')}
          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
            activeCategory === 'math'
              ? 'bg-interactive text-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
          data-testid="formula-tab-math"
        >
          <Binary className="w-3.5 h-3.5" />
          <span>{locale === 'bn' ? 'উচ্চতর গণিত' : 'Higher Math'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('chemistry')}
          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
            activeCategory === 'chemistry'
              ? 'bg-interactive text-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
          data-testid="formula-tab-chemistry"
        >
          <FlaskConical className="w-3.5 h-3.5" />
          <span>{locale === 'bn' ? 'রসায়ন' : 'Chemistry'}</span>
        </button>
      </div>

      {/* Formula Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
        {filteredFormulas.map((item) => {
          const isCopied = copiedId === item.id;
          return (
            <div
              key={item.id}
              className="p-3.5 rounded-2xl bg-surface-muted border border-border hover:border-info/40 transition-all flex flex-col justify-between group"
              data-testid={`formula-card-${item.id}`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground group-hover:text-info-soft-foreground transition-colors">
                    {locale === 'bn' ? item.titleBn : item.titleEn}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      item.category === 'physics'
                        ? 'bg-interactive/10 text-info-soft-foreground border-info/40'
                        : item.category === 'math'
                          ? 'bg-interactive/10 text-interactive border-interactive/30'
                          : 'bg-success-soft text-success-soft-foreground border-success/30'
                    }`}
                  >
                    {item.category}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-card border border-border text-info-soft-foreground font-mono text-xs font-bold my-1.5 select-all break-all">
                  {item.formula}
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {locale === 'bn' ? item.descriptionBn : item.descriptionEn}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-border flex justify-end">
                <button
                  type="button"
                  onClick={() => handleCopy(item.formula, item.id)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-info-soft-foreground transition-colors px-2 py-1 rounded-lg hover:bg-surface-hover"
                  title={locale === 'bn' ? 'ফর্মুলা কপি করুন' : 'Copy Formula'}
                  aria-label={locale === 'bn' ? 'ফর্মুলা কপি করুন' : 'Copy Formula'}
                  data-testid={`copy-formula-${item.id}`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-success-soft-foreground" />
                      <span className="text-success-soft-foreground font-bold">
                        {locale === 'bn' ? 'কপি হয়েছে' : 'Copied'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{locale === 'bn' ? 'কপি করুন' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {filteredFormulas.length === 0 && (
          <div className="col-span-2 text-center py-8 text-xs text-muted-foreground">
            {locale === 'bn' ? 'কোনো ফর্মুলা খুঁজে পাওয়া যায়নি।' : 'No matching formulas found.'}
          </div>
        )}
      </div>
    </div>
  );
}
