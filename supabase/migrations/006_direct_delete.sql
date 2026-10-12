-- 006: حذف مباشر للمنتجات والموردين من غير منع بسبب الارتباطات
-- الفواتير والحركات القديمة بتفضل موجودة (فيها اسم المنتج/الوحدة محفوظ جواها)، والربط بس بيتفك (NULL)

DO $$
DECLARE
  t record;
  c record;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      -- جدول,                    العمود,                  الجدول المرجعي
      ('sales_invoice_items',      'product_id',            'products'),
      ('sales_invoice_items',      'unit_id',               'product_units'),
      ('purchase_invoice_items',   'product_id',            'products'),
      ('purchase_invoice_items',   'unit_id',               'product_units'),
      ('stock_movements',          'product_id',            'products'),
      ('stock_transfer_items',     'product_id',            'products'),
      ('stock_transfer_items',     'unit_id',               'product_units'),
      ('sales_return_items',       'product_id',            'products'),
      ('sales_return_items',       'unit_id',               'product_units'),
      ('purchase_invoices',        'supplier_id',           'suppliers'),
      ('supplier_payments',        'supplier_id',           'suppliers'),
      ('old_ledgers',              'transferred_supplier_id','suppliers'),
      ('old_ledgers',              'transferred_customer_id','customers')
    ) AS v(tbl, col, ref)
  LOOP
    IF to_regclass('public.' || t.tbl) IS NULL THEN CONTINUE; END IF;

    -- امسح أي FK قديم على العمود ده
    FOR c IN
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY (con.conkey)
      WHERE con.conrelid = ('public.' || t.tbl)::regclass
        AND con.contype = 'f'
        AND a.attname = t.col
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t.tbl, c.conname);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL', t.tbl, t.col);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(id) ON DELETE SET NULL',
      t.tbl, t.tbl || '_' || t.col || '_fkey', t.col, t.ref
    );
  END LOOP;
END $$;
