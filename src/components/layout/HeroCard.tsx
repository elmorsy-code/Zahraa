import React, { useEffect, useState } from 'react';
import {
  ShoppingCart,
  Warehouse,
  Users,
  Store,
  Calendar,
  Sparkles,
  ArrowLeft,
  Coins,
  ShieldCheck,
  CheckCircle2,
  FileText,
  AlertTriangle,
  TrendingUp,
  Clock,
  Activity,
  Layers,
  ChevronLeft,
} from 'lucide-react';
import { APP_CONFIG } from '../../lib/branding';
import { UserAccount } from '../../lib/auth';
import { storage } from '../../lib/storage';
import { formatCurrency } from '../../lib/formatters';

interface HeroCardProps {
  onOpenPos: () => void;
  onNavigate?: (tab: string) => void;
  currentUser?: UserAccount;
}

export const HeroCard: React.FC<HeroCardProps> = ({
  onOpenPos,
  onNavigate,
  currentUser,
}) => {
  // Real-time live data state from storage cache
  const [, setTick] = useState(0);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const unsub = storage.subscribe(() => setTick((t) => t + 1));
    return () => unsub();
  }, []);

  // Live time ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut listener for F2 -> Open POS, F4 -> Ledgers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        onOpenPos();
      } else if (e.key === 'F4') {
        e.preventDefault();
        onNavigate?.('customer_ledgers');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenPos, onNavigate]);

  // Current date formatted in Arabic
  const todayArabic = new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  // Calculations from storage
  const products = storage.getProducts();
  const salesInvoices = storage.getSalesInvoices();
  const customers = storage.getCustomers();
  const cashAccounts = storage.getCashAccounts();

  const totalCash = cashAccounts.reduce((sum, c) => sum + (c.current_balance || 0), 0);
  const totalCustomerDebt = customers.reduce(
    (sum, c) => sum + Math.max(0, c.current_balance || 0),
    0
  );
  const lowStockCount = products.filter(
    (p) => (p.stock_shop || 0) + (p.stock_warehouse || 0) <= (p.min_stock_alert || 0)
  ).length;

  // Today sales count
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = salesInvoices.filter((inv) =>
    (inv.created_at || '').startsWith(todayStr)
  );

  return (
    <div
      className="relative rounded-3xl overflow-hidden mb-6 sm:mb-8 border text-white shadow-2xl transition-all duration-300"
      style={{
        background: 'radial-gradient(ellipse at 85% 15%, var(--theme-dark-surface, #0b1f18) 0%, var(--theme-dark-bg, #041410) 65%, #020705 100%)',
        borderColor: 'var(--theme-accent, #10b981)40',
      }}
    >
      {/* Decorative ambient background glows dynamically tinted with current theme accent */}
      <div
        className="absolute -top-24 -right-12 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-colors duration-500"
        style={{ backgroundColor: 'var(--theme-accent, #10b981)', opacity: 0.16 }}
      />
      <div
        className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-colors duration-500"
        style={{ backgroundColor: 'var(--theme-highlight, #34d399)', opacity: 0.1 }}
      />
      <div
        className="absolute -bottom-20 -left-12 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-colors duration-500"
        style={{ backgroundColor: 'var(--theme-accent, #10b981)', opacity: 0.1 }}
      />

      {/* Modern architectural subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, var(--theme-highlight, #10b981) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative z-10 p-3.5 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
        {/* 1. TOP STATUS BAR: Live Supabase Status, Shift, Branch, User Account, Arabic Date & Clock */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 sm:pb-4 border-b border-white/10 text-xs font-bold">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
            {/* Live Database Status Pill */}
            <span
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border text-[11px] sm:text-xs shadow-xs"
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderColor: 'var(--theme-accent, #10b981)50',
                color: 'var(--theme-highlight, #a7f3d0)',
              }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'var(--theme-accent, #10b981)' }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: 'var(--theme-highlight, #34d399)' }} />
              </span>
              <span className="tracking-wide">سحابة Supabase متصلة</span>
            </span>

            {/* Shift Pill */}
            <span className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[11px] sm:text-xs">
              <Activity className="w-3.5 h-3.5 text-teal-400" />
              <span>الوردية مفتوحة</span>
            </span>

            {/* Branch Pill */}
            <span className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[11px] sm:text-xs">
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate max-w-[140px] sm:max-w-none">{APP_CONFIG.branchName}</span>
            </span>

            {/* Active User Pill */}
            {currentUser && (
              <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-slate-900/90 border border-white/10 text-slate-200 text-[11px] sm:text-xs">
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black text-white ${
                    currentUser.avatarColor || 'bg-slate-700'
                  }`}
                >
                  {currentUser.fullName ? currentUser.fullName.charAt(0) : 'م'}
                </div>
                <span className="truncate max-w-[100px] sm:max-w-none">{currentUser.fullName}</span>
                <span
                  className="text-[10px] px-1.5 py-0.2 rounded font-bold"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: 'var(--theme-highlight, #6ee7b7)',
                  }}
                >
                  {currentUser.roleNameAr}
                </span>
              </span>
            )}
          </div>

          {/* Live Date and Digital Clock */}
          <div className="flex items-center gap-2 sm:gap-3 text-slate-300 self-end sm:self-auto text-[11px] sm:text-xs font-semibold">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span className="whitespace-nowrap">{todayArabic}</span>
            </div>
            {currentTime && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border font-mono tracking-wider"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  borderColor: 'var(--theme-accent, #10b981)40',
                  color: 'var(--theme-highlight, #34d399)',
                }}
              >
                <Clock className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">{currentTime}</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. MAIN EXECUTIVE HERO CONTENT & INTERACTIVE COCKPIT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8 items-center">
          {/* Right Column: Identity, Headline, Core Value, Strategic Actions */}
          <div className="lg:col-span-7 space-y-3.5 sm:space-y-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-2.5 rounded-2xl bg-white shadow-xl border border-white/20 shrink-0 group transition-transform hover:scale-105">
                <img
                  src={APP_CONFIG.logo}
                  alt={APP_CONFIG.name}
                  className="h-10 sm:h-14 md:h-16 w-auto object-contain"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                    {APP_CONFIG.name}
                  </h2>
                  <span
                    className="px-2.5 py-0.5 rounded-lg text-[11px] font-black border flex items-center gap-1 shadow-xs"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderColor: 'var(--theme-accent, #10b981)50',
                      color: 'var(--theme-highlight, #6ee7b7)',
                    }}
                  >
                    <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>المنظومة المركزية</span>
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
                  الصيدلية الزراعية المتخصصة · المستودعات المركزية · حسابات المزارعين · نقاط البيع المباشر
                </p>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-[30px] font-black tracking-tight leading-snug text-white">
              منظومة المتابعة والتحكم الفوري للمبيعات والمخازن
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium max-w-xl">
              إصدار فواتير البيع الفورية والآجلة، الرقابة التامة على مخزون الأدوية والمبيدات والأسمدة
              بين المحل والمستودع الرئيسي، وتحصيل مديونيات المزارعين بسلاسة ودقة.
            </p>

            {/* Fast Strategic Actions Bar - Fully Responsive */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 pt-2">
              {/* Primary High-Impact POS CTA */}
              <button
                onClick={onOpenPos}
                type="button"
                className="group relative inline-flex items-center justify-center gap-2.5 px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl active:scale-98 font-black text-xs sm:text-sm cursor-pointer shadow-xl transition-all duration-200 w-full sm:w-auto"
                style={{
                  background: 'linear-gradient(135deg, var(--theme-highlight, #34d399), var(--theme-accent, #059669))',
                  color: '#ffffff',
                }}
              >
                <div className="p-1 rounded-lg bg-black/20 group-hover:scale-110 transition-transform">
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>
                <span>فتح نقطة البيع السريعة (POS)</span>
                <span className="px-2 py-0.5 rounded-md bg-black/20 text-white text-[11px] font-black tracking-wider">
                  F2
                </span>
              </button>

              {/* Secondary Actions in Responsive Grid */}
              <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
                {/* Secondary Action: Farmer Ledgers */}
                <button
                  onClick={() => onNavigate?.('customer_ledgers')}
                  type="button"
                  className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-white font-bold text-xs cursor-pointer border border-white/15 transition-all duration-150 active:scale-95 shadow-xs"
                >
                  <Users className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">كشوف المزارعين</span>
                </button>

                {/* Secondary Action: Warehouse */}
                <button
                  onClick={() => onNavigate?.('warehouse_main')}
                  type="button"
                  className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-white font-bold text-xs cursor-pointer border border-white/15 transition-all duration-150 active:scale-95 shadow-xs"
                >
                  <Warehouse className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">المخازن</span>
                </button>

                {/* Secondary Action: Treasury */}
                <button
                  onClick={() => onNavigate?.('treasury')}
                  type="button"
                  className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-white font-bold text-xs cursor-pointer border border-white/15 transition-all duration-150 active:scale-95 shadow-xs"
                >
                  <Coins className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">الخزينة</span>
                </button>
              </div>
            </div>
          </div>

          {/* Left Column: 4 Interactive Live KPI Cockpit Cards */}
          <div className="lg:col-span-5 grid grid-cols-1 min-[480px]:grid-cols-2 gap-2.5 sm:gap-3.5">
            {/* KPI 1: Live Treasury Cash Balance */}
            <div
              onClick={() => onNavigate?.('treasury')}
              className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-all duration-200 cursor-pointer group flex flex-col justify-between backdrop-blur-xs shadow-md"
              style={{
                borderColor: 'var(--theme-accent, #10b981)30',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300">السيولة النقدية والخزينة</span>
                <div
                  className="p-1.5 sm:p-2 rounded-xl group-hover:scale-110 transition-all"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: 'var(--theme-highlight, #34d399)',
                  }}
                >
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-base sm:text-lg font-black text-white group-hover:text-emerald-300 transition-colors tracking-tight">
                  {formatCurrency(totalCash)}
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400 font-medium">
                  <span>خزينة المحل والبنك</span>
                  <div
                    className="flex items-center gap-0.5 group-hover:-translate-x-1 transition-transform font-bold text-[11px]"
                    style={{ color: 'var(--theme-highlight, #34d399)' }}
                  >
                    <span>عرض</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* KPI 2: Farmer Outstanding Receivables */}
            <div
              onClick={() => onNavigate?.('customer_ledgers')}
              className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-sky-500/50 transition-all duration-200 cursor-pointer group flex flex-col justify-between backdrop-blur-xs shadow-md"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300">ذمم ومديونيات المزارعين</span>
                <div className="p-1.5 sm:p-2 rounded-xl bg-sky-500/20 text-sky-400 group-hover:scale-110 group-hover:bg-sky-500/30 transition-all">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-base sm:text-lg font-black text-white group-hover:text-sky-300 transition-colors tracking-tight">
                  {formatCurrency(totalCustomerDebt)}
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400 font-medium">
                  <span>{customers.length} مزارع مسجل</span>
                  <div className="flex items-center gap-0.5 text-sky-400 group-hover:-translate-x-1 transition-transform font-bold text-[11px]">
                    <span>الكشوف</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* KPI 3: Products & Inventory Safety */}
            <div
              onClick={() => onNavigate?.('products')}
              className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-amber-500/50 transition-all duration-200 cursor-pointer group flex flex-col justify-between backdrop-blur-xs shadow-md"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300">الأصناف والمخزون</span>
                <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-110 group-hover:bg-amber-500/30 transition-all">
                  <Warehouse className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-base sm:text-lg font-black text-white group-hover:text-amber-300 transition-colors tracking-tight">
                  {products.length} صنف مسجل
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400 font-medium">
                  {lowStockCount > 0 ? (
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {lowStockCount} قارب على النفاد
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      المخزون بوضع آمن
                    </span>
                  )}
                  <div className="flex items-center gap-0.5 text-amber-400 group-hover:-translate-x-1 transition-transform font-bold text-[11px]">
                    <span>الأصناف</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* KPI 4: Sales Invoices & Today's Volume */}
            <div
              onClick={() => onNavigate?.('sales')}
              className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-all duration-200 cursor-pointer group flex flex-col justify-between backdrop-blur-xs shadow-md"
              style={{
                borderColor: 'var(--theme-accent, #10b981)30',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300">سجل فواتير البيع</span>
                <div className="p-1.5 sm:p-2 rounded-xl bg-teal-500/20 text-teal-400 group-hover:scale-110 group-hover:bg-teal-500/30 transition-all">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-base sm:text-lg font-black text-white group-hover:text-emerald-300 transition-colors tracking-tight">
                  {salesInvoices.length} فاتورة صادرة
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400 font-medium">
                  <span>{todaySales.length} فاتورة اليوم</span>
                  <div className="flex items-center gap-0.5 text-teal-400 group-hover:-translate-x-1 transition-transform font-bold text-[11px]">
                    <span>السجل</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. BOTTOM ARCHITECTURAL TICKER: Multi-warehouse status & fast badges */}
        <div className="pt-2.5 sm:pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-400 font-medium">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--theme-accent, #10b981)' }} />
              <span>محل البيع المباشر (SHOP): نشط</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span>المستودع الرئيسي (WH-MAIN): متصل</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>العمليات التلقائية: مفعلة</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[10px] sm:text-[11px]">
            <span>نظام الباركود والطابعات الحرارية (80mm) مدعوم</span>
          </div>
        </div>
      </div>
    </div>
  );
};
