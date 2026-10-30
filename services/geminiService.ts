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
  try {
    const payload = model ? { prompt, model } : { prompt };

    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      return data.text || "Sem resposta da IA.";
    }

    const errData = await response.json().catch(() => null);
    if (errData?.error) {
      const errorMessage = String(errData.error).toLowerCase();
      const isGeminiBusy = errorMessage.includes('temporariamente ocupada') ||
        errorMessage.includes('high demand') ||
        errorMessage.includes('unavailable') ||
        errorMessage.includes('tente novamente em alguns minutos');

      console.error("Erro retornado pelo backend Gemini:", errData.error);

      if (isGeminiBusy) {
        return 'A IA está temporariamente ocupada. Tente novamente em alguns minutos.';
      }

      return `Erro na IA: ${errData.error}`;
    }

    return "Erro na IA: O serviço de IA não respondeu corretamente. Configure a chave GEMINI_API_KEY no ambiente do servidor.";
  } catch (networkError) {
    console.warn("Função do servidor indisponível:", networkError);
    return "Erro na IA: O backend de IA não está disponível no servidor. Configure GEMINI_API_KEY no ambiente do deploy.";
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