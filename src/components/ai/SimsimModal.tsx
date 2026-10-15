import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Volume2,
  VolumeX,
  RotateCcw,
  Zap,
  CheckCircle2,
  AlertCircle,
  Mic,
  MicOff,
  ChevronLeft,
} from 'lucide-react';
import { storage } from '../../lib/storage';
import {
  resolveSmartFallback,
  SIMSIM_SYSTEM_INSTRUCTION,
  buildSimsimPrompt,
  parseSimsimResponse,
} from '../../../shared/simsim';
import { authService } from '../../lib/auth';

export interface SimsimAction {
  type: 'navigate' | 'open_modal' | 'action' | 'none';
  target: string;
  label?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'simsim';
  text: string;
  timestamp: string;
  actionExecuted?: SimsimAction;
}

interface SimsimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onOpenProductModal?: () => void;
  onOpenExpenseModal?: () => void;
  onOpenCustomerModal?: () => void;
}

const QUICK_SUGGESTIONS = [
  { text: 'كشوف حسابات ومديونيات المزارعين', icon: '👥' },
  { text: 'عندي كام في الخزينة والسيولة دلوقتي؟', icon: '💰' },
  { text: 'افتح سجل فواتير المبيعات', icon: '🧾' },
  { text: 'ضيف صنف جديد للمنظومة', icon: '➕' },
  { text: 'سجل عميل جديد', icon: '👤' },
  { text: 'سجل مصروف تشغيلي للخزينة', icon: '💸' },
  { text: 'علاج الندوة المتأخرة في البطاطس', icon: '🥔' },
  { text: 'تحديث ومزامنة بيانات الموقع', icon: '🔄' },
];

