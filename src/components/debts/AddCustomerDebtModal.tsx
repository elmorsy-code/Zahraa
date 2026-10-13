import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  AlertCircle,
  Calendar,
  DollarSign,
  Package,
  User,
  Check,
  Search,
  Pill,
  Scale,
  FlaskConical,
  Coins,
  FileText,
  Tag,
  Trash2,
  ListPlus,
  Layers,
} from 'lucide-react';
import { Customer, Product } from '../../types/database';
import { storage } from '../../lib/storage';
import { formatCurrency } from '../../lib/formatters';

interface AddCustomerDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCustomerId?: string;
}

export interface DebtItemEntry {
  id: string;
  product_id?: string;
  item_name: string;
  is_sub_quantity: boolean;
  // Standard quantity fields
  quantity?: number;
  unit?: string; // جرام / مل / كيس / زجاجة
  unit_price?: number;
  // Sub-quantity fields (كمية فرعية / جزء من عبوة)
  sub_quantity?: number; // e.g. 20
  sub_unit?: string; // e.g. مل
  full_capacity?: number; // e.g. 100
  package_type?: string; // e.g. زجاجة
  package_price?: number; // e.g. 100
  // Final calculated/adjusted price for this item
  total_price: number;
}

const STANDARD_UNITS = [
  { id: 'جرام', label: 'جرام', icon: Scale },
  { id: 'مل', label: 'مل', icon: FlaskConical },
  { id: 'كيس', label: 'كيس', icon: Package },
  { id: 'زجاجة', label: 'زجاجة', icon: Tag },
];

const PACKAGE_TYPES = ['زجاجة', 'كيس', 'عبوة'];
const CAPACITY_UNITS = ['مل', 'جرام', 'لتر', 'كجم'];

