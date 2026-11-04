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

const generateWithFallback = async (ai, apiKey, prompt, primaryModel, fallbackModel) => {
  let lastError;
  const preferredModels = [...new Set([primaryModel, fallbackModel].filter(Boolean))];
  const models = [...preferredModels];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
    );

    if (response.ok) {
      const data = await response.json();
      const availableModels = (data.models || [])
        .filter((item) =>
          (item.supportedGenerationMethods || []).includes('generateContent') &&
          String(item.name || '').includes('gemini')
        )
        .map((item) => item.name.replace(/^models\//, ''));

      const rankedModels = [
        ...availableModels.filter((name) => name.includes('gemini-2.0-flash')),
        ...availableModels.filter((name) => name.includes('gemini-1.5-flash')),
        ...availableModels.filter((name) => name.includes('gemini-2.5-flash-lite')),
        ...availableModels.filter((name) => name.includes('gemini-2.5-flash')),
      ];

      for (const name of rankedModels) {
        if (!models.includes(name)) models.push(name);
      }
      for (const name of availableModels) {
        if (!models.includes(name)) models.push(name);
      }
    }
  } catch {
    // Mantém os modelos configurados como fallback.
  }

  for (const selectedModel of models) {
    try {
      return await withGeminiRetry(async () => {
        return await ai.models.generateContent({
          model: selectedModel,
          contents: prompt,
        });
      }, 2);
    } catch (error) {
      lastError = error;
      const message = String(error?.message || '');

      if (!message.includes('404') && !isTransientGeminiError(message)) {
        throw error;
      }
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

        const primaryModel = model || 'gemini-2.0-flash';
        const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-1.5-flash';

        const ai = new GoogleGenAI({ apiKey });
        const response = await generateWithFallback(ai, apiKey, prompt, primaryModel, fallbackModel);

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
