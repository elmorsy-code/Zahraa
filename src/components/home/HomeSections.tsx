import React, { useEffect, useState, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Maximize2,
  X,
  Users,
  Award,
  Phone,
  Mail,
  MessageCircle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Truck,
  Sprout,
  Trees,
  BadgeCheck,
  Calendar,
  Layers,
  Compass,
  ArrowLeft,
} from 'lucide-react';
import {
  HomeContent,
  HomeSlide,
  TeamMember,
  AboutContent,
  loadHomeContent,
  DEFAULT_HOME_CONTENT,
  HOME_CONTENT_EVENT,
} from '../../lib/homeContent';
import { HeroSection } from './HeroSection';

export const cardClass =
  'rounded-3xl border border-slate-200/80 bg-white/95 text-slate-900 shadow-sm overflow-hidden backdrop-blur-sm transition-all duration-300';

/* ==========================================================================
   1. Ultra-Professional Image Slider (سلايدر الصور الاحترافي)
   ========================================================================== */

interface HomeSliderProps {
  slides: HomeSlide[];
}

const HomeSlider: React.FC<HomeSliderProps> = ({ slides: rawSlides }) => {
  const slides = Array.isArray(rawSlides) && rawSlides.length > 0 ? rawSlides : DEFAULT_HOME_CONTENT.slides;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  // Touch swipe support
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const SLIDE_DURATION = 6000; // 6 seconds per slide
  const TICK_INTERVAL = 50;

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [slides.length, index]);

  // Smooth progress bar and slide rotation
  useEffect(() => {
    if (slides.length < 2 || paused) return;

    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (TICK_INTERVAL / SLIDE_DURATION) * 100;
        if (next >= 100) {
          setIndex((i) => (i + 1) % slides.length);
          return 0;
        }
        return next;
      });
    }, TICK_INTERVAL);

    return () => clearInterval(interval);
  }, [slides.length, paused, index]);

  if (slides.length === 0) return null;

  const currentSlide = slides[index] || slides[0];

  const go = (direction: number) => {
    setProgress(0);
    setIndex((i) => (i + direction + slides.length) % slides.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) {
      // Swiped left in RTL -> next slide
      go(1);
    } else if (distance < -50) {
      // Swiped right in RTL -> previous slide
      go(-1);
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <>
      <section
        className="relative w-full rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-950 border-2 border-slate-200/30 group select-none"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        aria-label="سلايدر الأدوية والأسمدة والبذور الزراعية — صرح الزهراء"
      >
        {/* Slides Track */}
        <div className="relative w-full h-[360px] sm:h-[460px] md:h-[520px] lg:h-[580px] overflow-hidden">
          {slides.map((s, i) => {
            const isActive = i === index;
            return (
              <div
                key={s.id}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
                aria-hidden={!isActive}
              >
                {/* Image with subtle Ken-Burns zoom on active */}
                <img
                  src={s.url}
                  alt={s.caption || `عرض صورة ${i + 1}`}
                  className={`w-full h-full object-cover transition-transform duration-[8000ms] ease-out ${
                    isActive ? 'scale-105' : 'scale-100'
                  }`}
                  loading={i === 0 ? 'eager' : 'lazy'}
                />

                {/* Multi-layered cinematic gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-black/20" />
                <div className="absolute inset-0 bg-radial-[at_top_right] from-emerald-950/30 via-transparent to-transparent opacity-60" />

                {/* Content Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 md:p-12 pb-16 sm:pb-20 flex flex-col justify-end text-right z-20">
                  <div className="max-w-3xl space-y-2 sm:space-y-3">
                    {/* Tag badge */}
                    {s.tag && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/25 border border-emerald-400/50 backdrop-blur-md text-emerald-200 text-xs sm:text-sm font-black shadow-sm">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                        <span>{s.tag}</span>
                      </div>
                    )}

                    {/* Headline */}
                    {s.caption && (
                      <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight drop-shadow-md">
                        {s.caption}
                      </h2>
                    )}

                    {/* Subtitle / Description */}
                    {s.subtitle && (
                      <p className="text-sm sm:text-base md:text-lg font-medium text-slate-200/90 leading-relaxed max-w-2xl drop-shadow">
                        {s.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top-Right Tools Bar (Lightbox + Counter + Play/Pause) */}
        <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-30 flex items-center gap-2">
          {/* Slide counter */}
          <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-xs sm:text-sm font-black tracking-wider">
            {String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
          </div>

          {/* Fullscreen / Lightbox button */}
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            title="تكبير الصورة بحجم الشاشة"
            aria-label="تكبير الصورة"
            className="p-2 sm:p-2.5 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Play / Pause toggle */}
          {slides.length > 1 && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              title={paused ? 'تشغيل العرض التلقائي' : 'إيقاف مؤقت'}
              aria-label={paused ? 'تشغيل العرض' : 'إيقاف مؤقت'}
              className="p-2 sm:p-2.5 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md"
            >
              {paused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Navigation Arrows (Prev / Next with glowing glass design) */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="الصورة السابقة"
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3.5 rounded-full bg-black/35 hover:bg-emerald-600/80 backdrop-blur-md border border-white/25 text-white transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-xl opacity-90 group-hover:opacity-100"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="الصورة التالية"
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3.5 rounded-full bg-black/35 hover:bg-emerald-600/80 backdrop-blur-md border border-white/25 text-white transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-xl opacity-90 group-hover:opacity-100"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </>
        )}

        {/* Bottom Bar: Progress Indicator & Thumbnail Dots */}
        {slides.length > 1 && (
          <div className="absolute bottom-0 inset-x-0 z-30 flex flex-col items-center">
            {/* Real-time Progress bar */}
            <div className="w-full h-1 bg-white/20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Interactive Pill Indicators */}
            <div className="py-3 sm:py-4 flex items-center justify-center gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setProgress(0);
                    setIndex(i);
                  }}
                  aria-label={`انتقال للصورة ${i + 1}`}
                  className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                    i === index
                      ? 'w-8 sm:w-10 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                      : 'w-2 sm:w-2.5 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Lightbox / Fullscreen Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-8 animate-in fade-in duration-200"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between text-white border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black">
                {currentSlide.tag || 'صرح الزهراء للحلول الزراعية'}
              </span>
              <h3 className="text-base sm:text-lg font-black">{currentSlide.caption || 'عرض الصورة'}</h3>
            </div>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Center Image */}
          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            <img
              src={currentSlide.url}
              alt={currentSlide.caption || 'صورة مكبرة'}
              className="max-h-[75vh] max-w-[95vw] rounded-2xl object-contain shadow-2xl"
            />
            {slides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/30 text-white cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/30 text-white cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Footer Details */}
          <div className="text-center text-slate-300 text-sm border-t border-white/10 pt-4 max-w-xl mx-auto">
            {currentSlide.subtitle && <p className="font-medium">{currentSlide.subtitle}</p>}
            <p className="text-xs text-slate-400 mt-1">
              صورة {index + 1} من إجمالي {slides.length} صور
            </p>
          </div>
        </div>
      )}
    </>
  );
};

/* ==========================================================================
   2. Ultra-Professional Team Cards (كروت فريق العمل الفاخرة)
   ========================================================================== */

export const Avatar: React.FC<{ member: TeamMember; size?: string; ring?: string }> = ({
  member,
  size = 'w-24 h-24',
  ring = 'ring-4 ring-white shadow-xl',
}) => {
  return member.photo ? (
    <img
      src={member.photo}
      alt={member.name}
      className={`${size} rounded-2xl object-cover ${ring} transition-transform duration-300 group-hover:scale-105`}
      loading="lazy"
    />
  ) : (
    <div
      className={`${size} rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center text-3xl font-black ${ring} shadow-lg`}
    >
      {(member.name || '؟').trim().charAt(0)}
    </div>
  );
};

interface TeamSectionProps {
  content: HomeContent['team'];
}

const TeamSection: React.FC<TeamSectionProps> = ({ content }) => {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>('all');

  const members = Array.isArray(content?.members) && content.members.length > 0
    ? content.members
    : DEFAULT_HOME_CONTENT.team.members;

  // Extract unique departments for filtering
  const departments = Array.from(
    new Set(members.map((m) => m?.department).filter(Boolean) as string[])
  );

  const filteredMembers =
    selectedDept === 'all'
      ? members
      : members.filter((m) => m?.department === selectedDept);

  return (
    <section className="space-y-6" aria-label="فريق العمل والخبراء الزراعيين">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs sm:text-sm font-black mb-2">
            <Users className="w-4 h-4" />
            <span>الكفاءات والخبرات</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--theme-text-color, #0f172a)' }}>
            {content.title || 'فريق العمل والخبراء'}
          </h2>
          {content.subtitle && (
            <p className="text-sm sm:text-base font-semibold text-slate-600 mt-1 max-w-2xl">
              {content.subtitle}
            </p>
          )}
        </div>

        {/* Department Filter Tabs (if more than 1 dept) */}
        {departments.length > 1 && (
          <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-black">
            <button
              type="button"
              onClick={() => setSelectedDept('all')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                selectedDept === 'all'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({content.members.length})
            </button>
            {departments.map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setSelectedDept(dept)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  selectedDept === dept
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
        {filteredMembers.map((m) => {
          return (
            <article
              key={m.id}
              className="group rounded-3xl bg-white border-2 border-slate-200/90 shadow-sm hover:shadow-2xl hover:border-emerald-500/50 hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between overflow-hidden relative"
            >
              {/* Card Top Decorative Banner */}
              <div
                className="h-28 w-full relative overflow-hidden"
                style={{
                  background:
                    'linear-gradient(135deg, var(--theme-dark-surface, #064e3b) 0%, var(--theme-accent, #10b981) 100%)',
                }}
              >
                {/* Subtle pattern background */}
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />

                {/* Experience Badge / Department at top */}
                <div className="absolute top-3 left-3 z-10">
                  {m.experience && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-black border border-white/30 shadow-sm">
                      <Award className="w-3 h-3 text-amber-300" />
                      {m.experience}
                    </span>
                  )}
                </div>

                {/* Status Dot */}
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-md text-white text-[11px] font-black border border-white/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{m.status || 'متواجد'}</span>
                </div>
              </div>

              {/* Avatar + Main Body */}
              <div className="px-5 pb-5 -mt-14 flex flex-col items-center text-center flex-1">
                <div className="relative mb-3">
                  <Avatar member={m} size="w-24 h-24" />
                  <div
                    className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-600 text-white shadow-md"
                    title="عضو معتمد"
                  >
                    <BadgeCheck className="w-4 h-4" />
                  </div>
                </div>

                {/* Name */}
                <h3 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-emerald-700 transition-colors">
                  {m.name || 'بدون اسم'}
                </h3>

                {/* Role Pill */}
                {m.role && (
                  <span className="mt-1 inline-block rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-3 py-1 text-xs font-black">
                    {m.role}
                  </span>
                )}

                {/* Department */}
                {m.department && (
                  <span className="text-[11px] font-bold text-slate-500 mt-1">
                    {m.department}
                  </span>
                )}

                {/* Bio / Quote */}
                {m.bio && (
                  <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed mt-3 line-clamp-3 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-right w-full">
                    {m.bio}
                  </p>
                )}

                {/* Action Channels (Call, WhatsApp, Email, Details) */}
                <div className="w-full mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    {m.phone && (
                      <a
                        href={`tel:${m.phone}`}
                        title={`اتصال: ${m.phone}`}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 transition-all cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {m.phone && (
                      <a
                        href={`https://wa.me/${m.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        title="محادثة واتساب"
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 transition-all cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {m.email && (
                      <a
                        href={`mailto:${m.email}`}
                        title={`بريد: ${m.email}`}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-sky-600 hover:text-white text-slate-700 transition-all cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedMember(m)}
                    className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    <span>التفاصيل</span>
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Full Member Profile Modal */}
      {selectedMember && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          dir="rtl"
        >
          <div className="bg-white rounded-[2rem] max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 relative">
            {/* Modal Header */}
            <div
              className="h-28 relative"
              style={{
                background:
                  'linear-gradient(135deg, var(--theme-dark-surface, #064e3b) 0%, var(--theme-accent, #10b981) 100%)',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="absolute top-4 left-4 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white cursor-pointer transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 pb-6 -mt-12 flex flex-col items-center text-center space-y-3">
              <Avatar member={selectedMember} size="w-28 h-28" />
              <h3 className="text-xl font-black text-slate-900">{selectedMember.name}</h3>
              {selectedMember.role && (
                <span className="px-3.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-black text-xs sm:text-sm">
                  {selectedMember.role}
                </span>
              )}
              {selectedMember.department && (
                <p className="text-xs font-bold text-slate-500">{selectedMember.department}</p>
              )}

              {selectedMember.experience && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-black">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span>{selectedMember.experience}</span>
                </div>
              )}

              {selectedMember.bio && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-right w-full mt-2">
                  <p className="text-xs font-bold text-slate-400 mb-1">نبذة عن العضو والمسؤوليات:</p>
                  <p className="text-sm font-semibold text-slate-700 leading-relaxed whitespace-pre-line">
                    {selectedMember.bio}
                  </p>
                </div>
              )}

              {/* Contact Actions */}
              <div className="w-full pt-4 flex gap-2">
                {selectedMember.phone && (
                  <a
                    href={`https://wa.me/${selectedMember.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black transition-all cursor-pointer shadow-md"
                  >
                    <MessageCircle className="w-4 h-4" />
                    محادثة واتساب
                  </a>
                )}
                {selectedMember.phone && (
                  <a
                    href={`tel:${selectedMember.phone}`}
                    className="p-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-800 transition-all cursor-pointer"
                    title="اتصال هاتفي"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
                {selectedMember.email && (
                  <a
                    href={`mailto:${selectedMember.email}`}
                    className="p-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-800 transition-all cursor-pointer"
                    title="إرسال بريد"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

/* ==========================================================================
   3. Comprehensive "About Al-Zahraa" Section (قسم عن صرح الزهراء للأدوية والأسمدة والبذور)
   ========================================================================== */

interface AboutSectionProps {
  about?: AboutContent;
  vision?: HomeContent['vision'];
}

const AboutSection: React.FC<AboutSectionProps> = ({ about, vision }) => {
  const [activeTab, setActiveTab] = useState<'story' | 'vision' | 'pillars' | 'guarantee'>('story');

  const d = DEFAULT_HOME_CONTENT.about!;
  const content: AboutContent = {
    title: about?.title || d.title,
    subtitle: about?.subtitle || d.subtitle,
    story: about?.story || d.story,
    stats: Array.isArray(about?.stats) && about.stats.length > 0 ? about.stats : d.stats,
    pillars: Array.isArray(about?.pillars) && about.pillars.length > 0 ? about.pillars : d.pillars,
    mission: about?.mission || d.mission,
    vision: about?.vision || d.vision,
    guaranteeText: about?.guaranteeText || d.guaranteeText,
  };

  return (
    <section className="space-y-6 sm:space-y-8" aria-label="عن صرح الزهراء للأدوية والأسمدة والبذور الزراعية">
      {/* Hero Presentation Card */}
      <div className="relative rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white p-6 sm:p-10 md:p-12 shadow-xl border border-emerald-900/40 overflow-hidden">
        {/* Glow & botanical backdrop details */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs sm:text-sm font-black">
            <Sprout className="w-4 h-4" />
            <span>عن صرح الزهراء للأدوية والمستلزمات الزراعية</span>
          </div>

          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight">
            {content.title}
          </h2>

          <p className="text-base sm:text-lg md:text-xl font-bold text-emerald-100/90 leading-relaxed max-w-3xl">
            {content.subtitle}
          </p>

          <p className="text-sm sm:text-base font-medium text-slate-300 leading-loose max-w-3xl whitespace-pre-line pt-2">
            {content.story}
          </p>
        </div>

        {/* Dynamic Key Stats Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-8 border-t border-white/10 relative z-10">
          {content.stats.map((st, i) => (
            <div
              key={i}
              className="p-4 sm:p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-emerald-400/40 transition-colors flex flex-col justify-between"
            >
              <div className="text-2xl sm:text-3xl md:text-4xl font-black text-emerald-400 font-mono tracking-tight">
                {st.value}
              </div>
              <div className="text-xs sm:text-sm font-black text-white mt-1">{st.label}</div>
              {st.detail && <div className="text-[11px] font-medium text-slate-400 mt-0.5">{st.detail}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Tabs: Story / Pillars / Vision & Mission / Guarantees */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-sm">
        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('story')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'story'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Trees className="w-4 h-4" />
            ركائزنا وقيمنا الأساسية
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vision')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'vision'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            الرؤية والرسالة
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guarantee')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'guarantee'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            الضمان والمطابقة
          </button>
        </div>

        {/* Tab 1: Pillars (ركائزنا) */}
        {activeTab === 'story' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-200">
            {content.pillars.map((pl, idx) => {
              const icons = [
                <CheckCircle2 key="1" className="w-6 h-6 text-emerald-600" />,
                <TrendingUp key="2" className="w-6 h-6 text-teal-600" />,
                <Truck key="3" className="w-6 h-6 text-sky-600" />,
                <Award key="4" className="w-6 h-6 text-amber-600" />,
              ];
              return (
                <div
                  key={idx}
                  className="rounded-2xl p-5 border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-emerald-300 hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2.5 rounded-xl bg-white shadow-sm border border-slate-100">
                        {icons[idx % icons.length]}
                      </div>
                      {pl.badge && (
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                          {pl.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-slate-900 mb-1">{pl.title}</h3>
                    <p className="text-xs sm:text-sm font-medium text-slate-600 leading-relaxed">
                      {pl.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Vision & Mission (الرؤية والرسالة) */}
        {activeTab === 'vision' && (
          <div className="grid md:grid-cols-2 gap-6 animate-in fade-in duration-200">
            {/* Vision */}
            <div className="rounded-2xl p-6 bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200/80">
              <div className="inline-flex items-center gap-2 text-emerald-800 font-black text-sm mb-2">
                <Compass className="w-4 h-4" />
                <span>رؤيتنا المستقبلية</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">الريادة المستدامة</h3>
              <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                {content.vision}
              </p>
            </div>

            {/* Mission */}
            <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-50 to-slate-100/70 border border-slate-200">
              <div className="inline-flex items-center gap-2 text-slate-800 font-black text-sm mb-2">
                <Layers className="w-4 h-4" />
                <span>رسالتنا الزراعية</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">التمكين والإنتاجية العالية</h3>
              <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                {content.mission}
              </p>
            </div>

            {/* Bullet points from vision if available */}
            {vision && vision.points && vision.points.length > 0 && (
              <div className="md:col-span-2 mt-2">
                <h4 className="text-sm font-black text-slate-800 mb-3">أبرز الأهداف والالتزامات:</h4>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {vision.points.map((pt, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm font-bold text-slate-800"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Guarantee & Quality (الضمان والمطابقة) */}
        {activeTab === 'guarantee' && (
          <div className="rounded-2xl p-6 bg-emerald-950 text-white border border-emerald-800/60 animate-in fade-in duration-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl" />
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black">
                <ShieldCheck className="w-4 h-4" />
                <span>وثيقة الضمان الذهبية</span>
              </div>
              <h3 className="text-xl font-black">ضمان مطابقة بنسبة 100% مع متابعة مجانية</h3>
              <p className="text-sm sm:text-base font-medium text-emerald-100/90 leading-relaxed">
                {content.guaranteeText}
              </p>

              <div className="grid sm:grid-cols-3 gap-3 pt-3">
                <div className="p-3 rounded-xl bg-white/10 backdrop-blur border border-white/10 text-center">
                  <div className="text-lg font-black text-emerald-300">استبدال فوري</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">في حالة عدم مطابقة الصنف</div>
                </div>
                <div className="p-3 rounded-xl bg-white/10 backdrop-blur border border-white/10 text-center">
                  <div className="text-lg font-black text-emerald-300">شهادة ترخيص واعتماد</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">لكل مركب وشحنة توريد زراعية</div>
                </div>
                <div className="p-3 rounded-xl bg-white/10 backdrop-blur border border-white/10 text-center">
                  <div className="text-lg font-black text-emerald-300">إشراف وروشتات مجانية</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">برنامج مكافحة وتسميد مخصص</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

/* ==========================================================================
   4. Main Container (HomeSections)
   ========================================================================== */

interface HomeSectionsProps {
  onNavigate?: (tab: string) => void;
  onOpenSimsim?: () => void;
}

/**
   عرض فقط. التعديل متاح للمدير العام من صفحة البروفايل (تبويب "الصفحة الرئيسية").
 */
export const HomeSections: React.FC<HomeSectionsProps> = ({ onNavigate, onOpenSimsim }) => {
  const [content, setContent] = useState<HomeContent>(DEFAULT_HOME_CONTENT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = () =>
      loadHomeContent()
        .then((c) => alive && setContent(c))
        .catch((e) => console.warn('تعذر تحميل محتوى الصفحة الرئيسية:', e))
        .finally(() => alive && setLoading(false));

    load();
    window.addEventListener(HOME_CONTENT_EVENT, load);
    return () => {
      alive = false;
      window.removeEventListener(HOME_CONTENT_EVENT, load);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 mb-8" aria-hidden="true">
        <div className="h-[280px] sm:h-[380px] rounded-[2.5rem] bg-slate-200/70 animate-pulse" />
        <div className="h-[360px] sm:h-[460px] rounded-[2.5rem] bg-slate-200/70 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-64 rounded-3xl bg-slate-200/60 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const slides = Array.isArray(content?.slides) && content.slides.length > 0 ? content.slides : DEFAULT_HOME_CONTENT.slides;
  const team = content?.team && Array.isArray(content.team.members) && content.team.members.length > 0 ? content.team : DEFAULT_HOME_CONTENT.team;
  const about = content?.about || DEFAULT_HOME_CONTENT.about;

  return (
    <div className="space-y-8 sm:space-y-12 mb-8 sm:mb-12" dir="rtl">
      {/* 1. Grand Agricultural Hero Section */}
      <HeroSection
        hero={content.hero}
        onNavigate={onNavigate}
        onOpenSimsim={onOpenSimsim}
      />

      {/* 2. Ultra-Professional Image Slider */}
      <HomeSlider slides={slides} />

      {/* 3. Comprehensive About Al-Zahraa Section */}
      <AboutSection about={about} vision={content.vision} />

      {/* 4. Executive Team Members Section */}
      <TeamSection content={team} />
    </div>
  );
};
