// System Instruction for "سمسم"
export const SIMSIM_SYSTEM_INSTRUCTION = `
أنت "سمسم" (Simsim)، المساعد والذكاء الاصطناعي الذكي والشامل لموقع ومنظومة "الزهراء للأدوية والمبيدات الزراعية".
أنت ذكي، سريع البديهة، خفيف الظل، متجاوب، تتحدث بلهجة مصرية مهذبة ومحترفة.
لديك تحكم كامل في وظائف وشاشات المنظومة وقدرة على توجيه المستخدم والإجابة عن الأسئلة الزراعية والمحاسبية وإدارة المخزن والمحل.

ملاحظات هامة في شخصيتك:
1. اسمك: سمسم.
2. دورك: المساعد الذكي الحصري للمنظومة.
3. التجاوب: تفهم أوامر المستخدم باللغة العامية المصرية أو الفصحى فوراً.
4. التحكم في الموقع: عندما يطلب المستخدم فتح صفحة أو شاشة، أو إضافة صنف، أو تسجيل مصروف، أو فحص الخزينة، يجب أن تتضمن إجابتك كود الأمر المطلوب بتنسيق JSON محدد في نهاية ردك، أو في بنية الرد.

الأوامر والإجراءات المتاحة لك للتحكم في الموقع:
- الانتقال للشاشات (action type: "navigate"):
  - "pos": نقطة البيع السريعة والكاشير
  - "sales": فواتير مبيعات المحل
  - "warehouse_shop": بضاعة ومخزون المحل
  - "warehouse_main": بضاعة ومخزون المخزن
  - "purchases": فواتير توريد ووارد المخزن
  - "products": دليل الأصناف والمنتجات والأسعار
  - "customers": دليل العملاء والمزارعين
  - "customer_ledgers": كشوف حسابات ومديونيات العملاء
  - "suppliers": دليل وحسابات الموردين
  - "treasury": الخزينة والمصروفات اليومية
  - "payments": سندات القبض والصرف
  - "stock_movements": حركة مخزون المخزن
  - "reports": التقارير المالية والمخزنية
  - "dashboard": لوحة التحكم الرئيسية والملخص

- فتح نوافذ العمليات السريعة (action type: "open_modal"):
  - "product": نافذة إضافة صنف جديد
  - "purchase": نافذة فاتورة توريد جديدة
  - "expense": نافذة تسجيل مصروف جديد
  - "customer": نافذة إضافة عميل جديد
  - "supplier": نافذة إضافة مورد جديد

- تنفيذ عمليات (action type: "action"):
  - "refresh": تحديث ومزامنة البيانات

تنسيق الإخراج:
عليك الرد دائماً بصيغة JSON نظيفة وصالحة بالبنية التالية:
{
  "reply": "نص الرد بالعامية المصرية الودودة مع التوضيح الدقيق",
  "action": {
    "type": "navigate" | "open_modal" | "action" | "none",
    "target": "pos" | "sales" | "warehouse_shop" | "warehouse_main" | "purchases" | "products" | "customers" | "customer_ledgers" | "suppliers" | "treasury" | "payments" | "stock_movements" | "reports" | "dashboard" | "product" | "purchase" | "expense" | "customer" | "supplier" | "refresh" | "none",
    "label": "وصف الإجراء المنفذ باختصار"
  }
}

إذا لم يطلب المستخدم إجراءً، اجعل action: {"type": "none", "target": "none", "label": ""}.
إذا سألك عن استشارة زراعية أو مبيدات أو أمراض نباتات (مثل البياض الدقيقي، اللفحة، دودة الحشد، التسميد، منظمات النمو)، أجب بدقة وعلمية متخصصة ومبسطة بالأسماء التجارية والمواد الفعالة الشائعة في مصر.
`;

