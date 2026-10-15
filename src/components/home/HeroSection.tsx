import React, { useState } from 'react';
import {
  Sprout,
  ShieldCheck,
  Truck,
  Sparkles,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Phone,
  MessageCircle,
  Award,
  TrendingUp,
  Bot,
  BadgeCheck,
  Calendar,
  Layers,
  MapPin,
  Clock,
  ChevronLeft,
  Copy,
  Check,
  FlaskConical,
  Droplets,
  Wheat,
} from 'lucide-react';
import { HeroContent, DEFAULT_HOME_CONTENT } from '../../lib/homeContent';

interface HeroSectionProps {
  hero?: HeroContent;
  onNavigate?: (tab: string) => void;
  onOpenSimsim?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  hero: passedHero,
  onNavigate,
  onOpenSimsim,
}) => {
  const d = DEFAULT_HOME_CONTENT.hero!;
  const hero: HeroContent = {
    seasonBadge: passedHero?.seasonBadge || d.seasonBadge,
    seasonNotice: passedHero?.seasonNotice || d.seasonNotice,
    tagline: passedHero?.tagline || d.tagline,
    title: passedHero?.title || d.title,
    highlightText: passedHero?.highlightText || d.highlightText,
    description: passedHero?.description || d.description,
    primaryCtaText: passedHero?.primaryCtaText || d.primaryCtaText,
    secondaryCtaText: passedHero?.secondaryCtaText || d.secondaryCtaText,
    contactPhone: passedHero?.contactPhone || d.contactPhone,
    contactWhatsApp: passedHero?.contactWhatsApp || d.contactWhatsApp,
    features: Array.isArray(passedHero?.features) && passedHero.features.length > 0 ? passedHero.features : d.features,
    metrics: Array.isArray(passedHero?.metrics) && passedHero.metrics.length > 0 ? passedHero.metrics : d.metrics,
  };

  const [copiedPhone, setCopiedPhone] = useState(false);
  const [activeTabPreview, setActiveTabPreview] = useState<'medicines' | 'fertilizers' | 'seeds' | 'boosters'>('medicines');

  const cleanPhone = (hero.contactPhone || '').replace(/\s+/g, '');
  const cleanWhatsApp = (hero.contactWhatsApp || '').replace(/[^0-9]/g, '');

  const handleCopyPhone = () => {
    navigator.clipboard?.writeText(hero.contactPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const categories = [
    {
      id: 'medicines',
      name: 'الأدوية والمبيدات الزراعية',
      desc: 'مبيدات فطرية، حشرية، عناكب، نيماتودا، حشائش',
      count: '+140 مركب',
      icon: FlaskConical,
      tab: 'products',
    },
    {
      id: 'fertilizers',
      name: 'الأسمدة والمغذيات الورقية',
      desc: 'أسمدة NPK، عناصر مخلبية، أحماض أمينية، هيوميك',
      count: '+95 صنف',
      icon: Droplets,
      tab: 'products',
    },
    {
      id: 'seeds',
      name: 'البذور والتقاوي الهجين',
      desc: 'بذور خضار، بذور هجين، تقاوي محاصيل حقلية',
      count: '+70 صنف',
      icon: Wheat,
      tab: 'products',
    },
    {
      id: 'boosters',
      name: 'منشطات الجذور والمخصبات',
      desc: 'مجددات جذور، محفزات تزهير وعقد، مخصبات حيوية',
      count: '+50 صنف',
      icon: Sprout,
      tab: 'products',
    },
  ];

  return (
    <section className="relative w-full rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900 text-white border-2 border-emerald-500/25 shadow-2xl overflow-hidden mb-8 sm:mb-12">
      {/* Dynamic Background Lighting Effects */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-teal-500/15 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-600/10 blur-[100px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Subtle Botanical SVG Grid Pattern in the background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)`,
          backgroundSize: '100px 100px',
        }}
        aria-hidden="true"
      />

      {/* 1. Top Announcement Strip (Seasonal Notice & Live Operations) */}
      <div className="relative z-10 border-b border-white/10 bg-emerald-900/40 backdrop-blur-md px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
          </span>
          <span className="font-black text-emerald-300 tracking-wide">{hero.seasonBadge}:</span>
          <span className="text-slate-200 font-medium truncate max-w-md sm:max-w-xl">
            {hero.seasonNotice}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-4 text-xs font-semibold text-slate-300">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>المركز الرئيسي والمخازن: طريق مصر الإسكندرية</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>الشحن والتوريد لكافة المحافظات: 7:00 ص - 10:00 م</span>
          </div>
        </div>
      </div>

      {/* 2. Main Hero Grid */}
      <div className="relative z-10 p-5 sm:p-8 md:p-10 lg:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Right Column (Primary Brand Messaging & Action Hub) - 7 Cols */}
          <div className="lg:col-span-7 space-y-6">
            {/* Tagline kicker */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs sm:text-sm font-black shadow-inner">
              <Sprout className="w-4 h-4 text-emerald-400" />
              <span>{hero.tagline}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-slate-300 font-normal">منذ 2008</span>
            </div>

            {/* Grand Headline */}
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-[1.25] tracking-tight">
              {hero.title}{' '}
              <span className="block mt-2 bg-gradient-to-l from-emerald-300 via-teal-200 to-amber-300 bg-clip-text text-transparent">
                {hero.highlightText}
              </span>
            </h1>

            {/* Subtitle description */}
            <p className="text-sm sm:text-base md:text-lg text-slate-300 font-medium leading-relaxed max-w-2xl">
              {hero.description}
            </p>

            {/* Key Trust Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {hero.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs sm:text-sm font-semibold text-slate-200 backdrop-blur-xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            {/* Action CTA Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {/* Primary: Browse Products */}
              <button
                type="button"
                onClick={() => onNavigate?.('products')}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm sm:text-base shadow-lg shadow-emerald-950/60 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>{hero.primaryCtaText}</span>
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Secondary: Invoices or Sales */}
              <button
                type="button"
                onClick={() => onNavigate?.('invoices')}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-sm sm:text-base transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer backdrop-blur-sm"
              >
                <Layers className="w-4 h-4 text-emerald-300" />
                <span>{hero.secondaryCtaText}</span>
              </button>

              {/* Ask Simsim AI */}
              {onOpenSimsim && (
                <button
                  type="button"
                  onClick={onOpenSimsim}
                  className="inline-flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 font-black text-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Bot className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>اسأل سمسم الذكي</span>
                </button>
              )}
            </div>

            {/* Quick Contact & WhatsApp Hotline */}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-300 border-t border-white/10">
              <span className="font-bold text-slate-400">للحجز والتوريد المباشر:</span>
              <a
                href={`tel:${cleanPhone}`}
                className="inline-flex items-center gap-1.5 font-black text-emerald-300 hover:text-emerald-200 transition-colors"
                dir="ltr"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{hero.contactPhone}</span>
              </a>
              <a
                href={`https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent('السلام عليكم، أود الاستفسار عن أصناف وأسعار الأدوية الزراعية والأسمدة والبذور المتاحة في صرح الزهراء')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-bold text-emerald-400 hover:text-emerald-300 px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>محادثة واتساب سريعة</span>
              </a>
              <button
                type="button"
                onClick={handleCopyPhone}
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="نسخ رقم الهاتف"
              >
                {copiedPhone ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>نسخ الرقم</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Left Column (Interactive Showcase & Store Live Stats) - 5 Cols */}
          <div className="lg:col-span-5 space-y-4">
            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              {hero.metrics.map((metric, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white/[0.07] border border-white/15 backdrop-blur-md hover:bg-white/[0.1] transition-all group"
                >
                  <div className="text-2xl sm:text-3xl font-black text-emerald-300 tracking-tight group-hover:scale-105 transition-transform origin-right">
                    {metric.value}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white mt-1">
                    {metric.label}
                  </div>
                  {metric.sub && (
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {metric.sub}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Interactive Products Hub */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-emerald-500/30 backdrop-blur-md space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-black text-white">
                    أبرز أقسام الأدوية والمستلزمات الزراعية
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                  مرخصة ومسجلة
                </span>
              </div>

              {/* Category mini selector */}
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = activeTabPreview === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setActiveTabPreview(cat.id as any);
                        onNavigate?.(cat.tab);
                      }}
                      className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer group ${
                        isSelected
                          ? 'bg-emerald-600/30 border-emerald-400/60 shadow-md'
                          : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <Icon className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] text-slate-400 font-semibold">{cat.count}</span>
                      </div>
                      <div>
                        <div className="text-xs font-black text-white group-hover:text-emerald-300 transition-colors">
                          {cat.name}
                        </div>
                        <div className="text-[10px] text-slate-300 line-clamp-1 mt-0.5">
                          {cat.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quick Jump Bar */}
              <div className="pt-2 flex items-center justify-between border-t border-white/10 text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <BadgeCheck className="w-4 h-4 text-emerald-400" />
                  <span>جميع المركبات مرخصة رسمياً ومفحوصة معملياً</span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate?.('products')}
                  className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200 font-black cursor-pointer"
                >
                  <span>عرض الكل</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Assurance Bar (Four Pillars) */}
      <div className="relative z-10 border-t border-white/10 bg-slate-950/70 backdrop-blur-md px-5 sm:px-8 py-3.5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-300">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>شحن وتوزيع مباشر لكافة المحافظات</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>منتجات أصلية 100% معتمدة من وزارة الزراعة</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>أكثر من 18 عاماً من الخبرة الصيدلانية الزراعية</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>روشتات زراعية وبرامج مكافحة وتسميد مجانية</span>
          </div>
        </div>
      </div>
    </section>
  );
};
