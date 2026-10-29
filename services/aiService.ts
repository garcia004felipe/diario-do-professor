import { jsPDF } from 'jspdf';
import { Student } from '../types';
import { handleAiRequest } from './geminiService';

export const generateStudentFeedbackPDF = async (student: Student): Promise<{ success: boolean; message: string }> => {
  try {
    // Preparar o contexto do aluno
    const avgGrade = student.subjects && student.subjects.length > 0 
      ? (student.subjects.reduce((sum, s) => sum + s.grade, 0) / student.subjects.length).toFixed(1)
      : 'N/A';

    const prompt = `
      Atue como um professor empático e experiente de uma escola fundamental/média.
      Escreva um parecer descritivo de no máximo 2 parágrafos curtos sobre o aluno recém avaliado.
      
      Dados do aluno:
      - Nome: ${student.name}
      - Idade: ${student.age} anos
      - Necessidades Especiais: ${student.needs}
      - Média Geral de Notas (0 a 10): ${avgGrade}
      - Frequência Escolar: ${student.attendanceRate}%
      
      Diretrizes:
      1. Se as notas e frequência estiverem boas (ex: média >= 7, freq >= 75%), elogie e incentive a continuação.
      2. Se houver alertas (notas baixas ou faltas), seja compreensivo, sugira maior atenção, e mencione as necessidades especiais se houverem, de forma respeitosa e construtiva.
      3. Seja direto e encorajador. O texto será lido pelos pais e direção escolar.
      Não use emojis e mantenha a formatação limpa (apenas texto simples).
    `;

    const aiFeedback = await handleAiRequest(prompt, 'gemini-2.5-flash');

    if (!aiFeedback || aiFeedback.startsWith('Erro na IA:')) {
      throw new Error(aiFeedback || 'Não foi possível gerar o parecer no momento.');
    }

    // Gerar o PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(30, 41, 59); // bg-slate-800
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Analítico Individual', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 30, { align: 'center' });

    // Título do documento e Infos Gerais
    doc.setTextColor(51, 65, 85); // text-slate-700
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Identificação do Aluno', 20, 60);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    let cursorY = 70;
    
    doc.text(`Nome: ${student.name}`, 20, cursorY); cursorY += 8;
    doc.text(`Idade: ${student.age} anos`, 20, cursorY); cursorY += 8;
    doc.text(`Status: ${student.status === 'active' ? 'Ativo' : 'Inativo'}`, 20, cursorY); cursorY += 8;
    doc.text(`Média Geral: ${avgGrade}`, 20, cursorY); cursorY += 8;
    doc.text(`Frequência Global: ${student.attendanceRate}%`, 20, cursorY); cursorY += 8;
    if (student.needs !== 'Nenhuma') {
        doc.setTextColor(220, 38, 38);
        doc.text(`Atenção Especial: ${student.needs}`, 20, cursorY);
        doc.setTextColor(51, 65, 85);
    }
    cursorY += 15;

    // Linha separadora
    doc.setDrawColor(226, 232, 240); // gray-200
    doc.line(20, cursorY, pageWidth - 20, cursorY);
    cursorY += 15;

    // Parecer Gerado pela IA
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Parecer Descritivo (Gerado via Google Gemini IA)', 20, cursorY);
    cursorY += 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(71, 85, 105); // slate-600
    
    const splitFeedback = doc.splitTextToSize(aiFeedback.trim(), pageWidth - 40);
    doc.text(splitFeedback, 20, cursorY);

    // Save
    doc.save(`Relatorio_Analitico_${student.name.replace(/\s+/g, '_')}.pdf`);

    return { success: true, message: 'Parecer gerado e PDF baixado com sucesso!' };

  } catch (error: any) {
    console.error('Erro ao gerar feedback com IA:', error);
    return { success: false, message: error?.message || 'Erro ao gerar relatório com IA.' };
  }
};
