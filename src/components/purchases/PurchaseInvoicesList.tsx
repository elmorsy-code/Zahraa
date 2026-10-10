import React, { useState, useEffect } from 'react';
import { Search, Plus, Truck, Calendar, Building2, Eye, Receipt, X } from 'lucide-react';
import { PurchaseInvoice } from '../../types/database';
import { storage } from '../../lib/storage';
import { formatCurrency, formatDateTime } from '../../lib/formatters';
import { NewPurchaseModal } from './NewPurchaseModal';

export const PurchaseInvoicesList: React.FC = () => {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [search, setSearch] = useState('');
  const [newPurchaseModalOpen, setNewPurchaseModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);

  useEffect(() => {
    loadInvoices();
    const unsubscribe = storage.subscribe(loadInvoices);
    return () => unsubscribe();
  }, []);

  const loadInvoices = () => {
    setInvoices(storage.getPurchaseInvoices());
  };

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase().trim();
    return (
      !q ||
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.supplier_name && inv.supplier_name.toLowerCase().includes(q)) ||
      (inv.supplier_invoice_number && inv.supplier_invoice_number.toLowerCase().includes(q))
    );
  });

  const totalPurchases = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
  const totalRemaining = invoices.reduce((sum, inv) => sum + (inv.remaining_amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">إجمالي المشتريات المعتمدة</span>
            <span className="text-xl font-bold font-mono text-slate-900">
              {formatCurrency(totalPurchases)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">إجمالي المسدد نقداً للموردين</span>
            <span className="text-xl font-bold font-mono text-emerald-700">
              {formatCurrency(totalPaid)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">المتبقي آجل للموردين</span>
            <span className="text-xl font-bold font-mono text-amber-700">
              {formatCurrency(totalRemaining)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث برقم الفاتورة، اسم المورد..."
            className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <button
          onClick={() => setNewPurchaseModalOpen(true)}
          type="button"
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ فاتورة مشتريات وتوريد جديدة</span>
        </button>
      </div>

      {/* Purchase Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm border-collapse min-w-[950px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-4 px-4">رقم الفاتورة</th>
                <th className="py-4 px-4 min-w-[180px]">المورد والشركة</th>
                <th className="py-4 px-4">رقم فاتورة المورد</th>
                <th className="py-4 px-4">المخزن المستلم</th>
                <th className="py-4 px-4">تاريخ التوريد</th>
                <th className="py-4 px-4 text-left">إجمالي الفاتورة</th>
                <th className="py-4 px-4 text-left">المدفوع نقداً</th>
                <th className="py-4 px-4 text-left">المتبقي آجل</th>
                <th className="py-4 px-4 text-center">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-400">
                    <Truck className="w-10 h-10 mx-auto mb-3 stroke-1 text-slate-300" />
                    <p className="text-sm font-medium">لا توجد فواتير مشتريات مسجلة</p>
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800 tabular-nums">
                      {inv.invoice_number}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {inv.supplier_name || 'مورد عام'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 tabular-nums">
                      {inv.supplier_invoice_number || '-'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {inv.warehouse_name || 'المستودع الرئيسي'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 tabular-nums">
                      {formatDateTime(inv.invoice_date)}
                    </td>

                    <td className="py-3.5 px-4 text-left font-bold text-slate-900 tabular-nums">
                      {formatCurrency(inv.total_amount)}
                    </td>

                    <td className="py-3.5 px-4 text-left font-semibold text-emerald-700 tabular-nums">
                      {formatCurrency(inv.paid_amount)}
                    </td>

                    <td className="py-3.5 px-4 text-left font-bold text-amber-800 tabular-nums">
                      {formatCurrency(inv.remaining_amount)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="معاينة بنود الفاتورة"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Details Preview Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <span className="font-bold text-sm">
                تفاصيل فاتورة مشتريات: {selectedInvoice.invoice_number}
              </span>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 text-xs space-y-4">
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[11px]">المورد:</span>
                  <span className="font-bold">{selectedInvoice.supplier_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">المخزن المستلم:</span>
                  <span className="font-bold">{selectedInvoice.warehouse_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">التاريخ:</span>
                  <span className="font-mono">{formatDateTime(selectedInvoice.invoice_date)}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold">
                    <tr>
                      <th className="p-2">الصنف</th>
                      <th className="p-2">الوحدة</th>
                      <th className="p-2">الكمية</th>
                      <th className="p-2">سعر الوحدة</th>
                      <th className="p-2 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium">{item.product_name_snapshot}</td>
                        <td className="p-2 text-slate-600">{item.unit_name_snapshot}</td>
                        <td className="p-2 font-mono">{item.qty}</td>
                        <td className="p-2 font-mono">{formatCurrency(item.cost_price)}</td>
                        <td className="p-2 font-mono font-bold text-left">
                          {formatCurrency(item.total_cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm font-bold">
                <span>إجمالي الفاتورة:</span>
                <span className="font-mono text-emerald-800">
                  {formatCurrency(selectedInvoice.total_amount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <NewPurchaseModal
        isOpen={newPurchaseModalOpen}
        onClose={() => setNewPurchaseModalOpen(false)}
        onSaved={loadInvoices}
      />
    </div>
  );
};
