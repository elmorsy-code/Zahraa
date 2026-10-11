import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, PackagePlus, AlertCircle, Sparkles, Tag, Scale } from 'lucide-react';
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
  const [commercialName, setCommercialName] = useState('');
  const [activeIngredient, setActiveIngredient] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [description, setDescription] = useState('');
  const [baseUnitName, setBaseUnitName] = useState('جرام');
  const [defaultPurchasePrice, setDefaultPurchasePrice] = useState('0');
  const [defaultSalePrice, setDefaultSalePrice] = useState('0');
  const [minStockAlert, setMinStockAlert] = useState('10');
  const [isPesticide, setIsPesticide] = useState(false);
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [units, setUnits] = useState<Array<Partial<ProductUnit>>>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (productToEdit) {
      setCode(productToEdit.code || '');
      setBarcode(productToEdit.barcode || '');
      setName(productToEdit.name || '');
      setCommercialName(productToEdit.commercial_name || '');
      setActiveIngredient(productToEdit.active_ingredient || '');
      setManufacturer(productToEdit.manufacturer || '');
      setCategoryId(productToEdit.category_id || categories[0]?.id || '');
      const existingCat = categories.find((c) => c.id === productToEdit.category_id);
      setCategoryNameInput(existingCat?.name || productToEdit.category?.name || '');
      setDescription(productToEdit.description || '');
      setBaseUnitName(productToEdit.base_unit_name || 'جرام');
      setDefaultPurchasePrice(productToEdit.default_purchase_price?.toString() || '0');
      setDefaultSalePrice(productToEdit.default_sale_price?.toString() || '0');
      setMinStockAlert(productToEdit.min_stock_alert?.toString() || '10');
      setIsPesticide(productToEdit.is_pesticide || false);
      setRequiresPrescription(productToEdit.requires_prescription || false);
      setUnits(productToEdit.units || []);
    } else {
      setCode('');
      setBarcode('');
      setName('');
      setCommercialName('');
      setActiveIngredient('');
      setManufacturer('');
      const defaultCat = categories[0];
      setCategoryId(defaultCat?.id || '');
      setCategoryNameInput(defaultCat?.name || 'مبيدات فطرية وحشرية');
      setDescription('');
      setBaseUnitName('جرام');
      setDefaultPurchasePrice('0');
      setDefaultSalePrice('0');
      setMinStockAlert('10');
      setIsPesticide(false);
      setRequiresPrescription(false);
      // Initialize with base unit + a common packaging unit
      setUnits([
        {
          unit_name: 'جرام (الوحدة الأساسية)',
          conversion_factor: 1,
          sale_price: 0,
          purchase_price: 0,
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
        sale_price: 0,
        purchase_price: 0,
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

      const saved = await storage.saveProduct({
        id: productToEdit?.id,
        code: code.trim(),
        barcode: barcode.trim(),
        name: name.trim(),
        commercial_name: commercialName.trim(),
        active_ingredient: activeIngredient.trim(),
        manufacturer: manufacturer.trim(),
        category_id: finalCategoryId || undefined,
        description: description.trim(),
        base_unit_name: cleanBaseUnit,
        default_purchase_price: parseFloat(defaultPurchasePrice) || 0,
        default_sale_price: parseFloat(defaultSalePrice) || 0,
        min_stock_alert: parseFloat(minStockAlert) || 10,
        is_pesticide: isPesticide,
        requires_prescription: requiresPrescription,
        units: sanitizedUnits,
      });

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
                placeholder="مثال: مبيد أكتارا 25% WG"
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
                placeholder="مثال: أكتارا إكسترا"
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
                placeholder="مثال: ثياميثوكسام 25% (Thiamethoxam)"
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
                placeholder="سنجنتا، باير، كفر الزيات..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>التصنيف (اكتب أو اختر)</span>
                </label>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">
                  كتابة حرة
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  list="categories-datalist"
                  value={categoryNameInput}
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
                  placeholder="اكتب اسم التصنيف (مثال: مبيدات فطرية، أسمدة ورقية...)"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
                />
                <datalist id="categories-datalist">
                  {categories.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>
              {/* Quick Suggestion Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mt-1.5 scrollbar-none flex-nowrap">
                <span className="text-[10px] text-slate-400 shrink-0">اقتراحات:</span>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCategoryNameInput(c.name);
                      setCategoryId(c.id);
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors shrink-0 ${
                      categoryNameInput.trim().toLowerCase() === c.name.trim().toLowerCase()
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-emerald-600" />
                  <span>الوحدة الأساسية للمخزون (اكتب أو اختر)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">
                  كتابة حرة
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  list="base-units-datalist"
                  required
                  value={baseUnitName}
                  onChange={(e) => setBaseUnitName(e.target.value)}
                  placeholder="اكتب الوحدة الأساسية (مثال: جرام، كجم، لتر، مل، قرص...)"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800"
                />
                <datalist id="base-units-datalist">
                  {COMMON_BASE_UNITS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>
              {/* Quick Suggestion Pills for Units */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mt-1.5 scrollbar-none flex-nowrap">
                <span className="text-[10px] text-slate-400 shrink-0">شائع:</span>
                {['جرام', 'كجم', 'مل', 'لتر', 'قرص', 'كيس', 'عبوة'].map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setBaseUnitName(u)}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors shrink-0 ${
                      baseUnitName.trim() === u
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                تُحسب جميع العمليات والأرصدة بالمعادلات بدلالة هذه الوحدة الأساسية.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                كود الصنف
              </label>
              <input
                type="text"
                value={code}
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
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="622..."
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
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

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

          {/* Multi-unit Conversion Definition Table (MANDATORY REQUIREMENT) */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  وحدات البيع المتعددة ومعاملات التحويل
                </h4>
                <p className="text-[11px] text-slate-500">
                  حدد الوحدات المتاحة للبيع (كيس، عبوة، شيكارة) وكم تحتوي من الوحدة الأساسية ({baseUnitName})
                </p>
              </div>

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
                          onChange={(e) => handleUnitChange(idx, 'unit_name', e.target.value)}
                          placeholder="مثال: كيس 100 جرام"
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-medium"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          required
                          value={unit.conversion_factor || ''}
                          onChange={(e) =>
                            handleUnitChange(idx, 'conversion_factor', parseFloat(e.target.value) || 1)
                          }
                          className="w-24 px-2 py-1 text-xs font-mono border border-slate-300 rounded"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={unit.purchase_price ?? ''}
                          onChange={(e) =>
                            handleUnitChange(idx, 'purchase_price', parseFloat(e.target.value) || 0)
                          }
                          className="w-24 px-2 py-1 text-xs font-mono border border-slate-300 rounded"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={unit.sale_price ?? ''}
                          onChange={(e) =>
                            handleUnitChange(idx, 'sale_price', parseFloat(e.target.value) || 0)
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
