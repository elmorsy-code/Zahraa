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

export const PRESET_SHADES: Record<ThemePalette, Record<string, string>> = {
  botanical: {
    '50': '#ecfdf5',
    '100': '#d1fae5',
    '200': '#a7f3d0',
    '300': '#6ee7b7',
    '400': '#34d399',
    '500': '#10b981',
    '600': '#059669',
    '700': '#047857',
    '800': '#065f46',
    '900': '#064e3b',
    '950': '#022c22',
  },
  executive: {
    '50': '#eff6ff',
    '100': '#dbeafe',
    '200': '#bfdbfe',
    '300': '#93c5fd',
    '400': '#60a5fa',
    '500': '#3b82f6',
    '600': '#2563eb',
    '700': '#1d4ed8',
    '800': '#1e40af',
    '900': '#1e3a8a',
    '950': '#172554',
  },
  sapphire: {
    '50': '#f0f7ff',
    '100': '#e0effe',
    '200': '#b9ddfd',
    '300': '#7cc2fb',
    '400': '#36a3f7',
    '500': '#0c87eb',
    '600': '#026bc7',
    '700': '#0355a1',
    '800': '#074984',
    '900': '#0c3d6e',
    '950': '#082749',
  },
  nordic: {
    '50': '#f0f9ff',
    '100': '#e0f2fe',
    '200': '#bae6fd',
    '300': '#7dd3fc',
    '400': '#38bdf8',
    '500': '#0ea5e9',
    '600': '#0284c7',
    '700': '#0369a1',
    '800': '#075985',
    '900': '#0c4a6e',
    '950': '#082f49',
  },
  obsidian: {
    '50': '#f0fdfa',
    '100': '#ccfbf1',
    '200': '#99f6e4',
    '300': '#5eead4',
    '400': '#2dd4bf',
    '500': '#14b8a6',
    '600': '#0d9488',
    '700': '#0f766e',
    '800': '#115e59',
    '900': '#134e4a',
    '950': '#042f2e',
  },
  amber: {
    '50': '#fffbeb',
    '100': '#fef3c7',
    '200': '#fde68a',
    '300': '#fcd34d',
    '400': '#fbbf24',
    '500': '#f59e0b',
    '600': '#d97706',
    '700': '#b45309',
    '800': '#92400e',
    '900': '#78350f',
    '950': '#451a03',
  },
  crimson: {
    '50': '#fff1f2',
    '100': '#ffe4e6',
    '200': '#fecdd3',
    '300': '#fda4af',
    '400': '#fb7185',
    '500': '#f43f5e',
    '600': '#e11d48',
    '700': '#be123c',
    '800': '#9f1239',
    '900': '#881337',
    '950': '#4c0519',
  },
  amethyst: {
    '50': '#faf5ff',
    '100': '#f3e8ff',
    '200': '#e9d5ff',
    '300': '#d8b4fe',
    '400': '#c084fc',
    '500': '#a855f7',
    '600': '#9333ea',
    '700': '#7e22ce',
    '800': '#6b21a8',
    '900': '#581c87',
    '950': '#3b0764',
  },
  minimal: {
    '50': '#f4f4f5',
    '100': '#e4e4e7',
    '200': '#d4d4d8',
    '300': '#a1a1aa',
    '400': '#71717a',
    '500': '#52525b',
    '600': '#3f3f46',
    '700': '#27272a',
    '800': '#18181b',
    '900': '#09090b',
    '950': '#000000',
  },
  custom: {} as any,
};

// Helper: Convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 5, g: 150, b: 105 }; // fallback emerald
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Helper: Convert RGB to Hex
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// Helper: Blend color with white (tint) or black (shade)
function mixColors(rgb: { r: number; g: number; b: number }, target: { r: number; g: number; b: number }, weight: number): string {
  return rgbToHex(
    rgb.r + (target.r - rgb.r) * weight,
    rgb.g + (target.g - rgb.g) * weight,
    rgb.b + (target.b - rgb.b) * weight
  );
}

