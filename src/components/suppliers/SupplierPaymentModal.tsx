import React, { useState } from 'react';
import { X, Send, AlertCircle } from 'lucide-react';
import { Supplier } from '../../types/database';
import { storage } from '../../lib/storage';
import { formatCurrency } from '../../lib/formatters';

interface SupplierPaymentModalProps {
  supplier: Supplier | null;
  onClose: () => void;
  onSuccess: () => void;
  isOpen?: boolean;
}

export const SupplierPaymentModal: React.FC<SupplierPaymentModalProps> = ({
  supplier,
  onClose,
  onSuccess,
}) => {
  if (!supplier) return null;

  const cashAccounts = storage.getCashAccounts();
  const primaryCash = cashAccounts.find((c) => c.is_primary) || cashAccounts[0];

  const [amount, setAmount] = useState(
    supplier.current_balance > 0 ? supplier.current_balance.toString() : ''
  );
  const [cashAccountId, setCashAccountId] = useState(primaryCash?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'wallet'>('cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedCash = cashAccounts.find((c) => c.id === cashAccountId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('يرجى إدخال مبلغ صحيح للصرف');
      return;
    }

    if (selectedCash && selectedCash.current_balance < parsedAmount) {
      setError(
        `الرصيد المتاح في ${selectedCash.name} (${formatCurrency(selectedCash.current_balance)}) غير كافٍ لسداد ${formatCurrency(parsedAmount)}`
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await storage.paySupplier({
        supplier_id: supplier.id,
        amount: parsedAmount,
        cash_account_id: cashAccountId,
        payment_method: paymentMethod,
        notes: notes.trim(),
      });

      if (!result.success) {
        setError(result.error || 'فشلت عملية سداد المورد');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء تسجيل سند الصرف');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">سند صرف وسداد لمورد</h3>
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

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-600 font-medium">اسم المورد:</span>
              <span className="font-bold text-slate-900 text-sm">{supplier.name}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">المستحق للمورد حالياً:</span>
              <span className="font-mono font-bold text-amber-800">
                {formatCurrency(supplier.current_balance)}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              المبلغ المصروف (ج.م) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm font-bold font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-amber-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                الصرف من خزينة
              </label>
              <select
                value={cashAccountId}
                onChange={(e) => setCashAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
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
                وسيلة الدفع
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              >
                <option value="cash">نقداً (كاش)</option>
                <option value="bank">شيك / تحويل بنكي</option>
                <option value="wallet">تحويل محفظة إلكترونية</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              البيان / تفاصيل السداد
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="دفعة من حساب فاتورة توريد رقم..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
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
              className="px-6 py-2 font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-xs"
            >
              تأكيد الصرف وإصدار السند
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
