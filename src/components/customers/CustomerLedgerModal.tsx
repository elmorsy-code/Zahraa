import React, { useState } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Pill,
  FlaskConical,
  Scale,
} from 'lucide-react';
import { Customer, CustomerLedgerEntry } from '../../types/database';
import { storage } from '../../lib/storage';
import { formatCurrency, formatDate, formatDateTime } from '../../lib/formatters';
import { exportToCsv } from '../../lib/exportUtils';

import { printVisibleArea } from '../../lib/printUtils';
interface CustomerLedgerModalProps {
  customer: Customer;
  onClose: () => void;
  onReceivePaymentClick?: (customer: Customer) => void;
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  customer,
  onClose,
  onReceivePaymentClick,
}) => {
  const [docSearch, setDocSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reconciledState, setReconciledState] = useState(() =>
    storage.getCustomerReconciliation(customer.id)
  );

  const entries = storage.getCustomerLedger(customer.id);

  // Filter entries by document number / description and date range
  const filteredEntries = entries.filter((entry) => {
    const q = docSearch.toLowerCase().trim();
    const matchesDoc =
      !q ||
      entry.document_number.toLowerCase().includes(q) ||
      entry.description.toLowerCase().includes(q);

    const entryTime = new Date(entry.entry_date).getTime();
    const matchesStart = !startDate || entryTime >= new Date(startDate).getTime();
    const matchesEnd =
      !endDate || entryTime <= new Date(endDate + 'T23:59:59').getTime();

    return matchesDoc && matchesStart && matchesEnd;
  });

  const totalFilteredDebit = filteredEntries.reduce((s, e) => s + (e.debit || 0), 0);
  const totalFilteredCredit = filteredEntries.reduce((s, e) => s + (e.credit || 0), 0);

  const handleExportExcel = () => {
    const headers = [
      'التاريخ',
      'رقم المستند',
      'نوع الحركة',
      'البيان',
      'إجمالي الفاتورة',
      'المدفوع نقداً',
      'المرتجع',
      'مدين (على العميل)',
      'دائن (سداد)',
      'الرصيد التراكمي',
    ];

    const rows = filteredEntries.map((e) => [
      formatDate(e.entry_date),
      e.document_number,
      e.entry_type === 'invoice'
        ? 'فاتورة مبيعات'
        : e.entry_type === 'payment'
        ? 'سند قبض'
        : e.entry_type === 'return'
        ? 'مرتجع مبيعات'
        : e.entry_type === 'old_ledger_migration'
        ? 'ترحيل دفتر قديم'
        : e.entry_type === 'opening_balance'
        ? 'رصيد افتتاحي'
        : 'تسوية',
      e.description,
      e.invoice_total ?? (e.entry_type === 'invoice' ? e.debit : 0),
      e.paid_amount ?? (e.entry_type === 'payment' ? e.credit : 0),
      e.returns_amount ?? (e.entry_type === 'return' ? e.credit : 0),
      e.debit,
      e.credit,
      e.running_balance,
    ]);

    exportToCsv(
      `كشف_حساب_${customer.name.replace(/\s+/g, '_')}_${customer.code}`,
      headers,
      rows
    );
  };

  const handleFixBalance = () => {
    storage.recalculateCustomerBalance(customer.id);
    setReconciledState(storage.getCustomerReconciliation(customer.id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-6">
        {/* Modal Header */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2 flex-wrap">
                <span>كشف حساب تفصيلي: {customer.name}</span>
                {customer.partner_name && (
                  <span className="text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-lg">
                    (شريك: {customer.partner_name})
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                كود العميل: {customer.code}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {onReceivePaymentClick && (
              <button
                onClick={() => {
                  onClose();
                  onReceivePaymentClick(customer);
                }}
                className="px-4 py-2 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white transition-colors shadow-xs"
              >
                + تحصيل سند قبض
              </button>
            )}
            <button
              onClick={handleExportExcel}
              type="button"
              className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              title="تصدير كشف الحساب بتنسيق إكسيل عربي سليم"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>تصدير Excel</span>
            </button>
            <button
              onClick={() => printVisibleArea()}
              type="button"
              className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span>طباعة</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Audit Bar */}
        <div className="no-print p-4 sm:p-5 bg-slate-50 border-b border-slate-200 text-xs sm:text-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Search doc and dates */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px]">
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="بحث برقم المستند أو البيان..."
                  className="w-full pr-9 pl-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-xs">من:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs"
                />
                <span className="text-slate-500 text-xs">إلى:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs"
                />
              </div>

              {(docSearch || startDate || endDate) && (
                <button
                  onClick={() => {
                    setDocSearch('');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-slate-500 hover:text-slate-800 text-xs underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>إلغاء الفلتر</span>
                </button>
              )}
            </div>

            {/* Reconciliation Verification Status Badge */}
            <div className="flex items-center gap-2">
              {reconciledState.isBalanced ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>الرصيد الحسابي مطابق لحركات اليومية (100%)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>
                    فارق دفتري: {formatCurrency(reconciledState.difference)}
                  </span>
                  <button
                    onClick={handleFixBalance}
                    className="underline font-bold text-amber-900 hover:text-amber-950 mr-1"
                  >
                    مزامنة الرصيد
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Printable Statement Canvas */}
        <div className="invoice-print-area p-6 sm:p-8 text-sm text-slate-900 font-sans max-h-[72vh] overflow-y-auto space-y-6">
          {/* Customer Meta Summary Card */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200/90 text-xs sm:text-sm">
            <div className="space-y-1">
              <span className="text-slate-500 block">رقم الهاتف:</span>
              <span className="font-mono font-semibold text-slate-800">{customer.phone || 'غير مسجل'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 block">القرية / العنوان:</span>
              <span className="font-semibold text-slate-800">{customer.village_or_address || 'غير محدد'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 block">رصيد أول المدة:</span>
              <span className="font-mono font-bold text-slate-800 text-sm tabular-nums">
                {formatCurrency(customer.opening_balance)}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 block">إجمالي المسحوبات (مدين):</span>
              <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
                {formatCurrency(totalFilteredDebit)}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 block">صافي الرصيد المستحق:</span>
              <span
                className={`font-mono font-bold text-base tabular-nums ${
                  customer.current_balance > 0 ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {formatCurrency(customer.current_balance)}{' '}
                <span className="text-xs font-normal">
                  {customer.current_balance > 0 ? '(مدين)' : '(خالص)'}
                </span>
              </span>
            </div>
          </div>

          {/* Statement Table with requested columns and spacious padding */}
          <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs sm:text-sm min-w-[1100px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">التاريخ</th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[120px]">رقم الفاتورة / المستند</th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[120px]">نوع الحركة</th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px]">اسم الشيء المشترى / البيان</th>
                    <th className="py-3.5 px-4 whitespace-nowrap text-left min-w-[120px]">إجمالي الفاتورة</th>
                    <th className="py-3.5 px-4 whitespace-nowrap text-left min-w-[120px]">المسدد نقداً</th>
                    <th className="py-3.5 px-4 whitespace-nowrap text-left min-w-[110px]">المرتجع</th>
                    <th className="py-3.5 px-4 whitespace-nowrap text-left min-w-[120px]">مدين (على العميل)</th>
                    <th className="py-3.5 px-4 whitespace-nowrap text-left min-w-[120px]">دائن (سداد)</th>
                    <th className="py-3.5 px-4 whitespace-nowrap text-left min-w-[130px] bg-amber-50/60 font-bold text-slate-900">
                      الرصيد التراكمي
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        لا توجد حركات مسجلة تطابق محددات البحث والفترة المختارة
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry) => {
                      const isInvoice = entry.entry_type === 'invoice';
                      const isPayment = entry.entry_type === 'payment';
                      const isReturn = entry.entry_type === 'return';

                      const invoiceVal = entry.invoice_total ?? (isInvoice ? entry.debit : 0);
                      const paidVal = entry.paid_amount ?? (isPayment ? entry.credit : 0);
                      const returnVal = entry.returns_amount ?? (isReturn ? entry.credit : 0);

                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500 text-xs whitespace-nowrap">
                            {formatDateTime(entry.entry_date)}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                            {entry.document_number}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-block ${
                                isInvoice
                                  ? 'bg-amber-100 text-amber-900'
                                  : isPayment
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : isReturn
                                  ? 'bg-blue-100 text-blue-900'
                                  : entry.entry_type === 'old_ledger_migration'
                                  ? 'bg-purple-100 text-purple-900'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {isInvoice
                                ? 'فاتورة مبيعات'
                                : isPayment
                                ? 'سند قبض'
                                : isReturn
                                ? 'مرتجع مبيعات'
                                : entry.entry_type === 'old_ledger_migration'
                                ? 'دفتر قديم'
                                : entry.entry_type === 'opening_balance'
                                ? 'رصيد افتتاحي'
                                : 'تسوية'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700 leading-relaxed max-w-[280px]">
                            {(() => {
                              const raw = entry.description || '-';
                              const parts = raw.split(/\s+\+\s+/);

                              return (
                                <div className="space-y-1">
                                  {parts.length > 1 && (
                                    <span className="text-[10px] font-black bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded-md inline-block">
                                      {parts.length} أصناف
                                    </span>
                                  )}
                                  {parts.map((part, pIdx) => {
                                    const subQtyMatch = part.match(/\[كمية فرعية:\s*([^\]]+)\]/);
                                    const stdQtyMatch = part.match(/\[كمية:\s*([^\]]+)\]/) || part.match(/\(الكمية:\s*([^\)]+)\)/);
                                    const cleanDesc = part
                                      .replace(/\[كمية فرعية:\s*[^\]]+\]/g, '')
                                      .replace(/\[كمية:\s*[^\]]+\]/g, '')
                                      .replace(/\(الكمية:\s*[^\)]+\)/g, '')
                                      .trim();

                                    return (
                                      <div key={pIdx} className="space-y-0.5 border-b border-slate-100 last:border-b-0 pb-1 last:pb-0">
                                        <div className="font-bold text-slate-900 flex items-center gap-1">
                                          <Pill className="w-3 h-3 text-amber-700 shrink-0" />
                                          <span>{cleanDesc || part}</span>
                                        </div>
                                        {subQtyMatch && (
                                          <span className="inline-block text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200 px-1.5 py-0.5 rounded-md">
                                            كمية فرعية: {subQtyMatch[1]}
                                          </span>
                                        )}
                                        {!subQtyMatch && stdQtyMatch && (
                                          <span className="inline-block text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-md">
                                            الكمية: {stdQtyMatch[1]}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-4 text-left font-mono tabular-nums text-slate-900">
                            {invoiceVal > 0 ? formatCurrency(invoiceVal) : '-'}
                          </td>
                          <td className="py-3 px-4 text-left font-mono tabular-nums text-emerald-700 font-semibold">
                            {paidVal > 0 ? formatCurrency(paidVal) : '-'}
                          </td>
                          <td className="py-3 px-4 text-left font-mono tabular-nums text-blue-700">
                            {returnVal > 0 ? formatCurrency(returnVal) : '-'}
                          </td>
                          <td className="py-3 px-4 text-left font-mono tabular-nums text-slate-900 font-bold">
                            {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                          </td>
                          <td className="py-3 px-4 text-left font-mono tabular-nums text-emerald-700 font-bold">
                            {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                          </td>
                          <td className="py-3 px-4 text-left font-mono tabular-nums font-bold bg-amber-50/60">
                            <span
                              className={
                                entry.running_balance > 0
                                  ? 'text-amber-800 font-bold'
                                  : entry.running_balance < 0
                                  ? 'text-blue-700 font-bold'
                                  : 'text-emerald-700'
                              }
                            >
                              {formatCurrency(entry.running_balance)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredEntries.length > 0 && (
                  <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-200 text-xs sm:text-sm">
                    <tr>
                      <td colSpan={4} className="py-4 px-4">
                        إجمالي الحركات المعروضة ({filteredEntries.length} حركة)
                      </td>
                      <td colSpan={3} className="py-4 px-4 text-slate-500 font-normal">
                        مجموع المسدد والدائن: {formatCurrency(totalFilteredCredit)}
                      </td>
                      <td className="py-4 px-4 text-left font-mono tabular-nums text-slate-900">
                        {formatCurrency(totalFilteredDebit)}
                      </td>
                      <td className="py-4 px-4 text-left font-mono tabular-nums text-emerald-800">
                        {formatCurrency(totalFilteredCredit)}
                      </td>
                      <td className="py-4 px-4 text-left font-mono tabular-nums text-amber-900 bg-amber-100/70 font-extrabold text-sm sm:text-base">
                        {formatCurrency(customer.current_balance)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
