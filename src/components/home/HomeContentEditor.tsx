import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  Save,
  ImagePlus,
  ArrowUp,
  ArrowDown,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import {
  HomeContent,
  TeamMember,
  loadHomeContent,
  saveHomeContent,
  uploadHomeImage,
  deleteHomeImages,
  collectImageUrls,
  notifyHomeContentUpdated,
  newId,
  DEFAULT_HOME_CONTENT,
} from '../../lib/homeContent';
import { Avatar, cardClass } from './HomeSections';

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20';
const iconBtn =
  'inline-flex items-center justify-center rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer';

/* ----------------------------------- Editor ----------------------------------- */

interface EditorProps {
  draft: HomeContent;
  setDraft: React.Dispatch<React.SetStateAction<HomeContent>>;
  onError: (msg: string) => void;
}

const HomeEditorFields: React.FC<EditorProps> = ({ draft, setDraft, onError }) => {
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
      {/* قسم الهيرو والواجهة الرئيسية */}
      <div className={`${cardClass} p-5`}>
        <h3 className={sectionTitle}>الواجهة الترحيبية والهيرو الرئيسي</h3>
        <p className="text-xs text-slate-500 font-bold mb-3">
          تحكم في شريط الإعلان الموسمي، عنوان الهيرو والعبارة الترويجية وأرقام التواصل السريع.
        </p>
        <div className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">شارة الموسم الزراعي:</label>
              <input
                className={inputClass}
                placeholder="شارة الموسم (مثل: الموسم الزراعي الحالي)"
                value={draft.hero?.seasonBadge || ''}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    hero: { ...(d.hero || DEFAULT_HOME_CONTENT.hero!), seasonBadge: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">إشعار الموسم والتوريدات:</label>
              <input
                className={inputClass}
                placeholder="نص الإشعار الموسمي أعلى الهيرو"
                value={draft.hero?.seasonNotice || ''}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    hero: { ...(d.hero || DEFAULT_HOME_CONTENT.hero!), seasonNotice: e.target.value },
                  }))
                }
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">شارة الصرح / التاج لاين:</label>
              <input
                className={inputClass}
                placeholder="صرح مشاتل الزهراء النموذجية"
                value={draft.hero?.tagline || ''}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    hero: { ...(d.hero || DEFAULT_HOME_CONTENT.hero!), tagline: e.target.value },
                  }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-black text-slate-700 block mb-1">العنوان الرئيسي للهيرو:</label>
              <input
                className={inputClass}
                placeholder="العنوان الرئيسي"
                value={draft.hero?.title || ''}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    hero: { ...(d.hero || DEFAULT_HOME_CONTENT.hero!), title: e.target.value },
                  }))
                }
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-700 block mb-1">النص المميز الملون:</label>
            <input
              className={inputClass}
              placeholder="العبارة الملونة (مثل: بأعلى نسب نجاح ونقاء للأصناف 100%)"
              value={draft.hero?.highlightText || ''}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  hero: { ...(d.hero || DEFAULT_HOME_CONTENT.hero!), highlightText: e.target.value },
                }))
              }
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-700 block mb-1">الوصف التعريفي للهيرو:</label>
            <textarea
              className={inputClass}
              rows={2}
              placeholder="وصف مختصر ومؤثر عن خدمات وخبرات الأدوية والأسمدة والبذور"
              value={draft.hero?.description || ''}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  hero: { ...(d.hero || DEFAULT_HOME_CONTENT.hero!), description: e.target.value },
                }))
              }
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">رقم الهاتف / الخط الساخن:</label>
              <input
                className={inputClass}
                placeholder="+20 100 234 5678"
                value={draft.hero?.contactPhone || ''}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    hero: { ...(d.hero || DEFAULT_HOME_CONTENT.hero!), contactPhone: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">رقم الواتساب السريع:</label>
              <input
                className={inputClass}
                placeholder="201002345678"
                value={draft.hero?.contactWhatsApp || ''}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    hero: { ...(d.hero || DEFAULT_HOME_CONTENT.hero!), contactWhatsApp: e.target.value },
                  }))
                }
              />
            </div>
          </div>
        </div>
      </div>

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
            <div key={s.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border border-slate-200 p-3 bg-slate-50/50">
              <img src={s.url} alt="" className="w-full sm:w-36 h-24 rounded-xl object-cover shrink-0 border border-slate-200" />
              <div className="flex-1 w-full space-y-2">
                <div className="grid sm:grid-cols-3 gap-2">
                  <input
                    className={`${inputClass} sm:col-span-2`}
                    placeholder="عنوان الشريحة الرئيسي"
                    value={s.caption}
                    onChange={(e) => setDraft((d) => ({ ...d, slides: d.slides.map((x) => (x.id === s.id ? { ...x, caption: e.target.value } : x)) }))}
                  />
                  <input
                    className={inputClass}
                    placeholder="شارة مميزة (مثال: إنتاج محلي فاخر)"
                    value={s.tag || ''}
                    onChange={(e) => setDraft((d) => ({ ...d, slides: d.slides.map((x) => (x.id === s.id ? { ...x, tag: e.target.value } : x)) }))}
                  />
                </div>
                <input
                  className={inputClass}
                  placeholder="وصف تفصيلي فرعي للشريحة"
                  value={s.subtitle || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, slides: d.slides.map((x) => (x.id === s.id ? { ...x, subtitle: e.target.value } : x)) }))}
                />
              </div>
              <div className="flex sm:flex-col shrink-0 gap-1 self-end sm:self-center">
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
        <h3 className={sectionTitle}>فريق العمل والخبراء</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <input className={inputClass} placeholder="عنوان القسم" value={draft.team.title} onChange={(e) => setDraft((d) => ({ ...d, team: { ...d.team, title: e.target.value } }))} />
          <input className={inputClass} placeholder="عنوان فرعي (اختياري)" value={draft.team.subtitle} onChange={(e) => setDraft((d) => ({ ...d, team: { ...d.team, subtitle: e.target.value } }))} />
        </div>
        <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => { uploadMemberPhoto(photoTarget.current, e.target.files?.[0]); e.target.value = ''; }} />
        <div className="space-y-4">
          {draft.team.members.map((m) => (
            <div key={m.id} className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200 p-4 bg-slate-50/40">
              <button
                type="button"
                className="relative shrink-0 cursor-pointer self-center sm:self-start"
                onClick={() => { photoTarget.current = m.id; photoInput.current?.click(); }}
                aria-label="تغيير الصورة"
              >
                <Avatar member={m} size="w-20 h-20" />
                <span className="absolute inset-0 rounded-2xl bg-black/40 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  {uploading === `photo-${m.id}` ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                </span>
              </button>
              <div className="flex-1 grid gap-2.5 min-w-0">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <input className={inputClass} placeholder="الاسم الكامل" value={m.name} onChange={(e) => updateMember(m.id, { name: e.target.value })} />
                  <input className={inputClass} placeholder="المسمى الوظيفي" value={m.role} onChange={(e) => updateMember(m.id, { role: e.target.value })} />
                  <input className={inputClass} placeholder="القسم / التخصص" value={m.department || ''} onChange={(e) => updateMember(m.id, { department: e.target.value })} />
                  <input className={inputClass} placeholder="سنوات الخبرة (مثال: خبرة 15 عاماً)" value={m.experience || ''} onChange={(e) => updateMember(m.id, { experience: e.target.value })} />
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <input className={inputClass} placeholder="رقم الهاتف / واتساب" value={m.phone || ''} onChange={(e) => updateMember(m.id, { phone: e.target.value })} />
                  <input className={inputClass} placeholder="البريد الإلكتروني" value={m.email || ''} onChange={(e) => updateMember(m.id, { email: e.target.value })} />
                </div>
                <textarea className={inputClass} rows={2} placeholder="نبذة تفصيلية عن الخبرات والمسؤوليات" value={m.bio} onChange={(e) => updateMember(m.id, { bio: e.target.value })} />
              </div>
              <button type="button" className={iconBtn + ' !text-rose-600 self-end sm:self-start'} onClick={() => setDraft((d) => ({ ...d, team: { ...d.team, members: d.team.members.filter((x) => x.id !== m.id) } }))} aria-label="حذف العضو"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setDraft((d) => ({ ...d, team: { ...d.team, members: [...d.team.members, { id: newId(), name: '', role: '', bio: '', photo: '', department: '', experience: '', phone: '', email: '', status: 'متواجد' }] } }))}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-700 text-emerald-800 hover:bg-emerald-50 text-sm font-black px-4 py-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> إضافة عضو فريق جديد
        </button>
      </div>

      {/* عن صرح الزهراء للأدوية والأسمدة والبذور */}
      <div className={`${cardClass} p-5`}>
        <h3 className={sectionTitle}>عن صرح الزهراء للأدوية والأسمدة والبذور</h3>
        <div className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              className={inputClass}
              placeholder="عنوان قسم عن الموقع"
              value={draft.about?.title || ''}
              onChange={(e) => setDraft((d) => ({ ...d, about: { ...(d.about || DEFAULT_HOME_CONTENT.about!), title: e.target.value } }))}
            />
            <input
              className={inputClass}
              placeholder="عنوان فرعي تعريفي"
              value={draft.about?.subtitle || ''}
              onChange={(e) => setDraft((d) => ({ ...d, about: { ...(d.about || DEFAULT_HOME_CONTENT.about!), subtitle: e.target.value } }))}
            />
          </div>
          <textarea
            className={inputClass}
            rows={4}
            placeholder="قصة ونبذة صرح الزهراء وتاريخه في توفير الأدوية والأسمدة والتقاوي"
            value={draft.about?.story || ''}
            onChange={(e) => setDraft((d) => ({ ...d, about: { ...(d.about || DEFAULT_HOME_CONTENT.about!), story: e.target.value } }))}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">الرؤية المستقبلية:</label>
              <textarea
                className={inputClass}
                rows={3}
                placeholder="رؤية المنظومة والصيدلية الزراعية"
                value={draft.about?.vision || ''}
                onChange={(e) => setDraft((d) => ({ ...d, about: { ...(d.about || DEFAULT_HOME_CONTENT.about!), vision: e.target.value } }))}
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">الرسالة الزراعية والدوائية:</label>
              <textarea
                className={inputClass}
                rows={3}
                placeholder="رسالة المنظومة والخدمة الزراعية"
                value={draft.about?.mission || ''}
                onChange={(e) => setDraft((d) => ({ ...d, about: { ...(d.about || DEFAULT_HOME_CONTENT.about!), mission: e.target.value } }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-slate-700 block mb-1">نص وثيقة الضمان والجودة:</label>
            <textarea
              className={inputClass}
              rows={2}
              placeholder="تفاصيل وثيقة الضمان ومطابقة الأصناف"
              value={draft.about?.guaranteeText || ''}
              onChange={(e) => setDraft((d) => ({ ...d, about: { ...(d.about || DEFAULT_HOME_CONTENT.about!), guaranteeText: e.target.value } }))}
            />
          </div>
        </div>
      </div>

      {/* الرؤية القديمة / نقاط التميز */}
      <div className={`${cardClass} p-5`}>
        <h3 className={sectionTitle}>نقاط التميز والأهداف</h3>
        <div className="grid gap-3">
          <input className={inputClass} placeholder="عنوان القسم" value={draft.vision.title} onChange={(e) => setDraft((d) => ({ ...d, vision: { ...d.vision, title: e.target.value } }))} />
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


/* ------------------------------ Wrapper (tab body) ------------------------------ */

/**
 * محرر محتوى الصفحة الرئيسية. يُعرض داخل صفحة البروفايل للمدير العام فقط
 * (الحماية الفعلية في قاعدة البيانات عبر سياسات RLS).
 */
export const HomeContentEditor: React.FC = () => {
  const [saved, setSaved] = useState<HomeContent>(DEFAULT_HOME_CONTENT);
  const [draft, setDraft] = useState<HomeContent>(DEFAULT_HOME_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const savedRef = useRef(saved);
  const draftRef = useRef(draft);
  savedRef.current = saved;
  draftRef.current = draft;

  useEffect(() => {
    let alive = true;
    loadHomeContent()
      .then((c) => {
        if (!alive) return;
        setSaved(c);
        setDraft(structuredClone(c));
      })
      .catch((e) => alive && setError(e?.message || 'تعذر تحميل المحتوى الحالي'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
      // عند إغلاق النافذة: حذف الصور المرفوعة ولم تُحفظ حتى لا تتراكم في التخزين
      const keep = collectImageUrls(savedRef.current);
      void deleteHomeImages(collectImageUrls(draftRef.current).filter((u) => !keep.includes(u)));
    };
  }, []);

  const onDraft: React.Dispatch<React.SetStateAction<HomeContent>> = (v) => {
    setDone(false);
    setDraft(v);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setDone(false);
    try {
      const cleaned: HomeContent = {
        hero: draft.hero || DEFAULT_HOME_CONTENT.hero,
        slides: draft.slides,
        team: {
          ...draft.team,
          members: draft.team.members.filter((m) => m.name.trim() || m.role.trim() || m.bio.trim() || m.photo),
        },
        vision: { ...draft.vision, points: draft.vision.points.map((p) => p.trim()).filter(Boolean) },
        about: draft.about || DEFAULT_HOME_CONTENT.about,
      };
      await saveHomeContent(cleaned);
      const stillUsed = collectImageUrls(cleaned);
      void deleteHomeImages(collectImageUrls(saved).filter((u) => !stillUsed.includes(u)));
      setSaved(cleaned);
      setDraft(structuredClone(cleaned));
      setDone(true);
      notifyHomeContentUpdated();
    } catch (e: any) {
      setError(e?.message || 'فشل حفظ التعديلات');
    } finally {
      setSaving(false);
    }
  };

  const revert = () => {
    const keep = collectImageUrls(saved);
    void deleteHomeImages(collectImageUrls(draft).filter((u) => !keep.includes(u)));
    setDraft(structuredClone(saved));
    setError('');
    setDone(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-slate-500 font-bold">
        <Loader2 className="w-5 h-5 animate-spin" /> جارٍ التحميل...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-slate-600">
        تحكم في سلايدر الصور وقسم الفريق ورؤية الموقع اللي بتظهر في الصفحة الرئيسية. التعديل متاح للمدير العام فقط.
      </p>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-300 bg-rose-50 text-rose-800 text-sm font-bold p-3">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {done && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-sm font-bold p-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> تم حفظ التعديلات وظهرت في الصفحة الرئيسية
        </div>
      )}

      <HomeEditorFields draft={draft} setDraft={onDraft} onError={setError} />

      <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-3 bg-white/95 backdrop-blur py-3 border-t border-slate-200">
        <button type="button" onClick={revert} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm font-black px-4 py-2 disabled:opacity-50 cursor-pointer">
          <RotateCcw className="w-4 h-4" /> تراجع عن التغييرات
        </button>
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-black px-5 py-2 disabled:opacity-50 cursor-pointer">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
        </button>
      </div>
    </div>
  );
};
