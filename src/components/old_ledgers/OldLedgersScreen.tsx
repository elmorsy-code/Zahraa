import React, { useState, useEffect } from 'react';
import {
  BookOpenCheck,
  Search,
  Plus,
  ArrowRightCircle,
  CheckCircle2,
  Phone,
  MapPin,
  Calendar,
  Trash2,
} from 'lucide-react';
import { OldLedgerEntry } from '../../types/database';
import { storage } from '../../lib/storage';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { NewOldLedgerEntryModal } from './NewOldLedgerEntryModal';
import { authService } from '../../lib/auth';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

export const OldLedgersScreen: React.FC = () => {
  const [entries, setEntries] = useState<OldLedgerEntry[]>([]);
  const [search, setSearch] = useState('');
  const [bookFilter, setBookFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OldLedgerEntry | null>(null);
  const isAdmin = authService.getCurrentUser()?.role === 'admin';
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const loadData = () => {
    setEntries(storage.getOldLedgers());
  };

  const bookNames = Array.from(new Set(entries.map((e) => e.book_name)));

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      e.party_name.toLowerCase().includes(q) ||
      e.book_name.toLowerCase().includes(q) ||
      (e.village && e.village.toLowerCase().includes(q)) ||
      (e.phone && e.phone.includes(q));

    const matchesBook = bookFilter === 'all' || e.book_name === bookFilter;
    return matchesSearch && matchesBook;
  });

  const totalOldDebt = entries.reduce((s, e) => s + (e.debit_amount - e.settled_amount), 0);

  const handleMigrate = async (entry: OldLedgerEntry) => {
    const res = await storage.migrateOldLedgerToCustomer(entry.id);
    if (res.success && res.customer) {
      setMigrationStatus(`تم ترحيل مديونية "${entry.party_name}" بنجاح إلى حساب العميل الإلكتروني (${res.customer.code})`);
      setTimeout(() => setMigrationStatus(null), 5000);
      loadData();
    } else {
      alert(res.error || 'فشلت عملية الترحيل');
    }
  };

  return (
    <div className="space-y-4">
      {/* Intro & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">إجمالي القيود بالدفاتر القديمة</span>
            <span className="text-xl font-bold font-mono text-slate-900">{entries.length}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700">
            <BookOpenCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">إجمالي المديونيات الدفترية غير المحصلة</span>
            <span className="text-xl font-bold font-mono text-amber-800">
              {formatCurrency(totalOldDebt)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">القيود المرحلة للنظام الحديث</span>
            <span className="text-xl font-bold font-mono text-emerald-700">
              {entries.filter((e) => e.is_transferred_to_system).length}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {migrationStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{migrationStatus}</span>
        </div>
      )}

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم المزارع، القرية، اسم الدفتر..."
              className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={bookFilter}
            onChange={(e) => setBookFilter(e.target.value)}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">جميع الدفاتر الورقية</option>
            {bookNames.map((name, i) => (
              <option key={i} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {isAdmin ? (
          <button
            onClick={() => setModalOpen(true)}
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ تسجيل قيد دفتري قديم</span>
          </button>
        ) : (
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            مشرف (قراءة ومتابعة فقط)
          </span>
        )}
      </div>

      {/* Old Ledgers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-3">اسم الدفتر ورقم الصفحة</th>
                <th className="py-3 px-3">اسم المزارع / العميل</th>
                <th className="py-3 px-3">القرية / العنوان</th>
                <th className="py-3 px-3">تاريخ القيد</th>
                <th className="py-3 px-3 text-left">المبلغ المسجل (عليه)</th>
                <th className="py-3 px-3 text-left">المسدد منه</th>
                <th className="py-3 px-3 text-left">صافي المتبقي</th>
                <th className="py-3 px-3">الملاحظات</th>
                <th className="py-3 px-3 text-center">حالة الترحيل والإجراء</th>
                <th className="py-3 px-3 text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    لا توجد قيود ورقية مسجلة
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => {
                  const remaining = entry.debit_amount - entry.settled_amount;
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{entry.book_name}</div>
                        {entry.page_number && (
                          <span className="text-[11px] text-slate-500 font-mono">
                            صفحة: {entry.page_number}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{entry.party_name}</div>
                        {entry.phone && (
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{entry.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600">
                        {entry.village || '-'}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {formatDate(entry.entry_date)}
                      </td>

                      <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">
                        {formatCurrency(entry.debit_amount)}
                      </td>

                      <td className="py-2.5 px-3 text-left font-mono text-emerald-700 font-semibold">
                        {formatCurrency(entry.settled_amount)}
                      </td>

                      <td className="py-2.5 px-3 text-left font-mono font-bold text-amber-800">
                        {formatCurrency(remaining)}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                        {entry.notes || '-'}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        {entry.is_transferred_to_system ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>مرحل للنظام</span>
                          </span>
                        ) : isAdmin ? (
                          <button
                            onClick={() => handleMigrate(entry)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md shadow-xs transition-colors cursor-pointer"
                            title="ترحيل المديونية مباشرة لفتح حساب عميل بالنظام"
                          >
                            <ArrowRightCircle className="w-3.5 h-3.5" />
                            <span>ترحيل للنظام</span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            غير مرحل
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
{isAdmin && (
  <button
    type="button"
    onClick={() => setDeleteTarget(entry)}
    className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
    title="حذف القيد"
  >
    <Trash2 className="w-4 h-4" />
  </button>
)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="حذف قيد دفتري"
        itemName={deleteTarget ? `${deleteTarget.party_name} (${deleteTarget.book_name})` : ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => storage.deleteOldLedgerEntry(deleteTarget!.id)}
      />

      <NewOldLedgerEntryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};
