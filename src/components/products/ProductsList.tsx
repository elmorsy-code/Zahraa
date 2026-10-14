import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Plus,
  Pill,
  Edit,
  Trash2,
  Check,
  X,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  FlaskConical,
  Scale,
  Coins,
  Eye,
} from 'lucide-react';
import { Product } from '../../types/database';
import { storage } from '../../lib/storage';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { authService } from '../../lib/auth';

export const ProductsList: React.FC = () => {
  const isAdmin = authService.canModify(authService.getCurrentUser()?.role);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields as requested by user (100% clean, no hardcoded suggestions or fabricated categories)
  const [imageUrl, setImageUrl] = useState('');
  const [medicineName, setMedicineName] = useState('');
  const [activeIngredient, setActiveIngredient] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [weightValue, setWeightValue] = useState('');
  const [weightUnit, setWeightUnit] = useState('جرام');
  const [salePrice, setSalePrice] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // Preview Image Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
    const unsub = storage.subscribe(loadProducts);
    return () => unsub();
  }, []);

  const loadProducts = () => {
    setProducts(storage.getProducts());
  };

  // Only categories that the user has actually saved in products
  const userCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      const c = (p.category_name || p.category?.name || '').trim();
      if (c) cats.add(c);
    });
    return Array.from(cats);
  }, [products]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setImageUrl('');
    setMedicineName('');
    setActiveIngredient('');
    setCategoryName('');
    setWeightValue('');
    setWeightUnit('جرام');
    setSalePrice('');
    setNotes('');
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setImageUrl(p.image_url || '');
    setMedicineName(p.name);
    setActiveIngredient(p.active_ingredient || '');
    setCategoryName(p.category_name || p.category?.name || '');

    // Parse weight if stored as e.g. "250 جرام" or "500 مل"
    const rawWeight = p.weight_or_size || '';
    const match = rawWeight.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
    if (match) {
      setWeightValue(match[1]);
      setWeightUnit(match[2] || 'جرام');
    } else {
      setWeightValue(rawWeight);
      setWeightUnit('جرام');
    }

    setSalePrice(p.default_sale_price ? String(p.default_sale_price) : '');
    setNotes(p.description || '');
    setError('');
    setModalOpen(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setError('حجم الصورة كبير، يفضل اختيار صورة أقل من 3 ميجابايت');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setImageUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineName.trim()) {
      setError('يرجى كتابة اسم الدواء');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Assemble weight string
      let finalWeight = weightValue.trim();
      if (finalWeight && weightUnit) {
        if (!finalWeight.includes(weightUnit)) {
          finalWeight = `${finalWeight} ${weightUnit}`.trim();
        }
      }

      const numericPrice = parseFloat(salePrice) || 0;

      if (editingProduct) {
        await storage.saveProduct({
          ...editingProduct,
          name: medicineName.trim(),
          image_url: imageUrl.trim() || undefined,
          active_ingredient: activeIngredient.trim() || undefined,
          category_name: categoryName.trim() || undefined,
          weight_or_size: finalWeight || undefined,
          default_sale_price: numericPrice,
          base_unit_name: weightUnit || 'جرام',
          description: notes.trim() || undefined,
        });
      } else {
        await storage.saveProduct({
          name: medicineName.trim(),
          image_url: imageUrl.trim() || undefined,
          active_ingredient: activeIngredient.trim() || undefined,
          category_name: categoryName.trim() || undefined,
          weight_or_size: finalWeight || undefined,
          default_sale_price: numericPrice,
          base_unit_name: weightUnit || 'جرام',
          description: notes.trim() || undefined,
        });
      }

      setModalOpen(false);
      loadProducts();
    } catch (err: any) {
      setError(err?.message || 'فشل حفظ بيانات الدواء');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async (): Promise<{ success: boolean; error?: string }> => {
    if (!deleteTarget) return { success: false, error: 'لم يتم تحديد الدواء' };
    try {
      await storage.deleteProduct(deleteTarget.id);
      loadProducts();
      setDeleteTarget(null);
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err?.message || 'فشل حذف اسم الدواء' };
    }
  };

  // Filter products by search and user-defined category
  const filtered = products.filter((p) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.active_ingredient && p.active_ingredient.toLowerCase().includes(q)) ||
      (p.category_name && p.category_name.toLowerCase().includes(q)) ||
      (p.weight_or_size && p.weight_or_size.toLowerCase().includes(q)) ||
      p.code.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (selectedCategoryFilter !== 'all') {
      const cat = (p.category_name || p.category?.name || '').trim();
      return cat === selectedCategoryFilter;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-600 text-white rounded-2xl shadow-sm">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              دليل الأدوية والأصناف
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              إضافة صورة الدواء واسمه والمادة الفعالة وتصنيفه ووزنه وسعره
            </p>
          </div>
        </div>

        {isAdmin ? (
          <button
            onClick={handleOpenAdd}
            type="button"
            className="flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-black text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md cursor-pointer transition-all active:scale-95 self-start sm:self-auto"
          >
            <Plus className="w-5 h-5 text-white" />
            <span>إضافة دواء جديد</span>
          </button>
        ) : (
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 self-start sm:self-auto">
            حساب مشرف (قراءة ومتابعة فقط)
          </span>
        )}
      </div>

      {/* 2. Search & Category Filters (Categories dynamically from user data only) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الدواء، المادة الفعالة، التصنيف، أو الوزن..."
              className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-xl bg-teal-50 text-teal-900 border border-teal-200 font-bold text-xs sm:text-sm">
              إجمالي الأدوية: <span className="font-black font-mono">{filtered.length}</span> من أصل {products.length}
            </span>
          </div>
        </div>

        {/* Dynamic Category Filter ONLY if user has entered categories */}
        {userCategories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              type="button"
              className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
                selectedCategoryFilter === 'all'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              جميع التصنيفات
            </button>
            {userCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                type="button"
                className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
                  selectedCategoryFilter === cat
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Medicines Cards Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <Pill className="w-12 h-12 mx-auto stroke-1 text-slate-300" />
            <p className="text-base font-bold text-slate-700">لا توجد أدوية مضافة حالياً</p>
            <p className="text-xs text-slate-400">انقر على زر "إضافة دواء جديد" لإضافة الأدوية بالاسم والصورة والسعر والوزن</p>
            <button
              onClick={handleOpenAdd}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة أول دواء</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-5">
            {filtered.map((prod) => (
              <div
                key={prod.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-teal-400/80 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                {/* Top Section with Image and Basic Info */}
                <div className="p-4 sm:p-4.5 space-y-3">
                  <div className="flex items-start gap-3.5">
                    {/* Medicine Image / Thumbnail */}
                    <div
                      onClick={() => prod.image_url && setPreviewImage(prod.image_url)}
                      className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center bg-slate-50 relative group/img ${
                        prod.image_url ? 'cursor-pointer hover:opacity-90' : ''
                      }`}
                    >
                      {prod.image_url ? (
                        <>
                          <img
                            src={prod.image_url}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye className="w-4 h-4" />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-teal-600">
                          <Pill className="w-8 h-8" />
                          <span className="text-[9px] font-bold text-slate-400 mt-1">بدون صورة</span>
                        </div>
                      )}
                    </div>

                    {/* Titles & Category */}
                    <div className="flex-1 min-w-0">
                      {prod.category_name && (
                        <div className="mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 line-clamp-1 inline-block">
                            {prod.category_name}
                          </span>
                        </div>
                      )}

                      <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug line-clamp-2">
                        {prod.name}
                      </h3>

                      {/* Active Ingredient (المادة الفعالة) */}
                      {prod.active_ingredient && (
                        <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-bold mt-1 bg-indigo-50/70 px-2 py-0.5 rounded-lg w-fit">
                          <FlaskConical className="w-3.5 h-3.5 shrink-0" />
                          <span className="line-clamp-1">المادة الفعالة: {prod.active_ingredient}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Weight / Size and Price Badges */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    {/* Weight (وزنه) */}
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold mb-0.5">
                        <Scale className="w-3 h-3 text-slate-400" />
                        <span>الوزن / الحجم:</span>
                      </div>
                      <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        {prod.weight_or_size || 'غير محدد'}
                      </div>
                    </div>

                    {/* Price (سعره) */}
                    <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold mb-0.5">
                        <Coins className="w-3 h-3 text-emerald-600" />
                        <span>السعر:</span>
                      </div>
                      <div className="font-black text-emerald-900 text-xs sm:text-sm tabular-nums">
                        {prod.default_sale_price ? formatCurrency(prod.default_sale_price) : 'غير مسعر'}
                      </div>
                    </div>
                  </div>

                  {/* Description / Notes if any */}
                  {prod.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 pt-1 font-medium">
                      {prod.description}
                    </p>
                  )}
                </div>

                {/* Bottom Actions Bar */}
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {prod.created_at ? formatDate(prod.created_at) : ''}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isAdmin && (
                      <button
                        onClick={() => handleOpenEdit(prod)}
                        type="button"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-teal-800 bg-teal-100/70 hover:bg-teal-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => setDeleteTarget(prod)}
                        type="button"
                        className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف الدواء"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Clean Add / Edit Medicine Modal (NO made-up suggestions or preset categories) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 bg-gradient-to-r from-teal-800 to-teal-950 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-500/20 border border-teal-400/30 rounded-xl text-teal-300">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">
                    {editingProduct ? 'تعديل بيانات الدواء' : 'إضافة دواء جديد'}
                  </h3>
                  <p className="text-[11px] text-teal-200/80">
                    صورة الدواء، اسم الدواء، المادة الفعالة، التصنيف، الوزن والسعر
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                type="button"
                className="p-1.5 text-teal-200 hover:text-white rounded-xl hover:bg-teal-800/80 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveMedicine} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {error && (
                <div className="p-3 text-rose-700 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-bold">{error}</span>
                </div>
              )}

              {/* 1. صورة الدواء (Medicine Image) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="block text-xs font-black text-slate-900">
                  1. صورة الدواء (اختياري)
                </label>
                <div className="flex items-center gap-4">
                  {/* Image Preview Box */}
                  <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 relative group">
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          alt="معاينة الدواء"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          className="absolute inset-0 bg-rose-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="حذف الصورة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>رفع صورة من الجهاز</span>
                      </button>

                      {imageUrl && (
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-xs cursor-pointer"
                        >
                          مسح الصورة
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={imageUrl.startsWith('data:') ? '' : imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="أو الصق رابط صورة مباشرة..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* 2. اسم الدواء (Medicine Name) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-900">
                  2. اسم الدواء <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={medicineName}
                  onChange={(e) => setMedicineName(e.target.value)}
                  placeholder="اكتب اسم الدواء..."
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white"
                />
              </div>

              {/* 3. المادة الفعالة (Active Ingredient) - Pure user input, no presets */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-900">
                  3. المادة الفعالة (اختياري)
                </label>
                <input
                  type="text"
                  value={activeIngredient}
                  onChange={(e) => setActiveIngredient(e.target.value)}
                  placeholder="اكتب المادة الفعالة والتركيز..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white"
                />
              </div>

              {/* 4. تصنيف الدواء (Classification) - Pure user input, no presets */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-900">
                  4. تصنيف الدواء (اختياري)
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="اكتب تصنيف الدواء..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white"
                />
              </div>

              {/* 5. وزن الدواء وسعره (Weight & Price) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 5. وزنه (Weight / Size) - With user's explicit requested units */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-900">
                    5. وزنه أو حجمه
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={weightValue}
                      onChange={(e) => setWeightValue(e.target.value)}
                      placeholder="الوزن أو الحجم"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white"
                    />

                    {/* Unit Selector strictly for the user's units */}
                    <select
                      value={weightUnit}
                      onChange={(e) => setWeightUnit(e.target.value)}
                      className="px-2.5 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-black text-slate-800 focus:outline-none cursor-pointer shrink-0"
                    >
                      <option value="جرام">جرام</option>
                      <option value="مل">مل</option>
                      <option value="كيس">كيس</option>
                      <option value="زجاجة">زجاجة</option>
                    </select>
                  </div>
                </div>

                {/* 6. سعره (Price) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-900">
                    6. سعر البيع (ج.م)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full pr-3.5 pl-12 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 tabular-nums focus:outline-none focus:border-teal-500 focus:bg-white"
                    />
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                      ج.م
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes / Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700">
                  ملاحظات إضافية (اختياري)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات حول الدواء أو استخدامه..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setModalOpen(false)}
                  type="button"
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={loading || !medicineName.trim()}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-black text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl shadow-md cursor-pointer transition-transform active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>{loading ? 'جارٍ الحفظ...' : editingProduct ? 'تحديث الدواء' : 'حفظ الدواء'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Delete Confirm Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="تأكيد حذف اسم الدواء"
        itemName={deleteTarget?.name}
        description="سيتم حذف هذا الدواء وكافة بياناته من قائمة الأصناف المتاحة."
      />

      {/* 6. Preview Image Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs cursor-pointer animate-in fade-in"
        >
          <div className="max-w-md max-h-[85vh] bg-white rounded-2xl overflow-hidden p-2 shadow-2xl">
            <img
              src={previewImage}
              alt="صورة مكبرة"
              className="w-full h-auto max-h-[75vh] object-contain rounded-xl"
            />
            <div className="text-center py-2 text-xs font-bold text-slate-700">
              انقر في أي مكان للإغلاق
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
