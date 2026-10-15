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
  subtitle?: string;
  tag?: string;
  link?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo: string;
  department?: string;
  experience?: string;
  phone?: string;
  email?: string;
  status?: string;
}

export interface AboutStat {
  label: string;
  value: string;
  detail?: string;
}

export interface AboutPillar {
  title: string;
  description: string;
  badge?: string;
}

export interface AboutContent {
  title: string;
  subtitle: string;
  story: string;
  stats: AboutStat[];
  pillars: AboutPillar[];
  mission: string;
  vision: string;
  guaranteeText: string;
}

export interface HeroMetric {
  value: string;
  label: string;
  sub?: string;
}

export interface HeroContent {
  seasonBadge: string;
  seasonNotice: string;
  tagline: string;
  title: string;
  highlightText: string;
  description: string;
  primaryCtaText: string;
  secondaryCtaText: string;
  contactPhone: string;
  contactWhatsApp: string;
  features: string[];
  metrics: HeroMetric[];
}

export interface HomeContent {
  hero?: HeroContent;
  slides: HomeSlide[];
  team: { title: string; subtitle: string; members: TeamMember[] };
  vision: { title: string; text: string; points: string[] };
  about?: AboutContent;
}

const SETTINGS_KEY = 'home_content';
const BUCKET = 'product-images';

export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const CURATED_DEFAULT_SLIDES: HomeSlide[] = [
  {
    id: 'slide-1',
    url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1920&q=80',
    caption: 'صرح الزهراء للأدوية والمبيدات الزراعية المعتمدة',
    subtitle: 'أقوى المبيدات الحشرية والفطرية والنيماتودية المرخصة رسمياً لحماية تامة لمحصولك الزراعي',
    tag: 'مبيدات زراعية مسجلة 100%',
  },
  {
    id: 'slide-2',
    url: 'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=1920&q=80',
    caption: 'أسمدة ومغذيات ورقية وأرضية فائقة الفاعلية',
    subtitle: 'مركبات NPK، أحماض أمينية، منشطات جذور، وعناصر صغرى وكبرى لمضاعفة إنتاجية الفدان',
    tag: 'أسمدة ومخصبات تخصصية',
  },
  {
    id: 'slide-3',
    url: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1920&q=80',
    caption: 'بذور وتقاوي هجين منتقاة بأعلى نسب إنبات',
    subtitle: 'بذور خضار ومحاصيل حقلية هجين معتمدة ومقاومة للأمراض والفيروسات والإجهادات المناخية',
    tag: 'بذور وتقاوي هجين معتمدة',
  },
  {
    id: 'slide-4',
    url: 'https://images.unsplash.com/photo-1592417817098-8f3d69109853?auto=format&fit=crop&w=1920&q=80',
    caption: 'استشارات صيدلانية زراعية وروشتات علاجية مجانية',
    subtitle: 'فريق متخصص من خبراء وقاية النبات وتغذية المزروعات لتشخيص الآفات ووضع برامج التسميد والمكافحة',
    tag: 'إشراف واستشارات زراعية',
  },
];

export const CURATED_DEFAULT_TEAM: TeamMember[] = [
  {
    id: 'team-1',
    name: 'م. أحمد الزهراء',
    role: 'المدير العام واستشاري تغذية النبات',
    department: 'الإدارة العليا والاستشارات',
    experience: 'خبرة 18 عاماً',
    bio: 'خبير واستشاري تغذية المحاصيل وبرامج التسميد الحديث، خبير معتمد في كفاءة امتصاص العناصر الكبرى والصغرى.',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    phone: '+20 100 234 5678',
    email: 'ahmed@al-zahraa.space',
    status: 'متواجد',
  },
  {
    id: 'team-2',
    name: 'د. محمود الشريف',
    role: 'رئيس قسم وقاية النبات والمكافحة',
    department: 'الأدوية والمبيدات الزراعية',
    experience: 'خبرة 14 عاماً',
    bio: 'دكتوراه في أمراض النبات والمبيدات، متخصص في وضع برامج المكافحة المتكاملة (IPM) للآفات الحشرية والفطرية والنيماتودا.',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    phone: '+20 101 345 6789',
    email: 'm.elsharif@al-zahraa.space',
    status: 'متواجد',
  },
  {
    id: 'team-3',
    name: 'م. ياسمين النجار',
    role: 'أخصائية التقاوي وبذور الخضر والفاكهة',
    department: 'البذور والتقاوي الهجين',
    experience: 'خبرة 10 أعوام',
    bio: 'مهندسة زراعية متخصصة في أصناف البذور الهجين واختبارات حيوية الإنبات ومقاومة الأمراض الوراثية.',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    phone: '+20 102 456 7890',
    email: 'yasmin@al-zahraa.space',
    status: 'متواجدة',
  },
  {
    id: 'team-4',
    name: 'أ. طارق عبد الرحمن',
    role: 'مدير العمليات وسلاسل التوريد والتوزيع',
    department: 'التوزيع والشحن الزراعي',
    experience: 'خبرة 12 عاماً',
    bio: 'مسؤول عن تأمين وتوزيع الأدوية والأسمدة لكبرى المزارع والجمعيات والموزعين بكافة محافظات مصر.',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    phone: '+20 103 567 8901',
    email: 'tarek@al-zahraa.space',
    status: 'متواجد',
  },
];

