export type ThemePalette =
  | 'botanical'
  | 'executive'
  | 'sapphire'
  | 'nordic'
  | 'obsidian'
  | 'amber'
  | 'crimson'
  | 'amethyst'
  | 'minimal'
  | 'custom';

export type BuiltinFont =
  | 'cairo'
  | 'alexandria'
  | 'almarai'
  | 'ibm_plex'
  | 'readex'
  | 'tajawal'
  | 'amiri'
  | 'noto_sans'
  | 'changa'
  | 'el_messiri'
  | 'marhey'
  | 'aref_ruqaa'
  | 'rubik'
  | 'custom';

export type BorderRadiusOption = 'rounded_none' | 'rounded_sm' | 'rounded_md' | 'rounded_lg';
export type SpacingDensity = 'compact' | 'comfortable' | 'spacious';
export type ThemeMode = 'light' | 'dark';

export interface CustomColors {
  primary: string;
  accent: string;
  darkBg: string;
  darkSurface: string;
  darkBorder: string;
  pageBg: string;
  cardBg: string;
  cardBorder: string;
  textColor: string;
}

export interface CustomFontConfig {
  fontName: string;
  fontFamily: string;
  fontUrl?: string;
  fontDataUri?: string;
}

export interface ThemeConfig {
  palette: ThemePalette;
  font: BuiltinFont;
  mode: ThemeMode;
  borderRadius: BorderRadiusOption;
  density: SpacingDensity;
  customColors?: CustomColors;
  customFont?: CustomFontConfig;
}

const THEME_STORAGE_KEY = 'agri_ui_theme_v8_master';

export const DEFAULT_THEME: ThemeConfig = {
  palette: 'botanical',
  font: 'cairo',
  mode: 'light',
  borderRadius: 'rounded_lg',
  density: 'comfortable',
  customColors: {
    primary: '#059669',
    accent: '#10b981',
    darkBg: '#0b1f18',
    darkSurface: '#122f24',
    darkBorder: '#1a4234',
    pageBg: '#f8fafc',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    textColor: '#0f172a',
  },
};

export const PRESET_PALETTES: Array<{
  id: ThemePalette;
  name: string;
  description: string;
  primaryBg: string;
  accentColor: string;
  secondaryColor: string;
  pageBg: string;
  cardBg: string;
  cardBorder: string;
  textColor: string;
}> = [
  {
    id: 'botanical',
    name: 'الزمردي النباتي (Botanical Forest)',
    description: 'أخضر الغابات الصافي وزمردي حيوي — هوية الطبيعة والزراعة والمحاصيل',
    primaryBg: '#0b1f18',
    accentColor: '#059669',
    secondaryColor: '#10b981',
    pageBg: '#f8fafc',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    textColor: '#0f172a',
  },
  {
    id: 'executive',
    name: 'النيلي التنفيذي الملكي (Executive Slate & Royal)',
    description: 'كحلي ناعم وراقٍ مع أزرق ملكي مريح جداً للبصر طوال ساعات العمل',
    primaryBg: '#0f172a',
    accentColor: '#2563eb',
    secondaryColor: '#3b82f6',
    pageBg: '#f8fafc',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    textColor: '#0f172a',
  },
  {
    id: 'sapphire',
    name: 'الأزرق الياقوتي الفخم (Royal Sapphire)',
    description: 'كحلي ليلي عميق مع أزرق ياقوتي ناصع وسماوي يضفي هيبة بصرية للأنظمة',
    primaryBg: '#0b1528',
    accentColor: '#3b82f6',
    secondaryColor: '#60a5fa',
    pageBg: '#f0f5fc',
    cardBg: '#ffffff',
    cardBorder: '#dbeafe',
    textColor: '#0f172a',
  },
  {
    id: 'nordic',
    name: 'الرمادي المعماري الهادئ (Nordic Slate)',
    description: 'درجات الرصاصي الحجري الهادئ مع أزرق قطبي منعش يقلل إجهاد العين تماماً',
    primaryBg: '#181d24',
    accentColor: '#0284c7',
    secondaryColor: '#38bdf8',
    pageBg: '#f8fafc',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    textColor: '#0f172a',
  },
  {
    id: 'obsidian',
    name: 'الفحمي العصري والتيل (Obsidian & Teal)',
    description: 'فحمي داكن أنيق مع تيل زمردي حديث ولمسات ناصعة حيوية',
    primaryBg: '#12151a',
    accentColor: '#0d9488',
    secondaryColor: '#14b8a6',
    pageBg: '#f0fdfa',
    cardBg: '#ffffff',
    cardBorder: '#ccfbf1',
    textColor: '#0f172a',
  },
  {
    id: 'amber',
    name: 'العنبري الذهبي الدافئ (Golden Amber & Earth)',
    description: 'درجات ترابية دافئة مع عنبر ذهبي يوحي بمواسم الحصاد والقمح والخير',
    primaryBg: '#261b0d',
    accentColor: '#d97706',
    secondaryColor: '#f59e0b',
    pageBg: '#fffbeb',
    cardBg: '#ffffff',
    cardBorder: '#fef3c7',
    textColor: '#1c1917',
  },
  {
    id: 'crimson',
    name: 'العنابي الإمبراطوري الفاخر (Imperial Crimson)',
    description: 'نبيتي داكن فخم جداً يعطي طابعاً قيادياً وهيبة استثنائية للإدارة',
    primaryBg: '#210c14',
    accentColor: '#be123c',
    secondaryColor: '#f43f5e',
    pageBg: '#fff1f2',
    cardBg: '#ffffff',
    cardBorder: '#fecdd3',
    textColor: '#1c1917',
  },
  {
    id: 'amethyst',
    name: 'البنفسجي العصري الراقي (Modern Amethyst)',
    description: 'درجات البنفسجي الفاتن والجمشت المعاصر لإطلالة مستقبلية متجددة',
    primaryBg: '#1e112a',
    accentColor: '#7c3aed',
    secondaryColor: '#a855f7',
    pageBg: '#faf5ff',
    cardBg: '#ffffff',
    cardBorder: '#f3e8ff',
    textColor: '#0f172a',
  },
  {
    id: 'minimal',
    name: 'الأبيض الحداثي الصافي (Minimal Monochrome)',
    description: 'تبسيط فائق، تباين ناصع، ورمادي نقي مع أسود داكن بدون بهرجة ألوان',
    primaryBg: '#18181b',
    accentColor: '#27272a',
    secondaryColor: '#71717a',
    pageBg: '#ffffff',
    cardBg: '#ffffff',
    cardBorder: '#e4e4e7',
    textColor: '#18181b',
  },
];

