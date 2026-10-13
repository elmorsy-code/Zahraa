import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Coins,
  Search,
  Calendar,
  Eye,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  BadgeDollarSign,
  FileSpreadsheet,
  FileText,
  Download,
  Printer,
  History,
  ArrowUpDown,
  ShoppingBag,
  Scale,
  Pill,
  FlaskConical,
} from 'lucide-react';
import { Customer, CustomerLedgerEntry } from '../../types/database';
import { storage } from '../../lib/storage';
import { authService } from '../../lib/auth';
import { formatCurrency, formatDateTime } from '../../lib/formatters';
import { AddCustomerDebtModal } from './AddCustomerDebtModal';
import { CustomerPaymentModal } from '../customers/CustomerPaymentModal';
import { CustomerLedgerModal } from '../customers/CustomerLedgerModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { Pagination } from '../common/Pagination';
import { exportToCsv } from '../../lib/exportUtils';
import { printVisibleArea } from '../../lib/printUtils';

export const CustomerDebtsScreen: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeView, setActiveView] = useState<'log' | 'summary'>('log');
  const [search, setSearch] = useState('');
  const [filterDebtorsOnly, setFilterDebtorsOnly] = useState(true);

  // Pagination for log view
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(15);

  // Modals state
  const [addDebtModalOpen, setAddDebtModalOpen] = useState(false);
  const [preselectedCustId, setPreselectedCustId] = useState<string | undefined>(undefined);
  const [paymentModalCustomer, setPaymentModalCustomer] = useState<Customer | null>(null);
  const [ledgerModalCustomer, setLedgerModalCustomer] = useState<Customer | null>(null);
  const [deleteTargetEntry, setDeleteTargetEntry] = useState<{ id: string; desc: string; amount: number } | null>(null);

  const [, setDataTick] = useState(0);

  useEffect(() => {
    loadData();
    const unsub = storage.subscribe(loadData);
    return () => unsub();
  }, []);

  const loadData = () => {
    setCustomers(storage.getCustomers());
    setDataTick((t) => t + 1);
  };

  // Build flattened list of all debt purchase entries across customers
  const debtEntriesWithCustomer = useMemo(() => {
    const list: Array<{
      entry: CustomerLedgerEntry;
      customer: Customer;
    }> = [];

    customers.forEach((cust) => {
      const ledgers = storage.getCustomerLedger(cust.id);
      ledgers.forEach((entry) => {
        // Entries representing customer debt purchases
        if (entry.debit > 0) {
          list.push({
            entry,
            customer: cust,
          });
        }
      });
    });

    // Sort by purchase/entry date descending (most recent first)
    return list.sort((a, b) => new Date(b.entry.entry_date).getTime() - new Date(a.entry.entry_date).getTime());
  }, [customers]);

  // Filtered debt entries for the Log view
  const filteredDebtEntries = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return debtEntriesWithCustomer;

    return debtEntriesWithCustomer.filter((item) => {
      const custName = item.customer.name.toLowerCase();
      const partnerName = (item.customer.partner_name || '').toLowerCase();
      const itemDesc = (item.entry.description || '').toLowerCase();
      const docNum = (item.entry.document_number || '').toLowerCase();
      return custName.includes(q) || partnerName.includes(q) || itemDesc.includes(q) || docNum.includes(q);
    });
  }, [debtEntriesWithCustomer, search]);

  const pagedDebtEntries = useMemo(() => {
    const start = (logPage - 1) * logPageSize;
    return filteredDebtEntries.slice(start, start + logPageSize);
  }, [filteredDebtEntries, logPage, logPageSize]);

  // Filtered customers for Summary view
  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return customers.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.partner_name && c.partner_name.toLowerCase().includes(q)) ||
        c.code.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.village_or_address && c.village_or_address.toLowerCase().includes(q));

      const matchesDebt = !filterDebtorsOnly || c.current_balance > 0.01;
      return matchesSearch && matchesDebt;
    });
  }, [customers, search, filterDebtorsOnly]);

  // Statistics
  const totalOutstandingDebt = customers.reduce((sum, c) => sum + Math.max(0, c.current_balance), 0);
  const debtorCustomersCount = customers.filter((c) => c.current_balance > 0.01).length;
  const totalDebtsLoggedAmount = debtEntriesWithCustomer.reduce((sum, item) => sum + (item.entry.debit || 0), 0);

  // Handle entry deletion
  const handleDeleteEntryConfirm = async (): Promise<{ success: boolean; error?: string }> => {
    if (!deleteTargetEntry) return { success: false, error: 'لم يتم تحديد الحركة' };
    try {
      await storage.deleteCustomerDebtEntry(deleteTargetEntry.id);
      loadData();
      setDeleteTargetEntry(null);
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err?.message || 'فشل حذف حركة المديونية' };
    }
  };

  const handleExportCsv = () => {
    if (activeView === 'log') {
      const headers = ['رقم الفاتورة', 'تاريخ الشراء', 'اسم العميل', 'الشريك', 'اسم الشيء المشترى', 'المبلغ', 'الرصيد بعد'];
      const rows = filteredDebtEntries.map((i) => [
        i.entry.document_number || '-',
        formatDateTime(i.entry.entry_date),
        i.customer.name,
        i.customer.partner_name || '-',
        i.entry.description,
        i.entry.debit,
        i.entry.running_balance,
      ]);
      exportToCsv(`سجل_مديونيات_العملاء_${new Date().toISOString().slice(0, 10)}`, headers, rows);
    } else {
      const headers = ['كود العميل', 'اسم العميل', 'الشريك', 'الهاتف', 'القرية', 'الرصيد المستحق'];
      const rows = filteredCustomers.map((c) => [
        c.code,
        c.name,
        c.partner_name || '-',
        c.phone || '-',
        c.village_or_address || '-',
        c.current_balance,
      ]);
      exportToCsv(`كشف_مديونيات_العملاء_${new Date().toISOString().slice(0, 10)}`, headers, rows);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-sm">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                قسم مديونيات العملاء
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                إضافة المديونية بكتابة المبلغ واسم الشيء المشترى وتاريخ الشراء ومتابعة التحصيلات
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Main Action: Add Debt */}
          <button
            onClick={() => {
              setPreselectedCustId(undefined);
              setAddDebtModalOpen(true);
            }}
            type="button"
            className="flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-black text-white bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-700 hover:to-amber-900 rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            <span>تسجيل مديونية جديدة</span>
          </button>

          {/* Collect Debt / Receive Payment */}
          <button
            onClick={() => {
              const firstDebtor = customers.find((c) => c.current_balance > 0) || customers[0] || null;
              setPaymentModalCustomer(firstDebtor);
            }}
            type="button"
            className="flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl cursor-pointer transition-all active:scale-95"
          >
            <BadgeDollarSign className="w-4 h-4 text-emerald-700" />
            <span>سند قبض / تحصيل نقدية</span>
          </button>
        </div>
      </div>

      {/* 2. Master KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {/* KPI 1: Total Debts */}
        <div className="card-box p-5 border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/70 via-white to-white shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-bold text-slate-700">إجمالي المديونيات المستحقة للمحل</span>
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-950 tabular-nums">
            {formatCurrency(totalOutstandingDebt)}
          </div>
          <div className="text-xs font-semibold text-slate-500 pt-2.5 mt-2.5 border-t border-slate-100">
            مستحقة على <span className="font-bold text-amber-900">{debtorCustomersCount} عميل مدين</span>
          </div>
        </div>

        {/* KPI 2: Number of Debtors */}
        <div className="card-box p-5 border-2 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-bold text-slate-700">عدد العملاء المدينين</span>
            <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
            {debtorCustomersCount} <span className="text-sm font-medium text-slate-500">من أصل {customers.length}</span>
          </div>
          <div className="text-xs font-semibold text-slate-500 pt-2.5 mt-2.5 border-t border-slate-100">
            عملاء عليهم مديونيات قائمة
          </div>
        </div>

        {/* KPI 3: Total Recorded Debts Volume */}
        <div className="card-box p-5 border-2 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-bold text-slate-700">إجمالي المشتريات بالآجل المسجلة</span>
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-950 tabular-nums">
            {formatCurrency(totalDebtsLoggedAmount)}
          </div>
          <div className="text-xs font-semibold text-slate-500 pt-2.5 mt-2.5 border-t border-slate-100">
            في <span className="font-bold text-emerald-900">{debtEntriesWithCustomer.length} حركة شراء</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar & View Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          {/* Tab 1: Log View */}
          <button
            onClick={() => setActiveView('log')}
            type="button"
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer ${
              activeView === 'log'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>سجل المشتريات والمديونيات ({debtEntriesWithCustomer.length})</span>
          </button>

          {/* Tab 2: Summary View */}
          <button
            onClick={() => setActiveView('summary')}
            type="button"
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer ${
              activeView === 'summary'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>كشف حسابات العملاء ({customers.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeView === 'log' ? 'ابحث برقم الفاتورة، اسم العميل، أو الشيء المشترى...' : 'ابحث باسم العميل، الشريك، القرية...'}
              className="w-full text-xs pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>

          {activeView === 'summary' && (
            <button
              onClick={() => setFilterDebtorsOnly(!filterDebtorsOnly)}
              type="button"
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                filterDebtorsOnly
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              المدينين فقط ({debtorCustomersCount})
            </button>
          )}

          <button
            onClick={handleExportCsv}
            type="button"
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            title="تصدير ملف Excel / CSV"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => printVisibleArea()}
            type="button"
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            title="طباعة الجدول"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. VIEW 1: DETAILED PURCHASES & DEBTS LOG */}
      {activeView === 'log' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm border-collapse min-w-[950px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-4 px-4 min-w-[120px]">رقم الفاتورة</th>
                  <th className="py-4 px-4 min-w-[150px]">تاريخ ووقت الشراء</th>
                  <th className="py-4 px-4 min-w-[180px]">اسم العميل</th>
                  <th className="py-4 px-4 min-w-[220px]">اسم الشيء المشترى والكمية</th>
                  <th className="py-4 px-4 text-left">مبلغ الشراء</th>
                  <th className="py-4 px-4 text-left">الرصيد بعدها</th>
                  <th className="py-4 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDebtEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-slate-400">
                      <ShoppingBag className="w-10 h-10 mx-auto mb-3 stroke-1 text-slate-300" />
                      <p className="text-sm font-medium">لا توجد حركات مديونية مسجلة</p>
                      <button
                        onClick={() => setAddDebtModalOpen(true)}
                        type="button"
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>تسجيل أول مديونية</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  pagedDebtEntries.map(({ entry, customer }) => (
                    <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Invoice Number (رقم الفاتورة مستقل) */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/90 text-slate-900 font-mono font-bold text-xs tabular-nums">
                          <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{entry.document_number || '-'}</span>
                        </span>
                      </td>

                      {/* 2. Purchase Date (تاريخ الشراء) */}
                      <td className="py-3.5 px-4 font-mono text-slate-700 text-xs tabular-nums">
                        <div className="font-bold text-slate-900">{formatDateTime(entry.entry_date)}</div>
                      </td>

                      {/* 3. Customer Name (اسم العميل) */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{customer.name}</div>
                        {customer.partner_name && (
                          <div className="text-[11px] text-amber-800 font-semibold">
                            (شريك: {customer.partner_name})
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400">{customer.village_or_address || customer.phone}</div>
                      </td>

                      {/* 4. Purchased Item Name (الأدوية المشتراة والكميات الأساسية والفرعية) */}
                      <td className="py-3.5 px-4">
                        {(() => {
                          const raw = entry.description || 'شراء بضاعة على الحساب';
                          // Check if description has multiple medicines split by ' + '
                          const parts = raw.split(/\s+\+\s+/);

                          return (
                            <div className="space-y-1.5">
                              {parts.length > 1 && (
                                <div className="text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-block">
                                  فاتورة تحتوي على {parts.length} أدوية/أصناف
                                </div>
                              )}
                              {parts.map((part, pIdx) => {
                                const subQtyMatch = part.match(/\[كمية فرعية:\s*([^\]]+)\]/);
                                const stdQtyMatch = part.match(/\[كمية:\s*([^\]]+)\]/) || part.match(/\(الكمية:\s*([^\)]+)\)/);
                                const cleanName = part
                                  .replace(/\[كمية فرعية:\s*[^\]]+\]/g, '')
                                  .replace(/\[كمية:\s*[^\]]+\]/g, '')
                                  .replace(/\(الكمية:\s*[^\)]+\)/g, '')
                                  .trim();

                                return (
                                  <div key={pIdx} className="space-y-0.5 border-b border-slate-100 last:border-b-0 pb-1 last:pb-0">
                                    <div className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                                      <Pill className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                      <span>{cleanName || part}</span>
                                    </div>

                                    {subQtyMatch && (
                                      <div className="inline-flex items-center gap-1 text-[11px] font-black bg-indigo-100 text-indigo-950 border border-indigo-300 px-2 py-0.5 rounded-lg">
                                        <FlaskConical className="w-3 h-3 text-indigo-700" />
                                        <span>كمية فرعية: {subQtyMatch[1]}</span>
                                      </div>
                                    )}

                                    {!subQtyMatch && stdQtyMatch && (
                                      <div className="inline-flex items-center gap-1 text-[11px] font-black bg-amber-100 text-amber-950 border border-amber-300 px-2 py-0.5 rounded-lg">
                                        <Scale className="w-3 h-3 text-amber-700" />
                                        <span>الكمية: {stdQtyMatch[1]}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </td>

                      {/* 5. Debt Amount */}
                      <td className="py-3.5 px-4 text-left font-black text-amber-800 text-sm tabular-nums">
                        {formatCurrency(entry.debit)}
                      </td>

                      {/* 6. Running Balance After */}
                      <td className="py-3.5 px-4 text-left font-bold text-slate-600 text-xs tabular-nums">
                        {formatCurrency(entry.running_balance)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Customer Ledger */}
                          <button
                            onClick={() => setLedgerModalCustomer(customer)}
                            type="button"
                            className="p-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors"
                            title="عرض كشف حساب العميل كاملاً"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Quick Receive Payment */}
                          <button
                            onClick={() => setPaymentModalCustomer(customer)}
                            type="button"
                            className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer transition-colors"
                            title="سند قبض / تحصيل نقدية"
                          >
                            <BadgeDollarSign className="w-4 h-4" />
                          </button>

                          {/* Delete Entry */}
                          <button
                            onClick={() =>
                              setDeleteTargetEntry({
                                id: entry.id,
                                desc: entry.description,
                                amount: entry.debit,
                              })
                            }
                            type="button"
                            className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer transition-colors"
                            title="حذف قيد المديونية وتصحيح الرصيد"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredDebtEntries.length > logPageSize && (
            <div className="p-3 border-t border-slate-100 bg-slate-50/50">
              <Pagination
                currentPage={logPage}
                totalItems={filteredDebtEntries.length}
                pageSize={logPageSize}
                onPageChange={(p) => setLogPage(p)}
                onPageSizeChange={(s) => setLogPageSize(s)}
                pageSizeOptions={[15, 30, 50]}
              />
            </div>
          )}
        </div>
      )}

      {/* 5. VIEW 2: CUSTOMERS LEDGER SUMMARY */}
      {activeView === 'summary' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm border-collapse min-w-[850px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-4 px-4">كود العميل</th>
                  <th className="py-4 px-4 min-w-[200px]">الاسم والشريك</th>
                  <th className="py-4 px-4">الهاتف والقرية</th>
                  <th className="py-4 px-4 text-left">إجمالي المديونية المستحقة</th>
                  <th className="py-4 px-4 text-center">حالة الحساب</th>
                  <th className="py-4 px-4 text-center min-w-[220px]">إجراءات سريعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-slate-400">
                      <Users className="w-10 h-10 mx-auto mb-3 stroke-1 text-slate-300" />
                      <p className="text-sm font-medium">لا يوجد عملاء يطابقون محددات البحث</p>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                        {cust.code}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{cust.name}</div>
                        {cust.partner_name && (
                          <div className="text-[11px] text-amber-800 font-semibold">
                            (شريك: {cust.partner_name})
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        <div>{cust.phone || '-'}</div>
                        <div className="text-slate-400">{cust.village_or_address || '-'}</div>
                      </td>

                      <td className="py-3.5 px-4 text-left font-black text-sm tabular-nums">
                        <span
                          className={
                            cust.current_balance > 0
                              ? 'text-amber-800'
                              : cust.current_balance < 0
                              ? 'text-blue-700'
                              : 'text-emerald-700'
                          }
                        >
                          {formatCurrency(cust.current_balance)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            cust.current_balance > 0
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : cust.current_balance < 0
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}
                        >
                          {cust.current_balance > 0 ? 'مدين للمحل' : cust.current_balance < 0 ? 'دائن (له)' : 'خالص'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Add Debt specifically for this customer */}
                          <button
                            onClick={() => {
                              setPreselectedCustId(cust.id);
                              setAddDebtModalOpen(true);
                            }}
                            type="button"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-amber-700" />
                            <span>تسجيل شراء</span>
                          </button>

                          {/* Collect Payment */}
                          <button
                            onClick={() => setPaymentModalCustomer(cust)}
                            type="button"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg cursor-pointer"
                          >
                            <BadgeDollarSign className="w-3.5 h-3.5 text-emerald-700" />
                            <span>قبض</span>
                          </button>

                          {/* View Ledger */}
                          <button
                            onClick={() => setLedgerModalCustomer(cust)}
                            type="button"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>كشف الحساب</span>
                          </button>
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

      {/* MODALS */}
      {/* 1. Add Customer Debt Modal */}
      <AddCustomerDebtModal
        isOpen={addDebtModalOpen}
        onClose={() => setAddDebtModalOpen(false)}
        onSuccess={() => loadData()}
        initialCustomerId={preselectedCustId}
      />

      {/* 2. Customer Payment / Receipt Modal */}
      {paymentModalCustomer && (
        <CustomerPaymentModal
          customer={paymentModalCustomer}
          onClose={() => setPaymentModalCustomer(null)}
          onSuccess={() => loadData()}
        />
      )}

      {/* 3. Detailed Customer Ledger Modal */}
      {ledgerModalCustomer && (
        <CustomerLedgerModal
          customer={ledgerModalCustomer}
          onClose={() => setLedgerModalCustomer(null)}
        />
      )}

      {/* 4. Confirm Delete Debt Entry */}
      <ConfirmDeleteModal
        isOpen={!!deleteTargetEntry}
        onClose={() => setDeleteTargetEntry(null)}
        onConfirm={handleDeleteEntryConfirm}
        title="تأكيد حذف حركة المديونية"
        itemName={deleteTargetEntry?.desc}
        description={`هل أنت متأكد من حذف حركة المديونية بمبلغ ${formatCurrency(
          deleteTargetEntry?.amount || 0
        )}؟ سيتم خصم هذا المبلغ من رصيد العميل فوراً.`}
      />
    </div>
  );
};
