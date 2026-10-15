const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function onRequestGet(context: { env: Record<string, any> }): Promise<Response> {
  const { env } = context;
  const rawKey =
    (env.GEMINI_API_KEY as string) ||
    (env.GOOGLE_API_KEY as string) ||
    (env.GOOGLE_GENAI_API_KEY as string) ||
    (env.GEMINI_KEY as string) ||
    (env.GEMINI_API as string) ||
    (env.GEMINI as string) ||
    (env.API_KEY as string) ||
    (env.APIKEY as string) ||
    (env.VITE_GEMINI_API_KEY as string);

  const apiKey = rawKey ? rawKey.trim().replace(/^["']|["']$/g, '') : '';

  return new Response(
    JSON.stringify({
      configured: Boolean(apiKey),
      source: apiKey ? 'cloudflare_env' : 'none',
      model: (env.GEMINI_MODEL as string) || 'gemini-2.5-flash',
    }),
    { headers: JSON_HEADERS }
  );
}
