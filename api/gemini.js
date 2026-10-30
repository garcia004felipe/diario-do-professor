import { GoogleGenAI } from '@google/genai';

const isTransientGeminiError = (message = '') => {
  const text = String(message).toLowerCase();
  return (
    text.includes('high demand') ||
    text.includes('temporar') ||
    text.includes('unavailable') ||
    text.includes('503') ||
    text.includes('429') ||
    text.includes('rate limit') ||
    text.includes('overloaded')
  );
};

const friendlyGeminiUnavailableMessage = 'A IA está temporariamente ocupada. Tente novamente em alguns minutos.';

const withGeminiRetry = async (fn, retries = 2) => {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = error?.message || '';

      if (!isTransientGeminiError(message) || attempt === retries) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }

  throw lastError;
};

export default async function handler(req, res) {
  const allowedOrigin = '*';

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    res.status(500).json({
      error: 'A chave GEMINI_API_KEY não está configurada no ambiente do Vercel.'
    });
    return;
  }

  try {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const { prompt, model } = JSON.parse(body || '{}');

        if (!prompt) {
          res.status(400).json({ error: 'Prompt é obrigatório.' });
          return;
        }

        const selectedModel = model || process.env.GEMINI_MODEL || 'gemini-3.8-flash';

        const ai = new GoogleGenAI({ apiKey });
        const response = await withGeminiRetry(async () => {
          return await ai.models.generateContent({
            model: selectedModel,
            contents: prompt,
          });
        }, 2);

        res.status(200).json({ text: response.text || 'Sem resposta da IA.' });
      } catch (error) {
        console.error('Erro na API Gemini do Vercel:', error);
        const message = error?.message || '';

        if (isTransientGeminiError(message)) {
          res.status(503).json({ error: friendlyGeminiUnavailableMessage });
          return;
        }

        res.status(500).json({ error: 'No momento não foi possível gerar a resposta. Tente novamente em alguns minutos.' });
      }
    });
  } catch (error) {
    console.error('Erro ao preparar a API Gemini do Vercel:', error);
    const message = error?.message || 'Erro ao consultar a Inteligência Artificial.';
    res.status(500).json({ error: message });
  }
}
