import { GoogleGenAI } from "@google/genai";

// O modelo deve ser configurado no ambiente do deploy para bater com a chave Gemini ativa.
// Não fixar um nome de modelo no código do cliente.
export const getApiKey = (): string => {
  return '';
};

export const hasApiKey = (): boolean => {
  return true;
};

export const saveApiKey = (_key: string) => {
  // sem efeito; a chave não deve ser salva no navegador
};

export const removeApiKey = () => {
  // sem efeito; a chave não deve ser gerenciada no cliente
};

// Função central de requisição à Inteligência Artificial (executa no servidor seguro)
export const handleAiRequest = async (prompt: string, model?: string): Promise<string> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 75_000);

  const payload = model ? { prompt, model } : { prompt };
  const endpoints = ['/api/gemini', '/.netlify/functions/gemini'];

  let lastError = '';

  try {
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        const contentType = response.headers.get('content-type') || '';

        // Se a rota foi capturada pelo SPA e retornou HTML, tenta o endpoint direto
        if (contentType.includes('text/html')) {
          console.warn(`Endpoint ${endpoint} retornou HTML (redirecionamento do SPA). Tentando próximo endpoint...`);
          lastError = `O endpoint ${endpoint} retornou HTML em vez de JSON da IA`;
          continue;
        }

        if (response.ok) {
          const data = await response.json();
          return data.text || "Sem resposta da IA.";
        }

        const errData = await response.json().catch(() => null);
        if (errData?.error) {
          const errorMessage = String(errData.error);
          const lower = errorMessage.toLowerCase();
          const isGeminiBusy = lower.includes('temporariamente ocupada') ||
            lower.includes('high demand') ||
            lower.includes('unavailable') ||
            lower.includes('tente novamente em alguns minutos');

          console.error("Erro retornado pelo backend Gemini:", errData.error);

          if (isGeminiBusy) {
            return 'A IA está temporariamente ocupada. Tente novamente em alguns minutos.';
          }

          return `Erro na IA: ${errorMessage}`;
        }

        lastError = `Status ${response.status} ao consultar ${endpoint}`;
      } catch (err: any) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return "Erro na IA: A resposta demorou mais de 1 minuto. Simplifique o pedido ou tente novamente.";
        }
        lastError = err?.message || 'Erro de rede';
      }
    }

    return `Erro na IA: Não foi possível conectar ao servidor da IA (${lastError}). Verifique se a variável GEMINI_API_KEY está configurada no Netlify (Site configuration -> Environment variables).`;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const generateLessonPlan = async (
  topic: string, 
  gradeLevel: string,
  duration: string
): Promise<string> => {
  const prompt = `
    Atue como um coordenador pedagógico de excelência. Crie um plano de aula detalhado.
    Tema: ${topic} | Série: ${gradeLevel} | Duração: ${duration}
    
    ESTRUTURA OBRIGATÓRIA (Use Markdown e Emojis):
    
    ## 🎯 Objetivos de Aprendizagem (BNCC)
    (Liste em tópicos claros)

    ## 📝 Materiais Necessários
    (Lista simples)

    ## 🚀 Introdução
    (Como iniciar a aula e engajar os alunos)

    ## 🧠 Desenvolvimento
    (O passo-a-passo da atividade principal)

    ## 🏁 Avaliação/Fixação
    (Como verificar o aprendizado)

    ## 💡 Adaptação e Inclusão
    (Uma dica para alunos com dificuldade)
  `;
  return handleAiRequest(prompt);
};

export const generateWeeklyPlan = async (
  topic: string,
  gradeLevel: string
): Promise<string> => {
  const prompt = `
    Crie um Planejamento Semanal (Segunda a Sexta) para a turma ${gradeLevel} com o tema central "${topic}".
    
    ESTRUTURA VISUAL OBRIGATÓRIA (Markdown):
    Não use tabelas. Use a estrutura abaixo para cada dia.
    
    ## 📅 Segunda-feira
    * **🎯 Foco do Dia:** [Resumo]
    * **✨ Atividade Principal:** [Descrição]
    * **⚡ Objetivo Rápido:** [Habilidade trabalhada]
    
    ---
    
    ## 📅 Terça-feira
    * **🎯 Foco do Dia:** [Resumo]
    * **✨ Atividade Principal:** [Descrição]
    * **⚡ Objetivo Rápido:** [Habilidade trabalhada]
    
    ---
    (Repita para Quarta, Quinta e Sexta)
    ---
    
    ## 🍎 Dicas para o Professor
    * [Dica 1]
    * [Dica 2]
  `;
  return handleAiRequest(prompt);
};

export const generateLearningObjectives = async (
  topic: string,
  gradeLevel: string
): Promise<string> => {
  const prompt = `
    Liste 5 objetivos de aprendizagem claros e alinhados à BNCC para o tema "${topic}" focado na série ${gradeLevel}.
    
    Formatação:
    ## 🎯 Objetivos Principais
    Use listas com marcadores (*).
    Destaque em **negrito** a habilidade principal de cada objetivo.
  `;
  return handleAiRequest(prompt);
};

