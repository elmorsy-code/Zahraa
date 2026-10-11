import React, { useState, useEffect } from 'react';
import {
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Receipt,
  Search,
  Landmark,
  CreditCard,
  History,
} from 'lucide-react';
import { CashAccount, CashTransaction, Expense } from '../../types/database';
import { storage } from '../../lib/storage';
import { formatCurrency, formatDateTime } from '../../lib/formatters';
import { ExpenseModal } from './ExpenseModal';
import { authService } from '../../lib/auth';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { Trash2 } from 'lucide-react';

interface TreasuryScreenProps {
  onOpenCustomerPayment?: () => void;
  onOpenSupplierPayment?: () => void;
}

export const TreasuryScreen: React.FC<TreasuryScreenProps> = ({
  onOpenCustomerPayment,
  onOpenSupplierPayment,
}) => {
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const isAdmin = authService.getCurrentUser()?.role === 'admin';
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'transactions' | 'expenses'>('transactions');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'in' | 'out'>('all');

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const loadData = () => {
    setCashAccounts(storage.getCashAccounts());
    setTransactions(storage.getCashTransactions());
    setExpenses(storage.getExpenses());
  };

  const totalBalance = cashAccounts.reduce((sum, c) => sum + (c.current_balance || 0), 0);

  const totalInflow = transactions
    .filter((t) => t.direction === 'in')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalOutflow = transactions
    .filter((t) => t.direction === 'out')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const filteredTransactions = transactions.filter((t) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.transaction_number.toLowerCase().includes(q) ||
      (t.party_name && t.party_name.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q));

    const matchesDir = directionFilter === 'all' || t.direction === directionFilter;
    return matchesSearch && matchesDir;
  });

  return (
    <div className="space-y-4">
      {/* Treasury Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="md:col-span-2 bg-gradient-to-r from-emerald-800 to-slate-900 text-white p-6 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-xs sm:text-sm text-emerald-200 font-medium">إجمالي السيولة النقدية والبنكية</span>
            <Coins className="w-6 h-6 text-emerald-300" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tabular-nums mb-3">
            {formatCurrency(totalBalance)}
          </div>
          <div className="flex flex-wrap gap-2.5 text-xs text-slate-300 pt-3 border-t border-white/10">
            {cashAccounts.map((acc) => (
              <span key={acc.id} className="bg-white/10 px-3 py-1 rounded-lg">
                {acc.name}: <strong className="tabular-nums font-bold text-white mr-1">{formatCurrency(acc.current_balance)}</strong>
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs sm:text-sm">
            <span>إجمالي المقبوضات (وارد)</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700 tabular-nums mt-2.5">
            {formatCurrency(totalInflow)}
          </div>
          <span className="text-xs text-slate-400 mt-1.5">مبيعات نقدية + تحصيلات عملاء</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs sm:text-sm">
            <span>إجمالي المدفوعات (منصرف)</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-700 tabular-nums mt-2.5">
            {formatCurrency(totalOutflow)}
          </div>
          <span className="text-xs text-slate-400 mt-1.5">سداد موردين + مصروفات تشغيل</span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        {/* Sub-tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'transactions'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            سجل حركات الخزينة ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'expenses'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            المصروفات التشغيلية ({expenses.length})
          </button>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpenseModalOpen(true)}
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-xs transition-colors"
          >
            <Receipt className="w-4 h-4" />
            <span>+ تسجيل مصروف تشغيلي</span>
          </button>
        </div>
      </div>

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="relative min-w-[220px]">
              <Search className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث برقم الحركة، الطرف، البيان..."
                className="w-full pr-8 pl-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setDirectionFilter('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium ${
                  directionFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setDirectionFilter('in')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium ${
                  directionFilter === 'in' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                المقبوضات (وارد)
              </button>
              <button
                onClick={() => setDirectionFilter('out')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium ${
                  directionFilter === 'out' ? 'bg-rose-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                المدفوعات (منصرف)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-3.5 px-4">رقم الحركة</th>
                  <th className="py-3.5 px-4">التاريخ والوقت</th>
                  <th className="py-3.5 px-4">الخزينة / الحساب</th>
                  <th className="py-3.5 px-4">نوع الحركة</th>
                  <th className="py-3.5 px-4">الطرف المرتبط</th>
                  <th className="py-3.5 px-4">البيان</th>
                  <th className="py-3.5 px-4 text-left">المبلغ</th>
                  <th className="py-3.5 px-4 text-left">الرصيد بعد الحركة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      لا توجد حركات نقدية مسجلة
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isIn = tx.direction === 'in';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-700 tabular-nums">
                          {tx.transaction_number}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 tabular-nums">
                          {formatDateTime(tx.transaction_date)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {tx.cash_account_name || 'الخزينة'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${
                              isIn ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                            }`}
                          >
                            {tx.transaction_type === 'sales_inflow'
                              ? 'تحصيل مبيعات'
                              : tx.transaction_type === 'customer_receipt'
                              ? 'سند قبض عميل'
                              : tx.transaction_type === 'supplier_payment'
                              ? 'سداد مورد'
                              : tx.transaction_type === 'expense'
                              ? 'مصروف تشغيلي'
                              : 'حركة نقدية'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          {tx.party_name || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                          {tx.description}
                        </td>
                        <td className="py-3.5 px-4 text-left font-bold tabular-nums">
                          <span className={isIn ? 'text-emerald-700' : 'text-rose-700'}>
                            {isIn ? `+${formatCurrency(tx.amount)}` : `-${formatCurrency(tx.amount)}`}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-left font-bold text-slate-900 tabular-nums">
                          {formatCurrency(tx.balance_after)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-3">رقم السند</th>
                  <th className="py-3 px-3">تاريخ الصرف</th>
                  <th className="py-3 px-3">بند المصروف</th>
                  <th className="py-3 px-3">المستلم / صُرف إلى</th>
                  <th className="py-3 px-3">ملاحظات وبيان المصروف</th>
                  <th className="py-3 px-3 text-left">المبلغ المصروف</th>
                  <th className="py-3 px-3 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      لا توجد مصروفات مسجلة
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                        {exp.expense_number}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {formatDateTime(exp.expense_date)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {exp.category}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {exp.paid_to || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {exp.notes || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-rose-700 text-sm">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
{isAdmin && (
  <button
    type="button"
    onClick={() => setDeleteTarget(exp)}
    className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
    title="حذف المصروف"
  >
    <Trash2 className="w-4 h-4" />
  </button>
)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="حذف مصروف"
        itemName={deleteTarget?.expense_number + ' - ' + deleteTarget?.category}
        description="سيتم إرجاع مبلغ المصروف إلى رصيد الخزينة وحذف حركة الخزينة المرتبطة به."
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => storage.deleteExpense(deleteTarget!.id)}
      />

      <ExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};
