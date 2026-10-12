import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  UserPlus,
  AlertTriangle,
  Receipt,
  RotateCcw,
  Store,
  Layers,
} from 'lucide-react';
import { Product, Customer, SalesInvoice, ProductUnit } from '../../types/database';
import { storage } from '../../lib/storage';
import { formatCurrency, formatQuantity, formatCustomerDisplayName } from '../../lib/formatters';
import { QuickAddCustomerModal } from './QuickAddCustomerModal';
import { InvoiceReceiptModal } from './InvoiceReceiptModal';

interface CartItem {
  product: Product;
  selectedUnit: ProductUnit;
  qty: number;
  qtyInBaseUnit: number;
  unitPrice: number;
  totalPrice: number;
}

export const PosScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(() => {
    const whs = storage.getWarehouses();
    const settings = storage.getSettings();
    const shopWh = whs.find((w) => w.location_type === 'shop' || w.is_primary);
    return settings.pos_settings.default_warehouse_id || shopWh?.id || whs[0]?.id || '';
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customCustomerName, setCustomCustomerName] = useState<string>('عميل نقدي سريع');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentType, setPaymentType] = useState<'cash' | 'credit' | 'partial'>('cash');
  const [discountAmount, setDiscountAmount] = useState<string>('0');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modals
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<SalesInvoice | null>(null);
  const [mobilePosTab, setMobilePosTab] = useState<'products' | 'cart'>('products');

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const loadData = () => {
    setProducts(storage.getProducts());
    setCustomers(storage.getCustomers());
    const whs = storage.getWarehouses();
    if (whs.length > 0) {
      setSelectedWarehouseId((prev) => {
        if (!prev || !whs.some((w) => w.id === prev)) {
          const shop = whs.find((w) => w.location_type === 'shop' || w.is_primary) || whs[0];
          return shop?.id || '';
        }
        return prev;
      });
    }
  };

  const categories = storage.getCategories();
  const warehouses = storage.getWarehouses();
  const cashAccounts = storage.getCashAccounts();
  const settings = storage.getSettings();

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (!p.is_active) return false;
    const matchesCat = selectedCategory === 'all' || p.category_id === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCat;
    const matchesQuery =
      p.name.toLowerCase().includes(q) ||
      (p.commercial_name && p.commercial_name.toLowerCase().includes(q)) ||
      (p.active_ingredient && p.active_ingredient.toLowerCase().includes(q)) ||
      p.code.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q));
    return matchesCat && matchesQuery;
  });

  // Cart operations
  const addToCart = (product: Product) => {
    const defaultUnit =
      product.units?.find((u) => u.is_default_sale) ||
      product.units?.[0] || {
        id: 'u-def',
        product_id: product.id,
        unit_name: product.base_unit_name,
        conversion_factor: 1,
        sale_price: product.default_sale_price,
        purchase_price: product.default_purchase_price,
        is_base_unit: true,
      };

    const existingIdx = cart.findIndex(
      (item) => item.product.id === product.id && item.selectedUnit.unit_name === defaultUnit.unit_name
    );

    if (existingIdx !== -1) {
      updateCartItemQty(existingIdx, cart[existingIdx].qty + 1);
    } else {
      const baseQty = 1 * defaultUnit.conversion_factor;
      setCart([
        ...cart,
        {
          product,
          selectedUnit: defaultUnit,
          qty: 1,
          qtyInBaseUnit: baseQty,
          unitPrice: defaultUnit.sale_price,
          totalPrice: defaultUnit.sale_price,
        },
      ]);
    }
    setErrorMessage('');
  };

  const updateCartItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    const updated = [...cart];
    const item = updated[index];
    item.qty = newQty;
    item.qtyInBaseUnit = newQty * item.selectedUnit.conversion_factor;
    item.totalPrice = newQty * item.unitPrice;
    setCart(updated);
  };

  const updateCartItemUnit = (index: number, newUnitName: string) => {
    const updated = [...cart];
    const item = updated[index];
    const unit = item.product.units?.find((u) => u.unit_name === newUnitName);
    if (!unit) return;

    item.selectedUnit = unit;
    item.unitPrice = unit.sale_price;
    item.qtyInBaseUnit = item.qty * unit.conversion_factor;
    item.totalPrice = item.qty * unit.sale_price;
    setCart(updated);
  };

  const updateCartItemPrice = (index: number, newPrice: number) => {
    const updated = [...cart];
    const item = updated[index];
    item.unitPrice = Math.max(0, newPrice);
    item.totalPrice = item.qty * item.unitPrice;
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    const updated = cart.filter((_, idx) => idx !== index);
    setCart(updated);
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount('0');
    setPaidAmountInput('');
    setNotes('');
    setErrorMessage('');
  };

  // Totals calculations
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const discount = Math.min(subtotal, Math.max(0, parseFloat(discountAmount) || 0));
  const netTotal = Math.max(0, subtotal - discount);

  let finalPaidAmount = netTotal;
  if (paymentType === 'credit') {
    finalPaidAmount = 0;
  } else if (paymentType === 'partial') {
    const parsed = parseFloat(paidAmountInput) || 0;
    finalPaidAmount = Math.min(netTotal, Math.max(0, parsed));
  }
  const remainingDebt = Math.max(0, netTotal - finalPaidAmount);

  // Submit sale atomically
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      setErrorMessage('سلة البيع فارغة، يرجى إضافة منتجات أولاً');
      return;
    }

    if (paymentType === 'credit' && !selectedCustomerId) {
      setErrorMessage('لا يمكن البيع بالآجل دون اختيار عميل مسجل بالنظام');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const customerName = selectedCustomer ? formatCustomerDisplayName(selectedCustomer) : customCustomerName.trim() || 'عميل نقدي';
      const defaultCash = cashAccounts.find((c) => c.is_primary)?.id || cashAccounts[0]?.id;

      const result = await storage.processSaleAtomic({
        customer_id: selectedCustomerId || undefined,
        customer_name_snapshot: customerName,
        warehouse_id: selectedWarehouseId,
        cash_account_id: defaultCash,
        payment_type: paymentType,
        subtotal,
        discount_amount: discount,
        tax_amount: 0,
        total_amount: netTotal,
        paid_amount: finalPaidAmount,
        notes: notes.trim(),
        items: cart.map((item) => ({
          product_id: item.product.id,
          product_name_snapshot: item.product.name,
          unit_id: item.selectedUnit.id,
          unit_name_snapshot: item.selectedUnit.unit_name,
          conversion_factor_snapshot: item.selectedUnit.conversion_factor,
          qty: item.qty,
          qty_in_base_unit: item.qtyInBaseUnit,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
        })),
      });

      if (!result.success) {
        setErrorMessage(result.error || 'فشلت عملية حفظ الفاتورة');
        setIsSubmitting(false);
        return;
      }

      // Success
      if (result.invoice) {
        setCompletedInvoice(result.invoice);
      }
      clearCart();
    } catch (err: any) {
      setErrorMessage(err?.message || 'حدث خطأ غير متوقع أثناء معالجة الفاتورة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Mobile Tab Switcher (Visible on Mobile & Tablet screens < lg) */}
      <div className="flex lg:hidden items-center bg-slate-200/80 p-1 rounded-2xl gap-1 border border-slate-300">
        <button
          type="button"
          onClick={() => setMobilePosTab('products')}
          className={`flex-1 py-2 px-3 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mobilePosTab === 'products'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>أصناف البيع ({filteredProducts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMobilePosTab('cart')}
          className={`flex-1 py-2 px-3 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mobilePosTab === 'cart'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingCart className="w-4 h-4 text-emerald-600" />
          <span>سلة الفاتورة ({cart.length})</span>
          {cart.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-600 text-white font-black tabular-nums">
              {formatCurrency(netTotal)}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 min-h-[calc(100vh-14rem)] lg:h-[calc(100vh-13rem)]">
        {/* Right Column (7 cols): Products catalog & Multi-unit selector */}
        <div className={`lg:col-span-7 flex flex-col h-full bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden ${
          mobilePosTab === 'cart' ? 'hidden lg:flex' : 'flex'
        }`}>
          {/* Search & Warehouse Bar */}
          <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50/70 space-y-2.5 sm:space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute right-3.5 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم، المادة الفعالة، الكود، الباركود..."
                  className="w-full pr-11 pl-4 py-2.5 text-xs sm:text-sm md:text-base bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Store className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="text-xs sm:text-sm py-2 sm:py-2.5 px-2.5 sm:px-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                >
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 text-xs sm:text-sm scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 sm:px-4 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                }`}
              >
                الكل ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 sm:px-4 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors shrink-0 ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-20 lg:pb-4">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-center">
                <Layers className="w-10 h-10 mb-2 stroke-1" />
                <p className="text-sm font-bold">لا توجد منتجات مطابقة للبحث</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 min-[480px]:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {filteredProducts.map((prod) => {
                  const stockInSelectedWh = storage.getProductStock(prod.id, selectedWarehouseId);
                  const isLow = stockInSelectedWh <= prod.min_stock_alert;
                  const isOutOfStock = stockInSelectedWh <= 0;

                  const defaultUnit =
                    prod.units?.find((u) => u.is_default_sale) || prod.units?.[0];

                  return (
                    <div
                      key={prod.id}
                      onClick={() => addToCart(prod)}
                      className={`flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border-2 text-right transition-all cursor-pointer select-none active:scale-98 ${
                        isOutOfStock
                          ? 'bg-slate-50 border-slate-200 opacity-80 hover:border-slate-300'
                          : 'bg-white border-slate-200 hover:border-emerald-500 hover:shadow-md'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1.5 mb-1.5 sm:mb-2 flex-wrap">
                          <span className="text-[11px] sm:text-xs text-slate-500 font-bold tabular-nums bg-slate-100 px-2 py-0.5 rounded-md">{prod.code}</span>
                          <div className="flex items-center gap-1">
                            {prod.category?.name && (
                              <span className="text-[10px] sm:text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold truncate max-w-[110px]">
                                {prod.category.name}
                              </span>
                            )}
                            {prod.is_pesticide && (
                              <span className="text-[10px] sm:text-xs text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md font-bold">مبيد</span>
                            )}
                          </div>
                        </div>

                        <h4 className="text-sm sm:text-base font-black text-slate-900 line-clamp-1 leading-snug">
                          {prod.name}
                        </h4>

                        {prod.active_ingredient && (
                          <p className="text-xs sm:text-sm text-slate-500 line-clamp-1 mt-0.5 font-medium">
                            {prod.active_ingredient}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm">
                        <div>
                          <span className="font-black text-emerald-800 tabular-nums text-sm sm:text-base">
                            {defaultUnit ? formatCurrency(defaultUnit.sale_price) : formatCurrency(prod.default_sale_price)}
                          </span>
                          {defaultUnit && (
                            <span className="text-[10px] sm:text-xs text-slate-500 mr-1 font-semibold">
                              / {defaultUnit.unit_name}
                            </span>
                          )}
                        </div>

                        <div className="text-xs sm:text-sm text-left">
                          <span className="text-slate-500 text-[10px] sm:text-xs">المخزون: </span>
                          <span
                            className={`font-black tabular-nums ${
                              isOutOfStock
                                ? 'text-rose-600'
                                : isLow
                                ? 'text-amber-600'
                                : 'text-slate-800'
                            }`}
                          >
                            {formatQuantity(stockInSelectedWh)} {prod.base_unit_name}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Left Column (5 cols): POS Invoice Cart & Immediate Settlement */}
        <div className={`lg:col-span-5 flex flex-col h-full bg-white rounded-2xl shadow-xs border-2 border-slate-200 overflow-hidden ${
          mobilePosTab === 'products' ? 'hidden lg:flex' : 'flex'
        }`}>
          {/* Customer Header */}
          <div className="p-3.5 sm:p-4 bg-slate-900 text-white border-b border-slate-800 space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobilePosTab('products')}
                  className="lg:hidden text-xs font-bold text-slate-300 hover:text-white bg-slate-800 px-2.5 py-1 rounded-lg"
                >
                  ← كتالوج الأصناف
                </button>
                <span className="text-xs sm:text-sm font-bold text-slate-300">العميل / المشتري:</span>
              </div>
              <button
                onClick={() => setShowAddCustomerModal(true)}
                type="button"
                className="flex items-center gap-1.5 text-xs sm:text-sm text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>+ عميل جديد</span>
              </button>
            </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                if (e.target.value) {
                  const cust = customers.find((c) => c.id === e.target.value);
                  if (cust) setCustomCustomerName(cust.name);
                } else {
                  setCustomCustomerName('عميل نقدي سريع');
                }
              }}
              className="flex-1 text-sm sm:text-base py-2.5 px-3.5 bg-slate-800 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-400 font-medium"
            >
              <option value="">-- عميل نقدي مباشر (بدون حساب) --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.code}] {c.name}{c.partner_name ? ` (شريك: ${c.partner_name})` : ''} {c.phone ? `(${c.phone})` : ''} - [الرصيد: {c.current_balance.toFixed(2)} ج.م]
                </option>
              ))}
            </select>
          </div>

          {selectedCustomer && (
            <div className="flex items-center justify-between text-sm px-3.5 py-2 bg-slate-800/90 rounded-xl border border-slate-700">
              <span className="text-slate-300 font-medium">المديونية الحالية على العميل:</span>
              <span
                className={`font-black tabular-nums text-base ${
                  selectedCustomer.current_balance > 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {formatCurrency(selectedCustomer.current_balance)}
              </span>
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-center">
              <ShoppingCart className="w-8 h-8 mb-2 stroke-1" />
              <p className="text-xs">السلة فارغة</p>
              <p className="text-[11px] text-slate-400 mt-0.5">انقر على أي منتج لإضافته للفاتورة</p>
            </div>
          ) : (
            cart.map((item, idx) => {
              const currentStock = storage.getProductStock(item.product.id, selectedWarehouseId);
              const isOverStock = item.qtyInBaseUnit > currentStock;

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border text-xs sm:text-sm transition-colors ${
                    isOverStock ? 'bg-rose-50/60 border-rose-300' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h5 className="font-bold text-slate-900 leading-normal text-sm">{item.product.name}</h5>
                      {/* Multi-unit Conversion Explanation */}
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span>الخصم من المخزون: </span>
                        <span className="font-bold text-emerald-800 tabular-nums">
                          {formatQuantity(item.qtyInBaseUnit)} {item.product.base_unit_name}
                        </span>
                        {isOverStock && (
                          <span className="text-rose-600 font-bold mr-1">
                            (المتاح: {formatQuantity(currentStock)} فقط!)
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromCart(idx)}
                      type="button"
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-200/50"
                      title="حذف من السلة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Unit Selector & Quantity Inputs */}
                  <div className="grid grid-cols-12 gap-2.5 mt-3 pt-2.5 border-t border-slate-200/70 items-center">
                    {/* Unit Select (5 cols) */}
                    <div className="col-span-5">
                      <select
                        value={item.selectedUnit.unit_name}
                        onChange={(e) => updateCartItemUnit(idx, e.target.value)}
                        className="w-full text-xs py-1.5 px-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-medium"
                      >
                        {item.product.units?.map((u) => (
                          <option key={u.id} value={u.unit_name}>
                            {u.unit_name} ({formatQuantity(u.conversion_factor)} {item.product.base_unit_name})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Qty +/- Controls (4 cols) */}
                    <div className="col-span-4 flex items-center justify-center gap-1.5 bg-white border border-slate-300 rounded-lg py-1 px-2">
                      <button
                        onClick={() => updateCartItemQty(idx, item.qty - 1)}
                        type="button"
                        className="p-1 text-slate-600 hover:text-rose-600 rounded"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={item.qty}
                        onChange={(e) => updateCartItemQty(idx, parseFloat(e.target.value) || 0)}
                        className="w-14 text-center text-xs font-bold tabular-nums focus:outline-none"
                      />
                      <button
                        onClick={() => updateCartItemQty(idx, item.qty + 1)}
                        type="button"
                        className="p-1 text-slate-600 hover:text-emerald-600 rounded"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Item Total (3 cols) */}
                    <div className="col-span-3 text-left">
                      <span className="font-bold text-slate-900 tabular-nums text-sm">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="px-3 py-2 bg-rose-50 border-t border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Invoice Settlement Panel */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3.5">
          {/* Payment Type Selection */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentType('cash')}
              className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors ${
                paymentType === 'cash'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              نقدي كامل
            </button>
            <button
              type="button"
              onClick={() => setPaymentType('credit')}
              className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors ${
                paymentType === 'credit'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              آجل كامل
            </button>
            <button
              type="button"
              onClick={() => setPaymentType('partial')}
              className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors ${
                paymentType === 'partial'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              دفع جزئي
            </button>
          </div>

          {/* Discount & Partial Paid inputs */}
          <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
            <div>
              <label className="text-xs text-slate-600 block mb-1">الخصم (ج.م)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-full py-1.5 px-3 text-sm tabular-nums font-semibold bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {paymentType === 'partial' && (
              <div>
                <label className="text-xs text-slate-600 block mb-1">المبلغ المدفوع الآن</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0.00"
                  value={paidAmountInput}
                  onChange={(e) => setPaidAmountInput(e.target.value)}
                  className="w-full py-1.5 px-3 text-sm tabular-nums bg-white border border-indigo-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-bold"
                />
              </div>
            )}
          </div>

          {/* Totals Summary */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200 text-xs sm:text-sm">
            <div className="flex justify-between text-slate-600">
              <span>المجموع:</span>
              <span className="tabular-nums font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-rose-600 font-medium">
                <span>الخصم:</span>
                <span className="tabular-nums">- {formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base text-slate-900 pt-1.5 border-t border-slate-200">
              <span>صافي الفاتورة:</span>
              <span className="text-emerald-800 text-lg tabular-nums">{formatCurrency(netTotal)}</span>
            </div>
            {remainingDebt > 0 && (
              <div className="flex justify-between text-rose-700 font-bold text-xs sm:text-sm">
                <span>المتبقي آجل على العميل:</span>
                <span className="tabular-nums">{formatCurrency(remainingDebt)}</span>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              onClick={clearCart}
              type="button"
              disabled={cart.length === 0}
              className="p-3 text-slate-500 hover:text-rose-600 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
              title="إفراغ السلة"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={handleCompleteSale}
              disabled={cart.length === 0 || isSubmitting}
              type="button"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 text-sm"
            >
              <Receipt className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الاعتماد...' : `اعتماد وحفظ الفاتورة (${formatCurrency(netTotal)})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* Floating Quick-Checkout Bar on Mobile when browsing products */}
      {mobilePosTab === 'products' && cart.length > 0 && (
        <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40 bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div>
            <div className="text-[11px] text-slate-300 font-bold flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
              <span>السلة ({cart.length} أصناف)</span>
            </div>
            <div className="text-sm font-black text-emerald-400 tabular-nums">
              {formatCurrency(netTotal)}
            </div>
          </div>

          <button
            onClick={() => setMobilePosTab('cart')}
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-black rounded-xl shadow-xs cursor-pointer active:scale-95"
          >
            <span>استكمال الفاتورة</span>
            <Receipt className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-modals */}
      <QuickAddCustomerModal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onCustomerCreated={(c) => {
          setSelectedCustomerId(c.id);
          setCustomCustomerName(c.name);
        }}
      />

      <InvoiceReceiptModal
        invoice={completedInvoice}
        onClose={() => setCompletedInvoice(null)}
      />
    </div>
  );
};
