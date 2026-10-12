import React, { useState } from 'react';
import { X, ArrowLeftRight, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Product, StockTransfer } from '../../types/database';
import { storage } from '../../lib/storage';
import { formatQuantity } from '../../lib/formatters';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFromWarehouse?: string;
  defaultToWarehouse?: string;
  onSuccess: () => void;
}

interface TransferItemRow {
  productId: string;
  unitName: string;
  conversionFactor: number;
  qty: number;
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({
  isOpen,
  onClose,
  defaultFromWarehouse,
  defaultToWarehouse,
  onSuccess,
}) => {
  const warehouses = storage.getWarehouses();
  const products = storage.getProducts();

  const mainWh = warehouses.find((w) => w.location_type === 'warehouse');
  const shopWh = warehouses.find((w) => w.location_type === 'shop' || w.is_primary);

  const resolvedFrom =
    defaultFromWarehouse && warehouses.some((w) => w.id === defaultFromWarehouse)
      ? defaultFromWarehouse
      : mainWh?.id || warehouses[1]?.id || warehouses[0]?.id || '';

  const resolvedTo =
    defaultToWarehouse && warehouses.some((w) => w.id === defaultToWarehouse)
      ? defaultToWarehouse
      : shopWh?.id || warehouses[0]?.id || '';

  const [fromWarehouseId, setFromWarehouseId] = useState(resolvedFrom);
  const [toWarehouseId, setToWarehouseId] = useState(resolvedTo);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [items, setItems] = useState<TransferItemRow[]>(() => {
    const first = products[0];
    if (!first) return [];
    return [
      {
        productId: first.id,
        unitName: first.units?.[0]?.unit_name || first.base_unit_name || 'وحدة',
        conversionFactor: first.units?.[0]?.conversion_factor || 1,
        qty: 1,
      },
    ];
  });

  if (!isOpen) return null;

  const handleAddItem = () => {
    const first = products[0];
    if (!first) return;
    const unit = first.units?.[0];
    setItems([
      ...items,
      {
        productId: first.id,
        unitName: unit?.unit_name || first.base_unit_name,
        conversionFactor: unit?.conversion_factor || 1,
        qty: 1,
      },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length <= 1) {
      setError('يجب اختيار صنف واحد على الأقل للتحويل');
      return;
    }
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemProductChange = (idx: number, newProductId: string) => {
    const prod = products.find((p) => p.id === newProductId);
    if (!prod) return;
    const unit = prod.units?.[0];
    const updated = [...items];
    updated[idx] = {
      ...updated[idx],
      productId: newProductId,
      unitName: unit?.unit_name || prod.base_unit_name,
      conversionFactor: unit?.conversion_factor || 1,
      qty: 1,
    };
    setItems(updated);
  };

  const handleItemUnitChange = (idx: number, newUnitName: string) => {
    const updated = [...items];
    const item = updated[idx];
    const prod = products.find((p) => p.id === item.productId);
    const unit = prod?.units?.find((u) => u.unit_name === newUnitName);
    if (!unit) return;

    item.unitName = unit.unit_name;
    item.conversionFactor = unit.conversion_factor;
    setItems(updated);
  };

  const handleItemQtyChange = (idx: number, qty: number) => {
    const updated = [...items];
    updated[idx].qty = Math.max(0.001, qty);
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromWarehouseId === toWarehouseId) {
      setError('لا يمكن التحويل من وإلى نفس الموقع المخزني');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const sanitizedItems = items.map((it) => {
        const prod = products.find((p) => p.id === it.productId);
        const baseQty = it.qty * it.conversionFactor;
        return {
          product_id: it.productId,
          product_name: prod?.name,
          unit_name_snapshot: it.unitName,
          conversion_factor_snapshot: it.conversionFactor,
          qty: it.qty,
          qty_in_base_unit: baseQty,
        };
      });

      const res = await storage.executeStockTransfer({
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: toWarehouseId,
        notes: notes.trim(),
        items: sanitizedItems,
      });

      if (!res.success) {
        setError(res.error || 'فشلت عملية التحويل المخزني');
        setIsSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء تنفيذ التحويل');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 my-6">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">إذن تحويل بضاعة بين المخزن والمحل</h3>
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
            <div className="p-3 text-rose-700 bg-rose-50 border border-rose-200 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Locations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                الموقع المصدر (التحويل منه) <span className="text-rose-500">*</span>
              </label>
              <select
                value={fromWarehouseId}
                onChange={(e) => setFromWarehouseId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                الموقع الوجهة (التحويل إليه) <span className="text-rose-500">*</span>
              </label>
              <select
                value={toWarehouseId}
                onChange={(e) => setToWarehouseId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transfer Items */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-2.5 bg-slate-100/70 border-b border-slate-200">
              <span className="font-bold text-slate-800">الأصناف والكميات المراد نقلها</span>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-white border border-emerald-300 rounded hover:bg-emerald-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ صنف إضافي</span>
              </button>
            </div>

            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-2 w-1/3">الصنف</th>
                  <th className="p-2">الوحدة</th>
                  <th className="p-2">الكمية</th>
                  <th className="p-2">الرصيد المتاح بالمصدر</th>
                  <th className="p-2">الكمية المحولة بالأساسي</th>
                  <th className="p-2 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row, idx) => {
                  const currentProd = products.find((p) => p.id === row.productId);
                  const availableInSource = storage.getProductStock(row.productId, fromWarehouseId);
                  const totalBaseQty = row.qty * row.conversionFactor;
                  const isInsufficient = totalBaseQty > availableInSource;

                  return (
                    <tr key={idx} className="bg-white hover:bg-slate-50/50">
                      <td className="p-2">
                        <select
                          value={row.productId}
                          onChange={(e) => handleItemProductChange(idx, e.target.value)}
                          className="w-full p-1.5 border border-slate-300 rounded font-medium"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-2">
                        <select
                          value={row.unitName}
                          onChange={(e) => handleItemUnitChange(idx, e.target.value)}
                          className="w-full p-1.5 border border-slate-300 rounded"
                        >
                          {currentProd?.units?.map((u) => (
                            <option key={u.id} value={u.unit_name}>
                              {u.unit_name} ({u.conversion_factor} {currentProd.base_unit_name})
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-2">
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          inputMode="decimal"
                          value={row.qty === 0 ? '' : row.qty}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleItemQtyChange(idx, e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                          className="w-20 p-1.5 font-mono border border-slate-300 rounded font-bold"
                        />
                      </td>

                      <td className="p-2">
                        <span className="font-mono text-slate-700 font-semibold">
                          {formatQuantity(availableInSource)} {currentProd?.base_unit_name}
                        </span>
                      </td>

                      <td className="p-2">
                        <span
                          className={`font-mono font-bold ${
                            isInsufficient ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {formatQuantity(totalBaseQty)} {currentProd?.base_unit_name}
                          {isInsufficient && ' (غير كافٍ!)'}
                        </span>
                      </td>

                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              ملاحظات التحويل والمسؤول عن الاستلام
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="نقل طلبية سريعة لتغذية رفوف المحل..."
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
              disabled={isSubmitting}
              className="px-6 py-2 font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
            >
              {isSubmitting ? 'جاري التحويل...' : 'اعتماد التحويل وتحديث الأرصدة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
