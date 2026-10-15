import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Settings,
  Palette,
  Shield,
  Phone,
  Mail,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  Building2,
  Download,
  Copy,
  ExternalLink,
  Sparkles,
  LayoutTemplate,
} from 'lucide-react';
import { authService, UserAccount, ROLE_NAMES_AR } from '../../lib/auth';
import { storage } from '../../lib/storage';
import { isSupabaseConfigured } from '../../lib/supabase';
import { AppSettings } from '../../types/database';
import { APP_CONFIG } from '../../lib/branding';
import { HomeContentEditor } from '../home/HomeContentEditor';

interface SettingsAndProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onOpenThemeModal: () => void;
  onNavigateToTab?: (tab: string) => void;
  onUserUpdated?: (user: UserAccount) => void;
}

const AVATAR_COLORS = [
  { label: 'زمردي', value: 'bg-emerald-700' },
  { label: 'أزرق ملكي', value: 'bg-blue-700' },
  { label: 'كحلي داكن', value: 'bg-slate-800' },
  { label: 'عنبري', value: 'bg-amber-700' },
  { label: 'أرجواني', value: 'bg-purple-700' },
  { label: 'ياقوتي', value: 'bg-rose-700' },
  { label: 'فيروزي', value: 'bg-teal-700' },
  { label: 'نيلي', value: 'bg-indigo-700' },
];

