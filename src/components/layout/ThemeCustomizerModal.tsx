import React, { useState, useRef } from 'react';
import {
  X,
  Palette,
  Type,
  Check,
  Sparkles,
  Sliders,
  Moon,
  Sun,
  Plus,
  Upload,
  Link as LinkIcon,
  RotateCcw,
  Eye,
  CheckCircle2,
  Wand2,
  FolderOpen,
} from 'lucide-react';
import {
  getThemeConfig,
  applyThemeConfig,
  resetToDefaultTheme,
  PRESET_PALETTES,
  BUILTIN_FONTS,
  ThemePalette,
  BuiltinFont,
  ThemeConfig,
  CustomColors,
  CustomFontConfig,
  BorderRadiusOption,
  ThemeMode,
} from '../../lib/themeManager';

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'presets' | 'color_picker' | 'fonts' | 'custom_font' | 'layout'>('presets');
  const [config, setConfig] = useState<ThemeConfig>(getThemeConfig());
  const [themeAppliedMsg, setThemeAppliedMsg] = useState<string | null>(null);

  // Custom Font builder states
  const [customFontName, setCustomFontName] = useState(config.customFont?.fontName || '');
  const [customFontFamily, setCustomFontFamily] = useState(config.customFont?.fontFamily || '');
  const [customFontUrl, setCustomFontUrl] = useState(config.customFont?.fontUrl || '');
  const [customFontDataUri, setCustomFontDataUri] = useState<string | undefined>(config.customFont?.fontDataUri);
  const [fontFileLoading, setFontFileLoading] = useState(false);
  const [fontPreviewText, setFontPreviewText] = useState('مؤسسة الزهراء للأدوية والمبيدات الزراعية — رصيد الخزينة: 45,800 ج.م');
  const [customFontSuccessMsg, setCustomFontSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick Swatches for direct color picker
  const quickColors = [
    '#059669', '#10b981', '#047857', '#0d9488',
    '#2563eb', '#3b82f6', '#1d4ed8', '#0284c7',
    '#7c3aed', '#8b5cf6', '#d97706', '#f59e0b',
    '#be123c', '#e11d48', '#4b5563', '#1e293b',
  ];

  const updateConfig = (newCfg: ThemeConfig, successMsg?: string) => {
    setConfig(newCfg);
    applyThemeConfig(newCfg);
    if (successMsg) {
      setThemeAppliedMsg(successMsg);
      setTimeout(() => setThemeAppliedMsg(null), 3000);
    }
  };

  // 1. Select Preset Palette
  const handleSelectPalette = (palette: ThemePalette) => {
    const updated: ThemeConfig = { ...config, palette };
    const found = PRESET_PALETTES.find((p) => p.id === palette);
    updateConfig(updated, `تم تطبيق سمة "${found?.name || palette}" وتحديث كامل ألوان الموقع بنجاح!`);
  };

  // 2. Select Built-in Font
  const handleSelectFont = (font: BuiltinFont) => {
    const updated: ThemeConfig = { ...config, font };
    const found = BUILTIN_FONTS.find((f) => f.id === font);
    updateConfig(updated, `تم تطبيق خط "${found?.arabicName || font}" بنجاح!`);
  };

  // 3. Update Custom Colors
  const handleCustomColorChange = (key: keyof CustomColors, value: string) => {
    const updatedColors: CustomColors = {
      ...(config.customColors || {
        primary: '#059669',
        accent: '#10b981',
        darkBg: '#0b1f18',
        darkSurface: '#122f24',
        darkBorder: '#1a4234',
        pageBg: '#f8fafc',
        cardBg: '#ffffff',
        cardBorder: '#e2e8f0',
        textColor: '#0f172a',
      }),
      [key]: value,
    };

    const updated: ThemeConfig = {
      ...config,
      palette: 'custom',
      customColors: updatedColors,
    };
    updateConfig(updated, 'تم تحديث اللون وتطبيقه على الموقع فورياً!');
  };

  // 4. Auto-Harmonize Colors from Primary
  const handleAutoHarmonize = (primaryColor: string) => {
    const updatedColors: CustomColors = {
      primary: primaryColor,
      accent: primaryColor,
      darkBg: '#0f172a',
      darkSurface: '#1e293b',
      darkBorder: '#334155',
      pageBg: '#f8fafc',
      cardBg: '#ffffff',
      cardBorder: '#e2e8f0',
      textColor: '#0f172a',
    };

    const updated: ThemeConfig = {
      ...config,
      palette: 'custom',
      customColors: updatedColors,
    };
    updateConfig(updated, 'تم توليد ومواءمة درجات الألوان المتناسقة بنجاح!');
  };

  // 5. Toggle Mode
  const handleToggleMode = (mode: ThemeMode) => {
    const updated: ThemeConfig = { ...config, mode };
    updateConfig(updated, mode === 'dark' ? 'تم تفعيل الوضع الليلي الفخم!' : 'تم تفعيل الوضع النهاري الصافي!');
  };

  // 6. Change Border Radius
  const handleBorderRadiusChange = (borderRadius: BorderRadiusOption) => {
    const updated: ThemeConfig = { ...config, borderRadius };
    updateConfig(updated, 'تم تحديث انحناء حواف البطاقات والأزرار!');
  };

  // 7. Handle Custom Font File Upload
  const handleFontFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFontFileLoading(true);
    const cleanName = file.name.replace(/\.[^/.]+$/, '').trim();
    setCustomFontName(cleanName);
    setCustomFontFamily(cleanName);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result as string;
      setCustomFontDataUri(dataUri);
      setFontFileLoading(false);
      setCustomFontSuccessMsg(`تم تحميل ملف الخط "${file.name}" بنجاح! يمكنك اعتماده الآن.`);
    };
    reader.onerror = () => {
      setFontFileLoading(false);
      alert('تعذر قراءة ملف الخط');
    };
    reader.readAsDataURL(file);
  };

  // 8. Apply Custom Font
  const handleApplyCustomFont = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFontName.trim()) {
      alert('يرجى كتابة اسم الخط');
      return;
    }

    const customFontObj: CustomFontConfig = {
      fontName: customFontName.trim(),
      fontFamily: customFontFamily.trim() || customFontName.trim(),
      fontUrl: customFontUrl.trim() || undefined,
      fontDataUri: customFontDataUri,
    };

    const updated: ThemeConfig = {
      ...config,
      font: 'custom',
      customFont: customFontObj,
    };

    updateConfig(updated);
    setCustomFontSuccessMsg('تم اعتماد وتطبيق خطك المخصص بنجاح على كامل عناصر ومحتويات الموقع!');
  };

  // 9. Reset to default
  const handleReset = () => {
    if (window.confirm('هل تريد استعادة المظهر الافتراضي المعتمد للمنظومة؟')) {
      resetToDefaultTheme();
      setConfig(getThemeConfig());
      setCustomFontSuccessMsg('');
    }
  };

  const getResolvedColors = (): CustomColors => {
    if (config.palette === 'custom' && config.customColors) {
      return config.customColors;
    }
    const found = PRESET_PALETTES.find((p) => p.id === config.palette) || PRESET_PALETTES[0];
    return {
      primary: found.accentColor,
      accent: found.secondaryColor,
      darkBg: found.primaryBg,
      darkSurface: found.primaryBg,
      darkBorder: found.primaryBg,
      pageBg: found.pageBg,
      cardBg: found.cardBg,
      cardBorder: found.cardBorder,
      textColor: found.textColor,
    };
  };

  const currentColors: CustomColors = getResolvedColors();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-6 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl text-white shadow-sm">
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg md:text-xl">تخصيص المظهر الشامل وهوية المنظومة</h3>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  تحكم بنسبة 100%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تعديل كامل لألوان الأزرار والأسطح والخلفيات، مكتبة خطوط عربية شاملة، وإمكانية إضافة خط مخصص
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live confirmation alert banner */}
        {themeAppliedMsg && (
          <div className="bg-emerald-600 text-white px-6 py-2.5 flex items-center justify-between text-xs sm:text-sm font-black animate-in fade-in slide-in-from-top-2 duration-200 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>{themeAppliedMsg}</span>
            </div>
            <span className="text-[11px] text-emerald-200 bg-emerald-700/80 px-2 py-0.5 rounded-full font-bold">
              مباشر ومفعّل الآن
            </span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-200 bg-slate-50 overflow-x-auto scrollbar-none shrink-0">
          <button
            onClick={() => setActiveTab('presets')}
            type="button"
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-t-2xl border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'presets'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/70'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>1. السمات والألوان الجاهزة (10 أنماط)</span>
          </button>

          <button
            onClick={() => setActiveTab('color_picker')}
            type="button"
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-t-2xl border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'color_picker'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/70'
            }`}
          >
            <Sliders className="w-4 h-4 text-emerald-600" />
            <span>2. التخصيص اللوني الدقيق (Color Pickers & Hex)</span>
          </button>

          <button
            onClick={() => setActiveTab('fonts')}
            type="button"
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-t-2xl border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'fonts'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/70'
            }`}
          >
            <Type className="w-4 h-4 text-emerald-600" />
            <span>3. مكتبة الخطوط العربية ({BUILTIN_FONTS.length} خطوط)</span>
          </button>

          <button
            onClick={() => setActiveTab('custom_font')}
            type="button"
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-t-2xl border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'custom_font'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/70'
            }`}
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>4. إضافة خط مخصص من عندك</span>
            {config.font === 'custom' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('layout')}
            type="button"
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-t-2xl border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'layout'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/70'
            }`}
          >
            <Wand2 className="w-4 h-4 text-emerald-600" />
            <span>5. الحواف والوضع الليلي</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-800">
          {/* TAB 1: PRESET PALETTES */}
          {activeTab === 'presets' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-base text-slate-900">
                    السمات اللونية الاحترافية المسبقة
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    مجموعات ألوان مدروسة تراعي راحة البصر والتباين المثالي لحسابات المخازن والصيدليات
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">انقر على أي بطاقة للتطبيق المباشر</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {PRESET_PALETTES.map((p) => {
                  const isSelected = config.palette === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPalette(p.id)}
                      type="button"
                      className={`relative p-4 rounded-2xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/40 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70 shadow-2xs'
                      }`}
                    >
                      <div>
                        {/* Swatch previews */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-5 h-5 rounded-full border border-white shadow-2xs"
                              style={{ backgroundColor: p.primaryBg }}
                              title="لون السطح"
                            />
                            <span
                              className="w-5 h-5 rounded-full border border-white shadow-2xs"
                              style={{ backgroundColor: p.accentColor }}
                              title="اللون الرئيسي"
                            />
                            <span
                              className="w-5 h-5 rounded-full border border-white shadow-2xs"
                              style={{ backgroundColor: p.secondaryColor }}
                              title="لون التأكيد"
                            />
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        <div className="font-bold text-sm text-slate-900 mb-1">{p.name}</div>
                        <div className="text-xs text-slate-500 leading-relaxed">
                          {p.description}
                        </div>
                      </div>

                      {/* Mini Live Preview inside card */}
                      <div
                        className="p-2 rounded-xl text-[11px] font-bold flex items-center justify-between border"
                        style={{
                          backgroundColor: p.pageBg,
                          borderColor: p.cardBorder,
                          color: p.textColor,
                        }}
                      >
                        <span>معاينة البطاقة</span>
                        <span
                          className="px-2 py-0.5 rounded text-white text-[10px]"
                          style={{ backgroundColor: p.accentColor }}
                        >
                          زر الإجراء
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: GRANULAR COLOR PICKER (Multiple Ways) */}
          {activeTab === 'color_picker' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-base text-slate-900">
                    التخصيص اللوني الدقيق (Color Pickers & Hex Codes)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    يمكنك تعديل أي لون بشكل منفصل من أصغر تفصيلة لأكبر مساحة باستخدام منتقي الألوان أو كود الـ HEX
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAutoHarmonize(currentColors.primary)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all cursor-pointer"
                  title="توليد ألوان متناسقة تلقائياً بناءً على اللون الرئيسي"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>توليد ومواءمة متناسقة تلقائياً</span>
                </button>
              </div>

              {/* Color Grid Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Primary Brand Color */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-slate-900 block">1. لون الهوية والأزرار الرئيسي (Primary Color)</span>
                      <span className="text-xs text-slate-500">للأزرار الأساسية، العناوين البارزة، وعناصر التفاعل</span>
                    </div>
                    <input
                      type="color"
                      value={currentColors.primary}
                      onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white shrink-0"
                    />
                  </div>

                  {/* Hex input & quick swatches */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">HEX:</span>
                    <input
                      type="text"
                      value={currentColors.primary}
                      onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                      className="w-28 px-2 py-1 font-mono text-xs font-bold bg-white border border-slate-300 rounded-lg text-center"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {quickColors.slice(0, 8).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleCustomColorChange('primary', c)}
                        className="w-6 h-6 rounded-full border border-white shadow-2xs transition-transform hover:scale-110 cursor-pointer"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                {/* 2. Accent Highlight Color */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-slate-900 block">2. لون التأكيد والتركيز (Accent Highlight)</span>
                      <span className="text-xs text-slate-500">للشارات والتركيز وأزرار الإجراءات الثانوية</span>
                    </div>
                    <input
                      type="color"
                      value={currentColors.accent}
                      onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white shrink-0"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">HEX:</span>
                    <input
                      type="text"
                      value={currentColors.accent}
                      onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                      className="w-28 px-2 py-1 font-mono text-xs font-bold bg-white border border-slate-300 rounded-lg text-center"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {quickColors.slice(8, 16).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleCustomColorChange('accent', c)}
                        className="w-6 h-6 rounded-full border border-white shadow-2xs transition-transform hover:scale-110 cursor-pointer"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                {/* 3. Dark Surface / Header / Nav Color */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-slate-900 block">3. لون السطح الداكن والهيدر (Dark Surface)</span>
                      <span className="text-xs text-slate-500">للشريط العلوي، ترويسات الجداول، وبطاقات التنبيه</span>
                    </div>
                    <input
                      type="color"
                      value={currentColors.darkBg}
                      onChange={(e) => handleCustomColorChange('darkBg', e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white shrink-0"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">HEX:</span>
                    <input
                      type="text"
                      value={currentColors.darkBg}
                      onChange={(e) => handleCustomColorChange('darkBg', e.target.value)}
                      className="w-28 px-2 py-1 font-mono text-xs font-bold bg-white border border-slate-300 rounded-lg text-center"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['#0b1f18', '#0f172a', '#0b1528', '#181d24', '#12151a', '#261b0d', '#210c14', '#18181b'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleCustomColorChange('darkBg', c)}
                        className="w-6 h-6 rounded-full border border-white shadow-2xs transition-transform hover:scale-110 cursor-pointer"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                {/* 4. Page Background */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-slate-900 block">4. خلفية الموقع العامة (Page Background)</span>
                      <span className="text-xs text-slate-500">لون الأرضية المحيطة بالبطاقات والجداول</span>
                    </div>
                    <input
                      type="color"
                      value={currentColors.pageBg}
                      onChange={(e) => handleCustomColorChange('pageBg', e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white shrink-0"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">HEX:</span>
                    <input
                      type="text"
                      value={currentColors.pageBg}
                      onChange={(e) => handleCustomColorChange('pageBg', e.target.value)}
                      className="w-28 px-2 py-1 font-mono text-xs font-bold bg-white border border-slate-300 rounded-lg text-center"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { name: 'رمادي ناعم', color: '#f8fafc' },
                      { name: 'أبيض ناصع', color: '#ffffff' },
                      { name: 'عاجي دافئ', color: '#faf7f2' },
                      { name: 'أزرق ثلجي', color: '#f0f5fc' },
                      { name: 'نعناعي رقيق', color: '#f0fdf4' },
                      { name: 'داكن ليلي', color: '#0f172a' },
                    ].map((opt) => (
                      <button
                        key={opt.color}
                        type="button"
                        onClick={() => handleCustomColorChange('pageBg', opt.color)}
                        className="px-2 py-1 rounded-lg border border-slate-300 text-[10px] font-bold shadow-2xs hover:scale-105 transition-all cursor-pointer"
                        style={{ backgroundColor: opt.color, color: opt.color === '#0f172a' ? '#fff' : '#000' }}
                      >
                        {opt.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BUILT-IN ALL ARABIC FONTS */}
          {activeTab === 'fonts' && (
            <div className="space-y-5">
              <div>
                <h4 className="font-bold text-base text-slate-900">
                  مكتبة الخطوط العربية المعتمدة ({BUILTIN_FONTS.length} خطاً راقياً)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  جميع أشهر الخطوط العربية المصممة للشاشات والأنظمة المحاسبية والتقارير المالية بدون تلاصق
                </p>
              </div>

              <div className="space-y-3">
                {BUILTIN_FONTS.map((f) => {
                  const isSelected = config.font === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => handleSelectFont(f.id)}
                      type="button"
                      className={`w-full p-4 rounded-2xl border-2 text-right transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/40 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-sm text-slate-900">{f.arabicName}</span>
                          {isSelected && (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                              الخط النشط الآن ✓
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{f.description}</p>
                        <div
                          className="text-base text-slate-900 font-semibold pt-1 text-right"
                          style={{ fontFamily: f.fontFamily }}
                        >
                          {f.sample}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 self-end sm:self-center shadow-xs">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: ADD CUSTOM FONT FROM USER */}
          {activeTab === 'custom_font' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-600" />
                  <span>إضافة وتفعيل خط مخصص من عندك (Custom Font)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  يمكنك استخدام أي خط يعجبك: رفع ملف خط من جهازك (.woff2, .woff, .ttf)، أو وضع رابط Google Fonts، أو كتابة اسم خط مثبت على جهازك
                </p>
              </div>

              {customFontSuccessMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{customFontSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleApplyCustomFont} className="space-y-5">
                {/* Method A: Upload Font File */}
                <div className="p-5 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-emerald-700" />
                      <span>الخيار 1: رفع ملف خط من جهازك (.woff2 / .woff / .ttf / .otf)</span>
                    </span>
                    <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                      أسهل وأسرع طريقة
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    اختر ملف الخط من الكمبيوتر، وسيتم حفظه محلياً وتطبيقه على الفور في المتصفح.
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".woff2,.woff,.ttf,.otf"
                    onChange={handleFontFileUpload}
                    className="hidden"
                  />

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>{fontFileLoading ? 'جارٍ قراءة الملف...' : 'اختيار ملف الخط من جهازك'}</span>
                    </button>
                    {customFontDataUri && (
                      <span className="text-xs font-bold text-emerald-700 font-mono">
                        ✓ تم تجهيز ملف الخط ({customFontName})
                      </span>
                    )}
                  </div>
                </div>

                {/* Method B: Google Fonts or URL */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                  <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-slate-600" />
                    <span>الخيار 2: رابط Google Fonts أو ملف CSS خارجي</span>
                  </span>
                  <input
                    type="url"
                    value={customFontUrl}
                    onChange={(e) => setCustomFontUrl(e.target.value)}
                    placeholder="مثال: https://fonts.googleapis.com/css2?family=Lateef&display=swap"
                    className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    يمكنك جلب أي رابط خط من موقع fonts.google.com ولصقه هنا مباشرة.
                  </p>
                </div>

                {/* Font Configuration inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      اسم الخط المعروض <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customFontName}
                      onChange={(e) => {
                        setCustomFontName(e.target.value);
                        if (!customFontFamily) setCustomFontFamily(e.target.value);
                      }}
                      placeholder="مثال: خط الشعار المخصص"
                      className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      اسم عائلة الخط البرمجية (Font Family)
                    </label>
                    <input
                      type="text"
                      value={customFontFamily}
                      onChange={(e) => setCustomFontFamily(e.target.value)}
                      placeholder="مثال: Lateef أو Traditional Arabic"
                      className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Live Preview Box */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>معاينة حية فورية للخط المخصص:</span>
                    </span>
                    <input
                      type="text"
                      value={fontPreviewText}
                      onChange={(e) => setFontPreviewText(e.target.value)}
                      className="text-[11px] px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg w-64 text-left"
                      placeholder="اكتب نصاً لتجربته..."
                    />
                  </div>
                  <div
                    className="p-3 bg-slate-50 rounded-xl text-lg font-bold text-slate-900 border border-slate-200 text-right min-h-[48px]"
                    style={{
                      fontFamily: customFontFamily
                        ? `'${customFontFamily}', 'Cairo', sans-serif`
                        : undefined,
                    }}
                  >
                    {fontPreviewText}
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>اعتماد وتطبيق هذا الخط على الموقع بالكامل</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: BORDER RADIUS & MODE */}
          {activeTab === 'layout' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-base text-slate-900">
                  استدارة الحواف والوضع الليلي (Borders & Dark Mode)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  التحكم في نعومة حواف البطاقات والأزرار ومظهر الإضاءة
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                <span className="font-bold text-sm text-slate-900 block">نمط الإضاءة (Theme Mode):</span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleMode('light')}
                    className={`p-3.5 rounded-xl border-2 flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      config.mode === 'light'
                        ? 'bg-white border-emerald-600 text-emerald-900 shadow-xs'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>الوضع الفاتح المريح (Light Mode)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleMode('dark')}
                    className={`p-3.5 rounded-xl border-2 flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      config.mode === 'dark'
                        ? 'bg-slate-900 border-emerald-500 text-white shadow-xs'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-blue-400" />
                    <span>الوضع الداكن الليلي (Dark Mode)</span>
                  </button>
                </div>
              </div>

              {/* Border Radius Options */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                <span className="font-bold text-sm text-slate-900 block">درجة استدارة الحواف (Border Radius):</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'rounded_none' as BorderRadiusOption, name: 'حواف حادة كلاسيكية (0px)', r: '0px' },
                    { id: 'rounded_sm' as BorderRadiusOption, name: 'حواف ناعمة مدمجة (8px)', r: '8px' },
                    { id: 'rounded_md' as BorderRadiusOption, name: 'حواف عصرية متوازنة (14px)', r: '14px' },
                    { id: 'rounded_lg' as BorderRadiusOption, name: 'حواف دائرية فخمة (20px)', r: '20px' },
                  ].map((rad) => {
                    const isSelected = config.borderRadius === rad.id;
                    return (
                      <button
                        key={rad.id}
                        type="button"
                        onClick={() => handleBorderRadiusChange(rad.id)}
                        className={`p-3 border-2 text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-xs font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                        style={{ borderRadius: rad.r }}
                      >
                        <span className="text-xs block">{rad.name}</span>
                        <div
                          className="h-3 bg-slate-200 mt-2 mx-auto w-12 border border-slate-300"
                          style={{ borderRadius: rad.r }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Toolbar */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة المظهر الافتراضي للمنظومة</span>
          </button>

          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              يتم حفظ التخصيص وتطبيقه تلقائياً ولحظياً
            </span>
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              حفظ وإغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
