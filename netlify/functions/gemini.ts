import { GoogleGenAI } from "@google/genai";

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
let cachedModels: string[] = [];
let modelsCachedAt = 0;

const getErrorStatus = (error: any) =>
  Number(error?.status || error?.statusCode || error?.response?.status || 0);

const isQuotaError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const text = message.toLowerCase();
  return getErrorStatus(error) === 429 || text.includes('429') || text.includes('quota') ||
    text.includes('resource_exhausted') || text.includes('rate limit');
};

const withGeminiRetry = async <T>(fn: () => Promise<T>, retries = 2): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error ?? '');

      if (isQuotaError(error) || !isTransientGeminiError(message) || attempt === retries) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }

  throw lastError;
};

const discoverGeminiModels = async (ai: GoogleGenAI): Promise<string[]> => {
  if (cachedModels.length && Date.now() - modelsCachedAt < modelCacheTtlMs) {
    return cachedModels;
  }

  const pager = await ai.models.list({ config: { pageSize: 100 } });
  const names: string[] = [];

  for await (const item of pager) {
    const name = String(item?.name || "").replace(/^models\//, "");
    const supportsGenerate =
      !item?.supportedActions ||
      item.supportedActions.some(action =>
        String(action).toLowerCase().includes("generatecontent")
      );
    const isNonTextModel =
      /(image|audio|speech|tts|embedding|video|veo|live|robotics|computer-use)/i.test(name);

    if (name.startsWith("gemini-") && supportsGenerate && !isNonTextModel && !names.includes(name)) {
      names.push(name);
    }
  }

  const priority = (name: string) => {
    const isPreview = /preview|experimental/i.test(name);
    if (name === "gemini-2.5-flash") return 0;
    if (name.includes("2.5-flash") && !isPreview) return 1;
    if (name.includes("2.0-flash") && !isPreview) return 2;
    if (name.includes("flash") && !isPreview) return 3;
    if (name.includes("2.5-flash")) return 4;
    if (name.includes("2.0-flash")) return 5;
    if (name.includes("flash")) return 6;
    return isPreview ? 8 : 7;
  };

  cachedModels = names.sort((a, b) => priority(a) - priority(b) || a.localeCompare(b));
  modelsCachedAt = Date.now();
  return cachedModels;
};

export default async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Responde preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // A chave de API fica armazenada de forma 100% segura no servidor (Netlify Environment Variables)
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "A chave GEMINI_API_KEY não foi configurada nas variáveis de ambiente do Netlify."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const { prompt, model } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt é obrigatório." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const availableModels = await discoverGeminiModels(ai);

    if (!availableModels.length) {
      throw new Error("Nenhum modelo Gemini compatível com geração de texto está disponível para este projeto.");
    }

    let response;
    let lastError: unknown;

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
        const message = error instanceof Error ? error.message : String(error ?? "");
        if (isQuotaError(error) || (!message.includes("404") && !message.toLowerCase().includes("not found"))) {
          throw error;
        }
      }
    }

    if (!response) {
      throw lastError || new Error("Não foi possível selecionar um modelo Gemini.");
    }

    return new Response(
      JSON.stringify({ text: response.text || "Sem resposta da IA." }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    const message = error?.message || "";
    const safeMessage = String(message).replaceAll(apiKey, "[chave ocultada]");
    console.error("Erro na Netlify Function Gemini:", {
      code: error?.code,
      status: getErrorStatus(error),
      message: safeMessage,
    });

    if (isQuotaError(error)) {
      return new Response(
        JSON.stringify({
          error: friendlyQuotaMessage,
          diagnostic: (safeMessage || `HTTP ${getErrorStatus(error)} (${error?.code || 'quota'})`).slice(0, 500),
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isTransientGeminiError(message)) {
      return new Response(
        JSON.stringify({ error: friendlyGeminiUnavailableMessage }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "No momento não foi possível gerar a resposta. Tente novamente em alguns minutos." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

export const config = {
  path: ["/api/gemini", "/.netlify/functions/gemini"],
};
