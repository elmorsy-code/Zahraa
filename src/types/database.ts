export type RoleType = 'admin' | 'cashier' | 'storekeeper' | 'accountant' | 'viewer';

export interface Role {
  id: RoleType;
  name_ar: string;
  description_ar: string;
  permissions: string[];
}

export interface UserProfile {
  id: string;
  user_id?: string;
  full_name: string;
  phone?: string;
  role_id: RoleType;
  is_active: boolean;
  created_at: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
}

export interface ProductUnit {
  id: string;
  product_id: string;
  unit_name: string; // e.g. "جرام", "كيس 100 جم", "كيس 250 جم", "كيلوجرام"
  conversion_factor: number; // e.g. 1, 100, 250, 1000
  sale_price: number;
  purchase_price: number;
  barcode?: string;
  is_base_unit: boolean;
  is_default_sale?: boolean;
  is_default_purchase?: boolean;
  sort_order?: number;
}

export interface Product {
  id: string;
  code: string;
  barcode?: string;
  name: string;
  image_url?: string; // رابط أو صورة الصنف (Data URI أو URL)
  commercial_name?: string;
  active_ingredient?: string; // المادة الفعالة والتركيز
  manufacturer?: string; // الشركة المصنعة
  category_id?: string;
  description?: string;
  base_unit_name: string; // e.g. "جرام", "مل", "حبة", "كجم"
  default_purchase_price: number;
  default_sale_price: number;
  min_stock_alert: number;
  expiry_date?: string;
  batch_number?: string;
  is_pesticide?: boolean;
  requires_prescription?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  // Hydrated helper properties
  units?: ProductUnit[];
  category?: ProductCategory;
  stock_shop?: number; // In base unit
  stock_warehouse?: number; // In base unit
  total_stock?: number; // In base unit
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location_type: 'shop' | 'warehouse';
  is_primary: boolean;
  is_active: boolean;
  notes?: string;
}

export interface StockBalance {
  id: string;
  warehouse_id: string;
  product_id: string;
  qty_in_base_unit: number; // in base units
  avg_cost_price?: number;
  last_updated: string;
}

export interface StockMovement {
  id: string;
  movement_number: string;
  warehouse_id: string;
  warehouse_name?: string;
  product_id: string;
  product_name?: string;
  movement_type:
    | 'sale'
    | 'purchase'
    | 'transfer_out'
    | 'transfer_in'
    | 'adjustment_plus'
    | 'adjustment_minus'
    | 'sale_return'
    | 'purchase_return'
    | 'opening';
  qty_in_base_unit: number;
  balance_after: number;
  unit_cost?: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_at: string;
}

export interface StockTransferItem {
  id?: string;
  product_id: string;
  product_name?: string;
  unit_id?: string;
  unit_name_snapshot: string;
  conversion_factor_snapshot: number;
  qty: number;
  qty_in_base_unit: number;
}

