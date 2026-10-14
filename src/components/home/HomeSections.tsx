import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  Save,
  X,
  ImagePlus,
  Users,
  Eye,
  ArrowUp,
  ArrowDown,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  HomeContent,
  HomeSlide,
  TeamMember,
  loadHomeContent,
  saveHomeContent,
  uploadHomeImage,
  deleteHomeImages,
  collectImageUrls,
  newId,
  DEFAULT_HOME_CONTENT,
} from '../../lib/homeContent';

interface HomeSectionsProps {
  /** التعديل متاح للمدير العام فقط (والحماية الفعلية في قاعدة البيانات عبر RLS). */
  isAdmin: boolean;
}

const cardClass = 'rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-sm overflow-hidden';
const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20';
const iconBtn =
  'inline-flex items-center justify-center rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer';

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

/* ---------------------------------- Display ---------------------------------- */

const Avatar: React.FC<{ member: TeamMember; size?: string }> = ({ member, size = 'w-24 h-24' }) =>
  member.photo ? (
    <img src={member.photo} alt={member.name} className={`${size} rounded-full object-cover border-4 border-emerald-100`} loading="lazy" />
  ) : (
    <div className={`${size} rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-3xl font-black border-4 border-emerald-50`}>
      {(member.name || '؟').trim().charAt(0)}
    </div>
  );

const TeamSection: React.FC<{ content: HomeContent['team'] }> = ({ content }) => (
  <section className={`${cardClass} p-5 sm:p-8`}>
    <div className="flex items-center gap-3 mb-1">
      <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800"><Users className="w-5 h-5" /></div>
      <h2 className="text-xl sm:text-2xl font-black">{content.title}</h2>
    </div>
    {content.subtitle && <p className="text-sm sm:text-base font-bold text-slate-500 mb-5 mr-12">{content.subtitle}</p>}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
      {content.members.map((m) => (
        <div key={m.id} className="flex flex-col items-center text-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-5">
          <Avatar member={m} />
          <div className="text-lg font-black">{m.name || 'بدون اسم'}</div>
          {m.role && <div className="text-sm font-black text-emerald-700">{m.role}</div>}
          {m.bio && <p className="text-sm font-semibold text-slate-600 leading-relaxed">{m.bio}</p>}
        </div>
      ))}
    </div>
  </section>
);

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

/* ----------------------------------- Editor ----------------------------------- */

interface EditorProps {
  draft: HomeContent;
  setDraft: React.Dispatch<React.SetStateAction<HomeContent>>;
  onError: (msg: string) => void;
}

