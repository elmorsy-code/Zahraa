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
