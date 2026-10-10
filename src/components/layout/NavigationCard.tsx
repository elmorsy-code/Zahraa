import React, { useState } from 'react';
import {
  ShoppingCart,
  Coins,
  Layers,
  LayoutDashboard,
  Users,
  Truck,
  Warehouse,
  Landmark,
  BarChart3,
  Receipt,
  FileSpreadsheet,
  Building2,
  Store,
  ArrowLeftRight,
  PackageCheck,
  History,
  BadgeDollarSign,
  BookOpenCheck,
  ShieldCheck,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';
import { storage } from '../../lib/storage';
import { isSupabaseConfigured } from '../../lib/supabase';
import { UserAccount, authService } from '../../lib/auth';

interface NavigationCardProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenPos: () => void;
  currentUser: UserAccount;
  onLogout: () => void;
}

interface Department {
  id: string;
  title: string;
  subtitle: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultTab: string;
  theme: {
    colorName: string;
    // Inactive styling
    iconBg: string;
    iconText: string;
    iconBorder: string;
    // Active styling
    activeBg: string;
    activeBorder: string;
    activeRing: string;
    activeBar: string;
    activeText: string;
    activeBadgeBg: string;
    activeBadgeText: string;
    // Sub-nav styling
    subTabActiveBg: string;
    subTabActiveText: string;
    subTabActiveRing: string;
  };
  tabs: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}

