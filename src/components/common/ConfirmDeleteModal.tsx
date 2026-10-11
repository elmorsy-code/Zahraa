import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  itemName?: string;
  description?: string;
  onClose: () => void;
  onConfirm: () => Promise<{ success: boolean; error?: string }>;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  itemName,
  description,
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    if (loading) return;
    setError('');
    onClose();
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    const res = await onConfirm();
    setLoading(false);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'فشل الحذف');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-rose-700 text-white">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Trash2 className="w-4 h-4" />
            <span>{title}</span>
          </div>
          <button type="button" onClick={handleClose} className="p-1 rounded-md hover:bg-rose-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-sm text-slate-700">
          {itemName && (
            <p>
              هل أنت متأكد من حذف <span className="font-bold text-slate-900">{itemName}</span>؟
            </p>
          )}
          <p className="text-xs text-slate-500">
            {description || 'لا يمكن التراجع عن هذه العملية بعد تنفيذها.'}
          </p>
          {error && (
            <div className="p-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md">{error}</div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="px-5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 disabled:opacity-60 rounded-lg shadow-xs"
          >
            {loading ? 'جاري الحذف...' : 'نعم، احذف'}
          </button>
        </div>
      </div>
    </div>
  );
};
