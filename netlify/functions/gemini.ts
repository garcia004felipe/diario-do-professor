import { GoogleGenAI } from "@google/genai";

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

    const selectedModel = model || process.env.GEMINI_MODEL || "gemini-3.8-flash";

    const ai = new GoogleGenAI({ apiKey });
    const response = await withGeminiRetry(async () => {
      return await ai.models.generateContent({
        model: selectedModel,
        contents: prompt,
      });
    }, 2);

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