export const AddCustomerDebtModal: React.FC<AddCustomerDebtModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCustomerId,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId || '');
  const [customerSearch, setCustomerSearch] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // List of added medicines/items for this debt
  const [itemsList, setItemsList] = useState<DebtItemEntry[]>([]);

  // Current item builder form state
  const [itemSearch, setItemSearch] = useState('');
  const [itemName, setItemName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');

  // Mode: standard vs sub-quantity (كمية فرعية)
  const [isSubQuantityMode, setIsSubQuantityMode] = useState(false);

  // Standard Quantity inputs
  const [quantity, setQuantity] = useState('1');
  const [selectedUnit, setSelectedUnit] = useState('زجاجة');
  const [unitPrice, setUnitPrice] = useState('');

  // Sub-Quantity inputs (تجزئة / كسر عبوة)
  // مثال المستخدم: زجاجة دواء 100 مل وأخذ منها 20 مل
  const [fullCapacity, setFullCapacity] = useState('100'); // سعة العبوة الأصلية
  const [subUnit, setSubUnit] = useState('مل'); // وحدة السعة
  const [packageType, setPackageType] = useState('زجاجة'); // نوع العبوة (زجاجة / كيس / عبوة)
  const [subQuantity, setSubQuantity] = useState('20'); // الكمية الفرعية المأخوذة
  const [packagePrice, setPackagePrice] = useState('100'); // سعر العبوة الأصلية كاملة

  // Calculated item total price
  const [itemTotalPrice, setItemTotalPrice] = useState('');

  // Purchase date & notes
  const [purchaseDate, setPurchaseDate] = useState(() => {
    const now = new Date();
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setCustomers(storage.getCustomers());
    setProducts(storage.getProducts());
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
    }
  }, [initialCustomerId, isOpen]);

  // Selected customer object
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  // Filter customers for selection
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 8);
    const q = customerSearch.toLowerCase().trim();
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.partner_name && c.partner_name.toLowerCase().includes(q)) ||
          c.code.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q))
      )
      .slice(0, 8);
  }, [customers, customerSearch]);

  // Filter medicines for dropdown
  const filteredProducts = useMemo(() => {
    if (!itemSearch.trim()) return products.slice(0, 15);
    const q = itemSearch.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.active_ingredient && p.active_ingredient.toLowerCase().includes(q)) ||
        (p.category_name && p.category_name.toLowerCase().includes(q)) ||
        (p.weight_or_size && p.weight_or_size.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [products, itemSearch]);

  // When a product is selected from list
  const handleSelectProduct = (prod: Product) => {
    setItemName(prod.name);
    setSelectedProductId(prod.id);
    setItemSearch('');

    const defaultPrice = prod.default_sale_price || 0;

    // Detect weight / capacity from prod.weight_or_size
    let detectedCapacity = 100;
    let detectedUnit = 'مل';
    let detectedPkg = 'زجاجة';

    if (prod.weight_or_size) {
      const match = prod.weight_or_size.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
      if (match) {
        detectedCapacity = parseFloat(match[1]) || 100;
        const rawUnit = match[2].trim();
        if (rawUnit.includes('جرام') || rawUnit.includes('جم')) {
          detectedUnit = 'جرام';
          detectedPkg = 'كيس';
        } else if (rawUnit.includes('مل')) {
          detectedUnit = 'مل';
          detectedPkg = 'زجاجة';
        } else if (rawUnit.includes('كيس')) {
          detectedUnit = 'كيس';
          detectedPkg = 'كيس';
        } else if (rawUnit.includes('زجاجة')) {
          detectedUnit = 'زجاجة';
          detectedPkg = 'زجاجة';
        }
      }
    }

    if (isSubQuantityMode) {
      setFullCapacity(String(detectedCapacity));
      setSubUnit(detectedUnit);
      setPackageType(detectedPkg);
      if (defaultPrice > 0) {
        setPackagePrice(String(defaultPrice));
        const subQ = parseFloat(subQuantity) || 0;
        if (subQ > 0 && detectedCapacity > 0) {
          const calc = Number(((subQ / detectedCapacity) * defaultPrice).toFixed(2));
          setItemTotalPrice(String(calc));
        }
      }
    } else {
      if (defaultPrice > 0) {
        setUnitPrice(String(defaultPrice));
        const q = parseFloat(quantity) || 1;
        setItemTotalPrice(String(Number((q * defaultPrice).toFixed(2))));
      }
      if (STANDARD_UNITS.some((u) => u.id === detectedUnit)) {
        setSelectedUnit(detectedUnit);
      } else if (STANDARD_UNITS.some((u) => u.id === detectedPkg)) {
        setSelectedUnit(detectedPkg);
      }
    }
  };

  // Recalculate standard total
  const updateStandardTotal = (newQty: string, newUnitPrice: string) => {
    const q = parseFloat(newQty);
    const p = parseFloat(newUnitPrice);
    if (!isNaN(q) && !isNaN(p) && q > 0 && p > 0) {
      setItemTotalPrice(String(Number((q * p).toFixed(2))));
    }
  };

  // Recalculate sub-quantity total
  // (الكمية الفرعية ÷ سعة العبوة) × سعر العبوة
  const updateSubQuantityTotal = (newSubQty: string, newFullCap: string, newPkgPrice: string) => {
    const subQ = parseFloat(newSubQty);
    const cap = parseFloat(newFullCap);
    const pkgP = parseFloat(newPkgPrice);
    if (!isNaN(subQ) && !isNaN(cap) && !isNaN(pkgP) && cap > 0 && subQ > 0 && pkgP > 0) {
      const calc = Number(((subQ / cap) * pkgP).toFixed(2));
      setItemTotalPrice(String(calc));
    }
  };

  // Toggle mode
  const handleToggleMode = (subMode: boolean) => {
    setIsSubQuantityMode(subMode);
    if (subMode) {
      // Switched to Sub-Quantity
      const cap = parseFloat(fullCapacity) || 100;
      const subQ = parseFloat(subQuantity) || 20;
      const pkgP = parseFloat(packagePrice) || parseFloat(unitPrice) || 100;
      setPackagePrice(String(pkgP));
      if (cap > 0 && subQ > 0 && pkgP > 0) {
        const calc = Number(((subQ / cap) * pkgP).toFixed(2));
        setItemTotalPrice(String(calc));
      }
    } else {
      // Switched to Standard
      const q = parseFloat(quantity) || 1;
      const p = parseFloat(unitPrice) || parseFloat(packagePrice) || 50;
      setUnitPrice(String(p));
      if (q > 0 && p > 0) {
        setItemTotalPrice(String(Number((q * p).toFixed(2))));
      }
    }
  };

  // Add current item to itemsList
  const handleAddItemToList = () => {
    if (!itemName.trim()) {
      setError('يرجى تحديد أو كتابة اسم الدواء أولاً');
      return;
    }

    const price = parseFloat(itemTotalPrice);
    if (isNaN(price) || price <= 0) {
      setError('يرجى تحديد سعر صحيح للدواء أكبر من الصفر');
      return;
    }

    const newItem: DebtItemEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      product_id: selectedProductId || undefined,
      item_name: itemName.trim(),
      is_sub_quantity: isSubQuantityMode,
      total_price: price,
      ...(isSubQuantityMode
        ? {
            sub_quantity: parseFloat(subQuantity) || 0,
            sub_unit: subUnit,
            full_capacity: parseFloat(fullCapacity) || 100,
            package_type: packageType,
            package_price: parseFloat(packagePrice) || undefined,
          }
        : {
            quantity: parseFloat(quantity) || 1,
            unit: selectedUnit,
            unit_price: parseFloat(unitPrice) || undefined,
          }),
    };

    setItemsList((prev) => [...prev, newItem]);

    // Reset current builder for next medicine
    setItemName('');
    setSelectedProductId('');
    setItemSearch('');
    setItemTotalPrice('');
    setQuantity('1');
    setSelectedUnit('زجاجة');
    setUnitPrice('');
    setSubQuantity('20');
    setFullCapacity('100');
    setPackagePrice('100');
    setError('');
  };

  // Remove an item from the list
  const handleRemoveItem = (id: string) => {
    setItemsList((prev) => prev.filter((it) => it.id !== id));
  };

  // Total debt calculation across all added items + current item if valid
  const calculatedGrandTotal = useMemo(() => {
    const listTotal = itemsList.reduce((sum, it) => sum + (it.total_price || 0), 0);
    // If user filled current builder without explicitly clicking "Add to list", we also count it
    const currentPrice = parseFloat(itemTotalPrice);
    if (itemsList.length === 0 && !isNaN(currentPrice) && currentPrice > 0 && itemName.trim()) {
      return currentPrice;
    }
    return listTotal;
  }, [itemsList, itemTotalPrice, itemName]);

  if (!isOpen) return null;

  // Submit all debt items
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      setError('يرجى اختيار العميل أولاً');
      return;
    }

    // Determine final items array
    let finalItems = [...itemsList];

    // If itemsList is empty, or if user is currently editing an item that wasn't added yet
    if (itemName.trim()) {
      const price = parseFloat(itemTotalPrice);
      if (!isNaN(price) && price > 0) {
        finalItems.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          product_id: selectedProductId || undefined,
          item_name: itemName.trim(),
          is_sub_quantity: isSubQuantityMode,
          total_price: price,
          ...(isSubQuantityMode
            ? {
                sub_quantity: parseFloat(subQuantity) || 0,
                sub_unit: subUnit,
                full_capacity: parseFloat(fullCapacity) || 100,
                package_type: packageType,
                package_price: parseFloat(packagePrice) || undefined,
              }
            : {
                quantity: parseFloat(quantity) || 1,
                unit: selectedUnit,
                unit_price: parseFloat(unitPrice) || undefined,
              }),
        });
      }
    }

    if (finalItems.length === 0) {
      setError('يرجى إضافة دواء واحد على الأقل للمديونية مع تحديد كميته وسعره');
      return;
    }

    const totalAmount = finalItems.reduce((s, it) => s + (it.total_price || 0), 0);
    if (totalAmount <= 0) {
      setError('يرجى التأكد من أن إجمالي المديونية أكبر من الصفر');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await storage.addCustomerDebt({
        customer_id: selectedCustomerId,
        invoice_number: invoiceNumber.trim() || undefined,
        amount: totalAmount,
        items: finalItems,
        purchase_date: purchaseDate,
        notes: notes.trim(),
      });

      if (!res.success) {
        setError(res.error || 'فشل تسجيل المديونية');
        return;
      }

      onSuccess();
      onClose();

      // Reset
      setItemsList([]);
      setItemName('');
      setSelectedProductId('');
      setInvoiceNumber('');
      setNotes('');
      setError('');
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ المديونية');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 border border-amber-400/30 rounded-xl text-amber-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base">تسجيل مديونية جديدة على عميل</h3>
              <p className="text-[11px] text-amber-200/80 font-medium">
                إمكانية أخذ كذا دواء معاً · دعم كمية فرعية (تجزئة/كسر عبوة) والكميات الأساسية
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4.5 overflow-y-auto flex-1 text-right">
          {error && (
            <div className="p-3 text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Customer Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-800">
              1. العميل / المزارع <span className="text-rose-500">*</span>
            </label>

            {selectedCustomer ? (
              <div className="p-3.5 bg-slate-50 border-2 border-emerald-400/80 rounded-2xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>{selectedCustomer.name}</span>
                    {selectedCustomer.partner_name && (
                      <span className="text-xs text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded-md">
                        (شريك: {selectedCustomer.partner_name})
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    كود: <span className="font-mono">{selectedCustomer.code}</span>
                    {selectedCustomer.phone && ` · هاتف: ${selectedCustomer.phone}`}
                    {selectedCustomer.village_or_address && ` · ${selectedCustomer.village_or_address}`}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCustomerId('')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold underline px-2 py-1 cursor-pointer"
                >
                  تغيير العميل
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="ابحث باسم العميل أو الشريك أو الكود..."
                    className="w-full pr-10 pl-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                  {filteredCustomers.length === 0 ? (
                    <div className="col-span-2 p-3 text-center text-xs text-slate-400">
                      لا يوجد عميل مطابق للبحث
                    </div>
                  ) : (
                    filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setCustomerSearch('');
                        }}
                        className="text-right p-2.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 bg-white transition-all text-xs flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-slate-900">
                            {c.name}
                            {c.partner_name && (
                              <span className="text-[10px] text-amber-700 mr-1">({c.partner_name})</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{c.code}</div>
                        </div>
                        <span className="text-[10px] font-bold text-amber-700">
                          {formatCurrency(c.current_balance)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Invoice Number & Purchase Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>رقم الفاتورة الورقية (اختياري)</span>
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="مثال: INV-1045 أو رقم الدفتر"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>تاريخ ووقت الشراء</span>
              </label>
              <input
                type="datetime-local"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-slate-800"
              />
            </div>
          </div>

          {/* 3. List of Already Added Medicines/Items (إذا أضاف أكثر من دواء) */}
          {itemsList.length > 0 && (
            <div className="space-y-2 bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-700" />
                  <span>الأدوية المضافة للمديونية ({itemsList.length} أصناف)</span>
                </span>
                <span className="text-xs font-black text-amber-900 font-mono">
                  المجموع: {formatCurrency(itemsList.reduce((s, it) => s + it.total_price, 0))}
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {itemsList.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-amber-200 shadow-2xs text-xs"
                  >
                    <div className="space-y-0.5 flex-1 pr-1">
                      <div className="font-black text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span>{item.item_name}</span>
                        {item.is_sub_quantity ? (
                          <span className="text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <FlaskConical className="w-3 h-3 text-indigo-700" />
                            <span>
                              كمية فرعية: {item.sub_quantity} {item.sub_unit} من أصل {item.full_capacity} {item.sub_unit} ({item.package_type})
                            </span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Scale className="w-3 h-3 text-emerald-700" />
                            <span>
                              {item.quantity} {item.unit}
                              {item.unit_price ? ` · سعر الوحدة: ${item.unit_price} ج.م` : ''}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-black text-amber-800 font-mono text-sm">
                        {formatCurrency(item.total_price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف هذا الدواء من القائمة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Active Medicine Entry Builder (+ إضافة دواء) */}
          <div className="space-y-3.5 p-4 bg-slate-50/80 rounded-2xl border-2 border-dashed border-slate-300">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-amber-700" />
                <span>
                  {itemsList.length > 0 ? 'إضافة دواء / صنف آخر لهذه المديونية' : '2. بيانات الدواء والكمية والسعر'}
                </span>
              </label>

              {/* Mode Toggle: عبوة كاملة vs كمية فرعية (تجزئة) */}
              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => handleToggleMode(false)}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    !isSubQuantityMode
                      ? 'bg-white text-slate-900 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  عبوة كاملة / كمية أساسية
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleMode(true)}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                    isSubQuantityMode
                      ? 'bg-indigo-600 text-white shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FlaskConical className="w-3 h-3" />
                  <span>كمية فرعية (تجزئة عبوة)</span>
                </button>
              </div>
            </div>

            {/* Medicine Name or Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">
                  اسم الدواء <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  يمكنك الاختيار من القائمة أو كتابة أي اسم دواء مباشرة
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => {
                    setItemName(e.target.value);
                    setSelectedProductId('');
                  }}
                  placeholder="اكتب اسم الدواء مباشرة..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                />

                <div className="relative">
                  <Search className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="ابحث في أدوية ومخزون المحل..."
                    className="w-full pr-8 pl-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Medicine search dropdown pills if searching */}
              {itemSearch.trim() && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-white rounded-xl border border-slate-200 text-xs">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProduct(p)}
                      className="text-right p-2 rounded-lg border border-slate-200 hover:border-amber-500 hover:bg-amber-50/60 transition-all flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-500">
                          {p.weight_or_size && <span className="ml-1 text-slate-700 font-semibold">{p.weight_or_size}</span>}
                          {p.active_ingredient && <span>(مادة: {p.active_ingredient})</span>}
                        </div>
                      </div>
                      {p.default_sale_price ? (
                        <span className="text-[10px] font-bold text-amber-700 font-mono">
                          {p.default_sale_price} ج.م
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* MODE A: Standard Quantity (عبوة كاملة / كمية عادية) */}
            {!isSubQuantityMode && (
              <div className="space-y-2 bg-white p-3.5 rounded-xl border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Quantity */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      الكمية
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      value={quantity}
                      onChange={(e) => {
                        setQuantity(e.target.value);
                        updateStandardTotal(e.target.value, unitPrice);
                      }}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-800"
                    />
                  </div>

                  {/* Unit Selection (The 4 units requested: جرام / مل / كيس / زجاجة) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      الوحدة
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {STANDARD_UNITS.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setSelectedUnit(u.id)}
                          className={`py-1.5 px-1 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
                            selectedUnit === u.id
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {u.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Unit Price */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      سعر الوحدة (ج.م)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={unitPrice}
                      onChange={(e) => {
                        setUnitPrice(e.target.value);
                        updateStandardTotal(quantity, e.target.value);
                      }}
                      placeholder="مثال: 50"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* Total Price for this item */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700">
                    سعر هذا الصنف الإجمالي (ج.م):
                  </span>
                  <div className="flex items-center gap-1.5 w-40">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={itemTotalPrice}
                      onChange={(e) => setItemTotalPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-1.5 text-xs bg-amber-50/70 border border-amber-300 rounded-xl font-mono font-black text-amber-900 text-left"
                    />
                    <span className="text-xs font-bold text-amber-800">ج.م</span>
                  </div>
                </div>
              </div>
            )}

            {/* MODE B: Sub-Quantity (كمية فرعية: كسر عبوة / جزء من زجاجة أو كيس) */}
            {isSubQuantityMode && (
              <div className="space-y-3 bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-200 text-xs">
                <div className="flex items-center justify-between text-indigo-950 font-bold">
                  <span className="flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4 text-indigo-700" />
                    <span>تحديد الكمية الفرعية المسحوبة من العبوة (تجزئة)</span>
                  </span>
                  <span className="text-[10px] text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md font-medium">
                    مثال: زجاجة 100 مل أخذ منها 20 مل
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* نوع العبوة */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      نوع العبوة الأصلية
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {PACKAGE_TYPES.map((pt) => (
                        <button
                          key={pt}
                          type="button"
                          onClick={() => setPackageType(pt)}
                          className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                            packageType === pt
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-white text-slate-700 border border-slate-200'
                          }`}
                        >
                          {pt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* سعة العبوة الأصلية كاملة */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      سعة العبوة الأصلية كاملة
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="any"
                        min="0.1"
                        value={fullCapacity}
                        onChange={(e) => {
                          setFullCapacity(e.target.value);
                          updateSubQuantityTotal(subQuantity, e.target.value, packagePrice);
                        }}
                        placeholder="100"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800"
                      />
                      <select
                        value={subUnit}
                        onChange={(e) => setSubUnit(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 cursor-pointer"
                      >
                        {CAPACITY_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* الكمية الفرعية المأخوذة */}
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                      الكمية الفرعية المأخوذة
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        value={subQuantity}
                        onChange={(e) => {
                          setSubQuantity(e.target.value);
                          updateSubQuantityTotal(e.target.value, fullCapacity, packagePrice);
                        }}
                        placeholder="20"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border-2 border-indigo-400 rounded-lg font-mono font-black text-indigo-950"
                      />
                      <span className="font-bold text-indigo-800 px-1">{subUnit}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-indigo-100">
                  {/* سعر العبوة الأصلية كاملة */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      سعر العبوة الأصلية كاملة (ج.م)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={packagePrice}
                      onChange={(e) => {
                        setPackagePrice(e.target.value);
                        updateSubQuantityTotal(subQuantity, fullCapacity, e.target.value);
                      }}
                      placeholder="100"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800"
                    />
                  </div>

                  {/* سعر الجزء المحسوب / المطلوب */}
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-950 mb-1">
                      سعر الكمية الفرعية المحسوب (ج.م)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={itemTotalPrice}
                        onChange={(e) => setItemTotalPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-1.5 text-xs bg-white border-2 border-indigo-500 rounded-lg font-mono font-black text-indigo-950 text-left"
                      />
                      <span className="font-bold text-indigo-800">ج.م</span>
                    </div>
                  </div>
                </div>

                {/* توضيح الحسبة */}
                <div className="text-[11px] text-indigo-800 bg-white/80 p-2 rounded-lg border border-indigo-100 flex items-center justify-between">
                  <span>
                    المأخوذ: <strong className="font-mono text-indigo-950">{subQuantity} {subUnit}</strong> من أصل{' '}
                    <strong className="font-mono text-indigo-950">{fullCapacity} {subUnit}</strong> ({packageType})
                  </span>
                  <span className="font-mono font-bold text-indigo-950">
                    النسبة: {((parseFloat(subQuantity) || 0) / (parseFloat(fullCapacity) || 1) * 100).toFixed(1)}% = {itemTotalPrice || '0'} ج.م
                  </span>
                </div>
              </div>
            )}

            {/* زر إضافة هذا الدواء إلى القائمة */}
            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={handleAddItemToList}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-all shadow-2xs cursor-pointer"
              >
                <ListPlus className="w-4 h-4 text-amber-700" />
                <span>+ إضافة هذا الدواء لقائمة المديونية</span>
              </button>
            </div>
          </div>

          {/* 5. Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات إضافية (اختياري)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: سداد بعد الحصاد، تسليم باليد، رشة أولى..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          {/* 6. Grand Total Card */}
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs text-amber-900 block font-black">
                إجمالي المديونية المستحقة على العميل
              </span>
              <span className="text-[11px] text-amber-800/80">
                {itemsList.length > 0
                  ? `مجموع ${itemsList.length} أدوية مضافة`
                  : 'دواء واحد'}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-950">
              {formatCurrency(calculatedGrandTotal)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-black text-white bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'جاري التسجيل...' : 'حفظ وتسجيل المديونية على العميل'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