export const SimsimModal: React.FC<SimsimModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenProductModal,
  onOpenExpenseModal,
  onOpenCustomerModal,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'simsim',
      text: 'أهلاً بك يا فندم! أنا "سمسم" 🤖 المساعد الذكي الخاص بيك في المنظومة. \n\nأقدر أتحكم في الموقع وأفتحلك أي شاشة، أراجع الخزينة والسيولة، كشوف حسابات وديون المزارعين، أسجل أصناف ومصروفات، أو أجاوبك على أي استشارة زراعية ومبيدات وأسمدة. اطلب مني أي حاجة وأنا في خدمتك فوراً!',
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; source?: string; model?: string }>({ configured: false });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [manualApiKey, setManualApiKey] = useState(() => {
    return (
      (typeof window !== 'undefined' && localStorage.getItem('alzahraa_gemini_api_key')) ||
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      ''
    );
  });
  const [tempKeyInput, setTempKeyInput] = useState('');
  const [keySavedToast, setKeySavedToast] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check AI status when opened
  useEffect(() => {
    if (isOpen) {
      fetch('/api/ai/status')
        .then((r) => r.json())
        .then((data) => {
          if (data && typeof data.configured === 'boolean') {
            setAiStatus(data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  // Voice speech synthesis
  const speakText = (text: string) => {
    if (!speechEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      // Clean markdown characters
      const clean = text.replace(/[*#_~`]/g, '');
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'ar-EG';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  // Voice Speech Recognition
  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('المتصفح لا يدعم الإدخال الصوتي المباشر. يمكنك الكتابة في الحقل.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-EG';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputMessage(transcript);
          handleSend(transcript);
        }
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  // Execute Action triggered by Simsim
  const executeSimsimAction = (action: SimsimAction) => {
    if (!action || action.type === 'none') return;

    if (action.type === 'navigate') {
      onNavigate(action.target);
    } else if (action.type === 'open_modal') {
      const currentUser = authService.getCurrentUser();
      if (currentUser && currentUser.role !== 'admin') {
        alert('عفواً، حساب المشرف مخصص للمتابعة والقراءة فقط ولا يمتلك صلاحية الإضافة أو التعديل.');
        return;
      }
      if (action.target === 'product' && onOpenProductModal) onOpenProductModal();
      else if (action.target === 'expense' && onOpenExpenseModal) onOpenExpenseModal();
      else if (action.target === 'customer' && onOpenCustomerModal) onOpenCustomerModal();
    } else if (action.type === 'action') {
      if (action.target === 'refresh') {
        storage.hydrate();
      }
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    // Prepare live system metrics
    const products = storage.getProducts();
    const cashAccounts = storage.getCashAccounts();
    const customers = storage.getCustomers();
    const suppliers = storage.getSuppliers();

    const totalCash = cashAccounts.reduce((s, c) => s + (c.current_balance || 0), 0);
    const totalCustomerDebt = customers.reduce((s, c) => s + Math.max(0, c.current_balance), 0);
    const totalSupplierDebt = suppliers.reduce((s, c) => s + Math.max(0, c.current_balance), 0);
    const lowStockCount = products.filter((p) => (p.stock_shop || 0) + (p.stock_warehouse || 0) <= p.min_stock_alert).length;

    const liveContext = {
      totalProducts: products.length,
      totalCash,
      totalCustomerDebt,
      totalSupplierDebt,
      lowStockCount,
    };

    let replyData: { reply: string; action?: SimsimAction } | null = null;

    // Active manual or cached client-side key
    const rawClientKey =
      manualApiKey ||
      (typeof window !== 'undefined' ? localStorage.getItem('alzahraa_gemini_api_key') : '') ||
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      '';
    const activeKey = rawClientKey ? rawClientKey.trim().replace(/^["']|["']$/g, '') : '';

    // 1. Try server endpoint (/api/ai/simsim - Cloudflare Worker / Pages Function / Express)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeKey) {
        headers['x-gemini-api-key'] = activeKey;
      }

      const res = await fetch('/api/ai/simsim', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          history: messages.slice(-5).map((m) => ({ role: m.sender, text: m.text })),
          liveContext,
        }),
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data && data.reply) {
            replyData = data;
          }
        }
      }
    } catch (err) {
      console.warn('Cloudflare /api/ai/simsim fetch attempt:', err);
    }

    // 2. Client-side direct Gemini call if server wasn't configured or returned fallback
    if (!replyData) {
      if (activeKey) {
        try {
          const promptText = buildSimsimPrompt(
            text,
            messages.slice(-5).map((m) => ({ role: m.sender, text: m.text })),
            liveContext
          );

          const candidateModels = [
            'gemini-2.5-flash',
            'gemini-3.8-flash',
            'gemini-2.0-flash',
            'gemini-1.5-flash',
          ];

          for (const model of candidateModels) {
            try {
              const directRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${activeKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    systemInstruction: { parts: [{ text: SIMSIM_SYSTEM_INSTRUCTION }] },
                    contents: [{ role: 'user', parts: [{ text: promptText }] }],
                    generationConfig: { responseMimeType: 'application/json' },
                  }),
                }
              );

              if (directRes.ok) {
                const data: any = await directRes.json();
                const parts = data?.candidates?.[0]?.content?.parts || [];
                const resText = parts.map((p: any) => p?.text || '').join('');
                if (resText) {
                  replyData = parseSimsimResponse(resText);
                  break;
                }
              }
            } catch (modelErr) {
              console.warn(`Direct Gemini attempt [${model}] failed:`, modelErr);
            }
          }
        } catch (clientErr) {
          console.warn('Direct Gemini call failed:', clientErr);
        }
      }
    }

    // 3. Fallback to smart local Egyptian expert resolver
    if (!replyData) {
      replyData = resolveSmartFallback(text, liveContext);
    }

    const replyText = replyData.reply || 'أهلاً بك يا فندم! أنا سمسم تحت أمرك.';
    const action = replyData.action as SimsimAction;

    const simsimMsg: ChatMessage = {
      id: `sim-${Date.now()}`,
      sender: 'simsim',
      text: replyText,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      actionExecuted: action && action.type !== 'none' ? action : undefined,
    };

    setMessages((prev) => [...prev, simsimMsg]);
    speakText(replyText);

    if (action && action.type !== 'none') {
      executeSimsimAction(action);
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'simsim',
        text: 'تم بدء محادثة جديدة مع سمسم 🤖! اطلب أي حاجة في الموقع أو استفسار وأنا جاهز.',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-start sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      {/* Drawer / Window Container */}
      <div className="w-full sm:max-w-lg md:max-w-xl h-[92vh] sm:h-[88vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-left duration-200 text-right">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-inner">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-emerald-900 animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  سمسم (الذكاء الاصطناعي للمنظومة)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(true)}
                  className="flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full font-bold transition-all cursor-pointer border shadow-2xs hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: aiStatus.configured || manualApiKey ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                    borderColor: aiStatus.configured || manualApiKey ? 'rgba(52, 211, 153, 0.5)' : 'rgba(251, 191, 36, 0.5)',
                    color: aiStatus.configured || manualApiKey ? '#6ee7b7' : '#fef08a',
                  }}
                  title="فحص حالة اتصال Gemini في Cloudflare"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${aiStatus.configured || manualApiKey ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                  <span>{aiStatus.configured || manualApiKey ? 'Gemini AI متصل' : 'فحص إعدادات Cloudflare'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                تحكم كامل في الموقع واستشارات زراعية فورية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Speech Toggle */}
            <button
              onClick={() => {
                const next = !speechEnabled;
                setSpeechEnabled(next);
                if (!next && 'speechSynthesis' in window) window.speechSynthesis.cancel();
              }}
              type="button"
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                speechEnabled ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title={speechEnabled ? 'تعطيل نطق الإجابات' : 'تفعيل نطق الإجابات بالصوت'}
            >
              {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Clear History */}
            <button
              onClick={handleClearHistory}
              type="button"
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="محادثة جديدة"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              type="button"
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-3.5 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/70 text-xs sm:text-sm">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 sm:gap-3 ${
                msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-black shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-slate-800 text-white'
                    : 'bg-emerald-700 text-white'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Content */}
              <div
                className={`max-w-[82%] rounded-2xl p-3 sm:p-4 shadow-2xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-slate-900 text-white rounded-tl-xs'
                    : 'bg-white border border-slate-200 text-slate-900 rounded-tr-xs'
                }`}
              >
                <div className="whitespace-pre-line font-medium text-xs sm:text-sm">
                  {msg.text}
                </div>

                {/* If Simsim executed an app action */}
                {msg.actionExecuted && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    <span>تم التنفيذ تلقائياً: {msg.actionExecuted.label || msg.actionExecuted.target}</span>
                  </div>
                )}

                <span
                  className={`block text-[10px] mt-1.5 ${
                    msg.sender === 'user' ? 'text-slate-400 text-left' : 'text-slate-400 text-right'
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2.5 text-slate-500 text-xs py-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white shrink-0 flex items-center justify-center">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-2xs flex items-center gap-2 font-bold text-emerald-800">
                <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                <span className="mr-1">سمسم يفكر وينفذ...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-2 sm:p-2.5 bg-white border-t border-slate-200 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_SUGGESTIONS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(item.text)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200 text-slate-700 font-bold text-[11px] whitespace-nowrap transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            {/* Voice Input Mic */}
            <button
              onClick={toggleListening}
              type="button"
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title={isListening ? 'جارٍ الاستماع إليك...' : 'تحدث بالصوت'}
            >
              {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            {/* Text Input */}
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="اطلب من سمسم أي حاجة (افتح شاشة، اسأل عن صنف، استشارة زراعية...)"
              className="flex-1 py-2.5 px-4 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />

            {/* Send Button */}
            <button
              onClick={() => handleSend()}
              disabled={!inputMessage.trim() || isLoading}
              type="button"
              className="p-2.5 sm:px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center shrink-0"
              title="إرسال"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5 rotate-180" />
            </button>
          </div>
        </div>
      </div>

      {/* Cloudflare & Gemini API Diagnostics & Help Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-slate-200 overflow-hidden text-right flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-emerald-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm sm:text-base">تشخيص وربط ذكاء سمسم (Cloudflare & Gemini)</h4>
                  <p className="text-[11px] text-slate-300 font-medium">دليل وحالة الاتصال بمحرك الذكاء الاصطناعي</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs font-medium text-slate-700">
              {/* Current Status Pill */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="block text-[11px] text-slate-500 font-bold mb-0.5">الحالة الحالية:</span>
                  <span className="font-black text-sm flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${aiStatus.configured || manualApiKey ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                    <span className={aiStatus.configured || manualApiKey ? 'text-emerald-800' : 'text-amber-800'}>
                      {aiStatus.configured || manualApiKey
                        ? 'مفتاح الذكاء الاصطناعي متصل وجاهز للاستخدام!'
                        : 'لم يتم تفعيل المفتاح بعد في Cloudflare'}
                    </span>
                  </span>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-200 font-mono font-bold text-slate-700">
                  {aiStatus.configured ? 'سحابي (Cloudflare)' : manualApiKey ? 'مفتاح محلي مباشر' : 'وضع ذكي محلي'}
                </span>
              </div>

              {/* Crucial Explanation for Cloudflare Pages / Workers */}
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2 text-blue-950">
                <div className="flex items-center gap-2 font-black text-xs text-blue-900">
                  <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>لماذا لم يعمل سمسم بالرغم من إضافة الـ API إلى Cloudflare؟</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed text-blue-900 font-bold pr-1">
                  <li>
                    <strong>يجب عمل إعادة نشر (Retry deployment):</strong> في Cloudflare Pages، المتغيرات الجديدة التي تضيفها لا تسري تلقائياً على الإصدار القديم المنشور، بل يلزم الذهاب إلى صفحة <code>Deployments</code> والضغط على <code>Retry deployment</code> أو نشر كود جديد.
                  </li>
                  <li>
                    <strong>تأكد من اسم المتغير تماماً:</strong> يجب أن يكون الاسم بأحد هذه الصيغ: <code>GEMINI_API_KEY</code> أو <code>GOOGLE_API_KEY</code>.
                  </li>
                  <li>
                    <strong>نوع المتغير:</strong> تأكد من إضافته تحت <code>Environment variables</code> لكل من بيئة (Production) و (Preview).
                  </li>
                </ol>
              </div>

              {/* Instant Test / Local Fallback Key Input */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                <span className="block font-black text-emerald-950 text-xs">
                  ⚡ للتجربة الفورية والتشغيل المباشر الآن:
                </span>
                <p className="text-[11px] text-emerald-900">
                  يمكنك لصق مفتاح Gemini API هنا مباشرة، وسيعمل سمسم معك فوراً في هذا المتصفح دون انتظار إعادة النشر على Cloudflare:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={tempKeyInput}
                    onChange={(e) => setTempKeyInput(e.target.value)}
                    placeholder={manualApiKey ? 'المفتاح مسجل مسبقاً (••••••••)' : 'الصق AIzaSy... هنا للتجربة'}
                    dir="ltr"
                    className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-left"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!tempKeyInput.trim()) return;
                      localStorage.setItem('alzahraa_gemini_api_key', tempKeyInput.trim());
                      setManualApiKey(tempKeyInput.trim());
                      setKeySavedToast('تم تفعيل المفتاح بنجاح! سمسم متصل الآن.');
                      setTimeout(() => setKeySavedToast(''), 4000);
                      setTempKeyInput('');
                    }}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    حفظ وتفعيل
                  </button>
                </div>
                {keySavedToast && (
                  <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5 pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{keySavedToast}</span>
                  </p>
                )}
                {manualApiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('alzahraa_gemini_api_key');
                      setManualApiKey('');
                    }}
                    className="text-[10px] text-rose-700 hover:underline font-bold cursor-pointer block"
                  >
                    إزالة المفتاح المسجل محلياً
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-5 py-2 text-xs font-black text-white bg-slate-900 hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
