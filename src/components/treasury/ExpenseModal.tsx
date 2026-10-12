import React, { useState } from 'react';
import { X, Receipt, AlertCircle } from 'lucide-react';
import { storage } from '../../lib/storage';
import { formatCurrency } from '../../lib/formatters';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const expenseCategories = [
  'نقل وشحن بضائع',
  'كهرباء ومياه وغاز',
  'إيجار المحل أو المخزن',
  'أجور وعمالة يومية',
  'ضيافة وبوفيه',
  'أدوات مكتبية ومطبوعات',
  'صيانة وتجهيزات',
  'مصروفات حكومية وتراخيص',
  'أخرى ومصروفات نثرية',
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const cashAccounts = storage.getCashAccounts();
  const primaryCash = cashAccounts.find((c) => c.is_primary) || cashAccounts[0];

  const [category, setCategory] = useState(expenseCategories[0]);
  const [amount, setAmount] = useState('');
  const [cashAccountId, setCashAccountId] = useState(primaryCash?.id || '');
  const [paidTo, setPaidTo] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const selectedCash = cashAccounts.find((c) => c.id === cashAccountId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('يرجى إدخال مبلغ صحيح للمصروف');
      return;
    }

    if (selectedCash && selectedCash.current_balance < parsedAmount) {
      setError(
        `الرصيد المتاح في ${selectedCash.name} (${formatCurrency(selectedCash.current_balance)}) لا يكفي لصرف ${formatCurrency(parsedAmount)}`
      );
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await storage.recordExpense({
        category,
        amount: parsedAmount,
        cash_account_id: cashAccountId,
        paid_to: paidTo.trim(),
        notes: notes.trim(),
      });

      if (!res.success) {
        setError(res.error || 'فشلت عملية صرف المصروف');
        setIsSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ المصروف');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-400" />
            <h3 className="font-bold text-sm">تسجيل مصروف تشغيلي جديد</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 text-rose-700 bg-rose-50 border border-rose-200 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              بند المصروف <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              {expenseCategories.map((c, i) => (
                <option key={i} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              المبلغ المصروف (ج.م) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              required
              min="0.01"
              inputMode="decimal"
              value={amount}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm font-bold font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-rose-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              الخزينة المسحوب منها
            </label>
            <select
              value={cashAccountId}
              onChange={(e) => setCashAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              {cashAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatCurrency(acc.current_balance)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              صُرف إلى (المستلم)
            </label>
            <input
              type="text"
              value={paidTo}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setPaidTo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              ملاحظات وتفاصيل إضافية
            </label>
            <input
              type="text"
              value={notes}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-xs"
            >
              {isSubmitting ? 'جاري الصرف...' : 'صرف وتسجيل في الخزينة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
