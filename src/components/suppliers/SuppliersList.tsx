import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Building2,
  FileSpreadsheet,
  Coins,
  Edit,
  Trash2,
  Phone,
  Send,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  RotateCcw,
  Eye,
  BadgePercent,
} from 'lucide-react';
import { Supplier } from '../../types/database';
import { storage } from '../../lib/storage';
import { authService } from '../../lib/auth';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { exportToCsv } from '../../lib/exportUtils';
import { SupplierModal } from './SupplierModal';
import { SupplierLedgerModal } from './SupplierLedgerModal';
import { SupplierPaymentModal } from './SupplierPaymentModal';

import { printVisibleArea } from '../../lib/printUtils';
export const SuppliersList: React.FC = () => {
  const [viewMode, setViewMode] = useState<'directory' | 'master_report'>('directory');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [masterReport, setMasterReport] = useState<ReturnType<typeof storage.getSuppliersMasterReport>>([]);
  const [search, setSearch] = useState('');
  const [filterCreditorsOnly, setFilterCreditorsOnly] = useState(false);
  const [sortField, setSortField] = useState<'balance_desc' | 'balance_asc' | 'name' | 'purchases_desc'>('balance_desc');

  // Modals
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const isAdmin = authService.getCurrentUser()?.role === 'admin';
  const [selectedLedgerSupplier, setSelectedLedgerSupplier] = useState<Supplier | null>(null);
  const [selectedPaymentSupplier, setSelectedPaymentSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const loadData = () => {
    setSuppliers(storage.getSuppliers());
    setMasterReport(storage.getSuppliersMasterReport());
  };

  const totalSupplierDebt = suppliers.reduce((sum, s) => sum + Math.max(0, s.current_balance), 0);

  // Filtered & sorted for Directory view
  const filteredDirectory = suppliers.filter((s) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.company_name && s.company_name.toLowerCase().includes(q)) ||
      s.code.toLowerCase().includes(q) ||
      (s.phone && s.phone.includes(q));

    const matchesDebt = !filterCreditorsOnly || s.current_balance > 0;
    return matchesSearch && matchesDebt;
  });

  // Filtered & sorted for Master Report view
  const filteredMasterReport = useMemo(() => {
    return masterReport
      .filter((item) => {
        const q = search.toLowerCase().trim();
        const matchesSearch =
          !q ||
          item.supplier.name.toLowerCase().includes(q) ||
          (item.supplier.company_name && item.supplier.company_name.toLowerCase().includes(q)) ||
          item.supplier.code.toLowerCase().includes(q) ||
          (item.supplier.phone && item.supplier.phone.includes(q));

        const matchesDebt = !filterCreditorsOnly || item.currentBalance > 0.01;
        return matchesSearch && matchesDebt;
      })
      .sort((a, b) => {
        if (sortField === 'balance_desc') return b.currentBalance - a.currentBalance;
        if (sortField === 'balance_asc') return a.currentBalance - b.currentBalance;
        if (sortField === 'name') return a.supplier.name.localeCompare(b.supplier.name, 'ar');
        if (sortField === 'purchases_desc') return b.totalPurchases - a.totalPurchases;
        return 0;
      });
  }, [masterReport, search, filterCreditorsOnly, sortField]);

  // Totals for Master Report
  const masterTotals = useMemo(() => {
    return filteredMasterReport.reduce(
      (acc, item) => {
        acc.opening += item.openingBalance || 0;
        acc.purchases += item.totalPurchases || 0;
        acc.payments += item.totalPayments || 0;
        acc.balance += item.currentBalance || 0;
        if (item.currentBalance > 0.01) acc.creditorsCount += 1;
        return acc;
      },
      { opening: 0, purchases: 0, payments: 0, balance: 0, creditorsCount: 0 }
    );
  }, [filteredMasterReport]);

  const handleExportExcel = () => {
    const headers = [
      'كود المورد',
      'اسم المورد / المسؤول',
      'الشركة أو التوكيل',
      'رقم الهاتف',
      'رصيد أول المدة',
      'إجمالي المشتريات',
      'إجمالي المدفوعات المسددة',
      'صافي المستحق للمورد حالياً',
      'حالة الحساب',
      'تاريخ آخر حركة',
    ];

    const rows = filteredMasterReport.map((item) => [
      item.supplier.code,
      item.supplier.name,
      item.supplier.company_name || 'غير مسجل',
      item.supplier.phone || '-',
      item.openingBalance,
      item.totalPurchases,
      item.totalPayments,
      item.currentBalance,
      item.status,
      item.lastMovementDate ? formatDate(item.lastMovementDate) : 'لا توجد حركة',
    ]);

    rows.push([
      'الإجمالي العام',
      `عدد الموردين: ${filteredMasterReport.length}`,
      '',
      '',
      masterTotals.opening,
      masterTotals.purchases,
      masterTotals.payments,
      masterTotals.balance,
      `مستحق لهم: ${masterTotals.creditorsCount}`,
      '',
    ]);

    exportToCsv(`تقرير_حسابات_ومستحقات_الموردين_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">إجمالي الشركات والموردين</span>
            <span className="text-xl font-bold font-mono text-slate-900">{suppliers.length}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">إجمالي المستحقات للموردين</span>
            <span className="text-xl font-bold font-mono text-amber-800">
              {formatCurrency(totalSupplierDebt)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">شركات لها رصيد مستحق واجب السداد</span>
            <span className="text-xl font-bold font-mono text-rose-700">
              {suppliers.filter((s) => s.current_balance > 0.01).length}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Mode Switcher & Actions Bar with Generous Spacing */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs sm:text-sm font-semibold">
            <button
              onClick={() => setViewMode('directory')}
              className={`px-3.5 py-2 rounded-lg transition-colors ${
                viewMode === 'directory'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              دليل الموردين
            </button>
            <button
              onClick={() => setViewMode('master_report')}
              className={`px-3.5 py-2 rounded-lg transition-colors ${
                viewMode === 'master_report'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              التقرير الشامل لجميع الموردين
            </button>
          </div>

          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute right-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم المورد، الشركة، الهاتف..."
              className="w-full pr-10 pl-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => setFilterCreditorsOnly(!filterCreditorsOnly)}
            type="button"
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-colors ${
              filterCreditorsOnly
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            المستحق لهم فقط ({suppliers.filter((s) => s.current_balance > 0.01).length})
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {viewMode === 'master_report' && (
            <>
              <button
                onClick={handleExportExcel}
                type="button"
                className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 rounded-xl shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>تصدير Excel</span>
              </button>
              <button
                onClick={() => printVisibleArea()}
                type="button"
                className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة</span>
              </button>
            </>
          )}

          <button
            onClick={() => {
              setEditingSupplier(null);
              setSupplierModalOpen(true);
            }}
            type="button"
            className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة شركة / مورد جديد</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: Directory Mode */}
      {viewMode === 'directory' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm border-collapse min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-4 px-4 sm:px-5 whitespace-nowrap min-w-[130px]">كود المورد</th>
                  <th className="py-4 px-4 sm:px-5 whitespace-nowrap min-w-[180px]">اسم المورد / المسؤول</th>
                  <th className="py-4 px-4 sm:px-5 whitespace-nowrap min-w-[170px]">الشركة أو التوكيل</th>
                  <th className="py-4 px-4 sm:px-5 whitespace-nowrap min-w-[130px]">الهاتف</th>
                  <th className="py-4 px-4 sm:px-5 whitespace-nowrap text-left min-w-[130px]">الرصيد الافتتاحي</th>
                  <th className="py-4 px-4 sm:px-5 whitespace-nowrap text-left font-bold text-slate-900 bg-amber-50/70 min-w-[160px]">
                    الرصيد المستحق (للمورد)
                  </th>
                  <th className="py-4 px-4 sm:px-5 whitespace-nowrap text-center min-w-[150px]">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDirectory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <Building2 className="w-10 h-10 mx-auto mb-3 stroke-1 text-slate-300" />
                      <p className="text-base font-medium">لا توجد شركات أو موردين يطابقون محددات البحث</p>
                    </td>
                  </tr>
                ) : (
                  filteredDirectory.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-slate-50/90 transition-colors">
                      <td className="py-3.5 px-4 sm:px-5 font-bold text-slate-700 tabular-nums">
                        {supplier.code}
                      </td>
                      <td className="py-3.5 px-4 sm:px-5">
                        <div className="font-bold text-slate-900 text-sm">{supplier.name}</div>
                        {supplier.tax_number && (
                          <div className="text-xs text-slate-400 tabular-nums mt-0.5">
                            بطاقة ضريبية: {supplier.tax_number}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 font-medium text-slate-800">
                        {supplier.company_name || 'غير محدد'}
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 text-slate-600 tabular-nums font-medium">
                        {supplier.phone || '-'}
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 text-left text-slate-600 tabular-nums font-medium">
                        {formatCurrency(supplier.opening_balance)}
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 text-left font-bold bg-amber-50/70 tabular-nums">
                        <span
                          className={`text-sm sm:text-base ${
                            supplier.current_balance > 0 ? 'text-amber-800' : 'text-emerald-700'
                          }`}
                        >
                          {formatCurrency(supplier.current_balance)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedLedgerSupplier(supplier)}
                            type="button"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            title="عرض كشف حساب المورد"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                            <span>كشف حساب</span>
                          </button>

                          <button
                            onClick={() => setSelectedPaymentSupplier(supplier)}
                            type="button"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                            title="صرف دفعة وسداد للمورد"
                          >
                            <Send className="w-3.5 h-3.5 text-blue-600" />
                            <span>صرف دفعة</span>
                          </button>

                          <button
                            onClick={() => {
                              setEditingSupplier(supplier);
                              setSupplierModalOpen(true);
                            }}
                            type="button"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="تعديل بيانات المورد"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
{isAdmin && (
  <button
    type="button"
    onClick={() => setDeleteTarget(supplier)}
    className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
    title="حذف المورد"
  >
    <Trash2 className="w-4 h-4" />
  </button>
)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: Comprehensive Master Report Mode (التقرير الشامل لجميع الموردين) */}
      {viewMode === 'master_report' && (
        <div className="invoice-print-area bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                التقرير الشامل لأرصدة ومستحقات الموردين والشركات
              </h3>
              <p className="text-xs text-slate-500">
                جدول موحد يوضح أرصدة أول المدة، إجمالي المشتريات، المدفوعات المسددة، والمستحقات الحالية
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">الترتيب:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as any)}
                className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs"
              >
                <option value="balance_desc">أعلى مستحقات أولاً</option>
                <option value="balance_asc">أقل مستحقات أولاً</option>
                <option value="name">الاسم أبجدياً</option>
                <option value="purchases_desc">أكبر مشتريات</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm border-collapse min-w-[1100px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-4 px-4 sm:px-5 whitespace-nowrap min-w-[180px]">كود واسم المورد</th>
                  <th className="py-4 px-4 sm:px-5 whitespace-nowrap min-w-[160px]">الشركة / التوكيل</th>
                  <th className="py-4 px-4 sm:px-5 whitespace-nowrap min-w-[130px]">الهاتف</th>
                  <th className="py-4 px-4 sm:px-5 whitespace-nowrap text-left min-w-[130px]">رصيد أول المدة</th>
                  <th className="py-4 px-4 sm:px-5 whitespace-nowrap text-left min-w-[130px]">إجمالي المشتريات</th>
                  <th className="py-4 px-4 sm:px-5 whitespace-nowrap text-left min-w-[130px]">إجمالي المسدد</th>
                  <th className="py-4 px-4 sm:px-5 whitespace-nowrap text-left font-bold text-slate-900 bg-amber-50/70 min-w-[160px]">
                    صافي المستحق للمورد
                  </th>
                  <th className="py-4 px-4 sm:px-5 whitespace-nowrap min-w-[120px]">آخر حركة</th>
                  <th className="py-4 px-4 sm:px-5 whitespace-nowrap text-center min-w-[130px]">حالة الحساب</th>
                  <th className="no-print py-4 px-4 sm:px-5 whitespace-nowrap text-center min-w-[150px]">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMasterReport.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-slate-400">
                      <Building2 className="w-10 h-10 mx-auto mb-3 stroke-1 text-slate-300" />
                      <p className="text-base font-medium">لا يوجد موردين يطابقون محددات التصفية</p>
                    </td>
                  </tr>
                ) : (
                  filteredMasterReport.map((item) => (
                    <tr key={item.supplier.id} className="hover:bg-slate-50/90 transition-colors">
                      <td className="py-3.5 px-4 sm:px-5">
                        <div className="font-bold text-slate-900 text-sm">{item.supplier.name}</div>
                        <span className="font-mono text-xs text-slate-400 mt-0.5 block">
                          {item.supplier.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 text-slate-800 font-medium">
                        {item.supplier.company_name || 'غير محدد'}
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 font-mono text-slate-600">
                        {item.supplier.phone || '-'}
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 text-left font-mono text-slate-600 tabular-nums">
                        {item.openingBalance > 0 ? formatCurrency(item.openingBalance) : '-'}
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 text-left font-mono font-medium text-slate-900 tabular-nums">
                        {item.totalPurchases > 0 ? formatCurrency(item.totalPurchases) : '-'}
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 text-left font-mono font-semibold text-emerald-700 tabular-nums">
                        {item.totalPayments > 0 ? formatCurrency(item.totalPayments) : '-'}
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 text-left font-mono font-bold bg-amber-50/70 tabular-nums">
                        <span
                          className={`text-sm sm:text-base ${
                            item.currentBalance > 0.01 ? 'text-amber-800 font-extrabold' : 'text-emerald-700'
                          }`}
                        >
                          {formatCurrency(item.currentBalance)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {item.lastMovementDate ? formatDate(item.lastMovementDate) : 'لا يوجد'}
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 text-center whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                            item.currentBalance > 0.01
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}
                        >
                          {item.currentBalance > 0.01 ? 'مستحق له' : 'متزن / خالص'}
                        </span>
                      </td>
                      <td className="no-print py-3.5 px-4 sm:px-5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedLedgerSupplier(item.supplier)}
                            type="button"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>كشف الحساب</span>
                          </button>
                          <button
                            onClick={() => setSelectedPaymentSupplier(item.supplier)}
                            type="button"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                          >
                            <Send className="w-3.5 h-3.5 text-blue-600" />
                            <span>صرف دفعة</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredMasterReport.length > 0 && (
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-200 text-xs sm:text-sm">
                  <tr>
                    <td className="py-4 px-4 sm:px-5">
                      الإجمالي العام ({filteredMasterReport.length} مورد)
                    </td>
                    <td colSpan={2} className="py-4 px-4 sm:px-5 text-slate-500 font-normal">
                      مستحق لهم: {masterTotals.creditorsCount} مورد
                    </td>
                    <td className="py-4 px-4 sm:px-5 text-left font-mono tabular-nums">
                      {formatCurrency(masterTotals.opening)}
                    </td>
                    <td className="py-4 px-4 sm:px-5 text-left font-mono tabular-nums">
                      {formatCurrency(masterTotals.purchases)}
                    </td>
                    <td className="py-4 px-4 sm:px-5 text-left font-mono tabular-nums text-emerald-800">
                      {formatCurrency(masterTotals.payments)}
                    </td>
                    <td className="py-3 px-3 text-left font-mono text-amber-900 text-sm font-extrabold bg-amber-100/60">
                      {formatCurrency(masterTotals.balance)}
                    </td>
                    <td colSpan={3} className="py-3 px-3 text-slate-500 text-[10px]">
                      مطابق لكافة فواتير المشتريات وسندات الصرف
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}


      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="حذف مورد"
        itemName={deleteTarget?.name}
        description="سيتم حذف المورد مع كشف حسابه. فواتير الشراء والدفعات القديمة تفضل محفوظة بدون ربط بالمورد. لا يمكن التراجع."
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => storage.deleteSupplier(deleteTarget!.id)}
      />

      {/* Supplier Create / Edit Modal */}
      <SupplierModal
        isOpen={supplierModalOpen}
        supplierToEdit={editingSupplier}
        onClose={() => setSupplierModalOpen(false)}
        onSaved={loadData}
      />

      {/* Supplier Ledger Modal */}
      {selectedLedgerSupplier && (
        <SupplierLedgerModal
          supplier={selectedLedgerSupplier}
          onClose={() => setSelectedLedgerSupplier(null)}
          onPaySupplierClick={(supp) => setSelectedPaymentSupplier(supp)}
        />
      )}

      {/* Supplier Payment Voucher Modal */}
      {selectedPaymentSupplier && (
        <SupplierPaymentModal
          supplier={selectedPaymentSupplier}
          isOpen={true}
          onClose={() => {
            setSelectedPaymentSupplier(null);
            loadData();
          }}
          onSuccess={() => {
            setSelectedPaymentSupplier(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};
