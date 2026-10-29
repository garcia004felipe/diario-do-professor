import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, ClassGroup, StudentSubject } from '../types';
import { Trash2, Edit2, Search, Plus, X, Filter, FileText, BookOpen, GraduationCap, CheckCircle2, XCircle, Hand, User, Upload, Sparkles, Camera } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import * as XLSX from 'xlsx';
import { useToast } from '../hooks/useToast';
import { generateStudentFeedbackPDF } from '../services/aiService';

interface StudentsProps {
  students: Student[];
  classGroups: ClassGroup[];
  onAdd: (student: Omit<Student, 'id' | 'status' | 'attendanceRate' | 'photoUrl'> & { photoUrl?: string }) => void;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
}

export const Students: React.FC<StudentsProps> = ({ students, classGroups, onAdd, onEdit, onDelete }) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportCardOpen, setIsReportCardOpen] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [classId, setClassId] = useState('');
  const [needs, setNeeds] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [photoUrl, setPhotoUrl] = useState('');
  const [subjects, setSubjects] = useState<StudentSubject[]>([]);

  // Temp Subject State (Input fields for adding a new subject)
  const [newSubName, setNewSubName] = useState('');
  const [newSubTeacher, setNewSubTeacher] = useState('');
  const [newSubGrade, setNewSubGrade] = useState('');
  const [newSubAttendance, setNewSubAttendance] = useState('');

  // Attendance Swipe Mode
  const [isAttendanceMode, setIsAttendanceMode] = useState(false);
  const [swipeQueue, setSwipeQueue] = useState<Student[]>([]);
  const [currentSwipeIndex, setCurrentSwipeIndex] = useState(0);
  const controls = useAnimation();

  // Lock body scroll via CSS class
  useEffect(() => {
    if (isModalOpen || isReportCardOpen) {
      document.body.classList.add('scroll-locked');
    } else {
      document.body.classList.remove('scroll-locked');
    }
    return () => {
      document.body.classList.remove('scroll-locked');
    };
  }, [isModalOpen, isReportCardOpen]);

  // Filtering Logic
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            s.needs.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = selectedClassFilter === 'all' || s.classId === selectedClassFilter;
      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, selectedClassFilter]);

  const getClassName = (id: string) => {
    const cls = classGroups.find(c => c.id === id);
    return cls ? cls.name : 'Sem Turma';
  };

  const openNewModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openReportCard = (student: Student) => {
    setViewingStudent(student);
    setIsReportCardOpen(true);
  };

  const getInitials = (studentName: string) => {
    if (!studentName || !studentName.trim()) return 'A';
    return studentName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(n => n[0].toUpperCase())
      .join('');
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 300;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => resolve(event.target?.result as string);
      };
      reader.onerror = () => resolve('');
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setPhotoUrl(compressed);
        showToast('Foto selecionada com sucesso!', 'success');
      } catch (err) {
        console.error('Erro ao processar imagem:', err);
        showToast('Erro ao carregar imagem.', 'error');
      }
    }
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleRandomAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setPhotoUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`);
    showToast('Avatar aleatório gerado!', 'info');
  };

  const handleEditClick = (student: Student) => {
    setName(student.name);
    setAge(student.age.toString());
    setClassId(student.classId);
    setNeeds(student.needs);
    setStatus(student.status);
    setPhotoUrl(student.photoUrl || '');
    setSubjects(student.subjects || []); // Carrega matérias existentes ou array vazio
    setEditingId(student.id);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setAge('');
    setClassId('');
    setNeeds('');
    setStatus('active');
    setPhotoUrl('');
    setSubjects([]);
    setNewSubName('');
    setNewSubTeacher('');
    setNewSubGrade('');
    setNewSubAttendance('');
  };

  const handleAddSubject = () => {
    if (newSubName && newSubTeacher) {
        const newSubject: StudentSubject = {
            id: Date.now().toString(),
            name: newSubName,
            teacher: newSubTeacher,
            grade: Number(newSubGrade) || 0,
            attendance: Number(newSubAttendance) || 100
        };
        setSubjects([...subjects, newSubject]);
        setNewSubName('');
        setNewSubTeacher('');
        setNewSubGrade('');
        setNewSubAttendance('');
    }
  };

  const handleRemoveSubject = (id: string) => {
      setSubjects(subjects.filter(s => s.id !== id));
  };

  const handleGenerateAI = async () => {
    if (!viewingStudent) return;
    setIsGeneratingAI(true);
    showToast('Iniciando análise profunda com IA...', 'info');
    const result = await generateStudentFeedbackPDF(viewingStudent);
    if (result.success) {
      showToast(result.message, 'success');
    } else {
      showToast(result.message, 'error');
    }
    setIsGeneratingAI(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      const originalStudent = students.find(s => s.id === editingId);
      if (originalStudent) {
        onEdit({
          ...originalStudent,
          name,
          age: parseInt(age),
          classId,
          needs: needs || 'Nenhuma',
          status,
          photoUrl: photoUrl || originalStudent.photoUrl,
          subjects
        });
      }
    } else {
      onAdd({
        name,
        age: parseInt(age),
        classId,
        needs: needs || 'Nenhuma',
        photoUrl: photoUrl || undefined,
        subjects
      });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const confirmDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  const startAttendanceMode = () => {
      // Filter out students not in the selected class if a class is selected
      const studentsToCall = selectedClassFilter === 'all' 
        ? students 
        : students.filter(s => s.classId === selectedClassFilter);
        
      if (studentsToCall.length === 0) {
          alert('Nenhum aluno encontrado para a chamada.');
          return;
      }
      setSwipeQueue(studentsToCall);
      setCurrentSwipeIndex(0);
      setIsAttendanceMode(true);
  };

  const handleSwipe = async (info: any, student: Student) => {
      const offset = info.offset.x;
      const velocity = info.velocity.x;

      if (offset > 100 || velocity > 500) {
          // Swipe Right (Present)
          console.log(`[Chamada] ${student.name} PRESENTE`);
          controls.start({ x: 500, opacity: 0, transition: { duration: 0.3 } }).then(() => nextSwipe());
      } else if (offset < -100 || velocity < -500) {
          // Swipe Left (Absent)
          console.log(`[Chamada] ${student.name} FALTOU`);
          controls.start({ x: -500, opacity: 0, transition: { duration: 0.3 } }).then(() => nextSwipe());
      } else {
          // Reset
          controls.start({ x: 0, opacity: 1 });
      }
  };

  const nextSwipe = () => {
      if (currentSwipeIndex < swipeQueue.length - 1) {
          setCurrentSwipeIndex(prev => prev + 1);
          controls.set({ x: 0, opacity: 1 }); // reset position for next card
      } else {
          // Finished
          showToast('Chamada concluída! Os dados estão sendo processados.', 'success');
          setIsAttendanceMode(false);
      }
  };

  const currentSwipeStudent = swipeQueue[currentSwipeIndex];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    showToast('Processando planilha...', 'info');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        let importedCount = 0;
        data.forEach((row: any) => {
          const name = row['Nome'] || row['NOME'] || row['name'] || row['Name'] || row['Aluno'];
          if (name) {
            const ageStr = row['Idade'] || row['IDADE'] || row['age'] || row['Age'] || '0';
            const age = parseInt(ageStr, 10) || 0;
            const className = row['Turma'] || row['TURMA'] || row['class'] || row['Class'] || '';
            const needs = row['Necessidades Especiais'] || row['Necessidades'] || row['Needs'] || 'Nenhuma';
            
            let cId = '';
            if (className) {
              const foundClass = classGroups.find(c => c.name.toLowerCase() === className.toLowerCase());
              if (foundClass) cId = foundClass.id;
            }
            if (!cId && classGroups.length > 0) {
                cId = classGroups[0].id; // Fallback to first class
            }
            
            onAdd({
              name: String(name).trim(),
              age,
              classId: cId,
              needs: String(needs).trim(),
              subjects: []
            });
            importedCount++;
          }
        });
        showToast(`Importação concluída! ${importedCount} alunos encontrados.`, 'success');
      } catch (err) {
        console.error('Erro ao processar planilha', err);
        showToast('Erro ao ler o arquivo. Certifique-se que é um Excel ou CSV válido.', 'error');
      }
    };
    reader.readAsBinaryString(file);
    
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Alunos</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie o cadastro, turmas e desempenho.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Class Filter */}
          <div className="relative">
             <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
             <select
               value={selectedClassFilter}
               onChange={(e) => setSelectedClassFilter(e.target.value)}
               className="w-full sm:w-48 pl-9 pr-8 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm appearance-none bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 cursor-pointer transition-colors duration-200"
             >
                <option value="all">Todas as Turmas</option>
                {classGroups.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
             </select>
          </div>

          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar aluno..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            onClick={startAttendanceMode}
            className="flex items-center justify-center gap-2 bg-indigo-100 dark:bg-brand-900/40 hover:bg-indigo-200 dark:hover:bg-brand-900/60 text-indigo-700 dark:text-brand-300 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap border border-transparent dark:border-brand-800/30"
            title="Realizar chamada rápida estilo Tinder"
          >
            <Hand size={18} />
            Chamada Rápida
          </button>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap"
            title="Importar de Planilha (Excel/CSV)"
          >
            <Upload size={18} />
            Importar
          </button>

          <button 
            onClick={openNewModal}
            className="flex items-center justify-center gap-2 bg-brand-600 dark:bg-brand-500 hover:bg-brand-700 dark:hover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus size={18} />
            Novo Aluno
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors duration-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700 transition-colors duration-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Aluno</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Turma</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Média Geral</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={student.photoUrl} 
                          alt={student.name} 
                          className="w-10 h-10 rounded-full object-cover border border-gray-200"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-xs text-gray-500">{student.age} anos • {student.needs !== 'Nenhuma' && <span className="text-amber-600 font-medium">{student.needs}</span>}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {getClassName(student.classId)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        student.status === 'active' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {student.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${student.attendanceRate >= 75 ? 'bg-brand-500' : 'bg-red-500'}`}
                            style={{ width: `${student.attendanceRate}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 font-medium">{student.attendanceRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                            onClick={() => openReportCard(student)}
                            className="p-2 text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                            title="Ver Boletim"
                        >
                            <FileText size={16} /> Boletim
                        </button>
                        <button 
                          onClick={() => handleEditClick(student)}
                          className="p-2 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => setDeleteId(student.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    Nenhum aluno encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

       {/* Chamada Rápida (Tinder-like) Overlay */}
      <AnimatePresence>
        {isAttendanceMode && currentSwipeStudent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900 bg-opacity-80 backdrop-blur-sm p-4"
          >
            <div className="absolute top-6 right-6">
                <button onClick={() => setIsAttendanceMode(false)} className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors">
                    <X size={24} />
                </button>
            </div>
            
            <div className="text-center absolute top-20 left-0 right-0 pointer-events-none">
                <h2 className="text-white text-2xl font-bold mb-2">Chamada Rápida</h2>
                <p className="text-gray-300">[{currentSwipeIndex + 1} de {swipeQueue.length}] Arraste para a Direita (Presente) ou Esquerda (Faltou)</p>
            </div>

            <div className="relative w-full max-w-sm h-96 flex items-center justify-center">
                {/* Background Indicators (Hints) */}
                <div className="absolute left-0 right-0 flex justify-between px-8 pointer-events-none opacity-50">
                    <div className="flex flex-col items-center text-red-400">
                        <XCircle size={48} />
                        <span className="font-bold mt-2">FALTOU</span>
                    </div>
                    <div className="flex flex-col items-center text-emerald-400">
                        <CheckCircle2 size={48} />
                        <span className="font-bold mt-2">PRESENTE</span>
                    </div>
                </div>

                {/* Draggable Card */}
                <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.8}
                    onDragEnd={(e, info) => handleSwipe(info, currentSwipeStudent)}
                    animate={controls}
                    className="absolute bg-white w-full h-full rounded-2xl shadow-2xl border-4 border-white flex flex-col cursor-grab active:cursor-grabbing overflow-hidden"
                    whileHover={{ scale: 1.02 }}
                    whileDrag={{ scale: 1.05, boxShadow: "0px 20px 40px rgba(0,0,0,0.3)" }}
                >
                    <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-hidden relative">
                         {currentSwipeStudent.photoUrl ? (
                             <img src={currentSwipeStudent.photoUrl} alt={currentSwipeStudent.name} className="w-full h-full object-cover" />
                         ) : (
                             <User size={64} className="text-gray-400" />
                         )}
                         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                            <h3 className="text-2xl font-bold text-white mb-1">{currentSwipeStudent.name}</h3>
                            <p className="text-gray-200">{getClassName(currentSwipeStudent.classId)}</p>
                         </div>
                    </div>
                </motion.div>
            </div>
            
            {/* Action Buttons (Alternative to Dragging) */}
            <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-8">
                <button 
                    onClick={() => { controls.start({ x: -500, opacity: 0, transition: { duration: 0.3 } }).then(() => nextSwipe()); }}
                    className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center text-red-500 hover:bg-red-50 hover:scale-110 transition-all border-2 border-red-100"
                >
                    <XCircle size={32} />
                </button>
                <button 
                    onClick={() => { controls.start({ x: 500, opacity: 0, transition: { duration: 0.3 } }).then(() => nextSwipe()); }}
                    className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center text-emerald-500 hover:bg-emerald-50 hover:scale-110 transition-all border-2 border-emerald-100"
                >
                    <CheckCircle2 size={32} />
                </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Novo/Editar Aluno */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm sm:p-4">
          <div className="bg-white w-full h-[90dvh] sm:h-auto sm:max-h-[90dvh] rounded-t-2xl sm:rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-8 sm:zoom-in duration-200 flex flex-col">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Editar Aluno' : 'Novo Aluno'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
                <X size={24} />
              </button>
            </div>
            
            {/* FIX: min-h-0 é crucial para scroll funcionar em nested flex containers */}
            <div className="overflow-y-auto p-4 sm:p-6 flex-1 min-h-0 overscroll-contain">
              <form onSubmit={handleSubmit} className="space-y-6 pb-8">
                
                {/* Seção de Foto do Aluno */}
                <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                  <div 
                    className="relative group cursor-pointer" 
                    onClick={() => photoInputRef.current?.click()}
                    title="Clique para escolher uma foto do computador ou celular"
                  >
                    <div className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-700 shadow-md overflow-hidden bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-700 dark:text-brand-300 text-2xl font-bold">
                      {photoUrl ? (
                        <img src={photoUrl} alt="Foto do aluno" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(name)
                      )}
                    </div>
                    
                    {/* Overlay no Hover/Toque */}
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="text-white w-7 h-7" />
                    </div>
                    
                    {/* Badge de Upload */}
                    <div className="absolute bottom-0 right-0 bg-brand-600 text-white p-1.5 rounded-full border-2 border-white dark:border-slate-800 shadow-sm">
                      <Upload size={14} />
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <Upload size={13} />
                      {photoUrl ? 'Trocar foto' : 'Enviar foto'}
                    </button>

                    <button
                      type="button"
                      onClick={handleRandomAvatar}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 border border-gray-200 dark:border-slate-600 rounded-lg transition-colors flex items-center gap-1.5"
                      title="Gerar um avatar ilustrado aleatório"
                    >
                      <Sparkles size={13} className="text-amber-500" />
                      Avatar divertido
                    </button>

                    {photoUrl && (
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        className="px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1.5">
                    Formatos aceitos: JPG, PNG, WEBP (fotos da câmera ou galeria)
                  </p>
                  
                  <input 
                    type="file" 
                    ref={photoInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handlePhotoUpload} 
                  />
                </div>

                {/* Dados Básicos */}
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-2">Dados Pessoais</h4>
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                    <input 
                        type="text" 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: João Silva"
                        className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Idade</label>
                        <input 
                        type="number" 
                        required
                        min="0"
                        max="18"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
                        <select 
                        required
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                        className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        >
                        <option value="">Selecione...</option>
                        {classGroups.map(cls => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                        </select>
                    </div>
                    </div>

                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Necessidades Especiais</label>
                    <input 
                        type="text"
                        value={needs}
                        onChange={(e) => setNeeds(e.target.value)}
                        placeholder="Ex: Alergia, TDAH... (Opcional)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                    </div>

                    {editingId && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select 
                        value={status}
                        onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                        className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        >
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                        </select>
                    </div>
                    )}
                </div>

                {/* Seção de Matérias e Notas */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Matérias, Professores e Notas</h4>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            <div className="col-span-2 md:col-span-1">
                                <input 
                                    type="text" 
                                    placeholder="Matéria (Ex: Math)"
                                    value={newSubName}
                                    onChange={(e) => setNewSubName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <input 
                                    type="text" 
                                    placeholder="Professor"
                                    value={newSubTeacher}
                                    onChange={(e) => setNewSubTeacher(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                                />
                            </div>
                            <div>
                                <input 
                                    type="number" 
                                    min="0" max="10" step="0.1"
                                    placeholder="Nota"
                                    value={newSubGrade}
                                    onChange={(e) => setNewSubGrade(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                                />
                            </div>
                            <div>
                                <input 
                                    type="number" 
                                    min="0" max="100"
                                    placeholder="Freq %"
                                    value={newSubAttendance}
                                    onChange={(e) => setNewSubAttendance(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                                />
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={handleAddSubject}
                            className="w-full bg-white border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50 text-sm flex items-center justify-center gap-2"
                        >
                            <Plus size={16} /> Adicionar Matéria
                        </button>
                    </div>

                    {subjects.length > 0 && (
                        <div className="space-y-2">
                            {subjects.map(sub => (
                                <div key={sub.id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                                    <div>
                                        <p className="font-bold text-sm text-gray-800">{sub.name}</p>
                                        <p className="text-xs text-gray-500">{sub.teacher}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">Nota</p>
                                            <p className="font-bold text-sm">{sub.grade}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">Freq.</p>
                                            <p className="font-bold text-sm">{sub.attendance}%</p>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => handleRemoveSubject(sub.id)}
                                            className="text-red-400 hover:text-red-600 p-1"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
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
                    {editingId ? 'Salvar Alterações' : 'Cadastrar Aluno'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Boletim Escolar */}
      {isReportCardOpen && viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm sm:p-4">
             <div className="bg-white w-full h-[90dvh] sm:h-auto sm:max-h-[90dvh] rounded-t-2xl sm:rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-8 sm:zoom-in duration-200 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100 shrink-0 bg-gray-50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                             <GraduationCap className="text-brand-600" /> Boletim Escolar
                        </h3>
                        <p className="text-sm text-gray-500">{viewingStudent.name} • {viewingStudent.age} anos</p>
                    </div>
                    <button onClick={() => setIsReportCardOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200">
                        <X size={24} />
                    </button>
                </div>

                <div className="overflow-y-auto p-4 sm:p-6 flex-1 min-h-0 overscroll-contain">
                     {/* Resumo do Aluno */}
                     <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <img src={viewingStudent.photoUrl} alt="Foto" className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md mx-auto sm:mx-0" />
                        <div className="flex-1 space-y-2 text-center sm:text-left">
                            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                    {getClassName(viewingStudent.classId)}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${viewingStudent.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {viewingStudent.status === 'active' ? 'Matriculado' : 'Inativo'}
                                </span>
                            </div>
                            <div className="flex justify-center sm:justify-start gap-4 text-sm text-gray-600">
                                <span><strong className="text-gray-900">Média Geral:</strong> {
                                    viewingStudent.subjects.length > 0 
                                    ? (viewingStudent.subjects.reduce((acc, s) => acc + s.grade, 0) / viewingStudent.subjects.length).toFixed(1)
                                    : 'N/A'
                                }</span>
                                <span><strong className="text-gray-900">Frequência Global:</strong> {viewingStudent.attendanceRate}%</span>
                            </div>
                             {viewingStudent.needs && viewingStudent.needs !== 'Nenhuma' && (
                                <p className="text-xs text-amber-600 font-medium bg-amber-50 p-2 rounded border border-amber-100 inline-block">
                                    ⚠ {viewingStudent.needs}
                                </p>
                             )}
                        </div>
                     </div>

                     {/* Tabela de Notas */}
                     <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700 pb-2 mb-4">Desempenho por Disciplina</h4>
                     
                     {viewingStudent.subjects && viewingStudent.subjects.length > 0 ? (
                         <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
                             <table className="w-full text-left text-sm">
                                 <thead className="bg-gray-50 dark:bg-slate-800">
                                     <tr>
                                         <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Disciplina</th>
                                         <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Professor</th>
                                         <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-center">Frequência</th>
                                         <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-center">Nota Final</th>
                                         <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-center">Situação</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                     {viewingStudent.subjects.map(sub => (
                                         <tr key={sub.id} className="dark:bg-slate-900/50">
                                             <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">
                                                <div className="flex items-center gap-2">
                                                    <BookOpen size={16} className="text-brand-400" />
                                                    {sub.name}
                                                </div>
                                             </td>
                                             <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{sub.teacher}</td>
                                             <td className="px-4 py-3 text-center">
                                                 <span className={`font-bold ${sub.attendance < 75 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                     {sub.attendance}%
                                                 </span>
                                             </td>
                                             <td className="px-4 py-3 text-center font-bold text-gray-800 dark:text-gray-200">{sub.grade.toFixed(1)}</td>
                                             <td className="px-4 py-3 text-center">
                                                 {sub.grade >= 6 && sub.attendance >= 75 ? (
                                                     <span className="bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded text-xs font-bold uppercase">Aprovado</span>
                                                 ) : (
                                                     <span className="bg-red-100/50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded text-xs font-bold uppercase">Recuperação</span>
                                                 )}
                                             </td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                     ) : (
                         <div className="text-center py-8 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-gray-300 dark:border-slate-700">
                             <p className="text-gray-500 dark:text-gray-400">Nenhuma nota registrada para este aluno.</p>
                         </div>
                     )}

                     {/* Botão de Fechar */}
                     <div className="mt-8 pt-4 pb-8 border-t border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                         <button 
                            type="button"
                            onClick={handleGenerateAI}
                            disabled={isGeneratingAI || !viewingStudent.subjects || viewingStudent.subjects.length === 0}
                            className="w-full sm:w-auto flex justify-center items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                            <Sparkles size={18} className={isGeneratingAI ? "animate-spin" : ""} />
                            {isGeneratingAI ? 'Analisando dados...' : 'Gerar Parecer com IA e Imprimir'}
                         </button>
                         <button 
                            onClick={() => setIsReportCardOpen(false)}
                            className="w-full sm:w-auto bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-200 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                         >
                            Fechar Boletim
                         </button>
                     </div>
                </div>
             </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={!!deleteId}
        title="Excluir Aluno"
        message="Tem certeza que deseja excluir este aluno? Todos os dados associados serão perdidos."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};