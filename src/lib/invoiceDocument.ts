import { toBlob } from 'html-to-image';
import { SalesInvoice, SalesInvoiceItemBatch, CompanyInfo } from '../types/database';
import { formatCurrency, formatDateTime } from './formatters';
import { APP_CONFIG } from './branding';

/**
 * مستند الفاتورة الموحّد: نفس الـ HTML بيُستخدم في الطباعة (A4 أو إيصال 80مم) وفي تحويل الفاتورة لصورة للواتساب.
 * الطباعة بتتم في نافذة/إطار مستقل، فمفيش حاجة من الصفحة الرئيسية (القوايم/الأزرار) بتتطبع معاها.
 */

export type InvoicePaper = 'a4' | 'thermal';
type InvoiceVariant = InvoicePaper | 'image';

const PAPER_KEY = 'invoice_paper';

export function getSavedPaper(): InvoicePaper {
  try {
    return localStorage.getItem(PAPER_KEY) === 'thermal' ? 'thermal' : 'a4';
  } catch {
    return 'a4';
  }
}

export function savePaper(p: InvoicePaper) {
  try {
    localStorage.setItem(PAPER_KEY, p);
  } catch {}
}

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const num = (n: unknown): string => {
  const v = Number(n);
  return isNaN(v) ? '0.00' : v.toFixed(2);
};

const FONT_LINK =
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap';

function absoluteLogo(): string {
  try {
    return new URL(APP_CONFIG.logo, window.location.href).href;
  } catch {
    return APP_CONFIG.logo;
  }
}

function buildCss(variant: InvoiceVariant): string {
  const isThermal = variant === 'thermal';
  const isImage = variant === 'image';
  const width = isThermal ? '72mm' : isImage ? '520px' : '190mm';
  const base = isThermal ? 11 : isImage ? 14 : 12;
  return `
.inv-root, .inv-root * { box-sizing: border-box; }
.inv-root {
  direction: rtl; text-align: right; width: ${width}; margin: 0 auto; background: #fff; color: #0f172a;
  font-family: 'Cairo', 'Tajawal', 'Noto Sans Arabic', Tahoma, Arial, sans-serif;
  font-size: ${base}px; line-height: 1.55; padding: ${isImage ? '22px' : isThermal ? '0' : '0'};
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.inv-head { text-align: center; padding-bottom: 8px; border-bottom: 1.5px dashed #94a3b8; }
.inv-head img { height: ${isThermal ? '42px' : '60px'}; width: auto; object-fit: contain; margin-bottom: 4px; }
.inv-head h1 { margin: 0 0 2px; font-size: ${base + 5}px; font-weight: 800; }
.inv-head .act { color: #475569; font-size: ${base - 1}px; }
.inv-head .info { color: #64748b; font-size: ${base - 1}px; margin-top: 3px; }
.inv-title { text-align: center; margin: 8px 0; font-weight: 800; font-size: ${base + 2}px; color: #065f46; }
.inv-meta { display: grid; grid-template-columns: ${isThermal ? '1fr' : '1fr 1fr'}; gap: 3px 12px; padding: 6px 0 8px; border-bottom: 1.5px dashed #94a3b8; font-size: ${base}px; }
.inv-meta .k { color: #64748b; }
.inv-meta .v { font-weight: 700; }
.inv-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
.inv-table th { background: #f1f5f9; color: #334155; font-weight: 700; padding: 5px 6px; font-size: ${base - 1}px; border-bottom: 1.5px solid #cbd5e1; }
.inv-table td { padding: 5px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; font-size: ${base}px; }
.inv-table .c { text-align: center; white-space: nowrap; }
.inv-table .l { text-align: left; white-space: nowrap; direction: ltr; }
.inv-table tr { page-break-inside: avoid; }
.inv-item-name { font-weight: 700; }
.inv-sub { color: #64748b; font-size: ${base - 2}px; margin-top: 1px; }
.inv-batch { color: #475569; font-size: ${base - 2}px; }
.inv-totals { margin-top: 10px; border-top: 1.5px dashed #94a3b8; padding-top: 6px; }
.inv-row { display: flex; justify-content: space-between; gap: 10px; padding: 2px 0; }
.inv-row.big { font-weight: 800; font-size: ${base + 3}px; border-top: 1px solid #cbd5e1; margin-top: 4px; padding-top: 6px; color: #065f46; }
.inv-row.red { color: #be123c; font-weight: 700; }
.inv-row.green { color: #047857; font-weight: 700; }
.inv-row .n { direction: ltr; unicode-bidi: embed; font-variant-numeric: tabular-nums; }
.inv-badge { text-align: center; margin: 8px 0 2px; font-weight: 800; }
.inv-badge.paid { color: #047857; }
.inv-badge.due { color: #be123c; }
.inv-notes { margin-top: 8px; padding: 6px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: ${base - 1}px; }
.inv-foot { margin-top: 12px; padding-top: 8px; border-top: 1.5px dashed #94a3b8; text-align: center; color: #64748b; font-size: ${base - 1}px; }
`;
}

