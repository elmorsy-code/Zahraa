/**
 * Cloudflare Worker for serving Vite SPA with static assets,
 * API health checks, SPA routing fallback, security headers, and caching.
 */

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

import {
  SIMSIM_SYSTEM_INSTRUCTION,
  resolveSmartFallback,
  buildSimsimPrompt,
  parseSimsimResponse,
  DEFAULT_SIMSIM_MODEL,
  FALLBACK_SIMSIM_MODEL,
} from '../shared/simsim';

export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  ENVIRONMENT?: string;
  GEMINI_API_KEY?: string; // secret: npx wrangler secret put GEMINI_API_KEY
  GEMINI_MODEL?: string;
  [key: string]: unknown;
}

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

async function handleSimsim(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: JSON_HEADERS });
  }

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

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set: Simsim is using the keyword fallback');
    return fallbackResponse('fallback-no-key');
  }

  const promptText = buildSimsimPrompt(message, history, liveContext);
  const primary = (env.GEMINI_MODEL as string) || DEFAULT_SIMSIM_MODEL;
  const models = primary === FALLBACK_SIMSIM_MODEL ? [primary] : [primary, FALLBACK_SIMSIM_MODEL];

  for (const model of models) {
    try {
      const text = await callGemini(apiKey, model, promptText);
      return new Response(JSON.stringify(parseSimsimResponse(text)), {
        headers: { ...JSON_HEADERS, 'X-Simsim-Mode': `ai:${model}` },
      });
    } catch (err: any) {
      console.warn(`Simsim Gemini error (${model}):`, err?.message);
      // نجرب الموديل البديل بس لو الموديل نفسه مش متاح (404/400)؛ غير كده نروح للرد الاحتياطي
      if (err?.status !== 404 && err?.status !== 400) break;
    }
  }
  return fallbackResponse('fallback-error');
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Global CORS preflight
    if (request.method === 'OPTIONS') {
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

    // 0. Simsim AI assistant
    if (url.pathname === '/api/ai/simsim') {
      return handleSimsim(request, env);
    }
    if (url.pathname === '/api/ai/status') {
      return new Response(
        JSON.stringify({ configured: Boolean(env.GEMINI_API_KEY), model: (env.GEMINI_MODEL as string) || DEFAULT_SIMSIM_MODEL }),
        { headers: JSON_HEADERS }
      );
    }

    // 1. Health check & status endpoint
    if (url.pathname === '/api/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'al-zahraa-erp',
          timestamp: new Date().toISOString(),
          environment: (env.ENVIRONMENT as string) || 'production',
        }),
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    try {
      // 2. Fetch static assets through Cloudflare Assets binding
      const response = await env.ASSETS.fetch(request);

      // If the static asset was found (status < 400)
      if (response.status < 400) {
        const headers = new Headers(response.headers);

        // Security headers
        headers.set('X-Content-Type-Options', 'nosniff');
        headers.set('X-Frame-Options', 'SAMEORIGIN');
        headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');

        // Fine-tuned caching headers
        if (url.pathname.startsWith('/assets/')) {
          // Vite hashed bundles (JS/CSS) are immutable
          headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (url.pathname === '/' || url.pathname.endsWith('.html')) {
          // SPA entry point must not be cached aggressively
          headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        }

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      // 3. Fallback for SPA navigation (Single Page Application routing)
      // When a route is accessed directly (e.g. /pos, /sales), serve index.html
      const spaRequest = new Request(new URL('/', request.url).toString(), request);
      const spaResponse = await env.ASSETS.fetch(spaRequest);

      const headers = new Headers(spaResponse.headers);
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('X-Frame-Options', 'SAMEORIGIN');
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

      return new Response(spaResponse.body, {
        status: spaResponse.status,
        headers,
      });
    } catch (err) {
      return new Response(`Worker Error: ${(err as Error).message}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  },
};
