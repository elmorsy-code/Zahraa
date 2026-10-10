import React, { useState } from 'react';
import { X, BookOpenCheck, AlertCircle } from 'lucide-react';
import { storage } from '../../lib/storage';

interface NewOldLedgerEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewOldLedgerEntryModal: React.FC<NewOldLedgerEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [bookName, setBookName] = useState('دفتر عروة صيف 2024');
  const [pageNumber, setPageNumber] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [partyName, setPartyName] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [partyType, setPartyType] = useState<'customer' | 'supplier'>('customer');
  const [debitAmount, setDebitAmount] = useState('');
  const [creditAmount, setCreditAmount] = useState('0');
  const [settledAmount, setSettledAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookName.trim() || !partyName.trim()) {
      setError('اسم الدفتر واسم العميل مطلوبان');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await storage.saveOldLedgerEntry({
        book_name: bookName.trim(),
        page_number: pageNumber.trim(),
        entry_date: entryDate,
        party_name: partyName.trim(),
        phone: phone.trim(),
        village: village.trim(),
        party_type: partyType,
        debit_amount: parseFloat(debitAmount) || 0,
        credit_amount: parseFloat(creditAmount) || 0,
        settled_amount: parseFloat(settledAmount) || 0,
        notes: notes.trim(),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'فشل حفظ القيد الدفتري');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <BookOpenCheck className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">تسجيل قيد من الدفاتر الورقية القديمة</h3>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                اسم الدفتر الورقي <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={bookName}
                onChange={(e) => setBookName(e.target.value)}
                placeholder="مثال: دفتر عام 2024"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                رقم الصفحة في الدفتر
              </label>
              <input
                type="text"
                value={pageNumber}
                onChange={(e) => setPageNumber(e.target.value)}
                placeholder="صـ 42"
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                اسم المزارع / العميل <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="مثال: الحاج رضوان الشيخ"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                رقم الهاتف (إن وجد)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010..."
                className="w-full px-3 py-2 font-mono text-left border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                القرية / الحوض
              </label>
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="قرية سنديون"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                تاريخ التسجيل بالدفتر
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                المبلغ المقيد (عليه بالدفتر) ج.م <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={debitAmount}
                onChange={(e) => setDebitAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 font-mono font-bold text-amber-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                المبلغ المسدد منه لاحقاً
              </label>
              <input
                type="number"
                step="0.01"
                value={settledAmount}
                onChange={(e) => setSettledAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              ملاحظات وتفاصيل الدفتر
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="عروة البطاطس، شيكارة سلفات نشادر ورشة من، وعد بالسداد بعد الحصاد..."
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
              className="px-6 py-2 font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-xs"
            >
              حفظ القيد بالدفاتر
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
