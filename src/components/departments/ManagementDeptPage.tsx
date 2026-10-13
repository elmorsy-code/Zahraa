import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  ShieldCheck,
  Settings,
  LayoutGrid,
  TrendingUp,
  Users,
  CheckCircle2,
  Database,
  ArrowLeft,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import { DepartmentHeader, DepartmentTabItem } from './DepartmentHeader';
import { ReportsScreen } from '../reports/ReportsScreen';
import { UsersPermissionsScreen } from '../users/UsersPermissionsScreen';
import { SettingsScreen } from '../settings/SettingsScreen';
import { storage } from '../../lib/storage';
import { isSupabaseConfigured } from '../../lib/supabase';
import { formatCurrency } from '../../lib/formatters';

interface ManagementDeptPageProps {
  initialSubTab?: string;
  onNavigateHome: () => void;
}

export const ManagementDeptPage: React.FC<ManagementDeptPageProps> = ({
  initialSubTab = 'overview',
  onNavigateHome,
}) => {
  const [subTab, setSubTab] = useState<string>(initialSubTab);

  const salesInvoices = storage.getSalesInvoices();
  const products = storage.getProducts();
  const totalRevenue = salesInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  let totalCost = 0;
  salesInvoices.forEach((inv) => {
    (inv.items || []).forEach((item) => {
      const p = products.find((prod) => prod.id === item.product_id);
      const costPerBase = p ? p.default_purchase_price : item.unit_price * 0.75;
      totalCost += (item.qty_in_base_unit || item.qty) * costPerBase;
    });
  });

  const grossProfit = totalRevenue - totalCost;
  const isCloud = isSupabaseConfigured();

  const tabs: DepartmentTabItem[] = [
    { id: 'overview', label: 'نظرة عامة على الإدارة والرقابة', icon: LayoutGrid },
    { id: 'reports', label: 'التقارير المالية والتحليلية', icon: BarChart3 },
    { id: 'users', label: 'المستخدمون والصلاحيات', icon: ShieldCheck },
    { id: 'settings', label: 'إعدادات المنظومة', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Department Master Header */}
      <DepartmentHeader
        deptId="management_dept"
        title="قسم التقارير والرقابة والإدارة العامة"
        subtitle="مؤشرات الأداء المالي، تحليل الأرباح والمبيعات، إدارة حسابات المستخدمين وصلاحيات الأدوار، وضبط المؤسسة"
        tagline="الأرباح والتقارير والمستخدمين"
        icon={BarChart3}
        themeColor="rose"
        tabs={tabs}
        activeSubTab={subTab}
        onSelectSubTab={(tab) => setSubTab(tab)}
        onNavigateHome={onNavigateHome}
        extraActions={
          <>
            <button
              onClick={() => setSubTab('reports')}
              type="button"
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <BarChart3 className="w-4 h-4" />
              <span>التقارير التحليلية</span>
            </button>
            <button
              onClick={() => setSubTab('users')}
              type="button"
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-rose-700" />
              <span>صلاحيات المستخدمين</span>
            </button>
          </>
        }
      />

      {/* VIEW 1: Overview */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Department KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* KPI 1: Gross Profit */}
            <div className="card-box p-5 sm:p-6 border-2 border-rose-300/80 bg-gradient-to-br from-rose-50/70 via-white to-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">مجمل الأرباح التقديرية</span>
                <div className="p-2.5 bg-rose-100 text-rose-900 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-950 tabular-nums">
                {formatCurrency(grossProfit)}
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>المبيعات ناقص تكلفة البضاعة</span>
                <span className="text-rose-800 font-bold">ربحية المبيعات</span>
              </div>
            </div>

            {/* KPI 2: Total Revenue */}
            <div className="card-box p-5 sm:p-6 border-2 border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">إجمالي المبيعات والإيراد</span>
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-950 tabular-nums">
                {formatCurrency(totalRevenue)}
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>{salesInvoices.length} فواتير مسجلة</span>
                <span className="text-emerald-700 font-bold">حجم الأعمال</span>
              </div>
            </div>

            {/* KPI 3: Roles & Security */}
            <div className="card-box p-5 sm:p-6 border-2 border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">منظومة الصلاحيات (RBAC)</span>
                <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                5 أدوار قيادية
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>مدير، كاشير، أمين مخزن، محاسب</span>
                <span className="text-blue-700 font-bold">حماية مشددة</span>
              </div>
            </div>

            {/* KPI 4: Cloud Status */}
            <div className="card-box p-5 sm:p-6 border-2 border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">حالة الربط السحابي</span>
                <div className="p-2.5 bg-teal-100 text-teal-800 rounded-xl">
                  <Database className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-teal-900 flex items-center gap-2">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                <span>متصل سحابياً</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>قاعدة بيانات Supabase</span>
                <span className="text-teal-700 font-bold">مزامنة حية</span>
              </div>
            </div>
          </div>

          {/* Quick Access to Tools */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Tool 1 */}
            <div
              onClick={() => setSubTab('reports')}
              className="card-box p-6 border-2 border-slate-200 hover:border-rose-400 cursor-pointer space-y-3 group transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-black text-slate-900">
                التقارير التحليلية والمالية
              </h4>
              <p className="text-xs text-slate-500">
                تقارير المبيعات، حركة الأرباح، تقرير اليومية، والموقف المالي للفرع مع إمكانية التصدير والطباعة.
              </p>
              <div className="text-xs font-bold text-rose-700 pt-2 flex items-center gap-1">
                <span>فتح شاشة التقارير</span>
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Tool 2 */}
            <div
              onClick={() => setSubTab('users')}
              className="card-box p-6 border-2 border-slate-200 hover:border-rose-400 cursor-pointer space-y-3 group transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-base font-black text-slate-900">
                المستخدمون والصلاحيات
              </h4>
              <p className="text-xs text-slate-500">
                إضافة كاشيرات ومحاسبين، تعيين كلمات المرور، تفعيل وتعطيل الحسابات وتحديد شاشات الوصول المسموحة.
              </p>
              <div className="text-xs font-bold text-rose-700 pt-2 flex items-center gap-1">
                <span>إدارة المستخدمين</span>
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Tool 3 */}
            <div
              onClick={() => setSubTab('settings')}
              className="card-box p-6 border-2 border-slate-200 hover:border-rose-400 cursor-pointer space-y-3 group transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Settings className="w-6 h-6" />
              </div>
              <h4 className="text-base font-black text-slate-900">
                إعدادات المنظومة والمؤسسة
              </h4>
              <p className="text-xs text-slate-500">
                تعديل بيانات المنشأة في ترويسة الفواتير، هواتف التواصل، إعدادات الطباعة، والنسخ الاحتياطي.
              </p>
              <div className="text-xs font-bold text-rose-700 pt-2 flex items-center gap-1">
                <span>فتح الإعدادات</span>
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Reports */}
      {subTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-rose-50/80 border border-rose-200 p-3 rounded-2xl">
            <span className="text-xs sm:text-sm font-bold text-rose-950 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-rose-700" />
              شاشة التقارير المالية والإحصائية والتحليلية
            </span>
            <button
              onClick={() => setSubTab('overview')}
              type="button"
              className="text-xs font-bold text-rose-900 hover:text-rose-950 underline cursor-pointer"
            >
              العودة للوحة قسم الإدارة
            </button>
          </div>
          <ReportsScreen />
        </div>
      )}

      {/* VIEW 3: Users */}
      {subTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-2xl">
            <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-600" />
              إدارة مستخدمي المنظومة والأدوار والصلاحيات
            </span>
            <button
              onClick={() => setSubTab('overview')}
              type="button"
              className="text-xs font-bold text-slate-700 hover:text-slate-950 underline cursor-pointer"
            >
              العودة للوحة قسم الإدارة
            </button>
          </div>
          <UsersPermissionsScreen />
        </div>
      )}

      {/* VIEW 4: Settings */}
      {subTab === 'settings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-2xl">
            <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-600" />
              إعدادات المنظومة والبيانات العامة
            </span>
            <button
              onClick={() => setSubTab('overview')}
              type="button"
              className="text-xs font-bold text-slate-700 hover:text-slate-950 underline cursor-pointer"
            >
              العودة للوحة قسم الإدارة
            </button>
          </div>
          <SettingsScreen />
        </div>
      )}
    </div>
  );
};
