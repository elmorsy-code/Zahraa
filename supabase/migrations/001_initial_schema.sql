-- ==============================================================================
-- 001_initial_schema.sql
-- Agricultural Pharmacy & Pesticide/Fertilizer Store Management System Schema
-- PostgreSQL / Supabase Migration
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles & Roles
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(50) PRIMARY KEY,
  name_ar VARCHAR(100) NOT NULL,
  description_ar TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (id, name_ar, description_ar, permissions) VALUES
  ('admin', 'المدير العام', 'صلاحيات كاملة على كافة أجزاء النظام والتقارير والبيانات المالية', '["all"]'::jsonb),
  ('cashier', 'كاشير / بائع', 'إصدار فواتير البيع، تحصيل النقدية، استعلام أسعار وبحث عملاء', '["pos", "sales_read", "sales_create", "customers_read", "customers_create", "cash_receipt"]'::jsonb),
  ('storekeeper', 'مسؤول المخزن', 'إدارة المخزون، التحويلات بين المخزن والمحل، استلام المشتريات والجرد', '["inventory_all", "purchases_read", "transfers_all", "products_read"]'::jsonb),
  ('accountant', 'المحاسب', 'متابعة كشوف حسابات العملاء والموردين، الخزينة، المصروفات، والتقارير المالية', '["accounting_all", "treasury_all", "reports_all", "sales_read", "purchases_read"]'::jsonb),
  ('viewer', 'مستعرض (قراءة فقط)', 'عرض التقارير والبيانات دون إمكانية التعديل أو الحذف', '["read_only"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE, -- References auth.users(id) if Supabase Auth is enabled
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(50),
  role_id VARCHAR(50) NOT NULL REFERENCES roles(id) DEFAULT 'cashier',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Warehouses (المخزن والمحل)
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  location_type VARCHAR(50) NOT NULL DEFAULT 'shop', -- 'shop' (محل) or 'warehouse' (مخزن)
  is_primary BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO warehouses (code, name, location_type, is_primary, is_active, notes) VALUES
  ('SHOP', 'محل البيع المباشر', 'shop', TRUE, TRUE, 'المحل الزراعي ونقطة البيع الرئيسية'),
  ('WH-MAIN', 'المخزن الرئيسي', 'warehouse', FALSE, TRUE, 'المستودع الرئيسي للمبيدات والأسمدة والتقاوي')
ON CONFLICT (code) DO NOTHING;

-- 3. Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Products (أدوية ومبيدات وأسمدة وتقاوي)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  barcode VARCHAR(100),
  name VARCHAR(250) NOT NULL,
  commercial_name VARCHAR(250),
  active_ingredient TEXT, -- المادة الفعالة والتركيز (مثل: أباكتين 5% أو كلوربيريفوس 48%)
  manufacturer VARCHAR(200), -- الشركة المنتجة / المستورد
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  description TEXT,
  base_unit_name VARCHAR(50) NOT NULL DEFAULT 'جرام', -- الوحدة الأساسية للمخزون (جرام / مل / لتر / حبة)
  default_purchase_price NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  default_sale_price NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  min_stock_alert NUMERIC(15, 3) NOT NULL DEFAULT 10.000, -- حد التنبيه بالوحدة الأساسية
  is_pesticide BOOLEAN DEFAULT FALSE,
  requires_prescription BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Product Multi-Units (معاملات تحويل الوحدات المتعددة)
-- Mandatory Multi-unit conversion table
CREATE TABLE IF NOT EXISTS product_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_name VARCHAR(100) NOT NULL, -- e.g. "كيس 100 جم", "كيس 250 جم", "كيلوجرام", "كرتونة 12 لتر"
  conversion_factor NUMERIC(15, 4) NOT NULL DEFAULT 1.0000, -- كم تحتوي هذه الوحدة من الوحدة الأساسية
  sale_price NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  purchase_price NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  barcode VARCHAR(100),
  is_base_unit BOOLEAN DEFAULT FALSE,
  is_default_sale BOOLEAN DEFAULT FALSE,
  is_default_purchase BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Customers (العملاء والمزارعين وأصحاب المزارع)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(250) NOT NULL,
  phone VARCHAR(50),
  village_or_address VARCHAR(250),
  national_id VARCHAR(50),
  notes TEXT,
  credit_limit NUMERIC(15, 3) DEFAULT 0.000,
  opening_balance NUMERIC(15, 3) DEFAULT 0.000, -- موجب = مدين للمحل، سالب = دائن
  current_balance NUMERIC(15, 3) DEFAULT 0.000,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Suppliers (الموردين وشركات الأسمدة والمبيدات)
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(250) NOT NULL,
  company_name VARCHAR(250),
  phone VARCHAR(50),
  address TEXT,
  tax_number VARCHAR(100),
  notes TEXT,
  opening_balance NUMERIC(15, 3) DEFAULT 0.000, -- موجب = مستحق للمورد
  current_balance NUMERIC(15, 3) DEFAULT 0.000,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Cash Accounts (الخزينة والحسابات المالية)
CREATE TABLE IF NOT EXISTS cash_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  account_type VARCHAR(50) DEFAULT 'cash', -- 'cash', 'bank', 'wallet'
  current_balance NUMERIC(15, 3) DEFAULT 0.000,
  is_primary BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO cash_accounts (code, name, account_type, current_balance, is_primary, is_active) VALUES
  ('CASH-MAIN', 'الخزينة الرئيسية - المحل', 'cash', 0.000, TRUE, TRUE),
  ('BANK-MISR', 'حساب بنكي / محفظة إلكترونية', 'bank', 0.000, FALSE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 9. Stock Balances (رصيد كل منتج في كل موقع بالوحدة الأساسية)
CREATE TABLE IF NOT EXISTS stock_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty_in_base_unit NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
  avg_cost_price NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_product_warehouse UNIQUE (warehouse_id, product_id)
);

-- 10. Sales Invoices (فواتير المبيعات)
CREATE TABLE IF NOT EXISTS sales_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name_snapshot VARCHAR(250) NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  cash_account_id UUID REFERENCES cash_accounts(id),
  invoice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_type VARCHAR(50) NOT NULL DEFAULT 'cash', -- 'cash', 'credit', 'partial'
  subtotal NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  discount_amount NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  tax_amount NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  total_amount NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  paid_amount NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  remaining_amount NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  status VARCHAR(50) NOT NULL DEFAULT 'completed', -- 'completed', 'cancelled', 'draft'
  idempotency_key VARCHAR(100) UNIQUE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Sales Invoice Items (بنود فواتير البيع مع توثيق معاملات التحويل التاريخية)
CREATE TABLE IF NOT EXISTS sales_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name_snapshot VARCHAR(250) NOT NULL,
  unit_id UUID REFERENCES product_units(id),
  unit_name_snapshot VARCHAR(100) NOT NULL,
  conversion_factor_snapshot NUMERIC(15, 4) NOT NULL DEFAULT 1.0000, -- كمية الوحدة الأساسية
  qty NUMERIC(15, 4) NOT NULL, -- الكمية بوحدة البيع
  qty_in_base_unit NUMERIC(15, 4) NOT NULL, -- qty * conversion_factor
  unit_price NUMERIC(15, 3) NOT NULL,
  total_price NUMERIC(15, 3) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Purchase Invoices (فواتير المشتريات)
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_invoice_number VARCHAR(100),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  cash_account_id UUID REFERENCES cash_accounts(id),
  invoice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_type VARCHAR(50) NOT NULL DEFAULT 'credit',
  subtotal NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  discount_amount NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  tax_amount NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  total_amount NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  paid_amount NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  remaining_amount NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  status VARCHAR(50) NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Purchase Invoice Items
CREATE TABLE IF NOT EXISTS purchase_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name_snapshot VARCHAR(250) NOT NULL,
  unit_id UUID REFERENCES product_units(id),
  unit_name_snapshot VARCHAR(100) NOT NULL,
  conversion_factor_snapshot NUMERIC(15, 4) NOT NULL DEFAULT 1.0000,
  qty NUMERIC(15, 4) NOT NULL,
  qty_in_base_unit NUMERIC(15, 4) NOT NULL,
  cost_price NUMERIC(15, 3) NOT NULL,
  total_cost NUMERIC(15, 3) NOT NULL,
  batch_number VARCHAR(100),
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Stock Movements (حركات المخزون الشاملة)
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_number VARCHAR(50) NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  product_id UUID NOT NULL REFERENCES products(id),
  movement_type VARCHAR(50) NOT NULL, -- 'sale', 'purchase', 'transfer_out', 'transfer_in', 'adjustment_plus', 'adjustment_minus', 'sale_return', 'purchase_return', 'opening'
  qty_in_base_unit NUMERIC(15, 4) NOT NULL, -- موجب للزيادة، سالب للنقصان
  balance_after NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
  unit_cost NUMERIC(15, 3) DEFAULT 0.000,
  reference_type VARCHAR(50), -- 'sales_invoice', 'purchase_invoice', 'stock_transfer', 'stock_adjustment'
  reference_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Stock Transfers (التحويل بين المخزن والمحل)
CREATE TABLE IF NOT EXISTS stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number VARCHAR(50) UNIQUE NOT NULL,
  from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  to_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  transfer_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'cancelled'
  notes TEXT,
  created_by UUID,
  approved_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  unit_id UUID REFERENCES product_units(id),
  unit_name_snapshot VARCHAR(100) NOT NULL,
  conversion_factor_snapshot NUMERIC(15, 4) NOT NULL DEFAULT 1.0000,
  qty NUMERIC(15, 4) NOT NULL,
  qty_in_base_unit NUMERIC(15, 4) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Customer Ledger Entries & Payments (كشف حساب العميل وسندات القبض)
CREATE TABLE IF NOT EXISTS customer_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entry_type VARCHAR(50) NOT NULL, -- 'invoice', 'payment', 'return', 'opening_balance', 'adjustment'
  document_number VARCHAR(100),
  reference_id UUID,
  debit NUMERIC(15, 3) NOT NULL DEFAULT 0.000, -- مدين (على العميل)
  credit NUMERIC(15, 3) NOT NULL DEFAULT 0.000, -- دائن (سدد العميل)
  running_balance NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  cash_account_id UUID NOT NULL REFERENCES cash_accounts(id),
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  amount NUMERIC(15, 3) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Supplier Ledger Entries & Payments (كشف حساب المورد وسندات الصرف)
CREATE TABLE IF NOT EXISTS supplier_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entry_type VARCHAR(50) NOT NULL, -- 'purchase', 'payment', 'return', 'opening_balance', 'adjustment'
  document_number VARCHAR(100),
  reference_id UUID,
  debit NUMERIC(15, 3) NOT NULL DEFAULT 0.000, -- مدين (سددنا للمورد)
  credit NUMERIC(15, 3) NOT NULL DEFAULT 0.000, -- دائن (مستحق للمورد)
  running_balance NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  cash_account_id UUID NOT NULL REFERENCES cash_accounts(id),
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  amount NUMERIC(15, 3) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Cash Transactions & Expenses (حركات الخزينة والمصروفات)
CREATE TABLE IF NOT EXISTS cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number VARCHAR(50) UNIQUE NOT NULL,
  cash_account_id UUID NOT NULL REFERENCES cash_accounts(id),
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transaction_type VARCHAR(50) NOT NULL, -- 'sales_inflow', 'customer_receipt', 'purchase_outflow', 'supplier_payment', 'expense', 'deposit', 'withdrawal'
  amount NUMERIC(15, 3) NOT NULL,
  direction VARCHAR(10) NOT NULL, -- 'in' or 'out'
  balance_after NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  reference_type VARCHAR(50),
  reference_id UUID,
  party_type VARCHAR(50), -- 'customer', 'supplier', 'expense', 'other'
  party_name VARCHAR(250),
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number VARCHAR(50) UNIQUE NOT NULL,
  cash_account_id UUID NOT NULL REFERENCES cash_accounts(id),
  category VARCHAR(100) NOT NULL, -- 'إيجار', 'كهرباء ومياه', 'نقل وشحن', 'أجور وعمالة', 'ضيافة', 'أدوات مكتبية', 'أخرى'
  amount NUMERIC(15, 3) NOT NULL,
  expense_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_to VARCHAR(250),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Old Ledgers (الدفاتر الورقية القديمة وترحيل الأرصدة)
CREATE TABLE IF NOT EXISTS old_ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_name VARCHAR(150) NOT NULL, -- اسم الدفتر (دفتر عام 2024، دفتر قرية كفر الشيخ)
  page_number VARCHAR(50),
  entry_date DATE NOT NULL,
  party_name VARCHAR(250) NOT NULL,
  phone VARCHAR(50),
  village VARCHAR(250),
  party_type VARCHAR(50) NOT NULL DEFAULT 'customer', -- 'customer' or 'supplier'
  debit_amount NUMERIC(15, 3) NOT NULL DEFAULT 0.000, -- عليه
  credit_amount NUMERIC(15, 3) NOT NULL DEFAULT 0.000, -- له
  settled_amount NUMERIC(15, 3) NOT NULL DEFAULT 0.000, -- المسدد
  notes TEXT,
  is_transferred_to_system BOOLEAN DEFAULT FALSE,
  transferred_customer_id UUID REFERENCES customers(id),
  transferred_supplier_id UUID REFERENCES suppliers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Document Sequences (تسلسل الترقيم التلقائي)
CREATE TABLE IF NOT EXISTS document_sequences (
  sequence_type VARCHAR(50) PRIMARY KEY,
  prefix VARCHAR(20) NOT NULL,
  current_number BIGINT NOT NULL DEFAULT 1000,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO document_sequences (sequence_type, prefix, current_number) VALUES
  ('sales_invoice', 'INV-', 1001),
  ('purchase_invoice', 'PUR-', 1001),
  ('stock_transfer', 'TRF-', 1001),
  ('customer_payment', 'RCP-', 1001),
  ('supplier_payment', 'PAY-', 1001),
  ('expense', 'EXP-', 1001),
  ('customer', 'CUST-', 1001),
  ('supplier', 'SUPP-', 1001),
  ('product', 'PRD-', 1001)
ON CONFLICT (sequence_type) DO NOTHING;

-- 21. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100),
  user_name VARCHAR(150),
  details JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. App Settings
CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_settings (key, value) VALUES
  ('company_info', '{
    "name": "مؤسسة البركة للأدوية والمبيدات الزراعية",
    "activity": "تجارة المبيدات والأسمدة والمخصبات والتقاوي والأدوية البيطرية",
    "commercial_reg": "1049284",
    "tax_card": "489-321-99",
    "phone": "01002345678",
    "address": "طريق المحطة، الدلتا، جمهورية مصر العربية",
    "invoice_footer": "البضاعة المباعة تخضع لإرشادات الاستخدام الفني. نحرص على تقديم أفضل الحلول الزراعية لمحصول أوفر."
  }'::jsonb),
  ('pos_settings', '{
    "allow_negative_stock": false,
    "enable_tax": false,
    "tax_percentage": 0.0,
    "print_immediately": true,
    "default_warehouse_code": "SHOP",
    "default_cash_code": "CASH-MAIN"
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 23. Idempotency Keys table
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key VARCHAR(150) PRIMARY KEY,
  action_type VARCHAR(100) NOT NULL,
  response_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_product_units_product_id ON product_units(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_product ON stock_balances(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_warehouse ON stock_balances(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer ON sales_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_date ON sales_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer ON customer_ledger_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ledger_supplier ON supplier_ledger_entries(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_account ON cash_transactions(cash_account_id);
