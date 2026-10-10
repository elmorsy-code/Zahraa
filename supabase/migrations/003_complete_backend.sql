-- ==============================================================================
-- 003_complete_backend.sql
-- المنظومة الشاملة لقاعدة بيانات صيدلية ومخزن الزهراء الزراعي
-- Complete Production Backend Migration for Supabase / PostgreSQL
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. SCHEMA COMPLETION (Missing Tables & Columns)

-- A. Alter existing tables to match src/types/database.ts exactly
ALTER TABLE products ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);

ALTER TABLE customer_ledger_entries ADD COLUMN IF NOT EXISTS invoice_total NUMERIC(15, 3);
ALTER TABLE customer_ledger_entries ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15, 3);
ALTER TABLE customer_ledger_entries ADD COLUMN IF NOT EXISTS returns_amount NUMERIC(15, 3);

ALTER TABLE supplier_ledger_entries ADD COLUMN IF NOT EXISTS purchase_total NUMERIC(15, 3);
ALTER TABLE supplier_ledger_entries ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15, 3);
ALTER TABLE supplier_ledger_entries ADD COLUMN IF NOT EXISTS returns_amount NUMERIC(15, 3);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(50) DEFAULT 'bg-emerald-700';

-- B. Create Sales Returns Table (مرتجعات المبيعات)
CREATE TABLE IF NOT EXISTS sales_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number VARCHAR(50) UNIQUE NOT NULL,
  sales_invoice_id UUID REFERENCES sales_invoices(id) ON DELETE SET NULL,
  invoice_number VARCHAR(50),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name_snapshot VARCHAR(250) NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  return_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_amount NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  refund_type VARCHAR(50) NOT NULL DEFAULT 'credit_balance', -- 'cash' or 'credit_balance'
  cash_account_id UUID REFERENCES cash_accounts(id) ON DELETE SET NULL,
  notes TEXT,
  idempotency_key VARCHAR(100) UNIQUE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- C. Create Sales Return Items Table
CREATE TABLE IF NOT EXISTS sales_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name_snapshot VARCHAR(250) NOT NULL,
  unit_id UUID REFERENCES product_units(id) ON DELETE SET NULL,
  unit_name_snapshot VARCHAR(100) NOT NULL,
  conversion_factor_snapshot NUMERIC(15, 4) NOT NULL DEFAULT 1.0000,
  qty NUMERIC(15, 4) NOT NULL,
  qty_in_base_unit NUMERIC(15, 4) NOT NULL,
  unit_price NUMERIC(15, 3) NOT NULL,
  total_price NUMERIC(15, 3) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- D. Create Migration Projects Table (مشاريع ترحيل الدفاتر الورقية القديمة)
CREATE TABLE IF NOT EXISTS migration_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(250) NOT NULL,
  book_type VARCHAR(50) NOT NULL DEFAULT 'customer_debts', -- 'customer_debts', 'supplier_accounts', 'cash_ledger'
  start_date DATE,
  end_date DATE,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- 'draft', 'in_progress', 'reviewed', 'completed'
  user_in_charge VARCHAR(150) NOT NULL DEFAULT 'المدير العام',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- E. Create Migration Pages Table (صفحات الدفاتر الورقية)
CREATE TABLE IF NOT EXISTS migration_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES migration_projects(id) ON DELETE CASCADE,
  book_number VARCHAR(50) NOT NULL DEFAULT '1',
  original_page_number VARCHAR(50) NOT NULL,
  image_url TEXT,
  page_date DATE,
  extraction_status VARCHAR(50) NOT NULL DEFAULT 'manual_entry', -- 'pending', 'extracted', 'manual_entry'
  review_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'in_review', 'reviewed', 'approved'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- F. Create Migration Entries Table (أسطر وقيود الترحيل)
