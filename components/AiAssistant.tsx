import React, { useState, useEffect } from 'react';
import { 
  generateLessonPlan, 
  generateWeeklyPlan, 
  generateLearningObjectives, 
  suggestActivities, 
  analyzeStudentIntervention,
  correctText,
  saveApiKey,
  hasApiKey,
  removeApiKey,
  getApiKey
} from '../services/geminiService';
import { 
  Sparkles, BookOpen, Loader2, CalendarRange, Target, Gamepad2, AlertCircle, MessageSquare, Key, Save, Unlock, Library, Trash2, ArrowRight, Edit3, X, Check, SpellCheck
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { marked } from 'marked';
import { Student, AiGeneratedContent } from '../types';
import { DictationButton } from './DictationButton';

interface AiAssistantProps {
  students?: Student[];
  savedContents?: AiGeneratedContent[];
  onSaveContent?: (content: Omit<AiGeneratedContent, 'id' | 'createdAt'>) => void;
  onDeleteContent?: (id: string) => void;
}

type AiToolMode = 'LESSON_PLAN' | 'WEEKLY_PLAN' | 'OBJECTIVES' | 'ACTIVITIES' | 'STUDENT_ANALYSIS' | 'TEXT_CORRECTION' | 'LIBRARY';

export const AiAssistant: React.FC<AiAssistantProps> = ({ 
  students = [],
  savedContents = [],
  onSaveContent,
  onDeleteContent
}) => {
  const [activeMode, setActiveMode] = useState<AiToolMode>('WEEKLY_PLAN');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState(''); // Store title for saving
  
  // API Key Management State
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isKeyConfigured, setIsKeyConfigured] = useState(true);
  const [keyError, setKeyError] = useState('');

  // Form States
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('');
  const [duration, setDuration] = useState('50 minutos');
  const [ageGroup, setAgeGroup] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');

  // View Saved Content
  const [viewingSavedContent, setViewingSavedContent] = useState<AiGeneratedContent | null>(null);

  // Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  const [editableContent, setEditableContent] = useState('');

  useEffect(() => {
    setIsKeyConfigured(true);
  }, []);

  const handleSaveKey = () => {
    setNeedsApiKey(false);
    setApiKeyInput('');
    setKeyError('');
    alert('A chave da IA deve ser configurada no servidor do aplicativo.');
  };

  const handleRemoveKey = () => {
    removeApiKey();
    setIsKeyConfigured(false);
    setResult('');
  };

  const handleSaveResult = () => {
    if (!result || !onSaveContent) return;
    
    // Determine type based on active mode (excluding LIBRARY)
    const type = activeMode === 'LIBRARY' ? 'LESSON_PLAN' : activeMode;
    
    const title = generatedTitle || `Conteúdo Gerado - ${new Date().toLocaleDateString()}`;

    onSaveContent({
        title,
        type: type as any,
        content: result
    });
    alert('Conteúdo salvo na biblioteca!');
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult('');
    setKeyError('');
    setViewingSavedContent(null);
    setIsEditing(false);

    let tempTitle = '';

    try {
      let response = '';
      
      switch (activeMode) {
        case 'LESSON_PLAN':
          if (!topic || !grade) break;
          tempTitle = `Plano: ${topic} (${grade})`;
          response = await generateLessonPlan(topic, grade, duration);
          break;
        case 'WEEKLY_PLAN':
           if (!topic || !grade) break;
           tempTitle = `Semanal: ${topic} (${grade})`;
           response = await generateWeeklyPlan(topic, grade);
           break;
        case 'OBJECTIVES':
           if (!topic || !grade) break;
           tempTitle = `Objetivos: ${topic}`;
           response = await generateLearningObjectives(topic, grade);
           break;
        case 'ACTIVITIES':
           if (!ageGroup || !topic) break;
           tempTitle = `Atividades: ${topic}`;
           response = await suggestActivities(ageGroup, topic);
           break;
        case 'STUDENT_ANALYSIS':
           const student = students.find(s => s.id === selectedStudentId);
           if (student) {
             tempTitle = `Intervenção: ${student.name}`;
             response = await analyzeStudentIntervention(
               student.name, 
               student.age, 
               student.attendanceRate, 
               student.needs,
               additionalContext || "Não foram informados padrões específicos de falta."
             );
           } else {
             response = "Por favor, selecione um aluno válido.";
           }
           break;
        case 'TEXT_CORRECTION':
           if (!additionalContext) break; // Usando additionalContext para o texto a ser revisado
           tempTitle = `Revisão de Texto`;
           response = await correctText(additionalContext);
           break;
      }

      setGeneratedTitle(tempTitle);

      if (response === 'MISSING_KEY' || response === 'INVALID_KEY') {
        setNeedsApiKey(false);
        setIsKeyConfigured(true);
        setResult('A IA está configurada no servidor da aplicação. Solicite ao administrador que configure a variável GEMINI_API_KEY no ambiente do deploy.');
      } else {
        setResult(response);
      }

    } catch (error) {
      setResult("Erro ao gerar conteúdo. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const getToolTitle = () => {
    if (activeMode === 'LIBRARY') {
        return viewingSavedContent ? viewingSavedContent.title : 'Minha Biblioteca';
    }
    switch (activeMode) {
      case 'LESSON_PLAN': return 'Plano de Aula Detalhado';
      case 'WEEKLY_PLAN': return 'Planejamento Semanal';
      case 'OBJECTIVES': return 'Gerador de Objetivos (BNCC)';
      case 'ACTIVITIES': return 'Sugestão de Atividades';
      case 'STUDENT_ANALYSIS': return 'Intervenção de Frequência & Desempenho';
      case 'TEXT_CORRECTION': return 'Revisão e Correção de Textos';
      default: return 'Ferramenta IA';
    }
  };

  const renderFormInputs = () => {
    switch (activeMode) {
      case 'LESSON_PLAN':
      case 'WEEKLY_PLAN':
      case 'OBJECTIVES':
        return (
          <>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Tema / Conteúdo</label>
                <DictationButton onResult={(t) => setTopic(prev => prev ? prev + ' ' + t : t)} className="w-8 h-8" />
              </div>
              <input 
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Sistema Solar, Alfabetização, Frações..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano / Série</label>
              <select 
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="">Selecione...</option>
                <optgroup label="📗 Educação Infantil">
                  <option value="Educação Infantil (3-5 anos)">Ed. Infantil (3-5 anos)</option>
                </optgroup>
                <optgroup label="📗 Fundamental I (1º ao 5º ano)">
                  <option value="1º Ano Fundamental">1º Ano Fundamental</option>
                  <option value="2º Ano Fundamental">2º Ano Fundamental</option>
                  <option value="3º Ano Fundamental">3º Ano Fundamental</option>
                  <option value="4º Ano Fundamental">4º Ano Fundamental</option>
                  <option value="5º Ano Fundamental">5º Ano Fundamental</option>
                </optgroup>
                <optgroup label="📘 Fundamental II (6º ao 9º ano)">
                  <option value="6º Ano Fundamental">6º Ano Fundamental</option>
                  <option value="7º Ano Fundamental">7º Ano Fundamental</option>
                  <option value="8º Ano Fundamental">8º Ano Fundamental</option>
                  <option value="9º Ano Fundamental">9º Ano Fundamental</option>
                </optgroup>
                <optgroup label="📕 Ensino Médio">
                  <option value="1ª Série do Ensino Médio">1ª Série do Ensino Médio</option>
                  <option value="2ª Série do Ensino Médio">2ª Série do Ensino Médio</option>
                  <option value="3ª Série do Ensino Médio">3ª Série do Ensino Médio</option>
                </optgroup>
              </select>
            </div>
            {activeMode === 'LESSON_PLAN' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Duração</label>
                  <DictationButton onResult={(t) => setDuration(prev => prev ? prev + ' ' + t : t)} className="w-8 h-8" />
                </div>
                <input 
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            )}
          </>
        );

      case 'ACTIVITIES':
        return (
          <>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Tema da Atividade</label>
                <DictationButton onResult={(t) => setTopic(prev => prev ? prev + ' ' + t : t)} className="w-8 h-8" />
              </div>
              <input 
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Coordenação Motora, Cores, Matemática..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Faixa Etária</label>
              <select 
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="">Selecione...</option>
                <optgroup label="📗 Educação Infantil">
                  <option value="Bebês (0-1 ano)">Bebês (0-1 ano)</option>
                  <option value="Crianças Bem Pequenas (2-3 anos)">Crianças Bem Pequenas (2-3 anos)</option>
                  <option value="Crianças Pequenas (4-5 anos)">Crianças Pequenas (4-5 anos)</option>
                </optgroup>
                <optgroup label="📗 Fundamental I">
                  <option value="6-8 anos (1º ao 3º ano)">6-8 anos (1º ao 3º ano)</option>
                  <option value="9-11 anos (4º ao 5º ano)">9-11 anos (4º ao 5º ano)</option>
                </optgroup>
                <optgroup label="📘 Fundamental II">
                  <option value="11-12 anos (6º e 7º ano)">11-12 anos (6º e 7º ano)</option>
                  <option value="13-14 anos (8º e 9º ano)">13-14 anos (8º e 9º ano)</option>
                </optgroup>
                <optgroup label="📕 Ensino Médio">
                  <option value="15-17 anos (Ensino Médio)">15-17 anos (Ensino Médio)</option>
                </optgroup>
              </select>
            </div>
          </>
        );

      case 'STUDENT_ANALYSIS':
        return (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
              <p className="flex items-center gap-2 font-semibold"><AlertCircle size={16}/> Recuperação de Frequência</p>
              <p className="mt-1">A IA analisará o perfil do aluno para sugerir estratégias de engajamento e modelos de contato com a família.</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Aluno</label>
              <select 
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="">Selecione um aluno...</option>
                {students.length > 0 && <optgroup label="Todos os Alunos">
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                       {s.name} ({s.attendanceRate}% freq.)
                    </option>
                  ))}
                </optgroup>}
              </select>
            </div>

            <div className="mt-4">
              <div className="flex justify-between items-center mb-1">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MessageSquare size={16} className="text-gray-400"/>
                  Contexto / Padrão de Faltas (Opcional)
                </label>
                <DictationButton onResult={(t) => setAdditionalContext(prev => prev ? prev + ' ' + t : t)} className="w-8 h-8" />
              </div>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                rows={3}
                placeholder="Ex: Aluno falta todas as sextas-feiras; Família relatou problemas de saúde; Desinteresse nas aulas de matemática..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Quanto mais detalhes sobre o padrão das faltas, melhor a sugestão da IA.</p>
            </div>
          </>
        );

      case 'TEXT_CORRECTION':
        return (
          <>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4 text-sm text-purple-800">
              <p className="flex items-center gap-2 font-semibold"><SpellCheck size={16}/> Corretor e Revisor Ortográfico</p>
              <p className="mt-1">Use a voz para ditar ou digite um texto para a IA revisar a gramática, ortografia e nível de formalidade.</p>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MessageSquare size={16} className="text-gray-400"/>
                  Texto a ser revisado
                </label>
                <DictationButton onResult={(t) => setAdditionalContext(prev => prev ? prev + ' ' + t : t)} className="w-8 h-8" />
              </div>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                rows={6}
                required
                placeholder="Cole ou dite o bilhete para os pais, a orientação da prova ou um relatório importante..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
              />
            </div>
          </>
        );
    }
  };

  // A IA usa apenas o backend central da aplicação; não há coleta de chave no navegador.
  if (needsApiKey) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] p-4 bg-gray-50 rounded-xl">
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-gray-200">
          <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">IA configurada no servidor</h2>
          <p className="text-gray-500 mb-6 text-sm">
            A chave do Gemini fica no ambiente de produção do aplicativo e não é solicitada para cada professor.
          </p>
          <button
            onClick={() => setNeedsApiKey(false)}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md"
          >
            Voltar para a Central IA
          </button>
        </div>
      </div>
    );
  }

  // Determine what content to show: Live Result vs Library Saved Content
  const displayedContent = viewingSavedContent ? viewingSavedContent.content : result;

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6">
      
      {/* Sidebar de Ferramentas */}
      <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 flex flex-col gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
           <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
             <Sparkles className="text-brand-600" size={20}/> 
             Ferramentas IA
           </h2>
           
           <div className="flex flex-col gap-2">
             <button 
               onClick={() => { setActiveMode('WEEKLY_PLAN'); setViewingSavedContent(null); }}
               className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                 activeMode === 'WEEKLY_PLAN' ? 'bg-brand-50 text-brand-700 font-medium' : 'hover:bg-gray-50 text-gray-600'
               }`}
             >
               <CalendarRange size={18} /> Planejamento Semanal
             </button>
             <button 
               onClick={() => { setActiveMode('OBJECTIVES'); setViewingSavedContent(null); }}
               className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                 activeMode === 'OBJECTIVES' ? 'bg-brand-50 text-brand-700 font-medium' : 'hover:bg-gray-50 text-gray-600'
               }`}
             >
               <Target size={18} /> Objetivos de Aula
             </button>
             <button 
               onClick={() => { setActiveMode('ACTIVITIES'); setViewingSavedContent(null); }}
               className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                 activeMode === 'ACTIVITIES' ? 'bg-brand-50 text-brand-700 font-medium' : 'hover:bg-gray-50 text-gray-600'
               }`}
             >
               <Gamepad2 size={18} /> Banco de Atividades
             </button>
             <button 
               onClick={() => { setActiveMode('LESSON_PLAN'); setViewingSavedContent(null); }}
               className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                 activeMode === 'LESSON_PLAN' ? 'bg-brand-50 text-brand-700 font-medium' : 'hover:bg-gray-50 text-gray-600'
               }`}
             >
               <BookOpen size={18} /> Plano Detalhado
             </button>
             <button 
               onClick={() => { setActiveMode('STUDENT_ANALYSIS'); setViewingSavedContent(null); }}
               className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                 activeMode === 'STUDENT_ANALYSIS' ? 'bg-amber-50 text-amber-700 font-medium' : 'hover:bg-gray-50 text-gray-600'
               }`}
             >
               <AlertCircle size={18} /> Frequência e Alerta
             </button>
             <button 
               onClick={() => { setActiveMode('TEXT_CORRECTION'); setViewingSavedContent(null); }}
               className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                 activeMode === 'TEXT_CORRECTION' ? 'bg-purple-50 text-purple-700 font-medium' : 'hover:bg-gray-50 text-gray-600'
               }`}
             >
               <SpellCheck size={18} /> Corretor IA
             </button>
           </div>
           
           <div className="mt-4 pt-4 border-t border-gray-100">
             <button 
               onClick={() => { setActiveMode('LIBRARY'); setViewingSavedContent(null); }}
               className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                 activeMode === 'LIBRARY' ? 'bg-purple-50 text-purple-700 font-medium' : 'hover:bg-gray-50 text-gray-600'
               }`}
             >
               <Library size={18} /> Meus Salvos
             </button>
           </div>
        </div>

        {/* Input Area (Only visible for generation modes) */}
        {activeMode !== 'LIBRARY' && !viewingSavedContent && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex-1 flex flex-col">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Parâmetros</h3>
            <form onSubmit={handleGenerate} className="space-y-4 flex-1">
              {renderFormInputs()}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
              >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                {isLoading ? 'Gerando...' : 'Gerar Resultado'}
              </button>
            </form>

            <div className="pt-4 border-t border-gray-100 mt-4 text-center">
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1">
                <Check size={12} /> Inteligência Artificial Ativa
              </span>
              {isKeyConfigured && (
                <button 
                  onClick={handleRemoveKey}
                  className="text-xs text-gray-400 hover:text-red-500 flex items-center justify-center gap-1 mx-auto mt-2 transition-colors"
                >
                  <Unlock size={12} /> Redefinir Chave Personalizada
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Library List (Only visible in Library Mode) */}
        {activeMode === 'LIBRARY' && !viewingSavedContent && (
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex-1 overflow-y-auto overscroll-contain">
                <h3 className="text-sm font-bold text-gray-700 mb-3 px-2">Itens Salvos ({savedContents.length})</h3>
                {savedContents.length === 0 ? (
                    <p className="text-sm text-gray-400 italic px-2">Nenhum conteúdo salvo.</p>
                ) : (
                    <div className="space-y-2">
                        {savedContents.map(item => (
                            <div key={item.id} className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors group relative">
                                <div 
                                    className="cursor-pointer pr-8" 
                                    onClick={() => setViewingSavedContent(item)}
                                >
                                    <p className="font-medium text-gray-800 text-sm line-clamp-1">{item.title}</p>
                                    <p className="text-xs text-gray-500 mt-1">{new Date(item.createdAt).toLocaleDateString()}</p>
                                </div>
                                <button 
                                    onClick={() => onDeleteContent && onDeleteContent(item.id)}
                                    className="absolute right-2 top-3 text-gray-300 hover:text-red-500 p-1 rounded"
                                    title="Excluir"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
             </div>
        )}
      </div>

      {/* Output Area - Structure CHANGED here to prevent text scrolling behind header */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-[500px] h-[calc(100vh-140px)] overflow-hidden">
         
         {/* Fixed Header */}
         <div className="flex-none p-6 lg:p-8 pb-4 border-b border-gray-100 bg-white z-10">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    {viewingSavedContent && <button onClick={() => setViewingSavedContent(null)} className="md:hidden mr-2"><ArrowRight className="rotate-180" size={20}/></button>}
                    {getToolTitle()}
                </h2>
                <div className="flex gap-2">
                    {displayedContent && (
                        <button 
                            onClick={async () => {
                                if (isEditing) {
                                  // Save edits back to result
                                  setResult(editableContent);
                                  setIsEditing(false);
                                } else {
                                  // Start editing
                                  const html = await marked.parse(displayedContent);
                                  setEditableContent(html);
                                  setIsEditing(true);
                                }
                            }}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 shadow-sm ${isEditing ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                            {isEditing ? <Check size={14} /> : <Edit3 size={14} />}
                            {isEditing ? 'Concluir Edição' : 'Editar'}
                        </button>
                    )}
                    {displayedContent && !viewingSavedContent && (
                        <button 
                            onClick={handleSaveResult}
                            className="text-xs bg-brand-600 text-white hover:bg-brand-700 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 shadow-sm"
                        >
                            <Save size={14} /> Salvar
                        </button>
                    )}
                    {displayedContent && (
                    <button 
                        onClick={() => {navigator.clipboard.writeText(displayedContent); alert('Copiado!');}}
                        className="text-xs bg-brand-50 text-brand-600 hover:bg-brand-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >
                        Copiar
                    </button>
                    )}
                </div>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-6 lg:p-8 pt-4 overscroll-contain">
            {displayedContent ? (
              isEditing ? (
                 <div className="bg-white rounded-lg pb-12 h-full min-h-[400px]">
                   <ReactQuill 
                     theme="snow"
                     value={editableContent}
                     onChange={setEditableContent}
                     className="h-[300px] sm:h-[400px] mb-4"
                   />
                 </div>
              ) : (
                <div className="prose prose-brand prose-sm max-w-none pb-20">
                  <ReactMarkdown 
                      components={{
                          h1: ({node, ...props}) => <h1 className="text-2xl font-extrabold text-brand-800 mt-4 mb-4 border-b-2 border-brand-200 pb-2" {...props} />,
                          h2: ({node, ...props}) => (
                            <div className="mt-8 mb-4 pb-2 border-b border-gray-100">
                              <h2 className="text-xl font-bold text-brand-700 bg-brand-50/50 inline-block px-3 py-1 rounded-lg" {...props} />
                            </div>
                          ),
                          h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-gray-700 mt-6 mb-2 ml-1" {...props} />,
                          ul: ({node, ...props}) => <ul className="space-y-3 my-4" {...props} />,
                          ol: ({node, ...props}) => <ol className="space-y-3 my-4 list-decimal list-inside" {...props} />,
                          li: ({node, ...props}) => (
                            <li className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-gray-700 leading-relaxed" {...props} />
                          ),
                          strong: ({node, ...props}) => <strong className="font-bold text-brand-600 block mb-1" {...props} />,
                          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-amber-400 bg-amber-50 pl-4 py-3 italic my-6 rounded-r-lg text-amber-900 shadow-sm" {...props} />,
                          p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-gray-600" {...props} />,
                          hr: ({node, ...props}) => <hr className="my-8 border-t-2 border-dashed border-gray-200" {...props} />,
                          table: ({node, ...props}) => (
                              <div className="overflow-x-auto mb-4 border border-gray-200 rounded-lg shadow-sm">
                                  <table className="min-w-full divide-y divide-gray-200" {...props} />
                              </div>
                          ),
                          thead: ({node, ...props}) => <thead className="bg-gray-50" {...props} />,
                          th: ({node, ...props}) => <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap" {...props} />,
                          td: ({node, ...props}) => <td className="px-4 py-4 whitespace-normal text-sm text-gray-600 border-t border-gray-100" {...props} />,
                      }}
                  >
                      {displayedContent}
                  </ReactMarkdown>
                </div>
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 pb-20">
                {isLoading ? (
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mb-4 text-brand-400 mx-auto" />
                    <p className="text-gray-600 font-medium">A Inteligência Artificial está trabalhando...</p>
                    <p className="text-xs text-gray-400 mt-2 max-w-xs mx-auto">Isso pode levar alguns segundos dependendo da complexidade do pedido.</p>
                  </div>
                ) : (
                    activeMode === 'LIBRARY' ? (
                        <>
                            <Library className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium text-gray-400">Sua Biblioteca</p>
                            <p className="text-sm mt-2 max-w-xs text-center text-gray-400">Selecione um item salvo à esquerda para visualizar.</p>
                        </>
                    ) : (
                      <>
                        <Sparkles className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium text-gray-400">Selecione uma ferramenta ao lado</p>
                        <p className="text-sm mt-2 max-w-xs text-center text-gray-400">Preencha os dados e clique em Gerar para receber sugestões pedagógicas.</p>
                      </>
                    )
                )}
              </div>
            )}
         </div>
      </div>
    </div>
  );
};