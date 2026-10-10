import React, { useState } from 'react';
import { X, Plus, Trash2, Truck, AlertCircle } from 'lucide-react';
import { Product, PurchaseInvoice } from '../../types/database';
import { storage } from '../../lib/storage';
import { formatCurrency } from '../../lib/formatters';

interface NewPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (invoice: PurchaseInvoice) => void;
}

interface PurchaseItemRow {
  productId: string;
  unitName: string;
  conversionFactor: number;
  qty: number;
  costPrice: number;
  totalCost: number;
  batchNumber: string;
  expiryDate: string;
}

export const NewPurchaseModal: React.FC<NewPurchaseModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const suppliers = storage.getSuppliers();
  const products = storage.getProducts();
  const warehouses = storage.getWarehouses();
  const cashAccounts = storage.getCashAccounts();
  const categories = storage.getCategories();

  const isProductRegulated = (prod: Product | undefined) => {
    if (!prod) return false;
    const cat = prod.category || categories.find((c) => c.id === prod.category_id);
    return Boolean(
      prod.is_pesticide ||
      prod.requires_prescription ||
      (cat?.name && (cat.name.includes('مبيد') || cat.name.includes('دواء') || cat.name.includes('أدوية'))) ||
      (cat?.code && (cat.code.includes('PEST') || cat.code.includes('MED'))) ||
      (prod.name && (prod.name.includes('مبيد') || prod.name.includes('دواء') || prod.name.includes('أدوية')))
    );
  };

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [warehouseId, setWarehouseId] = useState(
    warehouses.find((w) => w.location_type === 'warehouse')?.id || warehouses[0]?.id || ''
  );
  const [cashAccountId, setCashAccountId] = useState(
    cashAccounts.find((c) => c.is_primary)?.id || cashAccounts[0]?.id || ''
  );
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentType, setPaymentType] = useState<'cash' | 'credit' | 'partial'>('credit');
  const [paidAmount, setPaidAmount] = useState('0');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [items, setItems] = useState<PurchaseItemRow[]>([
    {
      productId: products[0]?.id || '',
      unitName: products[0]?.units?.[0]?.unit_name || products[0]?.base_unit_name || 'وحدة',
      conversionFactor: products[0]?.units?.[0]?.conversion_factor || 1,
      qty: 10,
      costPrice: products[0]?.default_purchase_price || 0,
      totalCost: 10 * (products[0]?.default_purchase_price || 0),
      batchNumber: '',
      expiryDate: '',
    },
  ]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    const firstProd = products[0];
    if (!firstProd) return;
    const defaultUnit = firstProd.units?.[0];
    setItems([
      ...items,
      {
        productId: firstProd.id,
        unitName: defaultUnit?.unit_name || firstProd.base_unit_name,
        conversionFactor: defaultUnit?.conversion_factor || 1,
        qty: 1,
        costPrice: defaultUnit?.purchase_price || firstProd.default_purchase_price || 0,
        totalCost: defaultUnit?.purchase_price || firstProd.default_purchase_price || 0,
        batchNumber: '',
        expiryDate: '',
      },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length <= 1) {
      setError('يجب إدراج صنف واحد على الأقل في الفاتورة');
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
      costPrice: unit?.purchase_price || prod.default_purchase_price || 0,
      totalCost: updated[idx].qty * (unit?.purchase_price || prod.default_purchase_price || 0),
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
    item.costPrice = unit.purchase_price;
    item.totalCost = item.qty * unit.purchase_price;
    setItems(updated);
  };

  const handleItemQtyChange = (idx: number, qty: number) => {
    const updated = [...items];
    updated[idx].qty = Math.max(0.001, qty);
    updated[idx].totalCost = updated[idx].qty * updated[idx].costPrice;
    setItems(updated);
  };

  const handleItemPriceChange = (idx: number, price: number) => {
    const updated = [...items];
    updated[idx].costPrice = Math.max(0, price);
    updated[idx].totalCost = updated[idx].qty * updated[idx].costPrice;
    setItems(updated);
  };

  const subtotal = items.reduce((sum, item) => sum + item.totalCost, 0);
  const discount = Math.min(subtotal, Math.max(0, parseFloat(discountAmount) || 0));
  const netTotal = Math.max(0, subtotal - discount);

  let finalPaid = 0;
  if (paymentType === 'cash') finalPaid = netTotal;
  else if (paymentType === 'partial') finalPaid = Math.min(netTotal, parseFloat(paidAmount) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setError('يرجى اختيار المورد أو تسجيل مورد أولاً');
      return;
    }
    if (items.length === 0) {
      setError('يرجى إدراج أصناف في الفاتورة');
      return;
    }
    if (items.some((it) => !it.productId)) {
      setError('يرجى اختيار صنف صحيح لكل سطر في الفاتورة أو إضافة منتجات للمنظومة أولاً');
      return;
    }

    setIsSubmitting(true);
    setError('');

    // Validate regulated products (pesticide / medicine) require batch number and expiry date
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const prod = products.find((p) => p.id === it.productId);
      const isRegulated = isProductRegulated(prod);

      if (isRegulated) {
        if (!it.batchNumber?.trim()) {
          setError(`الصنف "${prod?.name || 'مبيد/دواء'}" يندرج تحت المبيدات/الأدوية، ويجب إدخال رقم التشغيلة إجبارياً.`);
          setIsSubmitting(false);
          return;
        }
        if (!it.expiryDate) {
          setError(`الصنف "${prod?.name || 'مبيد/دواء'}" يندرج تحت المبيدات/الأدوية، ويجب تحديد تاريخ انتهاء الصلاحية إجبارياً.`);
          setIsSubmitting(false);
          return;
        }
      }
    }

    try {
      const sanitizedItems = items.map((it) => {
        const prod = products.find((p) => p.id === it.productId);
        const baseQty = it.qty * it.conversionFactor;
        return {
          product_id: it.productId,
          product_name_snapshot: prod?.name || 'صنف',
          unit_name_snapshot: it.unitName,
          conversion_factor_snapshot: it.conversionFactor,
          qty: it.qty,
          qty_in_base_unit: baseQty,
          cost_price: it.costPrice,
          total_cost: it.totalCost,
          batch_number: it.batchNumber?.trim() || undefined,
          expiry_date: it.expiryDate || undefined,
        };
      });

      const res = await storage.processPurchaseAtomic({
        supplier_id: supplierId,
        supplier_invoice_number: supplierInvoiceNumber.trim(),
        warehouse_id: warehouseId,
        cash_account_id: finalPaid > 0 ? cashAccountId : undefined,
        invoice_date: new Date(invoiceDate).toISOString(),
        payment_type: paymentType,
        subtotal,
        discount_amount: discount,
        tax_amount: 0,
        total_amount: netTotal,
        paid_amount: finalPaid,
        notes: notes.trim(),
        items: sanitizedItems,
      });

      if (!res.success) {
        setError(res.error || 'فشلت عملية حفظ فاتورة المشتريات');
        setIsSubmitting(false);
        return;
      }

      if (res.invoice) {
        onSaved(res.invoice);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ فاتورة المشتريات');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 my-6">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">تسجيل فاتورة مشتريات وتوريد بضاعة</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3 text-rose-700 bg-rose-50 border border-rose-200 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Invoice Header Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                المورد / الشركة <span className="text-rose-500">*</span>
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (رصيد: {formatCurrency(s.current_balance)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                رقم فاتورة المورد
              </label>
              <input
                type="text"
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                placeholder="INV-0912"
                className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                المخزن المستلم للبضاعة <span className="text-rose-500">*</span>
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold text-emerald-800"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                تاريخ الفاتورة
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-2.5 bg-slate-100/70 border-b border-slate-200">
              <span className="font-bold text-slate-800">الأصناف الموردة ووحدات الشراء</span>
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
                  <th className="p-2 w-1/4">الصنف</th>
                  <th className="p-2">وحدة الشراء</th>
                  <th className="p-2">الكمية</th>
                  <th className="p-2">سعر الوحدة</th>
                  <th className="p-2">الإجمالي</th>
                  <th className="p-2">رقم التشغيلة</th>
                  <th className="p-2">تاريخ الصلاحية</th>
                  <th className="p-2 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row, idx) => {
                  const currentProd = products.find((p) => p.id === row.productId);
                  const isRegulated = isProductRegulated(currentProd);

                  return (
                    <tr key={idx} className={`hover:bg-slate-50/50 ${isRegulated ? 'bg-amber-50/20' : 'bg-white'}`}>
                      <td className="p-2">
                        <select
                          value={row.productId}
                          onChange={(e) => handleItemProductChange(idx, e.target.value)}
                          className="w-full p-1 border border-slate-300 rounded font-medium"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.is_pesticide ? '🛡️ (مبيد)' : ''}
                            </option>
                          ))}
                        </select>
                        {isRegulated && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-black border border-amber-300 flex items-center gap-1">
                              <span>⚠️ مبيد/دواء</span>
                              <span className="text-rose-700">(التشغيلة والصلاحية إلزامية)</span>
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="p-2">
                        <select
                          value={row.unitName}
                          onChange={(e) => handleItemUnitChange(idx, e.target.value)}
                          className="w-full p-1 border border-slate-300 rounded"
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
                          step="0.01"
                          min="0.01"
                          value={row.qty}
                          onChange={(e) => handleItemQtyChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-20 p-1 font-mono border border-slate-300 rounded"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.costPrice}
                          onChange={(e) => handleItemPriceChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-24 p-1 font-mono border border-slate-300 rounded"
                        />
                      </td>

                      <td className="p-2 font-mono font-bold text-slate-900">
                        {formatCurrency(row.totalCost)}
                      </td>

                      <td className="p-2">
                        <input
                          type="text"
                          required={!!isRegulated}
                          value={row.batchNumber}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx].batchNumber = e.target.value;
                            setItems(updated);
                          }}
                          placeholder={isRegulated ? 'إلزامي *' : 'اختياري'}
                          className={`w-24 p-1 font-mono border rounded ${
                            isRegulated && !row.batchNumber.trim()
                              ? 'border-rose-400 bg-rose-50/50 ring-1 ring-rose-400'
                              : 'border-slate-300'
                          }`}
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="date"
                          required={!!isRegulated}
                          value={row.expiryDate}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx].expiryDate = e.target.value;
                            setItems(updated);
                          }}
                          className={`p-1 font-mono border rounded ${
                            isRegulated && !row.expiryDate
                              ? 'border-rose-400 bg-rose-50/50 ring-1 ring-rose-400'
                              : 'border-slate-300'
                          }`}
                        />
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

          {/* Payment & Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            {/* Payment Mode */}
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">حالة السداد</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentType('credit')}
                    className={`py-1.5 text-xs font-semibold rounded ${
                      paymentType === 'credit'
                        ? 'bg-amber-700 text-white'
                        : 'bg-white border text-slate-700'
                    }`}
                  >
                    آجل بالكامل
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('cash')}
                    className={`py-1.5 text-xs font-semibold rounded ${
                      paymentType === 'cash'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white border text-slate-700'
                    }`}
                  >
                    نقدي كامل
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('partial')}
                    className={`py-1.5 text-xs font-semibold rounded ${
                      paymentType === 'partial'
                        ? 'bg-indigo-700 text-white'
                        : 'bg-white border text-slate-700'
                    }`}
                  >
                    دفع جزئي
                  </button>
                </div>
              </div>

              {paymentType === 'partial' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    المبلغ المدفوع فوراً للمورد
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded font-bold"
                  />
                </div>
              )}

              {(paymentType === 'cash' || paymentType === 'partial') && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    الخزينة المسحوب منها
                  </label>
                  <select
                    value={cashAccountId}
                    onChange={(e) => setCashAccountId(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  >
                    {cashAccounts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({formatCurrency(c.current_balance)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ملاحظات الفاتورة</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="رقم إذن استلام المخزن، تفاصيل الشحن..."
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                />
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2 border-r border-slate-200 pr-4">
              <div className="flex justify-between text-slate-600">
                <span>المجموع الفرعي:</span>
                <span className="font-mono">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>الخصم المكتسب من المورد:</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-24 px-2 py-1 font-mono border border-slate-300 rounded text-left text-xs"
                />
              </div>

              <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-300">
                <span>صافي قيمة الفاتورة:</span>
                <span className="font-mono text-base text-slate-900">{formatCurrency(netTotal)}</span>
              </div>

              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>المسدد نقداً للمورد:</span>
                <span className="font-mono">{formatCurrency(finalPaid)}</span>
              </div>

              <div className="flex justify-between text-amber-800 font-bold">
                <span>المستحق في حساب المورد (آجل):</span>
                <span className="font-mono">{formatCurrency(netTotal - finalPaid)}</span>
              </div>
            </div>
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
              {isSubmitting ? 'جاري الحفظ...' : 'اعتماد فاتورة الشراء وتحديث المخزون'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
