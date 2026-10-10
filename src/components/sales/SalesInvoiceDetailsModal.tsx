import React, { useEffect, useState } from 'react';
import { X, Receipt, Printer, Calendar, Store, User, Layers, ShieldCheck, CheckCircle2, RotateCcw, MessageSquare } from 'lucide-react';
import { SalesInvoice, SalesInvoiceItemBatch } from '../../types/database';
import { storage } from '../../lib/storage';
import { formatCurrency, formatDateTime, formatQuantity } from '../../lib/formatters';
import { SendWhatsAppModal } from './SendWhatsAppModal';

interface SalesInvoiceDetailsModalProps {
  invoice: SalesInvoice | null;
  onClose: () => void;
  onPrint?: () => void;
  onReturn?: () => void;
}

export const SalesInvoiceDetailsModal: React.FC<SalesInvoiceDetailsModalProps> = ({
  invoice,
  onClose,
  onPrint,
  onReturn,
}) => {
  const [batches, setBatches] = useState<SalesInvoiceItemBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  useEffect(() => {
    if (!invoice) return;

    const loadBatches = async () => {
      setIsLoading(true);
      try {
        const data = await storage.fetchSalesInvoiceBatches(invoice.id);
        setBatches(data);
      } catch (err) {
        console.warn('Failed to fetch sales invoice batches:', err);
        setBatches(storage.getSalesInvoiceBatches(invoice.id));
      } finally {
        setIsLoading(false);
      }
    };

    loadBatches();
  }, [invoice]);

  if (!invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-700 text-white rounded-xl">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">تفاصيل فاتورة البيع والتشغيلات المسحوبة</h3>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                  {invoice.invoice_number}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تتبع مسار صرف الأصناف وحركات سحب التشغيلات وفقاً للأقدم صلاحية (FEFO)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-800">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block mb-1 flex items-center gap-1 font-medium">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>العميل / المشتري:</span>
              </span>
              <span className="font-bold text-slate-900 text-sm block">
                {invoice.customer_name_snapshot}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block mb-1 flex items-center gap-1 font-medium">
                <Store className="w-3.5 h-3.5 text-slate-400" />
                <span>المخزن المنصرف منه:</span>
              </span>
              <span className="font-bold text-slate-800 text-sm block">
                {invoice.warehouse_name || 'محل البيع المباشر'}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block mb-1 flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>تاريخ ووقت البيع:</span>
              </span>
              <span className="font-semibold text-slate-800 tabular-nums block">
                {formatDateTime(invoice.invoice_date)}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block mb-1 font-medium">نوع السداد:</span>
              <span
                className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                  invoice.payment_type === 'cash'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : invoice.payment_type === 'credit'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                }`}
              >
                {invoice.payment_type === 'cash'
                  ? 'نقدي كامل'
                  : invoice.payment_type === 'credit'
                  ? 'آجل كامل'
                  : 'دفع جزئي'}
              </span>
            </div>
          </div>

          {/* Items & Batches Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>الأصناف والتشغيلات المسحوبة (sales_invoice_item_batches)</span>
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                إجمالي الأصناف: {invoice.items.length} · إجمالي حركات التشغيلات: {batches.length}
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-1/3">الصنف المباع</th>
                    <th className="py-3 px-3">الوحدة</th>
                    <th className="py-3 px-3 text-center">الكمية</th>
                    <th className="py-3 px-3 text-left">السعر</th>
                    <th className="py-3 px-3 text-left">الإجمالي</th>
                    <th className="py-3 px-4 w-2/5">التشغيلات المسحوب منها (Batch / Expiry)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, idx) => {
                    const itemBatches = batches.filter(
                      (b) =>
                        b.product_id === item.product_id ||
                        (item.id && b.invoice_item_id === item.id)
                    );

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 align-top">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block text-sm">
                            {item.product_name_snapshot}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {item.unit_name_snapshot}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                          {item.qty}
                        </td>
                        <td className="py-3 px-3 text-left font-mono">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="py-3 px-3 text-left font-mono font-bold text-slate-900">
                          {formatCurrency(item.total_price)}
                        </td>
                        <td className="py-3 px-4 bg-slate-50/60">
                          {itemBatches.length > 0 ? (
                            <div className="space-y-1.5">
                              {itemBatches.map((b, bIdx) => (
                                <div
                                  key={bIdx}
                                  className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-slate-900 text-xs">
                                      رقم التشغيلة: <span className="text-emerald-700">{b.batch_number}</span>
                                    </span>
                                    <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                      سحب: {formatQuantity(b.qty_in_base_unit)} وحدة أساسية
                                    </span>
                                  </div>
                                  {b.expiry_date && (
                                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                                      <span>تاريخ الانتهاء: <strong className="text-slate-700 font-mono">{b.expiry_date}</strong></span>
                                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                        <ShieldCheck className="w-3 h-3" />
                                        <span>صالح وتم الصرف</span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-2 text-slate-400 text-xs italic bg-slate-100/50 rounded-lg text-center">
                              صرف مباشر من رصيد الصنف العام (بدون تشغيلة محددة)
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-900 text-white rounded-2xl">
            <div className="space-y-1">
              <span className="text-slate-400 text-xs">إجمالي الفاتورة المطلوب</span>
              <div className="text-xl font-mono font-black text-white">
                {formatCurrency(invoice.total_amount)}
              </div>
              {invoice.discount_amount > 0 && (
                <div className="text-[11px] text-rose-300">
                  مخصوم منه: {formatCurrency(invoice.discount_amount)}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-emerald-400 text-xs font-bold">المدفوع نقداً بالخزينة</span>
              <div className="text-xl font-mono font-black text-emerald-300">
                {formatCurrency(invoice.paid_amount)}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-amber-400 text-xs font-bold">المتبقي آجل على العميل</span>
              <div className="text-xl font-mono font-black text-amber-300">
                {formatCurrency(invoice.remaining_amount)}
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="font-bold text-slate-700">ملاحظات الفاتورة: </span>
              <span className="text-slate-600">{invoice.notes}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowWhatsApp(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#25D366] hover:bg-[#1EBE5D] rounded-xl shadow-xs transition-colors cursor-pointer"
              title="إرسال الفاتورة للعميل عبر واتساب"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>إرسال عبر واتساب</span>
            </button>
            {onReturn && (
              <button
                type="button"
                onClick={onReturn}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl border border-amber-300 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إصدار مرتجع للفاتورة</span>
              </button>
            )}
            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>طباعة الإيصال</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>

      {showWhatsApp && (
        <SendWhatsAppModal
          invoice={invoice}
          onClose={() => setShowWhatsApp(false)}
        />
      )}
    </div>
  );
};
