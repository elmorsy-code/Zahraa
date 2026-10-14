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
import { resolveSmartFallback } from '../../../shared/simsim';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

    try {
      const res = await fetch('/api/ai/simsim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-5).map((m) => ({ role: m.sender, text: m.text })),
          liveContext,
        }),
      });

      if (!res.ok) {
        throw new Error('فشل الاتصال بسمسم');
      }

      const data = await res.json();
      const replyText = data.reply || 'أهلاً بك يا فندم! أنا سمسم تحت أمرك.';
      const action = data.action as SimsimAction;

      const simsimMsg: ChatMessage = {
        id: `sim-${Date.now()}`,
        sender: 'simsim',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        actionExecuted: action && action.type !== 'none' ? action : undefined,
      };

      setMessages((prev) => [...prev, simsimMsg]);
      speakText(replyText);

      // Execute live action
      if (action && action.type !== 'none') {
        executeSimsimAction(action);
      }
    } catch {
      // Seamless intelligent fallback for Cloudflare Pages, static hosting, or network drops
      try {
        const fallback = resolveSmartFallback(text, liveContext);
        const replyText = fallback.reply || 'أهلاً بك يا فندم! أنا سمسم المساعد الذكي تحت أمرك.';
        const action = fallback.action as SimsimAction;

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
      } catch {
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          sender: 'simsim',
          text: 'عفواً يا فندم، حصل ضغط لحظي في الاتصال. لكن أنا شغال وتحت أمرك، جرب تسألني تاني!',
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } finally {
      setIsLoading(false);
    }
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
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full font-bold border border-emerald-400/30">
                  متجاوب نشط
                </span>
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
    </div>
  );
};
