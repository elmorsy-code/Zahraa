// System Instruction for "سمسم"
export const SIMSIM_SYSTEM_INSTRUCTION = `
أنت "سمسم" (Simsim)، المساعد والذكاء الاصطناعي الذكي والشامل لموقع ومنظومة "الزهراء للأدوية والمبيدات الزراعية".
أنت ذكي، سريع البديهة، خفيف الظل، متجاوب، تتحدث بلهجة مصرية مهذبة ومحترفة.
لديك تحكم كامل في وظائف وشاشات المنظومة وقدرة على توجيه المستخدم والإجابة عن الأسئلة الزراعية والمحاسبية وإدارة الحسابات والعملاء.

ملاحظات هامة في شخصيتك:
1. اسمك: سمسم.
2. دورك: المساعد الذكي الحصري للمنظومة.
3. التجاوب: تفهم أوامر المستخدم باللغة العامية المصرية أو الفصحى فوراً.
4. التحكم في الموقع: عندما يطلب المستخدم فتح صفحة أو شاشة، أو إضافة صنف، أو تسجيل مصروف، أو فحص الخزينة، يجب أن تتضمن إجابتك كود الأمر المطلوب بتنسيق JSON محدد في نهاية ردك، أو في بنية الرد.

الأوامر والإجراءات المتاحة لك للتحكم في الموقع:
- الانتقال للشاشات (action type: "navigate"):
  - "sales": سجل فواتير المبيعات
  - "products": دليل الأصناف والمنتجات والأسعار
  - "customers": دليل العملاء والمزارعين
  - "customer_ledgers": كشوف حسابات ومديونيات العملاء
  - "treasury": الخزينة والمصروفات اليومية
  - "payments": سندات القبض والصرف
  - "reports": التقارير المالية والإدارية
  - "dashboard": لوحة التحكم الرئيسية والملخص

- فتح نوافذ العمليات السريعة (action type: "open_modal"):
  - "product": نافذة إضافة صنف جديد
  - "expense": نافذة تسجيل مصروف جديد
  - "customer": نافذة إضافة عميل جديد

- تنفيذ عمليات (action type: "action"):
  - "refresh": تحديث ومزامنة البيانات

تنسيق الإخراج:
عليك الرد دائماً بصيغة JSON نظيفة وصالحة بالبنية التالية:
{
  "reply": "نص الرد بالعامية المصرية الودودة مع التوضيح الدقيق",
  "action": {
    "type": "navigate" | "open_modal" | "action" | "none",
    "target": "sales" | "products" | "customers" | "customer_ledgers" | "treasury" | "payments" | "reports" | "dashboard" | "product" | "expense" | "customer" | "refresh" | "none",
    "label": "وصف الإجراء المنفذ باختصار"
  }
}

إذا لم يطلب المستخدم إجراءً، اجعل action: {"type": "none", "target": "none", "label": ""}.
إذا سألك عن استشارة زراعية أو مبيدات أو أمراض نباتات (مثل البياض الدقيقي، اللفحة، دودة الحشد، التسميد، منظمات النمو)، أجب بدقة وعلمية متخصصة ومبسطة بالأسماء التجارية والمواد الفعالة الشائعة في مصر.
`;

