import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Key,
  Shield,
  UserPlus,
  CheckCircle2,
  XCircle,
  Edit3,
  Lock,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import { RoleType } from '../../types/database';
import { authService, UserAccount } from '../../lib/auth';

export const UsersPermissionsScreen: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserAccount | null>(null);

  // Form states for new user
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<RoleType>('cashier');
  const [description, setDescription] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Password reset modal states
  const [newPassword, setNewPassword] = useState('');
  const [passwordModalLoading, setPasswordModalLoading] = useState(false);
  const [passwordModalError, setPasswordModalError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await authService.getProfiles();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    {
      id: 'admin' as RoleType,
      name_ar: 'المدير العام',
      desc: 'صلاحيات كاملة على كافة أجزاء النظام والتقارير والبيانات المالية وإعدادات قاعدة البيانات',
      perms: ['كافة الصلاحيات', 'تعديل الأسعار', 'إلغاء الفواتير', 'الترحيل المالي'],
      color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    },
    {
      id: 'cashier' as RoleType,
      name_ar: 'كاشير / بائع نقطة البيع',
      desc: 'إصدار فواتير البيع، تحصيل النقدية، استعلام أسعار وبحث عملاء وإصدار إيصالات',
      perms: ['نقطة البيع (POS)', 'بحث المنتجات والأسعار', 'إضافة عميل', 'تحصيل نقدي'],
      color: 'bg-blue-50 text-blue-800 border-blue-300',
    },
    {
      id: 'storekeeper' as RoleType,
      name_ar: 'مسؤول المخزن والمستودع',
      desc: 'إدارة المخزون، التحويلات بين المخزن والمحل، استلام المشتريات والجرد الفعلي',
      perms: ['استلام البضاعة', 'التحويل المخزني', 'الجرد الفعلي', 'تنبيهات النواقص'],
      color: 'bg-amber-50 text-amber-800 border-amber-300',
    },
    {
      id: 'accountant' as RoleType,
      name_ar: 'المحاسب المالي',
      desc: 'متابعة كشوف حسابات العملاء والموردين، الخزينة والمصروفات، والتقارير المالية',
      perms: ['كشوف الحسابات', 'الخزينة والمصروفات', 'سندات القبض والصرف', 'التقارير'],
      color: 'bg-purple-50 text-purple-800 border-purple-300',
    },
  ];

  const handleOpenAdd = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setRole('cashier');
    setDescription('');
    setFormError('');
    setShowAddModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim()) {
      setFormError('يرجى كتابة الاسم الكامل للمستخدم');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }
    if (password.length < 6) {
      setFormError('كلمة المرور يجب أن لا تقل عن 6 أحرف أو أرقام');
      return;
    }

    setModalLoading(true);
    try {
      const res = await authService.adminCreateUser({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: phone.trim(),
        role,
        description: description.trim(),
      });

      if (!res.success) {
        setFormError(res.error || 'فشل إنشاء المستخدم في قاعدة البيانات');
        setModalLoading(false);
        return;
      }

      setSuccessToast(`تم إنشاء حساب ${fullName} بنجاح`);
      setTimeout(() => setSuccessToast(''), 4000);
      setShowAddModal(false);
      await loadUsers();
    } catch (err: any) {
      setFormError(err?.message || 'حدث خطأ أثناء حفظ المستخدم');
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleStatus = async (user: UserAccount) => {
    const success = await authService.adminToggleUserStatus(user.id, user.isActive);
    if (success) {
      setSuccessToast(
        user.isActive
          ? `تم تعطيل حساب ${user.fullName}`
          : `تم تفعيل حساب ${user.fullName}`
      );
      setTimeout(() => setSuccessToast(''), 3000);
      await loadUsers();
    }
  };

  const handleOpenPasswordModal = (user: UserAccount) => {
    setSelectedUserForPassword(user);
    setNewPassword('');
    setPasswordModalError('');
    setShowPasswordModal(true);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword) return;
    if (newPassword.length < 6) {
      setPasswordModalError('كلمة المرور يجب ألا تقل عن 6 خانات');
      return;
    }

    setPasswordModalLoading(true);
    setPasswordModalError('');
    try {
      const res = await authService.adminUpdateUserPassword(
        selectedUserForPassword.id,
        newPassword
      );

      if (!res.success) {
        setPasswordModalError(res.error || 'فشل تحديث كلمة المرور');
        setPasswordModalLoading(false);
        return;
      }

      setSuccessToast(`تم تغيير كلمة مرور ${selectedUserForPassword.fullName} بنجاح`);
      setTimeout(() => setSuccessToast(''), 4000);
      setShowPasswordModal(false);
    } catch (err: any) {
      setPasswordModalError(err?.message || 'خطأ غير متوقع');
    } finally {
      setPasswordModalLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 py-3 px-6 bg-emerald-800 text-white font-bold rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 1. Header Card */}
      <div className="card-box p-6 border-2 border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-emerald-600" />
              <span>إدارة مستخدمي المنظومة والصلاحيات</span>
            </h2>
            <p className="text-sm text-slate-600 mt-1 font-medium">
              تفعيل وتعطيل الحسابات وتعيين أدوار الموظفين مباشرة من جدول profiles.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 font-bold text-slate-700">
              إنشاء المستخدمين: عبر لوحة Supabase
            </span>
          </div>
        </div>

        {/* Informative banner per instruction */}
        <div className="mt-4 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs font-bold leading-relaxed flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-amber-950 mb-0.5">تعليمات إنشاء مستخدم جديد:</p>
            <p>
              يتم إنشاء حساب المستخدم أولاً من لوحة تحكم <strong>Supabase</strong> (عبر قسم <strong>Authentication ➔ Users ➔ Add user</strong>).
              بمجرد إنشاء الحساب وتسجيل دخوله، يظهر تلقائياً في هذه القائمة ليتسنى للمدير العام تفعيل حسابه وتحديد دوره وصلاحياته في المنظومة.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Roles Overview Grid */}
      <div>
        <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-600" />
          <span>هيكل الأدوار والصلاحيات المعتمدة في النظام</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {roles.map((r) => (
            <div
              key={r.id}
              className={`p-5 rounded-2xl border-2 shadow-xs flex flex-col justify-between space-y-3 ${r.color}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-black text-base">{r.name_ar}</h4>
                  <span className="text-xs font-mono font-bold uppercase opacity-60">{r.id}</span>
                </div>
                <p className="text-sm leading-relaxed font-medium opacity-90 mb-3">
                  {r.desc}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-xs font-bold block mb-1.5">الصلاحيات الممنوحة:</span>
                <div className="flex flex-wrap gap-1.5">
                  {r.perms.map((p, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 rounded-lg bg-white/80 font-bold border border-slate-200/60 text-slate-900"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Live Users Cards Grid */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <span>المستخدمون المسجلون فعلياً في قاعدة البيانات ({users.length})</span>
          </h3>
          <span className="text-sm font-bold text-slate-500">
            حسابات حقيقية مشفرة بالبريد الإلكتروني
          </span>
        </div>

        {loading ? (
          <div className="card-box p-12 text-center bg-white border border-slate-200 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <span className="text-sm font-bold text-slate-600">جارٍ تحميل حسابات المستخدمين من قاعدة البيانات...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="card-box p-12 text-center bg-white border border-slate-200 space-y-3">
            <p className="text-base font-bold text-slate-600">لا يوجد مستخدمون إضافيون مسجلون حالياً في النظام.</p>
            <button
              onClick={handleOpenAdd}
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة أول مستخدم الآن</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {users.map((user) => (
              <div
                key={user.id}
                className="card-box p-6 border-2 border-slate-200 hover:border-slate-400 transition-all space-y-4 bg-white"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-lg ${
                        user.avatarColor || 'bg-slate-800'
                      }`}
                    >
                      {user.fullName.slice(0, 1)}
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900">{user.fullName}</h4>
                      <span className="text-xs text-slate-500 font-bold block" dir="ltr">
                        {user.email || user.username}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(user)}
                    type="button"
                    className={`px-3 py-1 rounded-xl text-xs font-black cursor-pointer transition-colors ${
                      user.isActive
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200'
                    }`}
                    title="انقر لتغيير حالة الحساب"
                  >
                    {user.isActive ? '● نشط' : '○ معطل'}
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center text-slate-600 gap-2">
                    <span className="font-semibold text-xs">الدور في المنظومة:</span>
                    <select
                      value={user.role}
                      onChange={async (e) => {
                        const newRole = e.target.value as RoleType;
                        const res = await authService.adminUpdateUserRole(user.id, newRole);
                        if (res.success) {
                          setSuccessToast(`تم تعديل دور ${user.fullName} إلى ${roles.find(r => r.id === newRole)?.name_ar || newRole}`);
                          setTimeout(() => setSuccessToast(''), 3000);
                          await loadUsers();
                        } else {
                          alert(res.error || 'فشل تعديل الدور');
                        }
                      }}
                      className="text-xs font-black text-slate-900 px-2 py-1 rounded-lg bg-slate-100 border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name_ar}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-semibold">رقم الهاتف:</span>
                    <span className="font-mono font-bold text-slate-900">{user.phone || 'غير مسجل'}</span>
                  </div>
                </div>

                {user.description && (
                  <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed font-medium">
                    {user.description}
                  </p>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenPasswordModal(user)}
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span>تغيير كلمة المرور</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
              <span className="font-black text-lg">
                إضافة مستخدم جديد للنظام (Supabase Auth)
              </span>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xl cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="m-5 p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block font-black text-sm text-slate-800 mb-1.5">الاسم الكامل *</label>
                <div className="relative">
                  <User className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: المهندس علي خليل"
                    className="w-full pr-10 pl-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-black text-sm text-slate-800 mb-1.5">البريد الإلكتروني (Login) *</label>
                  <div className="relative">
                    <Mail className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ali@alzahraa.com"
                      dir="ltr"
                      className="w-full pr-10 pl-3 py-2.5 font-mono border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-500 text-left"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-black text-sm text-slate-800 mb-1.5">كلمة المرور *</label>
                  <div className="relative">
                    <Lock className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="6 خانات على الأقل"
                      dir="ltr"
                      className="w-full pr-10 pl-3 py-2.5 font-mono border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-500 text-left"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-black text-sm text-slate-800 mb-1.5">رقم الهاتف</label>
                  <div className="relative">
                    <Phone className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01012345678"
                      dir="ltr"
                      className="w-full pr-10 pl-3 py-2.5 font-mono border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-500 text-left"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-black text-sm text-slate-800 mb-1.5">الدور والصلاحية *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as RoleType)}
                    className="w-full py-2.5 px-3 border-2 border-slate-200 rounded-xl text-sm font-bold bg-white focus:outline-none focus:border-emerald-500"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name_ar}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-black text-sm text-slate-800 mb-1.5">ملاحظات / وصف المهام</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مثال: كاشير الوردية الصباحية بمحل البيع"
                  className="w-full py-2.5 px-3 border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-6 py-2.5 text-sm font-black text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                >
                  {modalLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>حفظ الحساب في قاعدة البيانات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && selectedUserForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
              <span className="font-black text-base flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span>تغيير كلمة المرور لـ {selectedUserForPassword.fullName}</span>
              </span>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-white text-xl cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {passwordModalError && (
              <div className="m-5 p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{passwordModalError}</span>
              </div>
            )}

            <form onSubmit={handleSavePassword} className="p-6 space-y-4">
              <div>
                <label className="block font-black text-xs text-slate-700 mb-1.5">
                  كلمة المرور الجديدة *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  dir="ltr"
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl font-mono text-sm font-bold text-left focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={passwordModalLoading}
                  className="px-5 py-2 text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-md flex items-center gap-1.5"
                >
                  {passwordModalLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>تحديث كلمة المرور</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
