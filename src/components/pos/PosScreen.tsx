import React, { useState, useEffect, useRef } from 'react';
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
  Package,
  ChevronDown,
  Check,
  X,
  User,
  Phone,
  MapPin,
} from 'lucide-react';
import { Product, Customer, SalesInvoice, ProductUnit } from '../../types/database';
import { storage } from '../../lib/storage';
import { formatCurrency, formatQuantity, formatCustomerDisplayName } from '../../lib/formatters';
import { QuickAddCustomerModal } from './QuickAddCustomerModal';
import { InvoiceReceiptModal } from './InvoiceReceiptModal';
import { CustomerSearchSelectModal } from './CustomerSearchSelectModal';

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
  const [discountAmount, setDiscountAmount] = useState<string>('');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modals
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showCustomerSearchModal, setShowCustomerSearchModal] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<SalesInvoice | null>(null);
  const [mobilePosTab, setMobilePosTab] = useState<'products' | 'cart'>('products');

  // Searchable Customer Combobox State
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearchText, setCustomerSearchText] = useState('');
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const customerSearchInputRef = useRef<HTMLInputElement>(null);

  // Close customer dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autofocus customer search input when dropdown opens
  useEffect(() => {
    if (isCustomerDropdownOpen) {
      setTimeout(() => {
        customerSearchInputRef.current?.focus();
      }, 50);
    } else {
      setCustomerSearchText('');
    }
  }, [isCustomerDropdownOpen]);

  const handleSelectCustomer = (customer: Customer | null) => {
    if (customer) {
      setSelectedCustomerId(customer.id);
      setCustomCustomerName(customer.name);
    } else {
      setSelectedCustomerId('');
      setCustomCustomerName('عميل نقدي سريع');
    }
    setIsCustomerDropdownOpen(false);
    setCustomerSearchText('');
  };

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

  // Filter customers for POS customer search
  const filteredCustomers = customers.filter((c) => {
    if (!customerSearchText.trim()) return true;
    const q = customerSearchText.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.partner_name && c.partner_name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.village_or_address && c.village_or_address.toLowerCase().includes(q))
    );
  });

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

              <div className="flex items-center gap-2 shrink-0 px-3 py-2 bg-emerald-50 text-emerald-950 border border-emerald-300 rounded-xl font-bold text-xs sm:text-sm">
                <Store className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>محل البيع المباشر</span>
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

                        <div className="flex items-start gap-2.5">
                          {prod.image_url ? (
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                              <img
                                src={prod.image_url}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : null}

                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm sm:text-base font-black text-slate-900 line-clamp-1 leading-snug">
                              {prod.name}
                            </h4>

                            {prod.active_ingredient && (
                              <p className="text-xs sm:text-sm text-slate-500 line-clamp-1 mt-0.5 font-medium">
                                {prod.active_ingredient}
                              </p>
                            )}
                          </div>
                        </div>
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
          {/* Customer Header & Searchable Section */}
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
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomerSearchModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 hover:border-emerald-500/50 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  title="فتح نافذة بحث واختيار العملاء"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>بحث في العملاء</span>
                </button>

                <button
                  onClick={() => setShowAddCustomerModal(true)}
                  type="button"
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ عميل جديد</span>
                </button>
              </div>
            </div>

            {/* When a Customer is Selected */}
            {selectedCustomer ? (
              <div className="bg-slate-800/90 border-2 border-emerald-500/60 rounded-xl p-3 space-y-2.5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-sm sm:text-base text-white truncate">
                          {selectedCustomer.name}
                        </span>
                        {selectedCustomer.partner_name && (
                          <span className="text-[11px] text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded font-medium border border-amber-700/50">
                            شريك: {selectedCustomer.partner_name}
                          </span>
                        )}
                        {selectedCustomer.code && (
                          <span className="text-[11px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                            {selectedCustomer.code}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                        {selectedCustomer.phone && (
                          <span className="flex items-center gap-1 font-mono text-slate-300">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {selectedCustomer.phone}
                          </span>
                        )}
                        {selectedCustomer.village_or_address && (
                          <span className="flex items-center gap-1 text-slate-400 truncate">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{selectedCustomer.village_or_address}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowCustomerSearchModal(true)}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      title="تغيير العميل"
                    >
                      <Search className="w-3 h-3 text-emerald-400" />
                      <span>تغيير</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectCustomer(null)}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-700/60 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      title="الرجوع لعميل نقدي سريع"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>نقدي</span>
                    </button>
                  </div>
                </div>

                {/* Financial Debt Status Banner */}
                <div className="flex items-center justify-between text-xs sm:text-sm px-3 py-1.5 bg-slate-900/80 rounded-lg border border-slate-700/80">
                  <span className="text-slate-300 font-medium">المديونية السابقة المسجلة:</span>
                  <span
                    className={`font-black tabular-nums text-sm sm:text-base ${
                      selectedCustomer.current_balance > 0
                        ? 'text-amber-400'
                        : selectedCustomer.current_balance < 0
                        ? 'text-sky-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {selectedCustomer.current_balance > 0
                      ? `مديونية ${formatCurrency(selectedCustomer.current_balance)}`
                      : selectedCustomer.current_balance < 0
                      ? `له رصيد ${formatCurrency(Math.abs(selectedCustomer.current_balance))}`
                      : 'خالص (0.00 ج.م)'}
                  </span>
                </div>
              </div>
            ) : (
              /* When NO Customer is Selected (Direct Searchable Combobox) */
              <div className="space-y-2" ref={customerDropdownRef}>
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="absolute right-3.5 top-3 w-4 h-4 text-emerald-400 pointer-events-none" />
                    <input
                      ref={customerSearchInputRef}
                      type="text"
                      value={customerSearchText}
                      onChange={(e) => {
                        setCustomerSearchText(e.target.value);
                        if (!isCustomerDropdownOpen) setIsCustomerDropdownOpen(true);
                      }}
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                      placeholder="🔍 ابحث عن العميل بالاسم، الهاتف، الشريك، أو الكود..."
                      className="w-full pr-10 pl-24 py-2.5 text-xs sm:text-sm bg-slate-800 hover:bg-slate-750 focus:bg-slate-800 text-white placeholder-slate-400 border border-slate-700 focus:border-emerald-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/40 font-medium transition-colors"
                    />
                    <div className="absolute left-2 top-2 flex items-center gap-1">
                      {customerSearchText && (
                        <button
                          type="button"
                          onClick={() => setCustomerSearchText('')}
                          className="p-1 text-slate-400 hover:text-white rounded-md"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowCustomerSearchModal(true)}
                        className="px-2 py-1 bg-slate-700 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        title="بحث متقدم في العملاء"
                      >
                        دليل
                      </button>
                    </div>
                  </div>

                  {/* Autocomplete Dropdown List */}
                  {isCustomerDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* Cash Direct Quick Option */}
                      <div className="p-1.5 border-b border-slate-800 bg-slate-950/80">
                        <button
                          type="button"
                          onClick={() => handleSelectCustomer(null)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 text-white transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-emerald-200" />
                            <span>عميل نقدي مباشر (بدون حساب دائن / مدين)</span>
                          </div>
                          <Check className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Filtered Customers List */}
                      <div className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-800/60">
                        {filteredCustomers.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400 space-y-2">
                            <p>لا يوجد عملاء يطابقون: "{customerSearchText}"</p>
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomerDropdownOpen(false);
                                setShowAddCustomerModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>تسجيل عميل جديد بهذا الاسم</span>
                            </button>
                          </div>
                        ) : (
                          filteredCustomers.map((cust) => {
                            const isSelected = cust.id === selectedCustomerId;
                            const hasDebt = (cust.current_balance || 0) > 0;

                            return (
                              <div
                                key={cust.id}
                                onClick={() => handleSelectCustomer(cust)}
                                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-emerald-950/80 border border-emerald-500/50 text-white'
                                    : 'hover:bg-slate-800 text-slate-200'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs sm:text-sm text-white truncate">
                                      {cust.name}
                                    </span>
                                    {cust.partner_name && (
                                      <span className="text-[10px] text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded font-medium border border-amber-700/40 shrink-0">
                                        شريك: {cust.partner_name}
                                      </span>
                                    )}
                                    {cust.code && (
                                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded font-mono shrink-0">
                                        {cust.code}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                                    {cust.phone && (
                                      <span className="font-mono text-slate-300">
                                        📞 {cust.phone}
                                      </span>
                                    )}
                                    {cust.village_or_address && (
                                      <span className="truncate">
                                        📍 {cust.village_or_address}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 text-left mr-2">
                                  <div className="text-right">
                                    <span className="text-[10px] text-slate-400 block">الرصيد:</span>
                                    <span
                                      className={`text-xs font-mono font-bold ${
                                        hasDebt ? 'text-amber-400' : 'text-emerald-400'
                                      }`}
                                    >
                                      {cust.current_balance ? cust.current_balance.toFixed(2) : '0.00'} ج.م
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    className="px-2 py-1 bg-slate-700 hover:bg-emerald-600 text-slate-200 hover:text-white rounded-lg text-[11px] font-bold"
                                  >
                                    اختيار
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Dropdown Footer */}
                      <div className="p-2 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                        <span>المطابق: {filteredCustomers.length} عميل</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomerDropdownOpen(false);
                            setShowCustomerSearchModal(true);
                          }}
                          className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Search className="w-3 h-3" />
                          <span>فتح البحث المتقدم الشامل</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Info bar below search input */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Store className="w-3 h-3" />
                    <span>محدد حالياً: عميل نقدي سريع</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCustomerSearchModal(true)}
                    className="text-slate-300 hover:text-white underline cursor-pointer"
                  >
                    استعراض دليل العملاء بالكامل
                  </button>
                </div>
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
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      {item.product.image_url ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white border border-slate-200">
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : null}

                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-slate-900 leading-normal text-sm truncate">{item.product.name}</h5>
                        {/* Multi-unit Conversion Explanation */}
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
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
                        step="any"
                        min="0.001"
                        inputMode="decimal"
                        value={item.qty === 0 ? '' : item.qty}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateCartItemQty(idx, e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                        className="w-14 text-center text-xs font-bold tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded"
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
                step="any"
                inputMode="decimal"
                value={discountAmount}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-full py-1.5 px-3 text-sm tabular-nums font-semibold bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {paymentType === 'partial' && (
              <div>
                <label className="text-xs text-slate-600 block mb-1">المبلغ المدفوع الآن</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={paidAmountInput}
                  onFocus={(e) => e.target.select()}
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
          setIsCustomerDropdownOpen(false);
        }}
      />

      <CustomerSearchSelectModal
        isOpen={showCustomerSearchModal}
        onClose={() => setShowCustomerSearchModal(false)}
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        onSelectCustomer={handleSelectCustomer}
        onOpenAddNewCustomer={() => setShowAddCustomerModal(true)}
      />

      <InvoiceReceiptModal
        invoice={completedInvoice}
        onClose={() => setCompletedInvoice(null)}
      />
    </div>
  );
};
