import React, { useState } from 'react';
import { ShieldCheck, User, Mail, Lock, Phone, AlertCircle, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { APP_CONFIG } from '../../lib/branding';
import { authService, UserAccount } from '../../lib/auth';

interface Props {
  onSuccess: (user: UserAccount) => void;
}

export const InitialAdminSetupScreen: React.FC<Props> = ({ onSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('يرجى إدخال اسم المدير بالكامل');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('كلمة المرور يجب أن لا تقل عن 6 أحرف أو أرقام');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.createInitialAdmin({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
      });

      if (!res.success || !res.user) {
        setErrorMsg(res.error || 'فشل إنشاء حساب المدير الأول');
        setLoading(false);
        return;
      }

      onSuccess(res.user);
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ غير متوقع أثناء إعداد الحساب');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-xl space-y-6">
        {/* Header branding */}
        <div className="card-box p-6 sm:p-8 border-2 border-slate-200 text-center bg-white shadow-md">
          <div className="flex flex-col items-center space-y-3">
            <img
              src={APP_CONFIG.logo}
              alt={APP_CONFIG.name}
              className="h-20 w-auto object-contain"
            />
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                {APP_CONFIG.name}
              </h1>
              <p className="text-sm font-bold text-emerald-800">
                {APP_CONFIG.fullName}
              </p>
            </div>
          </div>
        </div>

        {/* Setup Form Card */}
        <div className="card-box p-6 sm:p-8 border border-slate-300 bg-white shadow-lg space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
            <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                <span>تهيئة حساب المدير العام الأول</span>
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
              </h2>
              <p className="text-xs font-bold text-slate-500">
                قاعدة البيانات متصلة وجاهزة، أنشئ أول حساب لإدارة كافة أقسام المنظومة
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-center gap-2.5 text-xs font-bold text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم المدير العام بالكامل *
              </label>
              <div className="relative">
                <User className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: المهندس محمد أحمد"
                  className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  البريد الإلكتروني للدخول *
                </label>
                <div className="relative">
                  <Mail className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@alzahraa.com"
                    dir="ltr"
                    className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-left"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الهاتف (اختياري)
                </label>
                <div className="relative">
                  <Phone className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    dir="ltr"
                    className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-left"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  كلمة المرور *
                </label>
                <div className="relative">
                  <Lock className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6 أحرف على الأقل"
                    dir="ltr"
                    className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-left"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تأكيد كلمة المرور *
                </label>
                <div className="relative">
                  <Lock className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور"
                    dir="ltr"
                    className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-left"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>سيحصل هذا الحساب على كامل صلاحيات المدير العام والتحكم في إضافة موظفي الصيدلية والمخزن لاحقاً.</span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ إنشاء الحساب وتهيئة المنظومة...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>إنشاء حساب المدير والدخول إلى المنظومة</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