export const BUILTIN_FONTS: Array<{
  id: BuiltinFont;
  name: string;
  arabicName: string;
  description: string;
  fontFamily: string;
  sample: string;
}> = [
  {
    id: 'cairo',
    name: 'Cairo',
    arabicName: 'خط كايرو الفسيح (Cairo)',
    description: 'الأكثر رحابة ووضوحاً؛ فتحات هندسية مفتوحة ومسافات كافية بين الكلمات تمنع أي تلاصق',
    fontFamily: "'Cairo', -apple-system, sans-serif",
    sample: 'مؤسسة الزهراء للأدوية والمبيدات الزراعية 12,345 ج.م',
  },
  {
    id: 'alexandria',
    name: 'Alexandria',
    arabicName: 'خط الإسكندرية (Alexandria)',
    description: 'خط هندسي فسيح وجميل، يتمتع بفتحات متباعدة تعطي راحة استثنائية أثناء القراءة',
    fontFamily: "'Alexandria', -apple-system, sans-serif",
    sample: 'مؤسسة الزهراء للأدوية والمبيدات الزراعية 12,345 ج.م',
  },
  {
    id: 'almarai',
    name: 'Almarai',
    arabicName: 'خط المراعي (Almarai)',
    description: 'خط هادئ ناعم ومتوازن، مستوحى من خط النسخ المعاصر برقة عالية',
    fontFamily: "'Almarai', 'Cairo', sans-serif",
    sample: 'مؤسسة الزهراء للأدوية والمبيدات الزراعية 12,345 ج.م',
  },
  {
    id: 'ibm_plex',
    name: 'IBM Plex Sans Arabic',
    arabicName: 'خط آي بي إم بليكس (IBM Plex Sans Arabic)',
    description: 'خط تقني رسمي وموزون للأنظمة الحسابية والجداول المزدحمة',
    fontFamily: "'IBM Plex Sans Arabic', -apple-system, sans-serif",
    sample: 'مؤسسة الزهراء للأدوية والمبيدات الزراعية 12,345 ج.م',
  },
  {
    id: 'readex',
    name: 'Readex Pro',
    arabicName: 'خط ريديكس برو (Readex Pro)',
    description: 'مصمم خصيصاً للشاشات والأنظمة المحاسبية بأحرف مقروءة بوضوح حتى مع الكثافة العالية',
    fontFamily: "'Readex Pro', -apple-system, sans-serif",
    sample: 'مؤسسة الزهراء للأدوية والمبيدات الزراعية 12,345 ج.م',
  },
  {
    id: 'tajawal',
    name: 'Tajawal',
    arabicName: 'خط تجوال (Tajawal)',
    description: 'خط حديث خفيف وبسيط، بدون تعقيدات بصرية وسريع القراءة',
    fontFamily: "'Tajawal', 'Cairo', sans-serif",
    sample: 'مؤسسة الزهراء للأدوية والمبيدات الزراعية 12,345 ج.م',
  },
  {
    id: 'amiri',
    name: 'Amiri',
    arabicName: 'خط أميري الكلاسيكي (Amiri)',
    description: 'خط نسخ عربي أصيل وعريق مستلهم من مصاحف مطبعة بولاق المصرية التاريخية',
    fontFamily: "'Amiri', 'Cairo', serif",
    sample: 'مؤسسة الزهراء للأدوية والمبيدات الزراعية 12,345 ج.م',
  },
  {
    id: 'noto_sans',
    name: 'Noto Sans Arabic',
    arabicName: 'خط نوتو سانس (Noto Sans Arabic)',
    description: 'خط غوغل العالمي القياسي المتناسق مع جميع المنصات والشاشات',
    fontFamily: "'Noto Sans Arabic', 'Cairo', sans-serif",
    sample: 'مؤسسة الزهراء للأدوية والمبيدات الزراعية 12,345 ج.م',
  },
  {
    id: 'changa',
    name: 'Changa',
    arabicName: 'خط تشانجا العريض (Changa)',
    description: 'خط جريء وعريض وواضح جداً، مثالي لمن يفضلون رؤية الكلمات بحجم بارز',
    fontFamily: "'Changa', 'Cairo', sans-serif",
    sample: 'مؤسسة الزهراء للأدوية والمبيدات الزراعية 12,345 ج.م',
  },
  {
    id: 'el_messiri',
    name: 'El Messiri',
    arabicName: 'خط المسيري الفني (El Messiri)',
    description: 'خط عربي رشيق وأنيق يجمع بين الحداثة واللمسة الفنية الجميلة',
    fontFamily: "'El Messiri', 'Cairo', sans-serif",
    sample: 'مؤسسة الزهراء للأدوية والمبيدات الزراعية 12,345 ج.م',
  },
  {
    id: 'marhey',
    name: 'Marhey',
    arabicName: 'خط مرحي الودود (Marhey)',
    description: 'خط مرح وعصري ودود، يتميز بحروف دائرية مريحة وغير جافة',
    fontFamily: "'Marhey', 'Cairo', cursive",
    sample: 'مؤسسة الزهراء للأدوية والمبيدات الزراعية 12,345 ج.م',
  },
  {
    id: 'aref_ruqaa',
    name: 'Aref Ruqaa',
    arabicName: 'خط عارف رقعة (Aref Ruqaa)',
    description: 'خط رقعة عربي أصيل يمنح الواجهة طابع الخط اليدوي العربي العريق',
    fontFamily: "'Aref Ruqaa', 'Amiri', serif",
    sample: 'مؤسسة الزهراء للأدوية والمبيدات الزراعية 12,345 ج.م',
  },
  {
    id: 'rubik',
    name: 'Rubik Arabic',
    arabicName: 'خط روبيك عربي (Rubik Arabic)',
    description: 'خط ناعم الحواف خفيف الظل يجمع بين الطابع الهندسي والودية',
    fontFamily: "'Rubik', 'Cairo', sans-serif",
    sample: 'مؤسسة الزهراء للأدوية والمبيدات الزراعية 12,345 ج.م',
  },
];

