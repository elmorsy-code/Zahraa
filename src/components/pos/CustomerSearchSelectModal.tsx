import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, User, Phone, MapPin, Check, Plus, X, Users, AlertCircle, ArrowUpDown } from 'lucide-react';
import { Customer } from '../../types/database';
import { formatCurrency } from '../../lib/formatters';

interface CustomerSearchSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  selectedCustomerId: string;
  onSelectCustomer: (customer: Customer | null) => void;
  onOpenAddNewCustomer: () => void;
}

export const CustomerSearchSelectModal: React.FC<CustomerSearchSelectModalProps> = ({
  isOpen,
  onClose,
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onOpenAddNewCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with_debt' | 'zero_debt'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'debt_desc' | 'recent'>('name');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setFilterType('all');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return customers
      .filter((c) => {
        // Text search filter
        const matchesQuery =
          !q ||
          c.name.toLowerCase().includes(q) ||
          (c.partner_name && c.partner_name.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q)) ||
          (c.code && c.code.toLowerCase().includes(q)) ||
          (c.village_or_address && c.village_or_address.toLowerCase().includes(q));

        if (!matchesQuery) return false;

        // Debt status filter
        if (filterType === 'with_debt') {
          return (c.current_balance || 0) > 0;
        }
        if (filterType === 'zero_debt') {
          return (c.current_balance || 0) <= 0;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'debt_desc') {
          return (b.current_balance || 0) - (a.current_balance || 0);
        }
        if (sortBy === 'recent') {
          return (b.created_at || '').localeCompare(a.created_at || '');
        }
        return a.name.localeCompare(b.name, 'ar');
      });
  }, [customers, searchTerm, filterType, sortBy]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                بحث واختيار عميل للفاتورة
              </h2>
              <p className="text-xs text-slate-400">
                ابحث بالاسم، رقم التليفون، اسم الشريك، القرية أو الكود
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAddNewCustomer();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>عميل جديد</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar & Quick Filters */}
        <div className="p-3.5 sm:p-4 bg-slate-900/90 border-b border-slate-800 space-y-3">
          <div className="relative">
            <Search className="absolute right-3.5 top-3 w-5 h-5 text-emerald-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="اكتب اسم العميل، رقم الهاتف، اسم الشريك، الكود، أو البلد/القرية..."
              className="w-full pr-11 pl-10 py-2.5 bg-slate-950 text-white placeholder-slate-400 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-2.5 p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filter Chips & Cash Option */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                الكل ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('with_debt')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  filterType === 'with_debt'
                    ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'
                }`}
              >
                عليهم مديونية
              </button>
              <button
                type="button"
                onClick={() => setFilterType('zero_debt')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  filterType === 'zero_debt'
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800'
                }`}
              >
                بدون ديون / خالص
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-slate-400">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-800 text-slate-200 text-xs py-1 px-2 rounded-lg border border-slate-700 focus:outline-none"
                >
                  <option value="name">أبجدياً (أ - ي)</option>
                  <option value="debt_desc">الأعلى مديونية</option>
                  <option value="recent">الأحدث تسجيلاً</option>
                </select>
              </div>

              {/* Instant Cash Option */}
              <button
                type="button"
                onClick={() => {
                  onSelectCustomer(null);
                  onClose();
                }}
                className={`px-3 py-1 rounded-lg font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  !selectedCustomerId
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white'
                }`}
              >
                <span>⚡ عميل نقدي سريع</span>
                {!selectedCustomerId && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Customer Results List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 divide-y divide-slate-800/40">
          {filteredCustomers.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-300">
                لم يتم العثور على عملاء يطابقون: "{searchTerm}"
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                تأكد من كتابة الاسم أو رقم الهاتف بشكل صحيح، أو اضغط أدناه لإضافة هذا العميل فوراً.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAddNewCustomer();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>تسجيل عميل جديد باسم "{searchTerm || 'جديد'}"</span>
              </button>
            </div>
          ) : (
            filteredCustomers.map((cust) => {
              const isSelected = cust.id === selectedCustomerId;
              const debt = cust.current_balance || 0;
              const hasDebt = debt > 0;
              const isCreditor = debt < 0;

              return (
                <div
                  key={cust.id}
                  onClick={() => {
                    onSelectCustomer(cust);
                    onClose();
                  }}
                  className={`pt-2 flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-950/70 border-2 border-emerald-500 text-white shadow-md'
                      : 'hover:bg-slate-800/80 border border-transparent text-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        isSelected
                          ? 'bg-emerald-500 text-white'
                          : hasDebt
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <User className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-sm sm:text-base text-white">
                          {cust.name}
                        </span>
                        {cust.partner_name && (
                          <span className="text-[11px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-md font-medium border border-amber-700/50">
                            شريك: {cust.partner_name}
                          </span>
                        )}
                        {cust.code && (
                          <span className="text-[11px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                            {cust.code}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
                        {cust.phone ? (
                          <span className="flex items-center gap-1 font-mono text-slate-300">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {cust.phone}
                          </span>
                        ) : (
                          <span className="text-slate-500">لا يوجد هاتف</span>
                        )}

                        {cust.village_or_address && (
                          <span className="flex items-center gap-1 text-slate-300 truncate max-w-xs">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{cust.village_or_address}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-left mr-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">الرصيد المالي:</span>
                      {hasDebt ? (
                        <span className="text-xs sm:text-sm font-mono font-black text-amber-400">
                          مديونية {formatCurrency(debt)}
                        </span>
                      ) : isCreditor ? (
                        <span className="text-xs sm:text-sm font-mono font-black text-sky-400">
                          له {formatCurrency(Math.abs(debt))}
                        </span>
                      ) : (
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          خالص (0.00)
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300'
                      }`}
                    >
                      {isSelected ? '✓ تم الاختيار' : 'اختيار'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            إجمالي العملاء: <strong className="text-white font-mono">{filteredCustomers.length}</strong> من أصل {customers.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