export const CURATED_DEFAULT_ABOUT: AboutContent = {
  title: 'عن صرح الزهراء للأدوية والأسمدة والبذور',
  subtitle: 'الريادة الموثوقة في تزويد القطاع الزراعي بأجود المستلزمات والحلول العلاجية منذ أكثر من 18 عاماً',
  story:
    'انطلق صرح الزهراء للحلول والمستلزمات الزراعية برؤية واضحة تهدف إلى إرساء معايير جديدة وموثوقة لحماية المحاصيل الزراعية؛ عبر توفير أحدث الأدوية والمبيدات الزراعية المسجلة والمرخصة رسمياً من وزارة الزراعة، وأجود مركبات الأسمدة المتخصصة والمخصبات الحيوية، وأفضل سلالات البذور والتقاوي الهجين عالية الإنتاجية. نقدم خدماتنا لأصحاب المزارع والمشروعات الاستثمارية ومحلات المستلزمات الزراعية مع إشراف هندسي وعلاجي متخصص يضمن أعلى معدلات الأمان والربحية للمزارع.',
  stats: [
    { label: 'سنة خبرة دوائية وزراعية', value: '+18', detail: 'ريادة موثوقة في السوق الزراعي' },
    { label: 'صنف دواء وسماد وبذرة مسجلة', value: '+2,500', detail: 'أصناف معتمدة ومسجلة رسمياً' },
    { label: 'مزرعة وعميل وشريك نجاح', value: '+4,800', detail: 'مزارع كبرى وموزعون في كل المحافظات' },
    { label: 'ضمان أصالة وجودة المنتجات', value: '100%', detail: 'منتجات أصلية معتمدة بفواتير رسمية' },
  ],
  pillars: [
    {
      title: 'أدوية ومبيدات زراعية مرخصة',
      description: 'نوفر باقة شاملة من المبيدات الحشرية، الفطرية، العناكب، الحشائش، والنيماتودا المسجلة من وزارة الزراعة لضمان أفضل مكافحة بأعلى أمان.',
      badge: 'أمان وموثوقية',
    },
    {
      title: 'أسمدة ومخصبات تخصصية متطورة',
      description: 'أسمدة مركبة NPK، عناصر صغرى وكبرى مخلبية، أحماض أمينية، وهيوميك وفولفيك عالي النقاوة لدعم النمو الخضري والجذري والتزهير.',
      badge: 'إنتاجية مضاعفة',
    },
    {
      title: 'بذور وتقاوي هجين معتمدة',
      description: 'أجود أصناف التقاوي الهجين لمحاصيل الخضر والحقول المنتقاة بعناية لضمان أعلى نسب إنبات ومقاومة قوية للأمراض.',
      badge: 'إنبات 98%+',
    },
    {
      title: 'استشارات وروشتات زراعية مجانية',
      description: 'فريق هندسي متخصص لتشخيص الآفات والأمراض النباتية وكتابة الروشتة العلاجية وبرنامج التسميد الأنسب لمزرعتك.',
      badge: 'دعم فني مجاني',
    },
  ],
  mission:
    'تمكين المزارعين وأصحاب المشروعات الزراعية من حماية محاصيلهم وتحقيق أعلى عائد اقتصادي من خلال تزويدهم بأفضل الأدوية والأسمدة والبذور الأصلية المدعومة بالمعرفة العلمية والاستشارات التطبيقية.',
  vision:
    'أن نكون الصرح والصيدلية الزراعية الرائدة والأكثر ثقة في الشرق الأوسط في توفير مستلزمات الإنتاج الزراعي المتطورة والمستدامة.',
  guaranteeText:
    'نضمن لجميع عملائنا أصالة جميع المنتجات والأدوية والأسمدة والبذور بنسبة 100%، وخضوعها لمعايير الجودة والتراخيص الرسمية، مع توفير الفواتير النظامية والاستشارات العلاجية المستمرة.',
};

