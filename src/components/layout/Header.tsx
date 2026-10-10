import React, { useState, useRef, useEffect } from 'react';
import { Settings, User, LogOut, Palette, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { APP_CONFIG } from '../../lib/branding';
import { UserAccount } from '../../lib/auth';

interface HeaderProps {
  onGoHome?: () => void;
  currentUser?: UserAccount;
  onOpenSettingsModal?: () => void;
  onOpenThemeModal?: () => void;
  onLogout?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onGoHome,
  currentUser,
  onOpenSettingsModal,
  onOpenThemeModal,
  onLogout,
  onNavigateToTab,
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
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-[1920px] mx-auto flex items-center justify-between min-h-[72px] sm:min-h-[88px] md:min-h-[96px] py-2 px-3 sm:px-6 lg:px-8 relative">
        {/* RIGHT SIDE (in RTL = First element): Placeholder for visual balance or small helper */}
        <div className="w-10 sm:w-28 flex items-center">
          {/* Empty spacer to keep logo perfectly centered */}
        </div>

        {/* CENTER: BRAND LOGO ONLY (No text/name, as explicitly requested) */}
        <div
          onClick={onGoHome}
          className="flex items-center justify-center cursor-pointer select-none group transition-transform hover:scale-105 active:scale-95"
          title="الرئيسية - الزهراء للأدوية والمبيدات الزراعية"
        >
          <img
            src={APP_CONFIG.logo}
            alt={APP_CONFIG.name}
            className="h-14 sm:h-18 md:h-22 lg:h-24 max-h-24 w-auto object-contain drop-shadow-xs transition-all duration-300"
          />
        </div>

        {/* FAR LEFT (in RTL = Last element): Settings Gear ONLY */}
        <div className="relative flex items-center justify-end" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            type="button"
            className="group flex items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all cursor-pointer shadow-xs active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            title="الإعدادات وتخصيص المظهر"
            aria-label="الإعدادات"
            aria-expanded={dropdownOpen}
          >
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700 group-hover:text-emerald-700 transition-transform duration-500 group-hover:rotate-90" />
          </button>

          {/* Settings & Profile Quick Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-right">
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