// Smart Fallback Resolver
export function resolveSmartFallback(userMsg: string, ctx: any) {
  const lower = userMsg.trim().toLowerCase();
  let target = 'none';
  let type: 'navigate' | 'open_modal' | 'action' | 'none' = 'none';
  let reply = 'أهلاً بك يا فندم! أنا سمسم المساعد والذكاء الاصطناعي للمنظومة، تحت أمرك دائماً في أي عملية أو استفسار.';
  let label = '';

  if (lower.includes('كاشير') || lower.includes('بيع') || lower.includes('pos') || lower.includes('فاتورة بيع')) {
    type = 'navigate';
    target = 'pos';
    label = 'فتح نقطة البيع (POS)';
    reply = 'عيني ليك يا فندم! فتحت لك شاشة الكاشير ونقطة البيع (POS) فوراً جاهزة للبيع.';
  } else if (lower.includes('مخزون المحل') || lower.includes('بضاعة المحل')) {
    type = 'navigate';
    target = 'warehouse_shop';
    label = 'فتح بضاعة ومخزون المحل';
    reply = 'تمام! فتحت لك شاشة بضاعة ومخزون المحل لمراجعة الأرصدة.';
  } else if (lower.includes('مخزون المخزن') || lower.includes('بضاعة المخزن') || lower.includes('المستودع') || lower.includes('المخزن')) {
    type = 'navigate';
    target = 'warehouse_main';
    label = 'فتح بضاعة ومخزون المخزن';
    reply = 'حاضر! فتحت لك شاشة بضاعة ومخزون المخزن.';
  } else if (lower.includes('ضيف صنف') || lower.includes('صنف جديد') || lower.includes('اضف صنف')) {
    type = 'open_modal';
    target = 'product';
    label = 'فتح نافذة إضافة صنف جديد';
    reply = 'فتحت لك نافذة إضافة صنف زراعي جديد دلوقتي، تقدر تملى بياناته وترفع صورته وتحدد وحداته.';
  } else if (lower.includes('مصروف') || lower.includes('تسجيل مصروف')) {
    type = 'open_modal';
    target = 'expense';
    label = 'فتح نافذة تسجيل مصروف';
    reply = 'فتحت لك شاشة تسجيل مصروف جديد من الخزينة.';
  } else if (lower.includes('توريد') || lower.includes('فاتورة شراء') || lower.includes('مشتريات')) {
    type = 'open_modal';
    target = 'purchase';
    label = 'فتح فاتورة توريد جديدة';
    reply = 'فتحت لك شاشة تسجيل فاتورة توريد ووارد للمخزن.';
  } else if (lower.includes('خزينة') || lower.includes('الخزنة') || lower.includes('فلوس')) {
    type = 'navigate';
    target = 'treasury';
    label = 'فتح الخزينة';
    reply = `فتحت لك شاشة الخزينة والمصروفات. رصيد الخزينة الحالي المسجل: ${ctx?.totalCash || 0} ج.م.`;
  } else if (lower.includes('عملاء') || lower.includes('مزارع')) {
    type = 'navigate';
    target = 'customers';
    label = 'فتح دليل العملاء';
    reply = 'فتحت لك دليل العملاء والمزارعين.';
  } else if (lower.includes('ديون') || lower.includes('حسابات العملاء') || lower.includes('مديونية')) {
    type = 'navigate';
    target = 'customer_ledgers';
    label = 'كشوف حسابات ومديونيات العملاء';
    reply = `فتحت لك كشوف حسابات العملاء. إجمالي الديون المستحقة: ${ctx?.totalCustomerDebt || 0} ج.م.`;
  } else if (lower.includes('موردين') || lower.includes('شركات')) {
    type = 'navigate';
    target = 'suppliers';
    label = 'دليل الموردين والشركات';
    reply = `فتحت لك دليل وحسابات الموردين. إجمالي مستحقات الشركات: ${ctx?.totalSupplierDebt || 0} ج.م.`;
  } else if (lower.includes('نواقص') || lower.includes('ناقص')) {
    type = 'navigate';
    target = 'warehouse_shop';
    label = 'مراجعة نواقص المخزون';
    reply = `يوجد حالياً ${ctx?.lowStockCount || 0} أصناف وصلت لحد التنبيه الأدنى. فتحت لك صفحة المخزون لمراجعتها.`;
  } else if (lower.includes('منتجات') || lower.includes('أصناف') || lower.includes('دليل')) {
    type = 'navigate';
    target = 'products';
    label = 'دليل الأصناف والمنتجات';
    reply = `فتحت لك دليل الأصناف والمنتجات. إجمالي الأصناف المسجلة: ${ctx?.totalProducts || 0} صنف.`;
  } else if (lower.includes('تقرير') || lower.includes('تقارير')) {
    type = 'navigate';
    target = 'reports';
    label = 'التقارير المالية والمخزنية';
    reply = 'فتحت لك صفحة التقارير الشاملة للمنظومة.';
  } else if (lower.includes('تحديث') || lower.includes('مزامنة')) {
    type = 'action';
    target = 'refresh';
    label = 'تحديث ومزامنة البيانات';
    reply = 'تم تحديث ومزامنة كافة السجلات في الموقع بنجاح!';
  } else if (lower.includes('ندوة') || lower.includes('بياض') || lower.includes('حشد') || lower.includes('دودة') || lower.includes('علاج') || lower.includes('قمح') || lower.includes('بطاطس')) {
    reply = 'بخصوص المكافحة الزراعية: يُنصح بفحص الإصابة فوراً واستخدام المبيد المناسب بالجرعة الموصى بها (مثال: أكروبات نحاس أو رادوميل جولد لمكافحة الندوة واللفحة بمعدل 250جم/100 لتر ماء، أو إيمامكتين بنزوات لدودة الحشد)، مع مراعاة فترة الأمان قبل الحصاد (PHI).';
  }

  return { reply, action: { type, target, label } };
}


export const DEFAULT_SIMSIM_MODEL = 'gemini-3.8-flash';
export const FALLBACK_SIMSIM_MODEL = 'gemini-3.5-flash';

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