const allDepartments: Department[] = [
  {
    id: 'dashboard',
    title: 'الرئيسية والمؤشرات',
    subtitle: 'نظرة عامة',
    tagline: 'مؤشرات الأداء والأرباح',
    icon: LayoutDashboard,
    defaultTab: 'dashboard',
    theme: {
      colorName: 'sky',
      iconBg: 'bg-sky-50',
      iconText: 'text-sky-600',
      iconBorder: 'border-sky-200',
      activeBg: 'bg-gradient-to-b from-sky-50/70 via-white to-white',
      activeBorder: 'border-sky-500',
      activeRing: 'ring-sky-500/20',
      activeBar: 'bg-sky-500',
      activeText: 'text-sky-950',
      activeBadgeBg: 'bg-sky-100',
      activeBadgeText: 'text-sky-800',
      subTabActiveBg: 'bg-sky-600 hover:bg-sky-700',
      subTabActiveText: 'text-white',
      subTabActiveRing: 'ring-sky-700',
    },
    tabs: [
      { id: 'dashboard', label: 'لوحة التحكم والمؤشرات', icon: LayoutDashboard },
    ],
  },
  {
    id: 'sales_dept',
    title: 'المبيعات و POS',
    subtitle: 'الكاشير والفواتير',
    tagline: 'البيع السريع وطباعة الفواتير',
    icon: ShoppingCart,
    defaultTab: 'pos',
    theme: {
      colorName: 'emerald',
      iconBg: 'bg-emerald-50',
      iconText: 'text-emerald-600',
      iconBorder: 'border-emerald-200',
      activeBg: 'bg-gradient-to-b from-emerald-50/70 via-white to-white',
      activeBorder: 'border-emerald-500',
      activeRing: 'ring-emerald-500/20',
      activeBar: 'bg-emerald-500',
      activeText: 'text-emerald-950',
      activeBadgeBg: 'bg-emerald-100',
      activeBadgeText: 'text-emerald-800',
      subTabActiveBg: 'bg-emerald-600 hover:bg-emerald-700',
      subTabActiveText: 'text-white',
      subTabActiveRing: 'ring-emerald-700',
    },
    tabs: [
      { id: 'pos', label: 'نقطة البيع السريعة (POS)', icon: ShoppingCart },
      { id: 'sales', label: 'سجل فواتير المبيعات', icon: Receipt },
    ],
  },
  {
    id: 'customers_dept',
    title: 'العملاء والحسابات',
    subtitle: 'المزارعين والديون',
    tagline: 'كشوف الحساب وسقف الائتمان',
    icon: Users,
    defaultTab: 'customers',
    theme: {
      colorName: 'amber',
      iconBg: 'bg-amber-50',
      iconText: 'text-amber-700',
      iconBorder: 'border-amber-200',
      activeBg: 'bg-gradient-to-b from-amber-50/70 via-white to-white',
      activeBorder: 'border-amber-500',
      activeRing: 'ring-amber-500/20',
      activeBar: 'bg-amber-500',
      activeText: 'text-amber-950',
      activeBadgeBg: 'bg-amber-100',
      activeBadgeText: 'text-amber-800',
      subTabActiveBg: 'bg-amber-600 hover:bg-amber-700',
      subTabActiveText: 'text-white',
      subTabActiveRing: 'ring-amber-700',
    },
    tabs: [
      { id: 'customers', label: 'دليل العملاء والمزارعين', icon: Users },
      { id: 'customer_ledgers', label: 'كشوف الحسابات والمديونيات', icon: FileSpreadsheet },
    ],
  },
  {
    id: 'purchases_dept',
    title: 'المشتريات والموردون',
    subtitle: 'فواتير التوريد',
    tagline: 'الموردين والشركات والمستحقات',
    icon: Truck,
    defaultTab: 'purchases',
    theme: {
      colorName: 'blue',
      iconBg: 'bg-blue-50',
      iconText: 'text-blue-600',
      iconBorder: 'border-blue-200',
      activeBg: 'bg-gradient-to-b from-blue-50/70 via-white to-white',
      activeBorder: 'border-blue-500',
      activeRing: 'ring-blue-500/20',
      activeBar: 'bg-blue-500',
      activeText: 'text-blue-950',
      activeBadgeBg: 'bg-blue-100',
      activeBadgeText: 'text-blue-800',
      subTabActiveBg: 'bg-blue-600 hover:bg-blue-700',
      subTabActiveText: 'text-white',
      subTabActiveRing: 'ring-blue-700',
    },
    tabs: [
      { id: 'purchases', label: 'فواتير المشتريات والتوريد', icon: Truck },
      { id: 'suppliers', label: 'دليل وحسابات الموردين', icon: Building2 },
    ],
  },
  {
    id: 'inventory_dept',
    title: 'المخازن والأصناف',
    subtitle: 'الجرد والتحويل',
    tagline: 'الرصيد والوحدات والمستودعات',
    icon: Warehouse,
    defaultTab: 'products',
    theme: {
      colorName: 'teal',
      iconBg: 'bg-teal-50',
      iconText: 'text-teal-700',
      iconBorder: 'border-teal-200',
      activeBg: 'bg-gradient-to-b from-teal-50/70 via-white to-white',
      activeBorder: 'border-teal-500',
      activeRing: 'ring-teal-500/20',
      activeBar: 'bg-teal-500',
      activeText: 'text-teal-950',
      activeBadgeBg: 'bg-teal-100',
      activeBadgeText: 'text-teal-800',
      subTabActiveBg: 'bg-teal-600 hover:bg-teal-700',
      subTabActiveText: 'text-white',
      subTabActiveRing: 'ring-teal-700',
    },
    tabs: [
      { id: 'products', label: 'دليل الأصناف والوحدات', icon: PackageCheck },
      { id: 'warehouse_main', label: 'المستودع الرئيسي', icon: Warehouse },
      { id: 'warehouse_shop', label: 'مخزون محل البيع', icon: Store },
      { id: 'transfers', label: 'التحويل بين المخازن', icon: ArrowLeftRight },
      { id: 'stock_movements', label: 'سجل حركة المخزون', icon: History },
    ],
  },
  {
    id: 'treasury_dept',
    title: 'المالية والخزينة',
    subtitle: 'حركة النقدية',
    tagline: 'سندات القبض والصرف واليومية',
    icon: Landmark,
    defaultTab: 'treasury',
    theme: {
      colorName: 'purple',
      iconBg: 'bg-purple-50',
      iconText: 'text-purple-700',
      iconBorder: 'border-purple-200',
      activeBg: 'bg-gradient-to-b from-purple-50/70 via-white to-white',
      activeBorder: 'border-purple-500',
      activeRing: 'ring-purple-500/20',
      activeBar: 'bg-purple-500',
      activeText: 'text-purple-950',
      activeBadgeBg: 'bg-purple-100',
      activeBadgeText: 'text-purple-800',
      subTabActiveBg: 'bg-purple-600 hover:bg-purple-700',
      subTabActiveText: 'text-white',
      subTabActiveRing: 'ring-purple-700',
    },
    tabs: [
      { id: 'treasury', label: 'الخزينة والمصروفات اليومية', icon: Landmark },
      { id: 'payments', label: 'سندات القبض والصرف', icon: BadgeDollarSign },
      { id: 'old_ledgers', label: 'ترحيل الدفاتر القديمة', icon: BookOpenCheck },
    ],
  },
  {
    id: 'management_dept',
    title: 'التقارير والإدارة',
    subtitle: 'الرقابة والصلاحيات',
    tagline: 'الأرباح والتقارير والمستخدمين',
    icon: BarChart3,
    defaultTab: 'reports',
    theme: {
      colorName: 'rose',
      iconBg: 'bg-rose-50',
      iconText: 'text-rose-700',
      iconBorder: 'border-rose-200',
      activeBg: 'bg-gradient-to-b from-rose-50/70 via-white to-white',
      activeBorder: 'border-rose-500',
      activeRing: 'ring-rose-500/20',
      activeBar: 'bg-rose-500',
      activeText: 'text-rose-950',
      activeBadgeBg: 'bg-rose-100',
      activeBadgeText: 'text-rose-800',
      subTabActiveBg: 'bg-rose-600 hover:bg-rose-700',
      subTabActiveText: 'text-white',
      subTabActiveRing: 'ring-rose-700',
    },
    tabs: [
      { id: 'reports', label: 'التقارير المالية والمخزنية', icon: BarChart3 },
      { id: 'users', label: 'المستخدمون والصلاحيات', icon: ShieldCheck },
    ],
  },
];

