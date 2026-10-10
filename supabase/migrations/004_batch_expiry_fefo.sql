-- ==============================================================================
-- 004_batch_expiry_fefo.sql
-- نظام تتبع الصلاحية والتشغيلات (Batch Numbers & Expiry Tracking with FEFO)
-- ==============================================================================

-- 1. Create Stock Batches Table (أرصدة التشغيلات وتواريخ الصلاحية بالمخازن)
CREATE TABLE IF NOT EXISTS stock_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_number VARCHAR(100) NOT NULL,
  expiry_date DATE NOT NULL,
  qty_in_base_unit NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_stock_batch_unique UNIQUE (warehouse_id, product_id, batch_number, expiry_date)
);

CREATE INDEX IF NOT EXISTS idx_stock_batches_wh_prod ON stock_batches(warehouse_id, product_id);
CREATE INDEX IF NOT EXISTS idx_stock_batches_expiry ON stock_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_stock_batches_qty ON stock_batches(qty_in_base_unit);

-- 2. Create Sales Invoice Item Batches Table (التشغيلات المسحوبة في فواتير البيع)
CREATE TABLE IF NOT EXISTS sales_invoice_item_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  invoice_item_id UUID REFERENCES sales_invoice_items(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES stock_batches(id) ON DELETE SET NULL,
  batch_number VARCHAR(100) NOT NULL,
  expiry_date DATE,
  qty_in_base_unit NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_inv_item_batches_inv ON sales_invoice_item_batches(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_inv_item_batches_item ON sales_invoice_item_batches(invoice_item_id);
CREATE INDEX IF NOT EXISTS idx_sales_inv_item_batches_prod ON sales_invoice_item_batches(product_id);

-- 3. Enable RLS and Grant Policies
ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoice_item_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_staff_access_stock_batches" ON stock_batches;
CREATE POLICY "auth_staff_access_stock_batches" ON stock_batches
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_staff_access_sales_batches" ON sales_invoice_item_batches;
CREATE POLICY "auth_staff_access_sales_batches" ON sales_invoice_item_batches
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. RPC: get_expiring_batches (إرجاع التشغيلات قرب الانتهاء أو المنتهية)
CREATE OR REPLACE FUNCTION get_expiring_batches(p_days INT DEFAULT 90)
RETURNS TABLE (
  id UUID,
  warehouse_id UUID,
  warehouse_name VARCHAR,
  warehouse_code VARCHAR,
  product_id UUID,
  product_name VARCHAR,
  product_code VARCHAR,
  is_pesticide BOOLEAN,
  batch_number VARCHAR,
  expiry_date DATE,
  days_remaining INT,
  qty_in_base_unit NUMERIC,
  base_unit_name VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.warehouse_id,
    w.name::VARCHAR AS warehouse_name,
    w.code::VARCHAR AS warehouse_code,
    b.product_id,
    p.name::VARCHAR AS product_name,
    p.code::VARCHAR AS product_code,
    COALESCE(p.is_pesticide, false) AS is_pesticide,
    b.batch_number::VARCHAR,
    b.expiry_date,
    (b.expiry_date - CURRENT_DATE)::INT AS days_remaining,
    b.qty_in_base_unit,
    p.base_unit_name::VARCHAR AS base_unit_name
  FROM stock_batches b
  JOIN warehouses w ON w.id = b.warehouse_id
  JOIN products p ON p.id = b.product_id
  WHERE b.qty_in_base_unit > 0
    AND (b.expiry_date - CURRENT_DATE) <= p_days
  ORDER BY b.expiry_date ASC, days_remaining ASC;
END;
$$;

-- 5. RPC: process_sales_invoice_atomic with FEFO & Expiry Protection
CREATE OR REPLACE FUNCTION process_sales_invoice_atomic(
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_id UUID;
  v_invoice_num VARCHAR(50);
  v_customer_id UUID;
  v_customer_name VARCHAR(250);
  v_warehouse_id UUID;
  v_cash_account_id UUID;
  v_payment_type VARCHAR(50);
  v_subtotal NUMERIC(15, 3) := 0.000;
  v_discount NUMERIC(15, 3) := 0.000;
  v_tax NUMERIC(15, 3) := 0.000;
  v_total NUMERIC(15, 3) := 0.000;
  v_paid NUMERIC(15, 3) := 0.000;
  v_remaining NUMERIC(15, 3) := 0.000;
  v_item JSONB;
  v_product_id UUID;
  v_unit_id UUID;
  v_qty NUMERIC(15, 4);
  v_factor NUMERIC(15, 4);
  v_base_qty NUMERIC(15, 4);
  v_unit_price NUMERIC(15, 3);
  v_item_total NUMERIC(15, 3);
  v_item_id UUID;
  v_current_stock NUMERIC(15, 4);
  v_allow_negative BOOLEAN := FALSE;
  v_settings JSONB;
  v_cached_response JSONB;
  v_idempotency_key VARCHAR;
  v_csh_num VARCHAR(50);
  v_new_cash_bal NUMERIC(15, 3);
  v_new_cust_bal NUMERIC(15, 3);
  v_prod_name VARCHAR(250);
  v_unit_name VARCHAR(100);
  -- Batch / FEFO variables
  v_has_batches BOOLEAN;
  v_valid_batch_stock NUMERIC(15, 4);
  v_need_qty NUMERIC(15, 4);
  v_batch RECORD;
  v_take NUMERIC(15, 4);
BEGIN
  v_idempotency_key := p_payload->>'idempotency_key';

  -- Check Idempotency
  IF v_idempotency_key IS NOT NULL AND v_idempotency_key <> '' THEN
    SELECT response_data INTO v_cached_response FROM idempotency_keys WHERE key = v_idempotency_key;
    IF v_cached_response IS NOT NULL THEN
      RETURN v_cached_response;
    END IF;
  END IF;

  -- Settings check
  SELECT value INTO v_settings FROM app_settings WHERE key = 'pos_settings';
  IF v_settings IS NOT NULL AND (v_settings->>'allow_negative_stock')::boolean IS TRUE THEN
    v_allow_negative := TRUE;
  END IF;

  v_customer_id := CASE WHEN (p_payload->>'customer_id') IS NOT NULL AND (p_payload->>'customer_id') <> ''
                        THEN (p_payload->>'customer_id')::UUID ELSE NULL END;
  v_customer_name := COALESCE(p_payload->>'customer_name', 'عميل نقدي');
  v_warehouse_id := (p_payload->>'warehouse_id')::UUID;
  v_cash_account_id := CASE WHEN (p_payload->>'cash_account_id') IS NOT NULL AND (p_payload->>'cash_account_id') <> ''
                            THEN (p_payload->>'cash_account_id')::UUID ELSE NULL END;
  v_payment_type := COALESCE(p_payload->>'payment_type', 'cash');
  v_discount := COALESCE((p_payload->>'discount_amount')::NUMERIC, 0.000);
  v_tax := COALESCE((p_payload->>'tax_amount')::NUMERIC, 0.000);
  v_paid := COALESCE((p_payload->>'paid_amount')::NUMERIC, 0.000);

  -- 1. Validate Stock & Batches FEFO for each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'qty')::NUMERIC;
    v_unit_price := (v_item->>'unit_price')::NUMERIC;

    SELECT name, base_unit_name INTO v_prod_name, v_unit_name FROM products WHERE id = v_product_id;

    -- Lookup unit conversion factor
    IF (v_item->>'unit_id') IS NOT NULL AND (v_item->>'unit_id') <> '' THEN
      SELECT conversion_factor, unit_name INTO v_factor, v_unit_name
      FROM product_units WHERE id = (v_item->>'unit_id')::UUID;
      v_factor := COALESCE(v_factor, 1.0000);
    ELSE
      v_factor := 1.0000;
    END IF;

    v_base_qty := v_qty * v_factor;
    v_item_total := v_qty * v_unit_price;
    v_subtotal := v_subtotal + v_item_total;

    -- Check overall warehouse stock balance
    SELECT COALESCE(qty_in_base_unit, 0.0000) INTO v_current_stock
    FROM stock_balances
    WHERE warehouse_id = v_warehouse_id AND product_id = v_product_id;

    IF v_current_stock IS NULL THEN v_current_stock := 0.0000; END IF;

    IF NOT v_allow_negative AND (v_current_stock < v_base_qty) THEN
      RAISE EXCEPTION 'الرصيد المتاح من الصنف "%" غير كافٍ في المخزن (المتاح: %, المطلوب: %)',
        v_prod_name, v_current_stock, v_base_qty;
    END IF;

    -- Batch and Expiry FEFO validation:
    -- Check if product has batches in this warehouse
    SELECT EXISTS (
      SELECT 1 FROM stock_batches
      WHERE warehouse_id = v_warehouse_id AND product_id = v_product_id AND qty_in_base_unit > 0
    ) INTO v_has_batches;

    IF v_has_batches THEN
      -- Sum non-expired batches only (expiry_date >= CURRENT_DATE)
      SELECT COALESCE(SUM(qty_in_base_unit), 0.0000) INTO v_valid_batch_stock
      FROM stock_batches
      WHERE warehouse_id = v_warehouse_id
        AND product_id = v_product_id
        AND expiry_date >= CURRENT_DATE
        AND qty_in_base_unit > 0;

      IF NOT v_allow_negative AND (v_valid_batch_stock < v_base_qty) THEN
        RAISE EXCEPTION 'الرصيد الصالح للبيع من الصنف "%" غير كافٍ (المتاح غير المنتهي: %, المطلوب: %). لا يمكن بيع بضاعة منتهية الصلاحية.',
          v_prod_name, v_valid_batch_stock, v_base_qty;
      END IF;
    END IF;
  END LOOP;

  v_total := GREATEST(0.000, v_subtotal - v_discount + v_tax);
  IF v_payment_type = 'cash' THEN
    v_paid := v_total;
  ELSIF v_payment_type = 'credit' THEN
    v_paid := 0.000;
  END IF;
  v_remaining := GREATEST(0.000, v_total - v_paid);

  -- Next sequence number
  v_invoice_num := generate_document_number('sales_invoice');

  -- Insert Sales Invoice Header
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
    v_customer_name,
    v_warehouse_id,
    v_cash_account_id,
    NOW(),
    v_payment_type,
    v_subtotal,
    v_discount,
    v_tax,
    v_total,
    v_paid,
    v_remaining,
    'completed',
    v_idempotency_key,
    p_payload->>'notes',
    auth.uid()
  ) RETURNING id INTO v_invoice_id;

  -- Insert Items, Update Stock & Deduct Batches using FEFO
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'qty')::NUMERIC;
    v_unit_price := (v_item->>'unit_price')::NUMERIC;

    SELECT name, base_unit_name INTO v_prod_name, v_unit_name FROM products WHERE id = v_product_id;

    IF (v_item->>'unit_id') IS NOT NULL AND (v_item->>'unit_id') <> '' THEN
      v_unit_id := (v_item->>'unit_id')::UUID;
      SELECT conversion_factor, unit_name INTO v_factor, v_unit_name
      FROM product_units WHERE id = v_unit_id;
      v_factor := COALESCE(v_factor, 1.0000);
    ELSE
      v_unit_id := NULL;
      v_factor := 1.0000;
    END IF;

    v_base_qty := v_qty * v_factor;
    v_item_total := v_qty * v_unit_price;

    -- Insert sales_invoice_items
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
      v_prod_name,
      v_unit_id,
      v_unit_name,
      v_factor,
      v_qty,
      v_base_qty,
      v_unit_price,
      v_item_total
    ) RETURNING id INTO v_item_id;

    -- Deduct from stock_balances
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

    -- FEFO Batch Deduction:
    -- First Expired First Out (oldest non-expired batch first, ignores expired batches)
    v_need_qty := v_base_qty;
    FOR v_batch IN
      SELECT *
      FROM stock_batches
      WHERE warehouse_id = v_warehouse_id
        AND product_id = v_product_id
        AND expiry_date >= CURRENT_DATE
        AND qty_in_base_unit > 0
      ORDER BY expiry_date ASC, created_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_need_qty <= 0;

      v_take := LEAST(v_batch.qty_in_base_unit, v_need_qty);

      -- Deduct from batch
      UPDATE stock_batches
      SET qty_in_base_unit = qty_in_base_unit - v_take,
          updated_at = NOW()
      WHERE id = v_batch.id;

      -- Record into sales_invoice_item_batches
      INSERT INTO sales_invoice_item_batches (
        invoice_id,
        invoice_item_id,
        product_id,
        batch_id,
        batch_number,
        expiry_date,
        qty_in_base_unit
      ) VALUES (
        v_invoice_id,
        v_item_id,
        v_product_id,
        v_batch.id,
        v_batch.batch_number,
        v_batch.expiry_date,
        v_take
      );

      v_need_qty := v_need_qty - v_take;
    END LOOP;
  END LOOP;

  -- Update Customer Ledger
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

  -- Update Cash
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
      v_customer_name,
      'تحصيل مبيعات فاتورة رقم ' || v_invoice_num,
      auth.uid()
    );
  END IF;

  v_cached_response := jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_num,
    'total_amount', v_total,
    'paid_amount', v_paid,
    'remaining_amount', v_remaining,
    'message', 'تم اعتماد الفاتورة وصرف المخزون وفقاً للأقدم صلاحية FEFO بنجاح'
  );

  IF v_idempotency_key IS NOT NULL AND v_idempotency_key <> '' THEN
    INSERT INTO idempotency_keys (key, action_type, response_data)
    VALUES (v_idempotency_key, 'sales_invoice', v_cached_response)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_cached_response;
