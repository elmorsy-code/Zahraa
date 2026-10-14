import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Receipt,
  Truck,
  Pill,
  Calculator,
  Calendar,
  CreditCard,
  Banknote,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Edit2,
  FileText,
} from 'lucide-react';
import { storage } from '../../lib/storage';
import { Supplier, Product } from '../../types/database';
import { formatCurrency } from '../../lib/formatters';

interface AddInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface InvoiceDraftItem {
  id: string;
  product_id?: string;
  product_name: string;
  qty: number;
  unit: string;
  cost_price: number;
  total_cost: number;
}

export const AddInvoiceModal: React.FC<AddInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Invoice Header Fields
  const [supplierMode, setSupplierMode] = useState<'select' | 'new'>('select');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [newSupplierName, setNewSupplierName] = useState<string>('');
  const [newSupplierPhone, setNewSupplierPhone] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'credit' | 'cash' | 'partial' | 'bank'>('credit');
  const [paidAmount, setPaidAmount] = useState<string>('0');
  const [discountAmount, setDiscountAmount] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');

  // Items in this Invoice
  const [itemsList, setItemsList] = useState<InvoiceDraftItem[]>([]);

  // Current Item Input Fields (for adding next item)
  const [itemSearch, setItemSearch] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<string>('1');
  const [itemUnit, setItemUnit] = useState<string>('علبة');
  const [itemCostPrice, setItemCostPrice] = useState<string>('');
  const [isSuggestOpen, setIsSuggestOpen] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
      resetForm();
    }
  }, [isOpen]);

  const loadData = () => {
    const supps = storage.getSuppliers();
    setSuppliers(supps);
    if (supps.length > 0) {
      setSelectedSupplierId(supps[0].id);
      setSupplierMode('select');
    } else {
      setSupplierMode('new');
    }

    const prods = storage.getProducts();
    setProducts(prods);
  };

  const resetForm = () => {
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setInvoiceNumber('');
    setPaymentType('credit');
    setPaidAmount('0');
    setDiscountAmount('0');
    setNotes('');
    setItemsList([]);
    clearCurrentItemInputs();
    setError('');
  };

  const clearCurrentItemInputs = () => {
    setItemSearch('');
    setSelectedProductId('');
    setItemQuantity('1');
    setItemUnit('علبة');
    setItemCostPrice('');
    setIsSuggestOpen(false);
  };

  // Filtered product suggestions
  const productSuggestions = useMemo(() => {
    const q = itemSearch.toLowerCase().trim();
    if (!q) return products.slice(0, 8);
    return products
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 10);
  }, [products, itemSearch]);

  const handleSelectProduct = (prod: Product) => {
    setSelectedProductId(prod.id);
    setItemSearch(prod.name);
    setItemUnit(prod.base_unit_name || 'علبة');
    if (prod.default_purchase_price && prod.default_purchase_price > 0) {
      setItemCostPrice(prod.default_purchase_price.toString());
    }
    setIsSuggestOpen(false);
  };

  // Calculate live single item total: quantity * cost_price
  const currentItemQuantityNum = parseFloat(itemQuantity) || 0;
  const currentItemPriceNum = parseFloat(itemCostPrice) || 0;
  const currentItemTotalCost = Math.round(currentItemQuantityNum * currentItemPriceNum * 100) / 100;

  // Add Item to List
  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = itemSearch.trim();
    if (!name) {
      setError('يرجى إدخال أو اختيار اسم الدواء');
      return;
    }

    if (currentItemQuantityNum <= 0) {
      setError('يرجى تحديد كمية صحيحة أكبر من الصفر');
      return;
    }

    if (currentItemPriceNum < 0) {
      setError('يرجى إدخال سعر شراء صحيح');
      return;
    }

    const newItem: InvoiceDraftItem = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      product_id: selectedProductId || undefined,
      product_name: name,
      qty: currentItemQuantityNum,
      unit: itemUnit.trim() || 'علبة',
      cost_price: currentItemPriceNum,
      total_cost: currentItemTotalCost,
    };

    setItemsList((prev) => [...prev, newItem]);
    clearCurrentItemInputs();
    setError('');
  };

  const handleRemoveItem = (id: string) => {
    setItemsList((prev) => prev.filter((it) => it.id !== id));
  };

  // Invoice Grand Totals Calculation
  const subtotal = useMemo(() => {
    return itemsList.reduce((sum, it) => sum + (it.total_cost || 0), 0);
  }, [itemsList]);

  const discountNum = parseFloat(discountAmount) || 0;
  const totalInvoicePrice = Math.max(0, subtotal - discountNum);

  // Sync paidAmount when payment type changes
  useEffect(() => {
    if (paymentType === 'cash' || paymentType === 'bank') {
      setPaidAmount(totalInvoicePrice.toString());
    } else if (paymentType === 'credit') {
      setPaidAmount('0');
    }
  }, [paymentType, totalInvoicePrice]);

  const paidAmountNum = parseFloat(paidAmount) || 0;
  const remainingAmount = Math.max(0, totalInvoicePrice - paidAmountNum);

  // Submit invoice
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check supplier
    let supplierName = '';
    let supplierPhone = '';

    if (supplierMode === 'select') {
      const found = suppliers.find((s) => s.id === selectedSupplierId);
      if (!found) {
        setError('يرجى اختيار المورد من القائمة أو إضافة مورد جديد');
        return;
      }
      supplierName = found.name;
      supplierPhone = found.phone || '';
    } else {
      if (!newSupplierName.trim()) {
        setError('يرجى كتابة اسم المورد');
        return;
      }
      supplierName = newSupplierName.trim();
      supplierPhone = newSupplierPhone.trim();
    }

    // Check items
    let finalItems = [...itemsList];

    // If user filled item input but forgot to click "+ إضافة الدواء", add it automatically
    if (itemSearch.trim() && currentItemQuantityNum > 0 && currentItemPriceNum >= 0) {
      finalItems.push({
        id: `draft_${Date.now()}`,
        product_id: selectedProductId || undefined,
        product_name: itemSearch.trim(),
        qty: currentItemQuantityNum,
        unit: itemUnit.trim() || 'علبة',
        cost_price: currentItemPriceNum,
        total_cost: currentItemTotalCost,
      });
    }

    if (finalItems.length === 0) {
      setError('يرجى إضافة دواء واحد على الأقل للفاتورة');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await storage.addSupplierInvoice({
        supplier_name: supplierName,
        supplier_phone: supplierPhone || undefined,
        invoice_date: invoiceDate,
        invoice_number: invoiceNumber.trim() || undefined,
        payment_type: paymentType,
        paid_amount: paidAmountNum,
        discount_amount: discountNum,
        notes: notes.trim() || undefined,
        items: finalItems.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          qty: it.qty,
          unit: it.unit,
          cost_price: it.cost_price,
          total_cost: it.total_cost,
        })),
      });

      if (!res.success) {
        setError(res.error || 'فشل حفظ الفاتورة');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ الفاتورة');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-violet-500/20 border border-violet-400/30 rounded-xl text-violet-300">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base">إضافة فاتورة مشتريات أدوية جديدة</h3>
              <p className="text-[11px] text-violet-200/80 font-medium">
                تسجيل اسم المورد · إضافة عدة أدوية بالكمية وسعر الشراء · حساب تلقائي للإجمالي ونوع السداد
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-rose-800 text-sm font-bold">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Supplier & Invoice Meta */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                <Truck className="w-4 h-4 text-violet-600" />
                <span>بيانات المورد وتاريخ الفاتورة</span>
              </div>

              {/* Toggle Supplier Mode */}
              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSupplierMode('select')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    supplierMode === 'select'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  مورد مسجل ({suppliers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSupplierMode('new')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    supplierMode === 'new'
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  + مورد جديد
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Supplier Input */}
              {supplierMode === 'select' ? (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">اسم المورد *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  >
                    {suppliers.length === 0 ? (
                      <option value="">لا يوجد موردين مسجلين - اختر "+ مورد جديد"</option>
                    ) : (
                      suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.phone ? `(${s.phone})` : ''} - [الرصيد: {formatCurrency(s.current_balance)}]
                        </option>
                      ))
                    )}
                  </select>
                </div>
              ) : (
                <div className="space-y-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700">اسم المورد الجديد *</label>
                    <input
                      type="text"
                      placeholder="مثال: شركة النصر للأدوية، مورد أحمد..."
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">رقم الهاتف (اختياري)</label>
                    <input
                      type="text"
                      placeholder="010xxxxxxxx"
                      value={newSupplierPhone}
                      onChange={(e) => setNewSupplierPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Invoice Date */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">تاريخ الفاتورة *</label>
                <div className="relative">
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Invoice Ref Number (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">رقم فاتورة المورد (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: INV-8841 أو رقم الفاتورة الورقية"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Medicine Input Row (Adding Medicines & Live Subtotal) */}
          <div className="bg-violet-50/50 border-2 border-violet-200/80 rounded-2xl p-4.5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-violet-950 font-black text-sm">
                <Pill className="w-4.5 h-4.5 text-violet-600" />
                <span>إضافة دواء إلى الفاتورة</span>
              </div>
              <span className="text-xs text-violet-700 font-bold bg-violet-100 px-2.5 py-0.5 rounded-full">
                يحسب السعر تلقائياً (الكمية × سعر الشراء)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              {/* Medicine Name with Autocomplete */}
              <div className="sm:col-span-5 space-y-1 relative">
                <label className="text-xs font-bold text-slate-700">اسم الدواء *</label>
                <input
                  type="text"
                  placeholder="ابحث أو اكتب اسم الدواء..."
                  value={itemSearch}
                  onFocus={() => setIsSuggestOpen(true)}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setSelectedProductId('');
                    setIsSuggestOpen(true);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-violet-300 bg-white text-slate-900 text-sm font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />

                {/* Suggestions Dropdown */}
                {isSuggestOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsSuggestOpen(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-20 py-1 divide-y divide-slate-100">
                      {productSuggestions.length > 0 ? (
                        productSuggestions.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => handleSelectProduct(p)}
                            className="px-3.5 py-2 hover:bg-violet-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                          >
                            <span className="font-bold text-slate-800">{p.name}</span>
                            <span className="text-slate-500 font-mono">
                              شراء: {p.default_purchase_price ? `${p.default_purchase_price} ج.م` : 'غير محدد'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="px-3.5 py-2 text-xs text-slate-500">
                          سيتم إضافة "{itemSearch}" كدواء جديد تلقائياً
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Quantity */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-700">الكمية *</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  placeholder="1"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-violet-300 bg-white text-slate-900 text-sm font-bold text-center focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>

              {/* Unit */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-700">الوحدة</label>
                <select
                  value={itemUnit}
                  onChange={(e) => setItemUnit(e.target.value)}
                  className="w-full px-2.5 py-2.5 rounded-xl border border-violet-300 bg-white text-slate-900 text-sm font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none"
                >
                  <option value="علبة">علبة</option>
                  <option value="عبوة">عبوة</option>
                  <option value="زجاجة">زجاجة</option>
                  <option value="كيس">كيس</option>
                  <option value="لتر">لتر</option>
                  <option value="جرام">جرام</option>
                  <option value="كجم">كجم</option>
                  <option value="قرص">قرص</option>
                  <option value="كرتونة">كرتونة</option>
                  <option value="قطعة">قطعة</option>
                </select>
              </div>

              {/* Purchase Price */}
              <div className="sm:col-span-3 space-y-1">
                <label className="text-xs font-bold text-slate-700">سعر الشراء للوحدة *</label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={itemCostPrice}
                    onChange={(e) => setItemCostPrice(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-violet-300 bg-white text-slate-900 text-sm font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                    ج.م
                  </span>
                </div>
              </div>
            </div>

            {/* Live Calculation Bar for this Medicine */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 bg-white/80 p-3 rounded-xl border border-violet-200">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Calculator className="w-4 h-4 text-violet-600" />
                <span>سعر هذا الصنف:</span>
                <span className="font-mono text-slate-900">
                  {currentItemQuantityNum} {itemUnit} × {currentItemPriceNum} ج.م =
                </span>
                <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {formatCurrency(currentItemTotalCost)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة الدواء للفاتورة</span>
              </button>
            </div>
          </div>

          {/* Section 3: List of Added Medicines */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                الأدوية المضافة للفاتورة ({itemsList.length})
              </h4>
              {itemsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setItemsList([])}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold transition-colors cursor-pointer"
                >
                  تفريغ القائمة
                </button>
              )}
            </div>

            {itemsList.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-500 text-xs font-medium space-y-1">
                <p>لم يتم إضافة أي أدوية للفاتورة بعد.</p>
                <p className="text-[11px] text-slate-400">
                  أدخل اسم الدواء والكمية وسعر الشراء أعلاه ثم اضغط "إضافة الدواء للفاتورة".
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-100 text-[11px] font-black text-slate-600">
                  <span className="col-span-5">اسم الدواء</span>
                  <span className="col-span-2 text-center">الكمية</span>
                  <span className="col-span-2 text-center">سعر الشراء</span>
                  <span className="col-span-2 text-left">الإجمالي</span>
                  <span className="col-span-1 text-center">إجراء</span>
                </div>

                {itemsList.map((item, idx) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-slate-50/80 transition-colors text-xs font-bold text-slate-800"
                  >
                    <div className="col-span-5 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate">{item.product_name}</span>
                    </div>

                    <div className="col-span-2 text-center text-slate-600 font-mono">
                      {item.qty} {item.unit}
                    </div>

                    <div className="col-span-2 text-center text-slate-600 font-mono">
                      {formatCurrency(item.cost_price)}
                    </div>

                    <div className="col-span-2 text-left text-emerald-700 font-black font-mono">
                      {formatCurrency(item.total_cost)}
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="حذف هذا الصنف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Whole Invoice Calculations & Grand Total Banner */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <span className="text-xs text-indigo-200 font-medium">سعر الفاتورة كلها بعد إضافة الأدوية:</span>
                <div className="text-3xl font-black text-emerald-400 tracking-tight">
                  {formatCurrency(totalInvoicePrice)}
                </div>
              </div>

              {/* Discount Input */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-indigo-200">خصم من الفاتورة:</label>
                <div className="relative w-28">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold text-center focus:bg-white focus:text-slate-900 focus:outline-none"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-indigo-200">
                    ج.م
                  </span>
                </div>
              </div>
            </div>

            {/* Section 5: Payment Method / نوع السداد */}
            <div className="space-y-2.5">
              <label className="text-xs font-black text-indigo-200">نوع السداد (طريقة الدفع للمورد) *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Cash */}
                <button
                  type="button"
                  onClick={() => setPaymentType('cash')}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                    paymentType === 'cash'
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  <span className="text-xs font-black">نقدي (كاش)</span>
                  <span className="text-[10px] opacity-80">خصم من الخزينة</span>
                </button>

                {/* Credit */}
                <button
                  type="button"
                  onClick={() => setPaymentType('credit')}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                    paymentType === 'credit'
                      ? 'bg-amber-600 border-amber-400 text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Clock className="w-5 h-5" />
                  <span className="text-xs font-black">آجل (على الحساب)</span>
                  <span className="text-[10px] opacity-80">مديونية للمورد</span>
                </button>

                {/* Partial */}
                <button
                  type="button"
                  onClick={() => setPaymentType('partial')}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                    paymentType === 'partial'
                      ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs font-black">سداد جزئي</span>
                  <span className="text-[10px] opacity-80">جزء نقداً والباقي آجل</span>
                </button>

                {/* Bank / Transfer */}
                <button
                  type="button"
                  onClick={() => setPaymentType('bank')}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                    paymentType === 'bank'
                      ? 'bg-purple-600 border-purple-400 text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <ArrowRight className="w-5 h-5" />
                  <span className="text-xs font-black">تحويل بنكي / كاش</span>
                  <span className="text-[10px] opacity-80">فودافون كاش / بنك</span>
                </button>
              </div>

              {/* In case of Partial Payment, input for cash paid and live remaining debt */}
              {paymentType === 'partial' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white/10 rounded-2xl border border-white/15 animate-in fade-in">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-blue-200">المبلغ المدفوع نقداً الآن:</label>
                    <input
                      type="number"
                      min="0"
                      max={totalInvoicePrice}
                      step="any"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white text-slate-900 font-bold text-sm focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-200">المتبقي آجل على الحساب للمورد:</label>
                    <div className="w-full px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 font-black text-sm font-mono flex items-center justify-between">
                      <span>{formatCurrency(remainingAmount)}</span>
                      <span className="text-[10px] text-amber-200 font-normal">يضاف لحساب المورد</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1 pt-1">
              <label className="text-xs font-bold text-indigo-200">ملاحظات إضافية (اختياري):</label>
              <input
                type="text"
                placeholder="مثال: خصم إضافي تم الاتفاق عليه، تاريخ استحقاق الباقي..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-medium placeholder:text-white/40 focus:bg-white focus:text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-sm transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جارٍ حفظ الفاتورة...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>حفظ واعتماد الفاتورة</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
