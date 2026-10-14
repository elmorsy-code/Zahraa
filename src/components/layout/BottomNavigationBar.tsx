import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Pill,
  Receipt,
  Landmark,
  BarChart3,
  FileSpreadsheet,
  Truck,
  BookOpenCheck,
} from 'lucide-react';
import { storage } from '../../lib/storage';
import { UserAccount, authService } from '../../lib/auth';

interface BottomNavigationBarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: UserAccount;
  onLogout?: () => void;
}

interface NavDepartment {
  id: string;
  title: string;
  shortTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultTab: string;
  badge?: () => string | number | null;
  color: {
    activeText: string;
    activeBg: string;
    activeBorder: string;
    activeIndicator: string;
    hoverText: string;
  };
  subTabs: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}

export const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
}) => {
  const [, setDataTick] = useState(0);

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setDataTick((t) => t + 1);
    });
    return () => unsub();
  }, []);

  const customersCount = storage.getCustomers().length;
  const productsCount = storage.getProducts().length;
  const invoicesCount = storage.getPurchaseInvoices().length;
  const totalCustomerDebt = storage
    .getCustomers()
    .reduce((sum, c) => sum + Math.max(0, c.current_balance || 0), 0);

  const departments: NavDepartment[] = [
    {
      id: 'dashboard',
      title: 'الرئيسية',
      shortTitle: 'الرئيسية',
      icon: LayoutDashboard,
      defaultTab: 'dashboard',
      badge: () => null,
      color: {
        activeText: 'text-sky-600',
        activeBg: 'bg-sky-50',
        activeBorder: 'border-sky-500',
        activeIndicator: 'bg-sky-600',
        hoverText: 'group-hover:text-sky-600',
      },
      subTabs: [
        { id: 'dashboard', label: 'لوحة المؤشرات', icon: LayoutDashboard },
      ],
    },
    {
      id: 'customers',
      title: 'العملاء',
      shortTitle: 'العملاء',
      icon: Users,
      defaultTab: 'customers',
      badge: () => (customersCount > 0 ? customersCount : null),
      color: {
        activeText: 'text-blue-600',
        activeBg: 'bg-blue-50',
        activeBorder: 'border-blue-500',
        activeIndicator: 'bg-blue-600',
        hoverText: 'group-hover:text-blue-600',
      },
      subTabs: [
        { id: 'customers', label: 'دليل وسجل العملاء', icon: Users },
      ],
    },
    {
      id: 'debts',
      title: 'المديونيات',
      shortTitle: 'المديونيات',
      icon: ShoppingBag,
      defaultTab: 'debts',
      badge: () => (totalCustomerDebt > 0 ? 'ديون' : null),
      color: {
        activeText: 'text-amber-600',
        activeBg: 'bg-amber-50',
        activeBorder: 'border-amber-500',
        activeIndicator: 'bg-amber-600',
        hoverText: 'group-hover:text-amber-600',
      },
      subTabs: [
        { id: 'debts', label: 'سجل المشتريات والمديونيات', icon: ShoppingBag },
        { id: 'customer_ledgers', label: 'كشوف الحسابات', icon: FileSpreadsheet },
      ],
    },
    {
      id: 'products',
      title: 'الأصناف',
      shortTitle: 'الأدوية',
      icon: Pill,
      defaultTab: 'products',
      badge: () => (productsCount > 0 ? productsCount : null),
      color: {
        activeText: 'text-teal-600',
        activeBg: 'bg-teal-50',
        activeBorder: 'border-teal-500',
        activeIndicator: 'bg-teal-600',
        hoverText: 'group-hover:text-teal-600',
      },
      subTabs: [
        { id: 'products', label: 'أسماء الأدوية المضافة', icon: Pill },
      ],
    },
    {
      id: 'invoices',
      title: 'الفواتير',
      shortTitle: 'الفواتير',
      icon: Receipt,
      defaultTab: 'invoices',
      badge: () => (invoicesCount > 0 ? invoicesCount : null),
      color: {
        activeText: 'text-violet-600',
        activeBg: 'bg-violet-50',
        activeBorder: 'border-violet-500',
        activeIndicator: 'bg-violet-600',
        hoverText: 'group-hover:text-violet-600',
      },
      subTabs: [
        { id: 'invoices', label: 'فواتير المشتريات', icon: Receipt },
        { id: 'suppliers', label: 'دليل وحسابات الموردين', icon: Truck },
      ],
    },
    {
      id: 'treasury',
      title: 'الخزينة',
      shortTitle: 'الخزينة',
      icon: Landmark,
      defaultTab: 'treasury',
      badge: () => null,
      color: {
        activeText: 'text-emerald-600',
        activeBg: 'bg-emerald-50',
        activeBorder: 'border-emerald-500',
        activeIndicator: 'bg-emerald-600',
        hoverText: 'group-hover:text-emerald-600',
      },
      subTabs: [
        { id: 'treasury', label: 'الخزينة والمصروفات', icon: Landmark },
        { id: 'old_ledgers', label: 'ترحيل الدفاتر القديمة', icon: BookOpenCheck },
      ],
    },
    {
      id: 'reports',
      title: 'التقارير',
      shortTitle: 'التقارير',
      icon: BarChart3,
      defaultTab: 'reports',
      badge: () => null,
      color: {
        activeText: 'text-rose-600',
        activeBg: 'bg-rose-50',
        activeBorder: 'border-rose-500',
        activeIndicator: 'bg-rose-600',
        hoverText: 'group-hover:text-rose-600',
      },
      subTabs: [
        { id: 'reports', label: 'التقارير المالية والديون', icon: BarChart3 },
      ],
    },
  ];

  // Filter departments by role permissions
  const allowedDepartments = departments
    .map((dept) => {
      const allowedSubTabs = dept.subTabs.filter((t) =>
        authService.canAccessTab(t.id, currentUser.role)
      );
      return {
        ...dept,
        subTabs: allowedSubTabs,
      };
    })
    .filter(
      (dept) =>
        authService.canAccessTab(dept.id, currentUser.role) ||
        authService.canAccessTab(dept.defaultTab, currentUser.role) ||
        dept.subTabs.length > 0
    );

  // Active department matching activeTab
  const currentDept =
    allowedDepartments.find(
      (dept) =>
        dept.id === activeTab ||
        dept.defaultTab === activeTab ||
        dept.subTabs.some((t) => t.id === activeTab)
    ) || allowedDepartments[0];

  return (
    <nav
      aria-label="شريط الأقسام الرئيسي"
      className="fixed bottom-0 inset-x-0 z-40 print:hidden"
    >
      {/* Contextual Sub-Tab Bar (Shows right above bottom bar when active department has multiple tabs) */}
      {currentDept && currentDept.subTabs.length > 1 && (
        <div className="bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-white py-2 px-3 sm:px-6 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2 text-xs font-black text-slate-300 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>شاشات {currentDept.title}:</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {currentDept.subTabs.map((subTab) => {
                const SubIcon = subTab.icon;
                const isSubActive = activeTab === subTab.id;
                return (
                  <button
                    key={subTab.id}
                    onClick={() => onSelectTab(subTab.id)}
                    type="button"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      isSubActive
                        ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-400/40'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    <SubIcon className="w-3.5 h-3.5" />
                    <span>{subTab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Navigation Bar */}
      <div className="bg-white/95 backdrop-blur-lg border-t-2 border-slate-200 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
        <div className="max-w-5xl mx-auto px-1 sm:px-4">
          <div className="flex items-stretch justify-around sm:justify-center sm:gap-2 h-16 sm:h-18">
            {allowedDepartments.map((dept) => {
              const Icon = dept.icon;
              const isDeptActive =
                dept.id === activeTab ||
                dept.defaultTab === activeTab ||
                dept.subTabs.some((t) => t.id === activeTab);
              const badgeVal = dept.badge ? dept.badge() : null;

              return (
                <button
                  key={dept.id}
                  onClick={() => onSelectTab(dept.defaultTab)}
                  type="button"
                  aria-current={isDeptActive ? 'page' : undefined}
                  className={`group relative flex-1 sm:flex-initial sm:min-w-[84px] md:min-w-[96px] flex flex-col items-center justify-center py-1 sm:py-2 px-1 sm:px-2 rounded-xl transition-all duration-200 cursor-pointer select-none ${
                    isDeptActive
                      ? `${dept.color.activeBg} font-black`
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {/* Active Top Glow/Bar Indicator */}
                  {isDeptActive && (
                    <span
                      className={`absolute top-0 inset-x-3 sm:inset-x-4 h-1 rounded-b-full ${dept.color.activeIndicator} shadow-xs`}
                    />
                  )}

                  {/* Icon & Badge Wrapper */}
                  <div className="relative flex items-center justify-center mb-0.5 sm:mb-1">
                    <div
                      className={`p-1.5 rounded-xl transition-all duration-200 ${
                        isDeptActive
                          ? `${dept.color.activeText} scale-110`
                          : `text-slate-500 ${dept.color.hoverText} group-hover:scale-105`
                      }`}
                    >
                      <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                    </div>

                    {/* Numeric or Text Badge */}
                    {badgeVal !== null && (
                      <span
                        className={`absolute -top-1 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-black rounded-full leading-none shadow-xs ${
                          isDeptActive
                            ? 'bg-rose-500 text-white'
                            : 'bg-slate-700 text-white group-hover:bg-rose-500'
                        }`}
                      >
                        {badgeVal}
                      </span>
                    )}
                  </div>

                  {/* Department Title */}
                  <span
                    className={`text-[10px] sm:text-xs tracking-tight transition-colors truncate max-w-[68px] sm:max-w-none text-center ${
                      isDeptActive
                        ? `${dept.color.activeText} font-black`
                        : 'font-bold text-slate-600 group-hover:text-slate-900'
                    }`}
                  >
                    {dept.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
