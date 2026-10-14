import React from 'react';
import {
  X,
  Printer,
  Receipt,
  Truck,
  Calendar,
  CreditCard,
  Banknote,
  Clock,
  Pill,
  FileText,
  Building2,
} from 'lucide-react';
import { PurchaseInvoice } from '../../types/database';
import { formatCurrency, formatDateTime } from '../../lib/formatters';
import { printVisibleArea } from '../../lib/printUtils';

interface InvoiceDetailModalProps {
  invoice: PurchaseInvoice | null;
  onClose: () => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  onClose,
}) => {
  if (!invoice) return null;

  const handlePrint = () => {
    printVisibleArea({ title: `فاتورة_مشتريات_${invoice.invoice_number}` });
  };

  const paymentLabel =
    invoice.payment_type === 'cash'
      ? 'سداد نقدي كامل (كاش)'
      : invoice.payment_type === 'credit'
      ? 'سداد آجل (على الحساب)'
      : 'سداد جزئي (دفعة نقدية والباقي آجل)';

  const paymentColor =
    invoice.payment_type === 'cash'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : invoice.payment_type === 'credit'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-blue-100 text-blue-800 border-blue-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-violet-500/20 border border-violet-400/30 rounded-xl text-violet-300">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base">تفاصيل فاتورة مشتريات: {invoice.invoice_number}</h3>
              <p className="text-[11px] text-slate-300 font-medium">
                المورد: {invoice.supplier_name || 'مورد مسجل'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Printable Area */}
        <div id="printable-invoice-content" className="invoice-print-area flex-1 overflow-y-auto p-6 space-y-6 bg-white text-slate-900">
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <span className="text-[11px] font-bold text-slate-500 block">رقم الفاتورة</span>
              <span className="text-xl font-black text-slate-900 font-mono">{invoice.invoice_number}</span>
              {invoice.supplier_invoice_number && (
                <div className="text-xs text-slate-500 mt-0.5">
                  رقم المورد: <span className="font-mono">{invoice.supplier_invoice_number}</span>
                </div>
              )}
            </div>

            <div className="sm:text-left">
              <span className="text-[11px] font-bold text-slate-500 block">تاريخ الفاتورة</span>
              <span className="text-sm font-bold text-slate-800">
                {formatDateTime(invoice.invoice_date)}
              </span>
              <div className="mt-1">
                <span className={`inline-block text-[11px] font-black px-2.5 py-0.5 rounded-full border ${paymentColor}`}>
                  {paymentLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Supplier Info Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-violet-100 text-violet-700 rounded-xl">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">المورد / الشركة الموردة</span>
                <span className="text-sm font-black text-slate-900">
                  {invoice.supplier_name || 'مورد مسجل'}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              بيان الأدوية المشتراة
            </h4>

            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
              <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-100 text-[11px] font-black text-slate-600">
                <span className="col-span-5">اسم الدواء</span>
                <span className="col-span-2 text-center">الكمية</span>
                <span className="col-span-2 text-center">سعر الشراء</span>
                <span className="col-span-3 text-left">الإجمالي</span>
              </div>

              {(!invoice.items || invoice.items.length === 0) ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  لا توجد تفاصيل أصناف مسجلة
                </div>
              ) : (
                invoice.items.map((it, idx) => (
                  <div
                    key={it.id || idx}
                    className="grid grid-cols-12 gap-2 px-4 py-3 items-center text-xs font-bold text-slate-800"
                  >
                    <div className="col-span-5 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold">{it.product_name_snapshot}</span>
                    </div>

                    <div className="col-span-2 text-center text-slate-600 font-mono">
                      {it.qty} {it.unit_name_snapshot || 'وحدة'}
                    </div>

                    <div className="col-span-2 text-center text-slate-600 font-mono">
                      {formatCurrency(it.cost_price)}
                    </div>

                    <div className="col-span-3 text-left font-black text-emerald-700 font-mono">
                      {formatCurrency(it.total_cost)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-2.5">
            <div className="flex justify-between text-xs text-slate-600 font-bold">
              <span>المجموع الفرعي للأدوية:</span>
              <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
            </div>

            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-xs text-rose-600 font-bold">
                <span>الخصم الممنوح:</span>
                <span className="font-mono">- {formatCurrency(invoice.discount_amount)}</span>
              </div>
            )}

            <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200 pt-2">
              <span>إجمالي الفاتورة النهائي:</span>
              <span className="text-emerald-700 font-mono">{formatCurrency(invoice.total_amount)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs font-bold">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-[10px] text-emerald-800 block">المسدد نقداً:</span>
                <span className="text-sm font-black text-emerald-700 font-mono">
                  {formatCurrency(invoice.paid_amount)}
                </span>
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="text-[10px] text-amber-800 block">المتبقي آجل على الحساب:</span>
                <span className="text-sm font-black text-amber-700 font-mono">
                  {formatCurrency(invoice.remaining_amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="p-3 bg-violet-50/60 border border-violet-200 rounded-xl text-xs text-slate-700">
              <span className="font-bold text-violet-900 block mb-0.5">ملاحظات:</span>
              <p>{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