END;
$$;

-- 6. RPC: process_purchase_atomic with Batch & Expiry Upsert
CREATE OR REPLACE FUNCTION process_purchase_atomic(
  p_payload JSONB
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
  v_subtotal NUMERIC(15, 3) := 0.000;
  v_discount NUMERIC(15, 3) := 0.000;
  v_tax NUMERIC(15, 3) := 0.000;
  v_total NUMERIC(15, 3) := 0.000;
  v_paid NUMERIC(15, 3) := 0.000;
  v_remaining NUMERIC(15, 3) := 0.000;
  v_item JSONB;
  v_product_id UUID;
  v_unit_id UUID;
  v_qty NUMERIC(15, 4);
  v_factor NUMERIC(15, 4);
  v_base_qty NUMERIC(15, 4);
  v_cost_price NUMERIC(15, 3);
  v_total_cost NUMERIC(15, 3);
  v_current_stock NUMERIC(15, 4);
  v_supplier_name VARCHAR(250);
  v_idempotency_key VARCHAR;
  v_cached_response JSONB;
  v_batch_num VARCHAR(100);
  v_expiry_date DATE;
  v_prod_name VARCHAR(250);
  v_unit_name VARCHAR(100);
  v_new_supp_bal NUMERIC(15, 3);
  v_new_cash_bal NUMERIC(15, 3);
  v_csh_num VARCHAR(50);
BEGIN
  v_idempotency_key := p_payload->>'idempotency_key';

  IF v_idempotency_key IS NOT NULL AND v_idempotency_key <> '' THEN
    SELECT response_data INTO v_cached_response FROM idempotency_keys WHERE key = v_idempotency_key;
    IF v_cached_response IS NOT NULL THEN
      RETURN v_cached_response;
    END IF;
  END IF;

  v_supplier_id := (p_payload->>'supplier_id')::UUID;
  v_warehouse_id := (p_payload->>'warehouse_id')::UUID;
  v_cash_account_id := CASE WHEN (p_payload->>'cash_account_id') IS NOT NULL AND (p_payload->>'cash_account_id') <> ''
                            THEN (p_payload->>'cash_account_id')::UUID ELSE NULL END;

  SELECT name INTO v_supplier_name FROM suppliers WHERE id = v_supplier_id;
  IF v_supplier_name IS NULL THEN
    RAISE EXCEPTION 'المورد المحدد غير مسجل بالنظام';
  END IF;

  v_payment_type := COALESCE(p_payload->>'payment_type', 'credit');
  v_discount := COALESCE((p_payload->>'discount_amount')::NUMERIC, 0.000);
  v_tax := COALESCE((p_payload->>'tax_amount')::NUMERIC, 0.000);
  v_paid := COALESCE((p_payload->>'paid_amount')::NUMERIC, 0.000);

  -- Calculate subtotal
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
  LOOP
    v_qty := (v_item->>'qty')::NUMERIC;
    v_cost_price := (v_item->>'cost_price')::NUMERIC;
    v_subtotal := v_subtotal + (v_qty * v_cost_price);
  END LOOP;

  v_total := GREATEST(0.000, v_subtotal - v_discount + v_tax);
  IF v_payment_type = 'cash' THEN
    v_paid := v_total;
  ELSIF v_payment_type = 'credit' THEN
    v_paid := 0.000;
  END IF;
  v_remaining := GREATEST(0.000, v_total - v_paid);

  v_purchase_num := generate_document_number('purchase_invoice');

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
    p_payload->>'supplier_invoice_number',
    v_supplier_id,
    v_warehouse_id,
    v_cash_account_id,
    NOW(),
    v_payment_type,
    v_subtotal,
    v_discount,
    v_tax,
    v_total,
    v_paid,
    v_remaining,
    'completed',
    p_payload->>'notes',
    auth.uid()
  ) RETURNING id INTO v_purchase_id;

  -- Insert items and update stock & batches
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'qty')::NUMERIC;
    v_cost_price := (v_item->>'cost_price')::NUMERIC;
    v_total_cost := v_qty * v_cost_price;

    SELECT name, base_unit_name INTO v_prod_name, v_unit_name FROM products WHERE id = v_product_id;

    IF (v_item->>'unit_id') IS NOT NULL AND (v_item->>'unit_id') <> '' THEN
      v_unit_id := (v_item->>'unit_id')::UUID;
      SELECT conversion_factor, unit_name INTO v_factor, v_unit_name
      FROM product_units WHERE id = v_unit_id;
      v_factor := COALESCE(v_factor, 1.0000);
    ELSE
      v_unit_id := NULL;
      v_factor := 1.0000;
    END IF;

    v_base_qty := v_qty * v_factor;
    v_batch_num := NULLIF(TRIM(v_item->>'batch_number'), '');
    v_expiry_date := CASE WHEN (v_item->>'expiry_date') IS NOT NULL AND (v_item->>'expiry_date') <> ''
                          THEN (v_item->>'expiry_date')::DATE ELSE NULL END;

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
      v_prod_name,
      v_unit_id,
      v_unit_name,
      v_factor,
      v_qty,
      v_base_qty,
      v_cost_price,
      v_total_cost,
      v_batch_num,
      v_expiry_date
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

    -- If batch number & expiry date provided, register into stock_batches
    IF v_batch_num IS NOT NULL AND v_expiry_date IS NOT NULL THEN
      INSERT INTO stock_batches (
        warehouse_id,
        product_id,
        batch_number,
        expiry_date,
        qty_in_base_unit,
        created_at,
        updated_at
      ) VALUES (
        v_warehouse_id,
        v_product_id,
        v_batch_num,
        v_expiry_date,
        v_base_qty,
        NOW(),
        NOW()
      )
      ON CONFLICT (warehouse_id, product_id, batch_number, expiry_date)
      DO UPDATE SET
        qty_in_base_unit = stock_batches.qty_in_base_unit + v_base_qty,
        updated_at = NOW();
    END IF;
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

  v_cached_response := jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'invoice_number', v_purchase_num,
    'total_amount', v_total,
    'paid_amount', v_paid,
    'remaining_amount', v_remaining,
    'message', 'تم حفظ فاتورة المشتريات وإضافة البضاعة والتشغيلات للأرصدة بنجاح'
  );

  IF v_idempotency_key IS NOT NULL AND v_idempotency_key <> '' THEN
    INSERT INTO idempotency_keys (key, action_type, response_data)
    VALUES (v_idempotency_key, 'purchase_invoice', v_cached_response)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_cached_response;
