import React, { useState, useEffect } from 'react';
import {
  Users,
  FileSpreadsheet,
  LayoutGrid,
  AlertTriangle,
  Coins,
  Plus,
  Search,
  Phone,
  ArrowLeft,
  UserCheck,
} from 'lucide-react';
import { DepartmentHeader, DepartmentTabItem } from './DepartmentHeader';
import { CustomersList } from '../customers/CustomersList';
import { CustomerAccountsReport } from '../customers/CustomerAccountsReport';
import { CustomerModal } from '../customers/CustomerModal';
import { storage } from '../../lib/storage';
import { Customer } from '../../types/database';
import { formatCurrency } from '../../lib/formatters';

interface CustomersDeptPageProps {
  initialSubTab?: string;
  onNavigateHome: () => void;
}

export const CustomersDeptPage: React.FC<CustomersDeptPageProps> = ({
  initialSubTab = 'overview',
  onNavigateHome,
}) => {
  const [subTab, setSubTab] = useState<string>(initialSubTab);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
    const unsub = storage.subscribe(loadData);
    return () => unsub();
  }, []);

  const loadData = () => {
    setCustomers(storage.getCustomers());
  };

  // Compute live KPIs for Customers Department
  const totalReceivables = customers.reduce((sum, c) => sum + Math.max(0, c.current_balance), 0);
  const debtorCustomers = customers.filter((c) => c.current_balance > 0);
  const overCreditLimit = customers.filter(
    (c) => c.credit_limit && c.credit_limit > 0 && c.current_balance > c.credit_limit
  );

  const tabs: DepartmentTabItem[] = [
    { id: 'overview', label: 'نظرة عامة على ديون وحسابات العملاء', icon: LayoutGrid },
    { id: 'customers_list', label: 'دليل وسجل العملاء والمزارعين', icon: Users, count: customers.length },
    { id: 'ledgers', label: 'كشوف الحسابات والمديونيات', icon: FileSpreadsheet, count: debtorCustomers.length },
  ];

  // Top Debtors
  const topDebtors = [...debtorCustomers]
    .sort((a, b) => b.current_balance - a.current_balance)
    .filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.village_or_address && c.village_or_address.toLowerCase().includes(q))
      );
    })
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Department Master Header */}
      <DepartmentHeader
        deptId="customers_dept"
        title="قسم العملاء وحسابات المزارعين"
        subtitle="إدارة دليل العملاء، كشوف الحسابات التفصيلية، سقف الائتمان ومتابعة المديونيات الزراعية"
        tagline="متابعة ديون المزارعين وسقف الائتمان"
        icon={Users}
        themeColor="amber"
        tabs={tabs}
        activeSubTab={subTab}
        onSelectSubTab={(tab) => setSubTab(tab)}
        onNavigateHome={onNavigateHome}
        extraActions={
          <>
            <button
              onClick={() => setModalOpen(true)}
              type="button"
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عميل جديد</span>
            </button>
            <button
              onClick={() => setSubTab('ledgers')}
              type="button"
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-700" />
              <span>كشوف الحسابات</span>
            </button>
          </>
        }
      />

      {/* VIEW 1: Overview */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Department KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* KPI 1: Total Receivables */}
            <div className="card-box p-5 sm:p-6 border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/70 via-white to-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">إجمالي المديونيات المستحقة</span>
                <div className="p-2.5 bg-amber-100 text-amber-900 rounded-xl">
                  <Coins className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-950 tabular-nums">
                {formatCurrency(totalReceivables)}
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>أموال مستحقة للفرع</span>
                <span className="text-amber-800 font-bold">في ذمة المزارعين</span>
              </div>
            </div>

            {/* KPI 2: Total Customers */}
            <div className="card-box p-5 sm:p-6 border-2 border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">إجمالي العملاء والمزارعين</span>
                <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                {customers.length} عميل
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>قاعدة العملاء المسجلة</span>
                <span className="text-blue-700 font-bold">نشط بالمنظومة</span>
              </div>
            </div>

            {/* KPI 3: Debtor Count */}
            <div className="card-box p-5 sm:p-6 border-2 border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">عدد المزارعين المدينين</span>
                <div className="p-2.5 bg-rose-100 text-rose-800 rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-700 tabular-nums">
                {debtorCustomers.length} مزارع
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>عليهم مبالغ متبقية</span>
                <span className="text-rose-700 font-bold">حسابات نشطة</span>
              </div>
            </div>

            {/* KPI 4: Over Credit Limit */}
            <div className="card-box p-5 sm:p-6 border-2 border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">تجاوز سقف الائتمان</span>
                <div className="p-2.5 bg-red-100 text-red-800 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-red-700 tabular-nums">
                {overCreditLimit.length} عميل
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>تجاوزوا الحد الأقصى للدين</span>
                <span className="text-red-700 font-bold">تحذير أمان</span>
              </div>
            </div>
          </div>

          {/* Top Debtors Table */}
          <div className="card-box p-6 border-2 border-slate-200 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  أعلى المديونيات المستحقة على العملاء
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  قائمة بأكبر الحسابات المدينة للمتابعة والتحصيل الفوري
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث باسم العميل أو القرية..."
                    className="w-full text-xs pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <button
                  onClick={() => setSubTab('ledgers')}
                  type="button"
                  className="text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 transition-colors"
                >
                  كشوف الحسابات الكاملة ←
                </button>
              </div>
            </div>

            {topDebtors.length === 0 ? (
              <div className="text-center py-12 text-slate-500 space-y-3">
                <Users className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="font-bold text-sm">لا توجد مديونيات مستحقة على العملاء حالياً، الحسابات متوازنة تماماً</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3">كود العميل</th>
                      <th className="py-3 px-3">اسم المزارع / العميل</th>
                      <th className="py-3 px-3">القرية أو العنوان</th>
                      <th className="py-3 px-3">رقم الهاتف</th>
                      <th className="py-3 px-3">سقف الائتمان</th>
                      <th className="py-3 px-3">الرصيد المستحق (المديونية)</th>
                      <th className="py-3 px-3 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topDebtors.map((c) => {
                      const isOver = c.credit_limit && c.credit_limit > 0 && c.current_balance > c.credit_limit;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-slate-700">
                            {c.code}
                          </td>
                          <td className="py-3 px-3 font-black text-slate-900">
                            {c.name}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {c.village_or_address || '—'}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600">
                            {c.phone ? (
                              <a
                                href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                              >
                                <Phone className="w-3 h-3" />
                                {c.phone}
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-600 tabular-nums">
                            {c.credit_limit ? formatCurrency(c.credit_limit) : 'غير محدد'}
                          </td>
                          <td className="py-3 px-3 font-black tabular-nums">
                            <span className="text-amber-800 text-sm">{formatCurrency(c.current_balance)}</span>
                            {isOver && (
                              <span className="mr-2 text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-black">
                                متجاوز
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => setSubTab('ledgers')}
                              type="button"
                              className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-lg transition-colors"
                            >
                              كشف الحساب
                            </button>
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

      {/* VIEW 2: Customers List */}
      {subTab === 'customers_list' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-amber-50/80 border border-amber-200 p-3 rounded-2xl">
            <span className="text-xs sm:text-sm font-bold text-amber-950 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-700" />
              دليل العملاء والمزارعين وبيانات الاتصال
            </span>
            <button
              onClick={() => setSubTab('overview')}
              type="button"
              className="text-xs font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer"
            >
              العودة للوحة قسم العملاء
            </button>
          </div>
          <CustomersList initialOpenLedger={false} />
        </div>
      )}

      {/* VIEW 3: Ledgers */}
      {subTab === 'ledgers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-2xl">
            <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-slate-600" />
              كشوف الحسابات التفصيلية وأعمار الديون
            </span>
            <button
              onClick={() => setSubTab('overview')}
              type="button"
              className="text-xs font-bold text-slate-700 hover:text-slate-950 underline cursor-pointer"
            >
              العودة للوحة قسم العملاء
            </button>
          </div>
          <CustomerAccountsReport />
        </div>
      )}

      {/* Add Customer Modal */}
      {modalOpen && (
        <CustomerModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
};