export const suggestActivities = async (
  ageGroup: string,
  theme: string
): Promise<string> => {
  const prompt = `
    Sugira 3 atividades práticas, lúdicas e criativas para alunos de ${ageGroup} sobre o tema "${theme}".
    
    Para cada atividade use a estrutura:
    ## 🎲 1. [Nome da Atividade]
    * **📦 Materiais:** [Lista]
    * **👣 Como fazer:** [Descrição passo a passo]
    * **🎓 Objetivo:** [O que a criança aprende]
    
    ---
  `;
  return handleAiRequest(prompt);
};

export const analyzeStudentIntervention = async (
  studentName: string,
  age: number,
  attendanceRate: number,
  needs: string,
  patternDescription: string
): Promise<string> => {
  const prompt = `
    Atue como um psicopedagogo experiente.
    Analise o caso do aluno: ${studentName} (${age} anos), Frequência: ${attendanceRate}%, Obs: ${needs}.
    Contexto: ${patternDescription}

    Gere um relatório estruturado em Markdown:

    ## 🔍 1. Diagnóstico de Risco
    Classifique a gravidade e levante 2 hipóteses.

    ## 📋 2. Plano de Ação (3 Estratégias)
    O que o professor deve fazer amanhã?

    ## 💬 3. Modelo de Mensagem para Família
    Escreva um texto curto e acolhedor para enviar aos pais (WhatsApp).

    ## 🤝 4. Acolhimento no Retorno
    Uma ideia para receber o aluno sem que ele se sinta cobrado.
  `;
  return handleAiRequest(prompt);
};

// Nova função para gerar relatórios automáticos de desempenho
export const generateStudentPerformanceReport = async (
  studentName: string,
  scenario: 'EXCELLENT' | 'CRITICAL' | 'IMPROVING' | 'DECLINING',
  metrics: { averageGrade: number, attendance: number, subjectsSummary: string }
): Promise<string> => {
  
  let context = "";
  if (scenario === 'EXCELLENT') context = "O aluno é destaque positivo. Tem notas altas e frequência exemplar. O relatório deve ser de Elogio e Incentivo à Continuidade.";
  if (scenario === 'CRITICAL') context = "O aluno está em situação crítica. Notas baixas e/ou faltas excessivas. O relatório deve ser de Alerta, Preocupação e Chamado à Parceria com a Família.";
  if (scenario === 'IMPROVING') context = "O aluno está mostrando melhora (esforço notável, frequência subindo ou notas reagindo). O relatório deve ser de Reconhecimento do Esforço e Motivação.";
  if (scenario === 'DECLINING') context = "O aluno está caindo de rendimento (notas piorando ou frequência diminuindo recentemente). O relatório deve ser de Investigação e Apoio para reverter o quadro.";

  const prompt = `
    Atue como um professor experiente e empático. Escreva um Relatório Individual (Parecer Pedagógico) para o aluno ${studentName}.
    
    DADOS DO ALUNO:
    - Média Geral: ${metrics.averageGrade.toFixed(1)}
    - Frequência Global: ${metrics.attendance}%
    - Resumo das Matérias: ${metrics.subjectsSummary}
    
    CENÁRIO IDENTIFICADO: ${scenario}
    DIRETRIZ: ${context}

    Escreva um texto corrido (sem tópicos excessivos, estilo carta ou parecer formal), com cerca de 3 a 4 parágrafos.
    
    1. Comece descrevendo o desempenho atual com base nos dados.
    2. Analise o comportamento/frequência (se for bom, elogie; se for ruim, aponte o impacto pedagógico).
    3. Finalize com encaminhamentos ou uma mensagem para a família/aluno.
    
    Não use Markdown complexo, apenas texto corrido e parágrafos bem estruturados. Use tom profissional mas acessível.
  `;

  return handleAiRequest(prompt);
};

export const generatePedagogicalReinforcement = async (
  studentName: string,
  attendance: number,
  observations: string,
  subjectsSummary: string
): Promise<string> => {
  const prompt = `
    Atue como coordenador pedagógico. Sugira atividades práticas de reforço para o aluno ${studentName}.

    DADOS:
    - Frequência: ${attendance}%
    - Desempenho nas matérias: ${subjectsSummary || 'Não informado'}
    - Observações do professor: ${observations || 'Nenhuma observação registrada'}

    Gere uma resposta curta, personalizada e utilizável na próxima semana.
    Estrutura obrigatória:
    ## Dificuldades prioritárias
    Liste até 2 dificuldades demonstradas pelos dados.

    ## Atividades de reforço
    Sugira 3 atividades simples, com duração aproximada, materiais necessários e objetivo pedagógico.

    ## Acompanhamento do professor
    Descreva 2 indicadores objetivos para avaliar a evolução.

    Não faça diagnósticos clínicos. Use linguagem acolhedora, prática e adequada à escola.
  `;
  return handleAiRequest(prompt);
};

