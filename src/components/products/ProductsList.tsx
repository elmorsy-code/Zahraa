import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Package,
  AlertTriangle,
  Edit,
  Trash2,
  Layers,
  Tags,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Product } from '../../types/database';
import { storage } from '../../lib/storage';
import { authService } from '../../lib/auth';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { formatCurrency, formatQuantity } from '../../lib/formatters';
import { ProductModal } from './ProductModal';
import { CategoryModal } from './CategoryModal';

export const ProductsList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const isAdmin = authService.getCurrentUser()?.role === 'admin';

  useEffect(() => {
    loadProducts();
    const unsubscribe = storage.subscribe(loadProducts);
    return () => unsubscribe();
  }, []);

  const loadProducts = () => {
    setProducts(storage.getProducts());
  };

  const categories = storage.getCategories();

  const filtered = products.filter((p) => {
    const matchesCat = selectedCat === 'all' || p.category_id === selectedCat;
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.commercial_name && p.commercial_name.toLowerCase().includes(q)) ||
      (p.active_ingredient && p.active_ingredient.toLowerCase().includes(q)) ||
      p.code.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q));

    const totalStock = (p.stock_shop || 0) + (p.stock_warehouse || 0);
    const matchesStock = !showLowStockOnly || totalStock <= p.min_stock_alert;

    return matchesCat && matchesSearch && matchesStock;
  });

  return (
    <div className="space-y-4">
      {/* Top Action & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم، المادة الفعالة، الكود..."
              className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">جميع الفئات ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
              showLowStockOnly
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>نواقص المخزون</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCategoryModalOpen(true)}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Tags className="w-4 h-4" />
            <span>إدارة الفئات</span>
          </button>

          <button
            onClick={() => {
              setEditingProduct(null);
              setProductModalOpen(true);
            }}
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة صنف جديد</span>
          </button>
        </div>
      </div>

      {/* High-density Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm border-collapse min-w-[1000px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-4 px-4">الكود</th>
                <th className="py-4 px-4 min-w-[200px]">اسم المنتج والمادة الفعالة</th>
                <th className="py-4 px-4">الفئة</th>
                <th className="py-4 px-4 min-w-[200px]">الوحدات المتاحة للبيع</th>
                <th className="py-4 px-4 text-center">مخزون المحل</th>
                <th className="py-4 px-4 text-center">المستودع الرئيسي</th>
                <th className="py-4 px-4 text-center">إجمالي المخزون</th>
                <th className="py-4 px-4 text-left">سعر البيع الافتراضي</th>
                <th className="py-4 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-3 stroke-1 text-slate-300" />
                    <p className="text-sm font-medium">لا توجد منتجات مسجلة تطابق محددات البحث</p>
                  </td>
                </tr>
              ) : (
                filtered.map((prod) => {
                  const shopQty = prod.stock_shop || 0;
                  const whQty = prod.stock_warehouse || 0;
                  const total = shopQty + whQty;
                  const isLow = total <= prod.min_stock_alert;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-600 tabular-nums">
                        {prod.code}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{prod.name}</div>
                        {prod.active_ingredient && (
                          <div className="text-xs text-slate-500 mt-1">
                            {prod.active_ingredient}
                            {prod.manufacturer ? ` · ${prod.manufacturer}` : ''}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {prod.category?.name || 'عام'}
                      </td>

                      {/* Multi-units summary */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {prod.units?.map((u) => (
                            <span
                              key={u.id}
                              className="inline-flex items-center text-xs px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md border border-slate-200"
                              title={`معامل التحويل: ${u.conversion_factor} ${prod.base_unit_name} - السعر: ${u.sale_price} ج.م`}
                            >
                              {u.unit_name} (<span className="tabular-nums font-semibold">{formatCurrency(u.sale_price)}</span>)
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-800 tabular-nums">
                        {formatQuantity(shopQty)} {prod.base_unit_name}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-800 tabular-nums">
                        {formatQuantity(whQty)} {prod.base_unit_name}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-bold px-2.5 py-1 rounded-md text-xs inline-block tabular-nums ${
                            total <= 0
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {formatQuantity(total)} {prod.base_unit_name}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-left font-bold text-emerald-800 tabular-nums">
                        {formatCurrency(prod.default_sale_price)}
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            setEditingProduct(prod);
                            setProductModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="تعديل المنتج والوحدات"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
{isAdmin && (
  <button
    type="button"
    onClick={() => setDeleteTarget(prod)}
    className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
    title="حذف المنتج"
  >
    <Trash2 className="w-4 h-4" />
  </button>
)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        productToEdit={editingProduct}
        onSaved={() => {
          loadProducts();
          setProductModalOpen(false);
        }}
      />


      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="حذف منتج"
        itemName={deleteTarget?.name}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => storage.deleteProduct(deleteTarget!.id)}
      />

      <CategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onSaved={loadProducts}
      />
    </div>
  );
};
