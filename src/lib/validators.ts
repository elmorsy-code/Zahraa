import { z } from 'zod';

export const ProductUnitSchema = z.object({
  id: z.string().optional(),
  unit_name: z.string().min(1, 'اسم الوحدة مطلوب'),
  conversion_factor: z.number().positive('معامل التحويل يجب أن يكون أكبر من صفر'),
  sale_price: z.number().min(0, 'سعر البيع لا يمكن أن يكون سالباً'),
  purchase_price: z.number().min(0, 'سعر الشراء لا يمكن أن يكون سالباً'),
  barcode: z.string().optional(),
  is_base_unit: z.boolean().default(false),
  is_default_sale: z.boolean().optional(),
});

export const ProductSchema = z.object({
  code: z.string().min(1, 'كود الصنف مطلوب'),
  barcode: z.string().optional(),
  name: z.string().min(2, 'اسم المنتج مطلوب (حرفين على الأقل)'),
  commercial_name: z.string().optional(),
  active_ingredient: z.string().optional(),
  manufacturer: z.string().optional(),
  category_id: z.string().optional(),
  description: z.string().optional(),
  base_unit_name: z.string().min(1, 'الوحدة الأساسية مطلوبة (جرام / مل / حبة / كجم)'),
  default_purchase_price: z.number().min(0, 'سعر الشراء غير صالح'),
  default_sale_price: z.number().min(0, 'سعر البيع غير صالح'),
  min_stock_alert: z.number().min(0, 'حد التنبيه يجب ألا يكون سالباً'),
  is_pesticide: z.boolean().optional(),
  requires_prescription: z.boolean().optional(),
  is_active: z.boolean().default(true),
  units: z.array(ProductUnitSchema).min(1, 'يجب تحديد وحدة بيع واحدة على الأقل'),
});

export const CustomerSchema = z.object({
  code: z.string().min(1, 'كود العميل مطلوب'),
  name: z.string().min(2, 'اسم العميل مطلوب'),
  phone: z.string().optional(),
  village_or_address: z.string().optional(),
  national_id: z.string().optional(),
  notes: z.string().optional(),
  credit_limit: z.number().min(0).optional(),
  opening_balance: z.number().default(0),
  is_active: z.boolean().default(true),
});

export const SupplierSchema = z.object({
  code: z.string().min(1, 'كود المورد مطلوب'),
  name: z.string().min(2, 'اسم المورد مطلوب'),
  company_name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  tax_number: z.string().optional(),
  notes: z.string().optional(),
  opening_balance: z.number().default(0),
  is_active: z.boolean().default(true),
});

export const PosCartItemSchema = z.object({
  product_id: z.string().min(1, 'معرف المنتج مطلوب'),
  product_name_snapshot: z.string().min(1),
  unit_id: z.string().optional(),
  unit_name_snapshot: z.string().min(1, 'الوحدة مطلوبة'),
  conversion_factor_snapshot: z.number().positive(),
  qty: z.number().positive('الكمية يجب أن تكون أكبر من صفر'),
  qty_in_base_unit: z.number().positive(),
  unit_price: z.number().min(0),
  total_price: z.number().min(0),
});

export const SalesInvoiceInputSchema = z.object({
  customer_id: z.string().optional(),
  customer_name_snapshot: z.string().min(1, 'اسم العميل مطلوب'),
  warehouse_id: z.string().min(1, 'موقع المخزن / المحل مطلوب'),
  cash_account_id: z.string().optional(),
  invoice_date: z.string(),
  payment_type: z.enum(['cash', 'credit', 'partial']),
  subtotal: z.number().min(0),
  discount_amount: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
  total_amount: z.number().min(0),
  paid_amount: z.number().min(0),
  notes: z.string().optional(),
  items: z.array(PosCartItemSchema).min(1, 'يجب إضافة منتج واحد على الأقل للفاتورة'),
});

export const StockTransferInputSchema = z.object({
  from_warehouse_id: z.string().min(1, 'المخزن المصدر مطلوب'),
  to_warehouse_id: z.string().min(1, 'المخزن الوجهة مطلوب'),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      product_id: z.string().min(1),
      product_name: z.string().optional(),
      unit_name_snapshot: z.string(),
      conversion_factor_snapshot: z.number().positive(),
      qty: z.number().positive('الكمية المحولة يجب أن تكون أكبر من صفر'),
      qty_in_base_unit: z.number().positive(),
    })
  ).min(1, 'يجب اختيار صنف واحد على الأقل للتحويل'),
});

export const ExpenseInputSchema = z.object({
  category: z.string().min(1, 'بند المصروف مطلوب'),
  amount: z.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  cash_account_id: z.string().min(1, 'الخزينة مطلوبة'),
  paid_to: z.string().optional(),
  notes: z.string().optional(),
});

export const PaymentInputSchema = z.object({
  party_id: z.string().min(1, 'يجب تحديد الطرف'),
  amount: z.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  cash_account_id: z.string().min(1, 'الخزينة مطلوبة'),
  payment_method: z.enum(['cash', 'bank', 'wallet']),
  notes: z.string().optional(),
});
