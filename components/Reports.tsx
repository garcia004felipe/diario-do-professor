import React, { useState, useEffect } from 'react';
import { Report, Student, ExtraClass, UserProfile } from '../types';
import { FileText, Plus, Search, Trash2, Eye, X, AlertTriangle, Activity, Calendar, Calculator, Edit, Download } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { ReportPdfViewer } from './ReportPdfViewer';
import { ExportService } from '../services/exportService';
import { motion } from 'framer-motion';
import { DictationButton } from './DictationButton';

interface ReportsProps {
  reports: Report[];
  students: Student[];
  extraClasses: ExtraClass[];
  onAdd: (report: Omit<Report, 'id'>) => void;
  onEdit: (report: Report) => void;
  onDelete: (id: string) => void;
  currentUser: UserProfile | null;
}

export const Reports: React.FC<ReportsProps> = ({ reports, students, extraClasses, onAdd, onEdit, onDelete, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // PDF Viewer State
  const [viewPdfReport, setViewPdfReport] = useState<Report | null>(null);

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [attendanceRate, setAttendanceRate] = useState(100);
  const [absencesCount, setAbsencesCount] = useState(0);
  const [totalClasses, setTotalClasses] = useState(200); // Default base for calculation
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [comorbidities, setComorbidities] = useState('');
  const [observations, setObservations] = useState('');
  const [studentExtraClasses, setStudentExtraClasses] = useState<string[]>([]);

  // Bloqueia a rolagem do fundo (#main-content) quando o modal está aberto
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

  // Effect to auto-fill data when student changes (ONLY when creating new, not editing)
  useEffect(() => {
    if (selectedStudentId && !editingId) {
      const student = students.find(s => s.id === selectedStudentId);
      if (student) {
        setAttendanceRate(student.attendanceRate);
        setDietaryRestrictions(student.needs);
      }
    }

    // Always update extra classes based on the selected student ID
    if (selectedStudentId) {
      const classes = extraClasses
        .filter(c => c.participants.includes(selectedStudentId))
        .map(c => `${c.name} (${c.dayOfWeek.substring(0, 3)} ${c.startTime})`);
      setStudentExtraClasses(classes);
    } else {
      setStudentExtraClasses([]);
      if (!editingId) setDietaryRestrictions('');
    }

  }, [selectedStudentId, students, extraClasses, editingId]);

  // Effect to calculate attendance rate automatically when absences or total classes change
  useEffect(() => {
    if (totalClasses > 0) {
      const calculatedRate = ((totalClasses - absencesCount) / totalClasses) * 100;
      setAttendanceRate(Math.max(0, Math.min(100, Math.round(calculatedRate))));
    }
  }, [absencesCount, totalClasses]);

  const handleEditClick = (report: Report) => {
    setEditingId(report.id);
    setSelectedStudentId(report.studentId);
    setAbsencesCount(report.absencesCount);
    setAttendanceRate(report.attendanceRate);
    setDietaryRestrictions(report.dietaryRestrictions);
    setComorbidities(report.comorbidities);
    setObservations(report.observations);

    if (report.attendanceRate < 100) {
      const calculatedTotal = Math.round((100 * report.absencesCount) / (100 - report.attendanceRate));
      setTotalClasses(calculatedTotal > 0 ? calculatedTotal : 200);
    } else {
      setTotalClasses(200); // Default if 100% attendance
    }

    setIsModalOpen(true);
  };

  const openNewModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    const reportData = {
      studentId: selectedStudentId,
      studentName: student.name,
      date: new Date().toISOString().split('T')[0],
      attendanceRate,
      absencesCount,
      dietaryRestrictions,
      comorbidities: comorbidities || 'Nenhuma',
      extraClassesSummary: studentExtraClasses,
      observations
    };

    if (editingId) {
      onEdit({ ...reportData, id: editingId });
    } else {
      onAdd(reportData);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedStudentId('');
    setAttendanceRate(100);
    setAbsencesCount(0);
    setTotalClasses(200);
    setDietaryRestrictions('');
    setComorbidities('');
    setObservations('');
    setStudentExtraClasses([]);
  };

  const filteredReports = reports.filter(r =>
    r.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Relatórios</h2>
          <p className="text-gray-500 text-sm">Acompanhamento individual e relatórios de desempenho.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar aluno..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={openNewModal}
            className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus size={18} />
            Novo Relatório
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {filteredReports.map((report) => (
          <motion.div variants={itemVariants} key={report.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 lg:p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-50 text-brand-600 rounded-lg shrink-0">
                  <FileText size={24} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{report.studentName}</h3>
                  <p className="text-xs text-gray-500">Gerado: {new Date(report.date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => handleEditClick(report)}
                  className="p-2 text-gray-400 hover:text-brand-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => setDeleteId(report.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">Frequência</p>
                <p className={`font-semibold ${report.attendanceRate < 75 ? 'text-red-600' : 'text-gray-800'}`}>
                  {report.attendanceRate}% ({report.absencesCount} f.)
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">Aulas Extras</p>
                <p className="font-semibold text-gray-800">{report.extraClassesSummary.length} ativ.</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <span className="truncate"><span className="font-medium">Restrições:</span> {report.dietaryRestrictions || 'Nenhuma'}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <Activity size={16} className="text-rose-500 mt-0.5 shrink-0" />
                <span className="truncate"><span className="font-medium">Comorbidades:</span> {report.comorbidities || 'Nenhuma'}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const student = students.find(s => s.id === report.studentId);
                  if (student) {
                    ExportService.exportReportToPDF(report, student);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 py-2.5 rounded-lg transition-all text-sm font-medium"
              >
                <Download size={16} />
                Baixar PDF
              </button>
              <button
                onClick={() => setViewPdfReport(report)}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-gray-600 hover:text-brand-700 py-2.5 rounded-lg transition-all text-sm font-medium"
              >
                <Eye size={16} />
                Visualizar
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500">Nenhum relatório encontrado.</p>
        </div>
      )}

      {/* Modal Novo/Editar Relatório - RESPONSIVO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm sm:p-4">
          <div className="bg-white w-full h-[85dvh] sm:h-auto sm:max-h-[90dvh] rounded-t-2xl sm:rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-8 sm:zoom-in duration-200 flex flex-col">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Editar Relatório' : 'Gerar Novo Relatório'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
                <X size={24} />
              </button>
            </div>

            {/* FIX: min-h-0 */}
            <div className="overflow-y-auto p-4 sm:p-6 flex-1 min-h-0 overscroll-contain">
              <form onSubmit={handleSubmit} className="space-y-6 pb-4">

                {/* Seleção do Aluno */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Aluno</label>
                  <select
                    required
                    value={selectedStudentId}
                    disabled={!!editingId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className={`w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base sm:text-sm ${editingId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Selecione...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {selectedStudentId && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <div className="md:col-span-3 mb-1 flex items-center gap-2 text-brand-700">
                        <Calculator size={16} />
                        <span className="text-sm font-semibold">Cálculo de Frequência</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-0">
                        <div className="md:mb-3">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Dias Letivos</label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={totalClasses}
                            onChange={(e) => setTotalClasses(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Faltas</label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={absencesCount}
                            onChange={(e) => setAbsencesCount(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                      </div>
                      <div className="col-span-2 md:col-span-1 mt-2 md:mt-0">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Frequência Global (%)</label>
                        <input
                          type="number"
                          min="0" max="100"
                          required
                          readOnly
                          value={attendanceRate}
                          className="w-full px-3 py-2 border border-gray-300 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Restrições Alimentares</label>
                        <input
                          type="text"
                          value={dietaryRestrictions}
                          onChange={(e) => setDietaryRestrictions(e.target.value)}
                          placeholder="Ex: Intolerância a Glúten"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Comorbidades / Deficiências</label>
                        <input
                          type="text"
                          value={comorbidities}
                          onChange={(e) => setComorbidities(e.target.value)}
                          placeholder="Ex: Asma, TDAH..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Aulas Extras e Horários</label>
                      {studentExtraClasses.length > 0 ? (
                        <ul className="grid grid-cols-1 gap-2">
                          {studentExtraClasses.map((cls, idx) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-center gap-2 bg-white px-3 py-2 rounded border border-gray-200">
                              <Activity size={14} className="text-brand-500 shrink-0" />
                              <span className="truncate">{cls}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500 italic">Este aluno não possui aulas extras.</p>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">Observações Gerais</label>
                        <DictationButton onResult={(t) => setObservations(prev => prev ? prev + ' ' + t : t)} className="w-8 h-8" />
                      </div>
                      <div className="bg-white rounded-lg pb-4">
                        <textarea 
                          value={observations}
                          onChange={(e) => setObservations(e.target.value)}
                          placeholder="Descreva o desempenho e observações gerais sobre o aluno..."
                          className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 resize-y"
                        />
                      </div>
                    </div>
                  </>
                )}

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
                    disabled={!selectedStudentId}
                    className="flex-1 px-4 py-3 sm:py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                  >
                    {editingId ? 'Salvar' : 'Gerar Relatório'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {viewPdfReport && (
        <ReportPdfViewer
          report={viewPdfReport}
          student={students.find(s => s.id === viewPdfReport.studentId)}
          schoolName={currentUser?.school || 'Escola não informada'}
          teacherName={currentUser?.name || 'Professor não informado'}
          onClose={() => setViewPdfReport(null)}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Excluir Relatório"
        message="Tem certeza que deseja excluir este relatório?"
        onConfirm={() => {
          if (deleteId) onDelete(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </motion.div>
  );
};