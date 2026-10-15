import React, { useState } from 'react';
import { X, BadgeCheck, AlertCircle } from 'lucide-react';
import { Customer } from '../../types/database';
import { storage } from '../../lib/storage';
import { formatCurrency } from '../../lib/formatters';

interface CustomerPaymentModalProps {
  customer: Customer | null;
  onClose: () => void;
  onSuccess: () => void;
  isOpen?: boolean;
}

export const CustomerPaymentModal: React.FC<CustomerPaymentModalProps> = ({
  customer,
  onClose,
  onSuccess,
}) => {
  const cashAccounts = storage.getCashAccounts();
  const primaryCash = cashAccounts.find((c) => c.is_primary) || cashAccounts[0];

  const [amount, setAmount] = useState(
    customer && customer.current_balance > 0 ? customer.current_balance.toString() : ''
  );
  const [cashAccountId, setCashAccountId] = useState(primaryCash?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'wallet'>('cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('يرجى إدخال مبلغ صحيح للتحصيل');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await storage.receiveCustomerPayment({
        customer_id: customer.id,
        amount: parsedAmount,
        cash_account_id: cashAccountId,
        payment_method: paymentMethod,
        notes: notes.trim(),
      });

      if (!result.success) {
        setError(result.error || 'فشلت عملية التحصيل');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء تسجيل سند القبض');
    } finally {
      setLoading(false);
    }
  };

  if (!customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">سند قبض وتحصيل نقدية</h3>
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

          {/* Customer info preview */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-600 font-medium">اسم العميل:</span>
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                <span>{customer.name}</span>
                {customer.partner_name && (
                  <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.2 rounded">
                    (شريك: {customer.partner_name})
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">المديونية الحالية على العميل:</span>
              <span className="font-mono font-bold text-amber-700">
                {formatCurrency(customer.current_balance)}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              المبلغ المحصل (ج.م) <span className="text-rose-500">*</span>
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
              className="w-full px-3 py-2 text-sm font-bold font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-emerald-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                الخزينة المودع بها
              </label>
              <select
                value={cashAccountId}
                onChange={(e) => setCashAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                {cashAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                طريقة الدفع
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="cash">نقداً (كاش)</option>
                <option value="bank">تحويل بنكي</option>
                <option value="wallet">محفظة إلكترونية (فودافون كاش / إنستاباي)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              البيان / ملاحظات السداد
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="دفعة من حساب مبيدات عروة الشتاء..."
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
              className="px-6 py-2 font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
            >
              تأكيد التحصيل وإصدار السند
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