const HomeEditor: React.FC<EditorProps> = ({ draft, setDraft, onError }) => {
  const [uploading, setUploading] = useState<string | null>(null);
  const slideInput = useRef<HTMLInputElement>(null);
  const photoTarget = useRef<string>('');
  const photoInput = useRef<HTMLInputElement>(null);

  const run = async (key: string, fn: () => Promise<void>) => {
    setUploading(key);
    try {
      await fn();
    } catch (e: any) {
      onError(e?.message || 'فشل رفع الصورة');
    } finally {
      setUploading(null);
    }
  };

  const addSlides = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    run('slides', async () => {
      for (const f of list) {
        const url = await uploadHomeImage(f, 1600);
        setDraft((d) => ({ ...d, slides: [...d.slides, { id: newId(), url, caption: '' }] }));
      }
    });
  };

  const moveSlide = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.slides.length) return d;
      const slides = [...d.slides];
      [slides[i], slides[j]] = [slides[j], slides[i]];
      return { ...d, slides };
    });

  const updateMember = (id: string, patch: Partial<TeamMember>) =>
    setDraft((d) => ({ ...d, team: { ...d.team, members: d.team.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) } }));

  const uploadMemberPhoto = (id: string, file: File | undefined) => {
    if (!file) return;
    run(`photo-${id}`, async () => {
      const url = await uploadHomeImage(file, 600);
      updateMember(id, { photo: url });
    });
  };

  const sectionTitle = 'text-lg font-black text-slate-900 mb-3';

  return (
    <div className="space-y-5">
      {/* السلايدر */}
      <div className={`${cardClass} p-5`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={sectionTitle + ' !mb-0'}>سلايدر الصور</h3>
          <button
            type="button"
            onClick={() => slideInput.current?.click()}
            disabled={uploading !== null}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-black px-4 py-2 disabled:opacity-50 cursor-pointer"
          >
            {uploading === 'slides' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            إضافة صور
          </button>
          <input ref={slideInput} type="file" accept="image/*" multiple hidden onChange={(e) => { addSlides(e.target.files); e.target.value = ''; }} />
        </div>
        {draft.slides.length === 0 && <p className="text-sm font-bold text-slate-500">لا توجد صور بعد. اضغط "إضافة صور".</p>}
        <div className="space-y-3">
          {draft.slides.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-2">
              <img src={s.url} alt="" className="w-24 h-16 sm:w-32 sm:h-20 rounded-xl object-cover shrink-0" />
              <input
                className={inputClass}
                placeholder="تعليق على الصورة (اختياري)"
                value={s.caption}
                onChange={(e) => setDraft((d) => ({ ...d, slides: d.slides.map((x) => (x.id === s.id ? { ...x, caption: e.target.value } : x)) }))}
              />
              <div className="flex flex-col sm:flex-row shrink-0">
                <button type="button" className={iconBtn} disabled={i === 0} onClick={() => moveSlide(i, -1)} aria-label="للأعلى"><ArrowUp className="w-4 h-4" /></button>
                <button type="button" className={iconBtn} disabled={i === draft.slides.length - 1} onClick={() => moveSlide(i, 1)} aria-label="للأسفل"><ArrowDown className="w-4 h-4" /></button>
                <button type="button" className={iconBtn + ' !text-rose-600'} onClick={() => setDraft((d) => ({ ...d, slides: d.slides.filter((x) => x.id !== s.id) }))} aria-label="حذف"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* الفريق */}
      <div className={`${cardClass} p-5`}>
        <h3 className={sectionTitle}>الفريق</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <input className={inputClass} placeholder="عنوان القسم" value={draft.team.title} onChange={(e) => setDraft((d) => ({ ...d, team: { ...d.team, title: e.target.value } }))} />
          <input className={inputClass} placeholder="عنوان فرعي (اختياري)" value={draft.team.subtitle} onChange={(e) => setDraft((d) => ({ ...d, team: { ...d.team, subtitle: e.target.value } }))} />
        </div>
        <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => { uploadMemberPhoto(photoTarget.current, e.target.files?.[0]); e.target.value = ''; }} />
        <div className="space-y-3">
          {draft.team.members.map((m) => (
            <div key={m.id} className="flex gap-3 rounded-2xl border border-slate-200 p-3">
              <button
                type="button"
                className="relative shrink-0 cursor-pointer"
                onClick={() => { photoTarget.current = m.id; photoInput.current?.click(); }}
                aria-label="تغيير الصورة"
              >
                <Avatar member={m} size="w-20 h-20" />
                <span className="absolute inset-0 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  {uploading === `photo-${m.id}` ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                </span>
              </button>
              <div className="flex-1 grid gap-2 min-w-0">
                <div className="grid sm:grid-cols-2 gap-2">
                  <input className={inputClass} placeholder="الاسم" value={m.name} onChange={(e) => updateMember(m.id, { name: e.target.value })} />
                  <input className={inputClass} placeholder="الوظيفة" value={m.role} onChange={(e) => updateMember(m.id, { role: e.target.value })} />
                </div>
                <textarea className={inputClass} rows={2} placeholder="نبذة قصيرة (اختياري)" value={m.bio} onChange={(e) => updateMember(m.id, { bio: e.target.value })} />
              </div>
              <button type="button" className={iconBtn + ' !text-rose-600 self-start'} onClick={() => setDraft((d) => ({ ...d, team: { ...d.team, members: d.team.members.filter((x) => x.id !== m.id) } }))} aria-label="حذف العضو"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setDraft((d) => ({ ...d, team: { ...d.team, members: [...d.team.members, { id: newId(), name: '', role: '', bio: '', photo: '' }] } }))}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-700 text-emerald-800 hover:bg-emerald-50 text-sm font-black px-4 py-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> إضافة عضو
        </button>
      </div>

      {/* الرؤية */}
      <div className={`${cardClass} p-5`}>
        <h3 className={sectionTitle}>رؤية الموقع</h3>
        <div className="grid gap-3">
          <input className={inputClass} placeholder="عنوان القسم" value={draft.vision.title} onChange={(e) => setDraft((d) => ({ ...d, vision: { ...d.vision, title: e.target.value } }))} />
          <textarea className={inputClass} rows={5} placeholder="نص الرؤية" value={draft.vision.text} onChange={(e) => setDraft((d) => ({ ...d, vision: { ...d.vision, text: e.target.value } }))} />
          <div className="space-y-2">
            {draft.vision.points.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input className={inputClass} placeholder={`نقطة ${i + 1}`} value={p} onChange={(e) => setDraft((d) => ({ ...d, vision: { ...d.vision, points: d.vision.points.map((x, j) => (j === i ? e.target.value : x)) } }))} />
                <button type="button" className={iconBtn + ' !text-rose-600'} onClick={() => setDraft((d) => ({ ...d, vision: { ...d.vision, points: d.vision.points.filter((_, j) => j !== i) } }))} aria-label="حذف النقطة"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, vision: { ...d.vision, points: [...d.vision.points, ''] } }))}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-700 text-emerald-800 hover:bg-emerald-50 text-sm font-black px-4 py-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> إضافة نقطة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------ Main ------------------------------------ */

export const HomeSections: React.FC<HomeSectionsProps> = ({ isAdmin }) => {
  const [content, setContent] = useState<HomeContent>(DEFAULT_HOME_CONTENT);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<HomeContent>(DEFAULT_HOME_CONTENT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    loadHomeContent()
      .then((c) => alive && setContent(c))
      .catch((e) => alive && setLoadError(e?.message || 'تعذر تحميل محتوى الصفحة الرئيسية'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const startEdit = () => {
    setDraft(structuredClone(content));
    setError('');
    setEditing(true);
  };

  const cancelEdit = () => {
    // الصور التي رُفعت أثناء التعديل ولم تُحفظ تُحذف حتى لا تتراكم في التخزين
    const orphaned = collectImageUrls(draft).filter((u) => !collectImageUrls(content).includes(u));
    void deleteHomeImages(orphaned);
    setEditing(false);
    setError('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const cleaned: HomeContent = {
        slides: draft.slides,
        team: {
          ...draft.team,
          members: draft.team.members.filter((m) => m.name.trim() || m.role.trim() || m.bio.trim() || m.photo),
        },
        vision: { ...draft.vision, points: draft.vision.points.map((p) => p.trim()).filter(Boolean) },
      };
      await saveHomeContent(cleaned);
      const removed = collectImageUrls(content).filter((u) => !collectImageUrls(cleaned).includes(u));
      void deleteHomeImages(removed);
      setContent(cleaned);
      setEditing(false);
    } catch (e: any) {
      setError(e?.message || 'فشل حفظ التعديلات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-40 rounded-3xl bg-slate-200/60 animate-pulse mb-6" aria-hidden="true" />;
  }

  const hasSlides = content.slides.length > 0;
  const hasTeam = content.team.members.length > 0;
  const hasVision = Boolean(content.vision.text.trim() || content.vision.points.length);
  const isEmpty = !hasSlides && !hasTeam && !hasVision;

  // لغير المدير العام: لا شيء يظهر إذا لم يُضف المدير أي محتوى بعد
  if (!isAdmin && isEmpty) return null;

  return (
    <div className="space-y-5 sm:space-y-6 mb-6 sm:mb-8" dir="rtl">
      {loadError && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 text-sm font-bold p-3">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {loadError}
        </div>
      )}

      {isAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-900 p-3 sm:p-4">
          <span className="text-sm font-black">
            {editing ? 'وضع تعديل الصفحة الرئيسية' : 'يمكنك تعديل السلايدر والفريق ورؤية الموقع (للمدير العام فقط)'}
          </span>
          {editing ? (
            <div className="flex gap-2">
              <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-black px-4 py-2 disabled:opacity-50 cursor-pointer">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
              </button>
              <button type="button" onClick={cancelEdit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm font-black px-4 py-2 disabled:opacity-50 cursor-pointer">
                <X className="w-4 h-4" /> إلغاء
              </button>
            </div>
          ) : (
            <button type="button" onClick={startEdit} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-black px-4 py-2 cursor-pointer">
              <Pencil className="w-4 h-4" /> تعديل الصفحة الرئيسية
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-300 bg-rose-50 text-rose-800 text-sm font-bold p-3">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {isAdmin && editing ? (
        <HomeEditor draft={draft} setDraft={setDraft} onError={setError} />
      ) : (
        <>
          {hasSlides && <HomeSlider slides={content.slides} />}
          {hasTeam && <TeamSection content={content.team} />}
          {hasVision && <VisionSection content={content.vision} />}
        </>
      )}
    </div>
  );
};