type ThemeListener = (config: ThemeConfig) => void;
const listeners: Set<ThemeListener> = new Set();

export function getThemeConfig(): ThemeConfig {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        palette: parsed.palette || DEFAULT_THEME.palette,
        font: parsed.font || DEFAULT_THEME.font,
        mode: parsed.mode || DEFAULT_THEME.mode,
        borderRadius: parsed.borderRadius || DEFAULT_THEME.borderRadius,
        density: parsed.density || DEFAULT_THEME.density,
        customColors: parsed.customColors || DEFAULT_THEME.customColors,
        customFont: parsed.customFont,
      };
    }
  } catch {
    // fallback
  }
  return DEFAULT_THEME;
}

export function applyThemeConfig(config: ThemeConfig): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Set Palette attribute
  root.setAttribute('data-theme', config.palette);

  // Set Font attribute
  root.setAttribute('data-font', config.font);

  // Set Mode attribute
  root.setAttribute('data-mode', config.mode);

  // Set Radius attribute
  root.setAttribute('data-radius', config.borderRadius);

  // Set Density attribute
  root.setAttribute('data-density', config.density);

  // 1. Resolve Colors
  let colors: CustomColors;

  if (config.palette === 'custom' && config.customColors) {
    colors = config.customColors;
  } else {
    const foundPreset = PRESET_PALETTES.find((p) => p.id === config.palette) || PRESET_PALETTES[0];
    colors = {
      primary: foundPreset.accentColor,
      accent: foundPreset.secondaryColor,
      darkBg: foundPreset.primaryBg,
      darkSurface: foundPreset.primaryBg,
      darkBorder: foundPreset.primaryBg,
      pageBg: foundPreset.pageBg,
      cardBg: foundPreset.cardBg,
      cardBorder: foundPreset.cardBorder,
      textColor: foundPreset.textColor,
    };
  }

  // Handle Dark mode override if active
  if (config.mode === 'dark') {
    colors = {
      ...colors,
      pageBg: '#0f172a',
      cardBg: '#1e293b',
      cardBorder: '#334155',
      textColor: '#f8fafc',
    };
  }

  // Apply CSS custom properties
  root.style.setProperty('--theme-primary', colors.primary);
  root.style.setProperty('--theme-accent', colors.accent);
  root.style.setProperty('--theme-dark-bg', colors.darkBg);
  root.style.setProperty('--theme-dark-surface', colors.darkSurface);
  root.style.setProperty('--theme-dark-border', colors.darkBorder);
  root.style.setProperty('--theme-page-bg', colors.pageBg);
  root.style.setProperty('--theme-card-bg', colors.cardBg);
  root.style.setProperty('--theme-card-border', colors.cardBorder);
  root.style.setProperty('--theme-text-color', colors.textColor);

  // 2. Resolve Border Radius
  let radiusVal = '1.25rem';
  if (config.borderRadius === 'rounded_none') radiusVal = '0px';
  else if (config.borderRadius === 'rounded_sm') radiusVal = '0.5rem';
  else if (config.borderRadius === 'rounded_md') radiusVal = '0.875rem';
  else if (config.borderRadius === 'rounded_lg') radiusVal = '1.25rem';
  root.style.setProperty('--theme-border-radius', radiusVal);

  // 3. Resolve Font
  let resolvedFontFamily: string;

  if (config.font === 'custom' && config.customFont) {
    // If Custom font has a URL (Google Fonts or external stylesheet)
    if (config.customFont.fontUrl) {
      let linkEl = document.getElementById('custom-font-link') as HTMLLinkElement | null;
      if (!linkEl) {
        linkEl = document.createElement('link');
        linkEl.id = 'custom-font-link';
        linkEl.rel = 'stylesheet';
        document.head.appendChild(linkEl);
      }
      linkEl.href = config.customFont.fontUrl;
    }

    // If Custom font has Base64 data URI
    if (config.customFont.fontDataUri) {
      let styleEl = document.getElementById('custom-font-style') as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'custom-font-style';
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = `
        @font-face {
          font-family: '${config.customFont.fontName}';
          src: url('${config.customFont.fontDataUri}') format('woff2');
          font-display: swap;
        }
      `;
    }

    resolvedFontFamily = `'${config.customFont.fontFamily}', 'Cairo', -apple-system, sans-serif`;
  } else {
    const builtin = BUILTIN_FONTS.find((f) => f.id === config.font) || BUILTIN_FONTS[0];
    resolvedFontFamily = builtin.fontFamily;
  }

  root.style.setProperty('--font-sans', resolvedFontFamily);

  // Persist in localStorage
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }

  // Notify listeners
  listeners.forEach((listener) => listener(config));
}

export function subscribeTheme(listener: ThemeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetToDefaultTheme(): void {
  applyThemeConfig(DEFAULT_THEME);
}

export function initTheme(): void {
  const current = getThemeConfig();
  applyThemeConfig(current);
}

// Auto-run on import
if (typeof document !== 'undefined') {
  initTheme();
}
