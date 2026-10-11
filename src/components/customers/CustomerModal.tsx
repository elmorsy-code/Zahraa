import React, { useState, useEffect } from 'react';
import { X, UserCheck, AlertCircle } from 'lucide-react';
import { Customer } from '../../types/database';
import { storage } from '../../lib/storage';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
  onSaved: (customer: Customer) => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  customerToEdit,
  onSaved,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [creditLimit, setCreditLimit] = useState('0');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (customerToEdit) {
      setCode(customerToEdit.code || '');
      setName(customerToEdit.name || '');
      setPartnerName(customerToEdit.partner_name || '');
      setPhone(customerToEdit.phone || '');
      setVillage(customerToEdit.village_or_address || '');
      setNationalId(customerToEdit.national_id || '');
      setCreditLimit(customerToEdit.credit_limit?.toString() || '0');
      setOpeningBalance(customerToEdit.opening_balance?.toString() || '0');
      // Clean notes from [شريك: ...] if present
      const cleanNotes = (customerToEdit.notes || '').replace(/\[شريك:\s*[^\]]+\]\s*/g, '').trim();
      setNotes(cleanNotes);
    } else {
      setCode('');
      setName('');
      setPartnerName('');
      setPhone('');
      setVillage('');
      setNationalId('');
      setCreditLimit('10000');
      setOpeningBalance('0');
      setNotes('');
      storage.getNextDocNumber('CUST').then((nextCode) => {
        if (isMounted) setCode(nextCode);
      });
    }
    setError('');
    return () => {
      isMounted = false;
    };
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('اسم العميل مطلوب');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const saved = await storage.saveCustomer({
        id: customerToEdit?.id,
        code: code.trim(),
        name: name.trim(),
        partner_name: partnerName.trim() || undefined,
        phone: phone.trim(),
        village_or_address: village.trim(),
        national_id: nationalId.trim(),
        credit_limit: parseFloat(creditLimit) || 0,
        opening_balance: parseFloat(openingBalance) || 0,
        notes: notes.trim(),
      });

      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ العميل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">
              {customerToEdit ? 'تعديل بيانات العميل' : 'تسجيل عميل / مزارع جديد'}
            </h3>
          </div>
          <button
            onClick={onClose}
            type="button"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">
                  كود العميل
                </label>
                <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded font-bold font-mono">
                  تسلسلي تلقائي (CUST-1)
                </span>
              </div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CUST-1"
                className="w-full px-3 py-2 font-mono font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                يبدأ الترقيم من CUST-1 ويزيد تصاعدياً تلقائياً مع كل عميل جديد
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                اسم العميل الأساسي <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: الحاج رضوان عبد الحفيظ"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* خانة الشريك (إن وُجد) */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-amber-950 flex items-center gap-1.5">
                <span>اسم الشريك (إن وُجد معه شريك)</span>
              </label>
              <span className="text-[11px] text-amber-800 font-medium">
                اختياري - يظهر بين قوسين بجوار الاسم الأساسي
              </span>
            </div>
            <input
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="مثال: وشريكه الحاج مصطفى أو مصطفى إبراهيم"
              className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-medium text-slate-900"
            />
            {partnerName.trim() && (
              <div className="text-[11px] text-amber-900 bg-white/90 p-2 rounded-lg border border-amber-200 flex items-center justify-between">
                <span className="text-slate-500">طريقة الظهور في الفواتير وكشوف الحساب:</span>
                <span className="font-bold text-slate-900">
                  {name.trim() || 'اسم العميل'} <span className="text-amber-800 font-bold">({partnerName.trim()})</span>
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                رقم الهاتف
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01012345678"
                className="w-full px-3 py-2 font-mono text-left border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                القرية / العنوان التفصيلي
              </label>
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="قرية سنديون - حوض الخمسين"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                الحد الائتماني المسموح به (ج.م)
              </label>
              <input
                type="number"
                step="100"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                الرصيد الافتتاحي (ج.م)
              </label>
              <input
                type="number"
                step="0.01"
                disabled={Boolean(customerToEdit)}
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                موجب = مديونية قديمة على العميل
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              ملاحظات ومواعيد المحاصيل
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="عروة البطاطس، ميعاد الحصاد، سداد بعد بيع المحصول..."
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
              حفظ بيانات العميل
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