export const CURATED_DEFAULT_HERO: HeroContent = {
  seasonBadge: 'الموسم الزراعي الحالي',
  seasonNotice: 'عروض الموسم: مبيدات معتمدة، أسمدة مركبة NPK، وبذور هجين عالية الإنتاجية — متوفر الشحن والتوريد لجميع المحافظات',
  tagline: 'صرح الزهراء للأدوية والأسمدة والبذور الزراعية',
  title: 'صيدليتك الزراعية المعتمدة لحماية المحاصيل ومضاعفة الإنتاج',
  highlightText: 'أقوى المبيدات والأسمدة التخصصية والتقاوي الهجين',
  description:
    'أكثر من 18 عاماً من الخبرة والريادة في توفير الأدوية الزراعية المرخصة، الأسمدة التخصصية، والمخصبات، والتقاوي الهجين، مع برامج مكافحة وتسميد متكاملة بإشراف نخبة من كبار المهندسين والخبراء الزراعيين.',
  primaryCtaText: 'استعراض الأدوية والأسمدة والبذور',
  secondaryCtaText: 'سجل الفواتير والمبيعات',
  contactPhone: '+20 100 234 5678',
  contactWhatsApp: '201002345678',
  features: [
    'أدوية ومبيدات زراعية مرخصة رسمياً ومضمونة 100%',
    'أسمدة تخصصية (NPK، أحماض، عناصر صغرى مخلبية)',
    'بذور وتقاوي هجين معتمدة بأعلى نسب إنبات',
    'روشتات وبرامج تسميد ومكافحة مجانية مع كل طلب',
  ],
  metrics: [
    { value: '+2,500', label: 'دواء وسماد وبذرة مسجلة', sub: 'منتجات أصلية معتمدة' },
    { value: '18+', label: 'عاماً من الخبرة الصيدلانية الزراعية', sub: 'استشارات وتشخيص آفات' },
    { value: '99.8%', label: 'نسبة نجاح برامج المكافحة', sub: 'بأحدث المركبات المرخصة' },
    { value: '100%', label: 'ضمان أصالة وتراخيص رسمية', sub: 'فواتير وضمان استرجاع' },
  ],
};

export const DEFAULT_HOME_CONTENT: HomeContent = {
  hero: CURATED_DEFAULT_HERO,
  slides: CURATED_DEFAULT_SLIDES,
  team: {
    title: 'فريق العمل والخبراء الزراعيين',
    subtitle: 'نخبة متخصصة من مهندسي وقاية النبات وتغذية المزروعات وخبراء التقاوي والأسمدة',
    members: CURATED_DEFAULT_TEAM,
  },
  vision: {
    title: 'رؤية الموقع',
    text: CURATED_DEFAULT_ABOUT.story,
    points: [
      'توفير أدوية ومبيدات زراعية مسجلة ومطابقة للمواصفات بنسبة 100%',
      'تقديم استشارات صيدلانية زراعية وبرامج تسميد ومكافحة دورية مجانية للمزارع',
      'توفير أجود سلالات التقاوي والبذور الهجين ذات الإنبات العالي والمقاومة للأمراض',
      'شحن وتوزيع مباشر وسريع للأسمدة والمستلزمات لكافة محافظات الجمهورية',
    ],
  },
  about: CURATED_DEFAULT_ABOUT,
};

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);