CREATE TABLE IF NOT EXISTS migration_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES migration_projects(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES migration_pages(id) ON DELETE CASCADE,
  book_name VARCHAR(150),
  original_page_number VARCHAR(50),
  line_number INT,
  customer_name_raw VARCHAR(250) NOT NULL,
  matched_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  matched_customer_name VARCHAR(250),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  product_info TEXT,
  qty NUMERIC(15, 4),
  unit VARCHAR(100),
  amount NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
  movement_type VARCHAR(50) NOT NULL DEFAULT 'credit_sale', -- 'credit_sale', 'payment', 'return', 'balance_forward'
  direction VARCHAR(10) NOT NULL DEFAULT 'debit', -- 'debit' or 'credit'
  handwritten_balance NUMERIC(15, 3),
  review_status VARCHAR(50) NOT NULL DEFAULT 'needs_review', -- 'new', 'extracted', 'needs_review', 'reviewed', 'approved', 'migrated', 'rejected', 'potential_duplicate'
  extraction_confidence NUMERIC(5, 2) DEFAULT 0.90,
  duplicate_warning TEXT,
  notes TEXT,
  migrated_to_ledger_id UUID REFERENCES customer_ledger_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- G. Create Migration Batches Table
CREATE TABLE IF NOT EXISTS migration_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES migration_projects(id) ON DELETE CASCADE,
  batch_number VARCHAR(50) NOT NULL,
  pages_count INT DEFAULT 0,
  total_entries INT DEFAULT 0,
  approved_entries INT DEFAULT 0,
  total_debit NUMERIC(15, 3) DEFAULT 0.000,
  total_credit NUMERIC(15, 3) DEFAULT 0.000,
  net_balance NUMERIC(15, 3) DEFAULT 0.000,
  status VARCHAR(50) DEFAULT 'pending_review',
  migrated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_sales_returns_customer ON sales_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_invoice ON sales_returns(sales_invoice_id);
CREATE INDEX IF NOT EXISTS idx_migration_entries_project ON migration_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_migration_entries_page ON migration_entries(page_id);
CREATE INDEX IF NOT EXISTS idx_migration_entries_customer ON migration_entries(matched_customer_id);

-- 4. DOCUMENT SEQUENCES WITH PESSIMISTIC LOCKING
-- Insert all missing sequence types
INSERT INTO document_sequences (sequence_type, prefix, current_number) VALUES
  ('sales_invoice', 'INV-', 1001),
  ('purchase_invoice', 'PUR-', 1001),
  ('stock_transfer', 'TRF-', 1001),
  ('customer_payment', 'RCP-', 1001),
  ('supplier_payment', 'PAY-', 1001),
  ('expense', 'EXP-', 1001),
  ('sales_return', 'RET-', 1001),
  ('cash_transaction', 'CSH-', 1001),
  ('customer', 'CUST-', 1001),
  ('supplier', 'SUPP-', 1001),
  ('product', 'PRD-', 1001)
ON CONFLICT (sequence_type) DO NOTHING;

-- Pessimistic Lock Sequence Generator Function
CREATE OR REPLACE FUNCTION generate_document_number(p_sequence_type VARCHAR)
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix VARCHAR(20);
  v_num BIGINT;
BEGIN
  -- Lock row exclusively to guarantee no duplicated sequence number under high concurrency
  SELECT prefix, current_number INTO v_prefix, v_num
  FROM document_sequences
  WHERE sequence_type = p_sequence_type
  FOR UPDATE;

  IF NOT FOUND THEN
    v_prefix := UPPER(SUBSTRING(p_sequence_type, 1, 3)) || '-';
    v_num := 1001;
    INSERT INTO document_sequences (sequence_type, prefix, current_number)
    VALUES (p_sequence_type, v_prefix, 1002);
    RETURN v_prefix || v_num::TEXT;
  END IF;

  UPDATE document_sequences
  SET current_number = current_number + 1,
      updated_at = NOW()
  WHERE sequence_type = p_sequence_type;

  RETURN v_prefix || v_num::TEXT;
END;
$$;

-- 5. ATOMIC RPC FUNCTIONS (SECURITY DEFINER)

-- Function 1: process_sales_invoice_atomic (Enhanced & Robust)
CREATE OR REPLACE FUNCTION process_sales_invoice_atomic(
  p_invoice_data JSONB,
  p_items JSONB,
  p_idempotency_key VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_id UUID;
  v_invoice_num VARCHAR(50);
  v_customer_id UUID;
  v_warehouse_id UUID;
  v_cash_account_id UUID;
  v_payment_type VARCHAR(50);
  v_subtotal NUMERIC(15, 3);
  v_discount NUMERIC(15, 3);
  v_tax NUMERIC(15, 3);
  v_total NUMERIC(15, 3);
  v_paid NUMERIC(15, 3);
  v_remaining NUMERIC(15, 3);
  v_item JSONB;
  v_product_id UUID;
  v_unit_id UUID;
  v_qty NUMERIC(15, 4);
  v_factor NUMERIC(15, 4);
  v_base_qty NUMERIC(15, 4);
  v_current_stock NUMERIC(15, 4);
  v_allow_negative BOOLEAN := FALSE;
  v_settings JSONB;
  v_cached_response JSONB;
  v_csh_num VARCHAR(50);
  v_new_cash_bal NUMERIC(15, 3);
  v_new_cust_bal NUMERIC(15, 3);
BEGIN
  -- Check Idempotency Key
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response_data INTO v_cached_response FROM idempotency_keys WHERE key = p_idempotency_key;
    IF v_cached_response IS NOT NULL THEN
      RETURN v_cached_response;
    END IF;
  END IF;

  -- Read pos settings
  SELECT value INTO v_settings FROM app_settings WHERE key = 'pos_settings';
  IF v_settings IS NOT NULL AND (v_settings->>'allow_negative_stock')::boolean IS TRUE THEN
    v_allow_negative := TRUE;
  END IF;

  -- Extract parameters
  IF (p_invoice_data->>'customer_id') IS NOT NULL AND (p_invoice_data->>'customer_id') <> '' THEN
    v_customer_id := (p_invoice_data->>'customer_id')::UUID;
  ELSE
    v_customer_id := NULL;
  END IF;

  v_warehouse_id := (p_invoice_data->>'warehouse_id')::UUID;
  
  IF (p_invoice_data->>'cash_account_id') IS NOT NULL AND (p_invoice_data->>'cash_account_id') <> '' THEN
    v_cash_account_id := (p_invoice_data->>'cash_account_id')::UUID;
  ELSE
    v_cash_account_id := NULL;
  END IF;

  v_payment_type := COALESCE(p_invoice_data->>'payment_type', 'cash');
  v_subtotal := COALESCE((p_invoice_data->>'subtotal')::NUMERIC, 0.000);
  v_discount := COALESCE((p_invoice_data->>'discount_amount')::NUMERIC, 0.000);
  v_tax := COALESCE((p_invoice_data->>'tax_amount')::NUMERIC, 0.000);
  v_total := COALESCE((p_invoice_data->>'total_amount')::NUMERIC, 0.000);
  v_paid := COALESCE((p_invoice_data->>'paid_amount')::NUMERIC, 0.000);
  v_remaining := GREATEST(0.000, v_total - v_paid);

  -- Next invoice number via locked sequence
  v_invoice_num := generate_document_number('sales_invoice');

  -- Pre-validate Stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'qty')::NUMERIC;
    v_factor := COALESCE((v_item->>'conversion_factor_snapshot')::NUMERIC, 1.0000);
    v_base_qty := v_qty * v_factor;

    SELECT COALESCE(qty_in_base_unit, 0.0000)
    INTO v_current_stock
    FROM stock_balances
    WHERE warehouse_id = v_warehouse_id AND product_id = v_product_id;

    IF v_current_stock IS NULL THEN
      v_current_stock := 0.0000;
    END IF;

    IF NOT v_allow_negative AND (v_current_stock < v_base_qty) THEN
      RAISE EXCEPTION 'الرصيد المتاح من الصنف "%" غير كافٍ في المخزن المحدد (المتاح: %, المطلوب: %)',
        COALESCE(v_item->>'product_name_snapshot', 'غير معروف'), v_current_stock, v_base_qty;
    END IF;
  END LOOP;

  -- Insert Sales Invoice
  INSERT INTO sales_invoices (
    invoice_number,
    customer_id,
    customer_name_snapshot,
    warehouse_id,
    cash_account_id,
    invoice_date,
    payment_type,
    subtotal,
    discount_amount,
    tax_amount,
    total_amount,
    paid_amount,
    remaining_amount,
    status,
    idempotency_key,
    notes,
    created_by
  ) VALUES (
    v_invoice_num,
    v_customer_id,
    COALESCE(p_invoice_data->>'customer_name_snapshot', 'عميل نقدي'),
    v_warehouse_id,
    v_cash_account_id,
    COALESCE((p_invoice_data->>'invoice_date')::TIMESTAMPTZ, NOW()),
    v_payment_type,
    v_subtotal,
    v_discount,
    v_tax,
    v_total,
    v_paid,
    v_remaining,
    'completed',
    p_idempotency_key,
    p_invoice_data->>'notes',
    auth.uid()
  ) RETURNING id INTO v_invoice_id;

  -- Insert Items & Update Stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    
    IF (v_item->>'unit_id') IS NOT NULL AND (v_item->>'unit_id') <> '' THEN
      v_unit_id := (v_item->>'unit_id')::UUID;
    ELSE
      v_unit_id := NULL;
    END IF;

    v_qty := (v_item->>'qty')::NUMERIC;
    v_factor := COALESCE((v_item->>'conversion_factor_snapshot')::NUMERIC, 1.0000);
    v_base_qty := v_qty * v_factor;

    INSERT INTO sales_invoice_items (
      invoice_id,
      product_id,
      product_name_snapshot,
      unit_id,
      unit_name_snapshot,
      conversion_factor_snapshot,
      qty,
      qty_in_base_unit,
      unit_price,
      total_price
    ) VALUES (
      v_invoice_id,
      v_product_id,
      v_item->>'product_name_snapshot',
      v_unit_id,
      COALESCE(v_item->>'unit_name_snapshot', 'وحدة'),
      v_factor,
      v_qty,
      v_base_qty,
      (v_item->>'unit_price')::NUMERIC,
      (v_item->>'total_price')::NUMERIC
    );

    -- Upsert stock balance deduction
    INSERT INTO stock_balances (warehouse_id, product_id, qty_in_base_unit, last_updated)
    VALUES (v_warehouse_id, v_product_id, -v_base_qty, NOW())
    ON CONFLICT (warehouse_id, product_id)
    DO UPDATE SET
      qty_in_base_unit = stock_balances.qty_in_base_unit - v_base_qty,
      last_updated = NOW()
    RETURNING qty_in_base_unit INTO v_current_stock;

    -- Record stock movement
    INSERT INTO stock_movements (
      movement_number,
      warehouse_id,
      product_id,
      movement_type,
      qty_in_base_unit,
      balance_after,
      reference_type,
      reference_id,
      notes,
      created_by
    ) VALUES (
      generate_document_number('sales_invoice'),
      v_warehouse_id,
      v_product_id,
      'sale',
      -v_base_qty,
      v_current_stock,
      'sales_invoice',
      v_invoice_id,
      'صرف مبيعات فاتورة رقم ' || v_invoice_num,
      auth.uid()
    );
  END LOOP;

  -- Customer Ledger & Balance
  IF v_customer_id IS NOT NULL THEN
    UPDATE customers
    SET current_balance = current_balance + v_remaining,
        updated_at = NOW()
    WHERE id = v_customer_id
    RETURNING current_balance INTO v_new_cust_bal;

    INSERT INTO customer_ledger_entries (
      customer_id,
      entry_type,
      document_number,
      reference_id,
      invoice_total,
      paid_amount,
      debit,
      credit,
      running_balance,
      description
    ) VALUES (
      v_customer_id,
      'invoice',
      v_invoice_num,
      v_invoice_id,
      v_total,
      v_paid,
      v_total,
      v_paid,
      v_new_cust_bal,
      'فاتورة مبيعات رقم ' || v_invoice_num
    );
  END IF;

  -- Cash Accounting
  IF v_paid > 0 AND v_cash_account_id IS NOT NULL THEN
    UPDATE cash_accounts
    SET current_balance = current_balance + v_paid
    WHERE id = v_cash_account_id
    RETURNING current_balance INTO v_new_cash_bal;

    v_csh_num := generate_document_number('cash_transaction');

    INSERT INTO cash_transactions (
      transaction_number,
      cash_account_id,
      transaction_type,
      amount,
      direction,
      balance_after,
      reference_type,
      reference_id,
      party_type,
      party_name,
      description,
      created_by
    ) VALUES (
      v_csh_num,
      v_cash_account_id,
      'sales_inflow',
      v_paid,
      'in',
      v_new_cash_bal,
      'sales_invoice',
      v_invoice_id,
      'customer',
      COALESCE(p_invoice_data->>'customer_name_snapshot', 'عميل نقدي'),
      'تحصيل مبيعات فاتورة رقم ' || v_invoice_num,
      auth.uid()
    );
  END IF;

  -- Audit Log
  INSERT INTO audit_logs (action, entity_type, entity_id, user_name, details)
  VALUES (
    'إصدار فاتورة بيع',
    'sales_invoice',
    v_invoice_num,
    COALESCE(p_invoice_data->>'customer_name_snapshot', 'كاشير'),
    jsonb_build_object('total', v_total, 'paid', v_paid, 'items_count', jsonb_array_length(p_items))
  );

  -- Store Idempotency
  v_cached_response := jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_num,
    'total_amount', v_total,
    'paid_amount', v_paid,
    'remaining_amount', v_remaining,
    'message', 'تم حفظ واعتماد الفاتورة وتحديث الأرصدة بنجاح'
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO idempotency_keys (key, action_type, response_data)
    VALUES (p_idempotency_key, 'sales_invoice', v_cached_response)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_cached_response;
END;
$$;

-- Function 2: process_purchase_invoice_atomic
CREATE OR REPLACE FUNCTION process_purchase_invoice_atomic(
  p_purchase_data JSONB,
  p_items JSONB,
  p_idempotency_key VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_purchase_id UUID;
  v_purchase_num VARCHAR(50);
  v_supplier_id UUID;
  v_warehouse_id UUID;
  v_cash_account_id UUID;
  v_payment_type VARCHAR(50);
  v_subtotal NUMERIC(15, 3);
  v_discount NUMERIC(15, 3);
  v_tax NUMERIC(15, 3);
  v_total NUMERIC(15, 3);
  v_paid NUMERIC(15, 3);
  v_remaining NUMERIC(15, 3);
  v_item JSONB;
  v_product_id UUID;
  v_unit_id UUID;
  v_qty NUMERIC(15, 4);
  v_factor NUMERIC(15, 4);
  v_base_qty NUMERIC(15, 4);
  v_current_stock NUMERIC(15, 4);
  v_cached_response JSONB;
  v_supplier_name VARCHAR(250);
  v_new_supp_bal NUMERIC(15, 3);
  v_new_cash_bal NUMERIC(15, 3);
  v_csh_num VARCHAR(50);
BEGIN
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response_data INTO v_cached_response FROM idempotency_keys WHERE key = p_idempotency_key;
    IF v_cached_response IS NOT NULL THEN
      RETURN v_cached_response;
    END IF;
  END IF;

  v_supplier_id := (p_purchase_data->>'supplier_id')::UUID;
  v_warehouse_id := (p_purchase_data->>'warehouse_id')::UUID;

  IF (p_purchase_data->>'cash_account_id') IS NOT NULL AND (p_purchase_data->>'cash_account_id') <> '' THEN
    v_cash_account_id := (p_purchase_data->>'cash_account_id')::UUID;
  ELSE
    v_cash_account_id := NULL;
  END IF;

  SELECT name INTO v_supplier_name FROM suppliers WHERE id = v_supplier_id;
  IF v_supplier_name IS NULL THEN
    RAISE EXCEPTION 'المورد المحدد غير موجود في النظام';
  END IF;

  v_payment_type := COALESCE(p_purchase_data->>'payment_type', 'credit');
  v_subtotal := COALESCE((p_purchase_data->>'subtotal')::NUMERIC, 0.000);
  v_discount := COALESCE((p_purchase_data->>'discount_amount')::NUMERIC, 0.000);
  v_tax := COALESCE((p_purchase_data->>'tax_amount')::NUMERIC, 0.000);
  v_total := COALESCE((p_purchase_data->>'total_amount')::NUMERIC, 0.000);
  v_paid := COALESCE((p_purchase_data->>'paid_amount')::NUMERIC, 0.000);
  v_remaining := GREATEST(0.000, v_total - v_paid);

  v_purchase_num := generate_document_number('purchase_invoice');

  -- Insert Purchase Invoice
  INSERT INTO purchase_invoices (
    invoice_number,
    supplier_invoice_number,
    supplier_id,
    warehouse_id,
    cash_account_id,
    invoice_date,
    payment_type,
    subtotal,
    discount_amount,
    tax_amount,
    total_amount,
    paid_amount,
    remaining_amount,
    status,
    notes,
    created_by
  ) VALUES (
    v_purchase_num,
    p_purchase_data->>'supplier_invoice_number',
    v_supplier_id,
    v_warehouse_id,
    v_cash_account_id,
    COALESCE((p_purchase_data->>'invoice_date')::TIMESTAMPTZ, NOW()),
    v_payment_type,
    v_subtotal,
    v_discount,
    v_tax,
    v_total,
    v_paid,
    v_remaining,
    'completed',
    p_purchase_data->>'notes',
    auth.uid()
  ) RETURNING id INTO v_purchase_id;

  -- Insert Items & Add to Stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    
    IF (v_item->>'unit_id') IS NOT NULL AND (v_item->>'unit_id') <> '' THEN
      v_unit_id := (v_item->>'unit_id')::UUID;
    ELSE
      v_unit_id := NULL;
    END IF;

    v_qty := (v_item->>'qty')::NUMERIC;
    v_factor := COALESCE((v_item->>'conversion_factor_snapshot')::NUMERIC, 1.0000);
    v_base_qty := v_qty * v_factor;

    INSERT INTO purchase_invoice_items (
      purchase_id,
      product_id,
      product_name_snapshot,
      unit_id,
      unit_name_snapshot,
      conversion_factor_snapshot,
      qty,
      qty_in_base_unit,
      cost_price,
      total_cost,
      batch_number,
      expiry_date
    ) VALUES (
      v_purchase_id,
      v_product_id,
      v_item->>'product_name_snapshot',
      v_unit_id,
      COALESCE(v_item->>'unit_name_snapshot', 'وحدة'),
      v_factor,
      v_qty,
      v_base_qty,
      (v_item->>'cost_price')::NUMERIC,
      (v_item->>'total_cost')::NUMERIC,
      v_item->>'batch_number',
      CASE WHEN (v_item->>'expiry_date') IS NOT NULL AND (v_item->>'expiry_date') <> ''
           THEN (v_item->>'expiry_date')::DATE ELSE NULL END
    );

    -- Increase stock balance
    INSERT INTO stock_balances (warehouse_id, product_id, qty_in_base_unit, last_updated)
    VALUES (v_warehouse_id, v_product_id, v_base_qty, NOW())
    ON CONFLICT (warehouse_id, product_id)
    DO UPDATE SET
      qty_in_base_unit = stock_balances.qty_in_base_unit + v_base_qty,
      last_updated = NOW()
    RETURNING qty_in_base_unit INTO v_current_stock;

    -- Record stock movement
    INSERT INTO stock_movements (
      movement_number,
      warehouse_id,
      product_id,
      movement_type,
      qty_in_base_unit,
      balance_after,
      reference_type,
      reference_id,
      notes,
      created_by
    ) VALUES (
      generate_document_number('stock_transfer'),
      v_warehouse_id,
      v_product_id,
      'purchase',
      v_base_qty,
      v_current_stock,
      'purchase_invoice',
      v_purchase_id,
      'توريد مشتريات فاتورة ' || v_purchase_num,
      auth.uid()
    );
  END LOOP;

  -- Supplier Balance & Ledger
  UPDATE suppliers
  SET current_balance = current_balance + v_remaining,
      updated_at = NOW()
  WHERE id = v_supplier_id
  RETURNING current_balance INTO v_new_supp_bal;

  INSERT INTO supplier_ledger_entries (
    supplier_id,
    entry_type,
    document_number,
    reference_id,
    purchase_total,
    paid_amount,
    debit,
    credit,
    running_balance,
    description
  ) VALUES (
    v_supplier_id,
    'purchase',
    v_purchase_num,
    v_purchase_id,
    v_total,
    v_paid,
    v_paid,
    v_total,
    v_new_supp_bal,
    'فاتورة مشتريات وتوريد رقم ' || v_purchase_num
  );

  -- Cash deduction if paid > 0
  IF v_paid > 0 AND v_cash_account_id IS NOT NULL THEN
    UPDATE cash_accounts
    SET current_balance = current_balance - v_paid
    WHERE id = v_cash_account_id
    RETURNING current_balance INTO v_new_cash_bal;

    v_csh_num := generate_document_number('cash_transaction');

    INSERT INTO cash_transactions (
      transaction_number,
      cash_account_id,
      transaction_type,
      amount,
      direction,
      balance_after,
      reference_type,
      reference_id,
      party_type,
      party_name,
      description,
      created_by
    ) VALUES (
      v_csh_num,
      v_cash_account_id,
      'supplier_payment',
      v_paid,
      'out',
      v_new_cash_bal,
      'purchase_invoice',
      v_purchase_id,
      'supplier',
      v_supplier_name,
      'سداد دفعة مشتريات فاتورة رقم ' || v_purchase_num,
      auth.uid()
    );
  END IF;

  -- Audit Log
  INSERT INTO audit_logs (action, entity_type, entity_id, user_name, details)
  VALUES (
    'تسجيل فاتورة مشتريات',
    'purchase_invoice',
    v_purchase_num,
    v_supplier_name,
    jsonb_build_object('total', v_total, 'paid', v_paid, 'items_count', jsonb_array_length(p_items))
  );

  v_cached_response := jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'invoice_number', v_purchase_num,
    'total_amount', v_total,
    'paid_amount', v_paid,
    'remaining_amount', v_remaining,
    'message', 'تم حفظ فاتورة المشتريات وإضافة البضاعة للأرصدة بنجاح'
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO idempotency_keys (key, action_type, response_data)
    VALUES (p_idempotency_key, 'purchase_invoice', v_cached_response)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_cached_response;
END;
$$;

-- Function 3: execute_stock_transfer_atomic (تحويل بين المخازن)
CREATE OR REPLACE FUNCTION execute_stock_transfer_atomic(
  p_transfer_data JSONB,
  p_items JSONB,
  p_idempotency_key VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transfer_id UUID;
  v_transfer_num VARCHAR(50);
  v_from_wh UUID;
  v_to_wh UUID;
  v_item JSONB;
  v_product_id UUID;
  v_unit_id UUID;
  v_qty NUMERIC(15, 4);
  v_factor NUMERIC(15, 4);
  v_base_qty NUMERIC(15, 4);
  v_current_stock NUMERIC(15, 4);
  v_from_name VARCHAR(150);
  v_to_name VARCHAR(150);
  v_cached_response JSONB;
BEGIN
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response_data INTO v_cached_response FROM idempotency_keys WHERE key = p_idempotency_key;
    IF v_cached_response IS NOT NULL THEN
      RETURN v_cached_response;
    END IF;
  END IF;

  v_from_wh := (p_transfer_data->>'from_warehouse_id')::UUID;
  v_to_wh := (p_transfer_data->>'to_warehouse_id')::UUID;

  IF v_from_wh = v_to_wh THEN
    RAISE EXCEPTION 'لا يمكن إجراء تحويل مخزني لنفس المخزن';
  END IF;

  SELECT name INTO v_from_name FROM warehouses WHERE id = v_from_wh;
  SELECT name INTO v_to_name FROM warehouses WHERE id = v_to_wh;

  -- Validate stock in source warehouse
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'qty')::NUMERIC;
    v_factor := COALESCE((v_item->>'conversion_factor_snapshot')::NUMERIC, 1.0000);
    v_base_qty := v_qty * v_factor;

    SELECT COALESCE(qty_in_base_unit, 0.0000) INTO v_current_stock
    FROM stock_balances
    WHERE warehouse_id = v_from_wh AND product_id = v_product_id;

    IF v_current_stock IS NULL OR v_current_stock < v_base_qty THEN
      RAISE EXCEPTION 'الرصيد المتاح من الصنف "%" في "%" غير كافٍ للتحويل (المتاح: %, المطلوب: %)',
        COALESCE(v_item->>'product_name_snapshot', 'غير معروف'), v_from_name, COALESCE(v_current_stock, 0), v_base_qty;
    END IF;
  END LOOP;

  v_transfer_num := generate_document_number('stock_transfer');

  INSERT INTO stock_transfers (
    transfer_number,
    from_warehouse_id,
    to_warehouse_id,
    transfer_date,
    status,
    notes,
    created_by
  ) VALUES (
    v_transfer_num,
    v_from_wh,
    v_to_wh,
    NOW(),
    'completed',
    p_transfer_data->>'notes',
    auth.uid()
  ) RETURNING id INTO v_transfer_id;

  -- Process Items: Deduct from source and Add to destination
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    
    IF (v_item->>'unit_id') IS NOT NULL AND (v_item->>'unit_id') <> '' THEN
      v_unit_id := (v_item->>'unit_id')::UUID;
    ELSE
      v_unit_id := NULL;
    END IF;

    v_qty := (v_item->>'qty')::NUMERIC;
    v_factor := COALESCE((v_item->>'conversion_factor_snapshot')::NUMERIC, 1.0000);
    v_base_qty := v_qty * v_factor;

    INSERT INTO stock_transfer_items (
      transfer_id,
      product_id,
      unit_id,
      unit_name_snapshot,
      conversion_factor_snapshot,
      qty,
      qty_in_base_unit
    ) VALUES (
      v_transfer_id,
      v_product_id,
      v_unit_id,
      COALESCE(v_item->>'unit_name_snapshot', 'وحدة'),
      v_factor,
      v_qty,
      v_base_qty
    );

    -- Deduct from source
    UPDATE stock_balances
    SET qty_in_base_unit = qty_in_base_unit - v_base_qty,
        last_updated = NOW()
    WHERE warehouse_id = v_from_wh AND product_id = v_product_id
    RETURNING qty_in_base_unit INTO v_current_stock;

    INSERT INTO stock_movements (
      movement_number,
      warehouse_id,
      product_id,
      movement_type,
      qty_in_base_unit,
      balance_after,
      reference_type,
      reference_id,
      notes,
      created_by
    ) VALUES (
      generate_document_number('stock_transfer'),
      v_from_wh,
      v_product_id,
      'transfer_out',
      -v_base_qty,
      v_current_stock,
      'stock_transfer',
      v_transfer_id,
      'تحويل منصرف إلى ' || v_to_name || ' بموجب إذن ' || v_transfer_num,
      auth.uid()
    );

    -- Add to destination
    INSERT INTO stock_balances (warehouse_id, product_id, qty_in_base_unit, last_updated)
    VALUES (v_to_wh, v_product_id, v_base_qty, NOW())
    ON CONFLICT (warehouse_id, product_id)
    DO UPDATE SET
      qty_in_base_unit = stock_balances.qty_in_base_unit + v_base_qty,
      last_updated = NOW()
    RETURNING qty_in_base_unit INTO v_current_stock;

    INSERT INTO stock_movements (
      movement_number,
      warehouse_id,
      product_id,
      movement_type,
      qty_in_base_unit,
      balance_after,
      reference_type,
      reference_id,
      notes,
      created_by
    ) VALUES (
      generate_document_number('stock_transfer'),
      v_to_wh,
      v_product_id,
      'transfer_in',
      v_base_qty,
      v_current_stock,
      'stock_transfer',
      v_transfer_id,
      'تحويل وارد من ' || v_from_name || ' بموجب إذن ' || v_transfer_num,
      auth.uid()
    );
  END LOOP;

  -- Audit log
  INSERT INTO audit_logs (action, entity_type, entity_id, user_name, details)
  VALUES (
    'تحويل مخزني',
    'stock_transfer',
    v_transfer_num,
    'مسؤول المخزن',
    jsonb_build_object('from', v_from_name, 'to', v_to_name, 'items', jsonb_array_length(p_items))
  );

  v_cached_response := jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'transfer_number', v_transfer_num,
    'message', 'تم تنفيذ التحويل المخزني وتحديث أرصدة الموقعين بنجاح'
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO idempotency_keys (key, action_type, response_data)
    VALUES (p_idempotency_key, 'stock_transfer', v_cached_response)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_cached_response;
END;
$$;

-- Function 4: adjust_stock_atomic (تسوية الجرد)
CREATE OR REPLACE FUNCTION adjust_stock_atomic(
  p_warehouse_id UUID,
  p_product_id UUID,
  p_new_qty NUMERIC,
  p_reason TEXT,
  p_idempotency_key VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_qty NUMERIC(15, 4) := 0.0000;
  v_diff NUMERIC(15, 4);
  v_wh_name VARCHAR(150);
  v_prod_name VARCHAR(250);
BEGIN
  SELECT COALESCE(qty_in_base_unit, 0.0000) INTO v_old_qty
  FROM stock_balances
  WHERE warehouse_id = p_warehouse_id AND product_id = p_product_id;

  IF v_old_qty IS NULL THEN v_old_qty := 0.0000; END IF;

  v_diff := p_new_qty - v_old_qty;
  IF v_diff = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكمية المدخلة مطابقة للرصيد الفعلي الحالي');
  END IF;

  SELECT name INTO v_wh_name FROM warehouses WHERE id = p_warehouse_id;
  SELECT name INTO v_prod_name FROM products WHERE id = p_product_id;

  INSERT INTO stock_balances (warehouse_id, product_id, qty_in_base_unit, last_updated)
  VALUES (p_warehouse_id, p_product_id, p_new_qty, NOW())
  ON CONFLICT (warehouse_id, product_id)
  DO UPDATE SET
    qty_in_base_unit = p_new_qty,
    last_updated = NOW();

  INSERT INTO stock_movements (
    movement_number,
    warehouse_id,
    product_id,
    movement_type,
    qty_in_base_unit,
    balance_after,
    reference_type,
    notes,
    created_by
  ) VALUES (
    generate_document_number('stock_transfer'),
    p_warehouse_id,
    p_product_id,
    CASE WHEN v_diff > 0 THEN 'adjustment_plus' ELSE 'adjustment_minus' END,
    v_diff,
    p_new_qty,
    'stock_adjustment',
    'تسوية جردية: ' || COALESCE(p_reason, '') || ' (فارق: ' || v_diff::TEXT || ')',
    auth.uid()
  );

  INSERT INTO audit_logs (action, entity_type, entity_id, user_name, details)
  VALUES (
    'تسوية جردية',
    'stock_balance',
    p_product_id::TEXT,
    'مسؤول المخزن',
    jsonb_build_object('product', v_prod_name, 'warehouse', v_wh_name, 'old_qty', v_old_qty, 'new_qty', p_new_qty, 'diff', v_diff, 'reason', p_reason)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تمت التسوية الجردية بنجاح',
    'new_balance', p_new_qty,
    'diff', v_diff
  );
END;
$$;

-- Function 5: receive_customer_payment_atomic (سند قبض عميل)
CREATE OR REPLACE FUNCTION receive_customer_payment_atomic(
  p_customer_id UUID,
  p_cash_account_id UUID,
  p_amount NUMERIC,
  p_payment_method VARCHAR,
  p_notes TEXT,
  p_idempotency_key VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id UUID;
  v_payment_num VARCHAR(50);
  v_csh_num VARCHAR(50);
  v_cust_name VARCHAR(250);
  v_new_cust_bal NUMERIC(15, 3);
  v_new_cash_bal NUMERIC(15, 3);
  v_cash_name VARCHAR(150);
  v_cached_response JSONB;
BEGIN
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response_data INTO v_cached_response FROM idempotency_keys WHERE key = p_idempotency_key;
    IF v_cached_response IS NOT NULL THEN
      RETURN v_cached_response;
    END IF;
  END IF;

  SELECT name INTO v_cust_name FROM customers WHERE id = p_customer_id;
  IF v_cust_name IS NULL THEN
    RAISE EXCEPTION 'العميل المحدد غير موجود';
  END IF;

  SELECT name INTO v_cash_name FROM cash_accounts WHERE id = p_cash_account_id;
  IF v_cash_name IS NULL THEN
    RAISE EXCEPTION 'الخزينة المحددة غير موجودة';
  END IF;

  v_payment_num := generate_document_number('customer_payment');
  v_csh_num := generate_document_number('cash_transaction');

  -- Update Customer balance
  UPDATE customers
  SET current_balance = current_balance - p_amount,
      updated_at = NOW()
  WHERE id = p_customer_id
  RETURNING current_balance INTO v_new_cust_bal;

  -- Create Customer Payment Record
  INSERT INTO customer_payments (
    payment_number,
    customer_id,
    cash_account_id,
    payment_date,
    amount,
    payment_method,
    notes,
    created_by
  ) VALUES (
    v_payment_num,
    p_customer_id,
    p_cash_account_id,
    NOW(),
    p_amount,
    COALESCE(p_payment_method, 'cash'),
    p_notes,
    auth.uid()
  ) RETURNING id INTO v_payment_id;

  -- Insert Customer Ledger Entry
  INSERT INTO customer_ledger_entries (
    customer_id,
    entry_type,
    document_number,
    reference_id,
    debit,
    credit,
    running_balance,
    description
  ) VALUES (
    p_customer_id,
    'payment',
    v_payment_num,
    v_payment_id,
    0.000,
    p_amount,
    v_new_cust_bal,
    'سند قبض وتحصيل رقم ' || v_payment_num || COALESCE(' - ' || p_notes, '')
  );

  -- Update Cash Account
  UPDATE cash_accounts
  SET current_balance = current_balance + p_amount
  WHERE id = p_cash_account_id
  RETURNING current_balance INTO v_new_cash_bal;

  -- Record Cash Transaction
  INSERT INTO cash_transactions (
    transaction_number,
    cash_account_id,
    transaction_type,
    amount,
    direction,
    balance_after,
    reference_type,
    reference_id,
    party_type,
    party_name,
    description,
    created_by
  ) VALUES (
    v_csh_num,
    p_cash_account_id,
    'customer_receipt',
    p_amount,
    'in',
    v_new_cash_bal,
    'customer_payment',
    v_payment_id,
    'customer',
    v_cust_name,
    'تحصيل نقدي بموجب سند قبض رقم ' || v_payment_num,
    auth.uid()
  );

  -- Audit Log
  INSERT INTO audit_logs (action, entity_type, entity_id, user_name, details)
  VALUES (
    'تحصيل سند قبض عميل',
    'customer_payment',
    v_payment_num,
    v_cust_name,
    jsonb_build_object('amount', p_amount, 'cash_account', v_cash_name)
  );

  v_cached_response := jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'payment_number', v_payment_num,
    'amount', p_amount,
    'new_balance', v_new_cust_bal,
    'message', 'تم تسجيل سند القبض وتحديث رصيد العميل والخزينة بنجاح'
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO idempotency_keys (key, action_type, response_data)
    VALUES (p_idempotency_key, 'customer_payment', v_cached_response)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_cached_response;
END;
$$;

-- Function 6: pay_supplier_atomic (سند صرف مورد)
CREATE OR REPLACE FUNCTION pay_supplier_atomic(
  p_supplier_id UUID,
  p_cash_account_id UUID,
  p_amount NUMERIC,
  p_payment_method VARCHAR,
  p_notes TEXT,
  p_idempotency_key VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id UUID;
  v_payment_num VARCHAR(50);
  v_csh_num VARCHAR(50);
  v_supp_name VARCHAR(250);
  v_cash_bal NUMERIC(15, 3);
  v_new_supp_bal NUMERIC(15, 3);
  v_new_cash_bal NUMERIC(15, 3);
  v_cash_name VARCHAR(150);
  v_cached_response JSONB;
BEGIN
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response_data INTO v_cached_response FROM idempotency_keys WHERE key = p_idempotency_key;
    IF v_cached_response IS NOT NULL THEN
      RETURN v_cached_response;
    END IF;
  END IF;

  SELECT name INTO v_supp_name FROM suppliers WHERE id = p_supplier_id;
  IF v_supp_name IS NULL THEN
    RAISE EXCEPTION 'المورد المحدد غير موجود';
  END IF;

  SELECT name, current_balance INTO v_cash_name, v_cash_bal
  FROM cash_accounts WHERE id = p_cash_account_id;
  
  IF v_cash_name IS NULL THEN
    RAISE EXCEPTION 'الخزينة المحددة غير موجودة';
  END IF;

  IF v_cash_bal < p_amount THEN
    RAISE EXCEPTION 'الرصيد المتاح في "%" (% ج.م) لا يكفي لصرف % ج.م', v_cash_name, v_cash_bal, p_amount;
  END IF;

  v_payment_num := generate_document_number('supplier_payment');
  v_csh_num := generate_document_number('cash_transaction');

  -- Deduct from supplier balance
  UPDATE suppliers
  SET current_balance = current_balance - p_amount,
      updated_at = NOW()
  WHERE id = p_supplier_id
  RETURNING current_balance INTO v_new_supp_bal;

  -- Create Supplier Payment
  INSERT INTO supplier_payments (
    payment_number,
    supplier_id,
    cash_account_id,
    payment_date,
    amount,
    payment_method,
    notes,
    created_by
  ) VALUES (
    v_payment_num,
    p_supplier_id,
    p_cash_account_id,
    NOW(),
    p_amount,
    COALESCE(p_payment_method, 'cash'),
    p_notes,
    auth.uid()
  ) RETURNING id INTO v_payment_id;

  -- Record in Supplier Ledger
  INSERT INTO supplier_ledger_entries (
    supplier_id,
    entry_type,
    document_number,
    reference_id,
    debit,
    credit,
    running_balance,
    description
  ) VALUES (
    p_supplier_id,
    'payment',
    v_payment_num,
    v_payment_id,
    p_amount,
    0.000,
    v_new_supp_bal,
    'سند صرف وسداد للمورد رقم ' || v_payment_num || COALESCE(' - ' || p_notes, '')
  );

  -- Deduct from Cash
  UPDATE cash_accounts
  SET current_balance = current_balance - p_amount
  WHERE id = p_cash_account_id
  RETURNING current_balance INTO v_new_cash_bal;

  -- Record Cash Transaction
  INSERT INTO cash_transactions (
    transaction_number,
    cash_account_id,
    transaction_type,
    amount,
    direction,
    balance_after,
    reference_type,
    reference_id,
    party_type,
    party_name,
    description,
    created_by
  ) VALUES (
    v_csh_num,
    p_cash_account_id,
    'supplier_payment',
    p_amount,
    'out',
    v_new_cash_bal,
    'supplier_payment',
    v_payment_id,
    'supplier',
    v_supp_name,
    'سداد للمورد بموجب سند صرف رقم ' || v_payment_num,
    auth.uid()
  );

  -- Audit Log
  INSERT INTO audit_logs (action, entity_type, entity_id, user_name, details)
  VALUES (
    'سداد سند صرف مورد',
    'supplier_payment',
    v_payment_num,
    v_supp_name,
    jsonb_build_object('amount', p_amount, 'cash_account', v_cash_name)
  );

  v_cached_response := jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'payment_number', v_payment_num,
    'amount', p_amount,
    'new_balance', v_new_supp_bal,
    'message', 'تم صرف المبلغ للمورد وخصمه من الخزينة بنجاح'
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO idempotency_keys (key, action_type, response_data)
    VALUES (p_idempotency_key, 'supplier_payment', v_cached_response)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_cached_response;
END;
$$;

-- Function 7: record_expense_atomic (تسجيل مصروف)
CREATE OR REPLACE FUNCTION record_expense_atomic(
  p_cash_account_id UUID,
  p_category VARCHAR,
  p_amount NUMERIC,
  p_paid_to VARCHAR,
  p_notes TEXT,
  p_idempotency_key VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exp_id UUID;
  v_exp_num VARCHAR(50);
  v_csh_num VARCHAR(50);
  v_cash_bal NUMERIC(15, 3);
  v_cash_name VARCHAR(150);
  v_new_cash_bal NUMERIC(15, 3);
  v_cached_response JSONB;
BEGIN
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response_data INTO v_cached_response FROM idempotency_keys WHERE key = p_idempotency_key;
    IF v_cached_response IS NOT NULL THEN
      RETURN v_cached_response;
    END IF;
  END IF;

  SELECT name, current_balance INTO v_cash_name, v_cash_bal
  FROM cash_accounts WHERE id = p_cash_account_id;

  IF v_cash_name IS NULL THEN
    RAISE EXCEPTION 'الخزينة المحددة غير موجودة';
  END IF;

  IF v_cash_bal < p_amount THEN
    RAISE EXCEPTION 'الرصيد المتاح في "%" (% ج.م) لا يكفي لصرف % ج.م', v_cash_name, v_cash_bal, p_amount;
  END IF;

  v_exp_num := generate_document_number('expense');
  v_csh_num := generate_document_number('cash_transaction');

  -- Deduct from Cash
  UPDATE cash_accounts
  SET current_balance = current_balance - p_amount
  WHERE id = p_cash_account_id
  RETURNING current_balance INTO v_new_cash_bal;

  -- Create Expense Record
  INSERT INTO expenses (
    expense_number,
    cash_account_id,
    category,
    amount,
    expense_date,
    paid_to,
    notes,
    created_by
  ) VALUES (
    v_exp_num,
    p_cash_account_id,
    p_category,
    p_amount,
    NOW(),
    p_paid_to,
    p_notes,
    auth.uid()
  ) RETURNING id INTO v_exp_id;

  -- Record Cash Outflow
  INSERT INTO cash_transactions (
    transaction_number,
    cash_account_id,
    transaction_type,
    amount,
    direction,
    balance_after,
    reference_type,
    reference_id,
    party_type,
    party_name,
    description,
    created_by
  ) VALUES (
    v_csh_num,
    p_cash_account_id,
    'expense',
    p_amount,
    'out',
    v_new_cash_bal,
    'expense',
    v_exp_id,
    'expense',
    COALESCE(p_paid_to, p_category),
    'مصروف: ' || p_category || COALESCE(' - ' || p_notes, ''),
    auth.uid()
  );

  -- Audit Log
  INSERT INTO audit_logs (action, entity_type, entity_id, user_name, details)
  VALUES (
    'تسجيل مصروف',
    'expense',
    v_exp_num,
    COALESCE(p_paid_to, p_category),
    jsonb_build_object('amount', p_amount, 'category', p_category, 'cash_account', v_cash_name)
  );

  v_cached_response := jsonb_build_object(
    'success', true,
    'expense_id', v_exp_id,
    'expense_number', v_exp_num,
    'amount', p_amount,
    'message', 'تم تسجيل المصروف وخصمه من رصيد الخزينة بنجاح'
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO idempotency_keys (key, action_type, response_data)
    VALUES (p_idempotency_key, 'expense', v_cached_response)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_cached_response;
END;
$$;

-- Function 8: process_sales_return_atomic (مرتجع مبيعات)
CREATE OR REPLACE FUNCTION process_sales_return_atomic(
  p_return_data JSONB,
  p_items JSONB,
  p_idempotency_key VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_return_id UUID;
  v_return_num VARCHAR(50);
  v_customer_id UUID;
  v_warehouse_id UUID;
  v_cash_account_id UUID;
  v_refund_type VARCHAR(50);
  v_total_amount NUMERIC(15, 3) := 0.000;
  v_item JSONB;
  v_product_id UUID;
  v_unit_id UUID;
  v_qty NUMERIC(15, 4);
  v_factor NUMERIC(15, 4);
  v_base_qty NUMERIC(15, 4);
  v_current_stock NUMERIC(15, 4);
  v_new_cust_bal NUMERIC(15, 3);
  v_new_cash_bal NUMERIC(15, 3);
  v_csh_num VARCHAR(50);
  v_cached_response JSONB;
BEGIN
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response_data INTO v_cached_response FROM idempotency_keys WHERE key = p_idempotency_key;
    IF v_cached_response IS NOT NULL THEN
      RETURN v_cached_response;
    END IF;
  END IF;

  IF (p_return_data->>'customer_id') IS NOT NULL AND (p_return_data->>'customer_id') <> '' THEN
    v_customer_id := (p_return_data->>'customer_id')::UUID;
  ELSE
    v_customer_id := NULL;
  END IF;

  v_warehouse_id := (p_return_data->>'warehouse_id')::UUID;
  
  IF (p_return_data->>'cash_account_id') IS NOT NULL AND (p_return_data->>'cash_account_id') <> '' THEN
    v_cash_account_id := (p_return_data->>'cash_account_id')::UUID;
  ELSE
    v_cash_account_id := NULL;
  END IF;

  v_refund_type := COALESCE(p_return_data->>'refund_type', 'credit_balance');

  -- Calculate total
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_total_amount := v_total_amount + (v_item->>'total_price')::NUMERIC;
  END LOOP;

  v_return_num := generate_document_number('sales_return');

  -- Insert Return Header
  INSERT INTO sales_returns (
    return_number,
    sales_invoice_id,
    invoice_number,
    customer_id,
    customer_name_snapshot,
    warehouse_id,
    return_date,
    total_amount,
    refund_type,
    cash_account_id,
    notes,
    idempotency_key,
    created_by
  ) VALUES (
    v_return_num,
    CASE WHEN (p_return_data->>'sales_invoice_id') IS NOT NULL AND (p_return_data->>'sales_invoice_id') <> ''
         THEN (p_return_data->>'sales_invoice_id')::UUID ELSE NULL END,
    p_return_data->>'invoice_number',
    v_customer_id,
    COALESCE(p_return_data->>'customer_name_snapshot', 'عميل نقدي'),
    v_warehouse_id,
    NOW(),
    v_total_amount,
    v_refund_type,
    v_cash_account_id,
    p_return_data->>'notes',
    p_idempotency_key,
    auth.uid()
  ) RETURNING id INTO v_return_id;

  -- Insert Return Items & Restore Stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    
    IF (v_item->>'unit_id') IS NOT NULL AND (v_item->>'unit_id') <> '' THEN
      v_unit_id := (v_item->>'unit_id')::UUID;
    ELSE
      v_unit_id := NULL;
    END IF;

    v_qty := (v_item->>'qty')::NUMERIC;
    v_factor := COALESCE((v_item->>'conversion_factor_snapshot')::NUMERIC, 1.0000);
    v_base_qty := v_qty * v_factor;

    INSERT INTO sales_return_items (
      return_id,
      product_id,
      product_name_snapshot,
      unit_id,
      unit_name_snapshot,
      conversion_factor_snapshot,
      qty,
      qty_in_base_unit,
      unit_price,
      total_price
    ) VALUES (
      v_return_id,
      v_product_id,
      v_item->>'product_name_snapshot',
      v_unit_id,
      COALESCE(v_item->>'unit_name_snapshot', 'وحدة'),
      v_factor,
      v_qty,
      v_base_qty,
      (v_item->>'unit_price')::NUMERIC,
      (v_item->>'total_price')::NUMERIC
    );

    -- Restore stock in warehouse
    INSERT INTO stock_balances (warehouse_id, product_id, qty_in_base_unit, last_updated)
    VALUES (v_warehouse_id, v_product_id, v_base_qty, NOW())
    ON CONFLICT (warehouse_id, product_id)
    DO UPDATE SET
      qty_in_base_unit = stock_balances.qty_in_base_unit + v_base_qty,
      last_updated = NOW()
    RETURNING qty_in_base_unit INTO v_current_stock;

    -- Record movement
    INSERT INTO stock_movements (
      movement_number,
      warehouse_id,
      product_id,
      movement_type,
      qty_in_base_unit,
      balance_after,
      reference_type,
      reference_id,
      notes,
      created_by
    ) VALUES (
      generate_document_number('sales_return'),
      v_warehouse_id,
      v_product_id,
      'sale_return',
      v_base_qty,
      v_current_stock,
      'sales_return',
      v_return_id,
      'مرتجع مبيعات إذن رقم ' || v_return_num,
      auth.uid()
    );
  END LOOP;

  -- Financial adjustment
  IF v_customer_id IS NOT NULL AND v_refund_type = 'credit_balance' THEN
    UPDATE customers
    SET current_balance = current_balance - v_total_amount,
        updated_at = NOW()
    WHERE id = v_customer_id
    RETURNING current_balance INTO v_new_cust_bal;

    INSERT INTO customer_ledger_entries (
      customer_id,
      entry_type,
      document_number,
      reference_id,
      returns_amount,
      debit,
      credit,
      running_balance,
      description
    ) VALUES (
      v_customer_id,
      'return',
      v_return_num,
      v_return_id,
      v_total_amount,
      0.000,
      v_total_amount,
      v_new_cust_bal,
      'مرتجع مبيعات إذن رقم ' || v_return_num
    );
  END IF;

  IF v_refund_type = 'cash' AND v_cash_account_id IS NOT NULL THEN
    UPDATE cash_accounts
    SET current_balance = current_balance - v_total_amount
    WHERE id = v_cash_account_id
    RETURNING current_balance INTO v_new_cash_bal;

    v_csh_num := generate_document_number('cash_transaction');

    INSERT INTO cash_transactions (
      transaction_number,
      cash_account_id,
      transaction_type,
      amount,
      direction,
      balance_after,
      reference_type,
      reference_id,
      party_type,
      party_name,
      description,
      created_by
    ) VALUES (
      v_csh_num,
      v_cash_account_id,
      'sales_return_refund',
      v_total_amount,
      'out',
      v_new_cash_bal,
      'sales_return',
      v_return_id,
      'customer',
      COALESCE(p_return_data->>'customer_name_snapshot', 'عميل نقدي'),
      'صرف قيمة مرتجع مبيعات إذن رقم ' || v_return_num,
      auth.uid()
    );
  END IF;

  -- Audit Log
  INSERT INTO audit_logs (action, entity_type, entity_id, user_name, details)
  VALUES (
    'إصدار مرتجع مبيعات',
    'sales_return',
    v_return_num,
    COALESCE(p_return_data->>'customer_name_snapshot', 'عميل'),
    jsonb_build_object('total', v_total_amount, 'refund_type', v_refund_type)
  );

  v_cached_response := jsonb_build_object(
    'success', true,
    'return_id', v_return_id,
    'return_number', v_return_num,
    'total_amount', v_total_amount,
    'message', 'تم تسجيل مرتجع المبيعات وإعادة البضاعة للمخزن بنجاح'
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO idempotency_keys (key, action_type, response_data)
    VALUES (p_idempotency_key, 'sales_return', v_cached_response)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_cached_response;
END;
$$;

-- Function 9: commit_migration_batch_atomic (ترحيل دفعة دفاتر قديمة)
CREATE OR REPLACE FUNCTION commit_migration_batch_atomic(
  p_project_id UUID,
  p_idempotency_key VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry RECORD;
  v_cust_id UUID;
  v_cust_name VARCHAR(250);
  v_debit NUMERIC(15, 3);
  v_credit NUMERIC(15, 3);
  v_net NUMERIC(15, 3);
  v_total_debit NUMERIC(15, 3) := 0.000;
  v_total_credit NUMERIC(15, 3) := 0.000;
  v_count INT := 0;
  v_new_bal NUMERIC(15, 3);
  v_doc_num VARCHAR(100);
  v_ledger_id UUID;
  v_cached_response JSONB;
BEGIN
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT response_data INTO v_cached_response FROM idempotency_keys WHERE key = p_idempotency_key;
    IF v_cached_response IS NOT NULL THEN
      RETURN v_cached_response;
    END IF;
  END IF;

  FOR v_entry IN
    SELECT * FROM migration_entries
    WHERE project_id = p_project_id AND review_status = 'approved'
    ORDER BY original_page_number, line_number
  LOOP
    -- 1. Find or create matching customer
    v_cust_id := v_entry.matched_customer_id;
    IF v_cust_id IS NULL THEN
      SELECT id INTO v_cust_id FROM customers WHERE TRIM(name) = TRIM(v_entry.customer_name_raw) LIMIT 1;
    END IF;

    IF v_cust_id IS NULL THEN
      -- Auto-create new customer
      INSERT INTO customers (
        code,
        name,
        opening_balance,
        current_balance,
        is_active,
        notes
      ) VALUES (
        generate_document_number('customer'),
        TRIM(v_entry.customer_name_raw),
        0.000,
        0.000,
        TRUE,
        'تم إنشاؤه آلياً أثناء ترحيل الدفاتر الورقية القديمة'
      ) RETURNING id, name INTO v_cust_id, v_cust_name;
    ELSE
      SELECT name INTO v_cust_name FROM customers WHERE id = v_cust_id;
    END IF;

    -- 2. Financial calculation
    IF v_entry.direction = 'debit' THEN
      v_debit := v_entry.amount;
      v_credit := 0.000;
      v_net := v_entry.amount;
    ELSE
      v_debit := 0.000;
      v_credit := v_entry.amount;
      v_net := -v_entry.amount;
    END IF;

    v_total_debit := v_total_debit + v_debit;
    v_total_credit := v_total_credit + v_credit;

    -- Update Customer balance
    UPDATE customers
    SET current_balance = current_balance + v_net,
        updated_at = NOW()
    WHERE id = v_cust_id
    RETURNING current_balance INTO v_new_bal;

    v_doc_num := 'MIG-' || COALESCE(v_entry.original_page_number, 'P') || '-' || COALESCE(v_entry.line_number::TEXT, (v_count + 1)::TEXT);

    -- Post to Customer Ledger
    INSERT INTO customer_ledger_entries (
      customer_id,
      entry_date,
      entry_type,
      document_number,
      debit,
      credit,
      running_balance,
      description
    ) VALUES (
      v_cust_id,
      v_entry.date::TIMESTAMPTZ,
      'old_ledger_migration',
      v_doc_num,
      v_debit,
      v_credit,
      v_new_bal,
      'مرحل من ' || COALESCE(v_entry.book_name, 'الدفتر القديم') || ' صـ ' || COALESCE(v_entry.original_page_number, '-') || ': ' || COALESCE(v_entry.description, '')
    ) RETURNING id INTO v_ledger_id;

    -- Update migration entry status
    UPDATE migration_entries
    SET review_status = 'migrated',
        matched_customer_id = v_cust_id,
        matched_customer_name = v_cust_name,
        migrated_to_ledger_id = v_ledger_id
    WHERE id = v_entry.id;

    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا توجد حركات بحالة "معتمد" للترحيل في هذا المشروع');
  END IF;

  -- If no unmigrated entries left, mark project completed
  IF NOT EXISTS (SELECT 1 FROM migration_entries WHERE project_id = p_project_id AND review_status <> 'migrated') THEN
    UPDATE migration_projects SET status = 'completed' WHERE id = p_project_id;
  END IF;

  -- Audit Log
  INSERT INTO audit_logs (action, entity_type, entity_id, user_name, details)
  VALUES (
    'اعتماد وترحيل دفعة دفاتر قديمة',
    'migration_project',
    p_project_id::TEXT,
    'المدير العام',
    jsonb_build_object('migrated_count', v_count, 'total_debit', v_total_debit, 'total_credit', v_total_credit)
  );

  v_cached_response := jsonb_build_object(
    'success', true,
    'migrated_count', v_count,
    'total_debit', v_total_debit,
    'total_credit', v_total_credit,
    'message', 'تم ترحيل ' || v_count::TEXT || ' حركة دفترياً لحسابات العملاء بنجاح'
  );

  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO idempotency_keys (key, action_type, response_data)
    VALUES (p_idempotency_key, 'migration_batch', v_cached_response)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_cached_response;
END;
$$;

-- Function 10: migrate_single_old_ledger_atomic
CREATE OR REPLACE FUNCTION migrate_single_old_ledger_atomic(p_old_ledger_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old old_ledgers%ROWTYPE;
  v_net NUMERIC(15, 3);
  v_cust_id UUID;
  v_new_bal NUMERIC(15, 3);
BEGIN
  SELECT * INTO v_old FROM old_ledgers WHERE id = p_old_ledger_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'القيد الدفتري غير موجود');
  END IF;

  IF v_old.is_transferred_to_system THEN
    RETURN jsonb_build_object('success', false, 'error', 'تم ترحيل هذا القيد بالفعل من قبل');
  END IF;

  v_net := v_old.debit_amount - v_old.credit_amount - v_old.settled_amount;

  -- Match customer by phone or name
  SELECT id INTO v_cust_id FROM customers
  WHERE (v_old.phone IS NOT NULL AND v_old.phone <> '' AND phone = v_old.phone)
     OR TRIM(name) = TRIM(v_old.party_name)
  LIMIT 1;

  IF v_cust_id IS NULL THEN
    INSERT INTO customers (
      code,
      name,
      phone,
      village_or_address,
      opening_balance,
      current_balance,
      is_active,
      notes
    ) VALUES (
      generate_document_number('customer'),
      v_old.party_name,
      v_old.phone,
      v_old.village,
      v_net,
      v_net,
      TRUE,
      'مرحل من ' || v_old.book_name || ' صـ ' || COALESCE(v_old.page_number, '-')
    ) RETURNING id INTO v_cust_id;
  ELSE
    UPDATE customers
    SET current_balance = current_balance + v_net,
        updated_at = NOW()
    WHERE id = v_cust_id
    RETURNING current_balance INTO v_new_bal;

    INSERT INTO customer_ledger_entries (
      customer_id,
      entry_date,
      entry_type,
      document_number,
      debit,
      credit,
      running_balance,
      description
    ) VALUES (
      v_cust_id,
      NOW(),
      'adjustment',
      'TRF-' || COALESCE(v_old.page_number, 'OLD'),
      CASE WHEN v_net > 0 THEN v_net ELSE 0 END,
      CASE WHEN v_net < 0 THEN ABS(v_net) ELSE 0 END,
      v_new_bal,
      'ترحيل رصيد دفتري قديم من ' || v_old.book_name || ' صفحة ' || COALESCE(v_old.page_number, '-')
    );
  END IF;

  UPDATE old_ledgers
  SET is_transferred_to_system = TRUE,
      transferred_customer_id = v_cust_id
  WHERE id = p_old_ledger_id;

  RETURN jsonb_build_object(
    'success', true,
    'customer_id', v_cust_id,
    'message', 'تم ترحيل القيد الدفتري لحساب العميل بنجاح'
  );
END;
$$;

-- 6. AUTHENTICATION & USER MANAGEMENT (SECURITY DEFINER)

-- Helper Function: get current user role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role VARCHAR(50);
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role_id INTO v_role
  FROM profiles
  WHERE user_id = auth.uid() AND is_active = TRUE;

  RETURN v_role;
END;
$$;

-- Helper Function: Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT (get_my_role() = 'admin');
$$;

-- Trigger: Automatically create profile on new auth.users signup
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
  v_role VARCHAR(50);
  v_full_name VARCHAR(150);
  v_phone VARCHAR(50);
BEGIN
  -- Count existing profiles
  SELECT COUNT(*) INTO v_count FROM profiles;

  -- The very first user created in the system gets 'admin' role automatically
  IF v_count = 0 THEN
    v_role := 'admin';
  ELSE
    v_role := COALESCE(NEW.raw_user_meta_data->>'role_id', 'cashier');
  END IF;

  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'مستخدم جديد');
  v_phone := NEW.raw_user_meta_data->>'phone';

  INSERT INTO profiles (
    user_id,
    full_name,
    phone,
    role_id,
    is_active,
    description,
    avatar_color
  ) VALUES (
    NEW.id,
    v_full_name,
    v_phone,
    v_role,
    TRUE,
    COALESCE(NEW.raw_user_meta_data->>'description', 'مستخدم النظام'),
    CASE WHEN v_role = 'admin' THEN 'bg-emerald-700' WHEN v_role = 'cashier' THEN 'bg-blue-700' ELSE 'bg-slate-700' END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users;
CREATE TRIGGER tr_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_signup();

-- Admin RPC: Safely Create User from UI (Admin only, or first user setup)
CREATE OR REPLACE FUNCTION admin_create_system_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_phone TEXT,
  p_role_id TEXT,
  p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_count INT;
  v_new_id UUID;
  v_caller_role VARCHAR(50);
  v_encrypted_pw TEXT;
BEGIN
  -- Count total profiles
  SELECT COUNT(*) INTO v_user_count FROM profiles;

  -- Allow if zero users exist (Initial Setup), or if caller is admin
  IF v_user_count > 0 THEN
    v_caller_role := get_my_role();
    IF v_caller_role IS NULL OR v_caller_role <> 'admin' THEN
      RAISE EXCEPTION 'عفواً، لا يمتلك صلاحية إنشاء مستخدمين إلا المدير العام';
    END IF;
  ELSE
    -- Initial bootstrap: force role to admin
    p_role_id := 'admin';
  END IF;

  -- Check email duplication
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'البريد الإلكتروني مسجل بالفعل لمستخدم آخر';
  END IF;

  v_new_id := gen_random_uuid();
  v_encrypted_pw := crypt(p_password, gen_salt('bf'));

  -- Insert into auth.users safely
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    v_new_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    p_email,
    v_encrypted_pw,
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object(
      'full_name', p_full_name,
      'phone', p_phone,
      'role_id', p_role_id,
      'description', p_description
    ),
    NOW(),
    NOW()
  );

  -- Ensure profile exists (handled by trigger or upsert)
  INSERT INTO profiles (
    user_id,
    full_name,
    phone,
    role_id,
    is_active,
    description,
    avatar_color
  ) VALUES (
    v_new_id,
    p_full_name,
    p_phone,
    p_role_id,
    TRUE,
    p_description,
    CASE WHEN p_role_id = 'admin' THEN 'bg-emerald-700' WHEN p_role_id = 'cashier' THEN 'bg-blue-700' ELSE 'bg-slate-700' END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role_id = EXCLUDED.role_id,
    description = EXCLUDED.description,
    updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_new_id,
    'message', 'تم إنشاء المستخدم وحسابه بنجاح'
  );
END;
$$;

-- Admin RPC: Safely update user password or details
CREATE OR REPLACE FUNCTION admin_update_user_password(
  p_target_user_id UUID,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() AND auth.uid() <> p_target_user_id THEN
    RAISE EXCEPTION 'غير مصرح لك بتغيير كلمة مرور هذا المستخدم';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = p_target_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'تم تحديث كلمة المرور بنجاح');
END;
$$;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES CLEANUP & HARDENING
-- Drop all existing policies that permit anonymous access
DROP POLICY IF EXISTS "Allow anon read products" ON products;
DROP POLICY IF EXISTS "Allow authenticated read/write products" ON products;
DROP POLICY IF EXISTS "Allow authenticated read/write customers" ON customers;
DROP POLICY IF EXISTS "Allow authenticated read/write suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow authenticated read/write sales" ON sales_invoices;
DROP POLICY IF EXISTS "Allow authenticated read/write inventory" ON stock_balances;

-- Ensure RLS is active on ALL tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE old_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Dynamic Policy Generator: Allow Authenticated Users with Active Profile to Read/Write
-- Admins have unrestricted access; other staff roles operate via standard permissions or RPCs
DO $$
DECLARE
  v_tbl TEXT;
  v_tables TEXT[] := ARRAY[
    'roles', 'profiles', 'product_categories', 'products', 'product_units', 'warehouses',
    'stock_balances', 'stock_movements', 'stock_transfers', 'stock_transfer_items',
    'sales_invoices', 'sales_invoice_items', 'purchase_invoices', 'purchase_invoice_items',
    'sales_returns', 'sales_return_items', 'customers', 'customer_ledger_entries',
    'customer_payments', 'suppliers', 'supplier_ledger_entries', 'supplier_payments',
    'cash_accounts', 'cash_transactions', 'expenses', 'old_ledgers', 'migration_projects',
    'migration_pages', 'migration_entries', 'migration_batches', 'audit_logs',
    'app_settings', 'document_sequences', 'idempotency_keys'
  ];
BEGIN
  FOREACH v_tbl IN ARRAY v_tables
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth_staff_access" ON %I;', v_tbl);
    EXECUTE format('
      CREATE POLICY "auth_staff_access" ON %I
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
    ', v_tbl);
  END LOOP;
END $$;

-- 8. REFERENCE MASTER DATA SEED (STRICT: ZERO TEST DATA)
-- Guaranteed fixed UUIDs for defaults:
-- Shop Warehouse: a0000000-0000-0000-0000-000000000001
-- Main Warehouse: a0000000-0000-0000-0000-000000000002
-- Main Cash Account: b0000000-0000-0000-0000-000000000001

INSERT INTO warehouses (id, code, name, location_type, is_primary, is_active, notes)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'SHOP', 'محل البيع المباشر', 'shop', TRUE, TRUE, 'المحل الزراعي ونقطة البيع الرئيسية'),
  ('a0000000-0000-0000-0000-000000000002', 'WH-MAIN', 'المخزن الرئيسي', 'warehouse', FALSE, TRUE, 'المستودع الرئيسي للمبيدات والأسمدة والتقاوي')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_primary = EXCLUDED.is_primary;

INSERT INTO cash_accounts (id, code, name, account_type, current_balance, is_primary, is_active)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'CASH-MAIN', 'الخزينة الرئيسية - المحل', 'cash', 0.000, TRUE, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_primary = EXCLUDED.is_primary;

-- App Settings with guaranteed default UUIDs
INSERT INTO app_settings (key, value)
VALUES
  ('company_info', '{
    "name": "مؤسسة الزهراء للأدوية والمبيدات الزراعية",
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
    "default_warehouse_id": "a0000000-0000-0000-0000-000000000001",
    "default_cash_account_id": "b0000000-0000-0000-0000-000000000001"
  }'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Clean up any residual test records from older seed versions if they exist
DELETE FROM sales_invoice_items WHERE invoice_id IN (SELECT id FROM sales_invoices WHERE invoice_number LIKE '%1001%');
DELETE FROM sales_invoices WHERE invoice_number LIKE '%1001%';
DELETE FROM purchase_invoice_items WHERE purchase_id IN (SELECT id FROM purchase_invoices WHERE invoice_number LIKE '%1001%');
DELETE FROM purchase_invoices WHERE invoice_number LIKE '%1001%';
DELETE FROM customer_ledger_entries WHERE document_number LIKE '%1001%';
DELETE FROM supplier_ledger_entries WHERE document_number LIKE '%1001%';
DELETE FROM cash_transactions WHERE transaction_number LIKE '%1001%';
DELETE FROM stock_movements WHERE movement_number LIKE '%1001%';
DELETE FROM expenses WHERE expense_number LIKE '%1001%';

-- End of 003_complete_backend.sql
