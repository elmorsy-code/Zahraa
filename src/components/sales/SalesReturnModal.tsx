import React, { useState } from 'react';
import { X, RotateCcw, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { SalesInvoice, CashAccount, Warehouse } from '../../types/database';
import { storage } from '../../lib/storage';
import { formatCurrency } from '../../lib/formatters';

interface SalesReturnModalProps {
  invoice: SalesInvoice | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const SalesReturnModal: React.FC<SalesReturnModalProps> = ({
  invoice,
  onClose,
  onSuccess,
}) => {
  if (!invoice) return null;

  const warehouses = storage.getWarehouses();
  const cashAccounts = storage.getCashAccounts();

  const [returnItems, setReturnItems] = useState(
    invoice.items.map((it) => ({
      ...it,
      returnQty: 0,
    }))
  );

  const [warehouseId, setWarehouseId] = useState(invoice.warehouse_id || warehouses[0]?.id || '');
  const [refundType, setRefundType] = useState<'credit_balance' | 'cash'>('credit_balance');
  const [cashAccountId, setCashAccountId] = useState(cashAccounts[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const totalReturnAmount = returnItems.reduce(
    (sum, it) => sum + (it.returnQty || 0) * it.unit_price,
    0
  );

  const handleQtyChange = (idx: number, val: number) => {
    const next = [...returnItems];
    const maxQty = invoice.items[idx].qty;
    const clamped = Math.max(0, Math.min(maxQty, val));
    next[idx].returnQty = clamped;
    setReturnItems(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validItems = returnItems.filter((it) => it.returnQty > 0);
    if (validItems.length === 0) {
      setError('يرجى تحديد كمية مرتجعة لصنف واحد على الأقل');
      return;
    }

    setSubmitting(true);
    try {
      const res = await storage.processSalesReturnAtomic({
        sales_invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        customer_id: invoice.customer_id,
        customer_name_snapshot: invoice.customer_name_snapshot,
        warehouse_id: warehouseId,
        cash_account_id: refundType === 'cash' ? cashAccountId : undefined,
        refund_type: refundType,
        notes: notes || `مرتجع على فاتورة ${invoice.invoice_number}`,
        items: validItems.map((it) => ({
          product_id: it.product_id,
          product_name_snapshot: it.product_name_snapshot,
          unit_id: it.unit_id,
          unit_name_snapshot: it.unit_name_snapshot,
          conversion_factor_snapshot: it.conversion_factor_snapshot || 1,
          qty: it.returnQty,
          qty_in_base_unit: it.returnQty * (it.conversion_factor_snapshot || 1),
          unit_price: it.unit_price,
          total_price: it.returnQty * it.unit_price,
        })),
      });

      if (!res.success) {
        setError(res.error || 'حدث خطأ أثناء معالجة المرتجع');
        setSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ غير متوقع');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 my-6">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base">
              إصدار مرتجع مبيعات للفاتورة: {invoice.invoice_number}
            </h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Meta Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 block text-[11px]">العميل:</span>
              <span className="font-bold text-slate-900">{invoice.customer_name_snapshot}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">إجمالي الفاتورة الأصلية:</span>
              <span className="font-bold font-mono text-slate-900">
                {formatCurrency(invoice.total_amount)}
              </span>
            </div>
          </div>

          {/* Items selection */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 block">
              الأصناف المشتراة وتحديد الكميات المراد إرجاعها:
            </label>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-2 px-3">الصنف</th>
                    <th className="py-2 px-3 text-center">الكمية المباعة</th>
                    <th className="py-2 px-3 text-left">السعر</th>
                    <th className="py-2 px-3 text-center">كمية المرتجع</th>
                    <th className="py-2 px-3 text-left">إجمالي المرتجع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {returnItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 font-medium text-slate-900">
                        {item.product_name_snapshot}
                        <span className="text-slate-400 text-[10px] block">
                          ({item.unit_name_snapshot})
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-mono">
                        {item.qty}
                      </td>
                      <td className="py-2 px-3 text-left font-mono">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max={item.qty}
                          value={item.returnQty || ''}
                          onChange={(e) => handleQtyChange(idx, parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-16 px-2 py-1 text-center font-mono border border-slate-300 rounded font-bold focus:ring-1 focus:ring-amber-500"
                        />
                      </td>
                      <td className="py-2 px-3 text-left font-mono font-bold text-amber-800">
                        {formatCurrency((item.returnQty || 0) * item.unit_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Warehouse and Refund Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                إرجاع المخزون إلى:
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                طريقة تسوية المرتجع:
              </label>
              <select
                value={refundType}
                onChange={(e) => setRefundType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
              >
                <option value="credit_balance">خصم من مديونية وحساب العميل (دائن)</option>
                <option value="cash">رد نقدي من الخزينة للعميل</option>
              </select>
            </div>
          </div>

          {refundType === 'cash' && (
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                الخزينة المنصرف منها الرد النقدي:
              </label>
              <select
                value={cashAccountId}
                onChange={(e) => setCashAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
              >
                {cashAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (المتاح: {formatCurrency(acc.current_balance)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              ملاحظات أو سبب الإرجاع:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تلف بالعبوة، فائض رش عن حاجة المزرعة..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
            />
          </div>

          {/* Total & Submit */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-slate-500 text-xs block">إجمالي قيمة المرتجع:</span>
              <span className="text-lg font-bold font-mono text-amber-800">
                {formatCurrency(totalReturnAmount)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting || totalReturnAmount <= 0}
                className="flex items-center gap-1.5 px-5 py-2 font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 rounded-lg shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{submitting ? 'جارٍ الحفظ...' : 'تأكيد وحفظ المرتجع'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