function buildBody(
  invoice: SalesInvoice,
  company: CompanyInfo,
  batches: SalesInvoiceItemBatch[],
  variant: InvoiceVariant
): string {
  const isThermal = variant === 'thermal';
  const pay =
    invoice.payment_type === 'cash' ? 'نقدي' : invoice.payment_type === 'credit' ? 'آجل على الحساب' : 'سداد جزئي';

  const rows = (invoice.items || [])
    .map((item, idx) => {
      const itemBatches = batches.filter(
        (b) => (!!item.id && b.invoice_item_id === item.id) || (!!item.product_id && b.product_id === item.product_id)
      );
      const batchHtml = itemBatches
        .map(
          (b) =>
            `<div class="inv-batch">تشغيلة: ${esc(b.batch_number)}${b.expiry_date ? ` | انتهاء: ${esc(b.expiry_date)}` : ''}</div>`
        )
        .join('');
      if (isThermal) {
        return `<tr>
          <td><div class="inv-item-name">${esc(item.product_name_snapshot)}</div>
              <div class="inv-sub">${esc(item.qty)} ${esc(item.unit_name_snapshot || '')} × ${num(item.unit_price)}</div>${batchHtml}</td>
          <td class="l"><b>${num(item.total_price)}</b></td>
        </tr>`;
      }
      return `<tr>
        <td class="c">${idx + 1}</td>
        <td><div class="inv-item-name">${esc(item.product_name_snapshot)}</div>${batchHtml}</td>
        <td class="c">${esc(item.unit_name_snapshot || '')}</td>
        <td class="c">${esc(item.qty)}</td>
        <td class="l">${num(item.unit_price)}</td>
        <td class="l"><b>${num(item.total_price)}</b></td>
      </tr>`;
    })
    .join('');

  const head = isThermal
    ? `<tr><th>الصنف</th><th class="l">الإجمالي</th></tr>`
    : `<tr><th class="c">#</th><th>الصنف</th><th class="c">الوحدة</th><th class="c">الكمية</th><th class="l">السعر</th><th class="l">الإجمالي</th></tr>`;

  const remaining = Number(invoice.remaining_amount) || 0;
  const infoLines = [
    company.address ? `العنوان: ${esc(company.address)}` : '',
    company.phone ? `هاتف: <span dir="ltr">${esc(company.phone)}</span>` : '',
    company.tax_card || company.commercial_reg
      ? [company.tax_card ? `ب.ض: ${esc(company.tax_card)}` : '', company.commercial_reg ? `س.ت: ${esc(company.commercial_reg)}` : '']
          .filter(Boolean)
          .join(' · ')
      : '',
  ]
    .filter(Boolean)
    .map((l) => `<div>${l}</div>`)
    .join('');

  return `
<div class="inv-root">
  <div class="inv-head">
    <img src="${esc(absoluteLogo())}" alt="" />
    <h1>${esc(company.name || APP_CONFIG.fullName)}</h1>
    ${company.activity ? `<div class="act">${esc(company.activity)}</div>` : ''}
    <div class="info">${infoLines}</div>
  </div>

  <div class="inv-title">فاتورة مبيعات</div>

  <div class="inv-meta">
    <div><span class="k">رقم الفاتورة: </span><span class="v" dir="ltr">${esc(invoice.invoice_number)}</span></div>
    <div><span class="k">التاريخ: </span><span class="v">${esc(formatDateTime(invoice.invoice_date))}</span></div>
    <div><span class="k">العميل: </span><span class="v">${esc(invoice.customer_name_snapshot || 'عميل نقدي')}</span></div>
    <div><span class="k">طريقة السداد: </span><span class="v">${pay}</span></div>
  </div>

  <table class="inv-table">
    <thead>${head}</thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="inv-totals">
    <div class="inv-row"><span>المجموع الفرعي</span><span class="n">${esc(formatCurrency(invoice.subtotal))}</span></div>
    ${invoice.discount_amount > 0 ? `<div class="inv-row red"><span>الخصم</span><span class="n">- ${esc(formatCurrency(invoice.discount_amount))}</span></div>` : ''}
    ${invoice.tax_amount > 0 ? `<div class="inv-row"><span>ضريبة القيمة المضافة</span><span class="n">+ ${esc(formatCurrency(invoice.tax_amount))}</span></div>` : ''}
    <div class="inv-row big"><span>الإجمالي</span><span class="n">${esc(formatCurrency(invoice.total_amount))}</span></div>
    <div class="inv-row green"><span>المدفوع</span><span class="n">${esc(formatCurrency(invoice.paid_amount))}</span></div>
    ${remaining > 0 ? `<div class="inv-row red"><span>المتبقي على الحساب</span><span class="n">${esc(formatCurrency(remaining))}</span></div>` : ''}
  </div>

  <div class="inv-badge ${remaining > 0 ? 'due' : 'paid'}">${remaining > 0 ? 'المتبقي آجل على حساب العميل' : '✔ مسددة بالكامل'}</div>

  ${invoice.notes ? `<div class="inv-notes"><b>ملاحظات:</b> ${esc(invoice.notes)}</div>` : ''}

  <div class="inv-foot">
    ${company.invoice_footer ? `<div>${esc(company.invoice_footer)}</div>` : ''}
    <div>شكراً لتعاملكم معنا · ${esc(APP_CONFIG.fullName)}</div>
  </div>
</div>`;
}

