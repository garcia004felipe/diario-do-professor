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
const friendlyQuotaMessage = 'A chave do Gemini atingiu o limite de requisições. Aguarde alguns instantes ou verifique sua cota no Google AI Studio.';

const withGeminiRetry = async <T>(fn: () => Promise<T>, retries = 2): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error ?? '');

      if (!isTransientGeminiError(message) || attempt === retries) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }

  throw lastError;
};

const generateWithFallback = async <T>(
  ai: GoogleGenAI,
  prompt: string,
  primaryModel: string,
  fallbackModel: string
): Promise<T> => {
  let lastError: unknown;
  const models = [...new Set([primaryModel, fallbackModel, "gemini-2.5-flash", "gemini-1.5-flash"].filter(Boolean))];

  for (const selectedModel of models) {
    try {
      return await withGeminiRetry(async (): Promise<T> => {
        return await ai.models.generateContent({
          model: selectedModel,
          contents: prompt,
        }) as T;
      }, 2);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error ?? '');
      const lower = message.toLowerCase();

      if (
        lower.includes('429') ||
        lower.includes('quota') ||
        lower.includes('resource_exhausted') ||
        lower.includes('rate limit')
      ) {
        const quotaError = new Error(friendlyQuotaMessage);
        (quotaError as any).code = 'QUOTA_EXHAUSTED';
        throw quotaError;
      }

      if (!message.includes('404') && !isTransientGeminiError(message)) {
        throw error;
      }
    }
  }

  throw lastError;
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
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "A variável GEMINI_API_KEY não foi configurada no painel do Netlify (Site configuration -> Environment variables)."
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawModel = model || process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const primaryModel = rawModel.includes("3.8") ? "gemini-2.5-flash" : rawModel;
    const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || "gemini-1.5-flash";

    const ai = new GoogleGenAI({ apiKey });
    const response = await generateWithFallback<any>(ai, prompt, primaryModel, fallbackModel);

    return new Response(
      JSON.stringify({ text: response.text || "Sem resposta da IA." }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Erro na Netlify Function Gemini:", error);
    const message = error?.message || "";

    if (error?.code === 'QUOTA_EXHAUSTED') {
      return new Response(
        JSON.stringify({ error: friendlyQuotaMessage }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
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
      JSON.stringify({ error: message || "No momento não foi possível gerar a resposta. Tente novamente em alguns minutos." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

export const config = {
  path: ["/api/gemini", "/.netlify/functions/gemini"]
};