END;
$$;

-- 7. RPC: adjust_stock with Batch & Expiry support on Increase
CREATE OR REPLACE FUNCTION adjust_stock(
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_warehouse_id UUID;
  v_product_id UUID;
  v_new_qty NUMERIC(15, 4);
  v_delta NUMERIC(15, 4);
  v_reason TEXT;
  v_batch_num VARCHAR(100);
  v_expiry_date DATE;
  v_old_qty NUMERIC(15, 4) := 0.0000;
  v_wh_name VARCHAR(150);
  v_prod_name VARCHAR(250);
BEGIN
  v_warehouse_id := (p_payload->>'warehouse_id')::UUID;
  v_product_id := (p_payload->>'product_id')::UUID;
  v_new_qty := (p_payload->>'new_qty')::NUMERIC;
  v_reason := COALESCE(p_payload->>'reason', 'تسوية جردية فعلية');
  v_batch_num := NULLIF(TRIM(p_payload->>'batch_number'), '');
  v_expiry_date := CASE WHEN (p_payload->>'expiry_date') IS NOT NULL AND (p_payload->>'expiry_date') <> ''
                        THEN (p_payload->>'expiry_date')::DATE ELSE NULL END;

  SELECT COALESCE(qty_in_base_unit, 0.0000) INTO v_old_qty
  FROM stock_balances
  WHERE warehouse_id = v_warehouse_id AND product_id = v_product_id;

  IF v_old_qty IS NULL THEN v_old_qty := 0.0000; END IF;

  v_delta := v_new_qty - v_old_qty;
  IF v_delta = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكمية المدخلة مطابقة للرصيد الفعلي الحالي');
  END IF;

  SELECT name INTO v_wh_name FROM warehouses WHERE id = v_warehouse_id;
  SELECT name INTO v_prod_name FROM products WHERE id = v_product_id;

  -- Update overall stock balance
  INSERT INTO stock_balances (warehouse_id, product_id, qty_in_base_unit, last_updated)
  VALUES (v_warehouse_id, v_product_id, v_new_qty, NOW())
  ON CONFLICT (warehouse_id, product_id)
  DO UPDATE SET
    qty_in_base_unit = v_new_qty,
    last_updated = NOW();

  -- Record movement
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
    v_warehouse_id,
    v_product_id,
    CASE WHEN v_delta > 0 THEN 'adjustment_plus' ELSE 'adjustment_minus' END,
    v_delta,
    v_new_qty,
    'stock_adjustment',
    'تسوية جردية: ' || v_reason || ' (فارق: ' || v_delta::TEXT || ')',
    auth.uid()
  );

  -- When surplus / increase (delta > 0) and batch number provided, register into stock_batches
  IF v_delta > 0 AND v_batch_num IS NOT NULL AND v_expiry_date IS NOT NULL THEN
    INSERT INTO stock_batches (
      warehouse_id,
      product_id,
      batch_number,
      expiry_date,
      qty_in_base_unit,
      created_at,
      updated_at
    ) VALUES (
      v_warehouse_id,
      v_product_id,
      v_batch_num,
      v_expiry_date,
      v_delta,
      NOW(),
      NOW()
    )
    ON CONFLICT (warehouse_id, product_id, batch_number, expiry_date)
    DO UPDATE SET
      qty_in_base_unit = stock_batches.qty_in_base_unit + v_delta,
      updated_at = NOW();
  END IF;

  INSERT INTO audit_logs (action, entity_type, entity_id, user_name, details)
  VALUES (
    'تسوية جردية',
    'stock_balance',
    v_product_id::TEXT,
    'مسؤول المخزن',
    jsonb_build_object(
      'product', v_prod_name,
      'warehouse', v_wh_name,
      'old_qty', v_old_qty,
      'new_qty', v_new_qty,
      'diff', v_delta,
      'batch_number', v_batch_num,
      'expiry_date', v_expiry_date,
      'reason', v_reason
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تمت التسوية الجردية وتحديث الرصيد والتشغيلة بنجاح',
    'new_balance', v_new_qty,
    'diff', v_delta
  );
END;
$$;
