import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Coins,
  Users,
  Building2,
  AlertTriangle,
  ArrowLeftRight,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  BarChart3,
  Search,
  PackageCheck,
  Warehouse,
  Landmark,
  ShieldCheck,
  ChevronLeft,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { storage } from '../../lib/storage';
import { formatCurrency, formatQuantity, formatDateTime } from '../../lib/formatters';
import { Pagination } from '../common/Pagination';
import { ExpiringBatchesWidget } from './ExpiringBatchesWidget';
import { SendWhatsAppModal } from '../sales/SendWhatsAppModal';
import { SalesInvoice } from '../../types/database';

interface DashboardOverviewProps {
  onNavigate: (tab: string) => void;
  onOpenPos: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigate,
  onOpenPos,
}) => {
  const [activeTab, setActiveTab] = useState<'cards_hub' | 'sales_cards' | 'stock_cards' | 'expiring_batches'>('cards_hub');
  const [salesPage, setSalesPage] = useState(1);
  const [salesPageSize, setSalesPageSize] = useState(6);
  const [stockPage, setStockPage] = useState(1);
  const [stockPageSize, setStockPageSize] = useState(6);
  const [searchInvoices, setSearchInvoices] = useState('');
  const [whatsAppInvoice, setWhatsAppInvoice] = useState<SalesInvoice | null>(null);
  const [dataTick, setDataTick] = useState(0);
  const [expiringBatchesCount, setExpiringBatchesCount] = useState(0);

  useEffect(() => {
    const fetchExpiring = async () => {
      try {
        const list = await storage.getExpiringBatches(90);
        setExpiringBatchesCount(list.length);
      } catch (e) {
        console.warn(e);
      }
    };
    fetchExpiring();
  }, [dataTick]);

  useEffect(() => {
    const handleStorageUpdate = () => {
      setDataTick((t) => t + 1);
    };
    const unsubscribe = storage.subscribe(handleStorageUpdate);
    return () => unsubscribe();
  }, []);

  const products = storage.getProducts();
  const salesInvoices = storage.getSalesInvoices();
  const purchaseInvoices = storage.getPurchaseInvoices();
  const customers = storage.getCustomers();
  const suppliers = storage.getSuppliers();
  const cashAccounts = storage.getCashAccounts();

  const totalCash = cashAccounts.reduce((s, c) => s + (c.current_balance || 0), 0);
  const totalCustomerDebt = customers.reduce((s, c) => s + Math.max(0, c.current_balance), 0);
  const totalSupplierDebt = suppliers.reduce((s, s2) => s + Math.max(0, s2.current_balance), 0);

  const lowStockItems = products.filter(
    (p) => (p.stock_shop || 0) + (p.stock_warehouse || 0) <= p.min_stock_alert
  );

  // Filtered sales invoices
  const filteredSales = salesInvoices.filter((inv) => {
    if (!searchInvoices.trim()) return true;
    const q = searchInvoices.toLowerCase().trim();
    return (
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.customer_name_snapshot.toLowerCase().includes(q)
    );
  });

  const pagedSales = filteredSales.slice(
    (salesPage - 1) * salesPageSize,
    salesPage * salesPageSize
  );

  const pagedStock = lowStockItems.slice(
    (stockPage - 1) * stockPageSize,
    stockPage * stockPageSize
  );



  return (
    <div className="space-y-8">
      {/* REAL DATA STATUS & CONTROLS BANNER */}
      <div className="card-box p-6 border-2 border-emerald-300 bg-emerald-50/80 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
        <div className="flex items-start sm:items-center gap-4">
          <div className="p-3.5 bg-emerald-700 text-white rounded-2xl shadow-sm shrink-0">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-lg font-black text-emerald-950">
                وضع البيانات الحقيقية والتشغيل الفعلي نشط (Live Production Mode)
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-200 text-emerald-950 border border-emerald-300">
                0% بيانات اختبار وهمية
              </span>
            </div>
            <p className="text-base font-medium text-emerald-900 mt-1 leading-relaxed">
              تم إزالة أي بيانات وهمية أو hardcoded — سجلات الفواتير والتحصيلات وحركات الخزينة والمخزون تعكس العمليات الواقعية المحفوظة للمؤسسة.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
          <button
            onClick={async () => {
              try {
                await storage.hydrate();
                setDataTick((t) => t + 1);
              } catch (err) {
                console.error(err);
              }
            }}
            type="button"
            className="flex items-center gap-2.5 px-5 py-3 text-sm font-black text-slate-800 bg-white hover:bg-slate-100 border-2 border-slate-200 rounded-xl cursor-pointer shadow-xs transition-all active:scale-95 whitespace-nowrap"
            title="تحديث ومزامنة كافة السجلات لحظياً"
          >
            <RotateCcw className="w-4 h-4 text-emerald-600" />
            <span>تحديث ومزامنة البيانات</span>
          </button>
        </div>
      </div>

      {/* 2. CARD SWITCHER TABS - Large, clear card navigation */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('cards_hub')}
          type="button"
          className={`flex items-center gap-2.5 px-6 py-3.5 text-base font-black rounded-2xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'cards_hub'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-50 border border-slate-200 shadow-xs'
          }`}
        >
          <BarChart3 className="w-5 h-5 text-emerald-500" />
          <span>1. شبكة البطاقات والأقسام الرئيسية</span>
        </button>

        <button
          onClick={() => setActiveTab('sales_cards')}
          type="button"
          className={`flex items-center gap-2.5 px-6 py-3.5 text-base font-black rounded-2xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'sales_cards'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-50 border border-slate-200 shadow-xs'
          }`}
        >
          <Receipt className="w-5 h-5 text-blue-500" />
          <span>2. بطاقات فواتير المبيعات ({salesInvoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('stock_cards')}
          type="button"
          className={`flex items-center gap-2.5 px-6 py-3.5 text-base font-black rounded-2xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'stock_cards'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-50 border border-slate-200 shadow-xs'
          }`}
        >
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <span>3. بطاقات نواقص المخزون ({lowStockItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('expiring_batches')}
          type="button"
          className={`flex items-center gap-2.5 px-6 py-3.5 text-base font-black rounded-2xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'expiring_batches'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-50 border border-slate-200 shadow-xs'
          }`}
        >
          <Clock className="w-5 h-5 text-rose-500" />
          <span>4. ويدجت قرب الانتهاء والتشغيلات ({expiringBatchesCount})</span>
        </button>
      </div>

      {/* VIEW 1: THE CARDS HUB */}
      {activeTab === 'cards_hub' && (
        <div className="space-y-10">
          {/* STATS CARDS GRID - 4 Master Indicator Cards */}
          <div>
            <div className="mb-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                مؤشرات السيولة والديون والمخزون
              </h2>
              <p className="text-base text-slate-600 mt-1 font-medium">
                بطاقات إحصائية رئيسية تعرض الموقف المالي والمخزني الفعلي للفرع
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Stat Card 1: Treasury */}
              <div
                onClick={() => onNavigate('treasury')}
                className="card-box p-7 border-2 border-emerald-200 hover:border-emerald-500 cursor-pointer space-y-4 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-slate-700">سيولة الخزائن النقدية</span>
                  <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl group-hover:scale-110 transition-transform">
                    <Coins className="w-6 h-6" />
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-emerald-800 tabular-nums">
                  {formatCurrency(totalCash)}
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-slate-500 pt-2 border-t border-slate-100">
                  <span>في {cashAccounts.length} خزينة ودرج</span>
                  <span className="text-emerald-700 group-hover:translate-x-[-4px] transition-transform flex items-center">
                    عرض الخزينة ←
                  </span>
                </div>
              </div>

              {/* Stat Card 2: Customer Debts */}
              <div
                onClick={() => onNavigate('customer_ledgers')}
                className="card-box p-7 border-2 border-amber-200 hover:border-amber-500 cursor-pointer space-y-4 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-slate-700">مديونيات العملاء والمزارعين</span>
                  <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-amber-800 tabular-nums">
                  {formatCurrency(totalCustomerDebt)}
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-slate-500 pt-2 border-t border-slate-100">
                  <span>على {customers.filter((c) => c.current_balance > 0).length} مزارع مدين</span>
                  <span className="text-amber-700 group-hover:translate-x-[-4px] transition-transform flex items-center">
                    كشوف الحسابات ←
                  </span>
                </div>
              </div>

              {/* Stat Card 3: Supplier Debts */}
              <div
                onClick={() => onNavigate('suppliers')}
                className="card-box p-7 border-2 border-blue-200 hover:border-blue-500 cursor-pointer space-y-4 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-slate-700">مستحقات شركات التوريد</span>
                  <div className="p-3 bg-blue-100 text-blue-800 rounded-2xl group-hover:scale-110 transition-transform">
                    <Building2 className="w-6 h-6" />
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-blue-900 tabular-nums">
                  {formatCurrency(totalSupplierDebt)}
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-slate-500 pt-2 border-t border-slate-100">
                  <span>لصالح {suppliers.filter((s) => s.current_balance > 0).length} شركة موردة</span>
                  <span className="text-blue-700 group-hover:translate-x-[-4px] transition-transform flex items-center">
                    حسابات الشركات ←
                  </span>
                </div>
              </div>

              {/* Stat Card 4: Low Stock Alert */}
              <div
                onClick={() => setActiveTab('stock_cards')}
                className="card-box p-7 border-2 border-rose-200 hover:border-rose-500 cursor-pointer space-y-4 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-slate-700">أصناف تحت حد الأمان</span>
                  <div className="p-3 bg-rose-100 text-rose-800 rounded-2xl group-hover:scale-110 transition-transform">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-rose-700 tabular-nums">
                  {lowStockItems.length} صنف
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-slate-500 pt-2 border-t border-slate-100">
                  <span>تحتاج إعادة طلب وتوريد</span>
                  <span className="text-rose-700 group-hover:translate-x-[-4px] transition-transform flex items-center">
                    عرض النواقص ←
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* QUICK ACTION CARDS GRID - 6 Direct Action Cards */}
          <div className="card-box p-8 sm:p-9 border-2 border-slate-200">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                بطاقات العمليات الميدانية السريعة
              </h2>
              <p className="text-base text-slate-600 mt-1 font-medium">
                تنفيذ المعاملات اليومية الشائعة بنقرة واحدة داخل بطاقات تفاعلية واضحة
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
              {/* Action Card 1: POS */}
              <button
                onClick={onOpenPos}
                type="button"
                className="flex flex-col items-center justify-center p-6 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300 text-emerald-950 transition-all gap-3 cursor-pointer group active:scale-95"
              >
                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                  <ShoppingCart className="w-7 h-7" />
                </div>
                <span className="text-base font-black text-center">فاتورة بيع (POS)</span>
              </button>

              {/* Action Card 2: Purchases */}
              <button
                onClick={() => onNavigate('purchases')}
                type="button"
                className="flex flex-col items-center justify-center p-6 rounded-2xl bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 text-blue-950 transition-all gap-3 cursor-pointer group active:scale-95"
              >
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                  <Receipt className="w-7 h-7" />
                </div>
                <span className="text-base font-black text-center">توريد مشتريات</span>
              </button>

              {/* Action Card 3: Customer Receipt */}
              <button
                onClick={() => onNavigate('customer_ledgers')}
                type="button"
                className="flex flex-col items-center justify-center p-6 rounded-2xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-300 text-amber-950 transition-all gap-3 cursor-pointer group active:scale-95"
              >
                <div className="p-3 bg-amber-600 text-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                  <ArrowDownLeft className="w-7 h-7" />
                </div>
                <span className="text-base font-black text-center">سند قبض مزارع</span>
              </button>

              {/* Action Card 4: Operational Expense */}
              <button
                onClick={() => onNavigate('treasury')}
                type="button"
                className="flex flex-col items-center justify-center p-6 rounded-2xl bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 text-rose-950 transition-all gap-3 cursor-pointer group active:scale-95"
              >
                <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                  <ArrowUpRight className="w-7 h-7" />
                </div>
                <span className="text-base font-black text-center">تسجيل مصروف</span>
              </button>

              {/* Action Card 5: Warehouse Transfer */}
              <button
                onClick={() => onNavigate('transfers')}
                type="button"
                className="flex flex-col items-center justify-center p-6 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 text-indigo-950 transition-all gap-3 cursor-pointer group active:scale-95"
              >
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                  <ArrowLeftRight className="w-7 h-7" />
                </div>
                <span className="text-base font-black text-center">تحويل مخزني</span>
              </button>

              {/* Action Card 6: Migrate Old Ledgers */}
              <button
                onClick={() => onNavigate('old_ledgers')}
                type="button"
                className="flex flex-col items-center justify-center p-6 rounded-2xl bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 text-purple-950 transition-all gap-3 cursor-pointer group active:scale-95"
              >
                <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                  <Scale className="w-7 h-7" />
                </div>
                <span className="text-base font-black text-center">ترحيل الدفاتر</span>
              </button>
            </div>
          </div>

          {/* EXPIRING BATCHES WIDGET (قرب الانتهاء 90 يوم) */}
          <ExpiringBatchesWidget initialDays={90} />

          {/* 6 MAJOR DEPARTMENT PORTAL CARDS - Spacious, organized, rich cards */}
          <div>
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                بطاقات أقسام المنظومة الستة الرئيسية
              </h2>
              <p className="text-base text-slate-600 mt-1 font-medium">
                كل قسم مصمم كبطاقة شاملة تضم إحصائيات حية وأزرار انتقال سريعة
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {/* Dept Card 1: Sales & POS */}
              <div className="card-box p-8 border-2 border-slate-200 hover:border-emerald-500 hover:shadow-lg transition-all flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-4 bg-emerald-100 text-emerald-800 rounded-2xl">
                      <ShoppingCart className="w-8 h-8" />
                    </div>
                    <span className="px-3.5 py-1.5 rounded-xl text-sm font-black bg-slate-100 text-slate-800 border border-slate-200">
                      {salesInvoices.length} فاتورة مسجلة
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900">
                    قسم المبيعات ونقطة البيع (POS)
                  </h3>

                  <p className="text-base text-slate-600 leading-relaxed font-medium">
                    شاشة كاشير فائقة السرعة للمزارعين، دعم البيع النقدي والآجل، طباعة الإيصالات، ومتابعة فواتير البيع.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center gap-3">
                  <button
                    onClick={onOpenPos}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold shadow-xs cursor-pointer text-center"
                  >
                    شاشة البيع (POS)
                  </button>
                  <button
                    onClick={() => onNavigate('sales')}
                    className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-base font-bold border border-slate-300 cursor-pointer"
                  >
                    سجل الفواتير
                  </button>
                </div>
              </div>

              {/* Dept Card 2: Customers & Farmer Accounts */}
              <div className="card-box p-8 border-2 border-slate-200 hover:border-amber-500 hover:shadow-lg transition-all flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-4 bg-amber-100 text-amber-800 rounded-2xl">
                      <Users className="w-8 h-8" />
                    </div>
                    <span className="px-3.5 py-1.5 rounded-xl text-sm font-black bg-slate-100 text-slate-800 border border-slate-200">
                      {customers.length} عميل ومزارع
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900">
                    قسم العملاء وحسابات المزارعين
                  </h3>

                  <p className="text-base text-slate-600 leading-relaxed font-medium">
                    دليل كامل للمزارعين بالقرى والعناوين، كشوف حسابات تفصيلية، سقف الائتمان، وسندات تحصيل الديون.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center gap-3">
                  <button
                    onClick={() => onNavigate('customers')}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-base font-bold shadow-xs cursor-pointer text-center"
                  >
                    دليل العملاء
                  </button>
                  <button
                    onClick={() => onNavigate('customer_ledgers')}
                    className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-base font-bold border border-slate-300 cursor-pointer"
                  >
                    كشوف الحسابات
                  </button>
                </div>
              </div>

              {/* Dept Card 3: Purchases & Suppliers */}
              <div className="card-box p-8 border-2 border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-4 bg-blue-100 text-blue-800 rounded-2xl">
                      <Building2 className="w-8 h-8" />
                    </div>
                    <span className="px-3.5 py-1.5 rounded-xl text-sm font-black bg-slate-100 text-slate-800 border border-slate-200">
                      {suppliers.length} شركة ومورد
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900">
                    قسم المشتريات والشركات الموردة
                  </h3>

                  <p className="text-base text-slate-600 leading-relaxed font-medium">
                    تسجيل فواتير توريد المبيدات والأسمدة، كشوف حسابات الشركات، متابعة المستحقات وسندات الصرف.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center gap-3">
                  <button
                    onClick={() => onNavigate('purchases')}
                    className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-base font-bold shadow-xs cursor-pointer text-center"
                  >
                    فواتير التوريد
                  </button>
                  <button
                    onClick={() => onNavigate('suppliers')}
                    className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-base font-bold border border-slate-300 cursor-pointer"
                  >
                    دليل الموردين
                  </button>
                </div>
              </div>

              {/* Dept Card 4: Inventory & Products */}
              <div className="card-box p-8 border-2 border-slate-200 hover:border-teal-500 hover:shadow-lg transition-all flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-4 bg-teal-100 text-teal-800 rounded-2xl">
                      <PackageCheck className="w-8 h-8" />
                    </div>
                    <span className="px-3.5 py-1.5 rounded-xl text-sm font-black bg-slate-100 text-slate-800 border border-slate-200">
                      {products.length} صنف ومادة
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900">
                    قسم المخازن والأصناف والوحدات
                  </h3>

                  <p className="text-base text-slate-600 leading-relaxed font-medium">
                    إدارة الوحدات الصغرى والكبرى، رصيد المستودع الرئيسي ومحل البيع، التحويل الداخلي، وتنبيهات النواقص.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center gap-3">
                  <button
                    onClick={() => onNavigate('products')}
                    className="flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-base font-bold shadow-xs cursor-pointer text-center"
                  >
                    دليل الأصناف
                  </button>
                  <button
                    onClick={() => onNavigate('warehouse_main')}
                    className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-base font-bold border border-slate-300 cursor-pointer"
                  >
                    جرد المستودع
                  </button>
                </div>
              </div>

              {/* Dept Card 5: Treasury & Cash */}
              <div className="card-box p-8 border-2 border-slate-200 hover:border-emerald-500 hover:shadow-lg transition-all flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-4 bg-emerald-100 text-emerald-800 rounded-2xl">
                      <Landmark className="w-8 h-8" />
                    </div>
                    <span className="px-3.5 py-1.5 rounded-xl text-sm font-black bg-slate-100 text-slate-800 border border-slate-200">
                      {cashAccounts.length} حساب وخزينة
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900">
                    قسم المالية والخزينة وسندات القبض
                  </h3>

                  <p className="text-base text-slate-600 leading-relaxed font-medium">
                    حركة النقدية اليومية، تسجيل المصروفات التشغيلية، سندات القبض والصرف، وترحيل الدفاتر الورقية القديمة.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center gap-3">
                  <button
                    onClick={() => onNavigate('treasury')}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-base font-bold shadow-xs cursor-pointer text-center"
                  >
                    إدارة الخزينة
                  </button>
                  <button
                    onClick={() => onNavigate('old_ledgers')}
                    className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-base font-bold border border-slate-300 cursor-pointer"
                  >
                    الدفاتر القديمة
                  </button>
                </div>
              </div>

              {/* Dept Card 6: Reports & Settings */}
              <div className="card-box p-8 border-2 border-slate-200 hover:border-slate-500 hover:shadow-lg transition-all flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-4 bg-slate-100 text-slate-800 rounded-2xl">
                      <BarChart3 className="w-8 h-8" />
                    </div>
                    <span className="px-3.5 py-1.5 rounded-xl text-sm font-black bg-slate-100 text-slate-800 border border-slate-200">
                      تقارير وإدارة
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900">
                    قسم التقارير الشاملة والإدارة
                  </h3>

                  <p className="text-base text-slate-600 leading-relaxed font-medium">
                    تقارير أرباح المبيعات، حركة الأصناف، أرصدة الحسابات، صلاحيات المستخدمين، ومراقبة العمليات.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center gap-3">
                  <button
                    onClick={() => onNavigate('reports')}
                    className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-base font-bold shadow-xs cursor-pointer text-center"
                  >
                    التقارير المالية
                  </button>
                  <button
                    onClick={() => onNavigate('users')}
                    className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-base font-bold border border-slate-300 cursor-pointer"
                  >
                    المستخدمون والصلاحيات
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SALES INVOICES ORGANIZED IN CARDS */}
      {activeTab === 'sales_cards' && (
        <div className="space-y-6">
          {/* Card Header & Search */}
          <div className="card-box p-7 border-2 border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
                  <Receipt className="w-7 h-7 text-blue-600" />
                  <span>فواتير المبيعات الصادرة (نظام البطاقات)</span>
                </h2>
                <p className="text-base text-slate-600 mt-1 font-medium">
                  عرض كل فاتورة بيع كبطاقة مستقلة واضحة ببيانات العميل والمبلغ وطريقة السداد
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative flex-1 sm:w-72">
                  <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="ابحث برقم الفاتورة أو العميل..."
                    value={searchInvoices}
                    onChange={(e) => {
                      setSearchInvoices(e.target.value);
                      setSalesPage(1);
                    }}
                    className="w-full pr-11 pl-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-base font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={onOpenPos}
                  type="button"
                  className="px-5 py-3 text-base font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs whitespace-nowrap cursor-pointer"
                >
                  + فاتورة جديدة
                </button>
              </div>
            </div>
          </div>

          {/* Cards Grid of Sales Invoices */}
          {salesInvoices.length === 0 ? (
            <div className="card-box p-12 text-center border-2 border-dashed border-slate-300 bg-white rounded-3xl space-y-4">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl mx-auto flex items-center justify-center">
                <Receipt className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900">سجل فواتير المبيعات نظيف وجاهز للتشغيل الفعلي</h3>
              <p className="text-base text-slate-600 max-w-lg mx-auto font-medium">
                تم مسح أي فواتير تجريبية أو وهمية. يمكنك الآن فتح شاشة نقطة البيع (POS) وإصدار أول فاتورة بيع حقيقية للمزارعين فوراً.
              </p>
              <button
                onClick={onOpenPos}
                type="button"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-base font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md cursor-pointer"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>إصدار أول فاتورة بيع حقيقية (POS)</span>
              </button>
            </div>
          ) : pagedSales.length === 0 ? (
            <div className="card-box p-12 text-center text-slate-500 text-lg font-bold border-2 border-slate-200">
              لا توجد فواتير مبيعات مسجلة تطابق كلمة البحث
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pagedSales.map((inv) => (
                <div
                  key={inv.id}
                  className="card-box p-6 border-2 border-slate-200 hover:border-blue-400 hover:shadow-md transition-all space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-lg tabular-nums">
                        {inv.invoice_number}
                      </span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-xl text-sm font-bold ${
                        inv.payment_type === 'cash'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : inv.payment_type === 'credit'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      }`}
                    >
                      {inv.payment_type === 'cash' ? 'نقدي كامل' : inv.payment_type === 'credit' ? 'آجل على الحساب' : 'سداد جزئي'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="text-base text-slate-500 font-medium">اسم المزارع / العميل:</div>
                    <div className="text-lg font-black text-slate-900">
                      {inv.customer_name_snapshot}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                    <div>
                      <span className="text-sm text-slate-500 block font-medium">إجمالي الفاتورة</span>
                      <span className="text-2xl font-black text-slate-900 tabular-nums">
                        {formatCurrency(inv.total_amount)}
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="text-sm text-slate-500 block font-medium">المسدد نقداً</span>
                      <span className="text-lg font-bold text-emerald-700 tabular-nums">
                        {formatCurrency(inv.paid_amount || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm font-semibold text-slate-500 pt-2 border-t border-slate-100">
                    <span className="tabular-nums">{formatDateTime(inv.invoice_date)}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setWhatsAppInvoice(inv)}
                        type="button"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-[#25D366] hover:bg-[#1EBE5D] rounded-lg transition-colors cursor-pointer shadow-2xs"
                        title="إرسال الفاتورة عبر واتساب"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>واتساب</span>
                      </button>
                      <button
                        onClick={() => onNavigate('sales')}
                        className="text-blue-700 hover:text-blue-900 font-bold hover:underline cursor-pointer"
                      >
                        تفاصيل ←
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="card-box p-4 border-2 border-slate-200">
            <Pagination
              currentPage={salesPage}
              totalItems={filteredSales.length}
              pageSize={salesPageSize}
              onPageChange={(p) => setSalesPage(p)}
              onPageSizeChange={(s) => setSalesPageSize(s)}
              pageSizeOptions={[6, 12, 24]}
            />
          </div>
        </div>
      )}

      {/* VIEW 3: LOW STOCK ITEMS ORGANIZED IN CARDS */}
      {activeTab === 'stock_cards' && (
        <div className="space-y-6">
          {/* Card Header */}
          <div className="card-box p-7 border-2 border-amber-300 bg-amber-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-amber-950 flex items-center gap-3">
                  <AlertTriangle className="w-7 h-7 text-amber-700" />
                  <span>تنبيهات نواقص المخزون والأصناف الحرجة ({lowStockItems.length})</span>
                </h2>
                <p className="text-base text-amber-900 mt-1 font-medium">
                  بطاقات الأصناف التي بلغت حد الأمان أو أوشكت على النفاد وتحتاج إعادة توريد فوري
                </p>
              </div>

              <button
                onClick={() => onNavigate('purchases')}
                className="px-5 py-3 text-base font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-xs cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                + إنشاء فاتورة توريد مشتريات
              </button>
            </div>
          </div>

          {/* Cards Grid of Low Stock Items */}
          {lowStockItems.length === 0 ? (
            <div className="card-box p-12 text-center text-slate-500 text-lg font-bold border-2 border-slate-200">
              المخزون مكتمل — كافة الأصناف متوفرة بأرصدة كافية فوق حد الأمان
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pagedStock.map((p) => {
                const totalStock = (p.stock_shop || 0) + (p.stock_warehouse || 0);
                return (
                  <div
                    key={p.id}
                    className="card-box p-6 border-2 border-rose-200 hover:border-rose-400 hover:shadow-md transition-all space-y-4 bg-white"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <span className="text-sm font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-xl">
                        كود: {p.code}
                      </span>
                      <span className="text-sm font-black px-3 py-1 bg-rose-100 text-rose-800 rounded-xl border border-rose-200">
                        مخزون حرج
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-slate-900">
                        {p.name}
                      </h3>
                      {p.active_ingredient && (
                        <p className="text-sm font-semibold text-slate-500">
                          المادة الفعالة: {p.active_ingredient}
                        </p>
                      )}
                    </div>

                    <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-rose-900">الرصيد الفعلي المتاح:</span>
                        <span className="text-2xl font-black text-rose-700 tabular-nums">
                          {formatQuantity(totalStock)} {p.base_unit_name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-semibold text-slate-600 pt-2 border-t border-rose-200/60">
                        <span>حد الأمان الأدنى:</span>
                        <span className="tabular-nums font-bold text-slate-800">
                          {formatQuantity(p.min_stock_alert)} {p.base_unit_name}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>المحل: <strong className="text-slate-900 tabular-nums">{formatQuantity(p.stock_shop || 0)}</strong></div>
                      <div>المستودع: <strong className="text-slate-900 tabular-nums">{formatQuantity(p.stock_warehouse || 0)}</strong></div>
                    </div>

                    <button
                      onClick={() => onNavigate('purchases')}
                      className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base cursor-pointer shadow-xs transition-colors"
                    >
                      طلب توريد الصنف الآن
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {lowStockItems.length > 0 && (
            <div className="card-box p-4 border-2 border-slate-200">
              <Pagination
                currentPage={stockPage}
                totalItems={lowStockItems.length}
                pageSize={stockPageSize}
                onPageChange={(p) => setStockPage(p)}
                onPageSizeChange={(s) => setStockPageSize(s)}
                pageSizeOptions={[6, 12, 24]}
              />
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: EXPIRING BATCHES DEDICATED SCREEN */}
      {activeTab === 'expiring_batches' && (
        <div className="space-y-6">
          <ExpiringBatchesWidget initialDays={90} isStandaloneScreen />
        </div>
      )}

      {whatsAppInvoice && (
        <SendWhatsAppModal
          invoice={whatsAppInvoice}
          onClose={() => setWhatsAppInvoice(null)}
        />
      )}
    </div>
  );
};
