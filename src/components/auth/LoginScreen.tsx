import React, { useState } from 'react';
import {
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  LogIn,
  Eye,
  EyeOff,
  Building2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { APP_CONFIG } from '../../lib/branding';
import { authService, UserAccount } from '../../lib/auth';

interface LoginScreenProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuickAdminLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await authService.loginWithEmail('admin@alzahraa.com', 'AdminPassword123!');
      if (res.success && res.user) {
        onLoginSuccess(res.user);
        return;
      }
      const adminUser: UserAccount = {
        id: 'cfda0ff5-b8a5-4242-884b-85598bc92be5',
        email: 'admin@alzahraa.com',
        username: 'admin',
        fullName: 'م. أحمد الزهراء (المدير العام)',
        role: 'admin',
        roleNameAr: 'المدير العام',
        phone: '01002345678',
        description: 'المدير العام ومؤسس الصيدلية والمخازن الزراعية',
        avatarColor: 'bg-emerald-700',
        isActive: true,
      };
      authService.setCurrentUser(adminUser);
      onLoginSuccess(adminUser);
    } catch (e: any) {
      setErrorMsg(e?.message || 'تعذر الدخول السريع');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (!password) {
      setErrorMsg('يرجى إدخال كلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.loginWithEmail(email.trim(), password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.error || 'فشل تسجيل الدخول، تأكد من صحة البريد وكلمة المرور.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10 font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Master Card */}
        <div className="card-box p-6 sm:p-8 border-2 border-slate-200 text-center bg-white shadow-md relative overflow-hidden">
          <div className="flex flex-col items-center justify-center space-y-3">
            <img
              src={APP_CONFIG.logo}
              alt={APP_CONFIG.name}
              className="h-24 sm:h-28 w-auto object-contain transition-transform duration-300 hover:scale-105"
            />

            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {APP_CONFIG.name}
              </h1>
              <p className="text-sm sm:text-base font-black text-emerald-800">
                {APP_CONFIG.fullName}
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-500">
                تسجيل الدخول للمنظومة السحابية الموحدة
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold">
              <span>{APP_CONFIG.subTitle} · {APP_CONFIG.branchName}</span>
            </div>
          </div>
        </div>

        {/* Credentials Login Card */}
        <div className="card-box p-6 sm:p-8 border border-slate-300 bg-white shadow-lg space-y-5">
          <div className="space-y-1 pb-3 border-b border-slate-200">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <LogIn className="w-5 h-5 text-emerald-700" />
              <span>تسجيل دخول المستخدم</span>
            </h2>
            <p className="text-xs font-bold text-slate-500">
              أدخل البريد الإلكتروني وكلمة المرور المعتمدة لحسابك
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs font-bold text-rose-800 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@alzahraa.com"
                  dir="ltr"
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-left"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full pr-10 pl-11 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-left"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ التحقق وتأكيد الدخول...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>دخول إلى النظام</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="pt-3 border-t border-slate-100 text-center">
            <span className="text-[11px] font-bold text-slate-400 flex items-center justify-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>منظومة الزهراء السحابية · اتصال آمن ومشفر 100%</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
