import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Coins,
  Users,
  Building2,
  AlertTriangle,
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
  Store,
  ShoppingBag,
  Pill,
} from 'lucide-react';
import { storage } from '../../lib/storage';
import { formatCurrency, formatQuantity, formatDateTime } from '../../lib/formatters';
interface DashboardOverviewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigate,
}) => {
  const [, setDataTick] = useState(0);

  useEffect(() => {
    const handleStorageUpdate = () => {
      setDataTick((t) => t + 1);
    };
    const unsubscribe = storage.subscribe(handleStorageUpdate);
    return () => unsubscribe();
  }, []);

  const products = storage.getProducts();
  const customers = storage.getCustomers();
  const cashAccounts = storage.getCashAccounts();

  const totalCash = cashAccounts.reduce((s, c) => s + (c.current_balance || 0), 0);
  const totalCustomerDebt = customers.reduce((s, c) => s + Math.max(0, c.current_balance), 0);
  const debtorCustomersCount = customers.filter((c) => c.current_balance > 0.01).length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            لوحة المؤشرات والعمليات
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            متابعة مديونيات العملاء، حركة الخزينة، دليل العملاء، وقائمة الأصناف والأدوية
          </p>
        </div>

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
          className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl cursor-pointer transition-all active:scale-95 whitespace-nowrap self-start sm:self-auto"
        >
          <RotateCcw className="w-4 h-4 text-emerald-600" />
          <span>تحديث ومزامنة البيانات</span>
        </button>
      </div>

      <div className="space-y-8 sm:space-y-10">
        {/* STATS CARDS GRID - 4 Master Indicator Cards */}
        <div>
            <div className="mb-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                مؤشرات السيولة والديون والمبيعات
              </h2>
              <p className="text-base text-slate-600 mt-1 font-medium">
                بطاقات إحصائية رئيسية تعرض الموقف المالي وحسابات المزارعين والمبيعات
              </p>
            </div>

            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
              {/* Stat Card 1: Treasury */}
              <div
                onClick={() => onNavigate('treasury')}
                className="card-box p-4 sm:p-7 border-2 border-emerald-200 hover:border-emerald-500 cursor-pointer space-y-3 sm:space-y-4 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-base font-bold text-slate-700">سيولة الخزائن النقدية</span>
                  <div className="p-2 sm:p-3 bg-emerald-100 text-emerald-800 rounded-2xl group-hover:scale-110 transition-transform">
                    <Coins className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-800 tabular-nums">
                  {formatCurrency(totalCash)}
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-500 pt-2 border-t border-slate-100">
                  <span>في {cashAccounts.length} خزينة ودرج</span>
                  <span className="text-emerald-700 group-hover:translate-x-[-4px] transition-transform flex items-center">
                    صفحة قسم الخزينة ←
                  </span>
                </div>
              </div>

              {/* Stat Card 2: Customer Debts */}
              <div
                onClick={() => onNavigate('debts')}
                className="card-box p-4 sm:p-7 border-2 border-amber-200 hover:border-amber-500 cursor-pointer space-y-3 sm:space-y-4 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-base font-bold text-slate-700">مديونيات العملاء والمزارعين</span>
                  <div className="p-2 sm:p-3 bg-amber-100 text-amber-800 rounded-2xl group-hover:scale-110 transition-transform">
                    <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-amber-800 tabular-nums">
                  {formatCurrency(totalCustomerDebt)}
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-500 pt-2 border-t border-slate-100">
                  <span>على {customers.filter((c) => c.current_balance > 0).length} مزارع مدين</span>
                  <span className="text-amber-700 group-hover:translate-x-[-4px] transition-transform flex items-center">
                    صفحة قسم المديونيات ←
                  </span>
                </div>
              </div>

              {/* Stat Card 3: Registered Customers */}
              <div
                onClick={() => onNavigate('customers')}
                className="card-box p-4 sm:p-7 border-2 border-blue-200 hover:border-blue-500 cursor-pointer space-y-3 sm:space-y-4 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-base font-bold text-slate-700">سجل العملاء والمزارعين</span>
                  <div className="p-2 sm:p-3 bg-blue-100 text-blue-800 rounded-2xl group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-blue-900 tabular-nums">
                  {customers.length} عميل
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-500 pt-2 border-t border-slate-100">
                  <span>عملاء ومزارعين مسجلين</span>
                  <span className="text-blue-700 group-hover:translate-x-[-4px] transition-transform flex items-center">
                    دليل العملاء ←
                  </span>
                </div>
              </div>

              {/* Stat Card 4: Products / Medicines */}
              <div
                onClick={() => onNavigate('products')}
                className="card-box p-4 sm:p-7 border-2 border-teal-200 hover:border-teal-500 cursor-pointer space-y-3 sm:space-y-4 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-base font-bold text-slate-700">قسم الأصناف والأدوية</span>
                  <div className="p-2 sm:p-3 bg-teal-100 text-teal-800 rounded-2xl group-hover:scale-110 transition-transform">
                    <Pill className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-teal-800 tabular-nums">
                  {products.length} دواء
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-500 pt-2 border-t border-slate-100">
                  <span>أسماء الأدوية المضافة</span>
                  <span className="text-teal-700 group-hover:translate-x-[-4px] transition-transform flex items-center">
                    قائمة الأصناف ←
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* QUICK ACTION CARDS GRID - 6 Direct Action Cards */}
          <div className="card-box p-4 sm:p-8 border-2 border-slate-200">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-2xl font-black text-slate-900">
                بطاقات العمليات الميدانية السريعة
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5 font-medium">
                تنفيذ المعاملات اليومية الشائعة بنقرة واحدة داخل بطاقات تفاعلية واضحة
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-5">
              {/* Action Card 1: Debts */}
              <button
                onClick={() => onNavigate('debts')}
                type="button"
                className="flex flex-col items-center justify-center p-3 sm:p-6 rounded-2xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 text-amber-950 transition-all gap-2 sm:gap-3 cursor-pointer group active:scale-95"
              >
                <div className="p-2 sm:p-3 bg-amber-600 text-white rounded-xl sm:rounded-2xl shadow-xs group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-5 h-5 sm:w-7 sm:h-7" />
                </div>
                <span className="text-xs sm:text-base font-black text-center truncate w-full">قسم مديونيات العملاء</span>
              </button>

              {/* Action Card 2: Customers Directory */}
              <button
                onClick={() => onNavigate('customers')}
                type="button"
                className="flex flex-col items-center justify-center p-3 sm:p-6 rounded-2xl bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 text-blue-950 transition-all gap-2 sm:gap-3 cursor-pointer group active:scale-95"
              >
                <div className="p-2 sm:p-3 bg-blue-600 text-white rounded-xl sm:rounded-2xl shadow-xs group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 sm:w-7 sm:h-7" />
                </div>
                <span className="text-xs sm:text-base font-black text-center truncate w-full">قسم العملاء</span>
              </button>

              {/* Action Card 3: Medicines */}
              <button
                onClick={() => onNavigate('products')}
                type="button"
                className="flex flex-col items-center justify-center p-3 sm:p-6 rounded-2xl bg-teal-50 hover:bg-teal-100 border-2 border-teal-200 text-teal-950 transition-all gap-2 sm:gap-3 cursor-pointer group active:scale-95"
              >
                <div className="p-2 sm:p-3 bg-teal-600 text-white rounded-xl sm:rounded-2xl shadow-xs group-hover:scale-110 transition-transform">
                  <Pill className="w-5 h-5 sm:w-7 sm:h-7" />
                </div>
                <span className="text-xs sm:text-base font-black text-center truncate w-full">قسم الأصناف</span>
              </button>

              {/* Action Card 4: Treasury */}
              <button
                onClick={() => onNavigate('treasury')}
                type="button"
                className="flex flex-col items-center justify-center p-3 sm:p-6 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300 text-emerald-950 transition-all gap-2 sm:gap-3 cursor-pointer group active:scale-95"
              >
                <div className="p-2 sm:p-3 bg-emerald-600 text-white rounded-xl sm:rounded-2xl shadow-xs group-hover:scale-110 transition-transform">
                  <Coins className="w-5 h-5 sm:w-7 sm:h-7" />
                </div>
                <span className="text-xs sm:text-base font-black text-center truncate w-full">قسم الخزينة</span>
              </button>

              {/* Action Card 5: Reports */}
              <button
                onClick={() => onNavigate('reports')}
                type="button"
                className="flex flex-col items-center justify-center p-3 sm:p-6 rounded-2xl bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 text-rose-950 transition-all gap-2 sm:gap-3 cursor-pointer group active:scale-95"
              >
                <div className="p-2 sm:p-3 bg-rose-600 text-white rounded-xl sm:rounded-2xl shadow-xs group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-5 h-5 sm:w-7 sm:h-7" />
                </div>
                <span className="text-xs sm:text-base font-black text-center truncate w-full">قسم التقارير</span>
              </button>
            </div>
          </div>

          {/* MAJOR DEPARTMENT PORTAL CARDS - Spacious, organized, rich cards */}
          <div>
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                بطاقات أقسام المنظومة الرئيسية
              </h2>
              <p className="text-base text-slate-600 mt-1 font-medium">
                كل قسم مصمم كبطاقة شاملة تضم إحصائيات حية وأزرار انتقال سريعة
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {/* Dept Card 1: Debts */}
              <div className="card-box p-8 border-2 border-slate-200 hover:border-amber-500 hover:shadow-lg transition-all flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-4 bg-amber-100 text-amber-800 rounded-2xl">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <span className="px-3.5 py-1.5 rounded-xl text-sm font-black bg-amber-50 text-amber-900 border border-amber-200 tabular-nums">
                      {formatCurrency(totalCustomerDebt)}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900">
                    قسم مديونيات العملاء
                  </h3>

                  <p className="text-base text-slate-600 leading-relaxed font-medium">
                    إضافة المديونية بكتابة المبلغ واسم الشيء المشترى وتاريخ الشراء، مع متابعة كشوف الحسابات وسندات القبض.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center gap-3">
                  <button
                    onClick={() => onNavigate('debts')}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-base font-bold shadow-xs cursor-pointer text-center"
                  >
                    سجل مديونيات العملاء
                  </button>
                </div>
              </div>

              {/* Dept Card 2: Customers */}
              <div className="card-box p-8 border-2 border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-4 bg-blue-100 text-blue-800 rounded-2xl">
                      <Users className="w-8 h-8" />
                    </div>
                    <span className="px-3.5 py-1.5 rounded-xl text-sm font-black bg-slate-100 text-slate-800 border border-slate-200">
                      {customers.length} عميل ومزارع
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900">
                    قسم العملاء
                  </h3>

                  <p className="text-base text-slate-600 leading-relaxed font-medium">
                    دليل كامل للعملاء والمزارعين بالقرى والعناوين وأرقام الهواتف وأسماء الشركاء ومتابعة بياناتهم.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center gap-3">
                  <button
                    onClick={() => onNavigate('customers')}
                    className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-base font-bold shadow-xs cursor-pointer text-center"
                  >
                    دليل العملاء
                  </button>
                </div>
              </div>

              {/* Dept Card 3: Products / Medicines */}
              <div className="card-box p-8 border-2 border-slate-200 hover:border-teal-500 hover:shadow-lg transition-all flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-4 bg-teal-100 text-teal-800 rounded-2xl">
                      <Pill className="w-8 h-8" />
                    </div>
                    <span className="px-3.5 py-1.5 rounded-xl text-sm font-black bg-slate-100 text-slate-800 border border-slate-200">
                      {products.length} دواء مسجل
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900">
                    قسم الأصناف والأدوية
                  </h3>

                  <p className="text-base text-slate-600 leading-relaxed font-medium">
                    قائمة بأسماء الأدوية والمبيدات والأسمدة المضافة فقط، مع إمكانية إضافة وتعديل أسماء الأدوية بسرعة وسهولة.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center gap-3">
                  <button
                    onClick={() => onNavigate('products')}
                    className="flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-base font-bold shadow-xs cursor-pointer text-center"
                  >
                    قائمة أسماء الأدوية
                  </button>
                </div>
              </div>

              {/* Dept Card 4: Treasury & Cash */}
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

              {/* Dept Card 5: Reports & Settings */}
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
                    تقارير المبيعات والأرباح، حركة التحصيلات، ديون المزارعين، صلاحيات المستخدمين، ومراقبة العمليات.
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
    </div>
  );
};

