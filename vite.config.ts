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
          server.middlewares.use('/api/gemini', async (req, res) => {
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
                const availableModels = [];
                const pager = await ai.models.list({ config: { pageSize: 100 } });

                for await (const item of pager) {
                  const name = String(item?.name || '').replace(/^models\//, '');
                  if (
                    name.startsWith('gemini-') &&
                    (!item?.supportedActions ||
                      item.supportedActions.some(action =>
                        String(action).toLowerCase().includes('generatecontent')
                      ))
                  ) {
                    availableModels.push(name);
                  }
                }

                const selectedModel = availableModels.find(name => name.includes('2.5-flash'))
                  || availableModels.find(name => name.includes('2.0-flash'))
                  || availableModels.find(name => name.includes('flash'))
                  || availableModels[0];

                if (!selectedModel) {
                  throw new Error('Nenhum modelo Gemini compatível com geração de texto está disponível para este projeto.');
                }

                const aiRes = await ai.models.generateContent({ model: selectedModel, contents: prompt });
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ text: aiRes.text || '' }));
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Erro ao processar IA no servidor local' }));
              }
            });
          });
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