export interface StockTransfer {
  id: string;
  transfer_number: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  transfer_date: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  created_by?: string;
  created_at: string;
  items: StockTransferItem[];
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  partner_name?: string; // الشريك (إن وُجد) يظهر بين قوسين بجوار اسم العميل
  phone?: string;
  village_or_address?: string;
  national_id?: string;
  notes?: string;
  credit_limit?: number;
  opening_balance: number;
  current_balance: number; // Positive = debt owed by customer (مدين)
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CustomerMasterReportItem {
  customer: Customer;
  openingBalance: number;
  totalSales: number;
  totalPayments: number;
  totalReturns: number;
  currentBalance: number;
  lastMovementDate?: string;
  lastPaymentDate?: string;
  status: 'مدين' | 'خالص' | 'دائن';
}

export interface CustomerLedgerEntry {
  id: string;
  customer_id: string;
  entry_date: string;
  entry_type: 'invoice' | 'payment' | 'return' | 'opening_balance' | 'adjustment' | 'old_ledger_migration';
  document_number: string;
  reference_id?: string;
  invoice_total?: number;
  paid_amount?: number;
  returns_amount?: number;
  debit: number; // مدين (على العميل)
  credit: number; // دائن (سدد العميل أو مرتجع)
  running_balance: number;
  description: string;
  created_at: string;
}

export interface CustomerPayment {
  id: string;
  payment_number: string;
  customer_id: string;
  customer_name?: string;
  cash_account_id: string;
  payment_date: string;
  amount: number;
  payment_method: 'cash' | 'bank' | 'wallet';
  notes?: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  company_name?: string;
  phone?: string;
  address?: string;
  tax_number?: string;
  notes?: string;
  opening_balance: number;
  current_balance: number; // Positive = debt owed to supplier (مستحق للمورد)
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SupplierLedgerEntry {
  id: string;
  supplier_id: string;
  entry_date: string;
  entry_type: 'purchase' | 'payment' | 'return' | 'opening_balance' | 'adjustment';
  document_number: string;
  reference_id?: string;
  purchase_total?: number;
  paid_amount?: number;
  returns_amount?: number;
  debit: number; // مدين (سددنا له)
  credit: number; // دائن (استحق له)
  running_balance: number;
  description: string;
  created_at: string;
}

export interface SupplierPayment {
  id: string;
  payment_number: string;
  supplier_id: string;
  supplier_name?: string;
  cash_account_id: string;
  payment_date: string;
  amount: number;
  payment_method: 'cash' | 'bank' | 'wallet';
  notes?: string;
  created_at: string;
}

export interface CashAccount {
  id: string;
  code: string;
  name: string;
  account_type: 'cash' | 'bank' | 'wallet';
  current_balance: number;
  is_primary: boolean;
  is_active: boolean;
}

export interface CashTransaction {
  id: string;
  transaction_number: string;
  cash_account_id: string;
  cash_account_name?: string;
  transaction_date: string;
  transaction_type:
    | 'sales_inflow'
    | 'customer_receipt'
    | 'purchase_outflow'
    | 'supplier_payment'
    | 'expense'
    | 'deposit'
    | 'withdrawal'
    | 'sales_return_refund'
    | 'adjustment';
  amount: number;
  direction: 'in' | 'out';
  balance_after: number;
  reference_type?: string;
  reference_id?: string;
  party_type?: 'customer' | 'supplier' | 'expense' | 'other';
  party_name?: string;
  description?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  expense_number: string;
  cash_account_id: string;
  category: string;
  amount: number;
  expense_date: string;
  paid_to?: string;
  notes?: string;
  created_at: string;
}

export interface SalesInvoiceItem {
  id?: string;
  invoice_id?: string;
  product_id: string;
  product_name_snapshot: string;
  unit_id?: string;
  unit_name_snapshot: string;
  conversion_factor_snapshot: number;
  qty: number;
  qty_in_base_unit: number;
  unit_price: number;
  total_price: number;
}

export interface SalesInvoice {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name_snapshot: string;
  warehouse_id: string;
  warehouse_name?: string;
  cash_account_id?: string;
  invoice_date: string;
  payment_type: 'cash' | 'credit' | 'partial';
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'completed' | 'cancelled' | 'draft';
  idempotency_key?: string;
  notes?: string;
  items: SalesInvoiceItem[];
  created_at: string;
}

export interface SalesReturnItem {
  id?: string;
  return_id?: string;
  product_id: string;
  product_name_snapshot: string;
  unit_id?: string;
  unit_name_snapshot: string;
  conversion_factor_snapshot: number;
  qty: number;
  qty_in_base_unit: number;
  unit_price: number;
  total_price: number;
}

export interface SalesReturn {
  id: string;
  return_number: string;
  sales_invoice_id?: string;
  invoice_number?: string;
  customer_id?: string;
  customer_name_snapshot: string;
  warehouse_id: string;
  warehouse_name?: string;
  return_date: string;
  total_amount: number;
  refund_type: 'cash' | 'credit_balance'; // نقد من الخزينة أو تخفيض مديونية
  cash_account_id?: string;
  notes?: string;
  items: SalesReturnItem[];
  created_at: string;
}

export interface PurchaseInvoiceItem {
  id?: string;
  purchase_id?: string;
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
}

export interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  supplier_invoice_number?: string;
  supplier_id: string;
  supplier_name?: string;
  warehouse_id: string;
  warehouse_name?: string;
  cash_account_id?: string;
  invoice_date: string;
  payment_type: 'cash' | 'credit' | 'partial';
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'completed' | 'cancelled';
  notes?: string;
  items: PurchaseInvoiceItem[];
  created_at: string;
}

export interface OldLedgerEntry {
  id: string;
  book_name: string; // e.g. "دفتر قرية سنديون 2024"
  page_number?: string;
  entry_date: string;
  party_name: string;
  phone?: string;
  village?: string;
  party_type: 'customer' | 'supplier';
  debit_amount: number; // عليه
  credit_amount: number; // له
  settled_amount: number; // المسدد
  notes?: string;
  is_transferred_to_system: boolean;
  transferred_customer_id?: string;
  created_at: string;
}

// Comprehensive Old Ledger Migration Project Structure
export interface MigrationProject {
  id: string;
  name: string;
  book_type: 'customer_debts' | 'supplier_accounts' | 'cash_ledger';
  start_date?: string;
  end_date?: string;
  description?: string;
  status: 'draft' | 'in_progress' | 'reviewed' | 'completed';
  user_in_charge: string;
  created_at: string;
}

export interface MigrationPage {
  id: string;
  project_id: string;
  book_number: string;
  original_page_number: string;
  image_url?: string;
  page_date?: string;
  extraction_status: 'pending' | 'extracted' | 'manual_entry';
  review_status: 'pending' | 'in_review' | 'reviewed' | 'approved';
  notes?: string;
  created_at: string;
}

export type MigrationEntryStatus =
  | 'new'
  | 'extracted'
  | 'needs_review'
  | 'reviewed'
  | 'approved'
  | 'migrated'
  | 'rejected'
  | 'potential_duplicate';

export interface MigrationEntry {
  id: string;
  project_id: string;
  page_id: string;
  book_name?: string;
  original_page_number?: string;
  line_number?: number;
  customer_name_raw: string;
  matched_customer_id?: string;
  matched_customer_name?: string;
  date: string;
  description: string;
  product_info?: string;
  qty?: number;
  unit?: string;
  amount: number;
  movement_type: 'credit_sale' | 'payment' | 'return' | 'balance_forward';
  direction: 'debit' | 'credit';
  handwritten_balance?: number;
  review_status: MigrationEntryStatus;
  extraction_confidence?: number;
  duplicate_warning?: string;
  notes?: string;
  migrated_to_ledger_id?: string;
  created_at: string;
}

export interface MigrationBatch {
  id: string;
  project_id: string;
  batch_number: string;
  pages_count: number;
  total_entries: number;
  approved_entries: number;
  total_debit: number;
  total_credit: number;
  net_balance: number;
  status: 'pending_review' | 'committed';
  migrated_at?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_name: string;
  old_data?: any;
  new_data?: any;
  details?: string;
  created_at: string;
}

export interface CompanyInfo {
  name: string;
  activity: string;
  commercial_reg?: string;
  tax_card?: string;
  phone: string;
  address: string;
  invoice_footer?: string;
}

export interface AppSettings {
  company_info: CompanyInfo;
  pos_settings: {
    allow_negative_stock: boolean;
    enable_tax: boolean;
    tax_percentage: number;
    print_immediately: boolean;
    default_warehouse_id: string;
    default_cash_account_id: string;
  };
}

export interface StockBatch {
  id: string;
  warehouse_id: string;
  warehouse_name?: string;
  warehouse_code?: string;
  product_id: string;
  product_name?: string;
  product_code?: string;
  is_pesticide?: boolean;
  batch_number: string;
  expiry_date: string;
  qty_in_base_unit: number;
  created_at: string;
  updated_at?: string;
}

export interface SalesInvoiceItemBatch {
  id: string;
  invoice_id: string;
  invoice_item_id: string;
  product_id: string;
  product_name?: string;
  batch_id?: string;
  batch_number: string;
  expiry_date?: string;
  qty_in_base_unit: number;
  created_at: string;
}

export interface ExpiringBatchItem {
  id?: string;
  warehouse_id: string;
  warehouse_name: string;
  warehouse_code?: string;
  product_id: string;
  product_name: string;
  product_code?: string;
  is_pesticide?: boolean;
  batch_number: string;
  expiry_date: string;
  days_remaining: number;
  qty_in_base_unit: number;
  base_unit_name?: string;
}
