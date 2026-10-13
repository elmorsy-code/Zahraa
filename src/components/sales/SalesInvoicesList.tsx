import React, { useState, useEffect } from 'react';
import { Search, Printer, Receipt, Calendar, Coins, CheckCircle2, RotateCcw, Layers, MessageSquare } from 'lucide-react';
import { SalesInvoice } from '../../types/database';
import { storage } from '../../lib/storage';
import { formatCurrency, formatDateTime } from '../../lib/formatters';
import { InvoiceReceiptModal } from '../pos/InvoiceReceiptModal';
import { SalesReturnModal } from './SalesReturnModal';
import { SalesInvoiceDetailsModal } from './SalesInvoiceDetailsModal';
import { SendWhatsAppModal } from './SendWhatsAppModal';

export const SalesInvoicesList: React.FC = () => {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [detailsInvoice, setDetailsInvoice] = useState<SalesInvoice | null>(null);
  const [returnInvoice, setReturnInvoice] = useState<SalesInvoice | null>(null);
  const [whatsAppInvoice, setWhatsAppInvoice] = useState<SalesInvoice | null>(null);

  useEffect(() => {
    loadInvoices();
    const unsubscribe = storage.subscribe(loadInvoices);
    return () => unsubscribe();
  }, []);

  const loadInvoices = () => {
    setInvoices(storage.getSalesInvoices());
  };

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.customer_name_snapshot.toLowerCase().includes(q);

    const matchesType = paymentFilter === 'all' || inv.payment_type === paymentFilter;
    return matchesSearch && matchesType;
  });

  const totalSales = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
  const totalCredit = invoices.reduce((sum, inv) => sum + (inv.remaining_amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">إجمالي مبيعات الفواتير</span>
            <span className="text-xl font-bold font-mono text-slate-900">
              {formatCurrency(totalSales)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">إجمالي التحصيل النقدي</span>
            <span className="text-xl font-bold font-mono text-emerald-700">
              {formatCurrency(totalCollected)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">إجمالي المبيعات الآجلة (المتبقي)</span>
            <span className="text-xl font-bold font-mono text-amber-700">
              {formatCurrency(totalCredit)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث برقم الفاتورة، اسم العميل..."
              className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">جميع أنواع السداد</option>
            <option value="cash">نقدي كامل</option>
            <option value="credit">آجل كامل</option>
            <option value="partial">دفع جزئي</option>
          </select>
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm border-collapse min-w-[950px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-4 px-4">رقم الفاتورة</th>
                <th className="py-4 px-4 min-w-[180px]">العميل والمشتري</th>
                <th className="py-4 px-4">تاريخ ووقت البيع</th>
                <th className="py-4 px-4">طريقة السداد</th>
                <th className="py-4 px-4 text-left">إجمالي الفاتورة</th>
                <th className="py-4 px-4 text-left">المدفوع نقداً</th>
                <th className="py-4 px-4 text-left">المتبقي آجل</th>
                <th className="py-4 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto mb-3 stroke-1 text-slate-300" />
                    <p className="text-sm font-medium">لا توجد فواتير مبيعات مسجلة</p>
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800 tabular-nums">
                      {inv.invoice_number}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {inv.customer_name_snapshot}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 tabular-nums">
                      {formatDateTime(inv.invoice_date)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${
                          inv.payment_type === 'cash'
                            ? 'bg-emerald-50 text-emerald-800'
                            : inv.payment_type === 'credit'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-indigo-50 text-indigo-800'
                        }`}
                      >
                        {inv.payment_type === 'cash'
                          ? 'نقدي'
                          : inv.payment_type === 'credit'
                          ? 'آجل'
                          : 'جزئي'}
                      </span>
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
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setWhatsAppInvoice(inv)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-[#25D366] hover:bg-[#1EBE5D] rounded-lg transition-colors cursor-pointer shadow-2xs"
                          title="إرسال الفاتورة للعميل عبر واتساب"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>واتساب</span>
                        </button>
                        <button
                          onClick={() => setDetailsInvoice(inv)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                          title="عرض تفاصيل الفاتورة والتشغيلات المسحوبة"
                        >
                          <Layers className="w-3.5 h-3.5 text-emerald-600" />
                          <span>التشغيلات والتفاصيل</span>
                        </button>
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          title="معاينة وطباعة الفاتورة"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>طباعة</span>
                        </button>
                        <button
                          onClick={() => setReturnInvoice(inv)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                          title="إصدار مرتجع بيع لهذه الفاتورة"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>مرتجع</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SalesInvoiceDetailsModal
        invoice={detailsInvoice}
        onClose={() => setDetailsInvoice(null)}
        onPrint={() => {
          setSelectedInvoice(detailsInvoice);
          setDetailsInvoice(null);
        }}
        onReturn={() => {
          setReturnInvoice(detailsInvoice);
          setDetailsInvoice(null);
        }}
      />

      <InvoiceReceiptModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />

      {returnInvoice && (
        <SalesReturnModal
          invoice={returnInvoice}
          onClose={() => setReturnInvoice(null)}
          onSuccess={() => {
            setReturnInvoice(null);
            loadInvoices();
          }}
        />
      )}

      {whatsAppInvoice && (
        <SendWhatsAppModal
          invoice={whatsAppInvoice}
          onClose={() => setWhatsAppInvoice(null)}
        />
      )}
    </div>
  );
};
