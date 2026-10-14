import {
  SIMSIM_SYSTEM_INSTRUCTION,
  resolveSmartFallback,
  buildSimsimPrompt,
  parseSimsimResponse,
  DEFAULT_SIMSIM_MODEL,
} from '../../../shared/simsim';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function callGemini(apiKey: string, model: string, promptText: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SIMSIM_SYSTEM_INSTRUCTION }] },
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
        signal: controller.signal,
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err: any = new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`);
      err.status = res.status;
      throw err;
    }
    const data: any = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p: any) => p?.text || '').join('');
    if (!text) throw new Error('Gemini returned empty response');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function onRequestPost(context: { request: Request; env: Record<string, any> }): Promise<Response> {
  const { request, env } = context;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'طلب غير صالح' }), { status: 400, headers: JSON_HEADERS });
  }

  const { message, history, liveContext } = body || {};
  if (!message || typeof message !== 'string') {
    return new Response(JSON.stringify({ error: 'الرجاء إرسال رسالة للمحادثة' }), { status: 400, headers: JSON_HEADERS });
  }

  const fallbackResponse = (mode: string) =>
    new Response(JSON.stringify(resolveSmartFallback(message, liveContext)), {
      headers: { ...JSON_HEADERS, 'X-Simsim-Mode': mode },
    });

  // Check all possible variable names in Cloudflare (secrets / env vars)
  const apiKey =
    (env.GEMINI_API_KEY as string) ||
    (env.GOOGLE_API_KEY as string) ||
    (env.GEMINI_KEY as string) ||
    (env.API_KEY as string) ||
    (env.VITE_GEMINI_API_KEY as string);

  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set in Cloudflare Pages environment variables');
    return fallbackResponse('fallback-no-key');
  }

  const promptText = buildSimsimPrompt(message, history, liveContext);
  const models = [
    (env.GEMINI_MODEL as string),
    'gemini-2.5-flash',
    'gemini-3.8-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    DEFAULT_SIMSIM_MODEL,
  ].filter(Boolean) as string[];

  for (const model of models) {
    try {
      const text = await callGemini(apiKey, model, promptText);
      return new Response(JSON.stringify(parseSimsimResponse(text)), {
        headers: { ...JSON_HEADERS, 'X-Simsim-Mode': `ai:${model}` },
      });
    } catch (err: any) {
      console.warn(`Simsim Gemini error (${model}):`, err?.message);
    }
  }

  return fallbackResponse('fallback-error');
}
