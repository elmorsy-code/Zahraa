import {
  Product,
  ProductCategory,
  Warehouse,
  StockBalance,
  StockMovement,
  StockTransfer,
  Customer,
  Supplier,
  CashAccount,
  CashTransaction,
  Expense,
  SalesInvoice,
  PurchaseInvoice,
  OldLedgerEntry,
  CustomerLedgerEntry,
  SupplierLedgerEntry,
  AppSettings,
  CustomerPayment,
  SupplierPayment,
  SalesReturn,
  MigrationProject,
  MigrationPage,
  MigrationEntry,
  AuditLog,
  StockBatch,
  SalesInvoiceItemBatch,
  ExpiringBatchItem,
} from '../types/database';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const DEFAULT_SETTINGS: AppSettings = {
  company_info: {
    name: 'مؤسسة الزهراء للأدوية والمبيدات الزراعية',
    activity: 'تجارة المبيدات والأسمدة والمخصبات والتقاوي والأدوية البيطرية',
    commercial_reg: '1049284',
    tax_card: '489-321-99',
    phone: '01002345678',
    address: 'طريق المحطة، الدلتا، جمهورية مصر العربية',
    invoice_footer: 'البضاعة المباعة تخضع لإرشادات الاستخدام الفني الزراعي. نضمن أصالة كافة المركبات والعبوات.',
  },
  pos_settings: {
    allow_negative_stock: false,
    enable_tax: false,
    tax_percentage: 0.0,
    print_immediately: true,
    default_warehouse_id: 'a0000000-0000-0000-0000-000000000001',
    default_cash_account_id: 'b0000000-0000-0000-0000-000000000001',
  },
};

class DataStorage {
  private listeners: Set<() => void> = new Set();
  private isHydrated: boolean = false;
  private isHydrating: boolean = false;
  private realtimeChannel: any = null;

  // In-Memory Cache for fast synchronous UI rendering
  private categories: ProductCategory[] = [];
  private warehouses: Warehouse[] = [];
  private cashAccounts: CashAccount[] = [];
  private products: Product[] = [];
  private stockBalances: StockBalance[] = [];
  private stockBatches: StockBatch[] = [];
  private stockMovements: StockMovement[] = [];
  private stockTransfers: StockTransfer[] = [];
  private customers: Customer[] = [];
  private suppliers: Supplier[] = [];
  private customerLedger: CustomerLedgerEntry[] = [];
  private supplierLedger: SupplierLedgerEntry[] = [];
  private customerPayments: CustomerPayment[] = [];
  private supplierPayments: SupplierPayment[] = [];
  private salesInvoices: SalesInvoice[] = [];
  private salesInvoiceItemBatches: SalesInvoiceItemBatch[] = [];
  private purchaseInvoices: PurchaseInvoice[] = [];
  private salesReturns: SalesReturn[] = [];
  private expenses: Expense[] = [];
  private cashTransactions: CashTransaction[] = [];
  private oldLedgers: OldLedgerEntry[] = [];
  private migrationProjects: MigrationProject[] = [];
  private migrationPages: MigrationPage[] = [];
  private migrationEntries: MigrationEntry[] = [];
  private auditLogs: AuditLog[] = [];
  private settings: AppSettings = DEFAULT_SETTINGS;

