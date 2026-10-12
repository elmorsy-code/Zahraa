import React, { useState } from 'react';
import { X, Scale, AlertCircle } from 'lucide-react';
import { Product } from '../../types/database';
import { storage } from '../../lib/storage';
import { formatQuantity } from '../../lib/formatters';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  warehouseId: string;
  onSuccess: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  product,
  warehouseId,
  onSuccess,
}) => {
  if (!product) return null;

  const currentStock = storage.getProductStock(product.id, warehouseId);
  const warehouse = storage.getWarehouse(warehouseId);

  const [newQty, setNewQty] = useState(currentStock.toString());
  const [reason, setReason] = useState('جرد دوري فعلي على الطبيعة');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [error, setError] = useState('');

  const parsedNewQty = parseFloat(newQty) || 0;
  const difference = parsedNewQty - currentStock;
  const [loading, setLoading] = useState(false);

  const isRegulated =
    product.is_pesticide ||
    product.requires_prescription ||
    (product.category?.name || '').includes('مبيد') ||
    (product.category?.name || '').includes('دواء');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (difference === 0) {
      setError('الكمية الفعلية مساوية للرصيد الدفتري، لا يوجد فارق لتسويته');
      return;
    }

    if (difference > 0 && isRegulated) {
      if (!batchNumber.trim()) {
        setError(`الصنف "${product.name}" مبيد/دواء، يجب إدخال رقم التشغيلة عند الزيادة الجردية.`);
        return;
      }
      if (!expiryDate) {
        setError(`الصنف "${product.name}" مبيد/دواء، يجب تحديد تاريخ الصلاحية عند الزيادة الجردية.`);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const res = await storage.adjustStock({
        warehouse_id: warehouseId,
        product_id: product.id,
        new_qty_in_base_unit: parsedNewQty,
        delta: difference,
        reason: reason.trim(),
        batch_number: difference > 0 && batchNumber.trim() ? batchNumber.trim() : undefined,
        expiry_date: difference > 0 && expiryDate ? expiryDate : undefined,
      });

      if (!res.success) {
        setError(res.error || 'فشلت التسوية');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء إجراء التسوية');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">تسوية جردية لرصيد المخزون</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 text-rose-700 bg-rose-50 border border-rose-200 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">الصنف:</span>
              <span className="font-bold text-slate-900">{product.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">الموقع المخزني:</span>
              <span className="font-semibold text-slate-800">{warehouse?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">الرصيد الدفتري الحالي:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatQuantity(currentStock)} {product.base_unit_name}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              الرصيد الفعلي بعد الجرد (بالوحدة الأساسية: {product.base_unit_name})
            </label>
            <input
              type="number"
              step="any"
              required
              inputMode="decimal"
              value={newQty}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setNewQty(e.target.value)}
              className="w-full px-3 py-2 text-sm font-bold font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Difference indicator */}
          <div className="p-2.5 rounded-lg border flex justify-between items-center text-xs">
            <span className="text-slate-600 font-medium">فارق التسوية:</span>
            <span
              className={`font-mono font-bold ${
                difference > 0
                  ? 'text-emerald-700'
                  : difference < 0
                  ? 'text-rose-700'
                  : 'text-slate-500'
              }`}
            >
              {difference > 0 ? `+${formatQuantity(difference)}` : formatQuantity(difference)}{' '}
              {product.base_unit_name}{' '}
              {difference > 0 ? '(زيادة جردية)' : difference < 0 ? '(عجز جردي)' : '(مطابق)'}
            </span>
          </div>

          {/* Batch & Expiry Inputs upon stock increase */}
          {difference > 0 && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 text-xs">
                  بيانات التشغيلة والصلاحية (عند الزيادة الجردية)
                </span>
                {isRegulated ? (
                  <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded border border-rose-200">
                    إلزامي للمبيدات والأدوية *
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded">
                    اختياري للأصناف العامة
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    رقم التشغيلة {isRegulated && <span className="text-rose-600">*</span>}
                  </label>
                  <input
                    type="text"
                    required={isRegulated}
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="مثال: BTH-2026-A1"
                    className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    تاريخ انتهاء الصلاحية {isRegulated && <span className="text-rose-600">*</span>}
                  </label>
                  <input
                    type="date"
                    required={isRegulated}
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">سبب التسوية والملاحظات</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2 font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
            >
              تأكيد التسوية وتعديل الرصيد
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