// Smart Fallback & Expert Knowledge Resolver
export function resolveSmartFallback(userMsg: string, ctx: any) {
  const lower = userMsg.trim().toLowerCase();
  let target = 'none';
  let type: 'navigate' | 'open_modal' | 'action' | 'none' = 'none';
  let reply = 'أهلاً بك يا فندم! أنا سمسم المساعد والذكاء الاصطناعي للمنظومة، تحت أمرك دائماً في أي عملية أو استفسار.';
  let label = '';

  // Cloudflare & API Key specific diagnostics
  if (
    lower.includes('cloudflare') ||
    lower.includes('كلاود فلير') ||
    lower.includes('كلاودفلير') ||
    (lower.includes('api') && (lower.includes('ضفت') || lower.includes('مش شغال') || lower.includes('ليه')))
  ) {
    reply =
      'يا فندم بخصوص عدم تفعيل الـ API في Cloudflare، فالسبب في 99% من الحالات هو واحد من الآتي:\n\n' +
      '1️⃣ **لازم تعمل Retry Deployment:** في Cloudflare Pages، المتغيرات الجديدة التي تضيفها في Dashboard لا تعمل تلقائياً على النسخة القديمة، لازم تروح لصفحة **Deployments** وتضغط على الثلاث نقاط بجوار أحدث نشر وتختار **Retry deployment** ليتم تفعيل المفتاح الجديد في السيرفر.\n\n' +
      '2️⃣ **اسم المتغير في Cloudflare:** تأكد أن اسم المتغير مكتوب بالضبط: `GEMINI_API_KEY` أو `GOOGLE_API_KEY` ومحدد لكل من (Production) و (Preview).\n\n' +
      '3️⃣ **نوع المفتاح:** تأكد أنه مفتاح Gemini من Google AI Studio (يبدأ بـ `AIzaSy...`) وليس API Token خاص بشركة Cloudflare نفسها.\n\n' +
      '⚡ **حل فوري وسريع للتجربة الآن:** اضغط فوق في أعلى هذه الشاشة على زر **(فحص إعدادات Cloudflare)** والصق المفتاح في خانة التجربة الفورية واضغط حفظ، وهيشتغل سمسم معاك فوراً في نفس اللحظة!';
  } else if (
    lower.includes('مش شغال') ||
    lower.includes('عطلان') ||
    lower.includes('الذكاء الاصطناعي') ||
    lower.includes('ليه مش شغال') ||
    lower.includes('واقف') ||
    lower.includes('مش بيشتغل')
  ) {
    reply =
      'أهلاً بك يا فندم! إذا كان سمسم يعمل بالوضع المحلي الذكي وتريد ربطه بمحرك Gemini السحابي المباشر:\n\n' +
      '• تأكد من إضافة `GEMINI_API_KEY` في إعدادات Cloudflare وعمل **Retry deployment** لإعادة البناء وتطبيق المفتاح.\n' +
      '• أو يمكنك الضغط على زر **(فحص إعدادات Cloudflare)** في أعلى هذه النافذة ولصق المفتاح مباشرة للتجربة الفورية الآن.\n\n' +
      'أنا جاهز ومستنيك لأي استفسار في الحسابات، ديون المزارعين، أو الاستشارات الزراعية!';
  } else if (lower === 'ها' || lower === 'ايوه' || lower === 'أيوة' || lower === 'تمام' || lower === 'يا سمسم') {
    reply =
      'أمرك يا فندم! أنا جاهز ومستنيك، تحب نراجع حسابات المزارعين والديون دلوقتي، نفحص الخزينة، أو محتاج استشارة في محصول أو مبيد معين؟';
  } else if (lower.includes('سلام') || lower.includes('ازيك') || lower.includes('صباح') || lower.includes('مساء') || lower.includes('مين انت')) {
    reply =
      'وعليكم السلام ورحمة الله وبركاته! أنا "سمسم" رفيقك الذكي ومساعدك المتكامل لمنظومة الزهراء للأدوية والمبيدات الزراعية. أقدر أفتح لك أي شاشة، أراجع الخزينة وديون العملاء، وأجاوبك على أي استشارة زراعية أو مبيدات.';
  } else if (lower.includes('مبيعات') || lower.includes('بيع') || lower.includes('فواتير')) {
    type = 'navigate';
    target = 'sales';
    label = 'فتح سجل فواتير المبيعات';
    reply = 'عيني ليك يا فندم! فتحت لك سجل فواتير المبيعات لمراجعة كافة الفواتير النقدية والآجلة.';
  } else if (lower.includes('ضيف صنف') || lower.includes('صنف جديد') || lower.includes('اضف صنف')) {
    type = 'open_modal';
    target = 'product';
    label = 'فتح نافذة إضافة صنف جديد';
    reply = 'فتحت لك نافذة إضافة صنف زراعي جديد دلوقتي، تقدر تملى بياناته وتحدد وحداته وسعر البيع.';
  } else if (lower.includes('مصروف') || lower.includes('تسجيل مصروف')) {
    type = 'open_modal';
    target = 'expense';
    label = 'فتح نافذة تسجيل مصروف';
    reply = 'فتحت لك شاشة تسجيل مصروف جديد من الخزينة.';
  } else if (lower.includes('عميل جديد') || lower.includes('اضافة عميل') || lower.includes('ضيف عميل')) {
    type = 'open_modal';
    target = 'customer';
    label = 'إضافة عميل جديد';
    reply = 'فتحت لك نافذة تسجيل عميل جديد برقم الهاتف والرصيد الافتتاحي.';
  } else if (lower.includes('خزينة') || lower.includes('الخزنة') || lower.includes('فلوس') || lower.includes('كاش')) {
    type = 'navigate';
    target = 'treasury';
    label = 'فتح الخزينة';
    reply = `فتحت لك شاشة الخزينة والمصروفات. رصيد الخزينة الحالي المسجل: ${ctx?.totalCash || 0} ج.م.`;
  } else if (lower.includes('عملاء') || lower.includes('مزارع') || lower.includes('عميل')) {
    type = 'navigate';
    target = 'customers';
    label = 'فتح دليل العملاء';
    reply = 'فتحت لك دليل العملاء والمزارعين، مع إمكانية البحث الفوري وكشف الحسابات.';
  } else if (lower.includes('ديون') || lower.includes('حسابات العملاء') || lower.includes('مديونية') || lower.includes('باقي عليهم')) {
    type = 'navigate';
    target = 'customer_ledgers';
    label = 'كشوف حسابات ومديونيات العملاء';
    reply = `فتحت لك كشوف حسابات العملاء. إجمالي الديون المستحقة على العملاء: ${ctx?.totalCustomerDebt || 0} ج.م.`;
  } else if (lower.includes('منتجات') || lower.includes('أصناف') || lower.includes('دليل') || lower.includes('اسعار')) {
    type = 'navigate';
    target = 'products';
    label = 'دليل الأصناف والمنتجات';
    reply = `فتحت لك دليل الأصناف والمنتجات. إجمالي الأصناف المسجلة: ${ctx?.totalProducts || 0} صنف.`;
  } else if (lower.includes('تقرير') || lower.includes('تقارير') || lower.includes('ارباح')) {
    type = 'navigate';
    target = 'reports';
    label = 'التقارير المالية';
    reply = 'فتحت لك صفحة التقارير المالية والإدارية الشاملة.';
  } else if (lower.includes('تحديث') || lower.includes('مزامنة')) {
    type = 'action';
    target = 'refresh';
    label = 'تحديث ومزامنة البيانات';
    reply = 'تم تحديث ومزامنة كافة السجلات في الموقع بنجاح!';
  } else if (lower.includes('ندوة') || lower.includes('بياض') || lower.includes('حشد') || lower.includes('دودة') || lower.includes('علاج') || lower.includes('قمح') || lower.includes('بطاطس') || lower.includes('طماطم') || lower.includes('تسميد') || lower.includes('حشائش')) {
    reply = 'بخصوص الاستشارة الزراعية: يُنصح بفحص النبات فوراً وتحديد طور الإصابة:\n1. للأمراض الفطرية (ندوة مبكرة/متأخرة، بياض زغبي): استخدم مركبات دايمثومورف + مانكوزيب أو ميتالاكسيل + نحاس بمعدل 250جم/100 لتر ماء.\n2. لدودة الحشد الخريفية والديدان الثاقبة: استخدم إيمامكتين بنزوات 5% بمعدل 60جم/فدان أو كلورانترانيليبرول (كوراجين).\n3. لحشائش القمح: توبيك للرفيعة وجرانستار أو بالاس للعريضة.\nمع مراعاة فترة الأمان قبل الحصاد (PHI) وعدم الرش وقت الظهيرة.';
  }

  return { reply, action: { type, target, label } };
}

