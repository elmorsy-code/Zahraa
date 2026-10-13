/**
 * طباعة أي تقرير/كشف حساب في نافذة مستقلة: بتتطبع منطقة التقرير (.invoice-print-area) بس،
 * من غير القوايم والأزرار والشاشة اللي وراها، وبنفس تنسيق الموقع (RTL + Tailwind).
 */

export interface PrintOptions {
  title?: string;
  /** 'auto' = أفقي لو الجدول عريض */
  orientation?: 'portrait' | 'landscape' | 'auto';
}

const MM = 3.7795; // px لكل مم

function isVisible(el: HTMLElement): boolean {
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

/** بيختار منطقة الطباعة الظاهرة: الأولوية للنافذة (المودال) المفتوحة فوق، وإلا كل المناطق الظاهرة في الصفحة */
export function findPrintAreas(): HTMLElement[] {
  const all = Array.from(document.querySelectorAll<HTMLElement>('.invoice-print-area')).filter(isVisible);
  if (all.length === 0) return [];
  const inModal = all.filter((el) => el.closest('.fixed.inset-0'));
  if (inModal.length > 0) {
    // آخر مودال في الصفحة هو الأعلى
    const last = inModal[inModal.length - 1].closest('.fixed.inset-0');
    return inModal.filter((el) => el.closest('.fixed.inset-0') === last);
  }
  return all;
}

function collectHeadStyles(): string {
  const parts: string[] = [];
  document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
    const href = (l as HTMLLinkElement).href;
    if (href) parts.push(`<link rel="stylesheet" href="${href.replace(/"/g, '&quot;')}">`);
  });
  document.querySelectorAll('style').forEach((s) => parts.push(`<style>${s.textContent || ''}</style>`));
  return parts.join('\n');
}

const PRINT_CSS = `
html, body { background: #fff !important; color: #000 !important; margin: 0; padding: 0; }
body { direction: rtl; font-family: var(--font-sans, 'Cairo', 'Tajawal', Tahoma, Arial, sans-serif); }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.no-print { display: none !important; }
.invoice-print-area, .print-block {
  width: 100% !important; max-width: none !important; max-height: none !important;
  overflow: visible !important; box-shadow: none !important; margin: 0 0 12px 0 !important;
  border-radius: 0 !important;
}
.overflow-x-auto, .overflow-y-auto, .overflow-auto, .overflow-hidden { overflow: visible !important; max-height: none !important; }
.sticky { position: static !important; }
table { width: 100% !important; border-collapse: collapse; }
thead { display: table-header-group; }
tr, .print-avoid-break { page-break-inside: avoid; break-inside: avoid; }
.print-title { text-align: center; font-weight: 800; font-size: 16px; margin: 0 0 8px 0; }
`;

function waitFor(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function whenReady(win: Window) {
  const doc = win.document;
  const links = Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
  await Promise.race([
    Promise.all(
      links.map(
        (l) =>
          new Promise<void>((res) => {
            if (l.sheet) return res();
            l.addEventListener('load', () => res(), { once: true });
            l.addEventListener('error', () => res(), { once: true });
          })
      )
    ),
    waitFor(3500),
  ]);
  try {
    // @ts-ignore
    if (doc.fonts && doc.fonts.ready) await Promise.race([doc.fonts.ready, waitFor(2500)]);
  } catch {}
  const imgs = Array.from(doc.images).filter((i) => !i.complete);
  if (imgs.length) {
    await Promise.race([
      Promise.all(imgs.map((i) => new Promise<void>((r) => { i.onload = () => r(); i.onerror = () => r(); }))),
      waitFor(2500),
    ]);
  }
}

/** اطبع عناصر محددة (أو منطقة الطباعة الظاهرة لو ما اتحددتش). لازم تتنده من ضغطة زرار مباشرة. */
export function printAreas(areas?: HTMLElement[], opts: PrintOptions = {}): void {
  const targets = areas && areas.length ? areas : findPrintAreas();
  if (targets.length === 0) {
    alert('مفيش حاجة للطباعة في الصفحة دي');
    return;
  }

  // أعرض عنصر محتاج كام بكسل (للتقارير العريضة)
  const contentWidth = Math.max(...targets.map((t) => Math.max(t.scrollWidth, ...Array.from(t.querySelectorAll('table')).map((tb) => (tb as HTMLElement).scrollWidth))));
  const orientation =
    opts.orientation && opts.orientation !== 'auto' ? opts.orientation : contentWidth > 760 ? 'landscape' : 'portrait';
  const availablePx = (orientation === 'landscape' ? 277 : 190) * MM; // A4 بهوامش 10مم
  const zoom = contentWidth > availablePx ? Math.max(0.35, availablePx / contentWidth) : 1;

  const bodyHtml = targets
    .map((t) => {
      const clone = t.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.no-print').forEach((n) => n.remove());
      return clone.outerHTML;
    })
    .join('\n');

  const title = opts.title || document.title || 'طباعة';
  const rootStyle = document.documentElement.getAttribute('style') || '';
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl" style="${rootStyle.replace(/"/g, '&quot;')}">
<head>
<meta charset="utf-8" />
<base href="${window.location.origin}/" />
<title>${title.replace(/</g, '&lt;')}</title>
${collectHeadStyles()}
<style>
@page { size: A4 ${orientation}; margin: 10mm; }
${PRINT_CSS}
.print-root { zoom: ${zoom.toFixed(3)}; }
</style>
</head>
<body><div class="print-root">${bodyHtml}</div></body>
</html>`;

  const run = async (win: Window, cleanup: () => void) => {
    await whenReady(win);
    try {
      win.focus();
      win.print();
    } finally {
      setTimeout(cleanup, 1500);
    }
  };

  const popup = window.open('', '_blank', 'width=1000,height=800');
  if (popup) {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    const start = () => run(popup, () => { try { popup.close(); } catch {} });
    if (popup.document.readyState === 'complete') start();
    else popup.addEventListener('load', start, { once: true });
    return;
  }

  // المتصفح منع النافذة → إطار مخفي
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;';
  document.body.appendChild(iframe);
  const idoc = iframe.contentDocument;
  const iwin = iframe.contentWindow;
  if (!idoc || !iwin) {
    iframe.remove();
    alert('تعذر فتح الطباعة. اسمح بالنوافذ المنبثقة وجرب تاني');
    return;
  }
  idoc.open();
  idoc.write(html);
  idoc.close();
  run(iwin, () => iframe.remove());
}

/** اختصار: اطبع منطقة التقرير الظاهرة حالياً */
export function printVisibleArea(opts: PrintOptions = {}): void {
  printAreas(undefined, opts);
}
