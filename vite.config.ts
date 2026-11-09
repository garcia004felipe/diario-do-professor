import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { GoogleGenAI } from '@google/genai';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    server: {
      port: 3001,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'netlify-functions-dev-proxy',
        configureServer(server) {
          const handleGeminiRequest = async (req: any, res: any) => {
            if (req.method === 'OPTIONS') {
              res.statusCode = 204;
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.end();
              return;
            }

            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Método não permitido' }));
              return;
            }

            let body = '';
            req.on('data', chunk => {
              body += chunk;
            });

            req.on('end', async () => {
              try {
                const { prompt, model } = JSON.parse(body || '{}');
                const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
                if (!apiKey) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(
                    JSON.stringify({
                      error: 'A chave GEMINI_API_KEY deve ser configurada no ambiente do servidor/deploy. Não é necessário pedir uma chave para cada usuário no navegador.'
                    })
                  );
                  return;
                }

                const ai = new GoogleGenAI({ apiKey });
                let aiRes;
                let lastError;
                const discovered: string[] = [];
                const pager = await ai.models.list({ config: { pageSize: 100 } });

                for await (const item of pager as any) {
                  const name = String(item?.name || '').replace(/^models\//, '');
                  if (
                    name.startsWith('gemini-') &&
                    (!item?.supportedActions ||
                      item.supportedActions.some((action: string) =>
                        String(action).toLowerCase().includes('generatecontent')
                      )) &&
                    !discovered.includes(name)
                  ) {
                    discovered.push(name);
                  }
                }

                const primaryModel =
                  discovered.find(name => name.includes('2.5-flash')) ||
                  discovered.find(name => name.includes('2.0-flash')) ||
                  discovered.find(name => name.includes('flash')) ||
                  discovered[0];

                if (!primaryModel) {
                  throw new Error('Nenhum modelo Gemini disponível nesta chave/projeto.');
                }

                for (const selectedModel of [primaryModel]) {
                  try {
                    aiRes = await ai.models.generateContent({ model: selectedModel, contents: prompt });
                    break;
                  } catch (error) {
                    lastError = error;
                  }
                }

                if (!aiRes) {
                  throw lastError;
                }
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ text: aiRes.text || '' }));
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Erro ao processar IA no servidor local' }));
              }
            });
          };

          server.middlewares.use('/api/gemini', handleGeminiRequest);
          server.middlewares.use('/.netlify/functions/gemini', handleGeminiRequest);
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom']
    }
  };
});