  constructor() {
    try {
      const cached = localStorage.getItem('cached_app_settings');
      if (cached) {
        this.settings = JSON.parse(cached);
      }
    } catch {}

    // If Supabase is configured, kick off initial hydration
    if (isSupabaseConfigured()) {
      this.hydrate();
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notify(): void {
    this.listeners.forEach((l) => l());
  }

  public getIsHydrated(): boolean {
    return this.isHydrated;
  }

  // --- Hydrate All Data from Supabase ---
  public async hydrate(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    if (this.isHydrating) return;

    this.isHydrating = true;
    try {
      const [
        categoriesRes,
        warehousesRes,
        cashAccountsRes,
        productsRes,
        productUnitsRes,
        stockBalancesRes,
        stockMovementsRes,
        stockTransfersRes,
        stockTransferItemsRes,
        customersRes,
        suppliersRes,
        customerLedgerRes,
        supplierLedgerRes,
        customerPaymentsRes,
        supplierPaymentsRes,
        salesInvoicesRes,
        salesInvoiceItemsRes,
        purchaseInvoicesRes,
        purchaseInvoiceItemsRes,
        salesReturnsRes,
        salesReturnItemsRes,
        expensesRes,
        cashTransactionsRes,
        oldLedgersRes,
        migrationProjectsRes,
        migrationPagesRes,
        migrationEntriesRes,
        auditLogsRes,
        settingsRes,
        stockBatchesRes,
        salesInvoiceBatchesRes,
      ] = await Promise.all([
        supabase.from('product_categories').select('*').order('name'),
        supabase.from('warehouses').select('*').order('is_primary', { ascending: false }),
        supabase.from('cash_accounts').select('*').order('is_primary', { ascending: false }),
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('product_units').select('*').order('sort_order', { ascending: true }),
        supabase.from('stock_balances').select('*'),
        supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('stock_transfers').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('stock_transfer_items').select('*'),
        supabase.from('customers').select('*').order('name'),
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('customer_ledger_entries').select('*').order('entry_date', { ascending: true }),
        supabase.from('supplier_ledger_entries').select('*').order('entry_date', { ascending: true }),
        supabase.from('customer_payments').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('supplier_payments').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('sales_invoices').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('sales_invoice_items').select('*'),
        supabase.from('purchase_invoices').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('purchase_invoice_items').select('*'),
        supabase.from('sales_returns').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('sales_return_items').select('*'),
        supabase.from('expenses').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('cash_transactions').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('old_ledgers').select('*').order('created_at', { ascending: false }),
        supabase.from('migration_projects').select('*').order('created_at', { ascending: false }),
        supabase.from('migration_pages').select('*').order('created_at', { ascending: false }),
        supabase.from('migration_entries').select('*').order('line_number', { ascending: true }),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('app_settings').select('*'),
        supabase.from('stock_batches').select('*'),
        supabase.from('sales_invoice_item_batches').select('*'),
      ]);

      if (categoriesRes.data) this.categories = categoriesRes.data;
      if (warehousesRes.data) this.warehouses = warehousesRes.data;
      if (cashAccountsRes.data) this.cashAccounts = cashAccountsRes.data;
      if (stockBalancesRes.data) this.stockBalances = stockBalancesRes.data;
      if (stockBatchesRes.data) this.stockBatches = stockBatchesRes.data;
      if (salesInvoiceBatchesRes.data) this.salesInvoiceItemBatches = salesInvoiceBatchesRes.data;
      if (stockMovementsRes.data) this.stockMovements = stockMovementsRes.data;
      if (customersRes.data) {
        this.customers = customersRes.data.map((c: any) => {
          let partnerName = c.partner_name || '';
          let cleanNotes = c.notes || '';
          // Fallback parsing from notes if partner_name column is not populated
          if (!partnerName && c.notes) {
            const m = c.notes.match(/\[شريك:\s*([^\]]+)\]/);
            if (m) {
              partnerName = m[1].trim();
            }
          }
          return {
            ...c,
            partner_name: partnerName || undefined,
          };
        });
      }
      if (suppliersRes.data) this.suppliers = suppliersRes.data;
      if (customerLedgerRes.data) this.customerLedger = customerLedgerRes.data;
      if (supplierLedgerRes.data) this.supplierLedger = supplierLedgerRes.data;
      if (customerPaymentsRes.data) this.customerPayments = customerPaymentsRes.data;
      if (supplierPaymentsRes.data) this.supplierPayments = supplierPaymentsRes.data;
      if (expensesRes.data) this.expenses = expensesRes.data;
      if (cashTransactionsRes.data) this.cashTransactions = cashTransactionsRes.data;
      if (oldLedgersRes.data) this.oldLedgers = oldLedgersRes.data;
      if (migrationProjectsRes.data) this.migrationProjects = migrationProjectsRes.data;
      if (migrationPagesRes.data) this.migrationPages = migrationPagesRes.data;
      if (migrationEntriesRes.data) this.migrationEntries = migrationEntriesRes.data;
      if (auditLogsRes.data) this.auditLogs = auditLogsRes.data;

      // Hydrate Stock Transfers with items
      if (stockTransfersRes.data) {
        const transferItems = stockTransferItemsRes.data || [];
        this.stockTransfers = stockTransfersRes.data.map((st) => ({
          ...st,
          items: transferItems.filter((it) => it.transfer_id === st.id),
        }));
      }

      // Hydrate Sales Invoices with items
      if (salesInvoicesRes.data) {
        const invoiceItems = salesInvoiceItemsRes.data || [];
        this.salesInvoices = salesInvoicesRes.data.map((inv) => ({
          ...inv,
          items: invoiceItems.filter((it) => it.invoice_id === inv.id),
        }));
      }

      // Hydrate Purchase Invoices with items
      if (purchaseInvoicesRes.data) {
        const purItems = purchaseInvoiceItemsRes.data || [];
        this.purchaseInvoices = purchaseInvoicesRes.data.map((pur) => ({
          ...pur,
          items: purItems.filter((it) => it.purchase_id === pur.id),
        }));
      }

      // Hydrate Sales Returns with items
      if (salesReturnsRes.data) {
        const retItems = salesReturnItemsRes.data || [];
        this.salesReturns = salesReturnsRes.data.map((r) => ({
          ...r,
          items: retItems.filter((it) => it.return_id === r.id),
        }));
      }

      // Hydrate Products with Units, Category, & Warehouse Stock Calculations
      if (productsRes.data) {
        const allUnits = productUnitsRes.data || [];
        const shopWh = this.warehouses.find((w) => w.location_type === 'shop' || w.is_primary);
        const mainWh = this.warehouses.find((w) => w.location_type === 'warehouse' && !w.is_primary);

        this.products = productsRes.data.map((p: any) => {
          const pUnits = allUnits.filter((u) => u.product_id === p.id);
          const pCat = this.categories.find((c) => c.id === p.category_id);

          const shopBal = this.stockBalances.find(
            (b) => b.product_id === p.id && b.warehouse_id === (shopWh?.id || 'a0000000-0000-0000-0000-000000000001')
          );
          const whBal = this.stockBalances.find(
            (b) => b.product_id === p.id && b.warehouse_id === (mainWh?.id || 'a0000000-0000-0000-0000-000000000002')
          );

          const stockShop = shopBal ? Number(shopBal.qty_in_base_unit) : 0;
          const stockWarehouse = whBal ? Number(whBal.qty_in_base_unit) : 0;

          // Sum of all stock for this product across all warehouses
          const totalStock = this.stockBalances
            .filter((b) => b.product_id === p.id)
            .reduce((sum, b) => sum + Number(b.qty_in_base_unit), 0);

          let imageUrl = p.image_url || '';
          let cleanDescription = p.description || '';
          if (!imageUrl && p.description) {
            const m = p.description.match(/\[صورة:\s*([^\]]+)\]/);
            if (m) {
              imageUrl = m[1].trim();
              cleanDescription = p.description.replace(/\[صورة:\s*[^\]]+\]\s*/g, '').trim();
            }
          }

          return {
            ...p,
            image_url: imageUrl || undefined,
            description: cleanDescription,
            units: pUnits,
            category: pCat,
            stock_shop: stockShop,
            stock_warehouse: stockWarehouse,
            total_stock: totalStock,
          };
        });
      }

      // Hydrate Settings
      if (settingsRes.data && settingsRes.data.length > 0) {
        const comp = settingsRes.data.find((s) => s.key === 'company_info');
        const pos = settingsRes.data.find((s) => s.key === 'pos_settings');
        this.settings = {
          company_info: comp ? comp.value : DEFAULT_SETTINGS.company_info,
          pos_settings: pos ? pos.value : DEFAULT_SETTINGS.pos_settings,
        };
      }

      this.isHydrated = true;
      this.setupRealtimeSubscription();
      this.notify();
    } catch (err) {
      console.error('Error hydrating data from Supabase:', err);
    } finally {
      this.isHydrating = false;
    }
  }

  // --- Realtime Sync ---
  private setupRealtimeSubscription(): void {
    const supabase = getSupabaseClient();
    if (!supabase || this.realtimeChannel) return;

    try {
      this.realtimeChannel = supabase
        .channel('db-realtime-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_balances' }, () => this.refreshStock())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_invoices' }, () => this.hydrate())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_accounts' }, () => this.refreshCash())
        .subscribe();
    } catch (e) {
      console.warn('Realtime channel warning:', e);
    }
  }

  private async refreshStock(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.from('stock_balances').select('*');
    if (data) {
      this.stockBalances = data;
      // recalculate products stock
      this.products = this.products.map((p) => {
        const totalStock = this.stockBalances
          .filter((b) => b.product_id === p.id)
          .reduce((sum, b) => sum + Number(b.qty_in_base_unit), 0);
        return { ...p, total_stock: totalStock };
      });
      this.notify();
    }
  }

  private async refreshCash(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.from('cash_accounts').select('*');
    if (data) {
      this.cashAccounts = data;
      this.notify();
    }
  }

  // --- Document Number Generator ---
  public async getNextDocNumber(prefix: string, customPrefix?: string): Promise<string> {
    // Specific custom sequential code for customers: CUST-1, CUST-2, ... (or any custom prefix)
    if (prefix === 'CUST') {
      return this.getNextCustomerCode(customPrefix);
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const typeMap: Record<string, string> = {
      INV: 'sales_invoice',
      PUR: 'purchase_invoice',
      TRF: 'stock_transfer',
      RCP: 'customer_payment',
      PAY: 'supplier_payment',
      EXP: 'expense',
      RET: 'sales_return',
      CSH: 'cash_transaction',
      CUST: 'customer',
      SUPP: 'supplier',
      PRD: 'product',
    };

    const seqType = typeMap[prefix] || 'sales_invoice';
    const { data, error } = await supabase.rpc('generate_document_number', {
      p_sequence_type: seqType,
    });

    if (error || !data) {
      return `${prefix}-${Date.now().toString().slice(-4)}`;
    }
    return data;
  }

  // توليد كود العميل المتسلسل تلقائياً: بادئة قابلة للتخصيص + رقم يزيد (CUST-1، ZAH-1، ...)
  // كل بادئة لها ترقيمها المستقل (ZAH-1, ZAH-2 ... و CUST-1, CUST-2 ...)
  public getNextCustomerCode(prefix: string = 'CUST'): string {
    const cleanPrefix = (prefix || 'CUST').trim().replace(/[-\s]+$/g, '') || 'CUST';
    const esc = cleanPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('^' + esc + '-?(\\d+)$', 'i');
    const isDefault = cleanPrefix.toUpperCase() === 'CUST';
    let maxNum = 0;
    for (const c of this.customers) {
      const codeStr = (c.code || '').trim();
      let match = codeStr.match(re);
      // للبادئة الافتراضية: ندعم كمان الصيغ القديمة C-1 أو رقم لوحده
      if (!match && isDefault) {
        match = codeStr.match(/^C-?(\d+)$/i) || codeStr.match(/^(\d+)$/);
      }
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    return `${cleanPrefix}-${maxNum + 1}`;
  }

  // --- Synchronous Getters ---
  public getCategories(): ProductCategory[] {
    return this.categories;
  }

  public getWarehouses(): Warehouse[] {
    return this.warehouses;
  }

  public getWarehouse(id: string): Warehouse | undefined {
    return this.warehouses.find((w) => w.id === id);
  }

  public getCashAccounts(): CashAccount[] {
    return this.cashAccounts;
  }

  public getCashAccount(id: string): CashAccount | undefined {
    return this.cashAccounts.find((c) => c.id === id);
  }

  public getProducts(): Product[] {
    return this.products;
  }

  public getProduct(id: string): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  public getStockBalances(): StockBalance[] {
    return this.stockBalances;
  }

  public getStockBatches(): StockBatch[] {
    return this.stockBatches;
  }

  public getSalesInvoiceBatches(invoiceId: string): SalesInvoiceItemBatch[] {
    return this.salesInvoiceItemBatches.filter((b) => b.invoice_id === invoiceId);
  }

  public async fetchSalesInvoiceBatches(invoiceId: string): Promise<SalesInvoiceItemBatch[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('sales_invoice_item_batches')
          .select('*')
          .eq('invoice_id', invoiceId);
        if (data && data.length > 0) {
          const others = this.salesInvoiceItemBatches.filter((b) => b.invoice_id !== invoiceId);
          this.salesInvoiceItemBatches = [...others, ...data];
          return data;
        }
      } catch (err) {
        console.warn('Error fetching sales invoice batches:', err);
      }
    }
    return this.getSalesInvoiceBatches(invoiceId);
  }

  public async getExpiringBatches(days: number = 90): Promise<ExpiringBatchItem[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('get_expiring_batches', {
          p_days: days,
        });
        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map((item: any) => {
            const wh = this.warehouses.find((w) => w.id === item.warehouse_id || w.code === item.warehouse_code);
            const prd = this.products.find((p) => p.id === item.product_id || p.code === item.product_code);
            const expiryDate = item.expiry_date || '';
            const daysLeft = item.days_remaining !== undefined
              ? Number(item.days_remaining)
              : Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

            return {
              id: item.id,
              warehouse_id: item.warehouse_id || wh?.id || '',
              warehouse_name: item.warehouse_name || wh?.name || 'المستودع',
              warehouse_code: item.warehouse_code || wh?.code,
              product_id: item.product_id || prd?.id || '',
              product_name: item.product_name || prd?.name || 'صنف',
              product_code: item.product_code || prd?.code,
              is_pesticide: item.is_pesticide ?? prd?.is_pesticide,
              batch_number: item.batch_number || 'بدون رقم',
              expiry_date: expiryDate,
              days_remaining: daysLeft,
              qty_in_base_unit: Number(item.qty_in_base_unit ?? item.qty ?? 0),
              base_unit_name: prd?.base_unit_name,
            };
          });
        }
      } catch (e) {
        console.warn('Notice from get_expiring_batches RPC:', e);
      }
    }

    // Fallback calculation directly from hydrated stockBatches
    const now = Date.now();
    const result: ExpiringBatchItem[] = [];

    for (const batch of this.stockBatches) {
      if (!batch.expiry_date || Number(batch.qty_in_base_unit) <= 0) continue;
      const expiryTime = new Date(batch.expiry_date).getTime();
      const daysLeft = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));

      if (daysLeft <= days) {
        const wh = this.warehouses.find((w) => w.id === batch.warehouse_id);
        const prd = this.products.find((p) => p.id === batch.product_id);

        result.push({
          id: batch.id,
          warehouse_id: batch.warehouse_id,
          warehouse_name: wh?.name || 'المستودع',
          warehouse_code: wh?.code,
          product_id: batch.product_id,
          product_name: prd?.name || 'صنف غير معروف',
          product_code: prd?.code,
          is_pesticide: prd?.is_pesticide,
          batch_number: batch.batch_number || 'بدون تشغيلة',
          expiry_date: batch.expiry_date,
          days_remaining: daysLeft,
          qty_in_base_unit: Number(batch.qty_in_base_unit),
          base_unit_name: prd?.base_unit_name,
        });
      }
    }

    result.sort((a, b) => a.days_remaining - b.days_remaining);
    return result;
  }

  public getStockMovements(): StockMovement[] {
    return this.stockMovements;
  }

  public getProductStock(productId: string, warehouseId: string): number {
    const bal = this.stockBalances.find((b) => b.product_id === productId && b.warehouse_id === warehouseId);
    return bal ? Number(bal.qty_in_base_unit) : 0;
  }

  public getStockTransfers(): StockTransfer[] {
    return this.stockTransfers;
  }

  public getCustomers(): Customer[] {
    // ترتيب العملاء بحسب كود العميل تصاعدياً (CUST-1, CUST-2, CUST-3, ...)
    return [...this.customers].sort((a, b) => {
      const codeA = (a.code || '').trim();
      const codeB = (b.code || '').trim();
      const matchA = codeA.match(/(?:CUST-?|C-?)(\d+)/i) || codeA.match(/^(\d+)$/);
      const matchB = codeB.match(/(?:CUST-?|C-?)(\d+)/i) || codeB.match(/^(\d+)$/);

      if (matchA && matchB) {
        const numA = parseInt(matchA[1], 10);
        const numB = parseInt(matchB[1], 10);
        if (numA !== numB) return numA - numB;
      }

      // Fallback natural alphanumeric sorting
      return codeA.localeCompare(codeB, 'ar', { numeric: true, sensitivity: 'base' });
    });
  }

  public getCustomer(id: string): Customer | undefined {
    return this.customers.find((c) => c.id === id);
  }

  public getCustomerLedger(customerId: string): CustomerLedgerEntry[] {
    return this.customerLedger
      .filter((l) => l.customer_id === customerId)
      .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime());
  }

  public getCustomerPayments(): CustomerPayment[] {
    return this.customerPayments;
  }

  public getSuppliers(): Supplier[] {
    return this.suppliers;
  }

  public getSupplier(id: string): Supplier | undefined {
    return this.suppliers.find((s) => s.id === id);
  }

  public getSupplierLedger(supplierId: string): SupplierLedgerEntry[] {
    return this.supplierLedger
      .filter((l) => l.supplier_id === supplierId)
      .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime());
  }

  public getSupplierPayments(): SupplierPayment[] {
    return this.supplierPayments;
  }

  public getSalesInvoices(): SalesInvoice[] {
    return this.salesInvoices;
  }

  public getPurchaseInvoices(): PurchaseInvoice[] {
    return this.purchaseInvoices;
  }

  public getSalesReturns(): SalesReturn[] {
    return this.salesReturns;
  }

  public getExpenses(): Expense[] {
    return this.expenses;
  }

  public getCashTransactions(): CashTransaction[] {
    return this.cashTransactions;
  }

  public getOldLedgers(): OldLedgerEntry[] {
    return this.oldLedgers;
  }

  public getMigrationProjects(): MigrationProject[] {
    return this.migrationProjects;
  }

  public getMigrationPages(projectId?: string): MigrationPage[] {
    return projectId ? this.migrationPages.filter((p) => p.project_id === projectId) : this.migrationPages;
  }

  public getMigrationEntries(projectId?: string, pageId?: string): MigrationEntry[] {
    let list = this.migrationEntries;
    if (projectId) list = list.filter((e) => e.project_id === projectId);
    if (pageId) list = list.filter((e) => e.page_id === pageId);
    return list;
  }

  public getAuditLogs(): AuditLog[] {
    return this.auditLogs;
  }

  public getSettings(): AppSettings {
    return this.settings;
  }

  // --- Mutation Methods (Async with Supabase) ---

  public async saveCategory(category: Partial<ProductCategory> & { name: string }): Promise<ProductCategory> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('الاتصال بقاعدة البيانات غير متوفر');

    if (category.id) {
      const { data, error } = await supabase
        .from('product_categories')
        .update({
          name: category.name,
          code: category.code,
          description: category.description,
          is_active: category.is_active ?? true,
        })
        .eq('id', category.id)
        .select()
        .single();

      if (error) throw error;
      await this.hydrate();
      return data;
    } else {
      const { data, error } = await supabase
        .from('product_categories')
        .insert({
          name: category.name,
          code: category.code,
          description: category.description,
          is_active: category.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      await this.hydrate();
      return data;
    }
  }

  public async saveProduct(productData: Partial<Product> & { name: string; base_unit_name: string }): Promise<Product> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('الاتصال بقاعدة البيانات غير متوفر');

    let prodId: string = productData.id || '';
    const imgUrl = (productData.image_url || '').trim();
    let rawDesc = (productData.description || '').replace(/\[صورة:\s*[^\]]+\]\s*/g, '').trim();
    const encodedDesc = imgUrl ? `[صورة: ${imgUrl}] ${rawDesc}`.trim() : rawDesc;

    if (prodId) {
      let updatePayload: any = {
        barcode: productData.barcode,
        name: productData.name,
        commercial_name: productData.commercial_name,
        active_ingredient: productData.active_ingredient,
        manufacturer: productData.manufacturer,
        category_id: productData.category_id || null,
        description: encodedDesc,
        image_url: imgUrl || null,
        base_unit_name: productData.base_unit_name,
        default_purchase_price: Number(productData.default_purchase_price) || 0,
        default_sale_price: Number(productData.default_sale_price) || 0,
        min_stock_alert: Number(productData.min_stock_alert) || 10,
        is_pesticide: productData.is_pesticide || false,
        requires_prescription: productData.requires_prescription || false,
        is_active: productData.is_active ?? true,
        updated_at: new Date().toISOString(),
      };

      let { error: prodErr } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', prodId);

      if (prodErr && prodErr.message?.includes('image_url')) {
        delete updatePayload.image_url;
        const res = await supabase.from('products').update(updatePayload).eq('id', prodId);
        if (res.error) throw res.error;
      } else if (prodErr) {
        throw prodErr;
      }
    } else {
      const code = productData.code || (await this.getNextDocNumber('PRD'));
      let insertPayload: any = {
        code,
        barcode: productData.barcode,
        name: productData.name,
        commercial_name: productData.commercial_name,
        active_ingredient: productData.active_ingredient,
        manufacturer: productData.manufacturer,
        category_id: productData.category_id || null,
        description: encodedDesc,
        image_url: imgUrl || null,
        base_unit_name: productData.base_unit_name,
        default_purchase_price: Number(productData.default_purchase_price) || 0,
        default_sale_price: Number(productData.default_sale_price) || 0,
        min_stock_alert: Number(productData.min_stock_alert) || 10,
        is_pesticide: productData.is_pesticide || false,
        requires_prescription: productData.requires_prescription || false,
        is_active: productData.is_active ?? true,
      };

      let { data: newProd, error: prodErr } = await supabase
        .from('products')
        .insert(insertPayload)
        .select()
        .single();

      if (prodErr && prodErr.message?.includes('image_url')) {
        delete insertPayload.image_url;
        const res = await supabase.from('products').insert(insertPayload).select().single();
        if (res.error) throw res.error;
        newProd = res.data;
      } else if (prodErr) {
        throw prodErr;
      }
      prodId = newProd.id;
    }

    // Save Units
    if (productData.units && productData.units.length > 0) {
      // Remove previous units if updating
      if (productData.id) {
        await supabase.from('product_units').delete().eq('product_id', prodId);
      }

      const unitsToInsert = productData.units.map((u, idx) => ({
        product_id: prodId,
        unit_name: u.unit_name,
        conversion_factor: Number(u.conversion_factor) || 1,
        sale_price: Number(u.sale_price) || Number(productData.default_sale_price) || 0,
        purchase_price: Number(u.purchase_price) || Number(productData.default_purchase_price) || 0,
        barcode: u.barcode || null,
        is_base_unit: u.is_base_unit ?? (idx === 0),
        is_default_sale: u.is_default_sale ?? (idx === 0),
        is_default_purchase: u.is_default_purchase ?? (idx === 0),
        sort_order: idx,
      }));

      await supabase.from('product_units').insert(unitsToInsert);
    }

    // Handle Opening Stock (رصيد المخزون الافتتاحي عند تعريف الصنف الجديد)
    const initialShopQty = Number((productData as any).initial_stock_shop) || 0;
    const initialWhQty = Number((productData as any).initial_stock_warehouse) || 0;

    if (!productData.id && (initialShopQty > 0 || initialWhQty > 0)) {
      const shopWh = this.warehouses.find((w) => w.location_type === 'shop' || w.is_primary);
      const mainWh = this.warehouses.find((w) => w.location_type === 'warehouse' && !w.is_primary);

      if (initialShopQty > 0 && shopWh) {
        await supabase.from('stock_balances').upsert(
          {
            warehouse_id: shopWh.id,
            product_id: prodId,
            qty_in_base_unit: initialShopQty,
            last_updated: new Date().toISOString(),
          },
          { onConflict: 'warehouse_id,product_id' }
        );

        await supabase.from('stock_movements').insert({
          product_id: prodId,
          warehouse_id: shopWh.id,
          movement_type: 'opening_stock',
          quantity: initialShopQty,
          previous_qty: 0,
          new_qty: initialShopQty,
          reference_type: 'opening_stock',
          reference_id: prodId,
          notes: 'رصيد مخزون أول المدة للمحل',
        });
      }

      if (initialWhQty > 0 && mainWh) {
        await supabase.from('stock_balances').upsert(
          {
            warehouse_id: mainWh.id,
            product_id: prodId,
            qty_in_base_unit: initialWhQty,
            last_updated: new Date().toISOString(),
          },
          { onConflict: 'warehouse_id,product_id' }
        );

        await supabase.from('stock_movements').insert({
          product_id: prodId,
          warehouse_id: mainWh.id,
          movement_type: 'opening_stock',
          quantity: initialWhQty,
          previous_qty: 0,
          new_qty: initialWhQty,
          reference_type: 'opening_stock',
          reference_id: prodId,
          notes: 'رصيد مخزون أول المدة للمستودع الرئيسي',
        });
      }
    }

    await this.hydrate();
    const result = this.getProduct(prodId);
    if (!result) throw new Error('فشل جلب المنتج بعد الحفظ');
    return result;
  }

  public async saveCustomer(customerData: Partial<Customer> & { name: string }): Promise<Customer> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('الاتصال بقاعدة البيانات غير متوفر');

    // Build encoded notes to ensure partner_name persists reliably across all DB environments
    const partner = (customerData.partner_name || '').trim();
    let rawNotes = (customerData.notes || '').replace(/\[شريك:\s*[^\]]+\]\s*/g, '').trim();
    const encodedNotes = partner ? `[شريك: ${partner}] ${rawNotes}`.trim() : rawNotes;

    if (customerData.id) {
      // First try updating with partner_name field; if column doesn't exist, update with encoded notes
      let updatePayload: any = {
        name: customerData.name,
        partner_name: partner || null,
        phone: customerData.phone,
        village_or_address: customerData.village_or_address,
        national_id: customerData.national_id,
        notes: encodedNotes,
        credit_limit: Number(customerData.credit_limit) || 0,
        is_active: customerData.is_active ?? true,
        updated_at: new Date().toISOString(),
      };

      let { data, error } = await supabase
        .from('customers')
        .update(updatePayload)
        .eq('id', customerData.id)
        .select()
        .single();

      if (error && error.message?.includes('partner_name')) {
        // Fallback without partner_name column
        delete updatePayload.partner_name;
        const res = await supabase
          .from('customers')
          .update(updatePayload)
          .eq('id', customerData.id)
          .select()
          .single();
        if (res.error) throw res.error;
        data = res.data;
      } else if (error) {
        throw error;
      }

      await this.hydrate();
      return { ...data, partner_name: partner || undefined };
    } else {
      const code = customerData.code || (await this.getNextDocNumber('CUST'));
      const openingBal = Number(customerData.opening_balance) || 0;

      let insertPayload: any = {
        code,
        name: customerData.name,
        partner_name: partner || null,
        phone: customerData.phone,
        village_or_address: customerData.village_or_address,
        national_id: customerData.national_id,
        notes: encodedNotes,
        credit_limit: Number(customerData.credit_limit) || 0,
        opening_balance: openingBal,
        current_balance: openingBal,
        is_active: customerData.is_active ?? true,
      };

      let { data: newCust, error } = await supabase
        .from('customers')
        .insert(insertPayload)
        .select()
        .single();

      if (error && error.message?.includes('partner_name')) {
        delete insertPayload.partner_name;
        const res = await supabase
          .from('customers')
          .insert(insertPayload)
          .select()
          .single();
        if (res.error) throw res.error;
        newCust = res.data;
      } else if (error) {
        throw error;
      }

      // If opening balance > 0, log customer ledger entry
      if (openingBal !== 0) {
        await supabase.from('customer_ledger_entries').insert({
          customer_id: newCust.id,
          entry_date: new Date().toISOString(),
          entry_type: 'opening_balance',
          document_number: 'OPN-' + code,
          debit: openingBal > 0 ? openingBal : 0,
          credit: openingBal < 0 ? Math.abs(openingBal) : 0,
          running_balance: openingBal,
          description: 'رصيد افتتاحي عند فتح حساب العميل',
        });
      }

      await this.hydrate();
      return { ...newCust, partner_name: partner || undefined };
    }
  }

  public async saveSupplier(supplierData: Partial<Supplier> & { name: string }): Promise<Supplier> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('الاتصال بقاعدة البيانات غير متوفر');

    if (supplierData.id) {
      const { data, error } = await supabase
        .from('suppliers')
        .update({
          name: supplierData.name,
          company_name: supplierData.company_name,
          phone: supplierData.phone,
          address: supplierData.address,
          tax_number: supplierData.tax_number,
          notes: supplierData.notes,
          is_active: supplierData.is_active ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', supplierData.id)
        .select()
        .single();

      if (error) throw error;
      await this.hydrate();
      return data;
    } else {
      const code = supplierData.code || (await this.getNextDocNumber('SUPP'));
      const openingBal = Number(supplierData.opening_balance) || 0;

      const { data: newSupp, error } = await supabase
        .from('suppliers')
        .insert({
          code,
          name: supplierData.name,
          company_name: supplierData.company_name,
          phone: supplierData.phone,
          address: supplierData.address,
          tax_number: supplierData.tax_number,
          notes: supplierData.notes,
          opening_balance: openingBal,
          current_balance: openingBal,
          is_active: supplierData.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;

      if (openingBal !== 0) {
        await supabase.from('supplier_ledger_entries').insert({
          supplier_id: newSupp.id,
          entry_date: new Date().toISOString(),
          entry_type: 'opening_balance',
          document_number: 'SOPN-' + code,
          debit: 0,
          credit: openingBal,
          running_balance: openingBal,
          description: 'رصيد افتتاحي مستحق للمورد',
        });
      }

      await this.hydrate();
      return newSupp;
    }
  }

  // --- Atomic RPC Operations ---

  public async processSaleAtomic(saleData: {
    customer_id?: string;
    customer_name_snapshot: string;
    warehouse_id: string;
    cash_account_id?: string;
    invoice_date?: string;
    payment_type: 'cash' | 'credit' | 'partial';
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    paid_amount: number;
    notes?: string;
    items: Array<{
      product_id: string;
      product_name_snapshot: string;
      unit_id?: string;
      unit_name_snapshot: string;
      conversion_factor_snapshot: number;
      qty: number;
      qty_in_base_unit: number;
      unit_price: number;
      total_price: number;
    }>;
  }): Promise<{ success: boolean; invoice?: SalesInvoice; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'الاتصال بقاعدة البيانات غير متوفر' };

    try {
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sale_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const payload = {
        idempotency_key: idempotencyKey,
        customer_id: saleData.customer_id || null,
        customer_name: saleData.customer_name_snapshot,
        warehouse_id: saleData.warehouse_id,
        cash_account_id: saleData.cash_account_id || null,
        payment_type: saleData.payment_type,
        paid_amount: saleData.paid_amount,
        discount_amount: saleData.discount_amount,
        tax_amount: saleData.tax_amount,
        notes: saleData.notes,
        items: saleData.items.map((it) => ({
          product_id: it.product_id,
          unit_id: it.unit_id || null,
          qty: it.qty,
          unit_price: it.unit_price,
        })),
      };

      const { data, error } = await supabase.rpc('process_sales_invoice_atomic', {
        p_payload: payload,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'فشلت عملية حفظ الفاتورة' };
      }

      await this.hydrate();
      const savedInvoice = this.salesInvoices.find((i) => i.id === data.invoice_id) || {
        id: data.invoice_id,
        invoice_number: data.invoice_number,
        customer_id: saleData.customer_id,
        customer_name_snapshot: saleData.customer_name_snapshot,
        warehouse_id: saleData.warehouse_id,
        invoice_date: saleData.invoice_date || new Date().toISOString(),
        payment_type: saleData.payment_type,
        subtotal: saleData.subtotal,
        discount_amount: saleData.discount_amount,
        tax_amount: saleData.tax_amount,
        total_amount: saleData.total_amount,
        paid_amount: saleData.paid_amount,
        remaining_amount: saleData.total_amount - saleData.paid_amount,
        status: 'completed',
        items: saleData.items,
        created_at: new Date().toISOString(),
      };

      return { success: true, invoice: savedInvoice };
    } catch (err: any) {
      return { success: false, error: err?.message || 'حدث خطأ غير متوقع' };
    }
  }

  public async processPurchaseAtomic(data: {
    supplier_id: string;
    supplier_invoice_number?: string;
    warehouse_id: string;
    cash_account_id?: string;
    invoice_date?: string;
    payment_type: 'cash' | 'credit' | 'partial';
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    paid_amount: number;
    notes?: string;
    items: Array<{
      product_id: string;
      product_name_snapshot: string;
      unit_id?: string;
      unit_name_snapshot: string;
      conversion_factor_snapshot: number;
      qty: number;
      qty_in_base_unit: number;
      cost_price: number;
      total_cost: number;
      batch_number?: string;
      expiry_date?: string;
    }>;
  }): Promise<{ success: boolean; invoice?: PurchaseInvoice; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'الاتصال غير متوفر' };

    try {
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pur_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const payload = {
        idempotency_key: idempotencyKey,
        supplier_id: data.supplier_id,
        warehouse_id: data.warehouse_id,
        cash_account_id: data.cash_account_id || null,
        supplier_invoice_number: data.supplier_invoice_number || null,
        payment_type: data.payment_type,
        paid_amount: data.paid_amount,
        discount_amount: data.discount_amount,
        tax_amount: data.tax_amount,
        notes: data.notes,
        items: data.items.map((it) => ({
          product_id: it.product_id,
          unit_id: it.unit_id || null,
          qty: it.qty,
          cost_price: it.cost_price,
          batch_number: it.batch_number || null,
          expiry_date: it.expiry_date || null,
        })),
      };

      const { data: res, error } = await supabase.rpc('process_purchase_atomic', {
        p_payload: payload,
      });

      if (error) return { success: false, error: error.message };
      if (!res?.success) return { success: false, error: res?.error || 'فشلت عملية حفظ المشتريات' };

      await this.hydrate();
      const saved = this.purchaseInvoices.find((p) => p.id === res.purchase_id) || {
        id: res.purchase_id,
        invoice_number: res.invoice_number,
        supplier_id: data.supplier_id,
        warehouse_id: data.warehouse_id,
        invoice_date: data.invoice_date || new Date().toISOString(),
        payment_type: data.payment_type,
        subtotal: data.subtotal,
        discount_amount: data.discount_amount,
        tax_amount: data.tax_amount,
        total_amount: data.total_amount,
        paid_amount: data.paid_amount,
        remaining_amount: data.total_amount - data.paid_amount,
        status: 'completed',
        items: data.items,
        created_at: new Date().toISOString(),
      };

      return { success: true, invoice: saved };
    } catch (err: any) {
      return { success: false, error: err?.message || 'خطأ أثناء تسجيل المشتريات' };
    }
  }

  public async executeStockTransfer(data: {
    from_warehouse_id: string;
    to_warehouse_id: string;
    notes?: string;
    items: Array<{
      product_id: string;
      product_name?: string;
      unit_id?: string;
      unit_name_snapshot: string;
      conversion_factor_snapshot: number;
      qty: number;
      qty_in_base_unit: number;
    }>;
  }): Promise<{ success: boolean; transfer?: StockTransfer; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'الاتصال غير متوفر' };

    try {
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `trf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const payload = {
        idempotency_key: idempotencyKey,
        from_warehouse_id: data.from_warehouse_id,
        to_warehouse_id: data.to_warehouse_id,
        notes: data.notes,
        items: data.items.map((it) => ({
          product_id: it.product_id,
          unit_id: it.unit_id || null,
          qty: it.qty,
        })),
      };

      const { data: res, error } = await supabase.rpc('execute_stock_transfer', {
        p_payload: payload,
      });

      if (error) return { success: false, error: error.message };
      if (!res?.success) return { success: false, error: res?.error || 'فشل التحويل المخزني' };

      await this.hydrate();
      const saved = this.stockTransfers.find((t) => t.id === res.transfer_id);
      return { success: true, transfer: saved };
    } catch (err: any) {
      return { success: false, error: err?.message || 'خطأ أثناء التحويل المخزني' };
    }
  }

  public async adjustStock(data: {
    warehouse_id: string;
    product_id: string;
    new_qty_in_base_unit: number;
    reason: string;
    batch_number?: string;
    expiry_date?: string;
    delta?: number;
  }): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'الاتصال غير متوفر' };

    try {
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `adj_${Date.now()}`;

      const payload = {
        idempotency_key: idempotencyKey,
        warehouse_id: data.warehouse_id,
        product_id: data.product_id,
        new_qty: data.new_qty_in_base_unit,
        delta: data.delta,
        reason: data.reason,
        batch_number: data.batch_number || null,
        expiry_date: data.expiry_date || null,
      };

      const { data: res, error } = await supabase.rpc('adjust_stock', {
        p_payload: payload,
      });

      if (error) return { success: false, error: error.message };
      if (res && res.success === false) return { success: false, error: res.error || 'فشلت تسوية الجرد' };

      await this.hydrate();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'خطأ أثناء تسوية الجرد' };
    }
  }

  public async receiveCustomerPayment(data: {
    customer_id: string;
    amount: number;
    cash_account_id: string;
    payment_method: 'cash' | 'bank' | 'wallet';
    notes?: string;
  }): Promise<{ success: boolean; payment?: CustomerPayment; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'الاتصال غير متوفر' };

    try {
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `rcp_${Date.now()}`;

      const payload = {
        idempotency_key: idempotencyKey,
        customer_id: data.customer_id,
        amount: data.amount,
        cash_account_id: data.cash_account_id || null,
        payment_method: data.payment_method,
        notes: data.notes || '',
      };

      const { data: res, error } = await supabase.rpc('receive_customer_payment', {
        p_payload: payload,
      });

      if (error) return { success: false, error: error.message };
      if (!res?.success) return { success: false, error: res?.error || 'فشل تسجيل سند القبض' };

      await this.hydrate();
      const saved = this.customerPayments.find((p) => p.id === res.payment_id);
      return { success: true, payment: saved };
    } catch (err: any) {
      return { success: false, error: err?.message || 'خطأ أثناء تسجيل سند القبض' };
    }
  }

  public async paySupplier(data: {
    supplier_id: string;
    amount: number;
    cash_account_id: string;
    payment_method: 'cash' | 'bank' | 'wallet';
    notes?: string;
  }): Promise<{ success: boolean; payment?: SupplierPayment; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'الاتصال غير متوفر' };

    try {
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pay_${Date.now()}`;

      const payload = {
        idempotency_key: idempotencyKey,
        supplier_id: data.supplier_id,
        amount: data.amount,
        cash_account_id: data.cash_account_id || null,
        payment_method: data.payment_method,
        notes: data.notes || '',
      };

      const { data: res, error } = await supabase.rpc('pay_supplier', {
        p_payload: payload,
      });

      if (error) return { success: false, error: error.message };
      if (!res?.success) return { success: false, error: res?.error || 'فشل سداد المورد' };

      await this.hydrate();
      const saved = this.supplierPayments.find((p) => p.id === res.payment_id);
      return { success: true, payment: saved };
    } catch (err: any) {
      return { success: false, error: err?.message || 'خطأ أثناء سداد المورد' };
    }
  }

  public async recordExpense(data: {
    category: string;
    amount: number;
    cash_account_id: string;
    paid_to?: string;
    notes?: string;
    expense_date?: string;
  }): Promise<{ success: boolean; expense?: Expense; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'الاتصال غير متوفر' };

    try {
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `exp_${Date.now()}`;

      const payload = {
        idempotency_key: idempotencyKey,
        category: data.category,
        amount: data.amount,
        cash_account_id: data.cash_account_id || null,
        paid_to: data.paid_to || '',
        notes: data.notes || '',
        expense_date: data.expense_date || new Date().toISOString(),
      };

      const { data: res, error } = await supabase.rpc('record_expense', {
        p_payload: payload,
      });

      if (error) return { success: false, error: error.message };
      if (!res?.success) return { success: false, error: res?.error || 'فشل تسجيل المصروف' };

      await this.hydrate();
      const saved = this.expenses.find((e) => e.id === res.expense_id);
      return { success: true, expense: saved };
    } catch (err: any) {
      return { success: false, error: err?.message || 'خطأ أثناء تسجيل المصروف' };
    }
  }

  public async processSalesReturnAtomic(data: {
    sales_invoice_id?: string;
    invoice_number?: string;
    customer_id?: string;
    customer_name_snapshot: string;
    warehouse_id: string;
    refund_type: 'cash' | 'credit_balance';
    cash_account_id?: string;
    notes?: string;
    items: Array<{
      product_id: string;
      product_name_snapshot: string;
      unit_id?: string;
      unit_name_snapshot: string;
      conversion_factor_snapshot: number;
      qty: number;
      qty_in_base_unit: number;
      unit_price: number;
      total_price: number;
    }>;
  }): Promise<{ success: boolean; returnDoc?: SalesReturn; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'الاتصال غير متوفر' };

    try {
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ret_${Date.now()}`;

      const payload = {
        idempotency_key: idempotencyKey,
        sales_invoice_id: data.sales_invoice_id || null,
        invoice_number: data.invoice_number,
        customer_id: data.customer_id || null,
        customer_name_snapshot: data.customer_name_snapshot,
        warehouse_id: data.warehouse_id,
        refund_type: data.refund_type,
        cash_account_id: data.cash_account_id || null,
        notes: data.notes,
        items: data.items.map((it) => ({
          product_id: it.product_id,
          unit_id: it.unit_id || null,
          qty: it.qty,
          unit_price: it.unit_price,
          unit_name_snapshot: it.unit_name_snapshot,
          conversion_factor_snapshot: it.conversion_factor_snapshot,
        })),
      };

      const { data: res, error } = await supabase.rpc('process_sales_return_atomic', {
        p_payload: payload,
      });

      if (error) return { success: false, error: error.message };
      if (!res?.success) return { success: false, error: res?.error || 'فشل تسجيل مرتجع المبيعات' };

      await this.hydrate();
      const saved = this.salesReturns.find((r) => r.id === res.return_id);
      return { success: true, returnDoc: saved };
    } catch (err: any) {
      return { success: false, error: err?.message || 'خطأ أثناء تسجيل المرتجع' };
    }
  }

  // --- Delete Methods ---

  private friendlyDeleteError(err: any): string {
    const msg: string = err?.message || '';
    if (err?.code === '23503' || /foreign key|violates/i.test(msg)) {
      return 'لا يمكن الحذف لأن هذا العنصر مرتبط بعمليات أخرى في النظام';
    }
    return msg || 'فشل الحذف';
  }

  public async deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'الاتصال غير متوفر' };

    try {
      const { data, error } = await supabase.from('products').delete().eq('id', id).select('id');
      if (error) return { success: false, error: this.friendlyDeleteError(error) };
      // لو الصلاحيات (RLS) منعت الحذف، Supabase بيرجع نجاح من غير ما يمسح حاجة، فنتأكد إن صف اتمسح فعلاً
      if (!data || data.length === 0) {
        return { success: false, error: 'لم يتم الحذف: الحذف متاح للمدير فقط، أو العنصر غير موجود' };
      }
      await this.hydrate();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: this.friendlyDeleteError(err) };
    }
  }

  public async deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'الاتصال غير متوفر' };
    try {
      const { data, error } = await supabase.from('product_categories').delete().eq('id', id).select('id');
      if (error) return { success: false, error: this.friendlyDeleteError(error) };
      // لو الصلاحيات (RLS) منعت الحذف، Supabase بيرجع نجاح من غير ما يمسح حاجة، فنتأكد إن صف اتمسح فعلاً
      if (!data || data.length === 0) {
        return { success: false, error: 'لم يتم الحذف: الحذف متاح للمدير فقط، أو العنصر غير موجود' };
      }
      await this.hydrate();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: this.friendlyDeleteError(err) };
    }
  }

  public getCustomerDeletionImpact(id: string): { invoices: number; returns: number; payments: number; balance: number } {
    const cust = this.customers.find((c) => c.id === id);
    return {
      invoices: this.salesInvoices.filter((i) => i.customer_id === id).length,
      returns: this.salesReturns.filter((r) => r.customer_id === id).length,
      payments: this.customerPayments.filter((p) => p.customer_id === id).length,
      balance: cust?.current_balance || 0,
    };
  }

  // حذف عميل نهائياً مع فواتيره ودفعاته، مع عكس أثرها على المخزون والخزينة (ذرّي في قاعدة البيانات)
  public async deleteCustomer(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'الاتصال غير متوفر' };
    try {
      const { data, error } = await supabase.rpc('delete_customer_full', { p_customer_id: id });
      if (error) return { success: false, error: this.friendlyDeleteError(error) };
      if (data && data.success === false) return { success: false, error: data.error || 'فشل حذف العميل' };
      await this.hydrate();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: this.friendlyDeleteError(err) };
    }
  }

  public async deleteSupplier(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'الاتصال غير متوفر' };

    try {
      const { data, error } = await supabase.from('suppliers').delete().eq('id', id).select('id');
      if (error) return { success: false, error: this.friendlyDeleteError(error) };
      // لو الصلاحيات (RLS) منعت الحذف، Supabase بيرجع نجاح من غير ما يمسح حاجة، فنتأكد إن صف اتمسح فعلاً
      if (!data || data.length === 0) {
        return { success: false, error: 'لم يتم الحذف: الحذف متاح للمدير فقط، أو العنصر غير موجود' };
      }
      await this.hydrate();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: this.friendlyDeleteError(err) };
    }
  }

  public async deleteExpense(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'الاتصال غير متوفر' };
    try {
      const { data, error } = await supabase.rpc('delete_expense_atomic', { p_expense_id: id });
      if (error) return { success: false, error: this.friendlyDeleteError(error) };
      if (data && data.success === false) return { success: false, error: data.error || 'فشل حذف المصروف' };
      await this.hydrate();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: this.friendlyDeleteError(err) };
    }
  }

  public async deleteOldLedgerEntry(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'الاتصال غير متوفر' };

    try {
      const { data, error } = await supabase.from('old_ledgers').delete().eq('id', id).select('id');
      if (error) return { success: false, error: this.friendlyDeleteError(error) };
      // لو الصلاحيات (RLS) منعت الحذف، Supabase بيرجع نجاح من غير ما يمسح حاجة، فنتأكد إن صف اتمسح فعلاً
      if (!data || data.length === 0) {
        return { success: false, error: 'لم يتم الحذف: الحذف متاح للمدير فقط، أو العنصر غير موجود' };
      }
      await this.hydrate();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: this.friendlyDeleteError(err) };
    }
  }

  public async saveOldLedgerEntry(entry: Partial<OldLedgerEntry> & { book_name: string; party_name: string }): Promise<OldLedgerEntry> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('الاتصال غير متوفر');

    if (entry.id) {
      const { data, error } = await supabase
        .from('old_ledgers')
        .update({
          book_name: entry.book_name,
          page_number: entry.page_number,
          entry_date: entry.entry_date,
          party_name: entry.party_name,
          phone: entry.phone,
          village: entry.village,
          party_type: entry.party_type || 'customer',
          debit_amount: Number(entry.debit_amount) || 0,
          credit_amount: Number(entry.credit_amount) || 0,
          settled_amount: Number(entry.settled_amount) || 0,
          notes: entry.notes,
        })
        .eq('id', entry.id)
        .select()
        .single();

      if (error) throw error;
      await this.hydrate();
      return data;
    } else {
      const { data, error } = await supabase
        .from('old_ledgers')
        .insert({
          book_name: entry.book_name,
          page_number: entry.page_number,
          entry_date: entry.entry_date || new Date().toISOString().slice(0, 10),
          party_name: entry.party_name,
          phone: entry.phone,
          village: entry.village,
          party_type: entry.party_type || 'customer',
          debit_amount: Number(entry.debit_amount) || 0,
          credit_amount: Number(entry.credit_amount) || 0,
          settled_amount: Number(entry.settled_amount) || 0,
          notes: entry.notes,
          is_transferred_to_system: false,
        })
        .select()
        .single();

      if (error) throw error;
      await this.hydrate();
      return data;
    }
  }

  public async migrateOldLedgerToCustomer(oldLedgerId: string): Promise<{ success: boolean; customer?: Customer; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'الاتصال غير متوفر' };

    try {
      const { data: res, error } = await supabase.rpc('migrate_single_old_ledger_atomic', {
        p_old_ledger_id: oldLedgerId,
      });

      if (error) return { success: false, error: error.message };
      if (!res?.success) return { success: false, error: res?.error || 'فشل ترحيل القيد' };

      await this.hydrate();
      const customer = this.getCustomer(res.customer_id);
      return { success: true, customer };
    } catch (err: any) {
      return { success: false, error: err?.message || 'خطأ أثناء ترحيل القيد' };
    }
  }

  public async saveMigrationProject(data: Partial<MigrationProject> & { name: string }): Promise<MigrationProject> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('الاتصال غير متوفر');

    if (data.id) {
      const { data: updated, error } = await supabase
        .from('migration_projects')
        .update({
          name: data.name,
          book_type: data.book_type,
          start_date: data.start_date,
          end_date: data.end_date,
          description: data.description,
          status: data.status,
          user_in_charge: data.user_in_charge,
        })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      await this.hydrate();
      return updated;
    } else {
      const { data: inserted, error } = await supabase
        .from('migration_projects')
        .insert({
          name: data.name,
          book_type: data.book_type || 'customer_debts',
          start_date: data.start_date,
          end_date: data.end_date,
          description: data.description,
          status: data.status || 'in_progress',
          user_in_charge: data.user_in_charge || 'المدير العام',
        })
        .select()
        .single();

      if (error) throw error;
      await this.hydrate();
      return inserted;
    }
  }

  public async saveMigrationPage(data: Partial<MigrationPage> & { project_id: string; original_page_number: string }): Promise<MigrationPage> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('الاتصال غير متوفر');

    if (data.id) {
      const { data: updated, error } = await supabase
        .from('migration_pages')
        .update({
          book_number: data.book_number,
          original_page_number: data.original_page_number,
          image_url: data.image_url,
          page_date: data.page_date,
          extraction_status: data.extraction_status,
          review_status: data.review_status,
          notes: data.notes,
        })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      await this.hydrate();
      return updated;
    } else {
      const { data: inserted, error } = await supabase
        .from('migration_pages')
        .insert({
          project_id: data.project_id,
          book_number: data.book_number || '1',
          original_page_number: data.original_page_number,
          image_url: data.image_url,
          page_date: data.page_date,
          extraction_status: data.extraction_status || 'manual_entry',
          review_status: data.review_status || 'pending',
          notes: data.notes,
        })
        .select()
        .single();

      if (error) throw error;
      await this.hydrate();
      return inserted;
    }
  }

  public async saveMigrationEntry(entryData: Partial<MigrationEntry> & {
    project_id: string;
    page_id: string;
    customer_name_raw: string;
    amount: number;
    direction: 'debit' | 'credit';
  }): Promise<MigrationEntry> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('الاتصال غير متوفر');

    if (entryData.id) {
      const { data: updated, error } = await supabase
        .from('migration_entries')
        .update({
          customer_name_raw: entryData.customer_name_raw,
          matched_customer_id: entryData.matched_customer_id || null,
          matched_customer_name: entryData.matched_customer_name,
          date: entryData.date,
          description: entryData.description,
          product_info: entryData.product_info,
          qty: entryData.qty,
          unit: entryData.unit,
          amount: Number(entryData.amount) || 0,
          movement_type: entryData.movement_type,
          direction: entryData.direction,
          handwritten_balance: entryData.handwritten_balance,
          review_status: entryData.review_status,
          duplicate_warning: entryData.duplicate_warning,
          notes: entryData.notes,
        })
        .eq('id', entryData.id)
        .select()
        .single();

      if (error) throw error;
      await this.hydrate();
      return updated;
    } else {
      const { data: inserted, error } = await supabase
        .from('migration_entries')
        .insert({
          project_id: entryData.project_id,
          page_id: entryData.page_id,
          book_name: entryData.book_name,
          original_page_number: entryData.original_page_number,
          line_number: entryData.line_number,
          customer_name_raw: entryData.customer_name_raw,
          matched_customer_id: entryData.matched_customer_id || null,
          matched_customer_name: entryData.matched_customer_name,
          date: entryData.date || new Date().toISOString().slice(0, 10),
          description: entryData.description || '',
          product_info: entryData.product_info,
          qty: entryData.qty,
          unit: entryData.unit,
          amount: Number(entryData.amount) || 0,
          movement_type: entryData.movement_type || (entryData.direction === 'debit' ? 'credit_sale' : 'payment'),
          direction: entryData.direction,
          handwritten_balance: entryData.handwritten_balance,
          review_status: entryData.review_status || 'needs_review',
          extraction_confidence: entryData.extraction_confidence ?? 0.9,
          duplicate_warning: entryData.duplicate_warning,
          notes: entryData.notes,
        })
        .select()
        .single();

      if (error) throw error;
      await this.hydrate();
      return inserted;
    }
  }

  public async commitMigrationBatchAtomic(projectId: string): Promise<{
    success: boolean;
    migratedCount: number;
    totalDebit: number;
    totalCredit: number;
    error?: string;
  }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, migratedCount: 0, totalDebit: 0, totalCredit: 0, error: 'الاتصال غير متوفر' };

    try {
      const idempotencyKey = `mig_${Date.now()}`;
      const { data: res, error } = await supabase.rpc('commit_migration_batch_atomic', {
        p_project_id: projectId,
        p_idempotency_key: idempotencyKey,
      });

      if (error) return { success: false, migratedCount: 0, totalDebit: 0, totalCredit: 0, error: error.message };
      if (!res?.success) return { success: false, migratedCount: 0, totalDebit: 0, totalCredit: 0, error: res?.error || 'فشل اعتماد الترحيل' };

      await this.hydrate();
      return {
        success: true,
        migratedCount: res.migrated_count || 0,
        totalDebit: res.total_debit || 0,
        totalCredit: res.total_credit || 0,
      };
    } catch (err: any) {
      return { success: false, migratedCount: 0, totalDebit: 0, totalCredit: 0, error: err?.message || 'خطأ أثناء الترحيل' };
    }
  }

  // --- Settings ---
  public async saveSettings(newSettings: AppSettings): Promise<void> {
    const supabase = getSupabaseClient();
    try {
      localStorage.setItem('cached_app_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Failed to cache settings locally', e);
    }

    if (supabase) {
      try {
        await Promise.all([
          supabase.from('app_settings').upsert({ key: 'company_info', value: newSettings.company_info, updated_at: new Date().toISOString() }),
          supabase.from('app_settings').upsert({ key: 'pos_settings', value: newSettings.pos_settings, updated_at: new Date().toISOString() }),
        ]);
      } catch (cloudErr) {
        console.warn('Notice from cloud app_settings sync:', cloudErr);
      }
    }

    this.settings = newSettings;
    this.notify();
  }

  // --- Reconciliation & Master Reports (Pure Presentation Derived From DB Cache) ---
  public getCustomerReconciliation(customerId: string): {
    storedBalance: number;
    calculatedBalance: number;
    isBalanced: boolean;
    difference: number;
    totalDebit: number;
    totalCredit: number;
    entriesCount: number;
  } {
    const customer = this.getCustomer(customerId);
    const ledgers = this.getCustomerLedger(customerId);

    const storedBalance = customer ? customer.current_balance : 0;
    const openingBalance = customer ? customer.opening_balance : 0;

    let totalDebit = 0;
    let totalCredit = 0;

    for (const e of ledgers) {
      totalDebit += Number(e.debit || 0);
      totalCredit += Number(e.credit || 0);
    }

    const hasOpeningInLedger = ledgers.some((l) => l.entry_type === 'opening_balance');
    const calculatedBalance = hasOpeningInLedger
      ? totalDebit - totalCredit
      : openingBalance + (totalDebit - totalCredit);

    const difference = Math.round((storedBalance - calculatedBalance) * 100) / 100;
    const isBalanced = Math.abs(difference) < 0.01;

    return {
      storedBalance,
      calculatedBalance,
      isBalanced,
      difference,
      totalDebit,
      totalCredit,
      entriesCount: ledgers.length,
    };
  }

  public recalculateCustomerBalance(customerId: string): number {
    const recon = this.getCustomerReconciliation(customerId);
    const customer = this.getCustomer(customerId);
    if (customer) {
      customer.current_balance = recon.calculatedBalance;
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase
          .from('customers')
          .update({ current_balance: recon.calculatedBalance })
          .eq('id', customerId)
          .then();
      }
    }
    return recon.calculatedBalance;
  }

  public getCustomersMasterReport(): Array<{
    customer: Customer;
    openingBalance: number;
    totalSales: number;
    totalPayments: number;
    totalReturns: number;
    currentBalance: number;
    lastMovementDate?: string;
    lastPaymentDate?: string;
    status: 'مدين' | 'خالص' | 'دائن';
  }> {
    return this.customers.map((c) => {
      const cLedgers = this.customerLedger
        .filter((l) => l.customer_id === c.id)
        .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());

      let totalSales = 0;
      let totalPayments = 0;
      let totalReturns = 0;

      cLedgers.forEach((l) => {
        if (l.entry_type === 'invoice') totalSales += Number(l.debit || 0);
        if (l.entry_type === 'payment') totalPayments += Number(l.credit || 0);
        if (l.entry_type === 'return') totalReturns += Number(l.credit || 0);
      });

      const lastMovement = cLedgers[0]?.entry_date;
      const lastPayment = cLedgers.find((l) => l.entry_type === 'payment')?.entry_date;

      const bal = c.current_balance;
      const status: 'مدين' | 'خالص' | 'دائن' =
        bal > 0.01 ? 'مدين' : bal < -0.01 ? 'دائن' : 'خالص';

      return {
        customer: c,
        openingBalance: c.opening_balance,
        totalSales,
        totalPayments,
        totalReturns,
        currentBalance: bal,
        lastMovementDate: lastMovement,
        lastPaymentDate: lastPayment,
        status,
      };
    });
  }

  public getSuppliersMasterReport(): Array<{
    supplier: Supplier;
    openingBalance: number;
    totalPurchases: number;
    totalPayments: number;
    currentBalance: number;
    lastMovementDate?: string;
    status: 'مستحق له' | 'خالص';
  }> {
    return this.suppliers.map((s) => {
      const sLedgers = this.supplierLedger
        .filter((l) => l.supplier_id === s.id)
        .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());

      let totalPurchases = 0;
      let totalPayments = 0;

      sLedgers.forEach((l) => {
        if (l.entry_type === 'purchase') totalPurchases += Number(l.credit || 0);
        if (l.entry_type === 'payment') totalPayments += Number(l.debit || 0);
      });

      const lastMovement = sLedgers[0]?.entry_date;
      const status: 'مستحق له' | 'خالص' = s.current_balance > 0.01 ? 'مستحق له' : 'خالص';

      return {
        supplier: s,
        openingBalance: s.opening_balance,
        totalPurchases,
        totalPayments,
        currentBalance: s.current_balance,
        lastMovementDate: lastMovement,
        status,
      };
    });
  }

  // --- Full Database Backup / Export from Live DB ---
  public async exportFullDatabaseJson(): Promise<Record<string, any>> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('الاتصال بقاعدة البيانات غير متوفر');

    const [
      cats,
      whs,
      cash,
      prods,
      punits,
      custs,
      supps,
      sinvs,
      pinvs,
      srets,
      exps,
      ctxs,
      mproj,
    ] = await Promise.all([
      supabase.from('product_categories').select('*'),
      supabase.from('warehouses').select('*'),
      supabase.from('cash_accounts').select('*'),
      supabase.from('products').select('*'),
      supabase.from('product_units').select('*'),
      supabase.from('customers').select('*'),
      supabase.from('suppliers').select('*'),
      supabase.from('sales_invoices').select('*, sales_invoice_items(*)'),
      supabase.from('purchase_invoices').select('*, purchase_invoice_items(*)'),
      supabase.from('sales_returns').select('*, sales_return_items(*)'),
      supabase.from('expenses').select('*'),
      supabase.from('cash_transactions').select('*'),
      supabase.from('migration_projects').select('*, migration_pages(*, migration_entries(*))'),
    ]);

    return {
      version: '2.0-supabase',
      exported_at: new Date().toISOString(),
      store_name: this.settings.company_info.name,
      database: {
        categories: cats.data,
        warehouses: whs.data,
        cash_accounts: cash.data,
        products: prods.data,
        product_units: punits.data,
        customers: custs.data,
        suppliers: supps.data,
        sales_invoices: sinvs.data,
        purchase_invoices: pinvs.data,
        sales_returns: srets.data,
        expenses: exps.data,
        cash_transactions: ctxs.data,
        migration_projects: mproj.data,
      },
    };
  }
}

export const storage = new DataStorage();