function buildPrintDocument(
  invoice: SalesInvoice,
  company: CompanyInfo,
  batches: SalesInvoiceItemBatch[],
  paper: InvoicePaper
): string {
  const pageRule =
    paper === 'thermal' ? '@page { size: 80mm auto; margin: 4mm; }' : '@page { size: A4; margin: 10mm; }';
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>فاتورة ${esc(invoice.invoice_number)}</title>
<link href="${FONT_LINK}" rel="stylesheet" />
<style>
${pageRule}
html, body { margin: 0; padding: 0; background: #fff; }
${buildCss(paper)}
</style>
</head>
<body>${buildBody(invoice, company, batches, paper)}</body>
</html>`;
}

function waitFor(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function whenDocReady(doc: Document) {
  const imgs = Array.from(doc.images).filter((i) => !i.complete);
  await Promise.race([
    Promise.all(
      imgs.map(
        (i) =>
          new Promise<void>((res) => {
            i.onload = () => res();
            i.onerror = () => res();
          })
      )
    ),
    waitFor(2500),
  ]);
  try {
    // @ts-ignore
    if (doc.fonts && doc.fonts.ready) await Promise.race([doc.fonts.ready, waitFor(2500)]);
  } catch {}
}

/**
 * طباعة الفاتورة (A4 أو إيصال 80مم) في نافذة مستقلة — بتتطبع الفاتورة بس.
 * لازم تتنده من ضغطة زرار مباشرة عشان المتصفح ما يمنعش النافذة.
 */
export function printInvoice(
  invoice: SalesInvoice,
  company: CompanyInfo,
  batches: SalesInvoiceItemBatch[] = [],
  paper: InvoicePaper = 'a4'
): void {
  const html = buildPrintDocument(invoice, company, batches, paper);

  const runPrint = async (win: Window, cleanup: () => void) => {
    await whenDocReady(win.document);
    try {
      win.focus();
      win.print();
    } finally {
      // نسيب وقت كفاية لشاشة الطباعة قبل التنضيف
      setTimeout(cleanup, 1500);
    }
  };

  const popup = window.open('', '_blank', 'width=900,height=800');
  if (popup) {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    const start = () => runPrint(popup, () => { try { popup.close(); } catch {} });
    if (popup.document.readyState === 'complete') start();
    else popup.addEventListener('load', start, { once: true });
    return;
  }

  // لو المتصفح منع النافذة: نطبع من إطار مخفي
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;';
  document.body.appendChild(iframe);
  const idoc = iframe.contentDocument;
  const iwin = iframe.contentWindow;
  if (!idoc || !iwin) {
    iframe.remove();
    throw new Error('تعذر فتح الطباعة. اسمح بالنوافذ المنبثقة وجرب تاني');
  }
  idoc.open();
  idoc.write(html);
  idoc.close();
  runPrint(iwin, () => iframe.remove());
}

/** تحويل الفاتورة لصورة PNG (للواتساب) */
export async function invoiceToPngBlob(
  invoice: SalesInvoice,
  company: CompanyInfo,
  batches: SalesInvoiceItemBatch[] = []
): Promise<Blob> {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;background:#fff;z-index:-1;';
  host.innerHTML = `<style>${buildCss('image')}</style>${buildBody(invoice, company, batches, 'image')}`;
  document.body.appendChild(host);
  try {
    await whenDocReady(document);
    const imgs = Array.from(host.querySelectorAll('img'));
    await Promise.race([
      Promise.all(
        imgs.map((i) => (i.complete ? Promise.resolve() : new Promise<void>((r) => { i.onload = () => r(); i.onerror = () => r(); })))
      ),
      waitFor(2500),
    ]);
    const target = host.querySelector('.inv-root') as HTMLElement;
    const opts = { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true };
    let blob: Blob | null = null;
    try {
      blob = await toBlob(target, opts);
    } catch {
      // لو تحميل الخطوط فشل نكمل بخط النظام
      blob = await toBlob(target, { ...opts, skipFonts: true });
    }
    if (!blob) throw new Error('تعذر إنشاء صورة الفاتورة');
    return blob;
  } finally {
    host.remove();
  }
}

export function invoiceImageFile(blob: Blob, invoice: SalesInvoice): File {
  const safe = String(invoice.invoice_number || 'invoice').replace(/[^A-Za-z0-9_-]+/g, '-');
  return new File([blob], `invoice-${safe}.png`, { type: 'image/png' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