export const DEFAULT_SIMSIM_MODEL = 'gemini-3.1-flash-lite';
export const FALLBACK_SIMSIM_MODEL = 'gemini-3.8-flash';

export function buildSimsimPrompt(message: string, history: any, liveContext: any): string {
  const contextStr = liveContext
    ? `\nبيانات النظام الحالية للمساعدة:\n- إجمالي الأصناف: ${liveContext.totalProducts || 0}\n- رصيد الخزينة الحالي: ${liveContext.totalCash || 0} ج.م\n- إجمالي ديون العملاء: ${liveContext.totalCustomerDebt || 0} ج.م\n- إجمالي مستحقات الموردين: ${liveContext.totalSupplierDebt || 0} ج.م\n- عدد الأصناف الناقصة (تحت حد الأمان): ${liveContext.lowStockCount || 0}\n`
    : '';

  const conversationHistory = Array.isArray(history)
    ? history.slice(-6).map((h: any) => `${h.role === 'user' ? 'المستخدم' : 'سمسم'}: ${h.text}`).join('\n')
    : '';

  return `${contextStr}
سجل المحادثة السابقة:
${conversationHistory}

طلب المستخدم الحالي:
${message}

رد كـ "سمسم" بتنسيق JSON المطلوب حصراً.`;
}

export function parseSimsimResponse(responseText: string) {
  let parsed: any;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    const clean = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    parsed = JSON.parse(clean);
  }
  return {
    reply: parsed.reply || 'أهلاً بك يا فندم! أنا سمسم تحت أمرك.',
    action: parsed.action || { type: 'none', target: 'none', label: '' },
  };
}
