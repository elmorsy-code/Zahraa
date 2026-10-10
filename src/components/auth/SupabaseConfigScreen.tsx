import React from 'react';
import { Database, AlertTriangle, Key, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-react';
import { APP_CONFIG } from '../../lib/branding';

interface Props {
  onRetry: () => void;
}

export const SupabaseConfigScreen: React.FC<Props> = ({ onRetry }) => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans text-slate-100">
      <div className="w-full max-w-2xl space-y-6">
        {/* Branding header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-4 rounded-3xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 mb-2 shadow-inner">
            <Database className="w-12 h-12" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {APP_CONFIG.name}
          </h1>
          <p className="text-sm sm:text-base font-bold text-emerald-400">
            منظومة إدارة المحل والمخازن الزراعية المتكاملة
          </p>
        </div>

        {/* Warning & Instructions Card */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-md">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
            <AlertTriangle className="w-6 h-6 shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-black text-base text-amber-300">
                يلزم ضبط إعدادات الاتصال بقاعدة بيانات Supabase
              </p>
              <p className="text-slate-300 leading-relaxed font-medium">
                النظام مهيأ للعمل الفعلي والحقيقي 100% على قاعدة بيانات السحاب Supabase، وتم إيقاف العمل بالوضع التجريبي المحلي (localStorage). ليعمل النظام، يرجى تزويد متغيرات البيئة التالية:
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>متغيرات البيئة المطلوبة (Secrets / Environment Variables):</span>
              <span className="text-emerald-400">مطلوبة للتشغيل</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 bg-slate-900/90 border border-slate-700 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 font-bold">VITE_SUPABASE_URL</span>
                </div>
                <span className="text-slate-400 text-[11px] font-sans">رابط مشروع Supabase الخاص بك</span>
              </div>

              <div className="p-3 bg-slate-900/90 border border-slate-700 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 font-bold">VITE_SUPABASE_ANON_KEY</span>
                </div>
                <span className="text-slate-400 text-[11px] font-sans">المفتاح العام (anon public key)</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700 space-y-2 text-xs">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>خطوات الإعداد السريعة:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-400 leading-relaxed">
              <li>ادخل إلى لوحة التحكم في Supabase &gt; Project Settings &gt; API.</li>
              <li>انسخ Project URL وضعها في القيمة <code className="text-emerald-300">VITE_SUPABASE_URL</code>.</li>
              <li>انسخ anon public Key وضعها في <code className="text-emerald-300">VITE_SUPABASE_ANON_KEY</code>.</li>
              <li>تأكد من تشغيل ملفات الـ migrations بالترتيب في SQL Editor.</li>
            </ol>
          </div>

          <div className="pt-2">
            <button
              onClick={onRetry}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-[0.99] text-white font-black text-sm cursor-pointer shadow-lg shadow-emerald-950 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة فحص الاتصال بقاعدة البيانات</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
