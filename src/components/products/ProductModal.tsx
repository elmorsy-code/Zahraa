import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, PackagePlus, AlertCircle, Sparkles, Tag, Scale, Image as ImageIcon, Upload, Link as LinkIcon, Warehouse as WarehouseIcon } from 'lucide-react';
import { Product, ProductUnit } from '../../types/database';
import { storage } from '../../lib/storage';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  onSaved: (product: Product) => void;
}

const COMMON_BASE_UNITS = [
  'جرام',
  'كجم',
  'كيلوجرام',
  'مل',
  'لتر',
  'سنتيمتر مكعب',
  'قرص',
  'حبة',
  'أمبول',
  'كيس',
  'عبوة',
  'شيكارة',
  'زجاجة',
  'لتر / مل',
];

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onSaved,
}) => {
  const categories = storage.getCategories();

  const [code, setCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [commercialName, setCommercialName] = useState('');
  const [activeIngredient, setActiveIngredient] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [description, setDescription] = useState('');
  const [baseUnitName, setBaseUnitName] = useState('جرام');
  const [defaultPurchasePrice, setDefaultPurchasePrice] = useState('');
  const [defaultSalePrice, setDefaultSalePrice] = useState('');
  const [initialStockShop, setInitialStockShop] = useState('');
  const [initialStockWarehouse, setInitialStockWarehouse] = useState('');
  const [minStockAlert, setMinStockAlert] = useState('');
  const [isPesticide, setIsPesticide] = useState(false);
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [units, setUnits] = useState<Array<Partial<ProductUnit>>>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
      return;
    }

    // Read and compress image to reasonable dimensions for fast instant loading
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setImageUrl(dataUrl);
        } else {
          setImageUrl(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    let isMounted = true;
    if (productToEdit) {
      setCode(productToEdit.code || '');
      setBarcode(productToEdit.barcode || '');
      setName(productToEdit.name || '');
      setImageUrl(productToEdit.image_url || '');
      setCommercialName(productToEdit.commercial_name || '');
      setActiveIngredient(productToEdit.active_ingredient || '');
      setManufacturer(productToEdit.manufacturer || '');
      setCategoryId(productToEdit.category_id || categories[0]?.id || '');
      const existingCat = categories.find((c) => c.id === productToEdit.category_id);
      setCategoryNameInput(existingCat?.name || productToEdit.category?.name || '');
      setDescription(productToEdit.description || '');
      setBaseUnitName(productToEdit.base_unit_name || 'جرام');
      setDefaultPurchasePrice(productToEdit.default_purchase_price ? productToEdit.default_purchase_price.toString() : '');
      setDefaultSalePrice(productToEdit.default_sale_price ? productToEdit.default_sale_price.toString() : '');
      setMinStockAlert(productToEdit.min_stock_alert ? productToEdit.min_stock_alert.toString() : '');
      setIsPesticide(productToEdit.is_pesticide || false);
      setRequiresPrescription(productToEdit.requires_prescription || false);
      setUnits(productToEdit.units || []);
    } else {
      setCode('');
      setBarcode('');
      setName('');
      setImageUrl('');
      setCommercialName('');
      setActiveIngredient('');
      setManufacturer('');
      const defaultCat = categories[0];
      setCategoryId(defaultCat?.id || '');
      setCategoryNameInput(defaultCat?.name || 'مبيدات فطرية وحشرية');
      setDescription('');
      setBaseUnitName('جرام');
      setDefaultPurchasePrice('');
      setDefaultSalePrice('');
      setInitialStockShop('');
      setInitialStockWarehouse('');
      setMinStockAlert('');
      setIsPesticide(false);
      setRequiresPrescription(false);
      // Initialize with clean base unit
      setUnits([
        {
          unit_name: 'جرام (الوحدة الأساسية)',
          conversion_factor: 1,
          sale_price: undefined,
          purchase_price: undefined,
          is_base_unit: true,
          is_default_sale: true,
        },
      ]);
      storage.getNextDocNumber('PRD').then((nextCode) => {
        if (isMounted) setCode(nextCode);
      });
    }
    setError('');
    return () => {
      isMounted = false;
    };
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddUnit = () => {
    setUnits([
      ...units,
      {
        unit_name: '',
        conversion_factor: 1,
        sale_price: undefined,
        purchase_price: undefined,
        is_base_unit: false,
      },
    ]);
  };

  const handleRemoveUnit = (idx: number) => {
    if (units.length <= 1) {
      setError('يجب الإبقاء على وحدة بيع واحدة على الأقل');
      return;
    }
    setUnits(units.filter((_, i) => i !== idx));
  };

  const handleUnitChange = (idx: number, field: keyof ProductUnit, val: any) => {
    const updated = [...units];
    updated[idx] = { ...updated[idx], [field]: val };
    setUnits(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('اسم المنتج مطلوب');
      return;
    }
    if (units.length === 0) {
      setError('يجب تحديد وحدة بيع واحدة على الأقل');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // 1. Resolve or create category if user typed a custom/new category name
      let finalCategoryId = categoryId;
      const trimmedCatName = categoryNameInput.trim();
      if (trimmedCatName) {
        const found = categories.find((c) => c.name.trim().toLowerCase() === trimmedCatName.toLowerCase());
        if (found) {
          finalCategoryId = found.id;
        } else {
          // Auto create new category on the fly so the user can type any custom category
          const newCat = await storage.saveCategory({
            name: trimmedCatName,
            description: 'تم إنشاؤها تلقائياً عند تعريف الصنف',
          });
          finalCategoryId = newCat.id;
        }
      }

      const cleanBaseUnit = baseUnitName.trim() || 'جرام';

      const sanitizedUnits: ProductUnit[] = units.map((u, i) => ({
        id: u.id || `u-${Date.now()}-${i}`,
        product_id: productToEdit?.id || '',
        unit_name: u.unit_name?.trim() || `${cleanBaseUnit}`,
        conversion_factor: Math.max(0.0001, Number(u.conversion_factor) || 1),
        sale_price: Math.max(0, Number(u.sale_price) || 0),
        purchase_price: Math.max(0, Number(u.purchase_price) || 0),
        barcode: u.barcode || '',
        is_base_unit: u.is_base_unit || i === 0,
        is_default_sale: u.is_default_sale || i === 0,
      }));

      // Determine default sale & purchase prices automatically from units so it never stays 0 if unit has a price
      const defaultUnit = sanitizedUnits.find((u) => u.is_default_sale) || sanitizedUnits[0];
      const autoSalePrice = defaultUnit ? defaultUnit.sale_price : parseFloat(defaultSalePrice) || 0;
      const autoPurchasePrice = defaultUnit ? defaultUnit.purchase_price : parseFloat(defaultPurchasePrice) || 0;

      const saved = await storage.saveProduct({
        id: productToEdit?.id,
        code: code.trim(),
        barcode: barcode.trim(),
        name: name.trim(),
        image_url: imageUrl.trim() || undefined,
        commercial_name: commercialName.trim(),
        active_ingredient: activeIngredient.trim(),
        manufacturer: manufacturer.trim(),
        category_id: finalCategoryId || undefined,
        description: description.trim(),
        base_unit_name: cleanBaseUnit,
        default_purchase_price: autoPurchasePrice,
        default_sale_price: autoSalePrice,
        min_stock_alert: parseFloat(minStockAlert) || 10,
        is_pesticide: isPesticide,
        requires_prescription: requiresPrescription,
        units: sanitizedUnits,
        initial_stock_shop: parseFloat(initialStockShop) || 0,
        initial_stock_warehouse: parseFloat(initialStockWarehouse) || 0,
      } as any);

      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ المنتج');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 my-8">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">
              {productToEdit ? 'تعديل بيانات المنتج والوحدات' : 'إضافة منتج زراعي جديد'}
            </h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-3 text-rose-700 bg-rose-50 border border-rose-200 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Image Section */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span>صورة الصنف</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Image Preview Box */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 group shadow-2xs">
                {imageUrl ? (
                  <>
                    <img
                      src={imageUrl}
                      alt="معاينة الصنف"
                      className="w-full h-full object-cover"
                      onError={() => {
                        // fallback if URL broken
                        setImageUrl('');
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrl('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute inset-0 bg-slate-900/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold text-[11px]"
                    >
                      <Trash2 className="w-4 h-4 mb-1 text-rose-400" />
                      <span>حذف الصورة</span>
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 text-center p-2">
                    <ImageIcon className="w-8 h-8 mb-1 stroke-1 text-slate-300" />
                    <span className="text-[10px] font-medium">لا توجد صورة</span>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2.5 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                    id="product-image-upload"
                  />
                  <label
                    htmlFor="product-image-upload"
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl cursor-pointer transition-colors shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع صورة من الجهاز / الكاميرا</span>
                  </label>

                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrl('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors"
                    >
                      إزالة الصورة
                    </button>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <LinkIcon className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="url"
                    value={imageUrl.startsWith('data:') ? '' : imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-full pr-8 pl-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-left"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Core Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                اسم المنتج العلمي / التجاري <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                الاسم التجاري الشائع
              </label>
              <input
                type="text"
                value={commercialName}
                onChange={(e) => setCommercialName(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                المادة الفعالة والتركيز
              </label>
              <input
                type="text"
                value={activeIngredient}
                onChange={(e) => setActiveIngredient(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                الشركة المنتجة / المستورد
              </label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>التصنيف</span>
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="categories-datalist"
                  value={categoryNameInput}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCategoryNameInput(val);
                    const matched = categories.find((c) => c.name.trim().toLowerCase() === val.trim().toLowerCase());
                    if (matched) {
                      setCategoryId(matched.id);
                    } else {
                      setCategoryId('');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
                />
                <datalist id="categories-datalist">
                  {categories.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                الوحدة الأساسية للمخزون <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="base-units-datalist"
                  required
                  value={baseUnitName}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setBaseUnitName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800"
                />
                <datalist id="base-units-datalist">
                  {COMMON_BASE_UNITS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                كود الصنف
              </label>
              <input
                type="text"
                value={code}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                الباركود
              </label>
              <input
                type="text"
                value={barcode}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                حد التنبيه عند نقص المخزون (بالوحدة الأساسية)
              </label>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={minStockAlert}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setMinStockAlert(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* رصيد أول المدة الافتتاحي للصنف الجديد */}
            {!productToEdit && (
              <>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    رصيد المحل الافتتاحي ({baseUnitName})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    inputMode="decimal"
                    value={initialStockShop}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setInitialStockShop(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    رصيد المخزن الافتتاحي ({baseUnitName})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    inputMode="decimal"
                    value={initialStockWarehouse}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setInitialStockWarehouse(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 text-slate-800"
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-4 pt-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPesticide}
                  onChange={(e) => setIsPesticide(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold text-slate-700">مبيد حشري / فطري</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresPrescription}
                  onChange={(e) => setRequiresPrescription(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold text-slate-700">يتطلب إرشاد فني</span>
              </label>
            </div>
          </div>

          {/* Multi-unit Conversion Definition Table */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-slate-900 text-sm">
                وحدات البيع والأسعار
              </h4>

              <button
                type="button"
                onClick={handleAddUnit}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة وحدة بيع</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="p-2">اسم الوحدة</th>
                    <th className="p-2">معامل التحويل (كم {baseUnitName})</th>
                    <th className="p-2">سعر الشراء (ج.م)</th>
                    <th className="p-2">سعر البيع (ج.م)</th>
                    <th className="p-2 text-center">افتراضية للبيع</th>
                    <th className="p-2 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {units.map((unit, idx) => (
                    <tr key={idx} className="bg-white hover:bg-slate-50/50">
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          value={unit.unit_name || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUnitChange(idx, 'unit_name', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-medium"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="number"
                          step="any"
                          min="0.0001"
                          inputMode="decimal"
                          required
                          value={unit.conversion_factor ?? ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) =>
                            handleUnitChange(idx, 'conversion_factor', e.target.value === '' ? '' : parseFloat(e.target.value))
                          }
                          className="w-24 px-2 py-1 text-xs font-mono border border-slate-300 rounded"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          inputMode="decimal"
                          value={unit.purchase_price ?? ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) =>
                            handleUnitChange(idx, 'purchase_price', e.target.value === '' ? '' : parseFloat(e.target.value))
                          }
                          className="w-24 px-2 py-1 text-xs font-mono border border-slate-300 rounded"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          inputMode="decimal"
                          value={unit.sale_price ?? ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) =>
                            handleUnitChange(idx, 'sale_price', e.target.value === '' ? '' : parseFloat(e.target.value))
                          }
                          className="w-24 px-2 py-1 text-xs font-mono border border-slate-300 rounded font-semibold text-emerald-700"
                        />
                      </td>

                      <td className="p-2 text-center">
                        <input
                          type="radio"
                          name="default_unit"
                          checked={unit.is_default_sale || false}
                          onChange={() => {
                            const updated = units.map((u, i) => ({
                              ...u,
                              is_default_sale: i === idx,
                            }));
                            setUnits(updated);
                          }}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>

                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveUnit(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
            >
              حفظ المنتج والوحدات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
