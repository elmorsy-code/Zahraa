import { getSupabaseClient } from './supabase';

/**
 * محتوى الصفحة الرئيسية (سلايدر الصور + الفريق + رؤية الموقع).
 *
 * التخزين:
 *  - النص والترتيب: جدول app_settings تحت المفتاح 'home_content'
 *    (القراءة لكل الأدوار، والكتابة للمدير العام فقط عبر سياسات RLS الموجودة).
 *  - الصور: bucket اسمه product-images داخل مجلد home/
 *    (القراءة عامة، والرفع والتعديل والحذف للمدير العام فقط عبر سياسات storage الموجودة).
 */

export interface HomeSlide {
  id: string;
  url: string;
  caption: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo: string;
}

export interface HomeContent {
  slides: HomeSlide[];
  team: { title: string; subtitle: string; members: TeamMember[] };
  vision: { title: string; text: string; points: string[] };
}

const SETTINGS_KEY = 'home_content';
const BUCKET = 'product-images';

export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const DEFAULT_HOME_CONTENT: HomeContent = {
  slides: [],
  team: { title: 'فريقنا', subtitle: 'الأشخاص الذين يقفون وراء الزهراء', members: [] },
  vision: { title: 'رؤية الموقع', text: '', points: [] },
};

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);

/** تنظيف أي بيانات قادمة من القاعدة حتى لا ينكسر العرض لو الشكل ناقص. */
export function normalizeHomeContent(raw: any): HomeContent {
  const d = DEFAULT_HOME_CONTENT;
  if (!raw || typeof raw !== 'object') return structuredClone(d);
  return {
    slides: (Array.isArray(raw.slides) ? raw.slides : [])
      .filter((s: any) => s && typeof s.url === 'string' && s.url)
      .map((s: any) => ({ id: str(s.id) || newId(), url: s.url, caption: str(s.caption) })),
    team: {
      title: str(raw.team?.title, d.team.title),
      subtitle: str(raw.team?.subtitle, d.team.subtitle),
      members: (Array.isArray(raw.team?.members) ? raw.team.members : [])
        .filter((m: any) => m && typeof m === 'object')
        .map((m: any) => ({
          id: str(m.id) || newId(),
          name: str(m.name),
          role: str(m.role),
          bio: str(m.bio),
          photo: str(m.photo),
        })),
    },
    vision: {
      title: str(raw.vision?.title, d.vision.title),
      text: str(raw.vision?.text),
      points: (Array.isArray(raw.vision?.points) ? raw.vision.points : []).filter(
        (p: unknown) => typeof p === 'string'
      ),
    },
  };
}

export async function loadHomeContent(): Promise<HomeContent> {
  const supabase = getSupabaseClient();
  if (!supabase) return structuredClone(DEFAULT_HOME_CONTENT);
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return normalizeHomeContent(data?.value);
}

export async function saveHomeContent(content: HomeContent): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('الاتصال بقاعدة البيانات غير متوفر');
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: SETTINGS_KEY, value: content, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

async function compressImage(file: File, maxSide: number, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('تعذر معالجة الصورة');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('تعذر ضغط الصورة'))), 'image/jpeg', quality)
  );
}

/** يضغط الصورة ويرفعها ويرجع الرابط العام. */
export async function uploadHomeImage(file: File, maxSide = 1600): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('الملف المختار ليس صورة');
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('الاتصال بقاعدة البيانات غير متوفر');
  const blob = await compressImage(file, maxSide);
  const path = `home/${newId()}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** حذف صور لم تعد مستخدمة (محاولة بدون إيقاف العملية لو فشلت). */
export async function deleteHomeImages(urls: string[]): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase || urls.length === 0) return;
  const marker = `/${BUCKET}/`;
  const paths = urls
    .map((u) => {
      const i = u.indexOf(marker);
      return i >= 0 ? decodeURIComponent(u.slice(i + marker.length).split('?')[0]) : '';
    })
    .filter((p) => p.startsWith('home/'));
  if (paths.length === 0) return;
  try {
    await supabase.storage.from(BUCKET).remove(paths);
  } catch (err) {
    console.warn('تعذر حذف الصور القديمة:', err);
  }
}

export function collectImageUrls(c: HomeContent): string[] {
  return [...c.slides.map((s) => s.url), ...c.team.members.map((m) => m.photo)].filter(Boolean);
}
