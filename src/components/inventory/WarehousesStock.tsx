import React, { useState, useEffect } from 'react';
import {
  Warehouse as WarehouseIcon,
  Store,
  ArrowLeftRight,
  Search,
  Scale,
  History,
  AlertTriangle,
} from 'lucide-react';
import { Product, StockTransfer } from '../../types/database';
import { storage } from '../../lib/storage';
import { formatQuantity, formatDateTime } from '../../lib/formatters';
import { StockTransferModal } from './StockTransferModal';
import { StockAdjustmentModal } from './StockAdjustmentModal';

interface WarehousesStockProps {
  initialLocationType?: 'shop' | 'warehouse';
}

export const WarehousesStock: React.FC<WarehousesStockProps> = ({
  initialLocationType,
}) => {
  const warehouses = storage.getWarehouses();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    initialLocationType === 'warehouse'
      ? warehouses.find((w) => w.location_type === 'warehouse')?.id || warehouses[0]?.id || ''
      : warehouses.find((w) => w.location_type === 'shop')?.id || warehouses[0]?.id || ''
  );
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);

  // Modals
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const loadData = () => {
    setProducts(storage.getProducts());
    setTransfers(storage.getStockTransfers());
  };

  const activeWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);

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
      {/* Location Switcher & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {warehouses.map((w) => {
            const isSelected = selectedWarehouseId === w.id;
            const Icon = w.location_type === 'shop' ? Store : WarehouseIcon;
            return (
              <button
                key={w.id}
                onClick={() => setSelectedWarehouseId(w.id)}
                type="button"
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{w.name}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setTransferModalOpen(true)}
          type="button"
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors self-start md:self-auto"
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>+ تحويل بضاعة بين المخزن والمحل</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`ابحث في مخزون "${activeWarehouse?.name || 'المستودع'}" بالاسم أو الكود...`}
          className="w-full text-xs focus:outline-none"
        />
      </div>

      {/* Stock Table for selected location */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
          <span className="font-bold text-slate-800">
            أرصدة الأصناف الحالية في: {activeWarehouse?.name}
          </span>
          <span className="text-slate-500 font-mono">
            {filtered.length} صنف مسجل
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">الكود</th>
                <th className="py-2.5 px-3">اسم المنتج والمادة الفعالة</th>
                <th className="py-2.5 px-3">الوحدة الأساسية</th>
                <th className="py-2.5 px-3 text-center">الرصيد في {activeWarehouse?.name}</th>
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
                        {isOut ? 'نفد الرصيد' : isLow ? 'منخفض (نواقص)' : 'متوفر ومستقر'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => {
                          setAdjustingProduct(prod);
                          setAdjustModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                        title="تسوية جردية للرصيد"
                      >
                        <Scale className="w-3 h-3 text-slate-500" />
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

      {/* Recent Transfers Log */}
      {transfers.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
          <h4 className="font-bold text-slate-900 text-xs mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-600" />
            <span>سجل التحويلات المنفذة مؤخراً بين المخزن والمحل</span>
          </h4>

          <div className="divide-y divide-slate-100 text-xs">
            {transfers.slice(0, 5).map((trf) => {
              const from = warehouses.find((w) => w.id === trf.from_warehouse_id);
              const to = warehouses.find((w) => w.id === trf.to_warehouse_id);
              return (
                <div key={trf.id} className="py-2 flex justify-between items-center">
                  <div>
                    <span className="font-bold font-mono text-slate-800 ml-2">
                      {trf.transfer_number}
                    </span>
                    <span className="text-slate-600">
                      من {from?.name} إلى {to?.name}
                    </span>
                    {trf.notes && <span className="text-slate-400 mr-2">({trf.notes})</span>}
                  </div>
                  <div className="text-slate-400 font-mono text-[11px]">
                    {formatDateTime(trf.transfer_date)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <StockTransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        defaultFromWarehouse={selectedWarehouseId}
        onSuccess={loadData}
      />

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
