import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Users,
  FileSpreadsheet,
  Coins,
  Edit,
  Trash2,
  Phone,
  MapPin,
} from 'lucide-react';
import { Customer } from '../../types/database';
import { storage } from '../../lib/storage';
import { authService } from '../../lib/auth';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { formatCurrency } from '../../lib/formatters';
import { CustomerModal } from './CustomerModal';
import { CustomerLedgerModal } from './CustomerLedgerModal';
import { CustomerPaymentModal } from './CustomerPaymentModal';

interface CustomersListProps {
  initialOpenLedger?: boolean;
}

export const CustomersList: React.FC<CustomersListProps> = ({ initialOpenLedger = false }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [filterDebtorsOnly, setFilterDebtorsOnly] = useState(initialOpenLedger);

  // Modals
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const isAdmin = authService.getCurrentUser()?.role === 'admin';
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState<Customer | null>(null);
  const [selectedPaymentCustomer, setSelectedPaymentCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadCustomers();
    const unsubscribe = storage.subscribe(loadCustomers);
    return () => unsubscribe();
  }, []);

  const loadCustomers = () => {
    setCustomers(storage.getCustomers());
  };

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.village_or_address && c.village_or_address.toLowerCase().includes(q));

    const matchesDebt = !filterDebtorsOnly || c.current_balance > 0;
    return matchesSearch && matchesDebt;
  });

  const totalCustomerDebt = customers.reduce((sum, c) => sum + Math.max(0, c.current_balance), 0);

  return (
    <div className="space-y-4">
      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">إجمالي العملاء المسجلين</span>
            <span className="text-xl font-bold font-mono text-slate-900">{customers.length}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">إجمالي المديونيات المستحقة للمحل</span>
            <span className="text-xl font-bold font-mono text-amber-700">
              {formatCurrency(totalCustomerDebt)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">عملاء لديهم مديونية حالية</span>
            <span className="text-xl font-bold font-mono text-rose-700">
              {customers.filter((c) => c.current_balance > 0).length}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Actions Bar with Comfortable Spacing */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم العميل، الهاتف، القرية..."
              className="w-full pr-10 pl-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => setFilterDebtorsOnly(!filterDebtorsOnly)}
            type="button"
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border transition-colors ${
              filterDebtorsOnly
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            المدينين فقط ({customers.filter((c) => c.current_balance > 0).length})
          </button>
        </div>

        <button
          onClick={() => {
            setEditingCustomer(null);
            setCustomerModalOpen(true);
          }}
          type="button"
          className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة عميل / مزارع جديد</span>
        </button>
      </div>

      {/* Data Table with Spacious Cells and Clear Column Widths */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm border-collapse min-w-[950px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-4 px-4 sm:px-5 whitespace-nowrap min-w-[120px]">كود العميل</th>
                <th className="py-4 px-4 sm:px-5 whitespace-nowrap min-w-[200px]">الاسم وبيانات الاتصال</th>
                <th className="py-4 px-4 sm:px-5 whitespace-nowrap min-w-[160px]">العنوان / القرية</th>
                <th className="py-4 px-4 sm:px-5 whitespace-nowrap text-left min-w-[130px]">الرصيد الافتتاحي</th>
                <th className="py-4 px-4 sm:px-5 whitespace-nowrap text-left min-w-[130px]">الحد الائتماني</th>
                <th className="py-4 px-4 sm:px-5 whitespace-nowrap text-left min-w-[160px] bg-amber-50/70 font-bold text-slate-900">
                  الرصيد الحالي (المديونية)
                </th>
                <th className="py-4 px-4 sm:px-5 whitespace-nowrap text-center min-w-[180px]">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-3 stroke-1 text-slate-300" />
                    <p className="text-base font-medium">لا يوجد عملاء يطابقون محددات البحث</p>
                  </td>
                </tr>
              ) : (
                filtered.map((customer) => {
                  const hasDebt = customer.current_balance > 0;
                  return (
                    <tr key={customer.id} className="hover:bg-slate-50/90 transition-colors">
                      <td className="py-3.5 px-4 sm:px-5 font-bold text-slate-700 tabular-nums">
                        {customer.code}
                      </td>

                      <td className="py-3.5 px-4 sm:px-5">
                        <div className="font-bold text-slate-900 text-sm">{customer.name}</div>
                        {customer.phone && (
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 tabular-nums">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 sm:px-5 text-slate-600">
                        {customer.village_or_address ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{customer.village_or_address}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 sm:px-5 text-left text-slate-600 tabular-nums font-medium">
                        {formatCurrency(customer.opening_balance)}
                      </td>

                      <td className="py-3.5 px-4 sm:px-5 text-left text-slate-600 tabular-nums font-medium">
                        {customer.credit_limit ? formatCurrency(customer.credit_limit) : '-'}
                      </td>

                      <td className="py-3.5 px-4 sm:px-5 text-left bg-amber-50/70">
                        <span
                          className={`font-bold text-sm sm:text-base tabular-nums ${
                            hasDebt
                              ? 'text-amber-800 font-extrabold'
                              : 'text-emerald-700'
                          }`}
                        >
                          {formatCurrency(customer.current_balance)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 sm:px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Receive payment */}
                          <button
                            onClick={() => setSelectedPaymentCustomer(customer)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                            title="تحصيل نقدية وإصدار سند قبض"
                          >
                            سند قبض
                          </button>

                          {/* View Ledger */}
                          <button
                            onClick={() => setSelectedLedgerCustomer(customer)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            title="عرض كشف الحساب التفصيلي"
                          >
                            كشف حساب
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => {
                              setEditingCustomer(customer);
                              setCustomerModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="تعديل بيانات العميل"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
{isAdmin && (
  <button
    type="button"
    onClick={() => setDeleteTarget(customer)}
    className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
    title="حذف العميل"
  >
    <Trash2 className="w-4 h-4" />
  </button>
)}
                        </div>
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
        title="حذف عميل"
        itemName={deleteTarget?.name}
        description="يتم الحذف فقط للعميل الذي ليس له فواتير أو دفعات ورصيده صفر."
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => storage.deleteCustomer(deleteTarget!.id)}
      />

      <CustomerModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        customerToEdit={editingCustomer}
        onSaved={loadCustomers}
      />

      {selectedLedgerCustomer && (
        <CustomerLedgerModal
          customer={selectedLedgerCustomer}
          onClose={() => setSelectedLedgerCustomer(null)}
          onReceivePaymentClick={(cust) => setSelectedPaymentCustomer(cust)}
        />
      )}

      <CustomerPaymentModal
        customer={selectedPaymentCustomer}
        onClose={() => setSelectedPaymentCustomer(null)}
        onSuccess={loadCustomers}
      />
    </div>
  );
};
