import React, { useState, useEffect } from 'react';
import { ExtraClass, ActivityType, ClassGroup, Student } from '../types';
import { Clock, MapPin, Calendar, Trash2, Edit, Plus, X, AlignLeft, Users, Check } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

interface ExtraClassesProps {
  classes: ExtraClass[];
  classGroups: ClassGroup[];
  students: Student[];
  onAdd: (data: Omit<ExtraClass, 'id'>) => void;
  onEdit: (data: ExtraClass) => void;
  onDelete: (id: string) => void;
}

export const ExtraClasses: React.FC<ExtraClassesProps> = ({ classes, classGroups, students, onAdd, onEdit, onDelete }) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<ExtraClass, 'id'>>({
    name: '',
    type: ActivityType.PEDAGOGICAL,
    teacher: '',
    classId: '',
    participants: [], // List of student IDs
    dayOfWeek: 'Segunda-feira',
    startTime: '13:00',
    endTime: '14:00',
    location: '',
    frequency: 'Weekly',
    objective: ''
  });

  // Lock body scroll
  useEffect(() => {
    if (isModalOpen) {
      document.body.classList.add('scroll-locked');
    } else {
      document.body.classList.remove('scroll-locked');
    }
    return () => {
      document.body.classList.remove('scroll-locked');
    };
  }, [isModalOpen]);

  const confirmDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  const handleEditClick = (cls: ExtraClass) => {
    setFormData({
      name: cls.name,
      type: cls.type,
      teacher: cls.teacher,
      classId: cls.classId,
      participants: cls.participants,
      dayOfWeek: cls.dayOfWeek,
      startTime: cls.startTime,
      endTime: cls.endTime,
      location: cls.location,
      frequency: cls.frequency,
      objective: cls.objective
    });
    setEditingId(cls.id);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      type: ActivityType.PEDAGOGICAL,
      teacher: '',
      classId: '',
      participants: [],
      dayOfWeek: 'Segunda-feira',
      startTime: '13:00',
      endTime: '14:00',
      location: '',
      frequency: 'Weekly',
      objective: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      onEdit({ ...formData, id: editingId });
    } else {
      onAdd(formData);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'classId') {
      setFormData(prev => ({ 
        ...prev, 
        classId: value,
        participants: [] // Reset participants when class changes for safety
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const toggleParticipant = (studentId: string) => {
    setFormData(prev => {
      const current = prev.participants;
      if (current.includes(studentId)) {
        return { ...prev, participants: current.filter(id => id !== studentId) };
      } else {
        return { ...prev, participants: [...current, studentId] };
      }
    });
  };

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case ActivityType.PEDAGOGICAL: 
      case ActivityType.STUDY_GROUP:
      case ActivityType.ED_TECH:
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case ActivityType.RECREATION: 
      case ActivityType.SWIMMING:
      case ActivityType.JUDO:
      case ActivityType.FUTSAL:
      case ActivityType.SPORTS_INIT:
        return 'bg-green-100 text-green-700 border-green-200';
      case ActivityType.WORKSHOP: 
      case ActivityType.BALLET:
      case ActivityType.MUSIC:
      case ActivityType.SINGING:
      case ActivityType.CHOIR:
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case ActivityType.MEAL: 
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getClassName = (id: string) => {
    if (id === 'all') return 'Todas as Turmas';
    const cls = classGroups.find(c => c.id === id);
    return cls ? cls.name : 'Turma não encontrada';
  };

  const availableStudents = formData.classId === 'all'
    ? students
    : formData.classId 
      ? students.filter(s => s.classId === formData.classId)
      : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Aulas Extras - Integral</h2>
          <p className="text-gray-500 text-sm">Gerencie oficinas, recreação e atividades do contraturno.</p>
        </div>
        <button 
          onClick={openNewModal}
          className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm w-full md:w-auto"
        >
          <Plus size={18} />
          Nova Atividade
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {classes.map((cls) => (
          <div key={cls.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <span className={`px-2 py-1 text-xs font-semibold rounded-md border ${getActivityColor(cls.type)}`}>
                {cls.type}
              </span>
              <div className="flex gap-1">
                <button 
                  onClick={() => handleEditClick(cls)}
                  className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-gray-50 rounded-md"
                >
                  <Edit size={16} />
                </button>
                <button 
                  onClick={() => setDeleteId(cls.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-md"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1">{cls.name}</h3>
            <p className="text-xs text-brand-600 font-medium mb-2 bg-brand-50 inline-block px-2 py-0.5 rounded">
              {getClassName(cls.classId)}
            </p>
            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{cls.objective}</p>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-brand-500" />
                <span>{cls.dayOfWeek} • {cls.frequency === 'Weekly' ? 'Semanal' : cls.frequency === 'Bi-weekly' ? 'Quinzenal' : 'Eventual'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-brand-500" />
                <span>{cls.startTime} - {cls.endTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-brand-500" />
                <span>{cls.location}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                <span>Prof: {cls.teacher}</span>
              </div>
              
              <div className="flex flex-wrap gap-1.5">
                {cls.participants.length > 0 ? (
                  cls.participants.map(studentId => {
                    const student = students.find(s => s.id === studentId);
                    if (!student) return null;
                    return (
                      <span 
                        key={studentId} 
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-600 border border-gray-200"
                        title={student.name}
                      >
                         {student.name}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-xs text-gray-400 italic flex items-center gap-1">
                     <Users size={12} /> Nenhum aluno inscrito
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {classes.length === 0 && (
         <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
           <p className="text-gray-500">Nenhuma aula extra cadastrada.</p>
           <button 
             onClick={openNewModal}
             className="mt-2 text-brand-600 font-medium hover:underline"
           >
             Criar a primeira
           </button>
         </div>
      )}

      {/* Modal Nova/Editar Atividade */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm sm:p-4">
          <div className="bg-white w-full h-[90dvh] sm:h-auto sm:max-h-[90dvh] rounded-t-2xl sm:rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-8 sm:zoom-in duration-200 flex flex-col">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Editar Atividade' : 'Nova Atividade Extra'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
                <X size={24} />
              </button>
            </div>
            
            {/* FIX: min-h-0 */}
            <div className="overflow-y-auto p-4 sm:p-6 flex-1 min-h-0 overscroll-contain">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Atividade</label>
                  <input 
                    name="name"
                    type="text" 
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ex: Oficina de Robótica"
                    className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select 
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  >
                    {Object.values(ActivityType).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Professor Responsável</label>
                  <input 
                    name="teacher"
                    type="text" 
                    required
                    value={formData.teacher}
                    onChange={handleChange}
                    className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dia da Semana</label>
                  <select
                    name="dayOfWeek"
                    value={formData.dayOfWeek}
                    onChange={handleChange}
                    className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  >
                    {['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frequência</label>
                  <select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleChange}
                    className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  >
                    <option value="Weekly">Semanal</option>
                    <option value="Bi-weekly">Quinzenal</option>
                    <option value="Eventual">Eventual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
                  <input 
                    name="startTime"
                    type="time" 
                    required
                    value={formData.startTime}
                    onChange={handleChange}
                    className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fim</label>
                  <input 
                    name="endTime"
                    type="time" 
                    required
                    value={formData.endTime}
                    onChange={handleChange}
                    className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input 
                      name="location"
                      type="text" 
                      required
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="Ex: Sala de Artes, Pátio, Quadra..."
                      className="w-full pl-10 pr-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo da Atividade</label>
                  <div className="relative">
                    <AlignLeft size={18} className="absolute left-3 top-3 text-gray-400" />
                    <textarea 
                      name="objective"
                      required
                      value={formData.objective}
                      onChange={handleChange}
                      rows={2}
                      placeholder="Descreva os objetivos..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Seção de Participantes */}
                <div className="col-span-1 md:col-span-2 border-t border-gray-100 pt-4 mt-2">
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Users size={18} className="text-brand-600" />
                    Alunos Participantes
                  </h4>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Turma Vinculada</label>
                    <select 
                      name="classId"
                      value={formData.classId}
                      onChange={handleChange}
                      className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    >
                      <option value="">Selecione uma turma...</option>
                      <option value="all">Todas as Turmas (Mostrar todos)</option>
                      {classGroups.map(group => (
                        <option key={group.id} value={group.id}>{group.name} ({group.grade})</option>
                      ))}
                    </select>
                  </div>

                  {formData.classId && (
                    <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto border border-gray-200">
                      {availableStudents.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {availableStudents.map(student => (
                            <div 
                              key={student.id}
                              onClick={() => toggleParticipant(student.id)}
                              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors border ${
                                formData.participants.includes(student.id)
                                  ? 'bg-brand-50 border-brand-200'
                                  : 'bg-white border-transparent hover:bg-gray-100'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                                formData.participants.includes(student.id)
                                  ? 'bg-brand-500 border-brand-500'
                                  : 'border-gray-300 bg-white'
                              }`}>
                                {formData.participants.includes(student.id) && <Check size={14} className="text-white" />}
                              </div>
                              <span className="text-sm text-gray-700">{student.name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">Nenhum aluno encontrado nesta turma.</p>
                      )}
                    </div>
                  )}
                   {formData.classId && availableStudents.length > 0 && (
                     <div className="mt-2 text-right text-xs text-gray-500">
                       {formData.participants.length} alunos selecionados
                     </div>
                   )}
                </div>

                <div className="col-span-1 md:col-span-2 flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 sm:py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 sm:py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
                  >
                    {editingId ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={!!deleteId}
        title="Excluir Atividade"
        message="Tem certeza que deseja remover esta atividade?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};