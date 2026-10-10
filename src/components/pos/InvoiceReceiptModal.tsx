import React, { useState } from 'react';
import { X, Printer, CheckCircle2, MessageSquare } from 'lucide-react';
import { SalesInvoice } from '../../types/database';
import { formatCurrency, formatDateTime } from '../../lib/formatters';
import { storage } from '../../lib/storage';
import { APP_CONFIG } from '../../lib/branding';
import { SendWhatsAppModal } from '../sales/SendWhatsAppModal';

interface InvoiceReceiptModalProps {
  invoice: SalesInvoice | null;
  onClose: () => void;
}

export const InvoiceReceiptModal: React.FC<InvoiceReceiptModalProps> = ({
  invoice,
  onClose,
}) => {
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  if (!invoice) return null;

  const settings = storage.getSettings();
  const company = settings.company_info;
  const invoiceBatches = storage.getSalesInvoiceBatches(invoice.id);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 my-8">
        {/* Modal Toolbar (hidden in print) */}
        <div className="no-print flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">تم اعتماد الفاتورة بنجاح</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWhatsAppModal(true)}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-lg transition-colors shadow-xs cursor-pointer"
              title="إرسال الفاتورة للعميل عبر واتساب"
            >
              <MessageSquare className="w-4 h-4" />
              <span>إرسال واتساب</span>
            </button>
            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الإيصال</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="invoice-print-area p-6 bg-white text-slate-900 font-sans text-xs">
          {/* Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300">
            <div className="flex justify-center mb-2">
              <img
                src={APP_CONFIG.logo}
                alt={APP_CONFIG.name}
                className="h-16 w-auto object-contain"
              />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">{company.name}</h2>
            <p className="text-slate-600 text-[11px] max-w-xs mx-auto">{company.activity}</p>
            <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
              <p>العنوان: {company.address}</p>
              <p className="font-mono">هاتف: {company.phone}</p>
              {company.tax_card && <span>ب.ض: {company.tax_card} · س.ت: {company.commercial_reg}</span>}
            </div>
          </div>

          {/* Invoice Meta */}
          <div className="grid grid-cols-2 gap-2 py-3 border-b border-dashed border-slate-300 text-[11px]">
            <div>
              <span className="text-slate-500">رقم الفاتورة: </span>
              <span className="font-bold font-mono">{invoice.invoice_number}</span>
            </div>
            <div className="text-left font-mono">
              <span className="text-slate-500">التاريخ: </span>
              <span>{formatDateTime(invoice.invoice_date)}</span>
            </div>
            <div>
              <span className="text-slate-500">العميل: </span>
              <span className="font-bold">{invoice.customer_name_snapshot}</span>
            </div>
            <div className="text-left">
              <span className="text-slate-500">نوع السداد: </span>
              <span className="font-semibold">
                {invoice.payment_type === 'cash' ? 'نقدي' : invoice.payment_type === 'credit' ? 'آجل' : 'جزئي'}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="py-3">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[10px]">
                  <th className="py-1">الصنف</th>
                  <th className="py-1">الوحدة</th>
                  <th className="py-1 text-center">الكمية</th>
                  <th className="py-1 text-left">السعر</th>
                  <th className="py-1 text-left">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item, idx) => {
                  const itemBatches = invoiceBatches.filter(
                    (b) =>
                      b.product_id === item.product_id ||
                      (item.id && b.invoice_item_id === item.id)
                  );

                  return (
                    <tr key={idx} className="text-[11px]">
                      <td className="py-1.5">
                        <span className="font-medium text-slate-900 block">{item.product_name_snapshot}</span>
                        {itemBatches.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {itemBatches.map((b, bIdx) => (
                              <div
                                key={bIdx}
                                className="inline-flex items-center gap-1.5 text-[9.5px] px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 ml-1 mb-0.5 font-mono"
                              >
                                <span className="font-bold text-slate-900">تشغيلة: {b.batch_number}</span>
                                {b.expiry_date && (
                                  <span className="text-slate-500">| ص: {b.expiry_date}</span>
                                )}
                                <span className="text-emerald-700 font-bold">({b.qty_in_base_unit})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 text-slate-600">{item.unit_name_snapshot}</td>
                      <td className="py-1.5 text-center font-mono">{item.qty}</td>
                      <td className="py-1.5 text-left font-mono">{item.unit_price.toFixed(2)}</td>
                      <td className="py-1.5 text-left font-mono font-semibold">{item.total_price.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Calculations Summary */}
          <div className="pt-2 border-t border-dashed border-slate-300 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-600">المجموع الفرعي:</span>
              <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
            </div>

            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>الخصم الممنوح:</span>
                <span className="font-mono">- {formatCurrency(invoice.discount_amount)}</span>
              </div>
            )}

            {invoice.tax_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">ضريبة القيمة المضافة:</span>
                <span className="font-mono">+ {formatCurrency(invoice.tax_amount)}</span>
              </div>
            )}

            <div className="flex justify-between pt-1 border-t border-slate-200 text-xs font-bold text-slate-900">
              <span>صافي الإجمالي المطلوب:</span>
              <span className="font-mono text-emerald-800 text-sm">{formatCurrency(invoice.total_amount)}</span>
            </div>

            <div className="flex justify-between text-emerald-700 font-semibold pt-1">
              <span>المبلغ المدفوع نقداً:</span>
              <span className="font-mono">{formatCurrency(invoice.paid_amount)}</span>
            </div>

            {invoice.remaining_amount > 0 && (
              <div className="flex justify-between text-rose-700 font-semibold">
                <span>المتبقي في حساب العميل (آجل):</span>
                <span className="font-mono">{formatCurrency(invoice.remaining_amount)}</span>
              </div>
            )}
          </div>

          {/* Footer Remarks */}
          <div className="mt-4 pt-3 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-500">
            <p className="leading-relaxed">{company.invoice_footer}</p>
            <p className="mt-1 font-mono text-[9px] text-slate-400">شكراً لتعاملكم معنا · {APP_CONFIG.fullName}</p>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="no-print p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            onClick={() => setShowWhatsAppModal(true)}
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#25D366] hover:bg-[#1EBE5D] rounded-lg shadow-xs cursor-pointer transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>إرسال للعميل عبر واتساب</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              type="button"
              className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              إغلاق ومتابعة البيع
            </button>
            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الإيصال</span>
            </button>
          </div>
        </div>
      </div>

      {showWhatsAppModal && (
        <SendWhatsAppModal
          invoice={invoice}
          onClose={() => setShowWhatsAppModal(false)}
        />
      )}
    </div>
  );
};