export const correctText = async (text: string): Promise<string> => {
  const prompt = `
    Aja como um professor de gramática rigoroso, porém construtivo.
    Analise o texto a seguir, identifique erros ortográficos, gramaticais ou de coesão formal, e reescreva-o de forma clara e profissional, mantendo a essência original.
    
    TEXTO ORIGINAL:
    "${text}"
    
    Retorne o conteúdo formatado em Markdown com a seguinte estrutura:
    
    ## ✨ Texto Revisado e Corrigido
    [O texto completo e corrigido aqui]
    
    ---
    
    ## 🔍 Pontos de Atenção (O que foi ajustado)
    * Detalhe 1
    * Detalhe 2
  `;
  return handleAiRequest(prompt);
};

export const generateCommunication = async (
  category: string,
  className: string,
  teacherName: string,
  customContext: string
): Promise<string> => {
  const categoryDescriptions: Record<string, string> = {
    meeting: 'Convocação para Reunião de Pais e Responsáveis. Tom formal e acolhedor, informando data/horário/local e a importância da presença.',
    absence: 'Aviso sobre faltas ou ausências do(a) aluno(a). Tom respeitoso e preocupado, chamando a família para parceria no acompanhamento.',
    congratulation: 'Parabéns pelo bom desempenho, evolução ou comportamento exemplar do(a) aluno(a). Tom caloroso e motivacional.',
    event: 'Comunicado sobre evento escolar (festa, excursão, feira cultural, apresentação). Tom convidativo e informativo com detalhes práticos.',
    general: 'Comunicado geral da escola ou turma. Tom profissional e claro.'
  };

  const categoryContext = categoryDescriptions[category] || categoryDescriptions.general;

  const prompt = `
    Atue como um(a) professor(a) experiente e empático(a) que precisa enviar um comunicado aos pais/responsáveis.

    TIPO DE COMUNICADO: ${categoryContext}
    TURMA: ${className}
    PROFESSOR(A): ${teacherName}
    ${customContext ? `CONTEXTO ADICIONAL DO PROFESSOR: ${customContext}` : ''}

    REGRAS IMPORTANTES:
    - Escreva em texto corrido, como uma mensagem formal porém acessível para WhatsApp.
    - NÃO use Markdown, cabeçalhos ou formatação complexa. Apenas texto simples com quebras de linha.
    - Comece com uma saudação ("Prezados pais e responsáveis" ou similar).
    - Inclua as informações essenciais de forma clara e organizada.
    - Finalize com uma despedida cordial e o nome do professor(a).
    - Use emojis de forma moderada e profissional (máximo 3-4 no texto inteiro).
    - O texto deve ter entre 100 e 250 palavras.
    - Se for reunião ou evento, deixe espaços para [DATA], [HORÁRIO], [LOCAL] que o professor preencherá.
  `;
  return handleAiRequest(prompt);
};

/**
 * Gera dicas práticas de intervenção pedagógica para um aluno específico
 */
export const generateInterventionTips = async (
  studentName: string,
  scenario: 'EXCELLENT' | 'CRITICAL' | 'IMPROVING' | 'DECLINING',
  metrics: { averageGrade: number, attendance: number, subjectsSummary: string }
): Promise<string> => {
  const prompt = `
    Atue como um coordenador pedagógico experiente e especialista em educação.

    Crie 3 dicas práticas de intervenção pedagógica para o aluno: ${studentName} (Cenário: ${scenario}).
    Métricas: Média: ${metrics.averageGrade.toFixed(1)} | Frequência: ${metrics.attendance}% | Disciplinas: ${metrics.subjectsSummary}

    Use a estrutura em Markdown:

    ## 🎯 Dicas Práticas de Intervenção
    1. **Atividade:** [Nome simples]
    * **Como aplicar:** [Passo a passo curto]
    * **Material:** [Itens necessários, se houver]
    * **Objetivo:** [O que se espera alcançar]

    2. **Atividade:** [Outra atividade]
    * **Como aplicar:** [Passo a passo curto]
    * **Objetivo:** ...

    3. **Manejo em Sala:** [Dica comportamental/social]
    Seja prático, acolhedor e eficiente.
  `;
  return handleAiRequest(prompt);
};

/**
 * Gera um resumo matinal acolhedor para o professor
 */
export const generateMorningSummary = async (
  totalStudents: number,
  totalClasses: number,
  lowAttendanceCount: number,
  lowGradesCount: number
): Promise<string> => {
  const prompt = `
    Atue como um assistente pedagógico acolhedor e motivador para um professor.
    Gere um resumo matinal curto e inspirador (máximo 3-4 linhas) com base nos dados da escola:

    - Total de Alunos: ${totalStudents}
    - Total de Turmas: ${totalClasses}
    - Alunos com Frequência Crítica (<75%): ${lowAttendanceCount}
    - Alunos com Notas Baixas (<6.0): ${lowGradesCount}

    Seja positivo, encorajador e pontue o que precisa de foco hoje sem ser alarmista. Sem Markdown, apenas texto corrido e emojis moderados.
  `;
  return handleAiRequest(prompt);
};