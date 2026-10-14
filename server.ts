import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  SIMSIM_SYSTEM_INSTRUCTION,
  resolveSmartFallback,
  buildSimsimPrompt,
  parseSimsimResponse,
  DEFAULT_SIMSIM_MODEL,
} from './shared/simsim';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API Route for Simsim Assistant
app.post('/api/ai/simsim', async (req, res) => {
  try {
    const { message, history, liveContext } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'الرجاء إرسال رسالة للمحادثة' });
    }

    if (!ai) {
      const fallback = resolveSmartFallback(message, liveContext);
      return res.json(fallback);
    }

    const promptText = buildSimsimPrompt(message, history, liveContext);

    // Multi-model resilience: try candidate models if primary experiences spikes or 503
    const candidateModels = Array.from(
      new Set([
        process.env.GEMINI_MODEL,
        'gemini-2.5-flash',
        'gemini-3.8-flash',
        'gemini-2.0-flash',
        DEFAULT_SIMSIM_MODEL,
        'gemini-1.5-flash',
      ].filter(Boolean) as string[])
    );

    let generatedText = '';
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptText,
          config: {
            systemInstruction: SIMSIM_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
          },
        });
        generatedText = response.text || '';
        if (generatedText) {
          break;
        }
      } catch (genError: any) {
        lastError = genError;
        console.warn(`Simsim model [${modelName}] failed (${genError?.status || genError?.message}), trying next candidate...`);
      }
    }

    if (generatedText) {
      return res.json(parseSimsimResponse(generatedText));
    }

    console.warn('All Gemini models exhausted, using smart local expert fallback:', lastError?.message);
    const fallback = resolveSmartFallback(message, liveContext);
    return res.json(fallback);
  } catch (error: any) {
    console.error('Simsim AI critical error:', error);
    const fallback = resolveSmartFallback(req.body?.message || '', req.body?.liveContext);
    return res.json(fallback);
  }
});

// Mount Vite or static server
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer();
