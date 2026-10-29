import { GoogleGenAI } from '@google/genai';

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
        const { prompt, model = 'gemini-2.0-flash' } = JSON.parse(body || '{}');

        if (!prompt) {
          res.status(400).json({ error: 'Prompt é obrigatório.' });
          return;
        }

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });

        res.status(200).json({ text: response.text || 'Sem resposta da IA.' });
      } catch (error) {
        console.error('Erro na API Gemini do Vercel:', error);
        const message = error?.message || 'Erro ao consultar a Inteligência Artificial.';
        res.status(500).json({ error: message });
      }
    });
  } catch (error) {
    console.error('Erro ao preparar a API Gemini do Vercel:', error);
    const message = error?.message || 'Erro ao consultar a Inteligência Artificial.';
    res.status(500).json({ error: message });
  }
}
