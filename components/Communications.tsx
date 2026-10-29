import React, { useState } from 'react';
import {
  MessageSquareText, Plus, Send, Copy, Trash2, Edit3, X, Check, Loader2,
  Sparkles, Calendar, AlertTriangle, Trophy, PartyPopper, FileText,
  Filter, Search, ChevronDown
} from 'lucide-react';
import { Communication, CommunicationCategory, ClassGroup, UserProfile } from '../types';
import { generateCommunication, hasApiKey } from '../services/geminiService';
import { DictationButton } from './DictationButton';

interface CommunicationsProps {
  communications: Communication[];
  classGroups: ClassGroup[];
  currentUser: UserProfile | null;
  onAdd: (comm: Omit<Communication, 'id' | 'createdAt'>) => void;
  onEdit: (comm: Communication) => void;
  onDelete: (id: string) => void;
}

const CATEGORIES: { key: CommunicationCategory; label: string; icon: React.ElementType; color: string; bgColor: string }[] = [
  { key: 'meeting', label: 'Reunião de Pais', icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
  { key: 'absence', label: 'Aviso de Falta', icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
  { key: 'congratulation', label: 'Parabéns', icon: Trophy, color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200' },
  { key: 'event', label: 'Evento Escolar', icon: PartyPopper, color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200' },
  { key: 'general', label: 'Geral', icon: FileText, color: 'text-slate-600', bgColor: 'bg-slate-50 border-slate-200' },
];

const getCategoryInfo = (key: string) => CATEGORIES.find(c => c.key === key) || CATEGORIES[4];

export const Communications: React.FC<CommunicationsProps> = ({
  communications,
  classGroups,
  currentUser,
  onAdd,
  onEdit,
  onDelete
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComm, setEditingComm] = useState<Communication | null>(null);
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [formClassId, setFormClassId] = useState<string>('');
  const [formCategory, setFormCategory] = useState<CommunicationCategory>('general');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [customContext, setCustomContext] = useState('');

  const openNewModal = () => {
    setEditingComm(null);
    setFormClassId(classGroups.length > 0 ? classGroups[0].id : '');
    setFormCategory('general');
    setFormTitle('');
    setFormContent('');
    setCustomContext('');
    setIsModalOpen(true);
  };

  const openEditModal = (comm: Communication) => {
    setEditingComm(comm);
    setFormClassId(comm.classId || '');
    setFormCategory(comm.category);
    setFormTitle(comm.title);
    setFormContent(comm.content);
    setCustomContext('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingComm(null);
  };

  const handleSave = () => {
    if (!formTitle.trim() || !formContent.trim()) return;

    const selectedClass = classGroups.find(c => c.id === formClassId);

    if (editingComm) {
      onEdit({
        ...editingComm,
        classId: formClassId || null,
        className: selectedClass?.name || 'Todas as turmas',
        title: formTitle,
        category: formCategory,
        content: formContent,
      });
    } else {
      onAdd({
        classId: formClassId || null,
        className: selectedClass?.name || 'Todas as turmas',
        title: formTitle,
        category: formCategory,
        content: formContent,
        sharedVia: [],
      });
    }
    closeModal();
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      const selectedClass = classGroups.find(c => c.id === formClassId);
      const className = selectedClass ? `${selectedClass.name} (${selectedClass.grade})` : 'Todas as turmas';
      const teacherName = currentUser?.name || 'Professor(a)';

      const result = await generateCommunication(formCategory, className, teacherName, customContext);

      if (result === 'MISSING_KEY' || result === 'INVALID_KEY') {
        alert('Chave de API inválida. Configure na Central IA.');
        return;
      }

      setFormContent(result);

      // Auto-generate title from category
      const catInfo = getCategoryInfo(formCategory);
      if (!formTitle.trim()) {
        setFormTitle(`${catInfo.label} - ${className}`);
      }
    } catch (error) {
      console.error('Erro ao gerar comunicado:', error);
      alert('Erro ao gerar o comunicado. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareWhatsApp = (comm: Communication) => {
    const text = encodeURIComponent(`*${comm.title}*\n\n${comm.content}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');

    // Track share
    if (!comm.sharedVia.includes('whatsapp')) {
      onEdit({ ...comm, sharedVia: [...comm.sharedVia, 'whatsapp'] });
    }
  };

  const handleCopyClipboard = async (comm: Communication) => {
    try {
      await navigator.clipboard.writeText(`${comm.title}\n\n${comm.content}`);
      alert('Comunicado copiado para a área de transferência!');

      if (!comm.sharedVia.includes('clipboard')) {
        onEdit({ ...comm, sharedVia: [...comm.sharedVia, 'clipboard'] });
      }
    } catch {
      alert('Não foi possível copiar. Tente novamente.');
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este comunicado?')) {
      onDelete(id);
    }
  };

  // Filters
  const filtered = communications.filter(c => {
    if (filterClass !== 'all' && c.classId !== filterClass) return false;
    if (filterCategory !== 'all' && c.category !== filterCategory) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return c.title.toLowerCase().includes(term) || c.content.toLowerCase().includes(term);
    }
    return true;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MessageSquareText className="text-brand-600" size={24} />
            Comunicados
          </h2>
          <p className="text-sm text-gray-500 mt-1">Crie e compartilhe comunicados com pais e responsáveis</p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm hover:shadow-md"
        >
          <Plus size={18} />
          Novo Comunicado
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar comunicados..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <select
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 min-w-[150px]"
          >
            <option value="all">Todas as turmas</option>
            {classGroups.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 min-w-[150px]"
          >
            <option value="all">Todas categorias</option>
            {CATEGORIES.map(c => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Communications List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <MessageSquareText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">
            {communications.length === 0 ? 'Nenhum comunicado ainda' : 'Nenhum resultado encontrado'}
          </h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">
            {communications.length === 0
              ? 'Crie seu primeiro comunicado para pais e responsáveis usando templates prontos ou a inteligência artificial.'
              : 'Tente ajustar os filtros ou o termo de busca.'}
          </p>
          {communications.length === 0 && (
            <button
              onClick={openNewModal}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
            >
              <Plus size={18} />
              Criar Primeiro Comunicado
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(comm => {
            const catInfo = getCategoryInfo(comm.category);
            const CatIcon = catInfo.icon;
            const isExpanded = expandedId === comm.id;

            return (
              <div
                key={comm.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all overflow-hidden"
              >
                {/* Card Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : comm.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg border ${catInfo.bgColor} flex-shrink-0`}>
                      <CatIcon size={18} className={catInfo.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{comm.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${catInfo.bgColor} ${catInfo.color}`}>
                          {catInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                        <span>{comm.className}</span>
                        <span>•</span>
                        <span>{formatDate(comm.createdAt)}</span>
                        {comm.sharedVia.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 font-medium">
                              Compartilhado {comm.sharedVia.length}x
                            </span>
                          </>
                        )}
                      </div>
                      {!isExpanded && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{comm.content}</p>
                      )}
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    <div className="p-4 pt-3">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{comm.content}</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 pb-4 flex-wrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleShareWhatsApp(comm); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium transition-colors border border-emerald-200"
                      >
                        <Send size={14} />
                        WhatsApp
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopyClipboard(comm); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-medium transition-colors border border-brand-200"
                      >
                        <Copy size={14} />
                        Copiar
                      </button>
                      <div className="flex-1" />
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(comm); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-medium transition-colors border border-gray-200"
                      >
                        <Edit3 size={14} />
                        Editar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(comm.id); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-medium transition-colors border border-rose-200"
                      >
                        <Trash2 size={14} />
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10 rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-800">
                {editingComm ? 'Editar Comunicado' : 'Novo Comunicado'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Comunicado</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => {
                    const CatIcon = cat.icon;
                    const isSelected = formCategory === cat.key;
                    return (
                      <button
                        key={cat.key}
                        onClick={() => setFormCategory(cat.key)}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all text-sm font-medium ${
                          isSelected
                            ? `${cat.bgColor} ${cat.color} border-current shadow-sm`
                            : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                        }`}
                      >
                        <CatIcon size={16} />
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Class Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
                <select
                  value={formClassId}
                  onChange={e => setFormClassId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="">Todas as turmas</option>
                  {classGroups.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.grade})</option>
                  ))}
                </select>
              </div>

              {/* AI Generation */}
              {!editingComm && (
                <div className="bg-gradient-to-r from-brand-50 to-purple-50 rounded-xl p-4 border border-brand-100">
                  <p className="text-sm font-semibold text-brand-700 mb-2 flex items-center gap-2">
                    <Sparkles size={16} />
                    Gerar com Inteligência Artificial
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <textarea
                        value={customContext}
                        onChange={e => setCustomContext(e.target.value)}
                        rows={2}
                        placeholder="Contexto opcional: Ex: 'Reunião dia 15/04, sala 3, tema: comportamento' ou 'Aluno João faltou 5 dias seguidos'..."
                        className="flex-1 px-3 py-2 border border-brand-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 bg-white placeholder:text-gray-400"
                      />
                      <DictationButton onResult={(t) => setCustomContext(prev => prev ? prev + ' ' + t : t)} className="w-9 h-9 flex-shrink-0" />
                    </div>
                    <button
                      onClick={handleGenerateAI}
                      disabled={isGenerating}
                      className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      {isGenerating ? 'Gerando...' : 'Gerar Comunicado com IA'}
                    </button>
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Título</label>
                  <DictationButton onResult={(t) => setFormTitle(prev => prev ? prev + ' ' + t : t)} className="w-8 h-8" />
                </div>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Ex: Reunião de Pais - 1º Trimestre"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              {/* Content */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Conteúdo do Comunicado</label>
                  <DictationButton onResult={(t) => setFormContent(prev => prev ? prev + ' ' + t : t)} className="w-8 h-8" />
                </div>
                <textarea
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  rows={8}
                  placeholder="Escreva o comunicado ou use a IA para gerar automaticamente..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{formContent.length} caracteres</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-3 rounded-b-2xl">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!formTitle.trim() || !formContent.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 shadow-sm"
              >
                <Check size={16} />
                {editingComm ? 'Salvar Alterações' : 'Criar Comunicado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
