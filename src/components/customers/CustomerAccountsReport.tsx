import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Download,
  Printer,
  Coins,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  Eye,
  BadgeDollarSign,
  Phone,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { storage } from '../../lib/storage';
import { Customer, CustomerMasterReportItem } from '../../types/database';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { exportToCsv } from '../../lib/exportUtils';
import { CustomerLedgerModal } from './CustomerLedgerModal';
import { CustomerPaymentModal } from './CustomerPaymentModal';
import { Pagination } from '../common/Pagination';

import { printVisibleArea } from '../../lib/printUtils';
export const CustomerAccountsReport: React.FC = () => {
  const [data, setData] = useState<CustomerMasterReportItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'debtors' | 'zero' | 'creditors'>('all');
  const [selectedVillage, setSelectedVillage] = useState<string>('all');
  const [sortField, setSortField] = useState<
    'debt_desc' | 'debt_asc' | 'name' | 'sales_desc' | 'last_movement' | 'last_payment'
  >('debt_desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Date range filter for last movement / activity
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState<Customer | null>(null);
  const [selectedPaymentCustomer, setSelectedPaymentCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setData(storage.getCustomersMasterReport());
  };

  // Distinct villages for filtering
  const distinctVillages = useMemo(() => {
    const villages = new Set<string>();
    data.forEach((item) => {
      if (item.customer.village_or_address?.trim()) {
        villages.add(item.customer.village_or_address.trim());
      }
    });
    return Array.from(villages);
  }, [data]);

  // Reconciliation Check: Verify that sum of master report balances matches sum of all individual ledgers
  const reconciliation = useMemo(() => {
    let totalStoredMasterDebt = 0;
    let totalCalculatedLedgerDebt = 0;
    let hasDiscrepancy = false;

    data.forEach((item) => {
      const recon = storage.getCustomerReconciliation(item.customer.id);
      totalStoredMasterDebt += Math.max(0, item.currentBalance);
      totalCalculatedLedgerDebt += Math.max(0, recon.calculatedBalance);
      if (!recon.isBalanced) {
        hasDiscrepancy = true;
      }
    });

    const isMatch = Math.abs(totalStoredMasterDebt - totalCalculatedLedgerDebt) < 0.01 && !hasDiscrepancy;
    return {
      totalStoredMasterDebt,
      totalCalculatedLedgerDebt,
      isMatch,
      discrepancyCount: data.filter((item) => !storage.getCustomerReconciliation(item.customer.id).isBalanced).length,
    };
  }, [data]);

  // Filter & Sort
  const filteredData = useMemo(() => {
    return data
      .filter((item) => {
        const q = search.toLowerCase().trim();
        const matchesSearch =
          !q ||
          item.customer.name.toLowerCase().includes(q) ||
          (item.customer.partner_name && item.customer.partner_name.toLowerCase().includes(q)) ||
          item.customer.code.toLowerCase().includes(q) ||
          (item.customer.phone && item.customer.phone.includes(q)) ||
          (item.customer.village_or_address && item.customer.village_or_address.toLowerCase().includes(q));

        let matchesStatus = true;
        if (statusFilter === 'debtors') matchesStatus = item.currentBalance > 0.01;
        else if (statusFilter === 'zero') matchesStatus = Math.abs(item.currentBalance) <= 0.01;
        else if (statusFilter === 'creditors') matchesStatus = item.currentBalance < -0.01;

        let matchesVillage = true;
        if (selectedVillage !== 'all') {
          matchesVillage = item.customer.village_or_address?.trim() === selectedVillage;
        }

        let matchesPeriod = true;
        if (startDate || endDate) {
          if (!item.lastMovementDate) {
            matchesPeriod = false;
          } else {
            const time = new Date(item.lastMovementDate).getTime();
            if (startDate && time < new Date(startDate).getTime()) matchesPeriod = false;
            if (endDate && time > new Date(endDate + 'T23:59:59').getTime()) matchesPeriod = false;
          }
        }

        return matchesSearch && matchesStatus && matchesVillage && matchesPeriod;
      })
      .sort((a, b) => {
        if (sortField === 'debt_desc') return b.currentBalance - a.currentBalance;
        if (sortField === 'debt_asc') return a.currentBalance - b.currentBalance;
        if (sortField === 'name') return a.customer.name.localeCompare(b.customer.name, 'ar');
        if (sortField === 'sales_desc') return b.totalSales - a.totalSales;
        if (sortField === 'last_movement') {
          const tA = a.lastMovementDate ? new Date(a.lastMovementDate).getTime() : 0;
          const tB = b.lastMovementDate ? new Date(b.lastMovementDate).getTime() : 0;
          return tB - tA;
        }
        if (sortField === 'last_payment') {
          const tA = a.lastPaymentDate ? new Date(a.lastPaymentDate).getTime() : 0;
          const tB = b.lastPaymentDate ? new Date(b.lastPaymentDate).getTime() : 0;
          return tB - tA;
        }
        return 0;
      });
  }, [data, search, statusFilter, selectedVillage, sortField, startDate, endDate]);

  // Aggregate Totals for the currently filtered view
  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, item) => {
        acc.opening += item.openingBalance || 0;
        acc.sales += item.totalSales || 0;
        acc.payments += item.totalPayments || 0;
        acc.returns += item.totalReturns || 0;
        acc.balance += item.currentBalance || 0;
        if (item.currentBalance > 0.01) acc.debtorsCount += 1;
        return acc;
      },
      { opening: 0, sales: 0, payments: 0, returns: 0, balance: 0, debtorsCount: 0 }
    );
  }, [filteredData]);

  const handleExportExcel = () => {
    const headers = [
      'كود العميل',
      'اسم العميل',
      'رقم الهاتف',
      'القرية / العنوان',
      'إجمالي المبيعات الآجلة',
      'إجمالي التحصيلات',
      'إجمالي المرتجعات',
      'الرصيد المستحق الحالي',
      'حالة الحساب',
      'تاريخ آخر حركة',
      'تاريخ آخر تحصيل',
    ];

    const rows = filteredData.map((item) => [
      item.customer.code,
      item.customer.name,
      item.customer.phone || 'غير مسجل',
      item.customer.village_or_address || 'غير محدد',
      item.totalSales,
      item.totalPayments,
      item.totalReturns,
      item.currentBalance,
      item.status,
      item.lastMovementDate ? formatDate(item.lastMovementDate) : 'لا توجد حركة',
      item.lastPaymentDate ? formatDate(item.lastPaymentDate) : 'لم يسدد بعد',
    ]);

    // Summary row
    rows.push([
      'الإجمالي',
      `عدد العملاء: ${filteredData.length}`,
      '',
      '',
      totals.sales,
      totals.payments,
      totals.returns,
      totals.balance,
      `مدينين: ${totals.debtorsCount}`,
      '',
      '',
    ]);

    exportToCsv(`التقرير_الشامل_لديون_وحسابات_العملاء_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const handleSyncAllBalances = () => {
    data.forEach((item) => {
      storage.recalculateCustomerBalance(item.customer.id);
    });
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Reconciliation Audit Guarantee */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 text-blue-700 rounded-2xl shrink-0">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              التقرير الشامل لحسابات وديون العملاء
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              جدول محاسبي مركزي موحد يعرض كشوفات أرصدة المزارعين، المبيعات الآجلة، التحصيلات النقدية، ومطابقة اليومية الدفترية
            </p>
          </div>
        </div>

        {/* Reconciliation Status Badge */}
        <div className="flex items-center gap-3 shrink-0">
          {reconciliation.isMatch ? (
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>إجماليات التقرير مطابقة 100% لكشوف الحسابات الفردية</span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs sm:text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                توجد فروق دفترية في ({reconciliation.discrepancyCount}) حساب
              </span>
              <button
                onClick={handleSyncAllBalances}
                className="underline font-bold text-amber-950 hover:text-amber-800 mr-2"
              >
                مزامنة وتصحيح الأرصدة الآن
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Strip with Spacious Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500 block">إجمالي ديون العملاء</span>
          <span className="text-xl font-bold font-mono text-amber-700 block tabular-nums">
            {formatCurrency(totals.balance)}
          </span>
          <span className="text-xs text-slate-400 block pt-0.5">صافي المستحق للمحل</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500 block">إجمالي المبيعات</span>
          <span className="text-xl font-bold font-mono text-slate-900 block tabular-nums">
            {formatCurrency(totals.sales)}
          </span>
          <span className="text-xs text-slate-400 block pt-0.5">فواتير بيع مسجلة</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500 block">إجمالي التحصيلات</span>
          <span className="text-xl font-bold font-mono text-emerald-700 block tabular-nums">
            {formatCurrency(totals.payments)}
          </span>
          <span className="text-xs text-emerald-600 block pt-0.5">سندات قبض نقدية</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500 block">إجمالي المرتجعات</span>
          <span className="text-xl font-bold font-mono text-blue-700 block tabular-nums">
            {formatCurrency(totals.returns)}
          </span>
          <span className="text-xs text-slate-400 block pt-0.5">مرتجعات مبيعات</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500 block">الرصيد الافتتاحي</span>
          <span className="text-xl font-bold font-mono text-slate-700 block tabular-nums">
            {formatCurrency(totals.opening)}
          </span>
          <span className="text-xs text-slate-400 block pt-0.5">أول المدة والدفاتر</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500 block">العملاء المدينين</span>
          <span className="text-xl font-bold font-mono text-rose-700 block tabular-nums">
            {totals.debtorsCount}{' '}
            <span className="text-xs font-normal text-slate-500">/ {filteredData.length}</span>
          </span>
          <span className="text-xs text-rose-600 block pt-0.5">عليهم مستحقات حالية</span>
        </div>
      </div>

      {/* Filter and Action Bar with Comfortable Spacing */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          {/* Search Input */}
          <div className="relative min-w-[280px] flex-1">
            <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم المزارع، الكود، رقم الهاتف، القرية..."
              className="w-full pr-10 pl-4 py-2.5 text-sm bg-slate-50/70 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Export and Print Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportExcel}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 rounded-xl shadow-xs transition-colors"
              title="تصدير التقرير الشامل بتنسيق إكسيل عربي"
            >
              <Download className="w-4 h-4" />
              <span>تصدير Excel</span>
            </button>
            <button
              onClick={() => printVisibleArea()}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة</span>
            </button>
          </div>
        </div>

        {/* Filters Controls Row with Breathing Room */}
        <div className="flex flex-wrap items-center gap-3.5 pt-2 border-t border-slate-100 text-xs sm:text-sm">
          {/* Status Filter Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({data.length})
            </button>
            <button
              onClick={() => setStatusFilter('debtors')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusFilter === 'debtors'
                  ? 'bg-amber-100 text-amber-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              المدينين فقط ({data.filter((i) => i.currentBalance > 0.01).length})
            </button>
            <button
              onClick={() => setStatusFilter('zero')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusFilter === 'zero'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الخالصين ({data.filter((i) => Math.abs(i.currentBalance) <= 0.01).length})
            </button>
            <button
              onClick={() => setStatusFilter('creditors')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusFilter === 'creditors'
                  ? 'bg-blue-100 text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الدائنين ({data.filter((i) => i.currentBalance < -0.01).length})
            </button>
          </div>

          {/* Village Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">القرية/المنطقة:</span>
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">كل القرى والمناطق</option>
              {distinctVillages.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Field Selector */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 text-xs">الترتيب:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="debt_desc">أعلى مديونية أولاً (افتراضي)</option>
              <option value="debt_asc">أقل مديونية أولاً</option>
              <option value="name">الاسم أبجدياً</option>
              <option value="sales_desc">أكبر مبيعات</option>
              <option value="last_movement">أحدث حركة</option>
              <option value="last_payment">أحدث تحصيل</option>
            </select>
          </div>

          {/* Date Range for Last Movement */}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 text-xs">فترة الحركة:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono"
            />
            <span className="text-slate-400 text-xs">إلى</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono"
            />
          </div>

          {(search || statusFilter !== 'all' || selectedVillage !== 'all' || startDate || endDate) && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setSelectedVillage('all');
                setStartDate('');
                setEndDate('');
              }}
              className="text-slate-500 hover:text-slate-900 text-xs underline mr-auto flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Unified Table with Spacious Cells & Min-Widths */}
      <div className="invoice-print-area bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm border-collapse min-w-[1250px]">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-4 px-4 sm:px-5 whitespace-nowrap min-w-[200px]">كود واسم العميل</th>
                <th className="py-4 px-4 sm:px-5 whitespace-nowrap min-w-[140px]">الهاتف</th>
                <th className="py-4 px-4 sm:px-5 whitespace-nowrap min-w-[150px]">القرية / العنوان</th>
                <th className="py-4 px-4 sm:px-5 whitespace-nowrap text-left min-w-[130px]">إجمالي المبيعات</th>
                <th className="py-4 px-4 sm:px-5 whitespace-nowrap text-left min-w-[130px]">إجمالي التحصيلات</th>
                <th className="py-4 px-4 sm:px-5 whitespace-nowrap text-left min-w-[110px]">المرتجعات</th>
                <th className="py-4 px-4 sm:px-5 whitespace-nowrap text-left font-bold text-slate-900 bg-amber-50/70 min-w-[150px]">
                  الرصيد المستحق
                </th>
                <th className="py-4 px-4 sm:px-5 whitespace-nowrap min-w-[120px]">آخر حركة</th>
                <th className="py-4 px-4 sm:px-5 whitespace-nowrap min-w-[120px]">تاريخ آخر تحصيل</th>
                <th className="py-4 px-4 sm:px-5 whitespace-nowrap text-center min-w-[130px]">حالة الحساب</th>
                <th className="no-print py-4 px-4 sm:px-5 whitespace-nowrap text-center min-w-[150px]">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-3 stroke-1 text-slate-300" />
                    <p className="text-base font-medium">لا يوجد عملاء يطابقون محددات التصفية والبحث</p>
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const hasDebt = item.currentBalance > 0.01;
                  const isZero = Math.abs(item.currentBalance) <= 0.01;
                  const isCredit = item.currentBalance < -0.01;

                  return (
                    <tr
                      key={item.customer.id}
                      className={`hover:bg-slate-50/90 transition-colors ${
                        hasDebt ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Name & Code */}
                      <td className="py-3.5 px-4 sm:px-5">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                          <span>{item.customer.name}</span>
                          {item.customer.partner_name && (
                            <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                              (شريك: {item.customer.partner_name})
                            </span>
                          )}
                        </div>
                        <span className="tabular-nums text-xs text-slate-400 mt-0.5 block">
                          {item.customer.code}
                        </span>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 sm:px-5 tabular-nums text-slate-600 text-xs">
                        {item.customer.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.customer.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Village / Address */}
                      <td className="py-3.5 px-4 sm:px-5 text-slate-600 max-w-[180px] truncate text-xs sm:text-sm">
                        {item.customer.village_or_address || (
                          <span className="text-slate-300">غير محدد</span>
                        )}
                      </td>

                      {/* Total Sales */}
                      <td className="py-3.5 px-4 sm:px-5 text-left font-semibold text-slate-900 tabular-nums">
                        {item.totalSales > 0 ? formatCurrency(item.totalSales) : '-'}
                      </td>

                      {/* Total Payments */}
                      <td className="py-3.5 px-4 sm:px-5 text-left font-semibold text-emerald-700 tabular-nums">
                        {item.totalPayments > 0 ? formatCurrency(item.totalPayments) : '-'}
                      </td>

                      {/* Total Returns */}
                      <td className="py-3.5 px-4 sm:px-5 text-left text-blue-700 tabular-nums font-medium">
                        {item.totalReturns > 0 ? formatCurrency(item.totalReturns) : '-'}
                      </td>

                      {/* Current Balance Due */}
                      <td className="py-3.5 px-4 sm:px-5 text-left font-bold bg-amber-50/70 tabular-nums">
                        <span
                          className={`text-sm sm:text-base ${
                            hasDebt
                              ? 'text-amber-800 font-extrabold'
                              : isCredit
                              ? 'text-blue-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {formatCurrency(item.currentBalance)}
                        </span>
                      </td>

                      {/* Last Movement Date */}
                      <td className="py-3.5 px-4 sm:px-5 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {item.lastMovementDate ? (
                          <span>{formatDate(item.lastMovementDate)}</span>
                        ) : (
                          <span className="text-slate-300">لا يوجد</span>
                        )}
                      </td>

                      {/* Last Payment Date */}
                      <td className="py-3.5 px-4 sm:px-5 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {item.lastPaymentDate ? (
                          <span className="text-emerald-800 font-semibold">
                            {formatDate(item.lastPaymentDate)}
                          </span>
                        ) : (
                          <span className="text-slate-300">لم يسدد</span>
                        )}
                      </td>

                      {/* Account Status Badge */}
                      <td className="py-3.5 px-4 sm:px-5 text-center whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                            hasDebt
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : isCredit
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}
                        >
                          {hasDebt ? 'مدين للمحل' : isCredit ? 'دائن (له رصيد)' : 'متزن / خالص'}
                        </span>
                      </td>

                      {/* Row Actions */}
                      <td className="no-print py-3.5 px-4 sm:px-5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedLedgerCustomer(item.customer)}
                            type="button"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            title="فتح كشف الحساب التفصيلي للعميل"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span>كشف الحساب</span>
                          </button>

                          <button
                            onClick={() => setSelectedPaymentCustomer(item.customer)}
                            type="button"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                            title="تسجيل سند تحصيل وقبض نقدي فوري"
                          >
                            <BadgeDollarSign className="w-3.5 h-3.5 text-emerald-600" />
                            <span>قبض</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer with Exact Reconciled Column Sums */}
            {filteredData.length > 0 && (
              <tfoot className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-200 text-xs sm:text-sm">
                <tr>
                  <td className="py-4 px-4 sm:px-5">
                    الإجمالي العام ({filteredData.length} عميل)
                  </td>
                  <td colSpan={2} className="py-4 px-4 sm:px-5 text-slate-500 font-normal">
                    المدينين: {totals.debtorsCount} عميل
                  </td>
                  <td className="py-4 px-4 sm:px-5 text-left font-mono tabular-nums">{formatCurrency(totals.opening)}</td>
                  <td className="py-4 px-4 sm:px-5 text-left font-mono tabular-nums">{formatCurrency(totals.sales)}</td>
                  <td className="py-4 px-4 sm:px-5 text-left font-mono tabular-nums text-emerald-800">
                    {formatCurrency(totals.payments)}
                  </td>
                  <td className="py-4 px-4 sm:px-5 text-left font-mono tabular-nums text-blue-800">
                    {formatCurrency(totals.returns)}
                  </td>
                  <td className="py-4 px-4 sm:px-5 text-left font-mono tabular-nums text-amber-900 text-sm sm:text-base font-extrabold bg-amber-100/70">
                    {formatCurrency(totals.balance)}
                  </td>
                  <td colSpan={4} className="py-4 px-4 sm:px-5 text-slate-500 text-xs font-normal">
                    مطابق لقاعدة اليومية الدفترية المعتمدة
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Customer Ledger Statement Modal */}
      {selectedLedgerCustomer && (
        <CustomerLedgerModal
          customer={selectedLedgerCustomer}
          onClose={() => setSelectedLedgerCustomer(null)}
          onReceivePaymentClick={(cust) => setSelectedPaymentCustomer(cust)}
        />
      )}

      {/* Customer Payment Receipt Modal */}
      {selectedPaymentCustomer && (
        <CustomerPaymentModal
          customer={selectedPaymentCustomer}
          isOpen={true}
          onClose={() => {
            setSelectedPaymentCustomer(null);
            loadData();
          }}
          onSuccess={() => {
            setSelectedPaymentCustomer(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};
