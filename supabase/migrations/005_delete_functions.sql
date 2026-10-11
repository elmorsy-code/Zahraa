-- حذف مصروف مع عكس أثره على رصيد الخزينة (للمدير فقط) — مطبّق على قاعدة Supabase
CREATE OR REPLACE FUNCTION public.delete_expense_atomic(p_expense_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_exp public.expenses%ROWTYPE;
BEGIN
  PERFORM public._require_role(ARRAY['admin']);

  SELECT * INTO v_exp FROM public.expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'المصروف غير موجود';
  END IF;

  IF v_exp.cash_account_id IS NOT NULL THEN
    UPDATE public.cash_accounts
    SET current_balance = current_balance + v_exp.amount
    WHERE id = v_exp.cash_account_id;
  END IF;

  DELETE FROM public.cash_transactions
  WHERE reference_type = 'expense' AND reference_id = p_expense_id;

  DELETE FROM public.expenses WHERE id = p_expense_id;

  PERFORM public._audit('delete', 'expense', p_expense_id::text,
    jsonb_build_object('number', v_exp.expense_number, 'amount', v_exp.amount, 'category', v_exp.category));

  RETURN jsonb_build_object('success', true);
END
$function$;

REVOKE ALL ON FUNCTION public.delete_expense_atomic(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_expense_atomic(uuid) TO authenticated;

-- حذف عميل نهائياً مع فواتيره ودفعاته ومرتجعاته، مع عكس أثرها على المخزون والتشغيلات والخزينة (للمدير فقط)
CREATE OR REPLACE FUNCTION public.delete_customer_full(p_customer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cust public.customers%ROWTYPE;
  v_inv record; v_it record; v_bt record; v_ret record; v_ri record; v_pay record;
  n_inv int := 0; n_ret int := 0; n_pay int := 0;
BEGIN
  PERFORM public._require_role(ARRAY['admin']);

  SELECT * INTO v_cust FROM public.customers WHERE id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'العميل غير موجود'; END IF;

  -- 1) فواتير البيع: إرجاع المخزون والتشغيلات وعكس المقبوض في الخزينة
  FOR v_inv IN SELECT * FROM public.sales_invoices WHERE customer_id = p_customer_id ORDER BY created_at LOOP
    FOR v_it IN SELECT * FROM public.sales_invoice_items WHERE invoice_id = v_inv.id LOOP
      PERFORM public._post_stock(v_inv.warehouse_id, v_it.product_id, v_it.qty_in_base_unit, 'sale_return',
              'sales_invoice', v_inv.id, NULL, 'عكس فاتورة ' || v_inv.invoice_number || ' عند حذف العميل', true);
    END LOOP;
    FOR v_bt IN SELECT batch_id, qty_in_base_unit FROM public.sales_invoice_item_batches WHERE invoice_id = v_inv.id LOOP
      UPDATE public.stock_batches SET qty_in_base_unit = qty_in_base_unit + v_bt.qty_in_base_unit, updated_at = now()
       WHERE id = v_bt.batch_id;
    END LOOP;
    IF COALESCE(v_inv.paid_amount,0) > 0 AND v_inv.cash_account_id IS NOT NULL THEN
      PERFORM public._post_cash(v_inv.cash_account_id, 'sales_reversal', v_inv.paid_amount, 'out', 'sales_invoice', v_inv.id,
              'customer', v_cust.name, 'عكس فاتورة ' || v_inv.invoice_number || ' عند حذف العميل');
    END IF;
    n_inv := n_inv + 1;
  END LOOP;

  -- 2) المرتجعات: عكس أثرها ثم حذفها
  FOR v_ret IN SELECT * FROM public.sales_returns WHERE customer_id = p_customer_id ORDER BY created_at LOOP
    FOR v_ri IN SELECT * FROM public.sales_return_items WHERE return_id = v_ret.id LOOP
      PERFORM public._post_stock(v_ret.warehouse_id, v_ri.product_id, -v_ri.qty_in_base_unit, 'adjustment',
              'sales_return', v_ret.id, NULL, 'عكس مرتجع ' || v_ret.return_number || ' عند حذف العميل', false);
    END LOOP;
    IF v_ret.refund_type = 'cash' AND COALESCE(v_ret.total_amount,0) > 0 AND v_ret.cash_account_id IS NOT NULL THEN
      PERFORM public._post_cash(v_ret.cash_account_id, 'sales_return_reversal', v_ret.total_amount, 'in', 'sales_return', v_ret.id,
              'customer', v_cust.name, 'عكس مرتجع ' || v_ret.return_number || ' عند حذف العميل');
    END IF;
    n_ret := n_ret + 1;
  END LOOP;
  DELETE FROM public.sales_returns WHERE customer_id = p_customer_id;

  -- 3) حذف الفواتير (البنود والتشغيلات تُحذف تلقائياً)
  DELETE FROM public.sales_invoices WHERE customer_id = p_customer_id;

  -- 4) الدفعات المحصّلة: عكسها من الخزينة ثم حذفها
  FOR v_pay IN SELECT * FROM public.customer_payments WHERE customer_id = p_customer_id ORDER BY created_at LOOP
    IF COALESCE(v_pay.amount,0) > 0 AND v_pay.cash_account_id IS NOT NULL THEN
      PERFORM public._post_cash(v_pay.cash_account_id, 'customer_receipt_reversal', v_pay.amount, 'out', 'customer_payment', v_pay.id,
              'customer', v_cust.name, 'عكس تحصيل ' || v_pay.payment_number || ' عند حذف العميل');
    END IF;
    n_pay := n_pay + 1;
  END LOOP;
  DELETE FROM public.customer_payments WHERE customer_id = p_customer_id;

  -- 5) فك الارتباطات الأخرى
  UPDATE public.old_ledgers SET transferred_customer_id = NULL WHERE transferred_customer_id = p_customer_id;
  UPDATE public.migration_entries SET matched_customer_id = NULL WHERE matched_customer_id = p_customer_id;

  -- 6) حذف العميل (كشف الحساب يُحذف تلقائياً)
  DELETE FROM public.customers WHERE id = p_customer_id;

  PERFORM public._audit('delete', 'customer', p_customer_id::text,
    jsonb_build_object('name', v_cust.name, 'code', v_cust.code, 'invoices', n_inv, 'returns', n_ret, 'payments', n_pay,
                       'balance_at_delete', v_cust.current_balance));

  RETURN jsonb_build_object('success', true, 'invoices', n_inv, 'returns', n_ret, 'payments', n_pay);
END
$function$;

REVOKE ALL ON FUNCTION public.delete_customer_full(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_customer_full(uuid) TO authenticated;
