import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Copy, Check, Send, Phone, User, AlertCircle, ImageDown, Download, Loader2, FileText } from 'lucide-react';
import { SalesInvoice, SalesInvoiceItemBatch } from '../../types/database';
import { storage } from '../../lib/storage';
import { buildInvoiceWhatsAppMessage, formatPhoneForWhatsApp, getWhatsAppUrl } from '../../lib/whatsappUtils';
import { invoiceToPngBlob, invoiceImageFile, downloadBlob } from '../../lib/invoiceDocument';

interface SendWhatsAppModalProps {
  invoice: SalesInvoice | null;
  onClose: () => void;
}

export const SendWhatsAppModal: React.FC<SendWhatsAppModalProps> = ({ invoice, onClose }) => {
  const settings = storage.getSettings();
  const company = settings.company_info;
  const customers = storage.getCustomers();
  const customer = invoice ? customers.find((c) => c.id === invoice.customer_id) : undefined;

  const [phone, setPhone] = useState(customer?.phone || '');
  const [copiedText, setCopiedText] = useState(false);
  const [batches, setBatches] = useState<SalesInvoiceItemBatch[]>([]);
  const [batchesReady, setBatchesReady] = useState(false);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageError, setImageError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const urlRef = useRef('');

  // تحميل التشغيلات (من الذاكرة ثم من السيرفر) قبل تجهيز الصورة
  useEffect(() => {
    if (!invoice) return;
    let alive = true;
    setBatchesReady(false);
    setBatches(storage.getSalesInvoiceBatches(invoice.id));
    storage
      .fetchSalesInvoiceBatches(invoice.id)
      .then((b) => {
        if (alive && b && b.length > 0) setBatches(b);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setBatchesReady(true);
      });
    return () => {
      alive = false;
    };
  }, [invoice?.id]);

  // تجهيز صورة الفاتورة مسبقاً عشان زرار المشاركة يشتغل فوراً (مهم للموبايل)
  useEffect(() => {
    if (!invoice || !batchesReady) return;
    let alive = true;
    setImageBlob(null);
    setImageError('');
    invoiceToPngBlob(invoice, company, batches)
      .then((blob) => {
        if (!alive) return;
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setImageBlob(blob);
        setImageUrl(url);
      })
      .catch((e) => {
        if (alive) setImageError(e?.message || 'تعذر إنشاء صورة الفاتورة');
      });
    return () => {
      alive = false;
    };
  }, [invoice?.id, batchesReady, batches]);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  if (!invoice) return null;

  const messageText = buildInvoiceWhatsAppMessage(invoice, company, batches);
  const shortText = `${company.name || ''}\nفاتورة رقم ${invoice.invoice_number}`.trim();
  const cleanedPhone = formatPhoneForWhatsApp(phone);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 6000);
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const handleDownload = () => {
    if (!imageBlob) return;
    downloadBlob(imageBlob, invoiceImageFile(imageBlob, invoice).name);
  };

  // الإرسال كصورة
  const handleSendImage = async () => {
    if (!imageBlob || busy) return;
    const file = invoiceImageFile(imageBlob, invoice);
    setBusy(true);
    try {
      // موبايل: قايمة المشاركة بتفتح واتساب والصورة جاهزة فيها
      const nav = navigator as Navigator & { canShare?: (d: any) => boolean };
      if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], text: shortText });
          return;
        } catch (e: any) {
          if (e?.name === 'AbortError') return; // المستخدم قفل القايمة
          // أي خطأ تاني → نكمل بالطريقة التانية
        }
      }

      // كمبيوتر: نفتح محادثة العميل وننسخ الصورة للحافظة (لصق Ctrl+V) ونحمّلها كاحتياطي
      const waUrl = getWhatsAppUrl(phone, shortText);
      window.open(waUrl, '_blank', 'noopener');
      let copied = false;
      try {
        // @ts-ignore
        if (navigator.clipboard && window.ClipboardItem) {
          // @ts-ignore
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': imageBlob })]);
          copied = true;
        }
      } catch {}
      if (!copied) downloadBlob(imageBlob, file.name);
      flash(
        copied
          ? 'تم نسخ صورة الفاتورة. افتح محادثة واتساب واضغط لصق (Ctrl+V) ثم إرسال.'
          : 'تم تحميل صورة الفاتورة. أرفقها في محادثة واتساب من زرار المرفقات.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#075E54] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#25D366] text-white rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">إرسال الفاتورة عبر واتساب</h3>
              <p className="text-[11px] text-emerald-100">فاتورة رقم {invoice.invoice_number}</p>
            </div>
          </div>
          <button onClick={onClose} type="button" className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-800">
          {/* Phone */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">رقم واتساب العميل (للإرسال من الكمبيوتر):</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="مثال: 01012345678"
                className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366]"
                dir="ltr"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" />
                العميل: {invoice.customer_name_snapshot}
              </span>
              {cleanedPhone ? (
                <span className="font-mono text-emerald-700 font-semibold" dir="ltr">+{cleanedPhone}</span>
              ) : (
                <span className="text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  تقدر تختار أي محادثة وقت الإرسال
                </span>
              )}
            </div>
          </div>

          {/* Image preview */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700">صورة الفاتورة:</span>
            <div className="rounded-2xl bg-[#EFEAE2] border border-[#DAD3C8] p-3 flex items-center justify-center min-h-40">
              {imageUrl && imageBlob ? (
                <img src={imageUrl} alt="صورة الفاتورة" className="max-h-80 w-auto rounded-lg shadow-sm bg-white" />
              ) : imageError ? (
                <div className="text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {imageError}
                </div>
              ) : (
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري تجهيز صورة الفاتورة...
                </div>
              )}
            </div>
          </div>

          {notice && (
            <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">{notice}</div>
          )}

          {/* Text fallback */}
          <details className="text-xs">
            <summary className="cursor-pointer font-bold text-slate-600 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              إرسال كنص بدل الصورة
            </summary>
            <div className="mt-2 space-y-2">
              <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                {messageText}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
                >
                  {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copiedText ? 'تم النسخ' : 'نسخ النص'}
                </button>
                <a
                  href={getWhatsAppUrl(phone, messageText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#25D366] hover:bg-[#1EBE5D] rounded-lg cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  إرسال النص
                </a>
              </div>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSendImage}
            disabled={!imageBlob || busy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-[#25D366] hover:bg-[#1EBE5D] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageDown className="w-4 h-4" />}
            <span>إرسال الفاتورة كصورة</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!imageBlob}
            title="تحميل الصورة"
            className="p-3 text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
