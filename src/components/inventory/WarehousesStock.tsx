import React, { useState, useEffect } from 'react';
import {
  Warehouse as WarehouseIcon,
  Store,
  Search,
  Scale,
  Package,
} from 'lucide-react';
import { Product } from '../../types/database';
import { storage } from '../../lib/storage';
import { formatQuantity } from '../../lib/formatters';
import { StockAdjustmentModal } from './StockAdjustmentModal';

interface WarehousesStockProps {
  initialLocationType?: 'shop' | 'warehouse';
}

export const WarehousesStock: React.FC<WarehousesStockProps> = ({
  initialLocationType = 'shop',
}) => {
  const warehouses = storage.getWarehouses();
  const targetWh = warehouses.find((w) => w.location_type === initialLocationType) || warehouses[0];
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(targetWh?.id || '');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);

  // Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (initialLocationType) {
      const match = warehouses.find((w) => w.location_type === initialLocationType);
      if (match) setSelectedWarehouseId(match.id);
    }
  }, [initialLocationType, warehouses]);

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const loadData = () => {
    setProducts(storage.getProducts());
  };

  const isShop = initialLocationType === 'shop';
  const pageTitle = isShop ? 'بضاعة ومخزون المحل' : 'بضاعة ومخزون المخزن';

  const filtered = products.filter((p) => {
    const q = search.toLowerCase().trim();
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.commercial_name && p.commercial_name.toLowerCase().includes(q)) ||
      p.code.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between shadow-xs ${
        isShop
          ? 'bg-emerald-900 text-white border-emerald-800'
          : 'bg-slate-900 text-white border-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${
            isShop ? 'bg-emerald-800 text-white' : 'bg-blue-600 text-white'
          }`}>
            {isShop ? <Store className="w-6 h-6" /> : <WarehouseIcon className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-lg font-bold">
              {pageTitle}
            </h2>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`بحث في ${pageTitle} بالاسم أو الكود...`}
          className="w-full text-xs sm:text-sm focus:outline-none"
        />
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
          <span className="font-bold text-slate-800">
            أرصدة الأصناف المسجلة
          </span>
          <span className="text-slate-500 font-mono">
            {filtered.length} صنف
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">الصورة</th>
                <th className="py-2.5 px-3">الكود</th>
                <th className="py-2.5 px-3">اسم المنتج والمادة الفعالة</th>
                <th className="py-2.5 px-3">الوحدة الأساسية</th>
                <th className="py-2.5 px-3 text-center">الرصيد المتوفر</th>
                <th className="py-2.5 px-3 text-center">حد التنبيه الأدنى</th>
                <th className="py-2.5 px-3 text-center">حالة الرصيد</th>
                <th className="py-2.5 px-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((prod) => {
                const stock = storage.getProductStock(prod.id, selectedWarehouseId);
                const isLow = stock <= prod.min_stock_alert;
                const isOut = stock <= 0;

                return (
                  <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 text-center">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden mx-auto">
                        {prod.image_url ? (
                          <img
                            src={prod.image_url}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-slate-300" />
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-mono font-medium text-slate-500">
                      {prod.code}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{prod.name}</div>
                      {prod.active_ingredient && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {prod.active_ingredient}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                      {prod.base_unit_name}
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono font-bold text-sm text-slate-900">
                      {formatQuantity(stock)} {prod.base_unit_name}
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                      {formatQuantity(prod.min_stock_alert)} {prod.base_unit_name}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          isOut
                            ? 'bg-rose-100 text-rose-800'
                            : isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isOut ? 'نفد الرصيد' : isLow ? 'منخفض' : 'متوفر'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => {
                          setAdjustingProduct(prod);
                          setAdjustModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                        title="تسوية جردية"
                      >
                        <Scale className="w-3.5 h-3.5 text-slate-500" />
                        <span>تسوية جرد</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <StockAdjustmentModal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        product={adjustingProduct}
        warehouseId={selectedWarehouseId}
        onSuccess={loadData}
      />
    </div>
  );
};
