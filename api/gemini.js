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
const friendlyQuotaMessage = 'Sua chave da Gemini atingiu o limite de uso atual. Aguarde a renovação da cota ou configure uma chave com cota disponível.';

const withGeminiRetry = async (fn, retries = 2) => {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = error?.message || '';
      const lowerMessage = message.toLowerCase();

      if (
        lowerMessage.includes('429') ||
        lowerMessage.includes('quota') ||
        lowerMessage.includes('resource_exhausted') ||
        lowerMessage.includes('rate limit')
      ) {
        throw error;
      }

      if (!isTransientGeminiError(message) || attempt === retries) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }

  throw lastError;
};

const generateWithFallback = async (ai, prompt, primaryModel, fallbackModel) => {
  let lastError;
  const models = [...new Set([primaryModel, fallbackModel].filter(Boolean))];

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
      const lowerMessage = message.toLowerCase();

      if (
        lowerMessage.includes('429') ||
        lowerMessage.includes('quota') ||
        lowerMessage.includes('resource_exhausted') ||
        lowerMessage.includes('rate limit')
      ) {
        const quotaError = new Error(friendlyQuotaMessage);
        quotaError.code = 'QUOTA_EXHAUSTED';
        throw quotaError;
      }

      if (!message.includes('404') && !isTransientGeminiError(message)) {
        throw error;
      }
    }
  }

  throw lastError;
};

const discoverGeminiModels = async (ai) => {
  const pager = await ai.models.list({ config: { pageSize: 100 } });
  const names = [];

  for await (const item of pager) {
    const name = String(item?.name || '').replace(/^models\//, '');
    const supportsGenerate =
      !item?.supportedActions ||
      item.supportedActions.some(action =>
        String(action).toLowerCase().includes('generatecontent')
      );

    if (name.startsWith('gemini-') && supportsGenerate && !names.includes(name)) {
      names.push(name);
    }
  }

  return names.sort((a, b) => {
    const priority = name => {
      if (name.includes('2.5-flash')) return 0;
      if (name.includes('2.0-flash')) return 1;
      if (name.includes('flash')) return 2;
      return 3;
    };
    return priority(a) - priority(b) || a.localeCompare(b);
  });
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

        const ai = new GoogleGenAI({ apiKey });
        const availableModels = await discoverGeminiModels(ai);

        if (!availableModels.length) {
          throw new Error('Nenhum modelo Gemini disponível para gerar conteúdo nesta chave/projeto.');
        }

        const response = await generateWithFallback(ai, prompt, availableModels[0], availableModels[1]);

        res.status(200).json({ text: response.text || 'Sem resposta da IA.' });
      } catch (error) {
        console.error('Erro na API Gemini do Vercel:', error);
        const message = error?.message || '';
        const lowerMessage = message.toLowerCase();

        if (error?.code === 'QUOTA_EXHAUSTED') {
          res.status(429).json({ error: friendlyQuotaMessage });
          return;
        }

        if (
          lowerMessage.includes('api key') ||
          lowerMessage.includes('api_key') ||
          lowerMessage.includes('unauthenticated') ||
          lowerMessage.includes('401')
        ) {
          res.status(401).json({ error: 'A chave da Gemini foi rejeitada. Gere uma nova chave e atualize GEMINI_API_KEY na Vercel.' });
          return;
        }

        if (
          lowerMessage.includes('permission denied') ||
          lowerMessage.includes('403') ||
          lowerMessage.includes('not enabled') ||
          lowerMessage.includes('consumer')
        ) {
          res.status(403).json({ error: 'A chave não tem acesso ao Gemini API. Ative a API Gemini e confirme o projeto vinculado à chave.' });
          return;
        }

        if (
          lowerMessage.includes('404') ||
          lowerMessage.includes('not found') ||
          lowerMessage.includes('modelo') && lowerMessage.includes('não')
        ) {
          res.status(404).json({ error: 'O modelo configurado não está disponível nesta chave/projeto. Remova GEMINI_MODEL e tente novamente com gemini-2.5-flash.' });
          return;
        }

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
