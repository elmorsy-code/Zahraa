import React, { useState, useEffect } from 'react';
import {
  Building2,
  Save,
  CheckCircle2,
  Palette,
  Loader2,
  User,
  Phone,
  Lock,
  Receipt,
  Printer,
  Shield,
  FileText,
} from 'lucide-react';
import { storage } from '../../lib/storage';
import { AppSettings } from '../../types/database';
import { ThemeCustomizerModal } from '../layout/ThemeCustomizerModal';
import { authService, UserAccount } from '../../lib/auth';

export const SettingsScreen: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(authService.getCurrentUser());
  const [settings, setSettings] = useState<AppSettings>(storage.getSettings());
  const [activeTab, setActiveTab] = useState<'profile' | 'store' | 'pos_print'>('profile');

  // Account / Profile states
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [description, setDescription] = useState(currentUser?.description || '');
  const [avatarColor, setAvatarColor] = useState(currentUser?.avatarColor || 'bg-emerald-700');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Store settings state
  const [storeSaving, setStoreSaving] = useState(false);
  const [storeSuccess, setStoreSuccess] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);

  const [themeModalOpen, setThemeModalOpen] = useState(false);

  useEffect(() => {
    const unsubAuth = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
      if (user) {
        setFullName(user.fullName || '');
        setPhone(user.phone || '');
        setDescription(user.description || '');
        setAvatarColor(user.avatarColor || 'bg-emerald-700');
      }
    });

    const unsubStorage = storage.subscribe(() => {
      setSettings(storage.getSettings());
    });

    const curr = authService.getCurrentUser();
    if (curr) {
      setCurrentUser(curr);
      setFullName(curr.fullName || '');
      setPhone(curr.phone || '');
      setDescription(curr.description || '');
      setAvatarColor(curr.avatarColor || 'bg-emerald-700');
    }

    return () => {
      unsubAuth();
      unsubStorage();
    };
  }, []);

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
        setProfileError(res.error || 'فشل حفظ بيانات الحساب');
      } else {
        setProfileSuccess('تم حفظ وتحديث بيانات حسابك بنجاح');
        if (res.user) {
          setCurrentUser(res.user);
          authService.setCurrentUser(res.user);
        }
        setTimeout(() => setProfileSuccess(null), 3500);
      }
    } catch (err: any) {
      setProfileError(err?.message || 'حدث خطأ أثناء حفظ بيانات الحساب');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('كلمة المرور يجب ألا تقل عن 6 خانات أو أحرف');
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
        setPasswordSuccess('تم تحديث كلمة مرور الحساب بنجاح');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(null), 3500);
      }
    } catch (err: any) {
      setPasswordError(err?.message || 'حدث خطأ أثناء تحديث كلمة المرور');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setStoreSaving(true);
    setStoreSuccess(false);
    setStoreError(null);

    try {
      await storage.saveSettings(settings);
      setStoreSuccess(true);
      setTimeout(() => setStoreSuccess(false), 3500);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setStoreError(err?.message || 'فشل حفظ إعدادات المؤسسة');
    } finally {
      setStoreSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header and navigation tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">إعدادات المنظومة والحساب</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            تخصيص بيانات الحساب الشخصي، ترويسة الفواتير، ونمط الطباعة
          </p>
        </div>

        <button
          onClick={() => setThemeModalOpen(true)}
          type="button"
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Palette className="w-4 h-4 text-emerald-600" />
          <span>تخصيص المظهر والخط</span>
        </button>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-black border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <User className="w-4 h-4" />
          <span>إعدادات الحساب والملف الشخصي</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('store')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-black border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'store'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>بيانات المؤسسة وترويسة الفواتير</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pos_print')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-black border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'pos_print'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>خيارات الطباعة وضريبة المبيعات</span>
        </button>
      </div>

      {/* TAB 1: Profile & Account Settings */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Personal Information Form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-sm text-slate-900">البيانات الشخصية ومعلومات المستخدم</h3>
              </div>
              {currentUser && (
                <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  {currentUser.roleNameAr}
                </span>
              )}
            </div>

            {profileSuccess && (
              <div className="m-5 p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="m-5 p-3.5 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs font-bold flex items-center gap-2">
                <Shield className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
              {/* Account Quick Header / Avatar Preview */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-md shrink-0 ${
                    avatarColor || 'bg-emerald-700'
                  }`}
                >
                  {fullName ? fullName.charAt(0) : 'م'}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900">{fullName || 'المستخدم'}</span>
                    {currentUser && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                        {currentUser.roleNameAr}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-mono font-medium">
                    {currentUser?.email || 'حساب النظام المعتمد'}
                  </p>
                </div>
              </div>

              {/* Avatar Color Picker */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-700">
                  لون الشارة والرمز التعريفي
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
                  {[
                    { id: 'bg-emerald-700', label: 'زمردي' },
                    { id: 'bg-teal-700', label: 'تيل' },
                    { id: 'bg-blue-700', label: 'أزرق' },
                    { id: 'bg-indigo-700', label: 'نيلي' },
                    { id: 'bg-purple-700', label: 'أرجواني' },
                    { id: 'bg-amber-700', label: 'كهرماني' },
                    { id: 'bg-rose-700', label: 'وردي' },
                    { id: 'bg-slate-800', label: 'فحمي' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setAvatarColor(c.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        avatarColor === c.id
                          ? 'border-slate-900 ring-2 ring-slate-900/20 bg-white font-black'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${c.id}`} />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    الاسم الكامل للمستخدم *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: د. محمد صبحي"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm font-bold bg-white"
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
                      placeholder="010xxxxxxxx"
                      dir="ltr"
                      className="w-full ps-10 pe-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm font-bold bg-white"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                    placeholder="مثال: المدير التنفيذي ومسؤول المستودعات المركزية"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm font-bold bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="flex items-center gap-2 px-6 py-2.5 text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer"
                >
                  {profileSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>حفظ بيانات الحساب</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <Lock className="w-5 h-5 text-slate-700" />
              <div>
                <h3 className="font-black text-sm text-slate-900">تغيير كلمة المرور</h3>
                <p className="text-[11px] text-slate-500">قم بتعيين كلمة مرور جديدة وقوية لتأمين دخولك</p>
              </div>
            </div>

            {passwordSuccess && (
              <div className="m-5 p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="m-5 p-3.5 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs font-bold flex items-center gap-2">
                <Shield className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    كلمة المرور الجديدة *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="6 خانات أو أكثر"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    تأكيد كلمة المرور الجديدة *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm font-bold bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="flex items-center gap-2 px-6 py-2.5 text-xs font-black text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer"
                >
                  {passwordSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ التحديث...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span>تحديث كلمة المرور</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: Store Profile Settings */}
      {activeTab === 'store' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-sm text-slate-900">بيانات المؤسسة وترويسة الفواتير المطبوعة</h3>
          </div>

          {storeSuccess && (
            <div className="m-5 p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>تم حفظ بيانات المؤسسة بنجاح!</span>
            </div>
          )}

          {storeError && (
            <div className="m-5 p-3.5 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{storeError}</span>
            </div>
          )}

          <form onSubmit={handleSaveStore} className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-black text-slate-700 mb-1.5">اسم المؤسسة / الصيدلية *</label>
                <input
                  type="text"
                  required
                  value={settings.company_info.name}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      company_info: { ...settings.company_info, name: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-black text-slate-700 mb-1.5">النشاط التجاري</label>
                <input
                  type="text"
                  value={settings.company_info.activity}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      company_info: { ...settings.company_info, activity: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-black text-slate-700 mb-1.5">رقم السجل التجاري</label>
                <input
                  type="text"
                  value={settings.company_info.commercial_reg || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      company_info: { ...settings.company_info, commercial_reg: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-black text-slate-700 mb-1.5">البطاقة الضريبية</label>
                <input
                  type="text"
                  value={settings.company_info.tax_card || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      company_info: { ...settings.company_info, tax_card: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-black text-slate-700 mb-1.5">الهاتف والواتساب</label>
                <input
                  type="text"
                  value={settings.company_info.phone}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      company_info: { ...settings.company_info, phone: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-black text-slate-700 mb-1.5">العنوان والفرع</label>
              <input
                type="text"
                value={settings.company_info.address}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    company_info: { ...settings.company_info, address: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-black text-slate-700 mb-1.5">تذييل وإرشادات الفاتورة المطبوعة</label>
              <textarea
                rows={2}
                value={settings.company_info.invoice_footer || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    company_info: { ...settings.company_info, invoice_footer: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="pt-3 flex justify-end border-t border-slate-100">
              <button
                type="submit"
                disabled={storeSaving}
                className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer"
              >
                {storeSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>حفظ بيانات المؤسسة</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: POS & Print Options */}
      {activeTab === 'pos_print' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-sm text-slate-900">خيارات الكاشير والطباعة والضرائب</h3>
          </div>

          <form onSubmit={handleSaveStore} className="p-6 space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block font-black text-slate-800">سماح بالبيع عند نفاد الرصيد</label>
                <label className="flex items-center gap-2 font-bold cursor-pointer text-slate-700 mt-2">
                  <input
                    type="checkbox"
                    checked={settings.pos_settings.allow_negative_stock}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pos_settings: {
                          ...settings.pos_settings,
                          allow_negative_stock: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>السماح برصيد سالب مؤقت أثناء البيع السريع</span>
                </label>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block font-black text-slate-800">الطباعة التلقائية عند إتمام البيع</label>
                <label className="flex items-center gap-2 font-bold cursor-pointer text-slate-700 mt-2">
                  <input
                    type="checkbox"
                    checked={settings.pos_settings.print_immediately}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pos_settings: {
                          ...settings.pos_settings,
                          print_immediately: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>فتح نافذة الطباعة فور حفظ الفاتورة</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-black text-slate-700 mb-1.5">نسبة ضريبة القيمة المضافة (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={settings.pos_settings.tax_percentage}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      pos_settings: {
                        ...settings.pos_settings,
                        tax_percentage: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2.5 font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 font-black cursor-pointer text-slate-800">
                  <input
                    type="checkbox"
                    checked={settings.pos_settings.enable_tax}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pos_settings: {
                          ...settings.pos_settings,
                          enable_tax: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>تفعيل حساب الضريبة في فواتير البيع تلقائياً</span>
                </label>
              </div>
            </div>

            <div className="pt-3 flex justify-end border-t border-slate-100">
              <button
                type="submit"
                disabled={storeSaving}
                className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer"
              >
                {storeSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>حفظ خيارات الطباعة</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <ThemeCustomizerModal
        isOpen={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
      />
    </div>
  );
};
