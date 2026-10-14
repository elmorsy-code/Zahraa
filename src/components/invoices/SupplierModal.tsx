import React, { useState, useEffect } from 'react';
import { X, Truck, CheckCircle2, AlertCircle } from 'lucide-react';
import { storage } from '../../lib/storage';
import { Supplier } from '../../types/database';

interface SupplierModalProps {
  isOpen: boolean;
  supplier?: Supplier | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  supplier,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        setName(supplier.name);
        setCompanyName(supplier.company_name || '');
        setPhone(supplier.phone || '');
        setAddress(supplier.address || '');
        setTaxNumber(supplier.tax_number || '');
        setNotes(supplier.notes || '');
        setOpeningBalance((supplier.opening_balance || 0).toString());
      } else {
        setName('');
        setCompanyName('');
        setPhone('');
        setAddress('');
        setTaxNumber('');
        setNotes('');
        setOpeningBalance('0');
      }
      setError('');
    }
  }, [isOpen, supplier]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى كتابة اسم المورد');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await storage.saveSupplier({
        id: supplier?.id,
        name: name.trim(),
        company_name: companyName.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        tax_number: taxNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        opening_balance: parseFloat(openingBalance) || 0,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'فشل حفظ بيانات المورد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-violet-400" />
            <h3 className="font-black text-sm">
              {supplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
            </h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">اسم المورد أو الشركة *</label>
            <input
              type="text"
              placeholder="مثال: شركة النصر للمستحضرات الطبية"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">رقم الهاتف</label>
              <input
                type="text"
                placeholder="010xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">الرصيد الافتتاحي (دائن للمورد)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                disabled={!!supplier}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">العنوان / المحافظة</label>
            <input
              type="text"
              placeholder="مثال: القاهرة - شبرا"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">ملاحظات إضافية</label>
            <textarea
              rows={2}
              placeholder="أيام التوريد، مندوب التوزيع، حساب بنكي..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{supplier ? 'حفظ التعديلات' : 'إضافة المورد'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
