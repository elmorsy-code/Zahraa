import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
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
  Settings,
} from 'lucide-react';

interface SectionTabsBarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

interface Department {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultTab: string;
  tabs: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}

const departments: Department[] = [
  {
    id: 'dashboard',
    title: 'الرئيسية والمؤشرات',
    icon: LayoutDashboard,
    defaultTab: 'dashboard',
    tabs: [
      { id: 'dashboard', label: 'لوحة التحكم والملخص', icon: LayoutDashboard },
    ],
  },
  {
    id: 'sales_dept',
    title: 'المبيعات و POS',
    icon: ShoppingCart,
    defaultTab: 'pos',
    tabs: [
      { id: 'pos', label: 'نقطة البيع (POS)', icon: ShoppingCart },
      { id: 'sales', label: 'فواتير البيع المسجلة', icon: Receipt },
    ],
  },
  {
    id: 'customers_dept',
    title: 'العملاء والحسابات',
    icon: Users,
    defaultTab: 'customers',
    tabs: [
      { id: 'customers', label: 'دليل العملاء والمزارعين', icon: Users },
      { id: 'customer_ledgers', label: 'كشوف الحسابات والمديونيات', icon: FileSpreadsheet },
    ],
  },
  {
    id: 'purchases_dept',
    title: 'المشتريات والموردون',
    icon: Truck,
    defaultTab: 'purchases',
    tabs: [
      { id: 'purchases', label: 'فواتير المشتريات والتوريد', icon: Truck },
      { id: 'suppliers', label: 'دليل وحسابات الموردين', icon: Building2 },
    ],
  },
  {
    id: 'inventory_dept',
    title: 'المخازن والأصناف',
    icon: Warehouse,
    defaultTab: 'products',
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
    icon: Landmark,
    defaultTab: 'treasury',
    tabs: [
      { id: 'treasury', label: 'الخزينة والمصروفات', icon: Landmark },
      { id: 'payments', label: 'سندات القبض والصرف', icon: BadgeDollarSign },
      { id: 'old_ledgers', label: 'ترحيل الدفاتر القديمة', icon: BookOpenCheck },
    ],
  },
  {
    id: 'management_dept',
    title: 'التقارير والإدارة',
    icon: BarChart3,
    defaultTab: 'reports',
    tabs: [
      { id: 'reports', label: 'التقارير الشاملة', icon: BarChart3 },
      { id: 'users', label: 'المستخدمون والصلاحيات', icon: ShieldCheck },
      { id: 'settings', label: 'إعدادات النظام', icon: Settings },
    ],
  },
];

export const SectionTabsBar: React.FC<SectionTabsBarProps> = ({
  activeTab,
  onSelectTab,
}) => {
  // Find which department contains the activeTab
  const currentDept = departments.find((dept) =>
    dept.tabs.some((t) => t.id === activeTab)
  ) || departments[0];

  return (
    <div className="bg-white border-b border-slate-200 px-6 sm:px-8 shadow-xs">
      {/* 1. Main Departments Strip - Spacious & High-Contrast */}
      <div className="flex items-center gap-2.5 overflow-x-auto py-3 scrollbar-none">
        {departments.map((dept) => {
          const Icon = dept.icon;
          const isDeptActive = dept.id === currentDept.id;
          return (
            <button
              key={dept.id}
              onClick={() => {
                if (!isDeptActive) {
                  onSelectTab(dept.defaultTab);
                }
              }}
              type="button"
              className={`flex items-center gap-2.5 px-4.5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                isDeptActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isDeptActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{dept.title}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Sub-tabs of current active Department - Roomy and clearly separated */}
      {currentDept.tabs.length > 1 && (
        <div className="flex items-center gap-2.5 overflow-x-auto py-2.5 border-t border-slate-100">
          <span className="text-xs text-slate-400 font-semibold pl-2 shrink-0 hidden sm:inline">
            صفحات قسم {currentDept.title}:
          </span>
          {currentDept.tabs.map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                type="button"
                className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  isTabActive
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isTabActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
