import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Printer,
  Calendar,
  Layers,
  TrendingUp,
  AlertTriangle,
  Users,
  Coins,
  Download,
  Building2,
  PackageCheck,
  History,
  Landmark,
  BadgeDollarSign,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { storage } from '../../lib/storage';
import { formatCurrency, formatDate, formatDateTime, formatQuantity } from '../../lib/formatters';
import { exportToCsv } from '../../lib/exportUtils';

import { printVisibleArea } from '../../lib/printUtils';
type ReportTab =
  | 'daily_monthly_sales'
  | 'sales_by_dimension'
  | 'collections_receipts'
  | 'customer_debts'
  | 'supplier_payables'
  | 'stock_movements'
  | 'stagnant_expired_stock'
  | 'profit_and_loss'
  | 'treasury_cashflow';

export const ReportsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('daily_monthly_sales');

  // Shared Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all live data from storage
  const products = storage.getProducts();
  const categories = storage.getCategories();
  const salesInvoices = storage.getSalesInvoices();
  const purchaseInvoices = storage.getPurchaseInvoices();
  const customers = storage.getCustomers();
  const suppliers = storage.getSuppliers();
  const warehouses = storage.getWarehouses();
  const cashAccounts = storage.getCashAccounts();
  const cashTransactions = storage.getCashTransactions();
  const expenses = storage.getExpenses();
  const stockMovements = storage.getStockMovements();
  const customerPayments = storage.getCustomerPayments();

  // Filtered sales invoices by date
  const filteredSalesInvoices = useMemo(() => {
    return salesInvoices.filter((inv) => {
      const invTime = new Date(inv.invoice_date).getTime();
      const matchStart = !startDate || invTime >= new Date(startDate).getTime();
      const matchEnd = !endDate || invTime <= new Date(endDate + 'T23:59:59').getTime();
      const matchSearch =
        !searchTerm ||
        inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customer_name_snapshot.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStart && matchEnd && matchSearch;
    });
  }, [salesInvoices, startDate, endDate, searchTerm]);

  // -------------------------------------------------------------
  // REPORT 1: Daily and Monthly Sales Grouping
  // -------------------------------------------------------------
  const [salesGrouping, setSalesGrouping] = useState<'daily' | 'monthly'>('daily');

  const groupedSales = useMemo(() => {
    const map = new Map<
      string,
      { period: string; count: number; total: number; cash: number; credit: number }
    >();

    filteredSalesInvoices.forEach((inv) => {
      const key =
        salesGrouping === 'daily'
          ? inv.invoice_date.slice(0, 10)
          : inv.invoice_date.slice(0, 7);

      const existing = map.get(key) || {
        period: key,
        count: 0,
        total: 0,
        cash: 0,
        credit: 0,
      };

      existing.count += 1;
      existing.total += inv.total_amount;
      existing.cash += inv.paid_amount;
      existing.credit += inv.remaining_amount;
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.period.localeCompare(a.period));
  }, [filteredSalesInvoices, salesGrouping]);

  // -------------------------------------------------------------
  // REPORT 2: Sales by Dimension (Period, Product, Customer)
  // -------------------------------------------------------------
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');

  const dimensionalSalesItems = useMemo(() => {
    const list: Array<{
      invoice_number: string;
      invoice_date: string;
      customer_name: string;
      product_name: string;
      unit_name: string;
      qty: number;
      qty_in_base_unit: number;
      unit_price: number;
      total_price: number;
    }> = [];

    filteredSalesInvoices.forEach((inv) => {
      if (selectedCustomerId !== 'all' && inv.customer_id !== selectedCustomerId) {
        return;
      }

      inv.items.forEach((item) => {
        if (selectedProductId !== 'all' && item.product_id !== selectedProductId) {
          return;
        }

        list.push({
          invoice_number: inv.invoice_number,
          invoice_date: inv.invoice_date,
          customer_name: inv.customer_name_snapshot,
          product_name: item.product_name_snapshot,
          unit_name: item.unit_name_snapshot,
          qty: item.qty,
          qty_in_base_unit: item.qty_in_base_unit,
          unit_price: item.unit_price,
          total_price: item.total_price,
        });
      });
    });

    return list;
  }, [filteredSalesInvoices, selectedProductId, selectedCustomerId]);

  // -------------------------------------------------------------
  // REPORT 3: Collections & Receipts
  // -------------------------------------------------------------
  const [selectedCashAccountId, setSelectedCashAccountId] = useState<string>('all');

  const collectionsList = useMemo(() => {
    return cashTransactions.filter((tx) => {
      const isCollection =
        tx.direction === 'in' &&
        (tx.transaction_type === 'sales_inflow' ||
          tx.transaction_type === 'customer_receipt');

      const txTime = new Date(tx.transaction_date).getTime();
      const matchStart = !startDate || txTime >= new Date(startDate).getTime();
      const matchEnd = !endDate || txTime <= new Date(endDate + 'T23:59:59').getTime();
      const matchAccount =
        selectedCashAccountId === 'all' || tx.cash_account_id === selectedCashAccountId;

      return isCollection && matchStart && matchEnd && matchAccount;
    });
  }, [cashTransactions, startDate, endDate, selectedCashAccountId]);

  // -------------------------------------------------------------
  // REPORT 4: Customer Debts & Aging
  // -------------------------------------------------------------
  const customerDebtsReport = useMemo(() => {
    const now = Date.now();
    return customers
      .filter((c) => c.current_balance > 0.01)
      .map((c) => {
        const ledgers = storage.getCustomerLedger(c.id);
        const lastMovement = ledgers[ledgers.length - 1];
        const daysSinceLastMovement = lastMovement
          ? Math.floor((now - new Date(lastMovement.entry_date).getTime()) / 86400000)
          : 0;

        let agingCategory: '< 30 يوم' | '30-60 يوم' | '60-90 يوم' | '> 90 يوم';
        if (daysSinceLastMovement <= 30) agingCategory = '< 30 يوم';
        else if (daysSinceLastMovement <= 60) agingCategory = '30-60 يوم';
        else if (daysSinceLastMovement <= 90) agingCategory = '60-90 يوم';
        else agingCategory = '> 90 يوم';

        return {
          customer: c,
          current_balance: c.current_balance,
          credit_limit: c.credit_limit || 0,
          isOverLimit: c.credit_limit ? c.current_balance > c.credit_limit : false,
          lastMovementDate: lastMovement?.entry_date,
          daysSinceLastMovement,
          agingCategory,
        };
      })
      .sort((a, b) => b.current_balance - a.current_balance);
  }, [customers]);

  // -------------------------------------------------------------
  // REPORT 5: Supplier Payables
  // -------------------------------------------------------------
  const supplierPayablesReport = useMemo(() => {
    return suppliers.map((s) => {
      const ledgers = storage.getSupplierLedger(s.id);
      const lastMovement = ledgers[ledgers.length - 1];
      return {
        supplier: s,
        current_balance: s.current_balance,
        lastMovementDate: lastMovement?.entry_date,
        totalPurchases: ledgers
          .filter((l) => l.entry_type === 'purchase')
          .reduce((sum, l) => sum + l.credit, 0),
        totalPaid: ledgers
          .filter((l) => l.entry_type === 'payment')
          .reduce((sum, l) => sum + l.debit, 0),
      };
    }).sort((a, b) => b.current_balance - a.current_balance);
  }, [suppliers]);

  // -------------------------------------------------------------
  // REPORT 6: Stock Movements
  // -------------------------------------------------------------
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [selectedMovementType, setSelectedMovementType] = useState<string>('all');

  const filteredStockMovements = useMemo(() => {
    return stockMovements.filter((m) => {
      const mTime = new Date(m.created_at).getTime();
      const matchStart = !startDate || mTime >= new Date(startDate).getTime();
      const matchEnd = !endDate || mTime <= new Date(endDate + 'T23:59:59').getTime();
      const matchWh = selectedWarehouseId === 'all' || m.warehouse_id === selectedWarehouseId;
      const matchType =
        selectedMovementType === 'all' || m.movement_type === selectedMovementType;
      const matchSearch =
        !searchTerm ||
        m.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.movement_number.toLowerCase().includes(searchTerm.toLowerCase());

      return matchStart && matchEnd && matchWh && matchType && matchSearch;
    });
  }, [stockMovements, startDate, endDate, selectedWarehouseId, selectedMovementType, searchTerm]);

  // -------------------------------------------------------------
  // REPORT 7: Stagnant, Expired & Near Expiry Products
  // -------------------------------------------------------------
  const [expiryCategoryFilter, setExpiryCategoryFilter] = useState<
    'all' | 'expired' | 'within30' | 'within90' | 'stagnant'
  >('all');

  const stagnantAndExpiryList = useMemo(() => {
    const now = new Date();
    const nowTime = now.getTime();

    return products.map((p) => {
      const totalQty = (p.stock_shop || 0) + (p.stock_warehouse || 0);
      let expiryStatus: 'expired' | 'within30' | 'within90' | 'valid' | 'no_date' = 'no_date';
      let daysRemaining: number | null = null;

      if (p.expiry_date) {
        const expTime = new Date(p.expiry_date).getTime();
        daysRemaining = Math.ceil((expTime - nowTime) / 86400000);

        if (daysRemaining <= 0) expiryStatus = 'expired';
        else if (daysRemaining <= 30) expiryStatus = 'within30';
        else if (daysRemaining <= 90) expiryStatus = 'within90';
        else expiryStatus = 'valid';
      }

      // Check if product is stagnant: has positive stock but no sales in sales invoices
      const hasSale = salesInvoices.some((inv) =>
        inv.items.some((it) => it.product_id === p.id)
      );
      const isStagnant = totalQty > 0 && !hasSale;

      return {
        product: p,
        totalQty,
        totalValue: totalQty * p.default_purchase_price,
        expiryStatus,
        daysRemaining,
        isStagnant,
      };
    }).filter((item) => {
      if (expiryCategoryFilter === 'expired') return item.expiryStatus === 'expired';
      if (expiryCategoryFilter === 'within30') return item.expiryStatus === 'within30';
      if (expiryCategoryFilter === 'within90')
        return item.expiryStatus === 'within90' || item.expiryStatus === 'within30';
      if (expiryCategoryFilter === 'stagnant') return item.isStagnant;
      return (
        item.expiryStatus === 'expired' ||
        item.expiryStatus === 'within30' ||
        item.expiryStatus === 'within90' ||
        item.isStagnant
      );
    });
  }, [products, salesInvoices, expiryCategoryFilter]);

  // -------------------------------------------------------------
  // REPORT 8: Profit and Loss (P&L) Estimation
  // -------------------------------------------------------------
  const profitAndLoss = useMemo(() => {
    let totalRevenue = 0;
    let totalCostOfGoodsSold = 0;

    filteredSalesInvoices.forEach((inv) => {
      totalRevenue += inv.total_amount;
      inv.items.forEach((item) => {
        const p = products.find((prod) => prod.id === item.product_id);
        const costPerBaseUnit = p ? p.default_purchase_price : item.unit_price * 0.75;
        totalCostOfGoodsSold += item.qty_in_base_unit * costPerBaseUnit;
      });
    });

    const grossProfit = totalRevenue - totalCostOfGoodsSold;
    const grossMarginPercent =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Filter expenses in same date range
    const periodExpenses = expenses.filter((e) => {
      const eTime = new Date(e.expense_date).getTime();
      const matchStart = !startDate || eTime >= new Date(startDate).getTime();
      const matchEnd = !endDate || eTime <= new Date(endDate + 'T23:59:59').getTime();
      return matchStart && matchEnd;
    });

    const totalExpenses = periodExpenses.reduce((s, e) => s + e.amount, 0);
    const netProfit = grossProfit - totalExpenses;
    const netMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Breakdown of expenses by category
    const expenseByCategory: Record<string, number> = {};
    periodExpenses.forEach((e) => {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
    });

    return {
      totalRevenue,
      totalCostOfGoodsSold,
      grossProfit,
      grossMarginPercent,
      totalExpenses,
      netProfit,
      netMarginPercent,
      expenseByCategory,
    };
  }, [filteredSalesInvoices, expenses, products, startDate, endDate]);

  // -------------------------------------------------------------
  // REPORT 9: Treasury & Cash Flow
  // -------------------------------------------------------------
  const treasurySummary = useMemo(() => {
    return cashAccounts.map((acc) => {
      const txs = cashTransactions.filter((tx) => tx.cash_account_id === acc.id);
      const totalIn = txs
        .filter((tx) => tx.direction === 'in')
        .reduce((s, tx) => s + tx.amount, 0);
      const totalOut = txs
        .filter((tx) => tx.direction === 'out')
        .reduce((s, tx) => s + tx.amount, 0);

      return {
        account: acc,
        totalIn,
        totalOut,
        currentBalance: acc.current_balance,
        transactionsCount: txs.length,
      };
    });
  }, [cashAccounts, cashTransactions]);

  // Tab definitions
  const tabs = [
    { id: 'daily_monthly_sales', label: 'المبيعات اليومية والشهرية', icon: TrendingUp },
    { id: 'sales_by_dimension', label: 'المبيعات بالمنتج والعميل', icon: BarChart3 },
    { id: 'collections_receipts', label: 'التحصيلات والمقبوضات', icon: BadgeDollarSign },
    { id: 'customer_debts', label: 'ديون العملاء وأعمار الديون', icon: Users },
    { id: 'supplier_payables', label: 'مستحقات الموردين', icon: Building2 },
    { id: 'stock_movements', label: 'حركة المخزون العام', icon: History },
    { id: 'stagnant_expired_stock', label: 'الرواكد ومنتهي الصلاحية', icon: AlertTriangle },
    { id: 'profit_and_loss', label: 'الأرباح والخسائر التقديرية', icon: Coins },
    { id: 'treasury_cashflow', label: 'حركة الخزينة والمطابقة', icon: Landmark },
  ];

  const handleExportCurrent = () => {
    if (activeTab === 'daily_monthly_sales') {
      const headers = ['الفترة', 'عدد الفواتير', 'إجمالي المبيعات', 'المحصل نقداً', 'الآجل المتبقي'];
      const rows = groupedSales.map((g) => [g.period, g.count, g.total, g.cash, g.credit]);
      exportToCsv(`تقرير_المبيعات_${salesGrouping}_${new Date().toISOString().slice(0, 10)}`, headers, rows);
    } else if (activeTab === 'sales_by_dimension') {
      const headers = ['رقم الفاتورة', 'التاريخ', 'العميل', 'المنتج', 'الوحدة', 'الكمية', 'سعر الوحدة', 'الإجمالي'];
      const rows = dimensionalSalesItems.map((i) => [
        i.invoice_number,
        formatDate(i.invoice_date),
        i.customer_name,
        i.product_name,
        i.unit_name,
        i.qty,
        i.unit_price,
        i.total_price,
      ]);
      exportToCsv(`تقرير_المبيعات_التفصيلي_${new Date().toISOString().slice(0, 10)}`, headers, rows);
    } else if (activeTab === 'customer_debts') {
      const headers = ['كود العميل', 'اسم العميل', 'الرصيد المستحق', 'الحد الائتماني', 'أعمار الديون', 'تاريخ آخر حركة'];
      const rows = customerDebtsReport.map((c) => [
        c.customer.code,
        c.customer.name,
        c.current_balance,
        c.credit_limit,
        c.agingCategory,
        c.lastMovementDate ? formatDate(c.lastMovementDate) : 'لا توجد',
      ]);
      exportToCsv(`تقرير_ديون_العملاء_وأعمار_الديون_${new Date().toISOString().slice(0, 10)}`, headers, rows);
    } else if (activeTab === 'stagnant_expired_stock') {
      const headers = ['كود المنتج', 'اسم المنتج', 'رقم التشغيلة', 'تاريخ الصلاحية', 'الأيام المتبقية', 'حالة الصلاحية', 'الرصيد المتاح', 'القيمة التقديرية'];
      const rows = stagnantAndExpiryList.map((i) => [
        i.product.code,
        i.product.name,
        i.product.batch_number || 'غير محدد',
        i.product.expiry_date || 'غير محدد',
        i.daysRemaining ?? '-',
        i.expiryStatus === 'expired' ? 'منتهي الصلاحية' : i.expiryStatus === 'within30' ? 'ينتهي خلال 30 يوم' : 'صالح',
        i.totalQty,
        i.totalValue,
      ]);
      exportToCsv(`تقرير_صلاحية_ورواكد_المبيدات_${new Date().toISOString().slice(0, 10)}`, headers, rows);
    } else {
      printVisibleArea();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Tabs */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-sm">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                مركز التقارير المالية والمخزنية المتكاملة
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
                استخراج تقارير حية ومؤشرات دقيقة من قاعدة البيانات مع فلاتر التاريخ والتصدير
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCurrent}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 rounded-xl shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>تصدير Excel</span>
            </button>
            <button
              onClick={() => printVisibleArea()}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة</span>
            </button>
          </div>
        </div>

        {/* 9 Tabs Selector Bar with Comfortable Spacing */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ReportTab)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50/80 text-slate-700 hover:bg-slate-100 border border-slate-200/70'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>نطاق الفترة:</span>
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-xs">من:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs sm:text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-xs">إلى:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs sm:text-sm"
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-slate-500 hover:text-slate-800 underline text-xs"
            >
              إلغاء الفترة
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث في نتائج التقرير..."
            className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. REPORT: Daily and Monthly Sales */}
      {/* ========================================================= */}
      {activeTab === 'daily_monthly_sales' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setSalesGrouping('daily')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  salesGrouping === 'daily'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                المبيعات اليومية
              </button>
              <button
                onClick={() => setSalesGrouping('monthly')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  salesGrouping === 'monthly'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                المبيعات الشهرية
              </button>
            </div>
          </div>

          <div className="invoice-print-area bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-3">الفترة ({salesGrouping === 'daily' ? 'اليوم' : 'الشهر'})</th>
                    <th className="py-3 px-3 text-center">عدد الفواتير</th>
                    <th className="py-3 px-3 text-left">إجمالي المبيعات</th>
                    <th className="py-3 px-3 text-left">المحصل نقداً</th>
                    <th className="py-3 px-3 text-left">الآجل المتبقي</th>
                    <th className="py-3 px-3 text-left">متوسط الفاتورة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupedSales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        لا توجد فواتير مبيعات في الفترة المختارة
                      </td>
                    </tr>
                  ) : (
                    groupedSales.map((g) => (
                      <tr key={g.period} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {g.period}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">{g.count}</td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">
                          {formatCurrency(g.total)}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-medium text-emerald-700">
                          {formatCurrency(g.cash)}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-medium text-amber-800">
                          {formatCurrency(g.credit)}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono text-slate-500">
                          {formatCurrency(g.total / (g.count || 1))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. REPORT: Sales by Dimension (Period, Product, Customer) */}
      {/* ========================================================= */}
      {activeTab === 'sales_by_dimension' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-slate-500">تصفية بالمنتج:</span>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs max-w-[200px]"
              >
                <option value="all">جميع المنتجات</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-slate-500">تصفية بالعميل:</span>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs max-w-[200px]"
              >
                <option value="all">جميع العملاء</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="invoice-print-area bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-3">رقم الفاتورة</th>
                    <th className="py-3 px-3">التاريخ</th>
                    <th className="py-3 px-3">العميل</th>
                    <th className="py-3 px-3">المنتج والمبيد</th>
                    <th className="py-3 px-3 text-center">الوحدة</th>
                    <th className="py-3 px-3 text-center">الكمية</th>
                    <th className="py-3 px-3 text-left">السعر</th>
                    <th className="py-3 px-3 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dimensionalSalesItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        لا توجد مبيعات تطابق محددات البحث والفترة
                      </td>
                    </tr>
                  ) : (
                    dimensionalSalesItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                          {item.invoice_number}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                          {formatDate(item.invoice_date)}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {item.customer_name}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {item.product_name}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600">
                          {item.unit_name}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          {item.qty}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-800">
                          {formatCurrency(item.total_price)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. REPORT: Collections and Receipts */}
      {/* ========================================================= */}
      {activeTab === 'collections_receipts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block">إجمالي المقبوضات والتحصيلات</span>
              <span className="text-xl font-bold font-mono text-emerald-700 block mt-1">
                {formatCurrency(collectionsList.reduce((s, tx) => s + tx.amount, 0))}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block">عدد عمليات التحصيل</span>
              <span className="text-xl font-bold font-mono text-slate-900 block mt-1">
                {collectionsList.length} عملية
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block">الخزينة المحددة</span>
              <select
                value={selectedCashAccountId}
                onChange={(e) => setSelectedCashAccountId(e.target.value)}
                className="mt-1 w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs"
              >
                <option value="all">جميع الخزائن والبنوك</option>
                {cashAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="invoice-print-area bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-3">رقم الإيصال</th>
                    <th className="py-3 px-3">التاريخ والوقت</th>
                    <th className="py-3 px-3">العميل / الطرف</th>
                    <th className="py-3 px-3">الخزينة المستلمة</th>
                    <th className="py-3 px-3">نوع العملية</th>
                    <th className="py-3 px-3 text-left">المبلغ المحصل</th>
                    <th className="py-3 px-3">البيان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {collectionsList.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                        {tx.transaction_number}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                        {formatDateTime(tx.transaction_date)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {tx.party_name || 'عميل نقدي'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{tx.cash_account_name}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 font-medium">
                          {tx.transaction_type === 'sales_inflow'
                            ? 'تحصيل مبيعات'
                            : 'سند قبض عميل'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-700">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                        {tx.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. REPORT: Customer Debts and Aging */}
      {/* ========================================================= */}
      {activeTab === 'customer_debts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block">إجمالي مديونيات العملاء</span>
              <span className="text-xl font-bold font-mono text-amber-800 block mt-1">
                {formatCurrency(
                  customerDebtsReport.reduce((s, c) => s + c.current_balance, 0)
                )}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block">عدد المزارعين المدينين</span>
              <span className="text-xl font-bold font-mono text-slate-900 block mt-1">
                {customerDebtsReport.length} عميل
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block">ديون متأخرة (&gt; 60 يوم)</span>
              <span className="text-xl font-bold font-mono text-rose-700 block mt-1">
                {formatCurrency(
                  customerDebtsReport
                    .filter((c) => c.agingCategory === '60-90 يوم' || c.agingCategory === '> 90 يوم')
                    .reduce((s, c) => s + c.current_balance, 0)
                )}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block">عملاء تجاوزوا الحد الائتماني</span>
              <span className="text-xl font-bold font-mono text-rose-700 block mt-1">
                {customerDebtsReport.filter((c) => c.isOverLimit).length} عميل
              </span>
            </div>
          </div>

          <div className="invoice-print-area bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-3">كود واسم العميل</th>
                    <th className="py-3 px-3">الهاتف والقرية</th>
                    <th className="py-3 px-3 text-left">الحد الائتماني</th>
                    <th className="py-3 px-3 text-left font-bold text-amber-900">
                      الرصيد المستحق (المديونية)
                    </th>
                    <th className="py-3 px-3 text-center">أعمار الديون</th>
                    <th className="py-3 px-3 text-center">أيام منذ آخر حركة</th>
                    <th className="py-3 px-3">تاريخ آخر حركة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerDebtsReport.map((c) => (
                    <tr key={c.customer.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{c.customer.name}</div>
                        <span className="font-mono text-[10px] text-slate-400">
                          {c.customer.code}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        <div>{c.customer.phone || '-'}</div>
                        <div className="text-[10px] text-slate-400">
                          {c.customer.village_or_address || ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono text-slate-500">
                        {c.credit_limit > 0 ? formatCurrency(c.credit_limit) : 'غير محدد'}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-amber-800 text-sm">
                        {formatCurrency(c.current_balance)}
                        {c.isOverLimit && (
                          <span className="text-[10px] font-normal text-rose-600 block">
                            (تجاوز الحد)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.agingCategory === '< 30 يوم'
                              ? 'bg-emerald-50 text-emerald-800'
                              : c.agingCategory === '30-60 يوم'
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-rose-100 text-rose-900'
                          }`}
                        >
                          {c.agingCategory}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {c.daysSinceLastMovement} يوم
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                        {c.lastMovementDate ? formatDate(c.lastMovementDate) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. REPORT: Supplier Payables */}
      {/* ========================================================= */}
      {activeTab === 'supplier_payables' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block">إجمالي التزامات المحل للموردين</span>
              <span className="text-xl font-bold font-mono text-amber-800">
                {formatCurrency(supplierPayablesReport.reduce((s, item) => s + Math.max(0, item.current_balance), 0))}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              عدد الشركات المستحقة: {supplierPayablesReport.filter((s) => s.current_balance > 0).length}
            </div>
          </div>

          <div className="invoice-print-area bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-3">كود واسم الشركة</th>
                    <th className="py-3 px-3">المسؤول والهاتف</th>
                    <th className="py-3 px-3 text-left">إجمالي المشتريات</th>
                    <th className="py-3 px-3 text-left">إجمالي المسدد</th>
                    <th className="py-3 px-3 text-left font-bold text-amber-900">
                      صافي المستحق للمورد
                    </th>
                    <th className="py-3 px-3">تاريخ آخر حركة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierPayablesReport.map((item) => (
                    <tr key={item.supplier.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{item.supplier.name}</div>
                        <div className="text-slate-500 text-[11px]">{item.supplier.company_name}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {item.supplier.phone || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-medium">
                        {formatCurrency(item.totalPurchases)}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-medium text-emerald-700">
                        {formatCurrency(item.totalPaid)}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-amber-800 text-sm">
                        {formatCurrency(item.current_balance)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                        {item.lastMovementDate ? formatDate(item.lastMovementDate) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. REPORT: Stock Movements */}
      {/* ========================================================= */}
      {activeTab === 'stock_movements' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-slate-500">المخزن:</span>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              >
                <option value="all">جميع المستودعات</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-slate-500">نوع الحركة:</span>
              <select
                value={selectedMovementType}
                onChange={(e) => setSelectedMovementType(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              >
                <option value="all">جميع أنواع الحركات</option>
                <option value="sale">مبيعات صيدلية</option>
                <option value="purchase">مشتريات وتوريد</option>
                <option value="transfer_out">تحويل منصرف</option>
                <option value="transfer_in">تحويل وارد</option>
                <option value="adjustment_plus">تسوية جردية (+)</option>
                <option value="adjustment_minus">تسوية جردية (-)</option>
                <option value="sale_return">مرتجع مبيعات</option>
              </select>
            </div>
          </div>

          <div className="invoice-print-area bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-3">رقم الحركة</th>
                    <th className="py-3 px-3">التاريخ والوقت</th>
                    <th className="py-3 px-3">المخزن</th>
                    <th className="py-3 px-3">المنتج</th>
                    <th className="py-3 px-3">نوع الحركة</th>
                    <th className="py-3 px-3 text-center">الكمية (أساسي)</th>
                    <th className="py-3 px-3 text-left">الرصيد بعدها</th>
                    <th className="py-3 px-3">البيان والملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStockMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                        {m.movement_number}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                        {formatDateTime(m.created_at)}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {m.warehouse_name}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {m.product_name}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-800">
                          {m.movement_type === 'sale'
                            ? 'صرف مبيعات'
                            : m.movement_type === 'purchase'
                            ? 'توريد مشتريات'
                            : m.movement_type === 'transfer_out'
                            ? 'تحويل منصرف'
                            : m.movement_type === 'transfer_in'
                            ? 'تحويل وارد'
                            : m.movement_type === 'sale_return'
                            ? 'مرتجع مبيعات'
                            : 'تسوية رصيد'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        <span className={m.qty_in_base_unit > 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {m.qty_in_base_unit > 0 ? `+${m.qty_in_base_unit}` : m.qty_in_base_unit}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-semibold">
                        {m.balance_after}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                        {m.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. REPORT: Stagnant & Expired Products */}
      {/* ========================================================= */}
      {activeTab === 'stagnant_expired_stock' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setExpiryCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  expiryCategoryFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الكل والمخاطر ({stagnantAndExpiryList.length})
              </button>
              <button
                onClick={() => setExpiryCategoryFilter('expired')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  expiryCategoryFilter === 'expired'
                    ? 'bg-rose-100 text-rose-900 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                منتهية الصلاحية
              </button>
              <button
                onClick={() => setExpiryCategoryFilter('within30')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  expiryCategoryFilter === 'within30'
                    ? 'bg-amber-100 text-amber-900 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تنتهي خلال 30 يوماً
              </button>
              <button
                onClick={() => setExpiryCategoryFilter('stagnant')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  expiryCategoryFilter === 'stagnant'
                    ? 'bg-blue-100 text-blue-900 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                منتجات راكدة (بلا مبيعات)
              </button>
            </div>
          </div>

          <div className="invoice-print-area bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-3">كود واسم المبيد / الصنف</th>
                    <th className="py-3 px-3">المادة الفعالة والشركة</th>
                    <th className="py-3 px-3">رقم التشغيلة</th>
                    <th className="py-3 px-3">تاريخ الصلاحية</th>
                    <th className="py-3 px-3 text-center">الأيام المتبقية</th>
                    <th className="py-3 px-3 text-center">الرصيد المتوفر</th>
                    <th className="py-3 px-3 text-left">القيمة الراكدة</th>
                    <th className="py-3 px-3 text-center">حالة التنبيه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stagnantAndExpiryList.map((item) => (
                    <tr key={item.product.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{item.product.name}</div>
                        <span className="font-mono text-[10px] text-slate-400">
                          {item.product.code}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        <div>{item.product.active_ingredient || '-'}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.product.manufacturer}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {item.product.batch_number || 'غير مسجل'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {item.product.expiry_date || 'غير محدد'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {item.daysRemaining !== null ? (
                          <span
                            className={
                              item.daysRemaining <= 0
                                ? 'text-rose-700 font-bold'
                                : item.daysRemaining <= 30
                                ? 'text-amber-700 font-bold'
                                : 'text-slate-700'
                            }
                          >
                            {item.daysRemaining <= 0
                              ? `منتهي (${Math.abs(item.daysRemaining)} يوم)`
                              : `${item.daysRemaining} يوم`}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        {item.totalQty} {item.product.base_unit_name}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-semibold text-rose-800">
                        {formatCurrency(item.totalValue)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.expiryStatus === 'expired'
                              ? 'bg-rose-100 text-rose-900 border border-rose-300'
                              : item.expiryStatus === 'within30'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : item.isStagnant
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : 'bg-yellow-50 text-yellow-800'
                          }`}
                        >
                          {item.expiryStatus === 'expired'
                            ? 'منتهي الصلاحية فوراً'
                            : item.expiryStatus === 'within30'
                            ? 'إشعار انتهاء وشيك (أقل من شهر)'
                            : item.isStagnant
                            ? 'صنف راكد بلا سحب'
                            : 'قريب الانتهاء (3 أشهر)'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8. REPORT: Estimated Profit & Loss (P&L) */}
      {/* ========================================================= */}
      {activeTab === 'profit_and_loss' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block">إجمالي إيراد المبيعات</span>
              <span className="text-xl font-bold font-mono text-slate-900 block mt-1">
                {formatCurrency(profitAndLoss.totalRevenue)}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block">تكلفة البضاعة المباعة (COGS)</span>
              <span className="text-xl font-bold font-mono text-slate-700 block mt-1">
                {formatCurrency(profitAndLoss.totalCostOfGoodsSold)}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block">مجمل الربح التجاري</span>
              <span className="text-xl font-bold font-mono text-emerald-700 block mt-1">
                {formatCurrency(profitAndLoss.grossProfit)}
              </span>
              <span className="text-[10px] text-emerald-600 font-mono">
                هامش مجمل: {profitAndLoss.grossMarginPercent.toFixed(1)}%
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block">صافي الربح التشغيلي</span>
              <span
                className={`text-xl font-bold font-mono block mt-1 ${
                  profitAndLoss.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {formatCurrency(profitAndLoss.netProfit)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                هامش صافي: {profitAndLoss.netMarginPercent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Detailed P&L Statement */}
          <div className="invoice-print-area bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-200">
              قائمة الدخل والأرباح التشغيلية التقديرية
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="font-semibold text-slate-800">1. إجمالي إيرادات مبيعات المحل</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(profitAndLoss.totalRevenue)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 text-slate-600">
                <span>يخصم: تكلفة البضاعة المباعة بناءً على أسعار الشراء</span>
                <span className="font-mono text-rose-700">
                  - {formatCurrency(profitAndLoss.totalCostOfGoodsSold)}
                </span>
              </div>
              <div className="flex justify-between py-2.5 bg-emerald-50 px-3 rounded-lg font-bold text-emerald-950">
                <span>= مجمل الربح من النشاط (Gross Margin)</span>
                <span className="font-mono">{formatCurrency(profitAndLoss.grossProfit)}</span>
              </div>

              <div className="pt-2">
                <span className="font-semibold text-slate-800 block mb-2">
                  2. المصروفات التشغيلية والعمومية المسجلة:
                </span>
                <div className="bg-slate-50 p-3 rounded-lg space-y-1.5 font-mono">
                  {Object.entries(profitAndLoss.expenseByCategory).map(([cat, amt]) => (
                    <div key={cat} className="flex justify-between text-slate-600 text-[11px]">
                      <span>{cat}:</span>
                      <span>- {formatCurrency(amt)}</span>
                    </div>
                  ))}
                  {Object.keys(profitAndLoss.expenseByCategory).length === 0 && (
                    <span className="text-slate-400 text-[11px]">لا توجد مصروفات مسجلة في الفترة</span>
                  )}
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                    <span>إجمالي المصروفات:</span>
                    <span className="text-rose-700">- {formatCurrency(profitAndLoss.totalExpenses)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between py-3 bg-slate-900 text-white px-4 rounded-xl font-bold text-sm mt-3">
                <span>= صافي الأرباح التشغيلية المقدرة (Net Profit)</span>
                <span className="font-mono text-emerald-400">
                  {formatCurrency(profitAndLoss.netProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 9. REPORT: Treasury & Cashflow Reconciliation */}
      {/* ========================================================= */}
      {activeTab === 'treasury_cashflow' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {treasurySummary.map((item) => (
              <div key={item.account.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">{item.account.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 font-mono">
                    {item.account.account_type === 'cash' ? 'درج كاشير / نقدي' : 'حساب بنكي'}
                  </span>
                </div>
                <div className="mt-2 text-xl font-bold font-mono text-slate-900">
                  {formatCurrency(item.currentBalance)}
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>وارد: +{formatCurrency(item.totalIn)}</span>
                  <span>منصرف: -{formatCurrency(item.totalOut)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="invoice-print-area bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 font-bold text-xs text-slate-900">
              سجل الحركات النقدية والبنكية بالخزينة
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-3">رقم الحركة</th>
                    <th className="py-3 px-3">التاريخ والوقت</th>
                    <th className="py-3 px-3">الخزينة</th>
                    <th className="py-3 px-3">نوع العملية والطرف</th>
                    <th className="py-3 px-3 text-center">الاتجاه</th>
                    <th className="py-3 px-3 text-left">المبلغ</th>
                    <th className="py-3 px-3 text-left">الرصيد بعدها</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashTransactions.slice(0, 30).map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                        {tx.transaction_number}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                        {formatDateTime(tx.transaction_date)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">{tx.cash_account_name}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900">{tx.description}</div>
                        <span className="text-[10px] text-slate-400">{tx.party_name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.direction === 'in'
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-rose-50 text-rose-800'
                          }`}
                        >
                          {tx.direction === 'in' ? 'وارد (+)' : 'صادر (-)'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold">
                        <span className={tx.direction === 'in' ? 'text-emerald-700' : 'text-rose-700'}>
                          {tx.direction === 'in' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-semibold text-slate-900">
                        {formatCurrency(tx.balance_after)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
