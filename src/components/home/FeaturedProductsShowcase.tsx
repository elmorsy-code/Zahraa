import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  FlaskConical,
  Droplets,
  Wheat,
  Sprout,
  ShieldCheck,
  Package,
  Layers,
  ArrowLeft,
  Info,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  Barcode,
  Building,
  Sparkles,
  Database,
  SlidersHorizontal,
} from 'lucide-react';
import { storage } from '../../lib/storage';
import { Product, ProductCategory } from '../../types/database';

interface FeaturedProductsShowcaseProps {
  onNavigate?: (tab: string) => void;
}

export const FeaturedProductsShowcase: React.FC<FeaturedProductsShowcaseProps> = ({ onNavigate }) => {
  const [products, setProducts] = useState<Product[]>(() => storage.getProducts());
  const [categories, setCategories] = useState<ProductCategory[]>(() => storage.getCategories());
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectProduct, setInspectProduct] = useState<Product | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setProducts([...storage.getProducts()]);
      setCategories([...storage.getCategories()]);
    };
    return storage.subscribe(handleUpdate);
  }, []);

  // Filter products by category and search query
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCatId !== 'all') {
        const matchesId = p.category_id === selectedCatId;
        const catObj = categories.find((c) => c.id === selectedCatId);
        const matchesName = catObj && p.category_name && p.category_name.includes(catObj.name);
        if (!matchesId && !matchesName) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const inName = (p.name || '').toLowerCase().includes(q);
        const inCommercial = (p.commercial_name || '').toLowerCase().includes(q);
        const inActive = (p.active_ingredient || '').toLowerCase().includes(q);
        const inManufacturer = (p.manufacturer || '').toLowerCase().includes(q);
        const inCode = (p.code || '').toLowerCase().includes(q);
        const inBarcode = (p.barcode || '').toLowerCase().includes(q);
        if (!inName && !inCommercial && !inActive && !inManufacturer && !inCode && !inBarcode) {
          return false;
        }
      }

      return true;
    });
  }, [products, categories, selectedCatId, searchQuery]);

  // Icon helper based on category
  const getCategoryIcon = (p: Product) => {
    if (p.is_pesticide || p.category_name?.includes('مبيد')) return FlaskConical;
    if (p.category_name?.includes('سماد') || p.category_name?.includes('مغذ') || p.name.includes('NPK')) return Droplets;
    if (p.category_name?.includes('بذور') || p.category_name?.includes('تقاوي') || p.name.includes('بذور')) return Wheat;
    return Sprout;
  };

  const getCategoryTheme = (p: Product) => {
    if (p.is_pesticide || p.category_name?.includes('مبيد')) {
      return {
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
        iconBg: 'bg-rose-100 text-rose-700',
        accentBorder: 'hover:border-rose-300',
      };
    }
    if (p.category_name?.includes('سماد') || p.category_name?.includes('مغذ') || p.name.includes('NPK')) {
      return {
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
        iconBg: 'bg-blue-100 text-blue-700',
        accentBorder: 'hover:border-blue-300',
      };
    }
    if (p.category_name?.includes('بذور') || p.category_name?.includes('تقاوي') || p.name.includes('بذور')) {
      return {
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
        iconBg: 'bg-amber-100 text-amber-800',
        accentBorder: 'hover:border-amber-300',
      };
    }
    return {
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconBg: 'bg-emerald-100 text-emerald-700',
      accentBorder: 'hover:border-emerald-300',
    };
  };

  return (
    <section className="space-y-6 sm:space-y-8" aria-label="معرض مستلزمات الصيدلية الزراعية الحية">
      {/* 1. Header & Live Database Indicators */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-l from-slate-900 via-slate-900 to-emerald-950 text-white shadow-xl border border-emerald-900/40 relative overflow-hidden">
        <div className="space-y-2 relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-black">
            <Database className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>بيانات حية ومباشرة من قاعدة بيانات المحل والمخازن</span>
          </div>
          <h2 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
            معرض الأدوية الزراعية والأسمدة والبذور
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
            استعرض كافة الأصناف المسجلة، المواد الفعالة، أسعار التوريد والبيع، وحالة المخزون المتوفرة حالياً في محل البيع والمستودعات.
          </p>
        </div>

        {/* Quick Link to POS / Invoices */}
        <div className="relative z-10 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate?.('products')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-sm"
          >
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            <span>إدارة وتعديل الأصناف</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('invoices')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md"
          >
            <span>إصدار فاتورة بيع</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Search & Category Filters Bar */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute right-4 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم التجاري، المادة الفعالة، الشركة المنتجة، أو كود الصنف..."
            className="w-full pr-12 pl-10 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3.5 top-3.5 p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCatId('all')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all cursor-pointer ${
              selectedCatId === 'all'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>كافة الأصناف</span>
            <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] mr-1">
              {products.length}
            </span>
          </button>

          {categories.map((cat) => {
            const count = products.filter(
              (p) => p.category_id === cat.id || (p.category_name && p.category_name.includes(cat.name))
            ).length;
            const isSelected = selectedCatId === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCatId(cat.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] mr-1 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
          <div className="inline-flex p-4 rounded-full bg-slate-100 text-slate-400">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-800">لا توجد أصناف مطابقة للبحث</h3>
          <p className="text-xs text-slate-500 font-bold max-w-md mx-auto">
            تأكد من كتابة الاسم بصورة صحيحة أو قم باختيار تصنيف مختلف لمعاينة المنتجات المتاحة.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCatId('all');
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
          >
            إعادة تعيين الفلاتر
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredProducts.map((product) => {
            const Icon = getCategoryIcon(product);
            const theme = getCategoryTheme(product);
            const inStock = (product.total_stock || 0) > 0;

            return (
              <div
                key={product.id}
                className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group ${theme.accentBorder}`}
              >
                {/* Card Top: Category Badge & Stock Alert */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black border ${theme.badgeBg}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[130px]">
                        {product.category_name || (product.is_pesticide ? 'مبيد زراعي' : 'مستلزم زراعي')}
                      </span>
                    </span>

                    {/* Stock status badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        inStock
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {inStock ? `متوفر: ${product.total_stock}` : 'طلب توريد'}
                    </span>
                  </div>

                  {/* Product Title & Commercial Name */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-black text-slate-400">
                        {product.code}
                      </span>
                      {product.weight_or_size && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {product.weight_or_size}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
                      {product.name}
                    </h3>
                    {product.commercial_name && (
                      <p className="text-xs font-semibold text-slate-500 truncate" dir="ltr">
                        {product.commercial_name}
                      </p>
                    )}
                  </div>

                  {/* Active Ingredient & Manufacturer */}
                  <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-1.5 text-xs">
                    {product.active_ingredient && (
                      <div className="flex items-start gap-1.5 text-slate-700">
                        <FlaskConical className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="font-bold line-clamp-1 text-[11px]">
                          المادة: {product.active_ingredient}
                        </span>
                      </div>
                    )}
                    {product.manufacturer && (
                      <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-semibold">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{product.manufacturer}</span>
                      </div>
                    )}
                  </div>

                  {/* Stock Distribution Details */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
                    <span>بالمحل: {product.stock_shop || 0}</span>
                    <span>المخزن: {product.stock_warehouse || 0}</span>
                    <span className="text-slate-400">({product.base_unit_name || 'عبوة'})</span>
                  </div>
                </div>

                {/* Card Bottom: Price & Action CTA */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400">سعر البيع المعتمد</span>
                    <div className="text-lg font-black text-slate-900 font-mono">
                      {Number(product.default_sale_price).toLocaleString('ar-EG')}{' '}
                      <span className="text-xs font-sans text-emerald-700">ج.م</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Technical details view */}
                    <button
                      type="button"
                      onClick={() => setInspectProduct(product)}
                      title="عرض البطاقة الفنية والجرعة"
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    {/* Quick invoice button */}
                    <button
                      type="button"
                      onClick={() => onNavigate?.('invoices')}
                      title="إصدار فاتورة بيع بهذا الصنف"
                      className="p-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Technical Details Inspection Modal */}
      {inspectProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          dir="rtl"
        >
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                  بطاقة الصنف الفنية والمطابقة الزراعية
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  {inspectProduct.name}
                </h3>
                {inspectProduct.commercial_name && (
                  <p className="text-xs font-semibold text-slate-500" dir="ltr">
                    {inspectProduct.commercial_name}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setInspectProduct(null)}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Technical Specifications Grid */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="block text-[11px] font-bold text-slate-400">المادة الفعالة والتركيز</span>
                  <span className="font-black text-slate-900 mt-0.5 block">
                    {inspectProduct.active_ingredient || 'غير محدد'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="block text-[11px] font-bold text-slate-400">الشركة المنتجة / المستورد</span>
                  <span className="font-black text-slate-900 mt-0.5 block">
                    {inspectProduct.manufacturer || 'الشركة المعتمدة'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="block text-[11px] font-bold text-slate-400">كود الصنف والباركود</span>
                  <span className="font-black font-mono text-slate-900 mt-0.5 block">
                    {inspectProduct.code} · {inspectProduct.barcode || 'لا يوجد باركود'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="block text-[11px] font-bold text-slate-400">حجم العبوة والوحدة</span>
                  <span className="font-black text-slate-900 mt-0.5 block">
                    {inspectProduct.weight_or_size || inspectProduct.base_unit_name || 'عبوة'}
                  </span>
                </div>
              </div>

              {/* Description & Technical Use */}
              {inspectProduct.description && (
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-950 space-y-1.5 leading-relaxed font-semibold">
                  <div className="flex items-center gap-1.5 font-black text-emerald-900">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                    <span>إرشادات الاستخدام والتأثير الزراعي:</span>
                  </div>
                  <p>{inspectProduct.description}</p>
                </div>
              )}

              {/* Stock Balances in Stores */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-slate-600" />
                  <span>توزيع الأرصدة الحالية في الفروع والمخازن:</span>
                </span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white border border-slate-200">
                    <span className="block text-[10px] font-bold text-slate-400">محل البيع</span>
                    <span className="font-black text-emerald-700 text-sm">
                      {inspectProduct.stock_shop || 0}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200">
                    <span className="block text-[10px] font-bold text-slate-400">المستودع الرئيسي</span>
                    <span className="font-black text-emerald-700 text-sm">
                      {inspectProduct.stock_warehouse || 0}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200">
                    <span className="block text-[10px] font-bold text-slate-400">إجمالي الرصيد</span>
                    <span className="font-black text-slate-900 text-sm">
                      {inspectProduct.total_stock || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectProduct(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => {
                  setInspectProduct(null);
                  onNavigate?.('invoices');
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>إصدار فاتورة بالصنف</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
