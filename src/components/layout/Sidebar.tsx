import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Users,
  FileSpreadsheet,
  Truck,
  Building2,
  Warehouse as WarehouseIcon,
  Store,
  ArrowLeftRight,
  PackageCheck,
  History,
  Landmark,
  BadgeDollarSign,
  BookOpenCheck,
  BarChart3,
  ShieldCheck,
  Settings,
  X,
} from 'lucide-react';
import { APP_CONFIG } from '../../lib/branding';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const navGroups: NavGroup[] = [
    {
      groupTitle: 'الرئيسية',
      items: [
        { id: 'dashboard', label: 'لوحة التحكم والملخص', icon: LayoutDashboard },
        { id: 'products', label: 'دليل المنتجات والأسعار', icon: PackageCheck },
      ],
    },
    {
      groupTitle: 'قسم المحل (مستقل)',
      items: [
        { id: 'pos', label: 'نقطة البيع السريعة (POS)', icon: ShoppingCart },
        { id: 'sales', label: 'فواتير مبيعات المحل', icon: Receipt },
        { id: 'warehouse_shop', label: 'بضاعة ومخزون المحل', icon: Store },
      ],
    },
    {
      groupTitle: 'قسم المخزن (مستقل)',
      items: [
        { id: 'warehouse_main', label: 'بضاعة ومخزون المخزن', icon: WarehouseIcon },
        { id: 'purchases', label: 'فواتير توريد ووارد المخزن', icon: Truck },
        { id: 'stock_movements', label: 'حركة مخزون المخزن', icon: History },
      ],
    },
    {
      groupTitle: 'العملاء والحسابات',
      items: [
        { id: 'customers', label: 'دليل العملاء والمزارعين', icon: Users },
        { id: 'customer_ledgers', label: 'كشوف حسابات ومديونيات العملاء', icon: FileSpreadsheet },
      ],
    },
    {
      groupTitle: 'الموردون والشركات',
      items: [
        { id: 'suppliers', label: 'دليل وحسابات الموردين', icon: Building2 },
      ],
    },
    {
      groupTitle: 'المالية والخزينة',
      items: [
        { id: 'treasury', label: 'الخزينة والمصروفات اليومية', icon: Landmark },
        { id: 'payments', label: 'سندات القبض والصرف', icon: BadgeDollarSign },
        { id: 'old_ledgers', label: 'ترحيل الدفاتر الورقية القديمة', icon: BookOpenCheck },
      ],
    },
    {
      groupTitle: 'التقارير والإدارة',
      items: [
        { id: 'reports', label: 'التقارير المالية والمخزنية', icon: BarChart3 },
        { id: 'users', label: 'المستخدمون والصلاحيات', icon: ShieldCheck },
        { id: 'settings', label: 'إعدادات النظام والنسخ الاحتياطي', icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar container with comfortable width and breathing room */}
      <aside
        className={`fixed top-0 right-0 z-50 flex flex-col w-76 lg:w-80 h-full bg-theme-dark text-slate-200 border-l border-theme-dark transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3.5">
            <img
              src={APP_CONFIG.logo}
              alt={APP_CONFIG.name}
              className="h-11 w-auto object-contain shrink-0"
            />
            <div>
              <span className="text-base font-bold text-white tracking-normal leading-normal block">
                {APP_CONFIG.name}
              </span>
              <span className="text-xs text-slate-300 block font-normal mt-0.5">
                {APP_CONFIG.subTitle}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-2 text-slate-400 rounded-xl hover:text-white hover:bg-white/10 lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list with spacious gaps */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2.5">
              <div className="px-4 text-xs font-bold text-slate-400 tracking-normal">
                {group.groupTitle}
              </div>
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        onClose();
                      }}
                      className={`flex items-center justify-between w-full px-4 py-3 text-sm rounded-xl transition-all text-right ${
                        isActive
                          ? 'bg-theme-accent text-white shadow-sm font-bold ring-1 ring-white/20'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-white/15 text-slate-200 font-semibold tabular-nums">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Store footer info */}
        <div className="p-4 px-6 border-t border-white/10 bg-black/20 text-slate-300 text-xs shrink-0">
          <div className="flex items-center justify-between">
            <span className="font-medium">الفرع: محل ومستودع الدلتا الزراعي</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
              متصل
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
