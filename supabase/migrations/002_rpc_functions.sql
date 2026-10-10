-- ==============================================================================
-- 002_rpc_functions.sql
-- Atomic Transactions & Row Level Security (RLS) Policies
-- ==============================================================================

-- Function 1: Atomic Sales Invoice Creation
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
  v_seq BIGINT;
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
BEGIN
  -- 1. Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM idempotency_keys WHERE key = p_idempotency_key) THEN
      SELECT response_data INTO v_settings FROM idempotency_keys WHERE key = p_idempotency_key;
      RETURN v_settings;
    END IF;
  END IF;

  -- Read pos settings
  SELECT value INTO v_settings FROM app_settings WHERE key = 'pos_settings';
  IF v_settings IS NOT NULL AND (v_settings->>'allow_negative_stock')::boolean IS TRUE THEN
    v_allow_negative := TRUE;
  END IF;

  -- 2. Extract invoice parameters
  v_customer_id := (p_invoice_data->>'customer_id')::UUID;
  v_warehouse_id := (p_invoice_data->>'warehouse_id')::UUID;
  v_cash_account_id := (p_invoice_data->>'cash_account_id')::UUID;
  v_payment_type := p_invoice_data->>'payment_type';
  v_subtotal := (p_invoice_data->>'subtotal')::NUMERIC;
  v_discount := COALESCE((p_invoice_data->>'discount_amount')::NUMERIC, 0.000);
  v_tax := COALESCE((p_invoice_data->>'tax_amount')::NUMERIC, 0.000);
  v_total := (p_invoice_data->>'total_amount')::NUMERIC;
  v_paid := COALESCE((p_invoice_data->>'paid_amount')::NUMERIC, 0.000);
  v_remaining := v_total - v_paid;

  -- Next invoice number from sequence
  UPDATE document_sequences
  SET current_number = current_number + 1
  WHERE sequence_type = 'sales_invoice'
  RETURNING current_number INTO v_seq;

  v_invoice_num := 'INV-' || v_seq::TEXT;

  -- 3. Pre-validate stock for all items
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
      RAISE EXCEPTION 'رصيد المنتج غير كافٍ في المخزن المحدد (المتاح: %, المطلوب: %)', v_current_stock, v_base_qty;
    END IF;
  END LOOP;

  -- 4. Create Invoice
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
    notes
  ) VALUES (
    v_invoice_num,
    v_customer_id,
    p_invoice_data->>'customer_name_snapshot',
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
    p_invoice_data->>'notes'
  ) RETURNING id INTO v_invoice_id;

  -- 5. Insert Items, Update stock_balances & Record stock_movements
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_unit_id := (v_item->>'unit_id')::UUID;
    v_qty := (v_item->>'qty')::NUMERIC;
    v_factor := COALESCE((v_item->>'conversion_factor_snapshot')::NUMERIC, 1.0000);
    v_base_qty := v_qty * v_factor;

    -- Insert item
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
      v_item->>'unit_name_snapshot',
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
      notes
    ) VALUES (
      'MOV-' || gen_random_uuid()::TEXT,
      v_warehouse_id,
      v_product_id,
      'sale',
      -v_base_qty,
      v_current_stock,
      'sales_invoice',
      v_invoice_id,
      'صرف مبيعات فاتورة رقم ' || v_invoice_num
    );
  END LOOP;

  -- 6. Customer ledger & Balance handling
  IF v_customer_id IS NOT NULL THEN
    -- Debit customer for full invoice amount
    UPDATE customers
    SET current_balance = current_balance + v_remaining,
        updated_at = NOW()
    WHERE id = v_customer_id;

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
      v_customer_id,
      'invoice',
      v_invoice_num,
      v_invoice_id,
      v_total,
      v_paid,
      (SELECT current_balance FROM customers WHERE id = v_customer_id),
      'فاتورة مبيعات رقم ' || v_invoice_num
    );
  END IF;

  -- 7. Cash handling if paid > 0
  IF v_paid > 0 AND v_cash_account_id IS NOT NULL THEN
    UPDATE cash_accounts
    SET current_balance = current_balance + v_paid
    WHERE id = v_cash_account_id;

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
      description
    ) VALUES (
      'CSH-' || gen_random_uuid()::TEXT,
      v_cash_account_id,
      'sales_inflow',
      v_paid,
      'in',
      (SELECT current_balance FROM cash_accounts WHERE id = v_cash_account_id),
      'sales_invoice',
      v_invoice_id,
      'customer',
      p_invoice_data->>'customer_name_snapshot',
      'تحصيل مبيعات فاتورة رقم ' || v_invoice_num
    );
  END IF;

  -- 8. Save Idempotency response
  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO idempotency_keys (key, action_type, response_data)
    VALUES (
      p_idempotency_key,
      'sales_invoice',
      jsonb_build_object('success', true, 'invoice_id', v_invoice_id, 'invoice_number', v_invoice_num)
    ) ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_num,
    'message', 'تم حفظ واعتماد الفاتورة وتحديث الأرصدة بنجاح'
  );
END;
$$;

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE old_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to perform operations
DO $$
BEGIN
  -- Safe creation of basic permissive policies for authenticated staff
  EXECUTE 'CREATE POLICY "Allow authenticated read/write products" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY "Allow anon read products" ON products FOR SELECT TO anon USING (true)';
  EXECUTE 'CREATE POLICY "Allow authenticated read/write customers" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY "Allow authenticated read/write suppliers" ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY "Allow authenticated read/write sales" ON sales_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY "Allow authenticated read/write inventory" ON stock_balances FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN duplicate_object THEN
  -- Policies already created
  NULL;
END $$;
