import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Report, Student } from '../types';
import { X, Printer, AlertTriangle, Building, Activity, User, BookOpen, FileCheck, Download, Loader2 } from 'lucide-react';

interface ReportPdfViewerProps {
  report: Report;
  student?: Student;
  schoolName: string;
  teacherName: string;
  onClose: () => void;
}

export const ReportPdfViewer: React.FC<ReportPdfViewerProps> = ({ 
  report, 
  student, 
  schoolName, 
  teacherName, 
  onClose 
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Bloqueia scroll do corpo principal quando modal abre
    document.body.classList.add('scroll-locked');
    return () => {
      document.body.classList.remove('scroll-locked');
    };
  }, []);
  
  const handlePrint = () => {
    setTimeout(() => {
        window.print();
    }, 50);
  };

  const handleDownload = async () => {
    if (!student) return;
    
    try {
      setIsDownloading(true);
      
      // Delay para garantir renderização
      await new Promise(resolve => setTimeout(resolve, 300));

      const element = document.getElementById('report-content');
      if (!element) throw new Error('Elemento não encontrado');
      
      // Acessa a biblioteca global
      const html2pdf = (window as any).html2pdf;
      
      if (typeof html2pdf !== 'function') {
        throw new Error('Biblioteca html2pdf não carregou corretamente. Verifique sua conexão.');
      }

      const sanitizedName = student.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `relatorio_${sanitizedName}_${report.date}.pdf`;

      // CONFIGURAÇÃO DEFINITIVA PARA A4
      const opt = {
        // Margens mínimas para evitar corte em impressoras domésticas
        margin: [5, 0, 5, 0], 
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, // Alta resolução (Retina)
          useCORS: true, 
          logging: false,
          scrollY: 0,
          scrollX: 0,
          // Removemos windowWidth forçado e confiamos no CSS 'width: 210mm' do elemento
          // Isso garante que o canvas tenha o tamanho exato do papel
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        }
      };

      await html2pdf().set(opt).from(element).save();
      
    } catch (err: any) {
      console.error('Erro na geração do PDF:', err);
      alert('Não foi possível gerar o arquivo automaticamente.\n\nTente clicar em "Imprimir" e selecione "Salvar como PDF".');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!student || !mounted) return null;

  const content = (
    // Z-index altíssimo para garantir sobreposição total
    <div className="fixed inset-0 z-[9999] bg-zinc-900 flex flex-col print:bg-white print:static print:block animate-in fade-in duration-200">
      
      {/* Barra de Controles - Sólida */}
      <div className="flex-none flex justify-between items-center p-4 bg-zinc-900 border-b border-zinc-800 print:hidden shadow-md z-10">
         <span className="text-white font-medium text-sm md:text-base flex items-center gap-2">
            <FileCheck size={18} className="text-brand-400" />
            <span className="hidden md:inline">Visualização de Impressão (A4)</span>
            <span className="md:hidden">Relatório A4</span>
         </span>
         <div className="flex gap-3">
            <button 
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2 text-xs md:text-sm font-bold disabled:opacity-50"
            >
              {isDownloading ? <Loader2 size={16} className="animate-spin"/> : <Download size={16} />} 
              {isDownloading ? 'Gerando...' : 'Baixar PDF'}
            </button>
            <button 
              onClick={handlePrint}
              disabled={isDownloading}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full backdrop-blur-md transition-transform hover:scale-105 flex items-center gap-2 text-xs md:text-sm font-bold disabled:opacity-50"
            >
              <Printer size={16} /> <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button 
              onClick={onClose}
              disabled={isDownloading}
              className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-md transition-transform hover:scale-105 disabled:opacity-50"
            >
              <X size={20} />
            </button>
         </div>
      </div>

      {/* Área de Scroll para o Documento */}
      <div className="flex-1 overflow-auto bg-zinc-800/50 p-4 md:p-8 flex justify-center print:p-0 print:overflow-visible">
        
        {/* Container A4 Fixo - O CSS inline garante as dimensões exatas */}
        <div 
            id="report-content"
            style={{ 
                width: '210mm', 
                minHeight: '297mm',
                marginLeft: 'auto',
                marginRight: 'auto',
                backgroundColor: 'white'
            }}
            className="shadow-2xl flex flex-col relative print:shadow-none print:m-0 print:w-full"
        >
            {/* Faixa Decorativa */}
            <div className="h-3 bg-brand-700 w-full print:bg-brand-700" />

            {/* Cabeçalho */}
            <header className="px-10 py-10 border-b-2 border-gray-100">
                <div className="flex justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-brand-50 border border-brand-100 rounded-lg flex items-center justify-center text-brand-800 shrink-0 print:border-gray-300">
                            <Building size={32} strokeWidth={1.5} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight font-sans">{schoolName}</h1>
                            <p className="text-sm text-gray-500 font-sans mt-0.5">Sistema de Gestão Escolar • Diário Digital</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="bg-brand-50 text-brand-800 text-xs font-bold px-3 py-1 uppercase tracking-widest rounded mb-2 inline-block print:border print:border-gray-200">
                            Relatório Individual
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-sans uppercase tracking-widest">Emissão</p>
                            <p className="text-sm font-bold text-gray-800 font-sans">{new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Corpo do Relatório */}
            <main className="flex-1 px-10 py-8 space-y-8">
                
                {/* 1. Identificação */}
                <section>
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                        <User size={16} className="text-brand-600" />
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-sans">Identificação do Aluno</h2>
                    </div>
                    
                    <div className="flex gap-6 bg-gray-50 p-6 rounded-lg border border-gray-200 print:bg-white print:border-gray-300">
                        <div className="shrink-0">
                             {student.photoUrl ? (
                                <img src={student.photoUrl} alt="Foto" className="w-28 h-28 object-cover rounded-full border-4 border-white shadow-sm grayscale-[10%]" />
                             ) : (
                                <div className="w-28 h-28 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                                    <User size={40} />
                                </div>
                             )}
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-4 font-sans">
                            <div>
                                <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wide">Nome do Aluno</span>
                                <span className="block text-lg font-bold text-gray-900">{student.name}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wide">Série / Idade</span>
                                <span className="block text-base text-gray-800">{student.age} anos</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wide">Professor(a)</span>
                                <span className="block text-base text-gray-800">{teacherName}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wide">Código</span>
                                <span className="block text-base text-gray-500 font-mono">#{report.id.slice(-6).toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. Métricas de Desempenho */}
                <section>
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                        <FileCheck size={16} className="text-brand-600" />
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-sans">Indicadores de Frequência</h2>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 border-l-4 border-brand-500 bg-white shadow-sm rounded-r-lg ring-1 ring-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase font-bold font-sans">Presença Global</p>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-3xl font-bold text-brand-900 font-sans">{report.attendanceRate}</span>
                                <span className="text-sm font-medium text-gray-500">%</span>
                            </div>
                        </div>
                        <div className="p-4 border-l-4 border-red-500 bg-white shadow-sm rounded-r-lg ring-1 ring-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase font-bold font-sans">Total de Faltas</p>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-3xl font-bold text-red-600 font-sans">{report.absencesCount}</span>
                                <span className="text-sm font-medium text-gray-500">dias</span>
                            </div>
                        </div>
                        <div className="p-4 border-l-4 border-gray-400 bg-white shadow-sm rounded-r-lg ring-1 ring-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase font-bold font-sans">Situação Atual</p>
                            <div className="mt-2">
                                <span className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                                    report.attendanceRate >= 75 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                    {report.attendanceRate >= 75 ? 'Regular' : 'Atenção'}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Detalhes (Grid) */}
                <section>
                     <div className="grid grid-cols-2 gap-8">
                        {/* Saúde */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                                <AlertTriangle size={16} className="text-brand-600" />
                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-sans">Saúde e Cuidados</h2>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-gray-50 p-3 rounded border border-gray-100">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Restrições Alimentares</p>
                                    <p className="text-sm font-medium text-gray-900">{report.dietaryRestrictions || 'Nenhuma registrada.'}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded border border-gray-100">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Observações Médicas / Comorbidades</p>
                                    <p className="text-sm font-medium text-gray-900">{report.comorbidities || 'Nenhuma registrada.'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Atividades */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                                <Activity size={16} className="text-brand-600" />
                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-sans">Atividades Complementares</h2>
                            </div>
                             {report.extraClassesSummary.length > 0 ? (
                                <ul className="space-y-2">
                                    {report.extraClassesSummary.map((activity, i) => (
                                        <li key={i} className="flex items-start gap-3 p-3 rounded bg-white border border-gray-100 shadow-sm">
                                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0"></div>
                                            <span className="text-sm text-gray-700 leading-snug">{activity}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="p-4 border border-dashed border-gray-300 rounded text-center">
                                    <p className="text-sm text-gray-400 italic">O aluno não participa de atividades no contraturno escolar.</p>
                                </div>
                            )}
                        </div>
                     </div>
                </section>

                {/* 4. Parecer Pedagógico */}
                <section className="flex-1">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                        <BookOpen size={16} className="text-brand-600" />
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-sans">Parecer Pedagógico Descritivo</h2>
                    </div>
                    <div className="bg-white p-8 border border-gray-200 rounded-lg text-gray-800 text-justify leading-relaxed text-base font-serif shadow-sm print:shadow-none print:border-gray-300 min-h-[150px]">
                        {report.observations}
                    </div>
                </section>
            </main>

            {/* Rodapé / Assinaturas */}
            <footer className="px-10 pb-12 mt-auto bg-gray-50 print:bg-white border-t border-gray-100">
                <div className="grid grid-cols-2 gap-12 mb-8">
                    <div className="text-center pt-8">
                        <div className="border-b border-gray-800 mb-3 w-3/4 mx-auto"></div>
                        <p className="text-sm font-bold text-gray-900 uppercase font-sans">{teacherName}</p>
                        <p className="text-xs text-gray-500 font-sans uppercase tracking-wide">Professor(a) Responsável</p>
                    </div>
                    <div className="text-center pt-8">
                        <div className="border-b border-gray-800 mb-3 w-3/4 mx-auto"></div>
                        <p className="text-sm font-bold text-gray-900 uppercase font-sans">Coordenação Pedagógica</p>
                        <p className="text-xs text-gray-500 font-sans uppercase tracking-wide">Visto / Carimbo da Escola</p>
                    </div>
                </div>
                
                <div className="text-center pt-4 border-t border-gray-200">
                    <p className="text-[10px] text-gray-400 font-sans uppercase tracking-widest">
                        Documento gerado digitalmente em {new Date().toLocaleString()} via Sistema Diário do Professor SaaS
                    </p>
                </div>
            </footer>
        </div>
      </div>
      
      {/* Estilos CSS Específicos para Impressão */}
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          
          body > * {
            display: none !important;
          }
          
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Esconde tudo, exceto o relatório */
          body {
            visibility: hidden;
          }
          
          #report-content, #report-content * {
            visibility: visible;
          }
          
          #report-content {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            width: 210mm !important; /* Força A4 na impressão nativa */
            min-height: 297mm !important;
          }
        }
      `}</style>
    </div>
  );
  
  // Renderiza no Portal (direto no body) para evitar conflitos de Z-Index com o Header/Sidebar
  return createPortal(content, document.body);
};