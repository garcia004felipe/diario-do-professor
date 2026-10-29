import React, { useState, useEffect, useMemo } from 'react';
import { ClassGroup, Student, UserProfile } from '../types';
import { Plus, Trash2, Edit2, Users, Sun, Moon, Clock, X, UserPlus, User, Download } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

interface ClassesProps {
  classes: ClassGroup[];
  onAdd: (newClass: Omit<ClassGroup, 'id' | 'studentCount'>) => void;
  onEdit: (updatedClass: ClassGroup) => void;
  onDelete: (id: string) => void;
  onAddStudent: (student: Omit<Student, 'id' | 'status' | 'attendanceRate' | 'photoUrl'> & { photoUrl?: string }) => void;
  onExportClass?: (classId: string) => void;
  currentUser?: UserProfile | null;
}

export const Classes: React.FC<ClassesProps> = ({ classes, onAdd, onEdit, onDelete, onAddStudent, onExportClass, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [addStudentClassId, setAddStudentClassId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Class Form State
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [shift, setShift] = useState<'morning' | 'afternoon' | 'full-time'>('morning');
  const [teacherName, setTeacherName] = useState('');

  // Student Form State (Quick Add)
  const [studentName, setStudentName] = useState('');
  const [studentAge, setStudentAge] = useState('');
  const [studentNeeds, setStudentNeeds] = useState('');

  // Lista de professores cadastrados para sugestão/seleção rápida
  const availableTeachers = useMemo(() => {
    const list: string[] = [];
    if (currentUser?.name && !list.includes(currentUser.name)) {
      list.push(currentUser.name);
    }
    classes.forEach(c => {
      if (c.teacherName && c.teacherName.trim() && !list.includes(c.teacherName.trim())) {
        list.push(c.teacherName.trim());
      }
    });
    return list;
  }, [classes, currentUser]);

  // Lock body scroll
  useEffect(() => {
    if (isModalOpen || addStudentClassId) {
      document.body.classList.add('scroll-locked');
    } else {
      document.body.classList.remove('scroll-locked');
    }
    return () => {
      document.body.classList.remove('scroll-locked');
    };
  }, [isModalOpen, addStudentClassId]);

  const openNewModal = () => {
    setEditingId(null);
    setName('');
    setGrade('');
    setShift('morning');
    setTeacherName('');
    setIsModalOpen(true);
  };

  const handleEditClick = (cls: ClassGroup) => {
    setEditingId(cls.id);
    setName(cls.name);
    setGrade(cls.grade);
    setShift(cls.shift);
    setTeacherName(cls.teacherName || '');
    setIsModalOpen(true);
  };

  const handleClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      // Find original to keep studentCount
      const original = classes.find(c => c.id === editingId);
      onEdit({
        id: editingId,
        name,
        grade,
        shift,
        teacherName,
        studentCount: original ? original.studentCount : 0 
      });
    } else {
      onAdd({ name, grade, shift, teacherName });
    }
    
    setName('');
    setGrade('');
    setShift('morning');
    setTeacherName('');
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addStudentClassId) {
      onAddStudent({
        name: studentName,
        age: parseInt(studentAge),
        classId: addStudentClassId,
        needs: studentNeeds || 'Nenhuma',
        subjects: [] // Inicializa lista vazia de matérias (Obrigatório pela interface Student)
      });
      setAddStudentClassId(null);
      setStudentName('');
      setStudentAge('');
      setStudentNeeds('');
    }
  };

  const getShiftIcon = (shift: string) => {
    switch (shift) {
      case 'morning': return <Sun size={18} className="text-orange-500" />;
      case 'afternoon': return <Moon size={18} className="text-indigo-500" />;
      case 'full-time': return <Clock size={18} className="text-purple-500" />;
      default: return <Sun size={18} />;
    }
  };

  const getShiftLabel = (shift: string) => {
    switch (shift) {
      case 'morning': return 'Manhã';
      case 'afternoon': return 'Tarde';
      case 'full-time': return 'Integral';
      default: return shift;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Minhas Turmas</h2>
          <p className="text-gray-500 text-sm">Gerencie as turmas e séries escolares.</p>
        </div>
        <button 
          onClick={openNewModal}
          className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm w-full md:w-auto"
        >
          <Plus size={18} />
          Nova Turma
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {classes.map((cls) => (
          <div key={cls.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow relative group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-brand-50 text-brand-600 rounded-lg">
                <Users size={24} />
              </div>
              <div className="flex gap-1">
                 <button 
                  onClick={() => onExportClass && onExportClass(cls.id)}
                  className="p-2 text-gray-400 hover:text-brand-600 hover:bg-gray-50 rounded-md flex items-center gap-1"
                  title="Exportar Boletins"
                >
                  <Download size={18} />
                </button>
                 <button 
                  onClick={() => setAddStudentClassId(cls.id)}
                  className="p-2 text-gray-400 hover:text-brand-600 hover:bg-gray-50 rounded-md flex items-center gap-1"
                  title="Adicionar Aluno"
                >
                  <UserPlus size={18} />
                </button>
                <button 
                  onClick={() => handleEditClick(cls)}
                  className="p-2 text-gray-400 hover:text-brand-600 hover:bg-gray-50 rounded-md"
                  title="Editar Turma"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => setDeleteId(cls.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-md"
                  title="Excluir Turma"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1">{cls.name}</h3>
            {cls.teacherName && (
               <p className="text-xs text-gray-500 mb-2 flex items-center gap-1 bg-gray-50 px-2 py-1 rounded w-fit">
                 <User size={12} /> {cls.teacherName}
               </p>
            )}
            <p className="text-gray-500 text-sm mb-4">{cls.grade}</p>

            <div className="flex items-center gap-4 text-sm text-gray-600 border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2" title="Turno">
                {getShiftIcon(cls.shift)}
                <span>{getShiftLabel(cls.shift)}</span>
              </div>
              <div className="flex items-center gap-2" title="Total de Alunos">
                <Users size={18} className="text-gray-400" />
                <span>{cls.studentCount} Alunos</span>
              </div>
            </div>
            
             <button 
               onClick={() => setAddStudentClassId(cls.id)}
               className="mt-4 w-full py-2 text-xs font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors opacity-0 group-hover:opacity-100"
             >
               + Adicionar Aluno
             </button>
          </div>
        ))}
      </div>

      {classes.length === 0 && (
         <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
           <p className="text-gray-500">Nenhuma turma cadastrada.</p>
           <button 
             onClick={openNewModal}
             className="mt-2 text-brand-600 font-medium hover:underline"
           >
             Cadastrar primeira turma
           </button>
         </div>
      )}

      {/* Modal Nova/Editar Turma */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm sm:p-4">
          <div className="bg-white w-full h-auto sm:max-h-[90dvh] rounded-t-2xl sm:rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-8 sm:zoom-in duration-200 flex flex-col">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Editar Turma' : 'Nova Turma'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
                <X size={24} />
              </button>
            </div>
            
            {/* FIX: min-h-0 */}
            <div className="overflow-y-auto p-4 sm:p-6 flex-1 min-h-0 overscroll-contain">
              <form onSubmit={handleClassSubmit} className="space-y-4 pb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Turma</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: 1º Ano A"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Professor Responsável</label>
                    {currentUser?.name && teacherName !== currentUser.name && (
                      <button
                        type="button"
                        onClick={() => setTeacherName(currentUser.name)}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium hover:underline"
                      >
                        + Usar meu nome
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text"
                      list="teachers-datalist"
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      placeholder="Digite ou selecione o professor..."
                      className="w-full pl-10 pr-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                    />
                    <datalist id="teachers-datalist">
                      {availableTeachers.map(t => (
                        <option key={t} value={t}>
                          {t === currentUser?.name ? `${t} (Você)` : t}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  {availableTeachers.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                      <span className="text-xs text-gray-400">Sugestões:</span>
                      {availableTeachers.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTeacherName(t)}
                          className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                            teacherName === t 
                              ? 'bg-brand-50 border-brand-300 text-brand-700 font-medium shadow-xs' 
                              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
                          }`}
                        >
                          {t === currentUser?.name ? `${t} (Eu)` : t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Série / Ano</label>
                  <select 
                    required
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  >
                    <option value="">Selecione...</option>
                    <optgroup label="📗 Educação Infantil">
                      <option value="Educação Infantil">Educação Infantil</option>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Turno</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'morning', label: 'Manhã', icon: Sun },
                      { id: 'afternoon', label: 'Tarde', icon: Moon },
                      { id: 'full-time', label: 'Integral', icon: Clock }
                    ].map((option) => (
                      <button
                        type="button"
                        key={option.id}
                        onClick={() => setShift(option.id as any)}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                          shift === option.id 
                            ? 'border-brand-500 bg-brand-50 text-brand-700' 
                            : 'border-gray-200 hover:border-brand-200 hover:bg-gray-50'
                        }`}
                      >
                        <option.icon size={20} className="mb-1" />
                        <span className="text-xs font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
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
                    {editingId ? 'Salvar Alterações' : 'Criar Turma'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar Aluno Rápido */}
      {addStudentClassId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm sm:p-4">
          <div className="bg-white w-full h-auto sm:max-h-[90dvh] rounded-t-2xl sm:rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-8 sm:zoom-in duration-200 flex flex-col">
             <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">
                Adicionar Aluno em {classes.find(c => c.id === addStudentClassId)?.name}
              </h3>
              <button onClick={() => setAddStudentClassId(null)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
                <X size={24} />
              </button>
            </div>
            
            {/* FIX: min-h-0 */}
            <div className="overflow-y-auto p-4 sm:p-6 flex-1 min-h-0 overscroll-contain">
              <form onSubmit={handleStudentSubmit} className="space-y-4 pb-4">
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Ex: Maria Oliveira"
                    className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Idade</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      max="18"
                      value={studentAge}
                      onChange={(e) => setStudentAge(e.target.value)}
                      className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>

                   <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Necessidades / Observações</label>
                  <textarea 
                    rows={2}
                    value={studentNeeds}
                    onChange={(e) => setStudentNeeds(e.target.value)}
                    placeholder="Ex: Nenhuma"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAddStudentClassId(null)}
                    className="flex-1 px-4 py-3 sm:py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 sm:py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={!!deleteId}
        title="Excluir Turma"
        message="Tem certeza que deseja excluir esta turma?"
        onConfirm={() => {
          if (deleteId) onDelete(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};