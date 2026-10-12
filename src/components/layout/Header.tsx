import React, { useState, useRef, useEffect } from 'react';
import { Settings, User, LogOut, Palette, SlidersHorizontal, ChevronDown, Sparkles, Bot } from 'lucide-react';
import { APP_CONFIG } from '../../lib/branding';
import { UserAccount } from '../../lib/auth';

interface HeaderProps {
  onGoHome?: () => void;
  currentUser?: UserAccount;
  onOpenSettingsModal?: () => void;
  onOpenThemeModal?: () => void;
  onLogout?: () => void;
  onNavigateToTab?: (tab: string) => void;
  onOpenSimsim?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onGoHome,
  currentUser,
  onOpenSettingsModal,
  onOpenThemeModal,
  onLogout,
  onNavigateToTab,
  onOpenSimsim,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header
      className="app-header sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs"
      style={{
        backgroundColor: '#ffffff',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        borderBottomColor: 'var(--theme-card-border, #e2e8f0)',
      }}
    >
      <div className="max-w-[1920px] mx-auto flex items-center justify-between min-h-[64px] sm:min-h-[84px] md:min-h-[92px] py-1.5 sm:py-2 px-3 sm:px-6 lg:px-8 relative">
        {/* RIGHT SIDE (in RTL = First element): Placeholder for visual balance */}
        <div className="w-8 sm:w-24 md:w-28 flex items-center">
          {/* Empty spacer to keep logo centered */}
        </div>

        {/* CENTER: BRAND LOGO ONLY */}
        <div
          onClick={onGoHome}
          className="flex items-center justify-center cursor-pointer select-none group transition-transform hover:scale-105 active:scale-95 px-2"
          title="الرئيسية - الزهراء للأدوية والمبيدات الزراعية"
        >
          <img
            src={APP_CONFIG.logo}
            alt={APP_CONFIG.name}
            className="h-11 sm:h-16 md:h-20 lg:h-22 max-h-22 max-w-[200px] sm:max-w-none w-auto object-contain drop-shadow-xs transition-all duration-300"
          />
        </div>

        {/* FAR LEFT (in RTL = Last element): Simsim AI & Settings Gear */}
        <div className="relative flex items-center justify-end gap-2 sm:gap-3" ref={dropdownRef}>
          {/* SIMSIM AI TRIGGER BUTTON */}
          <button
            onClick={onOpenSimsim}
            type="button"
            className="group flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 md:py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 hover:from-emerald-700 hover:via-teal-800 hover:to-emerald-900 text-white transition-all cursor-pointer shadow-xs hover:shadow-md active:scale-95 border border-emerald-400/40"
            title="تحدث مع سمسم - الذكاء الاصطناعي الخاص بالمنظومة"
            aria-label="سمسم الذكاء الاصطناعي"
          >
            <div className="relative flex items-center justify-center">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-100 group-hover:scale-110 transition-transform" />
              <Sparkles className="w-2.5 h-2.5 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-300 rounded-full ring-2 ring-emerald-700 animate-ping" />
            </div>
            <span className="text-xs sm:text-sm font-black tracking-tight whitespace-nowrap">
              سمسم AI
            </span>
          </button>

          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            type="button"
            className="group flex items-center justify-center p-2 sm:p-2.5 md:p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all cursor-pointer shadow-xs active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            title="الإعدادات وتخصيص المظهر"
            aria-label="الإعدادات"
            aria-expanded={dropdownOpen}
          >
            <Settings className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 text-slate-700 group-hover:text-emerald-700 transition-transform duration-500 group-hover:rotate-90" />
          </button>

          {/* Settings & Profile Quick Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-2 w-[calc(100vw-1.5rem)] max-w-xs sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-right">
              {/* User Profile Header in Menu */}
              {currentUser && (
                <div className="p-3 mb-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 ${currentUser.avatarColor || 'bg-slate-800'}`}>
                    {currentUser.fullName.slice(0, 1) || 'م'}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-black text-slate-900 truncate">{currentUser.fullName}</p>
                    <p className="text-xs text-emerald-700 font-bold">{currentUser.roleNameAr}</p>
                    <p className="text-[11px] text-slate-500 truncate" dir="ltr">{currentUser.email}</p>
                  </div>
                </div>
              )}

              {/* Menu Actions */}
              <div className="space-y-1">
                {/* 1. Open Full Profile & Settings Modal */}
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    if (onOpenSettingsModal) onOpenSettingsModal();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-800 hover:text-emerald-900 hover:bg-emerald-50 text-xs sm:text-sm font-bold transition-colors cursor-pointer text-right"
                >
                  <User className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="flex-1">
                    <span className="block font-black">إعدادات الحساب والبروفايل</span>
                    <span className="block text-[11px] text-slate-500 font-medium">الاسم، رقم الهاتف، والوصف</span>
                  </div>
                </button>

                {/* 2. Full System Settings (for admin or screen navigation) */}
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    if (onOpenSettingsModal) onOpenSettingsModal();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-800 hover:text-emerald-900 hover:bg-emerald-50 text-xs sm:text-sm font-bold transition-colors cursor-pointer text-right"
                >
                  <SlidersHorizontal className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="flex-1">
                    <span className="block font-black">إعدادات المؤسسة والسحابة</span>
                    <span className="block text-[11px] text-slate-500 font-medium">بيانات الصيدلية، النسخ الاحتياطي، والفواتير</span>
                  </div>
                </button>

                {/* 3. Theme & Font Customizer */}
                {onOpenThemeModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenThemeModal();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-800 hover:text-emerald-900 hover:bg-emerald-50 text-xs sm:text-sm font-bold transition-colors cursor-pointer text-right"
                  >
                    <Palette className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div className="flex-1">
                      <span className="block font-black">تخصيص المظهر والخطوط</span>
                      <span className="block text-[11px] text-slate-500 font-medium">ألوان الواجهة وأنماط الخط العربي</span>
                    </div>
                  </button>
                )}

                {/* Divider */}
                <div className="my-1 border-t border-slate-100" />

                {/* 4. Logout */}
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 text-xs sm:text-sm font-bold transition-colors cursor-pointer text-right"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>تسجيل الخروج / تبديل الحساب</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
