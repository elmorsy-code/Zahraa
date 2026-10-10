import React, { useState, useEffect } from 'react';
import { Search, History, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Scale } from 'lucide-react';
import { StockMovement } from '../../types/database';
import { storage } from '../../lib/storage';
import { formatQuantity, formatDateTime } from '../../lib/formatters';

export const StockMovementsList: React.FC = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadMovements();
    const unsubscribe = storage.subscribe(loadMovements);
    return () => unsubscribe();
  }, []);

  const loadMovements = () => {
    setMovements(storage.getStockMovements());
  };

  const warehouses = storage.getWarehouses();

  const filtered = movements.filter((m) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      m.movement_number.toLowerCase().includes(q) ||
      (m.product_name && m.product_name.toLowerCase().includes(q)) ||
      (m.notes && m.notes.toLowerCase().includes(q));

    const matchesWh = warehouseFilter === 'all' || m.warehouse_id === warehouseFilter;
    const matchesType = typeFilter === 'all' || m.movement_type === typeFilter;

    return matchesSearch && matchesWh && matchesType;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الصنف أو رقم الحركة..."
              className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">جميع المخازن</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">جميع أنواع الحركات</option>
            <option value="sale">صرف مبيعات (نقصان)</option>
            <option value="purchase">توريد مشتريات (زيادة)</option>
            <option value="transfer_out">تحويل صادر (نقصان)</option>
            <option value="transfer_in">تحويل وارد (زيادة)</option>
            <option value="adjustment_plus">تسوية جردية بالزيادة</option>
            <option value="adjustment_minus">تسوية جردية بالعجز</option>
          </select>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-3">رقم الحركة</th>
                <th className="py-3 px-3">التاريخ والوقت</th>
                <th className="py-3 px-3">الصنف</th>
                <th className="py-3 px-3">الموقع المخزني</th>
                <th className="py-3 px-3">نوع الحركة</th>
                <th className="py-3 px-3 text-left">الكمية بالأساسي</th>
                <th className="py-3 px-3 text-left">الرصيد بعد الحركة</th>
                <th className="py-3 px-3">البيان والمستند المرجعي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-2 stroke-1" />
                    <p>لا توجد حركات مخزنية مسجلة</p>
                  </td>
                </tr>
              ) : (
                filtered.map((mov) => {
                  const isPlus = mov.qty_in_base_unit > 0;
                  return (
                    <tr key={mov.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-500">
                        {mov.movement_number}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {formatDateTime(mov.created_at)}
                      </td>

                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {mov.product_name || 'صنف'}
                      </td>

                      <td className="py-2.5 px-3 text-slate-700">
                        {mov.warehouse_name || 'المخزن'}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            mov.movement_type === 'sale'
                              ? 'bg-rose-50 text-rose-700'
                              : mov.movement_type === 'purchase'
                              ? 'bg-emerald-50 text-emerald-700'
                              : mov.movement_type.startsWith('transfer')
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-purple-50 text-purple-700'
                          }`}
                        >
                          {mov.movement_type === 'sale'
                            ? 'صرف بيع'
                            : mov.movement_type === 'purchase'
                            ? 'توريد شراء'
                            : mov.movement_type === 'transfer_out'
                            ? 'تحويل صادر'
                            : mov.movement_type === 'transfer_in'
                            ? 'تحويل وارد'
                            : mov.movement_type === 'adjustment_plus'
                            ? 'تسوية (+)'
                            : 'تسوية (-)'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-left font-mono font-bold">
                        <span className={isPlus ? 'text-emerald-700' : 'text-rose-700'}>
                          {isPlus ? `+${formatQuantity(mov.qty_in_base_unit)}` : formatQuantity(mov.qty_in_base_unit)}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">
                        {formatQuantity(mov.balance_after)}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                        {mov.notes || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
