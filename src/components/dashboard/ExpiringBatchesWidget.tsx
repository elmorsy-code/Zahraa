import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  Clock,
  ShieldAlert,
  Search,
  RotateCcw,
  Store,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { ExpiringBatchItem } from '../../types/database';
import { storage } from '../../lib/storage';
import { formatQuantity } from '../../lib/formatters';

interface ExpiringBatchesWidgetProps {
  initialDays?: number;
  isStandaloneScreen?: boolean;
}

export const ExpiringBatchesWidget: React.FC<ExpiringBatchesWidgetProps> = ({
  initialDays = 90,
  isStandaloneScreen = false,
}) => {
  const [daysWindow, setDaysWindow] = useState<number>(initialDays);
  const [batches, setBatches] = useState<ExpiringBatchItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'expired' | 'urgent_30' | 'warning_90'>('all');

  const warehouses = storage.getWarehouses();

  const loadData = async (days: number = daysWindow) => {
    setLoading(true);
    try {
      const data = await storage.getExpiringBatches(days);
      setBatches(data);
    } catch (err) {
      console.warn('Error loading expiring batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(daysWindow);
    const unsubscribe = storage.subscribe(() => loadData(daysWindow));
    return () => unsubscribe();
  }, [daysWindow]);

  // Counts for alert badges
  const expiredCount = batches.filter((b) => b.days_remaining <= 0).length;
  const urgent30Count = batches.filter((b) => b.days_remaining > 0 && b.days_remaining <= 30).length;
  const normal90Count = batches.filter((b) => b.days_remaining > 30).length;

  // Filtered items
  const filteredBatches = batches.filter((b) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      b.product_name.toLowerCase().includes(q) ||
      (b.product_code && b.product_code.toLowerCase().includes(q)) ||
      b.batch_number.toLowerCase().includes(q);

    const matchesWarehouse = warehouseFilter === 'all' || b.warehouse_id === warehouseFilter;

    let matchesStatus = true;
    if (statusFilter === 'expired') matchesStatus = b.days_remaining <= 0;
    else if (statusFilter === 'urgent_30') matchesStatus = b.days_remaining > 0 && b.days_remaining <= 30;
    else if (statusFilter === 'warning_90') matchesStatus = b.days_remaining > 30;

    return matchesSearch && matchesWarehouse && matchesStatus;
  });

  return (
    <div className={`card-box p-6 sm:p-8 border-2 ${expiredCount > 0 ? 'border-rose-300' : urgent30Count > 0 ? 'border-amber-300' : 'border-slate-200'} space-y-6 shadow-sm`}>
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`p-3.5 rounded-2xl text-white shadow-sm shrink-0 ${
              expiredCount > 0
                ? 'bg-rose-600'
                : urgent30Count > 0
                ? 'bg-amber-600'
                : 'bg-emerald-700'
            }`}
          >
            {expiredCount > 0 ? (
              <AlertOctagon className="w-7 h-7" />
            ) : urgent30Count > 0 ? (
              <Clock className="w-7 h-7" />
            ) : (
              <ShieldAlert className="w-7 h-7" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                متابعة تواريخ الصلاحية والتشغيلات (قرب الانتهاء {daysWindow} يوم)
              </h2>
              {expiredCount > 0 && (
                <span className="px-3 py-1 rounded-xl text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                  ⚠️ يوجد {expiredCount} تشغيلة منتهية
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-600 mt-1 leading-relaxed">
              استعلام تلقائي من قاعدة البيانات عبر <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800 text-xs">rpc(&apos;get_expiring_batches&apos;, &#123; p_days: {daysWindow} &#125;)</code> لمراقبة المخازن وتطبيق سياسة البيع حسب الأقدم صلاحية (FEFO).
            </p>
          </div>
        </div>

        {/* Controls: Days window & Refresh */}
        <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
          <select
            value={daysWindow}
            onChange={(e) => setDaysWindow(Number(e.target.value))}
            className="px-3.5 py-2 text-xs sm:text-sm font-bold bg-white border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            title="تحديد نطاق مراقبة الأيام المتبقية"
          >
            <option value={30}>خلال 30 يوم فقط</option>
            <option value={60}>خلال 60 يوم</option>
            <option value={90}>خلال 90 يوم (الافتراضي)</option>
            <option value={180}>خلال 180 يوم (6 أشهر)</option>
            <option value={365}>خلال 365 يوم (سنة)</option>
          </select>

          <button
            onClick={() => loadData(daysWindow)}
            type="button"
            disabled={loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 cursor-pointer transition-colors active:scale-95 disabled:opacity-50"
            title="تحديث بيانات التشغيلات"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alert KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Card 1: Expired (Red) */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'expired' ? 'all' : 'expired')}
          className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer ${
            statusFilter === 'expired'
              ? 'bg-rose-100 border-rose-500 ring-2 ring-rose-400'
              : 'bg-rose-50 hover:bg-rose-100/70 border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800">منتهية الصلاحية (ممنوع البيع)</span>
            <span className="w-3 h-3 rounded-full bg-rose-600"></span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-rose-800 mt-2">
            {expiredCount}
          </div>
          <span className="text-[11px] font-bold text-rose-700 block mt-1">
            ملونة بالأحمر · تمنع من الفواتير
          </span>
        </button>

        {/* Card 2: Urgent < 30 days (Orange) */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'urgent_30' ? 'all' : 'urgent_30')}
          className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer ${
            statusFilter === 'urgent_30'
              ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-400'
              : 'bg-amber-50 hover:bg-amber-100/70 border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">أقل من 30 يوم (عاجلة)</span>
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-900 mt-2">
            {urgent30Count}
          </div>
          <span className="text-[11px] font-bold text-amber-800 block mt-1">
            ملونة بالبرتقالي · أولوية بيع FEFO
          </span>
        </button>

        {/* Card 3: 31-90 days (Yellow/Amber) */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'warning_90' ? 'all' : 'warning_90')}
          className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer ${
            statusFilter === 'warning_90'
              ? 'bg-yellow-100 border-yellow-500 ring-2 ring-yellow-400'
              : 'bg-yellow-50 hover:bg-yellow-100/70 border-yellow-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-yellow-950">بين 30 إلى {daysWindow} يوم</span>
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-yellow-900 mt-2">
            {normal90Count}
          </div>
          <span className="text-[11px] font-bold text-yellow-800 block mt-1">
            تحت المراقبة والمتابعة
          </span>
        </button>

        {/* Card 4: Total Tracked */}
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-700'
              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${statusFilter === 'all' ? 'text-slate-300' : 'text-slate-600'}`}>
              إجمالي التشغيلات في النطاق
            </span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-2xl sm:text-3xl font-black font-mono mt-2 ${statusFilter === 'all' ? 'text-white' : 'text-slate-900'}`}>
            {batches.length}
          </div>
          <span className={`text-[11px] font-medium block mt-1 ${statusFilter === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
            عرض جميع النتائج المسترجعة
          </span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute right-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالصنف، كود المنتج، رقم التشغيلة..."
              className="w-full pr-10 pl-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          {/* Warehouse Selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Store className="w-4 h-4 text-slate-500" />
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">جميع المخازن والفروع</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.location_type === 'shop' ? 'محل' : 'مخزن'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Clear */}
        {(statusFilter !== 'all' || warehouseFilter !== 'all' || search) && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setWarehouseFilter('all');
              setSearch('');
            }}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 bg-white border border-slate-300 rounded-xl cursor-pointer"
          >
            إعادة تعيين الفلاتر
          </button>
        )}
      </div>

      {/* Table: REQUIRED COLUMNS: المخزن، الصنف، التشغيلة، الأيام المتبقية، الكمية */}
      {/* REQUIRED COLORS: تلوين المنتهي بالأحمر وأقل من 30 يوم بالبرتقالي */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm border-collapse min-w-[760px]">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">1. المخزن</th>
                <th className="py-3.5 px-4 min-w-[180px]">2. الصنف</th>
                <th className="py-3.5 px-4">3. رقم التشغيلة</th>
                <th className="py-3.5 px-4">تاريخ الصلاحية</th>
                <th className="py-3.5 px-4">4. الأيام المتبقية</th>
                <th className="py-3.5 px-4 text-left">5. الكمية المتاحة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 stroke-1" />
                    <p className="text-sm font-bold text-slate-700">
                      ممتاز! لا توجد تشغيلات تطابق هذا الشرط ضمن نطاق ({daysWindow} يوم)
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      كافة أرصدة المخازن الأخرى إما صالحة لمدد أطول أو تم صرفها بالكامل.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBatches.map((item, idx) => {
                  const isExpired = item.days_remaining <= 0;
                  const isUrgent30 = item.days_remaining > 0 && item.days_remaining <= 30;

                  // ROW COLORING: Red if expired, Orange if <= 30 days
                  const rowClass = isExpired
                    ? 'bg-rose-50/90 hover:bg-rose-100 text-rose-950 border-r-4 border-r-rose-600'
                    : isUrgent30
                    ? 'bg-amber-50/90 hover:bg-amber-100 text-amber-950 border-r-4 border-r-amber-500'
                    : 'bg-white hover:bg-slate-50 text-slate-800';

                  return (
                    <tr key={item.id || idx} className={`${rowClass} transition-colors`}>
                      {/* 1. Warehouse */}
                      <td className="py-3.5 px-4 font-bold">
                        <div className="flex items-center gap-1.5">
                          <Store className={`w-4 h-4 shrink-0 ${isExpired ? 'text-rose-600' : isUrgent30 ? 'text-amber-600' : 'text-slate-400'}`} />
                          <span>{item.warehouse_name}</span>
                        </div>
                      </td>

                      {/* 2. Product */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className="font-bold text-sm block">
                            {item.product_name}
                          </span>
                          <div className="flex items-center gap-2">
                            {item.product_code && (
                              <span className="font-mono text-[11px] text-slate-500">
                                كود: {item.product_code}
                              </span>
                            )}
                            {item.is_pesticide && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                🛡️ مبيد زراعي
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Batch Number */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-white border border-slate-300 shadow-2xs">
                          {item.batch_number}
                        </span>
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3.5 px-4 font-mono font-bold text-xs tabular-nums">
                        {item.expiry_date}
                      </td>

                      {/* 4. Days Remaining */}
                      <td className="py-3.5 px-4">
                        {isExpired ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-rose-600 text-white shadow-2xs">
                            <AlertOctagon className="w-3.5 h-3.5" />
                            <span>منتهي منذ {Math.abs(item.days_remaining)} يوم</span>
                          </div>
                        ) : isUrgent30 ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-amber-500 text-white shadow-2xs">
                            <Clock className="w-3.5 h-3.5" />
                            <span>متبقي {item.days_remaining} يوم (أقل من شهر)</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-yellow-100 text-yellow-900 border border-yellow-300">
                            <Calendar className="w-3.5 h-3.5 text-yellow-700" />
                            <span>متبقي {item.days_remaining} يوم</span>
                          </div>
                        )}
                      </td>

                      {/* 5. Quantity in Base Unit */}
                      <td className="py-3.5 px-4 text-left font-mono font-black text-sm tabular-nums">
                        <span className={`px-2.5 py-1 rounded-lg ${isExpired ? 'bg-rose-200/80 text-rose-950 font-black' : isUrgent30 ? 'bg-amber-200/80 text-amber-950' : 'bg-slate-100 text-slate-900'}`}>
                          {formatQuantity(item.qty_in_base_unit)} {item.base_unit_name || 'وحدة'}
                        </span>
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
