/**
 * Cloudflare Worker for serving Vite SPA with static assets,
 * API health checks, SPA routing fallback, security headers, and caching.
 */

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  ENVIRONMENT?: string;
  [key: string]: unknown;
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. Health check & status endpoint
    if (url.pathname === '/api/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'al-khalil-erp',
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
        headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

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