export const SettingsAndProfileModal: React.FC<SettingsAndProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenThemeModal,
  onNavigateToTab,
  onUserUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'store_settings' | 'system_info' | 'home_content'>('profile');

  // Profile Form State
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [description, setDescription] = useState(currentUser?.description || '');
  const [avatarColor, setAvatarColor] = useState(currentUser?.avatarColor || 'bg-slate-800');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Sync state whenever modal opens or currentUser changes
  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName || '');
      setPhone(currentUser.phone || '');
      setDescription(currentUser.description || '');
      setAvatarColor(currentUser.avatarColor || 'bg-slate-800');
    }
    setStoreSettings(storage.getSettings());
  }, [currentUser, isOpen]);

  // Store Settings State
  const [storeSettings, setStoreSettings] = useState<AppSettings>(storage.getSettings());
  const [storeSaving, setStoreSaving] = useState(false);
  const [storeSuccess, setStoreSuccess] = useState<string | null>(null);
  const [storeError, setStoreError] = useState<string | null>(null);

  // System Backup State
  const [exporting, setExporting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const isAdmin = currentUser.role === 'admin';
  const isCloud = isSupabaseConfigured();

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      const res = await authService.updateCurrentUserProfile({
        fullName,
        phone,
        description,
        avatarColor,
      });

      if (!res.success) {
        setProfileError(res.error || 'فشل تحديث البيانات');
      } else if (res.user) {
        setProfileSuccess('تم حفظ بيانات الحساب وتحديثها بنجاح');
        setFullName(res.user.fullName);
        setPhone(res.user.phone || '');
        setDescription(res.user.description || '');
        setAvatarColor(res.user.avatarColor || 'bg-slate-800');
        authService.setCurrentUser(res.user);
        if (onUserUpdated) onUserUpdated(res.user);
        setTimeout(() => setProfileSuccess(null), 3500);
      }
    } catch (err: any) {
      setProfileError(err?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('كلمة المرور يجب أن لا تقل عن 6 أحرف أو أرقام');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('كلمتا المرور غير متطابقتين');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await authService.updateCurrentUserPassword(newPassword);
      if (!res.success) {
        setPasswordError(res.error || 'فشل تحديث كلمة المرور');
      } else {
        setPasswordSuccess('تم تحديث كلمة المرور لحسابك بنجاح');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(null), 3500);
      }
    } catch (err: any) {
      setPasswordError(err?.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setStoreSaving(true);
    setStoreSuccess(null);
    setStoreError(null);

    try {
      await storage.saveSettings(storeSettings);
      setStoreSuccess('تم حفظ إعدادات المؤسسة والفواتير بنجاح');
      setTimeout(() => setStoreSuccess(null), 3500);
    } catch (err: any) {
      setStoreError(err?.message || 'فشل حفظ الإعدادات');
    } finally {
      setStoreSaving(false);
    }
  };

  const handleExportBackup = async () => {
    setExporting(true);
    try {
      const fullData = await storage.exportFullDatabaseJson();
      const blob = new Blob([JSON.stringify(fullData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `نسخة_احتياطية_${APP_CONFIG.name}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 border-b border-slate-200 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black tracking-tight">
                إعدادات النظام والملف الشخصي
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                تخصيص الحساب، الهوية، مظهر النظام، وإعدادات المؤسسة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Tabs Bar */}
        <div className="flex items-center gap-2 px-5 sm:px-7 pt-4 border-b border-slate-200 bg-slate-50 shrink-0 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-black border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>الملف الشخصي ({currentUser.roleNameAr})</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('store_settings')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-black border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'store_settings'
                  ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-xl shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>إعدادات المؤسسة والفواتير</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('home_content')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-black border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'home_content'
                  ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-xl shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutTemplate className="w-4 h-4" />
              <span>الصفحة الرئيسية</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('system_info')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-black border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'system_info'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>تخصيص المظهر</span>
          </button>

          {/* Quick Theme Launcher in tab bar */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenThemeModal();
            }}
            className="ms-auto flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-slate-200 rounded-xl cursor-pointer transition-colors shrink-0"
            title="تغيير الألوان والخطوط"
          >
            <Palette className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">تخصيص المظهر والخطوط</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* TAB: HOME PAGE CONTENT (admin only) */}
          {isAdmin && activeTab === 'home_content' && <HomeContentEditor />}

          {/* TAB 1: USER PROFILE & ACCOUNT SETTINGS */}
          {activeTab === 'profile' && (
            <div className="space-y-8">
              <form onSubmit={handleSaveProfile} className="space-y-6">
                {profileSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-900 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                {profileError && (
                  <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-center gap-3 text-rose-900 font-bold text-sm">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                {/* Current Role Banner */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-sm ${avatarColor}`}>
                      {fullName.slice(0, 1) || 'م'}
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900">{fullName || 'المستخدم'}</h4>
                      <p className="text-xs text-slate-600 font-bold flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{currentUser.email}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-950 border border-emerald-300 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-700" />
                      <span>الدور: {currentUser.roleNameAr}</span>
                    </span>
                  </div>
                </div>

                {/* Edit Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1.5">
                      الاسم الكامل للمستخدم <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm font-bold bg-white"
                      placeholder="مثال: د. محمد صبحي"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1.5">
                      رقم الهاتف المحمول
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm font-bold bg-white"
                        placeholder="مثال: 010xxxxxxxx"
                        dir="ltr"
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-black text-slate-700 mb-1.5">
                      وصف الحساب أو المسمى الوظيفي
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm font-bold bg-white"
                      placeholder="مثال: مدير الصيدلية ومسؤول المخازن العامة"
                    />
                  </div>

                  {/* Avatar Color Picker */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-black text-slate-700 mb-2">
                      لون شارة الحساب (Avatar Color)
                    </label>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {AVATAR_COLORS.map((col) => (
                        <button
                          key={col.value}
                          type="button"
                          onClick={() => setAvatarColor(col.value)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                            avatarColor === col.value
                              ? 'border-slate-900 ring-2 ring-emerald-500 bg-slate-100 shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full ${col.value}`} />
                          <span>{col.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-sm cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {profileSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جارٍ الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>حفظ وتثبيت تعديلات الحساب</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Password & Security Section */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                  <div className="p-2 rounded-xl bg-slate-900 text-white">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-slate-900">أمان الحساب وتغيير كلمة المرور</h5>
                    <p className="text-xs text-slate-500 font-medium">قم بتعيين كلمة مرور جديدة وقوية للدخول إلى حسابك</p>
                  </div>
                </div>

                {passwordSuccess && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2.5 text-emerald-900 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-center gap-2.5 text-rose-900 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        كلمة المرور الجديدة (6 خانات على الأقل)
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm font-bold bg-white"
                        placeholder="••••••••"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        تأكيد كلمة المرور الجديدة
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm font-bold bg-white"
                        placeholder="••••••••"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={passwordSaving || !newPassword}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-xs disabled:opacity-40"
                    >
                      {passwordSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>جارٍ تحديث كلمة المرور...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>تحديث كلمة المرور</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: STORE SETTINGS (ADMIN ONLY) */}
          {activeTab === 'store_settings' && isAdmin && (
            <form onSubmit={handleSaveStoreSettings} className="space-y-6">
              {storeSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{storeSuccess}</span>
                </div>
              )}

              {storeError && (
                <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-center gap-3 text-rose-900 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{storeError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    اسم المؤسسة / الصيدلية
                  </label>
                  <input
                    type="text"
                    value={storeSettings.company_info?.name || ''}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        company_info: {
                          ...storeSettings.company_info,
                          name: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    النشاط التجاري
                  </label>
                  <input
                    type="text"
                    value={storeSettings.company_info?.activity || ''}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        company_info: {
                          ...storeSettings.company_info,
                          activity: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    رقم الهاتف الرسمي
                  </label>
                  <input
                    type="text"
                    value={storeSettings.company_info?.phone || ''}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        company_info: {
                          ...storeSettings.company_info,
                          phone: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm font-bold bg-white"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    العنوان والموقع الجغرافي
                  </label>
                  <input
                    type="text"
                    value={storeSettings.company_info?.address || ''}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        company_info: {
                          ...storeSettings.company_info,
                          address: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    الرقم الضريبي (إن وجد)
                  </label>
                  <input
                    type="text"
                    value={storeSettings.company_info?.tax_card || ''}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        company_info: {
                          ...storeSettings.company_info,
                          tax_card: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm font-bold bg-white"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    السجل التجاري (إن وجد)
                  </label>
                  <input
                    type="text"
                    value={storeSettings.company_info?.commercial_reg || ''}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        company_info: {
                          ...storeSettings.company_info,
                          commercial_reg: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm font-bold bg-white"
                    dir="ltr"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    الرسالة الترحيبية / تذييل إيصالات الفاتورة
                  </label>
                  <input
                    type="text"
                    value={storeSettings.company_info?.invoice_footer || ''}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        company_info: {
                          ...storeSettings.company_info,
                          invoice_footer: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm font-bold bg-white"
                    placeholder="مثال: شكراً لثقتكم بنا - بضاعة المبيدات والأسمدة مسترجعة خلال 14 يوماً"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                {onNavigateToTab && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToTab('settings');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                  >
                    <span>فتح صفحة الإعدادات الشاملة (المخازن والخزائن)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={storeSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm cursor-pointer shadow-xs disabled:opacity-50 ms-auto"
                >
                  {storeSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>حفظ إعدادات المؤسسة</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: THEME & INTERFACE */}
          {activeTab === 'system_info' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-base">طيبة لإدارة الصيدلية الزراعية والمخازن</h4>
                      <p className="text-xs text-slate-300 font-medium">
                        النسخة السحابية المحدثة · الفرع الرئيسي
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black">
                    نظام نشط
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  منظومة متكاملة لربط فواتير المبيعات ونقاط البيع مع المستودع الرئيسي وحسابات المزارعين والموردين.
                </p>
              </div>

              {/* Theme Customizer Quick Launch */}
              <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-700 text-white">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-slate-900">
                      تخصيص لوحة الألوان والخط العربي
                    </h5>
                    <p className="text-xs text-slate-600 font-medium">
                      يدعم النظام خطوط القاهرة، المراعي، الإسكندرية، وPlex العربي مع 5 سمات ألوان
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenThemeModal();
                  }}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-emerald-100 text-emerald-950 border border-emerald-300 text-xs font-black cursor-pointer shadow-xs whitespace-nowrap"
                >
                  فتح منسق المظهر
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