export const NavigationCard: React.FC<NavigationCardProps> = ({
  activeTab,
  onSelectTab,
  onOpenPos,
  currentUser,
}) => {
  const [totalCashBalance, setTotalCashBalance] = useState(() => {
    return storage.getCashAccounts().reduce((sum, c) => sum + (c.current_balance || 0), 0);
  });
  const isCloud = isSupabaseConfigured();

  React.useEffect(() => {
    const updateBalance = () => {
      const accounts = storage.getCashAccounts();
      setTotalCashBalance(accounts.reduce((sum, c) => sum + (c.current_balance || 0), 0));
    };
    const unsubscribe = storage.subscribe(updateBalance);
    return () => unsubscribe();
  }, []);

  // Filter departments & tabs according to user role permissions
  const allowedDepartments = allDepartments
    .map((dept) => {
      const allowedTabs = dept.tabs.filter((t) => authService.canAccessTab(t.id, currentUser.role));
      return {
        ...dept,
        tabs: allowedTabs,
        defaultTab: allowedTabs[0]?.id || dept.defaultTab,
      };
    })
    .filter((dept) => dept.tabs.length > 0);

  // Find active department among allowed ones
  const currentDept =
    allowedDepartments.find((dept) => dept.tabs.some((t) => t.id === activeTab)) ||
    allowedDepartments[0] ||
    allDepartments[0];

  return (
    <>
      {/* Master Navigation & Departments Portal Card */}
      <div className="card-box border-2 border-slate-200/90 p-4 sm:p-5 mb-8 bg-white shadow-sm space-y-4">
        {/* Tier 1: System Title & Quick Operations Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-xl shadow-xs">
              <Layers className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  أقسام المنظومة الرئيسية
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  {allowedDepartments.length} أقسام متاحة
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                انقر على بطاقة أي قسم للتبديل الفوري والتنقل بين أدواته
              </p>
            </div>
          </div>

          {/* Quick Operations & Status Pills */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* Treasury Balance Pill */}
            {authService.canAccessTab('treasury', currentUser.role) && (
              <div
                onClick={() => onSelectTab('treasury')}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-50 border border-emerald-300 rounded-xl cursor-pointer hover:bg-emerald-100 transition-colors shadow-2xs"
                title="عرض تفاصيل الخزينة وحركة النقدية"
              >
                <Coins className="w-4 h-4 text-emerald-700" />
                <div className="text-xs sm:text-sm leading-none">
                  <span className="text-slate-600 font-bold">الخزينة: </span>
                  <span className="font-black text-emerald-900 tabular-nums text-xs sm:text-sm mr-1">
                    {formatCurrency(totalCashBalance)}
                  </span>
                </div>
              </div>
            )}

            {/* Quick POS CTA */}
            {authService.canAccessTab('pos', currentUser.role) && (
              <button
                onClick={onOpenPos}
                type="button"
                className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-all whitespace-nowrap cursor-pointer active:scale-95"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>نقطة البيع (POS)</span>
              </button>
            )}
          </div>
        </div>

        {/* Tier 2: DISTINCTIVE DEPARTMENT CARDS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
          {allowedDepartments.map((dept) => {
            const Icon = dept.icon;
            const isDeptActive = dept.id === currentDept.id;
            const { theme } = dept;

            return (
              <button
                key={dept.id}
                onClick={() => onSelectTab(dept.defaultTab)}
                type="button"
                className={`relative text-right rounded-2xl p-3 sm:p-3.5 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden group select-none ${
                  isDeptActive
                    ? `${theme.activeBg} border-2 ${theme.activeBorder} shadow-md ring-2 ${theme.activeRing} -translate-y-0.5`
                    : 'bg-white hover:bg-slate-50/80 border-2 border-slate-200/90 hover:border-slate-300 hover:shadow-xs hover:-translate-y-0.5'
                }`}
              >
                {/* Top Accent Strip */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 transition-opacity ${
                    isDeptActive ? theme.activeBar : 'opacity-0 group-hover:opacity-40 ' + theme.activeBar
                  }`}
                />

                {/* Top Row: Icon Container + Counter / Active Badge */}
                <div className="flex items-start justify-between gap-1.5 mb-2.5 w-full">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border transition-transform duration-200 group-hover:scale-105 shrink-0 ${
                      isDeptActive
                        ? `${theme.activeBar} text-white border-transparent shadow-xs`
                        : `${theme.iconBg} ${theme.iconText} ${theme.iconBorder}`
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Badge */}
                  {isDeptActive ? (
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full ${theme.activeBadgeBg} ${theme.activeBadgeText} border border-current/20`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      نشط
                    </span>
                  ) : (
                    <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                      {dept.tabs.length === 1 ? 'شاشة' : `${dept.tabs.length} شاشات`}
                    </span>
                  )}
                </div>

                {/* Middle: Title & Tagline */}
                <div className="space-y-0.5 text-right w-full">
                  <h3
                    className={`text-xs sm:text-sm font-black tracking-tight leading-snug transition-colors line-clamp-1 ${
                      isDeptActive ? theme.activeText : 'text-slate-800 group-hover:text-slate-950'
                    }`}
                  >
                    {dept.title}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 line-clamp-1 hidden xs:block">
                    {dept.subtitle}
                  </p>
                </div>

                {/* Bottom: Micro Action / Arrow Indicator */}
                <div className="pt-2 mt-2 border-t border-slate-100/90 flex items-center justify-between text-[10px] sm:text-[11px] w-full">
                  <span
                    className={`font-bold transition-colors ${
                      isDeptActive ? theme.activeText : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    {isDeptActive ? 'القسم الحالي' : 'فتح القسم'}
                  </span>
                  <ChevronLeft
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isDeptActive
                        ? `${theme.iconText} -translate-x-0.5`
                        : 'text-slate-400 group-hover:text-slate-700 group-hover:-translate-x-0.5'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Tier 3: Sub-pages Bar of Active Department (if it has more than 1 tab) */}
        {currentDept.tabs.length > 1 && (
          <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 mt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-800 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs sm:text-sm font-black">
                  شاشات وأدوات قسم {currentDept.title}:
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-wrap">
                {currentDept.tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isTabActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => onSelectTab(tab.id)}
                      type="button"
                      className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                        isTabActive
                          ? `${currentDept.theme.subTabActiveBg} ${currentDept.theme.subTabActiveText} shadow-xs ring-2 ${currentDept.theme.subTabActiveRing}`
                          : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 border border-slate-200 shadow-2xs'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
