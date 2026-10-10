import React, { useState, useEffect } from 'react';
import {
  Landmark,
  BadgeDollarSign,
  BookOpenCheck,
  LayoutGrid,
  Coins,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Building,
} from 'lucide-react';
import { DepartmentHeader, DepartmentTabItem } from './DepartmentHeader';
import { TreasuryScreen } from '../treasury/TreasuryScreen';
import { OldLedgersScreen } from '../old_ledgers/OldLedgersScreen';
import { storage } from '../../lib/storage';
import { CashAccount } from '../../types/database';
import { formatCurrency } from '../../lib/formatters';

interface TreasuryDeptPageProps {
  initialSubTab?: string;
  onNavigateHome: () => void;
}

export const TreasuryDeptPage: React.FC<TreasuryDeptPageProps> = ({
  initialSubTab = 'overview',
  onNavigateHome,
}) => {
  const [subTab, setSubTab] = useState<string>(initialSubTab);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);

  useEffect(() => {
    loadData();
    const unsub = storage.subscribe(loadData);
    return () => unsub();
  }, []);

  const loadData = () => {
    setCashAccounts(storage.getCashAccounts());
  };

  const totalCashBalance = cashAccounts.reduce((sum, c) => sum + (c.current_balance || 0), 0);
  const mainTreasury = cashAccounts.find((c) => c.is_primary) || cashAccounts[0];
  const shopDrawer = cashAccounts.find((c) => !c.is_primary) || cashAccounts[1] || cashAccounts[0];

  const tabs: DepartmentTabItem[] = [
    { id: 'overview', label: 'نظرة عامة على الخزينة والسيولة', icon: LayoutGrid },
    { id: 'treasury_main', label: 'الخزينة والمصروفات وسندات النقدية', icon: Landmark },
    { id: 'old_ledgers', label: 'ترحيل الدفاتر القديمة', icon: BookOpenCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Department Master Header */}
      <DepartmentHeader
        deptId="treasury_dept"
        title="قسم المالية والخزينة والنقدية"
        subtitle="إدارة السيولة النقدية، حركات القبض والصرف، المصروفات اليومية، وأرصدة الخزائن والأدراج"
        tagline="سندات القبض والصرف واليومية"
        icon={Landmark}
        themeColor="purple"
        tabs={tabs}
        activeSubTab={subTab}
        onSelectSubTab={(tab) => setSubTab(tab)}
        onNavigateHome={onNavigateHome}
        extraActions={
          <>
            <button
              onClick={() => setSubTab('treasury_main')}
              type="button"
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Coins className="w-4 h-4" />
              <span>إدارة النقدية والمصروفات</span>
            </button>
            <button
              onClick={() => setSubTab('old_ledgers')}
              type="button"
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              <BookOpenCheck className="w-4 h-4 text-purple-700" />
              <span>الدفاتر القديمة</span>
            </button>
          </>
        }
      />

      {/* VIEW 1: Overview */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Department KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* KPI 1: Total Cash Liquidity */}
            <div className="card-box p-5 sm:p-6 border-2 border-purple-300/80 bg-gradient-to-br from-purple-50/70 via-white to-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">السيولة النقدية الإجمالية</span>
                <div className="p-2.5 bg-purple-100 text-purple-900 rounded-xl">
                  <Coins className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-purple-950 tabular-nums">
                {formatCurrency(totalCashBalance)}
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>في جميع الخزائن والأدراج</span>
                <span className="text-purple-800 font-bold">الرصيد الفعلي</span>
              </div>
            </div>

            {/* KPI 2: Main Vault */}
            <div className="card-box p-5 sm:p-6 border-2 border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">رصيد الخزينة الرئيسية</span>
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Building className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-950 tabular-nums">
                {formatCurrency(mainTreasury?.current_balance || 0)}
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>خزينة المركز الأساسية</span>
                <span className="text-emerald-700 font-bold">الخزينة العامة</span>
              </div>
            </div>

            {/* KPI 3: Shop Drawer */}
            <div className="card-box p-5 sm:p-6 border-2 border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">رصيد درج كاشير المحل</span>
                <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-blue-900 tabular-nums">
                {formatCurrency(shopDrawer?.current_balance || 0)}
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>متحصلات نقطة البيع اليومية</span>
                <span className="text-blue-700 font-bold">درج النقدية</span>
              </div>
            </div>

            {/* KPI 4: Accounts Count */}
            <div className="card-box p-5 sm:p-6 border-2 border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">حسابات النقدية والعهدة</span>
                <div className="p-2.5 bg-teal-100 text-teal-800 rounded-xl">
                  <Landmark className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-teal-900 tabular-nums">
                {cashAccounts.length} حسابات
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>خزائن، أدراج وعهدة مالية</span>
                <span className="text-teal-700 font-bold">نشطة بالكامل</span>
              </div>
            </div>
          </div>

          {/* Cash Accounts Breakdown Cards */}
          <div className="card-box p-6 border-2 border-slate-200 bg-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  تفاصيل وأرصدة حسابات النقدية المسجلة
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  أرصدة كل خزينة وموقع حفظ أموال في المنظومة
                </p>
              </div>

              <button
                onClick={() => setSubTab('treasury_main')}
                type="button"
                className="text-xs font-bold text-purple-700 hover:underline"
              >
                شاشة الخزينة الكاملة والسندات ←
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cashAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-slate-900">{acc.name}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md">
                      {acc.is_primary ? 'خزينة رئيسية' : acc.account_type === 'cash' ? 'درج كاشير' : 'حساب بنكي'}
                    </span>
                  </div>
                  <div className="text-xl font-black text-slate-900 tabular-nums">
                    {formatCurrency(acc.current_balance)}
                  </div>
                  <div className="text-xs text-slate-500 flex justify-between items-center pt-2 border-t border-slate-200/60">
                    <span>حالة الحساب:</span>
                    <span className="font-bold text-emerald-700">
                      {acc.is_active ? 'نشط ويعمل' : 'معطل'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Treasury Main */}
      {subTab === 'treasury_main' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-purple-50/80 border border-purple-200 p-3 rounded-2xl">
            <span className="text-xs sm:text-sm font-bold text-purple-950 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-purple-700" />
              حركات الخزينة والمصروفات اليومية وسندات القبض والصرف
            </span>
            <button
              onClick={() => setSubTab('overview')}
              type="button"
              className="text-xs font-bold text-purple-900 hover:text-purple-950 underline cursor-pointer"
            >
              العودة للوحة قسم المالية
            </button>
          </div>
          <TreasuryScreen />
        </div>
      )}

      {/* VIEW 3: Old Ledgers */}
      {subTab === 'old_ledgers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-2xl">
            <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
              <BookOpenCheck className="w-4 h-4 text-slate-600" />
              أرشفة وترحيل الدفاتر الورقية القديمة وحسابات ما قبل المنظومة
            </span>
            <button
              onClick={() => setSubTab('overview')}
              type="button"
              className="text-xs font-bold text-slate-700 hover:text-slate-950 underline cursor-pointer"
            >
              العودة للوحة قسم المالية
            </button>
          </div>
          <OldLedgersScreen />
        </div>
      )}
    </div>
  );
};
