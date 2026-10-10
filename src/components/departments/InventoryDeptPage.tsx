import React, { useState, useEffect } from 'react';
import {
  Warehouse,
  PackageCheck,
  Store,
  ArrowLeftRight,
  History,
  LayoutGrid,
  AlertTriangle,
  Coins,
  Plus,
  Search,
  Package,
  Layers,
} from 'lucide-react';
import { DepartmentHeader, DepartmentTabItem } from './DepartmentHeader';
import { ProductsList } from '../products/ProductsList';
import { WarehousesStock } from '../inventory/WarehousesStock';
import { StockMovementsList } from '../inventory/StockMovementsList';
import { storage } from '../../lib/storage';
import { Product } from '../../types/database';
import { formatCurrency, formatQuantity } from '../../lib/formatters';

interface InventoryDeptPageProps {
  initialSubTab?: string;
  onNavigateHome: () => void;
}

export const InventoryDeptPage: React.FC<InventoryDeptPageProps> = ({
  initialSubTab = 'overview',
  onNavigateHome,
}) => {
  const [subTab, setSubTab] = useState<string>(initialSubTab);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
    const unsub = storage.subscribe(loadData);
    return () => unsub();
  }, []);

  const loadData = () => {
    setProducts(storage.getProducts());
  };

  // Compute live KPIs
  const lowStockItems = products.filter(
    (p) => (p.stock_shop || 0) + (p.stock_warehouse || 0) <= p.min_stock_alert
  );

  const totalStockUnits = products.reduce(
    (sum, p) => sum + (p.stock_shop || 0) + (p.stock_warehouse || 0),
    0
  );

  const estimatedStockValue = products.reduce((sum, p) => {
    const totalQty = (p.stock_shop || 0) + (p.stock_warehouse || 0);
    return sum + totalQty * (p.default_purchase_price || 0);
  }, 0);

  const shopStockTotal = products.reduce((sum, p) => sum + (p.stock_shop || 0), 0);
  const warehouseStockTotal = products.reduce((sum, p) => sum + (p.stock_warehouse || 0), 0);

  const tabs: DepartmentTabItem[] = [
    { id: 'overview', label: 'نظرة عامة على المخازن والمخزون', icon: LayoutGrid },
    { id: 'products_list', label: 'دليل الأصناف والوحدات', icon: PackageCheck, count: products.length },
    { id: 'warehouse_main', label: 'المستودع الرئيسي', icon: Warehouse },
    { id: 'warehouse_shop', label: 'مخزون محل البيع', icon: Store },
    { id: 'movements', label: 'سجل حركة المخزون', icon: History },
  ];

  const criticalItems = lowStockItems.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Department Master Header */}
      <DepartmentHeader
        deptId="inventory_dept"
        title="قسم المخازن والأصناف والمستودعات"
        subtitle="إدارة الأصناف الزراعية والمبيدات، الوحدات والتحويلات، أرصدة المستودع الرئيسي ومحل البيع، وحركات المخزون"
        tagline="الرصيد والوحدات والمستودعات"
        icon={Warehouse}
        themeColor="teal"
        tabs={tabs}
        activeSubTab={subTab}
        onSelectSubTab={(tab) => setSubTab(tab)}
        onNavigateHome={onNavigateHome}
        extraActions={
          <>
            <button
              onClick={() => setSubTab('products_list')}
              type="button"
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صنف جديد</span>
            </button>
            <button
              onClick={() => setSubTab('warehouse_main')}
              type="button"
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4 text-teal-700" />
              <span>التحويل والجرد</span>
            </button>
          </>
        }
      />

      {/* VIEW 1: Overview */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Department KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* KPI 1: Total Products */}
            <div className="card-box p-5 sm:p-6 border-2 border-teal-300/80 bg-gradient-to-br from-teal-50/70 via-white to-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">إجمالي الأصناف المسجلة</span>
                <div className="p-2.5 bg-teal-100 text-teal-900 rounded-xl">
                  <PackageCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-teal-950 tabular-nums">
                {products.length} صنف
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>أدوية، أسمدة ومبيدات</span>
                <span className="text-teal-800 font-bold">دليل الأصناف</span>
              </div>
            </div>

            {/* KPI 2: Estimated Inventory Value */}
            <div className="card-box p-5 sm:p-6 border-2 border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">القيمة التقديرية للمخزون</span>
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Coins className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-950 tabular-nums">
                {formatCurrency(estimatedStockValue)}
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>بسعر الشراء والتكلفة</span>
                <span className="text-emerald-700 font-bold">رأس مال المخزون</span>
              </div>
            </div>

            {/* KPI 3: Low Stock Warning */}
            <div className="card-box p-5 sm:p-6 border-2 border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">نواقص المخزون (تحت الأمان)</span>
                <div className={`p-2.5 rounded-xl ${lowStockItems.length > 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-500'}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-800 tabular-nums">
                {lowStockItems.length} صنف
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>تحتاج طلب وتوريد عاجل</span>
                <span className="text-amber-700 font-bold">تنبيه إعادة الطلب</span>
              </div>
            </div>

            {/* KPI 4: Stock Distribution */}
            <div className="card-box p-5 sm:p-6 border-2 border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">توزيع أرصدة المستودعات</span>
                <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl">
                  <Store className="w-5 h-5" />
                </div>
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">محل البيع:</span>
                  <span className="font-mono font-bold text-slate-800">{formatQuantity(shopStockTotal)} وحدة</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">المستودع الرئيسي:</span>
                  <span className="font-mono font-bold text-slate-800">{formatQuantity(warehouseStockTotal)} وحدة</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>موقعين تخزين نشطين</span>
                <span className="text-blue-700 font-bold">جاهزية البيع</span>
              </div>
            </div>
          </div>

          {/* Low Stock Items Action Card */}
          <div className="card-box p-6 border-2 border-slate-200 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    أصناف قاربت على النفاد (تحت حد الأمان)
                  </h3>
                  <p className="text-xs text-slate-500">
                    متابعة المنتجات التي وصل رصيدها إلى الحد الأدنى لإدراجها في أمر الشراء
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSubTab('products_list')}
                type="button"
                className="text-xs font-bold text-teal-800 hover:text-teal-900 bg-teal-50 px-3.5 py-2 rounded-xl border border-teal-200 transition-colors"
              >
                دليل الأصناف الكامل ({products.length}) ←
              </button>
            </div>

            {criticalItems.length === 0 ? (
              <div className="text-center py-10 text-slate-500 space-y-2">
                <PackageCheck className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="font-bold text-sm text-slate-700">المخزون بحالة ممتازة! لا توجد أصناف تحت حد الأمان حالياً.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3">الكود</th>
                      <th className="py-3 px-3">اسم المنتج والمادة الفعالة</th>
                      <th className="py-3 px-3">الوحدة الأساسية</th>
                      <th className="py-3 px-3 text-center">مخزون المحل</th>
                      <th className="py-3 px-3 text-center">المستودع الرئيسي</th>
                      <th className="py-3 px-3 text-center">إجمالي المخزون</th>
                      <th className="py-3 px-3 text-center">حد الأمان</th>
                      <th className="py-3 px-3 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {criticalItems.map((p) => {
                      const totalStock = (p.stock_shop || 0) + (p.stock_warehouse || 0);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-slate-700">
                            {p.code}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-black text-slate-900">{p.name}</div>
                            {p.active_ingredient && (
                              <div className="text-[11px] text-slate-500">{p.active_ingredient}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-bold">
                            {p.base_unit_name}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                            {formatQuantity(p.stock_shop || 0)}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                            {formatQuantity(p.stock_warehouse || 0)}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-black text-amber-900 bg-amber-50/50">
                            {formatQuantity(totalStock)}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-500">
                            {p.min_stock_alert}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                              نواقص
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: Products List */}
      {subTab === 'products_list' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-teal-50/80 border border-teal-200 p-3 rounded-2xl">
            <span className="text-xs sm:text-sm font-bold text-teal-950 flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-teal-700" />
              دليل الأصناف والوحدات وتراكيب الأدوية الزراعية
            </span>
            <button
              onClick={() => setSubTab('overview')}
              type="button"
              className="text-xs font-bold text-teal-900 hover:text-teal-950 underline cursor-pointer"
            >
              العودة للوحة قسم المخازن
            </button>
          </div>
          <ProductsList />
        </div>
      )}

      {/* VIEW 3: Warehouse Main */}
      {subTab === 'warehouse_main' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-2xl">
            <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-slate-600" />
              المستودع الرئيسي - أرصدة التخزين والتحويل
            </span>
            <button
              onClick={() => setSubTab('overview')}
              type="button"
              className="text-xs font-bold text-slate-700 hover:text-slate-950 underline cursor-pointer"
            >
              العودة للوحة قسم المخازن
            </button>
          </div>
          <WarehousesStock initialLocationType="warehouse" />
        </div>
      )}

      {/* VIEW 4: Warehouse Shop */}
      {subTab === 'warehouse_shop' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-2xl">
            <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
              <Store className="w-4 h-4 text-slate-600" />
              مخزون محل البيع المباشر والكاشير
            </span>
            <button
              onClick={() => setSubTab('overview')}
              type="button"
              className="text-xs font-bold text-slate-700 hover:text-slate-950 underline cursor-pointer"
            >
              العودة للوحة قسم المخازن
            </button>
          </div>
          <WarehousesStock initialLocationType="shop" />
        </div>
      )}

      {/* VIEW 5: Stock Movements */}
      {subTab === 'movements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-2xl">
            <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-600" />
              سجل حركة المخزون الشامل (وارد، منصرف، تحويل وجرد)
            </span>
            <button
              onClick={() => setSubTab('overview')}
              type="button"
              className="text-xs font-bold text-slate-700 hover:text-slate-950 underline cursor-pointer"
            >
              العودة للوحة قسم المخازن
            </button>
          </div>
          <StockMovementsList />
        </div>
      )}
    </div>
  );
};
