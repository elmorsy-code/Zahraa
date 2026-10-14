import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Truck,
  Eye,
  Trash2,
  Printer,
  Download,
  Calendar,
  Clock,
  Banknote,
  CreditCard,
  Building2,
  Pill,
  CheckCircle2,
  AlertCircle,
  FileText,
  BadgeDollarSign,
  ChevronLeft,
} from 'lucide-react';
import { PurchaseInvoice, Supplier } from '../../types/database';
import { storage } from '../../lib/storage';
import { formatCurrency, formatDateTime, formatDate } from '../../lib/formatters';
import { AddInvoiceModal } from './AddInvoiceModal';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { SupplierModal } from './SupplierModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { Pagination } from '../common/Pagination';
import { exportToCsv } from '../../lib/exportUtils';
import { printVisibleArea } from '../../lib/printUtils';
import { authService } from '../../lib/auth';

interface InvoicesScreenProps {
  initialTab?: 'invoices' | 'suppliers';
}

export const InvoicesScreen: React.FC<InvoicesScreenProps> = ({
  initialTab = 'invoices',
}) => {
  const isAdmin = authService.canModify(authService.getCurrentUser()?.role);
  const [activeTab, setActiveTab] = useState<'invoices' | 'suppliers'>(initialTab);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Search and Filters
  const [search, setSearch] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('all');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Modals
  const [addInvoiceOpen, setAddInvoiceOpen] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState<PurchaseInvoice | null>(null);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteTargetInvoice, setDeleteTargetInvoice] = useState<PurchaseInvoice | null>(null);

  useEffect(() => {
    loadData();
    const unsub = storage.subscribe(loadData);
    return () => unsub();
  }, []);

  const loadData = () => {
    setInvoices(storage.getPurchaseInvoices());
    setSuppliers(storage.getSuppliers());
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalCount = invoices.length;
    const totalPurchases = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
    const totalRemaining = invoices.reduce((sum, inv) => sum + (inv.remaining_amount || 0), 0);
    const totalSupplierDebt = suppliers.reduce((sum, s) => sum + (s.current_balance || 0), 0);

    return {
      totalCount,
      totalPurchases,
      totalPaid,
      totalRemaining,
      totalSupplierDebt,
    };
  }, [invoices, suppliers]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    const q = search.toLowerCase().trim();
    const now = new Date();

    return invoices.filter((inv) => {
      // 1. Text Search
      if (q) {
        const suppName = (inv.supplier_name || '').toLowerCase();
        const invNum = (inv.invoice_number || '').toLowerCase();
        const suppInvNum = (inv.supplier_invoice_number || '').toLowerCase();
        const notes = (inv.notes || '').toLowerCase();
        const hasItemMatch = inv.items?.some((it) =>
          it.product_name_snapshot?.toLowerCase().includes(q)
        );

        const match =
          suppName.includes(q) ||
          invNum.includes(q) ||
          suppInvNum.includes(q) ||
          notes.includes(q) ||
          hasItemMatch;

        if (!match) return false;
      }

      // 2. Supplier Filter
      if (selectedSupplierFilter !== 'all' && inv.supplier_id !== selectedSupplierFilter) {
        return false;
      }

      // 3. Payment Filter
      if (selectedPaymentFilter !== 'all' && inv.payment_type !== selectedPaymentFilter) {
        return false;
      }

      // 4. Date Filter
      if (dateFilter !== 'all') {
        const invDate = new Date(inv.invoice_date);
        if (dateFilter === 'today') {
          const isToday =
            invDate.getDate() === now.getDate() &&
            invDate.getMonth() === now.getMonth() &&
            invDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (dateFilter === 'week') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (invDate < sevenDaysAgo) return false;
        } else if (dateFilter === 'month') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (invDate < thirtyDaysAgo) return false;
        }
      }

      return true;
    });
  }, [invoices, search, selectedSupplierFilter, selectedPaymentFilter, dateFilter]);

  // Paginated Invoices
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  // Total pages
  const totalPages = Math.ceil(filteredInvoices.length / pageSize) || 1;

  // Handle Export CSV
  const handleExportCsv = () => {
    const headers = [
      'رقم الفاتورة',
      'رقم فاتورة المورد',
      'اسم المورد',
      'التاريخ',
      'إجمالي الفاتورة',
      'المدفوع نقداً',
      'المتبقي آجل',
      'نوع السداد',
      'عدد الأصناف',
      'ملاحظات',
    ];
    const rows = filteredInvoices.map((inv) => [
      inv.invoice_number,
      inv.supplier_invoice_number || '',
      inv.supplier_name || '',
      formatDateTime(inv.invoice_date),
      inv.total_amount,
      inv.paid_amount,
      inv.remaining_amount,
      inv.payment_type === 'cash'
        ? 'نقدي'
        : inv.payment_type === 'credit'
        ? 'آجل'
        : 'سداد جزئي',
      inv.items?.length || 0,
      inv.notes || '',
    ]);
    exportToCsv(`سجل_فواتير_المشتريات_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  // Handle Print Table
  const handlePrint = () => {
    printVisibleArea({ title: 'سجل_فواتير_المشتريات' });
  };

  // Handle Delete Invoice
  const handleDeleteInvoiceConfirm = async () => {
    if (!deleteTargetInvoice) return { success: false, error: 'الفاتورة غير محددة' };
    const res = await storage.deletePurchaseInvoice(deleteTargetInvoice.id);
    return res;
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header & Key Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-violet-600 text-white rounded-2xl shadow-sm">
            <Receipt className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              قسم الفواتير ومشتريات الأدوية
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-bold mt-0.5">
              تسجيل ومتابعة فواتير شراء الأدوية من الموردين وحسابات السداد الآجلة والنقدية
            </p>
          </div>
        </div>

        {isAdmin ? (
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Add Supplier Button */}
            <button
              type="button"
              onClick={() => {
                setEditingSupplier(null);
                setSupplierModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Truck className="w-4 h-4 text-violet-600" />
              <span>+ مورد جديد</span>
            </button>

            {/* Primary CTA: Add Invoice Button */}
            <button
              type="button"
              onClick={() => setAddInvoiceOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>+ إضافة فاتورة جديدة</span>
            </button>
          </div>
        ) : (
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
            حساب مشرف (قراءة ومتابعة فقط)
          </span>
        )}
      </div>

      {/* 2. Stat / Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Invoices */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-violet-50 text-violet-700 rounded-2xl shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">إجمالي الفواتير</span>
            <div className="text-xl font-black text-slate-900 font-mono">
              {metrics.totalCount} <span className="text-xs font-normal text-slate-500">فاتورة</span>
            </div>
          </div>
        </div>

        {/* Total Purchases Value */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl shrink-0">
            <BadgeDollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">إجمالي قيمة المشتريات</span>
            <div className="text-lg sm:text-xl font-black text-blue-900 font-mono">
              {formatCurrency(metrics.totalPurchases)}
            </div>
          </div>
        </div>

        {/* Paid Cash */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl shrink-0">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">المسدد نقداً للموردين</span>
            <div className="text-lg sm:text-xl font-black text-emerald-800 font-mono">
              {formatCurrency(metrics.totalPaid)}
            </div>
          </div>
        </div>

        {/* Total Supplier Debt */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-2xl shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">ديون الموردين الآجلة</span>
            <div className="text-lg sm:text-xl font-black text-amber-800 font-mono">
              {formatCurrency(metrics.totalSupplierDebt)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'invoices'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>سجل فواتير المشتريات ({filteredInvoices.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'suppliers'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>دليل وحسابات الموردين ({suppliers.length})</span>
        </button>
      </div>

      {/* 4. Tab 1: Invoices Log View */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Search Field */}
              <div className="sm:col-span-5 relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="بحث باسم المورد، اسم الدواء، رقم الفاتورة..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pr-10 pl-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>

              {/* Payment Type Filter */}
              <div className="sm:col-span-3">
                <select
                  value={selectedPaymentFilter}
                  onChange={(e) => {
                    setSelectedPaymentFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                >
                  <option value="all">كل أنواع السداد</option>
                  <option value="cash">نقدي (كاش فقط)</option>
                  <option value="credit">آجل (على الحساب فقط)</option>
                  <option value="partial">سداد جزئي</option>
                </select>
              </div>

              {/* Supplier Filter */}
              <div className="sm:col-span-2">
                <select
                  value={selectedSupplierFilter}
                  onChange={(e) => {
                    setSelectedSupplierFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                >
                  <option value="all">كل الموردين</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Export & Print */}
              <div className="sm:col-span-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  title="تصدير كملف Excel / CSV"
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  title="طباعة السجل"
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Invoices List / Table */}
          <div
            id="invoices-table-container"
            className="invoice-print-area bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden"
          >
            {paginatedInvoices.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Receipt className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900">لا توجد فواتير مشتريات مطابقة</h3>
                  <p className="text-xs text-slate-500 font-bold max-w-sm mx-auto">
                    {search || selectedPaymentFilter !== 'all' || selectedSupplierFilter !== 'all'
                      ? 'جرب تغيير شروط البحث أو التصفية لعرض النتائج'
                      : 'ابدأ الآن بإضافة أول فاتورة شراء أدوية لتسجيل كمياتها ومبالغها'}
                  </p>
                </div>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => setAddInvoiceOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة فاتورة جديدة</span>
                  </button>
                ) : (
                  <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                    قراءة ومتابعة فقط
                  </span>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500">
                      <th className="p-4">رقم الفاتورة</th>
                      <th className="p-4">التاريخ</th>
                      <th className="p-4">اسم المورد</th>
                      <th className="p-4">الأدوية المشتراة</th>
                      <th className="p-4">إجمالي الفاتورة</th>
                      <th className="p-4">نوع السداد</th>
                      <th className="p-4">المسدد / المتبقي</th>
                      <th className="p-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-800">
                    {paginatedInvoices.map((inv) => {
                      const itemsPreview = inv.items || [];
                      const isCash = inv.payment_type === 'cash';
                      const isCredit = inv.payment_type === 'credit';

                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-violet-50/40 transition-colors group"
                        >
                          {/* Invoice Number */}
                          <td className="p-4">
                            <span className="font-mono text-slate-900 font-black block">
                              {inv.invoice_number}
                            </span>
                            {inv.supplier_invoice_number && (
                              <span className="text-[10px] text-slate-500 font-mono block">
                                مورد: {inv.supplier_invoice_number}
                              </span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="p-4 text-slate-600 font-normal">
                            <span className="block font-bold text-slate-700">
                              {formatDate(inv.invoice_date)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(inv.invoice_date).toLocaleTimeString('ar-EG', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>

                          {/* Supplier Name */}
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                              <span className="font-black text-slate-900 truncate max-w-[140px]">
                                {inv.supplier_name || 'مورد مسجل'}
                              </span>
                            </div>
                          </td>

                          {/* Items Preview */}
                          <td className="p-4">
                            <div className="space-y-1 max-w-[240px]">
                              {itemsPreview.slice(0, 2).map((it, i) => (
                                <div
                                  key={i}
                                  className="text-[11px] text-slate-700 truncate bg-slate-100/80 px-2 py-0.5 rounded-md inline-block mr-1 mb-0.5"
                                >
                                  <span className="font-bold">{it.product_name_snapshot}</span>
                                  <span className="text-slate-500 font-mono"> ({it.qty} {it.unit_name_snapshot})</span>
                                </div>
                              ))}
                              {itemsPreview.length > 2 && (
                                <span className="text-[10px] text-violet-600 font-bold mr-1">
                                  +{itemsPreview.length - 2} أصناف أخرى
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Total Amount */}
                          <td className="p-4">
                            <span className="text-sm font-black text-slate-900 font-mono block">
                              {formatCurrency(inv.total_amount)}
                            </span>
                            {inv.discount_amount > 0 && (
                              <span className="text-[10px] text-rose-600 font-mono block">
                                خصم: {formatCurrency(inv.discount_amount)}
                              </span>
                            )}
                          </td>

                          {/* Payment Type Badge */}
                          <td className="p-4">
                            {isCash ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Banknote className="w-3 h-3" />
                                <span>نقدي (كاش)</span>
                              </span>
                            ) : isCredit ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                <span>آجل (على الحساب)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                                <CreditCard className="w-3 h-3" />
                                <span>سداد جزئي</span>
                              </span>
                            )}
                          </td>

                          {/* Paid / Remaining */}
                          <td className="p-4 text-[11px]">
                            <div className="font-mono">
                              <span className="text-emerald-700 block">
                                مدفوع: {formatCurrency(inv.paid_amount)}
                              </span>
                              {inv.remaining_amount > 0 && (
                                <span className="text-amber-700 block">
                                  باقي: {formatCurrency(inv.remaining_amount)}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setDetailInvoice(inv)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition cursor-pointer"
                                title="عرض تفاصيل الفاتورة"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDetailInvoice(inv);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                                title="طباعة الفاتورة"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteTargetInvoice(inv)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  title="حذف الفاتورة"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200">
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredInvoices.length}
                  pageSize={pageSize}
                  onPageChange={(p) => setCurrentPage(p)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Tab 2: Suppliers Directory & Balances View */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="bg-white p-4.5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-900 text-sm">قائمة الموردين وحساباتهم</h3>
              <p className="text-xs text-slate-500 font-bold">
                متابعة مديونيات الموردين ورصيد كل مورد ومشتريات الأدوية منه
              </p>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setEditingSupplier(null);
                  setSupplierModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ إضافة مورد جديد</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs">
                لا يوجد موردين مسجلين بعد. اضغط "+ مورد جديد" لإضافة مورد.
              </div>
            ) : (
              suppliers.map((s) => {
                const suppInvoices = invoices.filter((i) => i.supplier_id === s.id);
                const totalInvoiced = suppInvoices.reduce((sum, i) => sum + i.total_amount, 0);

                return (
                  <div
                    key={s.id}
                    className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:border-violet-300 transition-colors space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-violet-50 text-violet-700 rounded-2xl">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm">{s.name}</h4>
                          {s.phone && (
                            <span className="text-xs text-slate-500 font-mono block">
                              {s.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSupplier(s);
                            setSupplierModalOpen(true);
                          }}
                          className="text-xs text-violet-600 hover:text-violet-800 font-bold cursor-pointer"
                        >
                          تعديل
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <div className="p-3 bg-slate-50 rounded-2xl">
                        <span className="text-[10px] text-slate-500 font-bold block">
                          الرصيد المستحق للمورد:
                        </span>
                        <span className="text-sm font-black text-amber-700 font-mono">
                          {formatCurrency(s.current_balance)}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl">
                        <span className="text-[10px] text-slate-500 font-bold block">
                          عدد الفواتير:
                        </span>
                        <span className="text-sm font-black text-slate-800 font-mono">
                          {suppInvoices.length} فواتير
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold pt-1">
                      <span className="text-slate-500">إجمالي المشتريات منه:</span>
                      <span className="text-slate-900 font-mono">{formatCurrency(totalInvoiced)}</span>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setAddInvoiceOpen(true);
                        }}
                        className="w-full py-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>تسجيل فاتورة لهذا المورد</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddInvoiceModal
        isOpen={addInvoiceOpen}
        onClose={() => setAddInvoiceOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />

      <InvoiceDetailModal
        invoice={detailInvoice}
        onClose={() => setDetailInvoice(null)}
      />

      <SupplierModal
        isOpen={supplierModalOpen}
        supplier={editingSupplier}
        onClose={() => {
          setSupplierModalOpen(false);
          setEditingSupplier(null);
        }}
        onSuccess={() => {
          loadData();
        }}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteTargetInvoice}
        title="حذف فاتورة مشتريات"
        itemName={deleteTargetInvoice ? `فاتورة رقم ${deleteTargetInvoice.invoice_number} (المورد: ${deleteTargetInvoice.supplier_name})` : ''}
        description="سيتم حذف الفاتورة وخصم قيمتها من رصيد المورد وإعادة المبلغ للخزينة إن وُجد."
        onClose={() => setDeleteTargetInvoice(null)}
        onConfirm={handleDeleteInvoiceConfirm}
      />
    </div>
  );
};