/** تنظيف أي بيانات قادمة من القاعدة حتى لا ينكسر العرض لو الشكل ناقص. */
export function normalizeHomeContent(raw: any): HomeContent {
  const d = DEFAULT_HOME_CONTENT;
  if (!raw || typeof raw !== 'object') return structuredClone(d);

  const hasLegacyNursery = (strVal?: string) =>
    typeof strVal === 'string' &&
    (strVal.includes('مشتل') || strVal.includes('شتل') || strVal.includes('لاندسكيب') || strVal.includes('فسائل'));

  // Hero section normalization
  const rawHero = raw.hero && typeof raw.hero === 'object' ? raw.hero : null;
  const isLegacyHero = rawHero && (hasLegacyNursery(rawHero.title) || hasLegacyNursery(rawHero.tagline) || hasLegacyNursery(rawHero.seasonNotice));
  const heroSource = isLegacyHero || !rawHero ? d.hero! : rawHero;

  const hero: HeroContent = {
    seasonBadge: str(heroSource.seasonBadge, d.hero!.seasonBadge),
    seasonNotice: str(heroSource.seasonNotice, d.hero!.seasonNotice),
    tagline: str(heroSource.tagline, d.hero!.tagline),
    title: str(heroSource.title, d.hero!.title),
    highlightText: str(heroSource.highlightText, d.hero!.highlightText),
    description: str(heroSource.description, d.hero!.description),
    primaryCtaText: str(heroSource.primaryCtaText, d.hero!.primaryCtaText),
    secondaryCtaText: str(heroSource.secondaryCtaText, d.hero!.secondaryCtaText),
    contactPhone: str(heroSource.contactPhone, d.hero!.contactPhone),
    contactWhatsApp: str(heroSource.contactWhatsApp, d.hero!.contactWhatsApp),
    features:
      Array.isArray(heroSource.features) && heroSource.features.length > 0 && !heroSource.features.some((f: any) => hasLegacyNursery(f))
        ? heroSource.features.map((f: any) => str(f)).filter(Boolean)
        : d.hero!.features,
    metrics:
      Array.isArray(heroSource.metrics) && heroSource.metrics.length > 0 && !heroSource.metrics.some((m: any) => hasLegacyNursery(m.label))
        ? heroSource.metrics.map((m: any) => ({
            value: str(m.value),
            label: str(m.label),
            sub: str(m.sub),
          }))
        : d.hero!.metrics,
  };

  // إذا كانت السلايدات مصفوفة غير فارغة وخالية من آثار المشتل القديم نستخدمها، وإلا نستخدم السلايدات الافتراضية
  const userSlides = (Array.isArray(raw.slides) ? raw.slides : [])
    .filter((s: any) => s && typeof s.url === 'string' && s.url && !hasLegacyNursery(s.caption) && !hasLegacyNursery(s.subtitle))
    .map((s: any) => ({
      id: str(s.id) || newId(),
      url: s.url,
      caption: str(s.caption),
      subtitle: str(s.subtitle),
      tag: str(s.tag),
      link: str(s.link),
    }));

  const userMembers = (Array.isArray(raw.team?.members) ? raw.team.members : [])
    .filter((m: any) => m && typeof m === 'object' && (m.name || m.role || m.photo) && !hasLegacyNursery(m.role) && !hasLegacyNursery(m.bio))
    .map((m: any) => ({
      id: str(m.id) || newId(),
      name: str(m.name),
      role: str(m.role),
      bio: str(m.bio),
      photo: str(m.photo),
      department: str(m.department),
      experience: str(m.experience),
      phone: str(m.phone),
      email: str(m.email),
      status: str(m.status),
    }));

  const rawAbout = raw.about && typeof raw.about === 'object' ? raw.about : null;
  const isLegacyAbout = rawAbout && (hasLegacyNursery(rawAbout.title) || hasLegacyNursery(rawAbout.story));
  const aboutSource = isLegacyAbout || !rawAbout ? d.about! : rawAbout;

  const about: AboutContent = {
    title: str(aboutSource.title, d.about!.title),
    subtitle: str(aboutSource.subtitle, d.about!.subtitle),
    story: str(aboutSource.story, d.about!.story),
    stats: Array.isArray(aboutSource.stats) && aboutSource.stats.length > 0 && !aboutSource.stats.some((s: any) => hasLegacyNursery(s.label))
      ? aboutSource.stats.map((st: any) => ({
          label: str(st.label),
          value: str(st.value),
          detail: str(st.detail),
        }))
      : d.about!.stats,
    pillars: Array.isArray(aboutSource.pillars) && aboutSource.pillars.length > 0
      ? aboutSource.pillars.map((pl: any) => ({
          title: str(pl.title),
          description: str(pl.description),
          badge: str(pl.badge),
        }))
      : d.about!.pillars,
    mission: str(aboutSource.mission, d.about!.mission),
    vision: str(aboutSource.vision, d.about!.vision),
    guaranteeText: str(aboutSource.guaranteeText, d.about!.guaranteeText),
  };

  return {
    hero,
    slides: userSlides.length > 0 ? userSlides : d.slides,
    team: {
      title: str(raw.team?.title, d.team.title),
      subtitle: str(raw.team?.subtitle, d.team.subtitle),
      members: userMembers.length > 0 ? userMembers : d.team.members,
    },
    vision: {
      title: str(raw.vision?.title, d.vision.title),
      text: str(raw.vision?.text, d.vision.text),
      points: (Array.isArray(raw.vision?.points) && raw.vision.points.length > 0 && !raw.vision.points.some((p: any) => hasLegacyNursery(p))
        ? raw.vision.points
        : d.vision.points
      ).filter((p: unknown) => typeof p === 'string'),
    },
    about,
  };
}

export async function loadHomeContent(): Promise<HomeContent> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return structuredClone(DEFAULT_HOME_CONTENT);
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();
    if (error || !data?.value) return structuredClone(DEFAULT_HOME_CONTENT);
    return normalizeHomeContent(data.value);
  } catch (err) {
    console.warn('loadHomeContent fallback to default:', err);
    return structuredClone(DEFAULT_HOME_CONTENT);
  }
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

/** إشعار الصفحة الرئيسية بأن المحتوى اتعدّل (بعد الحفظ من صفحة البروفايل). */
export const HOME_CONTENT_EVENT = 'home-content-updated';
export const notifyHomeContentUpdated = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(HOME_CONTENT_EVENT));
};
