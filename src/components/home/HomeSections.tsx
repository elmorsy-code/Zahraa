import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Users, Eye, CheckCircle2 } from 'lucide-react';
import {
  HomeContent,
  HomeSlide,
  TeamMember,
  loadHomeContent,
  DEFAULT_HOME_CONTENT,
  HOME_CONTENT_EVENT,
} from '../../lib/homeContent';

export const cardClass = 'rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-sm overflow-hidden';

/* ---------------------------------- Slider ---------------------------------- */

const HomeSlider: React.FC<{ slides: HomeSlide[] }> = ({ slides }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [slides.length, index]);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length, paused]);

  if (slides.length === 0) return null;
  const go = (d: number) => setIndex((i) => (i + d + slides.length) % slides.length);

  return (
    <div
      className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-3xl overflow-hidden bg-slate-900 shadow-lg"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          aria-hidden={i !== index}
        >
          <img src={s.url} alt={s.caption || `صورة ${i + 1}`} className="w-full h-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
          {s.caption && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 sm:p-6 pt-12">
              <p className="text-white text-base sm:text-xl font-black drop-shadow">{s.caption}</p>
            </div>
          )}
        </div>
      ))}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="الصورة السابقة"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/60 text-white p-2 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="الصورة التالية"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/60 text-white p-2 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`الانتقال للصورة ${i + 1}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${i === index ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* ---------------------------------- Team ---------------------------------- */

export const Avatar: React.FC<{ member: TeamMember; size?: string; ring?: string }> = ({
  member,
  size = 'w-24 h-24',
  ring = 'border-4 border-white',
}) =>
  member.photo ? (
    <img src={member.photo} alt={member.name} className={`${size} rounded-full object-cover ${ring} shadow-md`} loading="lazy" />
  ) : (
    <div className={`${size} rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-3xl font-black ${ring} shadow-md`}>
      {(member.name || '؟').trim().charAt(0)}
    </div>
  );

const TeamSection: React.FC<{ content: HomeContent['team'] }> = ({ content }) => (
  <section>
    <div className="flex items-center gap-3 mb-1">
      <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800"><Users className="w-5 h-5" /></div>
      <h2 className="text-xl sm:text-2xl font-black" style={{ color: 'var(--theme-text-color, #0f172a)' }}>{content.title}</h2>
    </div>
    {content.subtitle && (
      <p className="text-sm sm:text-base font-bold opacity-70 mb-4 mr-12" style={{ color: 'var(--theme-text-color, #0f172a)' }}>
        {content.subtitle}
      </p>
    )}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 mt-4">
      {content.members.map((m) => (
        <article
          key={m.id}
          className="group rounded-3xl bg-white text-slate-900 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
        >
          {/* رأس الكارت بلون الثيم، والصورة تتداخل معه */}
          <div
            className="h-20 w-full"
            style={{ background: 'linear-gradient(135deg, var(--theme-dark-surface, #0b1f18), var(--theme-accent, #10b981))' }}
          />
          <div className="px-5 pb-6 -mt-12 flex flex-col items-center text-center gap-1.5 flex-1">
            <Avatar member={m} size="w-24 h-24" />
            <h3 className="text-lg font-black mt-2">{m.name || 'بدون اسم'}</h3>
            {m.role && (
              <span className="inline-block rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-0.5 text-xs sm:text-sm font-black">
                {m.role}
              </span>
            )}
            {m.bio && <p className="text-sm font-semibold text-slate-600 leading-relaxed mt-2">{m.bio}</p>}
          </div>
        </article>
      ))}
    </div>
  </section>
);

/* ---------------------------------- Vision ---------------------------------- */

const VisionSection: React.FC<{ content: HomeContent['vision'] }> = ({ content }) => (
  <section className={`${cardClass} p-5 sm:p-8`}>
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800"><Eye className="w-5 h-5" /></div>
      <h2 className="text-xl sm:text-2xl font-black">{content.title}</h2>
    </div>
    {content.text && <p className="text-base sm:text-lg font-semibold text-slate-700 leading-loose whitespace-pre-line">{content.text}</p>}
    {content.points.length > 0 && (
      <ul className="mt-4 space-y-2">
        {content.points.map((p, i) => (
          <li key={i} className="flex items-start gap-2 text-base font-bold text-slate-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    )}
  </section>
);

/* ------------------------------------ Main ------------------------------------ */

/** عرض فقط. التعديل من صفحة البروفايل (تبويب "الصفحة الرئيسية") للمدير العام فقط. */
export const HomeSections: React.FC = () => {
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

  if (loading) return <div className="h-40 rounded-3xl bg-slate-200/60 animate-pulse mb-6" aria-hidden="true" />;

  const hasSlides = content.slides.length > 0;
  const hasTeam = content.team.members.length > 0;
  const hasVision = Boolean(content.vision.text.trim() || content.vision.points.length);
  if (!hasSlides && !hasTeam && !hasVision) return null;

  return (
    <div className="space-y-5 sm:space-y-8 mb-6 sm:mb-8" dir="rtl">
      {hasSlides && <HomeSlider slides={content.slides} />}
      {hasTeam && <TeamSection content={content.team} />}
      {hasVision && <VisionSection content={content.vision} />}
    </div>
  );
};