// Generate complete 11-step scale (50-950) from any primary color
export function generateShadeScale(primaryHex: string): Record<string, string> {
  const rgb = hexToRgb(primaryHex);
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };

  return {
    '50': mixColors(rgb, white, 0.94),
    '100': mixColors(rgb, white, 0.86),
    '200': mixColors(rgb, white, 0.72),
    '300': mixColors(rgb, white, 0.52),
    '400': mixColors(rgb, white, 0.28),
    '500': mixColors(rgb, white, 0.12),
    '600': primaryHex,
    '700': mixColors(rgb, black, 0.18),
    '800': mixColors(rgb, black, 0.36),
    '900': mixColors(rgb, black, 0.54),
    '950': mixColors(rgb, black, 0.72),
  };
}

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

  // Set Mode attribute and class
  root.setAttribute('data-mode', config.mode);
  if (config.mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

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
      pageBg: '#0b1320',
      cardBg: '#111c2e',
      cardBorder: '#1e2e48',
      textColor: '#f8fafc',
    };
  }

  // Resolve 11-step color scale for primary
  const shades =
    config.palette !== 'custom' && PRESET_SHADES[config.palette]
      ? PRESET_SHADES[config.palette]
      : generateShadeScale(colors.primary);

  // 2. Set Tailwind CSS v4 variables for emerald & green (which power all buttons, badges, rings, active states in the UI)
  Object.entries(shades).forEach(([step, hexVal]) => {
    root.style.setProperty(`--color-emerald-${step}`, hexVal);
    root.style.setProperty(`--color-green-${step}`, hexVal);
  });

  // Apply CSS custom properties
  root.style.setProperty('--theme-primary', shades['600']);
  root.style.setProperty('--theme-accent', shades['500']);
  root.style.setProperty('--theme-accent-hover', shades['700']);
  root.style.setProperty('--theme-badge-bg', shades['50']);
  root.style.setProperty('--theme-badge-text', shades['800']);
  root.style.setProperty('--theme-highlight', shades['400']);

  root.style.setProperty('--theme-dark-bg', colors.darkBg);
  root.style.setProperty('--theme-dark-surface', colors.darkSurface);
  root.style.setProperty('--theme-dark-border', colors.darkBorder);
  root.style.setProperty('--theme-page-bg', colors.pageBg);
  root.style.setProperty('--theme-card-bg', colors.cardBg);
  root.style.setProperty('--theme-card-border', colors.cardBorder);
  root.style.setProperty('--theme-text-color', colors.textColor);

  // 3. Resolve Border Radius
  let radiusVal = '1.25rem';
  if (config.borderRadius === 'rounded_none') radiusVal = '0px';
  else if (config.borderRadius === 'rounded_sm') radiusVal = '0.5rem';
  else if (config.borderRadius === 'rounded_md') radiusVal = '0.875rem';
  else if (config.borderRadius === 'rounded_lg') radiusVal = '1.25rem';
  root.style.setProperty('--theme-border-radius', radiusVal);

  // 4. Resolve Font
  let resolvedFontFamily: string;

  if (config.font === 'custom' && config.customFont) {
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

  // 5. Injects an authoritative style tag that guarantees dynamic styles across all Tailwind CSS v4 components
  let dynStyle = document.getElementById('theme-dynamic-engine') as HTMLStyleElement | null;
  if (!dynStyle) {
    dynStyle = document.createElement('style');
    dynStyle.id = 'theme-dynamic-engine';
    document.head.appendChild(dynStyle);
  }

  dynStyle.innerHTML = `
    :root, html, body {
      --color-emerald-50: ${shades['50']} !important;
      --color-emerald-100: ${shades['100']} !important;
      --color-emerald-200: ${shades['200']} !important;
      --color-emerald-300: ${shades['300']} !important;
      --color-emerald-400: ${shades['400']} !important;
      --color-emerald-500: ${shades['500']} !important;
      --color-emerald-600: ${shades['600']} !important;
      --color-emerald-700: ${shades['700']} !important;
      --color-emerald-800: ${shades['800']} !important;
      --color-emerald-900: ${shades['900']} !important;
      --color-emerald-950: ${shades['950']} !important;

      --color-green-50: ${shades['50']} !important;
      --color-green-100: ${shades['100']} !important;
      --color-green-200: ${shades['200']} !important;
      --color-green-300: ${shades['300']} !important;
      --color-green-400: ${shades['400']} !important;
      --color-green-500: ${shades['500']} !important;
      --color-green-600: ${shades['600']} !important;
      --color-green-700: ${shades['700']} !important;
      --color-green-800: ${shades['800']} !important;
      --color-green-900: ${shades['900']} !important;
      --color-green-950: ${shades['950']} !important;

      --theme-primary: ${shades['600']} !important;
      --theme-accent: ${shades['500']} !important;
      --theme-accent-hover: ${shades['700']} !important;
      --theme-badge-bg: ${shades['50']} !important;
      --theme-badge-text: ${shades['800']} !important;
      --theme-highlight: ${shades['400']} !important;
      --theme-page-bg: ${colors.pageBg} !important;
      --theme-card-bg: ${colors.cardBg} !important;
      --theme-card-border: ${colors.cardBorder} !important;
      --theme-text-color: ${colors.textColor} !important;
    }

    header.app-header, html.dark header.app-header, html[data-mode="dark"] header.app-header {
      background-color: #ffffff !important;
      border-color: #e2e8f0 !important;
    }

    body {
      background-color: var(--theme-page-bg, #f8fafc) !important;
      color: var(--theme-text-color, #0f172a) !important;
    }

    ${
      config.mode === 'dark'
        ? `
    html.dark, html[data-mode="dark"] {
      color-scheme: dark;
    }
    html.dark body, html[data-mode="dark"] body {
      background-color: ${colors.pageBg} !important;
      color: ${colors.textColor} !important;
    }
    html.dark .card-box, html[data-mode="dark"] .card-box {
      background-color: ${colors.cardBg} !important;
      border-color: ${colors.cardBorder} !important;
    }
    `
        : ''
    }
  `;

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
