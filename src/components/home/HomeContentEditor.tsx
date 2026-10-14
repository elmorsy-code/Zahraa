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
        slides: draft.slides,
        team: {
          ...draft.team,
          members: draft.team.members.filter((m) => m.name.trim() || m.role.trim() || m.bio.trim() || m.photo),
        },
        vision: { ...draft.vision, points: draft.vision.points.map((p) => p.trim()).filter(Boolean) },
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
