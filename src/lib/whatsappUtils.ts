import { SalesInvoice, SalesInvoiceItemBatch, CompanyInfo } from '../types/database';
import { formatCurrency, formatDateTime } from './formatters';

/**
 * Cleans phone number to international WhatsApp format (e.g. Egypt +20)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  // Remove non-digit characters
  let cleaned = phone.replace(/[^0-9]/g, '');

  // If Egyptian number starting with 01 (11 digits e.g. 01012345678)
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    cleaned = '20' + cleaned.substring(1);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  return cleaned;
}

/**
 * Generates a formatted, rich Arabic message for WhatsApp
 */
export function buildInvoiceWhatsAppMessage(
  invoice: SalesInvoice,
  company: CompanyInfo,
  batches: SalesInvoiceItemBatch[] = []
): string {
  const dateFormatted = formatDateTime(invoice.invoice_date);
  const paymentTypeArabic =
    invoice.payment_type === 'cash'
      ? 'نقدي'
      : invoice.payment_type === 'credit'
      ? 'آجل على الحساب'
      : 'سداد جزئي';

  let msg = `*🌿 ${company.name || 'الزهراء للأدوية والمبيدات الزراعية'}*\n`;
  if (company.activity) {
    msg += `_${company.activity}_\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📄 *فاتورة مبيعات رقم:* \`${invoice.invoice_number}\`\n`;
  msg += `📅 *التاريخ:* ${dateFormatted}\n`;
  msg += `👤 *العميل:* ${invoice.customer_name_snapshot || 'عميل نقدي'}\n`;
  msg += `💳 *طريقة السداد:* ${paymentTypeArabic}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🛒 *تفاصيل الأصناف والمشتريات:*\n\n`;

  invoice.items.forEach((item, index) => {
    const itemBatches = batches.filter(
      (b) =>
        b.product_id === item.product_id ||
        (item.id && b.invoice_item_id === item.id)
    );

    msg += `*${index + 1}. ${item.product_name_snapshot}*\n`;
    msg += `   • الكمية: ${item.qty} ${item.unit_name_snapshot || 'وحدة'} × ${item.unit_price.toFixed(2)} ج.م\n`;
    msg += `   • الإجمالي: *${item.total_price.toFixed(2)} ج.م*\n`;

    if (itemBatches.length > 0) {
      itemBatches.forEach((b) => {
        msg += `   🏷️ _تشغيلة: ${b.batch_number}`;
        if (b.expiry_date) {
          msg += ` | انتهاء: ${b.expiry_date}`;
        }
        msg += `_\n`;
      });
    }
    msg += `\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📊 *الملخص المالي:*\n`;
  msg += `• المجموع الفرعي: ${formatCurrency(invoice.subtotal)}\n`;

  if (invoice.discount_amount > 0) {
    msg += `• الخصم الممنوح: -${formatCurrency(invoice.discount_amount)}\n`;
  }

  if (invoice.tax_amount > 0) {
    msg += `• ضريبة القيمة المضافة: +${formatCurrency(invoice.tax_amount)}\n`;
  }

  msg += `• *إجمالي الفاتورة المطلوب:* *${formatCurrency(invoice.total_amount)}*\n`;
  msg += `• المدفوع نقداً: ${formatCurrency(invoice.paid_amount)}\n`;

  if (invoice.remaining_amount > 0) {
    msg += `• ⚠️ *المتبقي آجل على الحساب:* *${formatCurrency(invoice.remaining_amount)}*\n`;
  } else {
    msg += `• حالة الفاتورة: ✅ مسددة بالكامل\n`;
  }

  if (invoice.notes) {
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📝 *ملاحظات:* ${invoice.notes}\n`;
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  if (company.phone) {
    msg += `📞 *هاتف الصيدلية:* ${company.phone}\n`;
  }
  if (company.address) {
    msg += `📍 *العنوان:* ${company.address}\n`;
  }
  if (company.invoice_footer) {
    msg += `\n${company.invoice_footer}\n`;
  }
  msg += `\n🌱 _شكراً لتعاملكم معنا ونتمنى لكم موسماً زراعياً وفيراً ومباركاً!_`;

  return msg;
}

/**
 * Returns direct WhatsApp link
 */
export function getWhatsAppUrl(phone: string, message: string): string {
  const cleanedPhone = formatPhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(message);
  if (cleanedPhone) {
    return `https://wa.me/${cleanedPhone}?text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}
