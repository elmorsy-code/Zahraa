import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Receipt,
  LayoutGrid,
  TrendingUp,
  Clock,
  Coins,
  CheckCircle2,
  Share2,
  Printer,
  Search,
  Plus,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { DepartmentHeader, DepartmentTabItem } from './DepartmentHeader';
import { SalesInvoicesList } from '../sales/SalesInvoicesList';
import { SendWhatsAppModal } from '../sales/SendWhatsAppModal';
import { storage } from '../../lib/storage';
import { SalesInvoice } from '../../types/database';
import { formatCurrency, formatDateTime } from '../../lib/formatters';

interface SalesDeptPageProps {
  initialSubTab?: string;
  onNavigateHome: () => void;
}

export const SalesDeptPage: React.FC<SalesDeptPageProps> = ({
  initialSubTab = 'overview',
  onNavigateHome,
}) => {
  const [subTab, setSubTab] = useState<string>(initialSubTab);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [whatsAppInvoice, setWhatsAppInvoice] = useState<SalesInvoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
    const unsub = storage.subscribe(loadData);
    return () => unsub();
  }, []);

  const loadData = () => {
    setSalesInvoices(storage.getSalesInvoices());
  };

  // Compute live statistics for Sales Department
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayInvoices = salesInvoices.filter((inv) => inv.invoice_date?.startsWith(todayStr));
  const todaySalesTotal = todayInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalHistoricalSales = salesInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalPaidAmount = salesInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
  const avgInvoiceValue = salesInvoices.length > 0 ? totalHistoricalSales / salesInvoices.length : 0;

  const tabs: DepartmentTabItem[] = [
    { id: 'overview', label: 'نظرة عامة على قسم المبيعات', icon: LayoutGrid },
    { id: 'sales_list', label: 'سجل فواتير المبيعات', icon: Receipt, count: salesInvoices.length },
  ];

  const recentInvoices = salesInvoices
    .filter((inv) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.customer_name_snapshot?.toLowerCase().includes(q)
      );
    })
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Department Master Header */}
      <DepartmentHeader
        deptId="sales_dept"
        title="قسم المبيعات والفواتير"
        subtitle="إدارة فواتير المبيعات الصادرة، الفواتير النقدية والآجلة، كشوف حسابات العمليات، وإرسال الفواتير عبر واتساب"
        tagline="إدارة فواتير البيع والمتابعة"
        icon={Receipt}
        themeColor="emerald"
        tabs={tabs}
        activeSubTab={subTab}
        onSelectSubTab={(tab) => setSubTab(tab)}
        onNavigateHome={onNavigateHome}
        extraActions={
          <button
            onClick={() => setSubTab('sales_list')}
            type="button"
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-white" />
            <span>سجل فواتير البيع</span>
          </button>
        }
      />

      {/* VIEW 1: SubTab = 'overview' */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Department KPI Strip - 4 High Impact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Card 1: Today's Sales */}
            <div className="card-box p-5 sm:p-6 border-2 border-emerald-300/80 bg-gradient-to-br from-emerald-50/70 via-white to-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">مبيعات اليوم الفعلية</span>
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Coins className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-950 tabular-nums">
                {formatCurrency(todaySalesTotal)}
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>{todayInvoices.length} فواتير بيع اليوم</span>
                <span className="text-emerald-700 font-bold">نشط اليوم</span>
              </div>
            </div>

            {/* Card 2: Total Sales */}
            <div className="card-box p-5 sm:p-6 border-2 border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">إجمالي المبيعات التاريخية</span>
                <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                {formatCurrency(totalHistoricalSales)}
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>{salesInvoices.length} فاتورة مسجلة</span>
                <span className="text-blue-700 font-bold">إجمالي الإيراد</span>
              </div>
            </div>

            {/* Card 3: Average Ticket */}
            <div className="card-box p-5 sm:p-6 border-2 border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">متوسط قيمة الفاتورة</span>
                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                {formatCurrency(avgInvoiceValue)}
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>سلة الشراء للمزارع</span>
                <span className="text-amber-700 font-bold">معدل الفاتورة</span>
              </div>
            </div>

            {/* Card 4: Cash Collected */}
            <div className="card-box p-5 sm:p-6 border-2 border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">التحصيل النقدي المباشر</span>
                <div className="p-2.5 bg-teal-100 text-teal-800 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-teal-900 tabular-nums">
                {formatCurrency(totalPaidAmount)}
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 mt-3 border-t border-slate-100">
                <span>تم إيداعها بالخزينة</span>
                <span className="text-teal-700 font-bold">نقدي مسدد</span>
              </div>
            </div>
          </div>

          {/* Hero Sales Invoices Quick-Access Banner */}
          <div className="card-box p-6 border-2 border-emerald-400 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-3xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl shrink-0">
                <Receipt className="w-9 h-9 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black">
                    سجل فواتير المبيعات الصادرة والطباعة
                  </h3>
                  <span className="bg-emerald-500 text-emerald-950 font-black text-[11px] px-2.5 py-0.5 rounded-full">
                    الفواتير
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-100 mt-1">
                  متابعة فواتير البيع الصادرة للمزارعين، البحث الفوري، التحصيل، ومشاركة الإيصالات عبر واتساب.
                </p>
              </div>
            </div>

            <button
              onClick={() => setSubTab('sales_list')}
              type="button"
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-emerald-50 text-emerald-900 font-black text-sm rounded-2xl shadow-lg transition-all shrink-0 cursor-pointer active:scale-95"
            >
              <Receipt className="w-5 h-5 text-emerald-700" />
              <span>عرض سجل الفواتير كاملاً ←</span>
            </button>
          </div>

          {/* Quick Recent Sales Invoices with WhatsApp Sending */}
          <div className="card-box p-6 border-2 border-slate-200 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  أحدث فواتير المبيعات الصادرة
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  مع إمكانية المعاينة، الطباعة، وإرسال الفاتورة للعميل مباشرة عبر واتساب
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث برقم الفاتورة أو العميل..."
                    className="w-full text-xs pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  onClick={() => setSubTab('sales_list')}
                  type="button"
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 transition-colors"
                >
                  عرض جميع الفواتير ({salesInvoices.length}) ←
                </button>
              </div>
            </div>

            {recentInvoices.length === 0 ? (
              <div className="text-center py-12 text-slate-500 space-y-3">
                <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="font-bold text-sm">لا توجد فواتير مبيعات مسجلة حتى الآن</p>
                <button
                  onClick={() => setSubTab('sales_list')}
                  type="button"
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  <span>فتح سجل فواتير البيع</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3">رقم الفاتورة</th>
                      <th className="py-3 px-3">العميل</th>
                      <th className="py-3 px-3">التاريخ والوقت</th>
                      <th className="py-3 px-3">إجمالي الفاتورة</th>
                      <th className="py-3 px-3">المدفوع</th>
                      <th className="py-3 px-3">المتبقي (آجل)</th>
                      <th className="py-3 px-3">حالة السداد</th>
                      <th className="py-3 px-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-black text-slate-900">
                          {inv.invoice_number}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800">
                          {inv.customer_name_snapshot || 'عميل نقدي'}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono text-xs">
                          {formatDateTime(inv.invoice_date)}
                        </td>
                        <td className="py-3 px-3 font-black text-slate-900 tabular-nums">
                          {formatCurrency(inv.total_amount)}
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-700 tabular-nums">
                          {formatCurrency(inv.paid_amount)}
                        </td>
                        <td className="py-3 px-3 font-bold tabular-nums">
                          {inv.remaining_amount > 0 ? (
                            <span className="text-amber-700">{formatCurrency(inv.remaining_amount)}</span>
                          ) : (
                            <span className="text-slate-400">0.00</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              inv.payment_type === 'cash'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.payment_type === 'partial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {inv.payment_type === 'cash'
                              ? 'نقدي مسدد'
                              : inv.payment_type === 'partial'
                              ? 'سداد جزئي'
                              : 'آجل بالكامل'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setWhatsAppInvoice(inv)}
                              type="button"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg cursor-pointer transition-colors"
                              title="إرسال الفاتورة عبر واتساب"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setSubTab('sales_list')}
                              type="button"
                              className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                              معاينة
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}


      {/* VIEW 3: SubTab = 'sales_list' */}
      {subTab === 'sales_list' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-2xl">
            <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-600" />
              سجل فواتير المبيعات الصادرة والطباعة
            </span>
            <button
              onClick={() => setSubTab('overview')}
              type="button"
              className="text-xs font-bold text-slate-700 hover:text-slate-950 underline cursor-pointer"
            >
              العودة للوحة قسم المبيعات
            </button>
          </div>
          <SalesInvoicesList />
        </div>
      )}

      {/* WhatsApp Modal */}
      {whatsAppInvoice && (
        <SendWhatsAppModal
          onClose={() => setWhatsAppInvoice(null)}
          invoice={whatsAppInvoice}
        />
      )}
    </div>
  );
};
