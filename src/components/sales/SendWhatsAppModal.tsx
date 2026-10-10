import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Copy, Check, Send, Phone, User, AlertCircle, ExternalLink } from 'lucide-react';
import { SalesInvoice, SalesInvoiceItemBatch } from '../../types/database';
import { storage } from '../../lib/storage';
import { buildInvoiceWhatsAppMessage, formatPhoneForWhatsApp, getWhatsAppUrl } from '../../lib/whatsappUtils';

interface SendWhatsAppModalProps {
  invoice: SalesInvoice | null;
  onClose: () => void;
}

export const SendWhatsAppModal: React.FC<SendWhatsAppModalProps> = ({
  invoice,
  onClose,
}) => {
  if (!invoice) return null;

  const settings = storage.getSettings();
  const company = settings.company_info;
  const customers = storage.getCustomers();

  // Find associated customer to pre-fill phone
  const customer = customers.find((c) => c.id === invoice.customer_id);
  const initialPhone = customer?.phone || '';

  const [phone, setPhone] = useState(initialPhone);
  const [copied, setCopied] = useState(false);
  const [batches, setBatches] = useState<SalesInvoiceItemBatch[]>([]);

  useEffect(() => {
    // Load batches for this invoice
    const loadedBatches = storage.getSalesInvoiceBatches(invoice.id);
    setBatches(loadedBatches);

    // Try fetching in case they were updated
    storage.fetchSalesInvoiceBatches(invoice.id).then((b) => {
      if (b && b.length > 0) setBatches(b);
    }).catch(() => {});
  }, [invoice.id]);

  const messageText = buildInvoiceWhatsAppMessage(invoice, company, batches);
  const whatsappUrl = getWhatsAppUrl(phone, messageText);
  const cleanedPhone = formatPhoneForWhatsApp(phone);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-6 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#075E54] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#25D366] text-white rounded-xl shadow-xs">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">إرسال الفاتورة عبر واتساب</h3>
              <p className="text-xs text-emerald-100">
                مشاركة تفاصيل الفاتورة رقم {invoice.invoice_number} مع العميل مباشرة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-slate-800">
          {/* Recipient phone input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              رقم هاتف العميل (واتساب):
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="مثال: 01012345678 أو 011... أو +20..."
                className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366]"
                dir="ltr"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" />
                <span>العميل: {invoice.customer_name_snapshot}</span>
              </span>
              {cleanedPhone ? (
                <span className="font-mono text-emerald-700 font-semibold" dir="ltr">
                  +{cleanedPhone}
                </span>
              ) : (
                <span className="text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>يمكنك إرسالها لأي محادثة بالواتساب</span>
                </span>
              )}
            </div>
          </div>

          {/* Message Preview in WhatsApp Bubble Style */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">معاينة نص الرسالة:</span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تم النسخ للحافظة!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ النص</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#EFEAE2] border border-[#DAD3C8] relative">
              <div className="p-3.5 rounded-xl bg-white text-slate-800 shadow-xs border border-slate-200/80 text-xs font-sans leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto scrollbar-thin">
                {messageText}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            إلغاء
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copied ? 'تم النسخ' : 'نسخ النص'}</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#25D366] hover:bg-[#1EBE5D] rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>إرسال عبر واتساب</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
