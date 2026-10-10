import React, { useState, useEffect } from 'react';
import {
  Truck,
  Building2,
  LayoutGrid,
  TrendingDown,
  Coins,
  Plus,
  Search,
  Receipt,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import { DepartmentHeader, DepartmentTabItem } from './DepartmentHeader';
import { PurchaseInvoicesList } from '../purchases/PurchaseInvoicesList';
import { SuppliersList } from '../suppliers/SuppliersList';
import { storage } from '../../lib/storage';
import { PurchaseInvoice, Supplier } from '../../types/database';
import { formatCurrency, formatDateTime } from '../../lib/formatters';

interface PurchasesDeptPageProps {
  initialSubTab?: string;
  onNavigateHome: () => void;
}

export const PurchasesDeptPage: React.FC<PurchasesDeptPageProps> = ({
  initialSubTab = 'overview',
  onNavigateHome,
}) => {
  const [subTab, setSubTab] = useState<string>(initialSubTab);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
    const unsub = storage.subscribe(loadData);
    return () => unsub();
  }, []);

  const loadData = () => {
    setPurchaseInvoices(storage.getPurchaseInvoices());
    setSuppliers(storage.getSuppliers());
  };

  // Live KPIs
  const totalPurchases = purchaseInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalSupplierDues = suppliers.reduce((sum, s) => sum + Math.max(0, s.current_balance), 0);
  const activeSuppliersCount = suppliers.length;
  const thisMonthStr = new Date().toISOString().slice(0, 7);
  const thisMonthPurchases = purchaseInvoices.filter((inv) => inv.invoice_date?.startsWith(thisMonthStr));

  const tabs: DepartmentTabItem[] = [
    { id: 'overview', label: 'نظرة عامة على المشتريات والتوريد', icon: LayoutGrid },
    { id: 'purchases_list', label: 'فواتير المشتريات والتوريد', icon: Truck, count: purchaseInvoices.length },
    { id: 'suppliers_list', label: 'دليل وحسابات الموردين', icon: Building2, count: suppliers.length },
  ];

  const recentPurchases = purchaseInvoices.slice(0, 6);
  const majorSuppliers = [...suppliers]
    .sort((a, b) => b.current_balance - a.current_balance)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Department Master Header */}
      <DepartmentHeader
        deptId="purchases_dept"
        title="قسم المشتريات والشركات الموردة"
        subtitle="إدارة فواتير التوريد، تسعير الشراء والخصومات، حسابات الشركات الموردة وجدولة المستحقات"
        tagline="الموردين والشركات والمستحقات"
        icon={Truck}
        themeColor="blue"
        tabs={tabs}
        activeSubTab={subTab}
        onSelectSubTab={(tab) => setSubTab(tab)}
        onNavigateHome={onNavigateHome}
        extraActions={
          <>
            <button
              onClick={() => setSubTab('purchases_list')}
              type="button"
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>فاتورة توريد جديدة</span>
            </button>
            <button
              onClick={() => setSubTab('suppliers_list')}
              type="button"
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-blue-700" />
              <span>دليل الشركات</span>
            </button>
          </>
        }
      />

      {/* VIEW 1: Overview */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Department KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* KPI 1: Supplier Dues */}
            <div className="card-box p-5 sm:p-6 border-2 border-blue-300/80 bg-gradient-to-br from-blue-50/70 via-white to-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">مستحقات شركات التوريد</span>
                <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl">
                  <Coins className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-blue-950 tabular-nums">
                {formatCurrency(totalSupplierDues)}
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>واجبة السداد للموردين</span>
                <span className="text-blue-800 font-bold">أرصدة الموردين</span>
              </div>
            </div>

            {/* KPI 2: Total Purchases */}
            <div className="card-box p-5 sm:p-6 border-2 border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">إجمالي المشتريات المسجلة</span>
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Truck className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                {formatCurrency(totalPurchases)}
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>{purchaseInvoices.length} فواتير توريد</span>
                <span className="text-emerald-700 font-bold">إجمالي التوريد</span>
              </div>
            </div>

            {/* KPI 3: Supplier Count */}
            <div className="card-box p-5 sm:p-6 border-2 border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">الشركات والمصانع الموردة</span>
                <div className="p-2.5 bg-purple-100 text-purple-800 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                {activeSuppliersCount} شركة
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>موردين معتمدين</span>
                <span className="text-purple-700 font-bold">دليل الموردين</span>
              </div>
            </div>

            {/* KPI 4: Monthly Purchases */}
            <div className="card-box p-5 sm:p-6 border-2 border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">مشتريات هذا الشهر</span>
                <div className="p-2.5 bg-teal-100 text-teal-800 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-teal-900 tabular-nums">
                {formatCurrency(thisMonthPurchases.reduce((s, i) => s + (i.total_amount || 0), 0))}
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>{thisMonthPurchases.length} فواتير هذا الشهر</span>
                <span className="text-teal-700 font-bold">نشاط شهري</span>
              </div>
            </div>
          </div>

          {/* Grid: Recent Purchase Invoices & Top Suppliers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Box 1: Recent Purchase Invoices */}
            <div className="card-box p-6 border-2 border-slate-200 bg-white space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900">
                  أحدث فواتير المشتريات والشحنات
                </h3>
                <button
                  onClick={() => setSubTab('purchases_list')}
                  type="button"
                  className="text-xs font-bold text-blue-700 hover:underline"
                >
                  عرض الكل ({purchaseInvoices.length}) ←
                </button>
              </div>

              {recentPurchases.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm font-bold">
                  لا توجد فواتير توريد مسجلة حتى الآن
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentPurchases.map((inv) => (
                    <div key={inv.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {inv.invoice_number}
                          </span>
                          <span className="font-bold text-xs text-slate-800">
                            {inv.supplier_name || 'مورد عام'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          {formatDateTime(inv.invoice_date)}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="font-black text-slate-900 text-sm tabular-nums">
                          {formatCurrency(inv.total_amount)}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-bold tabular-nums">
                          مدفوع: {formatCurrency(inv.paid_amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Box 2: Suppliers with Pending Dues */}
            <div className="card-box p-6 border-2 border-slate-200 bg-white space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900">
                  أعلى مستحقات الشركات الموردة
                </h3>
                <button
                  onClick={() => setSubTab('suppliers_list')}
                  type="button"
                  className="text-xs font-bold text-blue-700 hover:underline"
                >
                  دليل الموردين ({suppliers.length}) ←
                </button>
              </div>

              {majorSuppliers.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm font-bold">
                  لا توجد شركات موردة مسجلة
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {majorSuppliers.map((s) => (
                    <div key={s.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-xs text-slate-900">
                          {s.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {s.company_name ? `${s.company_name} • ` : ''} {s.phone || 'بدون هاتف'}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="font-black text-blue-900 text-sm tabular-nums">
                          {formatCurrency(s.current_balance)}
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {s.current_balance > 0 ? 'مستحق للشركة' : 'خالص'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Purchases List */}
      {subTab === 'purchases_list' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-blue-50/80 border border-blue-200 p-3 rounded-2xl">
            <span className="text-xs sm:text-sm font-bold text-blue-950 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-700" />
              فواتير المشتريات والتوريد وحركات المخازن
            </span>
            <button
              onClick={() => setSubTab('overview')}
              type="button"
              className="text-xs font-bold text-blue-900 hover:text-blue-950 underline cursor-pointer"
            >
              العودة للوحة قسم المشتريات
            </button>
          </div>
          <PurchaseInvoicesList />
        </div>
      )}

      {/* VIEW 3: Suppliers List */}
      {subTab === 'suppliers_list' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-2xl">
            <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-600" />
              دليل وبيانات وحسابات الشركات والموردين
            </span>
            <button
              onClick={() => setSubTab('overview')}
              type="button"
              className="text-xs font-bold text-slate-700 hover:text-slate-950 underline cursor-pointer"
            >
              العودة للوحة قسم المشتريات
            </button>
          </div>
          <SuppliersList />
        </div>
      )}
    </div>
  );
};
