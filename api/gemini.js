import { GoogleGenAI } from '@google/genai';

const isTransientGeminiError = (message = '') => {
  const text = String(message).toLowerCase();
  return (
    text.includes('high demand') ||
    text.includes('temporar') ||
    text.includes('unavailable') ||
    text.includes('503') ||
    text.includes('overloaded')
  );
};

const friendlyGeminiUnavailableMessage = 'A IA está temporariamente ocupada. Tente novamente em alguns minutos.';
const friendlyQuotaMessage = 'O Google Gemini recusou a solicitação por limite de uso (429). O limite é associado ao projeto/modelo, não à chave individual. Confira a cota do modelo e o projeto associado à chave no Google AI Studio.';
const modelCacheTtlMs = 30 * 60 * 1000;
let cachedModels = [];
let modelsCachedAt = 0;

const getErrorMessage = error => String(error?.message || error || '');

const getErrorStatus = error => Number(error?.status || error?.statusCode || error?.response?.status || 0);

const isQuotaError = error => {
  const text = getErrorMessage(error).toLowerCase();
  return (
    getErrorStatus(error) === 429 ||
    text.includes('429') ||
    text.includes('quota') ||
    text.includes('resource_exhausted') ||
    text.includes('rate limit')
  );
};

const withGeminiRetry = async (fn, retries = 2) => {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = getErrorMessage(error);

      if (isQuotaError(error) || !isTransientGeminiError(message) || attempt === retries) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }

  throw lastError;
};

const discoverGeminiModels = async ai => {
  if (cachedModels.length && Date.now() - modelsCachedAt < modelCacheTtlMs) {
    return cachedModels;
  }

  const pager = await ai.models.list({ config: { pageSize: 100 } });
  const names = [];

  for await (const item of pager) {
    const name = String(item?.name || '').replace(/^models\//, '');
    const supportsGenerate =
      !item?.supportedActions ||
      item.supportedActions.some(action =>
        String(action).toLowerCase().includes('generatecontent')
      );
    const isNonTextModel =
      /(image|audio|speech|tts|embedding|video|veo|live|robotics|computer-use)/i.test(name);

    if (name.startsWith('gemini-') && supportsGenerate && !isNonTextModel && !names.includes(name)) {
      names.push(name);
    }
  }

  const priority = name => {
    const isPreview = /preview|experimental/i.test(name);
    if (name === 'gemini-2.5-flash') return 0;
    if (name.includes('2.5-flash') && !isPreview) return 1;
    if (name.includes('2.0-flash') && !isPreview) return 2;
    if (name.includes('flash') && !isPreview) return 3;
    if (name.includes('2.5-flash')) return 4;
    if (name.includes('2.0-flash')) return 5;
    if (name.includes('flash')) return 6;
    return isPreview ? 8 : 7;
  };

  cachedModels = names.sort((a, b) => priority(a) - priority(b) || a.localeCompare(b));
  modelsCachedAt = Date.now();
  return cachedModels;
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
          throw new Error('Nenhum modelo Gemini compatível com geração de texto está disponível para este projeto.');
        }

        let response;
        let lastError;

        const preferredModels = availableModels.slice(0, 3);
        const requestedModel = model && availableModels.includes(model) ? model : null;

        for (const selectedModel of [...new Set([requestedModel, ...preferredModels].filter(Boolean))]) {
          try {
            response = await withGeminiRetry(() =>
              ai.models.generateContent({ model: selectedModel, contents: prompt })
            );
            break;
          } catch (error) {
            lastError = error;
            const message = getErrorMessage(error);
            if (isQuotaError(error) || (!message.includes('404') && !message.toLowerCase().includes('not found'))) {
              throw error;
            }
          }
        }

        if (!response) {
          throw lastError || new Error('Não foi possível selecionar um modelo Gemini.');
        }

        res.status(200).json({ text: response.text || 'Sem resposta da IA.' });
      } catch (error) {
        const message = getErrorMessage(error);
        const safeMessage = message.replaceAll(apiKey, '[chave ocultada]');
        console.error('Erro na API Gemini do Vercel:', {
          code: error?.code,
          status: getErrorStatus(error),
          message: safeMessage,
        });

        if (isQuotaError(error)) {
          res.status(429).json({
            error: friendlyQuotaMessage,
            diagnostic: (safeMessage || `HTTP ${getErrorStatus(error)} (${error?.code || 'quota'})`).slice(0, 500),
          });
          return;
        }

        const lowerMessage = message.toLowerCase();

        if (
          lowerMessage.includes('api key') ||
          lowerMessage.includes('api_key') ||
          lowerMessage.includes('unauthenticated') ||
          lowerMessage.includes('401')
        ) {
          res.status(401).json({ error: 'A chave da Gemini foi rejeitada. Confira se a nova GEMINI_API_KEY está configurada no ambiente Production da Vercel e faça um novo deploy.' });
          return;
        }

        if (
          lowerMessage.includes('permission denied') ||
          lowerMessage.includes('403') ||
          lowerMessage.includes('not enabled') ||
          lowerMessage.includes('consumer')
        ) {
          res.status(403).json({ error: 'A chave não tem acesso ao Gemini API. Confira a API habilitada e o projeto associado à chave.' });
          return;
        }

        if (lowerMessage.includes('404') || lowerMessage.includes('not found')) {
          res.status(404).json({ error: 'Nenhum dos modelos disponíveis para a chave aceitou a solicitação. Confira o acesso a modelos Gemini no Google AI Studio.' });
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
