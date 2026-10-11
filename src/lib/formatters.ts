export function formatCurrency(amount: number, currency: string = 'ج.م'): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `0.00 ${currency}`;
  }
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${currency}`;
}

export function formatQuantity(qty: number, unitName?: string): string {
  if (isNaN(qty) || qty === null || qty === undefined) {
    return '0';
  }
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 3,
  }).format(qty);
  return unitName ? `${formatted} ${unitName}` : formatted;
}

export function formatDate(dateStr: string | Date): string {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return dateStr.toString();
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(dateStr: string | Date): string {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return dateStr.toString();
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * دالة تنسيق اسم العميل بحيث يظهر الشريك بين قوسين بجوار الاسم الأساسي
 * مثال: "محمد إبراهيم (شريك: أحمد علي)" أو "محمد إبراهيم (أحمد علي)"
 */
export function formatCustomerDisplayName(customer?: { name?: string; partner_name?: string } | null): string {
  if (!customer || !customer.name) return '';
  const trimmedName = customer.name.trim();
  const trimmedPartner = customer.partner_name?.trim();
  if (trimmedPartner) {
    return `${trimmedName} (شريك: ${trimmedPartner})`;
  }
  return trimmedName;
}
