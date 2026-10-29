import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, ClassGroup } from '../types';
import { X, Save, Building, User, Plus, Trash2, Sun, Moon, Briefcase, CheckSquare, Square, Camera, Upload } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  currentClasses: ClassGroup[];
  onSave: (updatedProfile: UserProfile, updatedClasses: ClassGroup[]) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentClasses,
  onSave,
}) => {
  // User Profile State
  const [name, setName] = useState(currentUser.name);
  const [school, setSchool] = useState(currentUser.school);
  const [shifts, setShifts] = useState<string[]>(currentUser.shifts || []);
  const [photoUrl, setPhotoUrl] = useState(currentUser.photoUrl || '');

  // Classes State (Local copy for editing)
  const [classesList, setClassesList] = useState<ClassGroup[]>(currentClasses);
  const [newClassName, setNewClassName] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bloqueia a rolagem do fundo quando o modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('scroll-locked');
    } else {
      document.body.classList.remove('scroll-locked');
    }
    return () => {
      document.body.classList.remove('scroll-locked');
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name);
      setSchool(currentUser.school);
      setShifts(currentUser.shifts || []);
      setPhotoUrl(currentUser.photoUrl || '');
      setClassesList(currentClasses);
      setSelectedClassIds([]); // Reset selection when opening
    }
  }, [isOpen, currentUser, currentClasses]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedProfile: UserProfile = {
      ...currentUser,
      name,
      school,
      shifts,
      photoUrl
    };
    onSave(updatedProfile, classesList);
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const toggleShift = (shiftKey: string) => {
    setShifts(prev => 
      prev.includes(shiftKey) 
        ? prev.filter(s => s !== shiftKey)
        : [...prev, shiftKey]
    );
  };

  const handleAddClass = () => {
    if (!newClassName.trim()) return;
    
    const newClass: ClassGroup = {
      id: Date.now().toString(),
      name: newClassName,
      grade: 'Não definido', // Default
      shift: 'morning', // Default
      studentCount: 0
    };
    
    setClassesList([...classesList, newClass]);
    setNewClassName('');
  };

  const handleDeleteClass = (id: string) => {
    if (window.confirm('Tem certeza? Isso removerá a turma da lista global.')) {
      setClassesList(classesList.filter(c => c.id !== id));
      setSelectedClassIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedClassIds.length === 0) return;
    
    if (window.confirm(`Tem certeza que deseja excluir as ${selectedClassIds.length} turmas selecionadas?`)) {
      setClassesList(classesList.filter(c => !selectedClassIds.includes(c.id)));
      setSelectedClassIds([]);
    }
  };

  const toggleClassSelection = (id: string) => {
    setSelectedClassIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedClassIds.length === classesList.length) {
      setSelectedClassIds([]);
    } else {
      setSelectedClassIds(classesList.map(c => c.id));
    }
  };

  const getInitials = (nameStr: string) => {
    const names = nameStr.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return nameStr.slice(0, 2).toUpperCase();
  };

  const shiftOptions = [
    { id: 'morning', label: 'Manhã', icon: Sun },
    { id: 'afternoon', label: 'Tarde', icon: Sun }, 
    { id: 'night', label: 'Noite', icon: Moon },
    { id: 'full-time', label: 'Integral', icon: Briefcase },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm sm:p-4">
      <div className="bg-white w-full h-[90dvh] sm:h-auto sm:max-h-[90dvh] rounded-t-2xl sm:rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-8 sm:zoom-in duration-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50 shrink-0">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <User className="text-brand-600" size={24} /> 
            Editar Meus Dados
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 overscroll-contain">
          <form id="profile-form" onSubmit={handleSave} className="space-y-8">
            
            {/* Section 0: Profile Photo */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative group cursor-pointer" onClick={triggerFileInput}>
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-brand-100 flex items-center justify-center text-brand-700 text-2xl font-bold">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(name)
                  )}
                </div>
                
                {/* Overlay on Hover */}
                <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white w-8 h-8" />
                </div>
                
                {/* Edit Badge */}
                <div className="absolute bottom-0 right-0 bg-brand-600 text-white p-1.5 rounded-full border-2 border-white shadow-sm">
                  <Upload size={14} />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500 font-medium cursor-pointer hover:text-brand-600" onClick={triggerFileInput}>
                Alterar Foto
              </p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload} 
              />
            </div>

            {/* Section 1: Personal Info */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-2">Informações Pessoais</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                  <div className="relative">
                     <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                     <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Escola</label>
                  <div className="relative">
                     <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                     <input
                      type="text"
                      required
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Shifts */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-2">Período de Trabalho</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {shiftOptions.map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() => toggleShift(option.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                      shifts.includes(option.id)
                        ? 'bg-brand-50 border-brand-500 text-brand-700 ring-1 ring-brand-500'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <option.icon size={20} className="mb-2" />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 3: Classes Management */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Minhas Turmas</h4>
                
                {/* Bulk Actions Controls */}
                <div className="flex items-center gap-3">
                   {classesList.length > 0 && (
                     <button 
                       type="button"
                       onClick={toggleSelectAll}
                       className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1"
                     >
                       {selectedClassIds.length === classesList.length ? (
                         <><CheckSquare size={14} /> Desmarcar Todas</>
                       ) : (
                         <><Square size={14} /> Selecionar Todas</>
                       )}
                     </button>
                   )}
                   
                   {selectedClassIds.length > 0 && (
                     <button
                       type="button"
                       onClick={handleBulkDelete}
                       className="text-xs bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-2 py-1 rounded border border-red-200 font-medium flex items-center gap-1 transition-colors"
                     >
                       <Trash2 size={12} /> Excluir ({selectedClassIds.length})
                     </button>
                   )}
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                 <div className="flex gap-2 mb-4">
                   <input
                     type="text"
                     placeholder="Nome da nova turma (ex: 3º Ano C)"
                     value={newClassName}
                     onChange={(e) => setNewClassName(e.target.value)}
                     className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                     onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddClass(); } }}
                   />
                   <button
                     type="button"
                     onClick={handleAddClass}
                     className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                   >
                     <Plus size={16} /> Adicionar
                   </button>
                 </div>

                 <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                   {classesList.length > 0 ? (
                     classesList.map(cls => (
                       <div 
                         key={cls.id} 
                         className={`flex justify-between items-center p-3 rounded-md border shadow-sm transition-colors cursor-pointer ${
                           selectedClassIds.includes(cls.id) 
                             ? 'bg-brand-50 border-brand-200' 
                             : 'bg-white border-gray-200 hover:bg-gray-50'
                         }`}
                         onClick={() => toggleClassSelection(cls.id)}
                       >
                          <div className="flex items-center gap-3">
                             <div className={`text-gray-400 ${selectedClassIds.includes(cls.id) ? 'text-brand-600' : ''}`}>
                               {selectedClassIds.includes(cls.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                             </div>
                             <div>
                               <span className={`font-medium ${selectedClassIds.includes(cls.id) ? 'text-brand-800' : 'text-gray-800'}`}>
                                 {cls.name}
                               </span>
                               <div className="text-xs text-gray-500">{cls.studentCount} alunos</div>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                             <button
                               type="button"
                               onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id); }}
                               className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                               title="Excluir Turma"
                             >
                               <Trash2 size={16} />
                             </button>
                          </div>
                       </div>
                     ))
                   ) : (
                     <p className="text-sm text-gray-500 text-center py-2 italic">Nenhuma turma cadastrada.</p>
                   )}
                 </div>
                 
                 {classesList.length > 0 && (
                   <div className="mt-2 text-xs text-gray-500 text-right">
                     {selectedClassIds.length} selecionadas de {classesList.length}
                   </div>
                 )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions (Fixed) */}
        <div className="p-4 sm:p-6 border-t border-gray-100 bg-white shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="profile-form"
              className="flex-1 px-4 py-3 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-lg shadow-brand-200 transition-colors flex justify-center items-center gap-2"
            >
              <Save size={18} /> Salvar Alterações
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};