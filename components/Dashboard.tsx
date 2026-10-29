import React, { useState, useMemo } from 'react';
import { Users, Calendar, AlertCircle, TrendingUp, Filter, ListFilter } from 'lucide-react';
import { Student, ViewState, ClassGroup } from '../types';
import { motion } from 'framer-motion';

interface DashboardProps {
  totalStudents: number;
  totalClasses: number;
  extraClassesToday: number;
  students: Student[];
  classes: ClassGroup[];
  onNavigate: (view: ViewState) => void;
}

// Cores do Gráfico
const CHART_COLORS = [
  { id: 'high', label: 'Acima (90%+)', color: '#10b981', tailwind: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  { id: 'medium', label: 'Esperado (75-89%)', color: '#3b82f6', tailwind: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  { id: 'low', label: 'Abaixo (<75%)', color: '#f59e0b', tailwind: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
];

export const Dashboard: React.FC<DashboardProps> = ({ 
  totalStudents, 
  totalClasses, 
  extraClassesToday, 
  students, 
  classes,
  onNavigate 
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [activeChartFilter, setActiveChartFilter] = useState<string | null>(null);

  // 1. Filtra alunos baseado na turma selecionada
  const classFilteredStudents = useMemo(() => {
    return selectedClassId === 'all' 
      ? students 
      : students.filter(s => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  // 2. Filtra a lista final baseado no Hover do gráfico (se houver)
  const displayStudents = useMemo(() => {
    if (!activeChartFilter) return classFilteredStudents;

    return classFilteredStudents.filter(s => {
      if (activeChartFilter === 'high') return s.attendanceRate >= 90;
      if (activeChartFilter === 'medium') return s.attendanceRate >= 75 && s.attendanceRate < 90;
      if (activeChartFilter === 'low') return s.attendanceRate < 75;
      return true;
    });
  }, [classFilteredStudents, activeChartFilter]);

  // Calcula Média Geral da visualização atual
  const averageAttendance = useMemo(() => {
    if (classFilteredStudents.length === 0) return 0;
    const totalRate = classFilteredStudents.reduce((acc, s) => acc + s.attendanceRate, 0);
    return Math.round(totalRate / classFilteredStudents.length);
  }, [classFilteredStudents]);

  // Calcula dados para o gráfico de pizza
  const chartData = useMemo(() => {
    let acima = 0;
    let esperado = 0;
    let abaixo = 0;
    const total = classFilteredStudents.length;

    classFilteredStudents.forEach(student => {
      if (student.attendanceRate >= 90) acima++;
      else if (student.attendanceRate >= 75) esperado++;
      else abaixo++;
    });

    const calcPct = (val: number) => total > 0 ? (val / total) * 100 : 0;

    return [
      { id: CHART_COLORS[0].id, name: CHART_COLORS[0].label, value: acima, percent: calcPct(acima), color: CHART_COLORS[0].color, tailwind: CHART_COLORS[0].tailwind },
      { id: CHART_COLORS[1].id, name: CHART_COLORS[1].label, value: esperado, percent: calcPct(esperado), color: CHART_COLORS[1].color, tailwind: CHART_COLORS[1].tailwind },
      { id: CHART_COLORS[2].id, name: CHART_COLORS[2].label, value: abaixo, percent: calcPct(abaixo), color: CHART_COLORS[2].color, tailwind: CHART_COLORS[2].tailwind },
    ].filter(item => item.value > 0);
  }, [classFilteredStudents]);

  // Calcula dados para o gráfico de barras (Média por turma)
  const barChartData = useMemo(() => {
    if (selectedClassId !== 'all') return [];
    
    return classes.map(cls => {
      const clsStudents = students.filter(s => s.classId === cls.id);
      const avg = clsStudents.length > 0 
        ? Math.round(clsStudents.reduce((acc, s) => acc + s.attendanceRate, 0) / clsStudents.length)
        : 0;
      return {
        name: cls.name.length > 15 ? cls.name.substring(0, 15) + '...' : cls.name,
        media: avg,
        fill: avg >= 90 ? '#10b981' : avg >= 75 ? '#3b82f6' : '#f59e0b'
      };
    }).filter(item => item.media > 0);
  }, [classes, students, selectedClassId]);

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return 'bg-emerald-500';
    if (rate >= 75) return 'bg-blue-500';
    return 'bg-amber-500';
  };

  const getAttendanceTextColor = (rate: number) => {
    if (rate >= 90) return 'text-emerald-600';
    if (rate >= 75) return 'text-blue-600';
    return 'text-amber-600';
  };

  const getClassName = (id: string) => {
    const cls = classes.find(c => c.id === id);
    return cls ? cls.name : 'N/A';
  };

  // Animações
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVariants} 
      initial="hidden" 
      animate="show" 
      className="space-y-6"
    >
      {/* Header & Filter */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors duration-200">
         <div>
           <h2 className="text-lg font-bold text-gray-800 dark:text-white">Visão Geral</h2>
           <p className="text-sm text-gray-500 dark:text-gray-400">Acompanhe os principais indicadores escolares.</p>
         </div>
         
         <div className="w-full md:w-auto flex items-center gap-2 bg-gray-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors duration-200">
            <Filter size={16} className="text-gray-400 dark:text-gray-500 ml-2 shrink-0" />
            <select 
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none border-none py-1 pr-2 cursor-pointer"
            >
              <option value="all" className="dark:bg-slate-800">Todas as Turmas</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id} className="dark:bg-slate-800">{cls.name}</option>
              ))}
            </select>
         </div>
      </motion.div>

      {/* Cards Section */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => onNavigate(ViewState.STUDENTS)} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-brand-200 dark:hover:border-brand-500/50 transition-all group">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-brand-600 transition-colors">Total Alunos</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{classFilteredStudents.length}</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
            <Users size={24} />
          </div>
        </div>

        <div onClick={() => onNavigate(ViewState.CLASSES)} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-all group">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Turmas Ativas</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{selectedClassId === 'all' ? totalClasses : 1}</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
            <TrendingUp size={24} />
          </div>
        </div>

        <div onClick={() => onNavigate(ViewState.EXTRA_CLASSES)} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-500/50 transition-all group">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Aulas Extras Hoje</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{extraClassesToday}</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors">
            <Calendar size={24} />
          </div>
        </div>

        <div onClick={() => onNavigate(ViewState.REPORTS)} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-amber-200 dark:hover:border-amber-500/50 transition-all group">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Alertas</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-500">{classFilteredStudents.filter(s => s.attendanceRate < 75).length}</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg group-hover:bg-amber-100 dark:group-hover:bg-amber-900/50 transition-colors">
            <AlertCircle size={24} />
          </div>
        </div>
      </motion.div>

      {/* Gráficos Recharts */}
      <motion.div variants={itemVariants} className={`grid grid-cols-1 gap-6 ${selectedClassId === 'all' && classes.length > 0 ? 'lg:grid-cols-2' : ''}`}>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col min-h-[400px] transition-colors duration-200">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Desempenho Geral</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Distribuição da frequência média dos alunos.</p>
          <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8">
            <div className="relative w-48 h-48 rounded-full shadow-inner flex items-center justify-center transition-all duration-500" 
                 style={{ 
                   background: `conic-gradient(${chartData.map((d, i, arr) => {
                     const prevPct = arr.slice(0, i).reduce((sum, item) => sum + item.percent, 0);
                     return `${d.color} ${prevPct}% ${prevPct + d.percent}%`;
                   }).join(', ')})`
                 }}>
               {/* Inner circle for Donut effect */}
               <div className="absolute w-32 h-32 bg-white dark:bg-slate-800 rounded-full shadow-sm flex flex-col items-center justify-center z-10 border border-gray-50 dark:border-slate-700 transition-colors duration-200">
                   <span className="text-3xl font-black text-gray-800 dark:text-white">{averageAttendance}%</span>
               </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="text-center mb-2">
                <span className="text-2xl font-bold text-gray-800 dark:text-white">{averageAttendance}%</span>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Média Geral</p>
              </div>
              {chartData.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center justify-between gap-4 text-sm group cursor-pointer p-2 rounded-lg transition-colors ${activeChartFilter === item.id ? 'bg-gray-50 dark:bg-slate-700 ring-1 ring-gray-200 dark:ring-slate-600' : 'hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                  onMouseEnter={() => setActiveChartFilter(item.id)}
                  onMouseLeave={() => setActiveChartFilter(null)}
                >
                   <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${item.tailwind}`}></span>
                      <span className="text-gray-600 dark:text-gray-300">{item.name}</span>
                   </div>
                   <span className="font-bold text-gray-800 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {selectedClassId === 'all' && classes.length > 0 && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col min-h-[400px] transition-colors duration-200">
             <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Média por Turma</h3>
             <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Comparativo de frequência entre as turmas.</p>
             <div className="flex-1 w-full h-64 flex items-end justify-around pt-8 pb-2 border-b border-gray-100 dark:border-slate-700 relative transition-colors duration-200">
                {/* Y-Axis visual dashed lines */}
                <div className="absolute inset-x-0 bottom-2 top-8 flex flex-col justify-between pointer-events-none opacity-20 dark:opacity-10 z-0">
                  <div className="border-t border-dashed border-gray-400 dark:border-gray-500 w-full h-0"></div>
                  <div className="border-t border-dashed border-gray-400 dark:border-gray-500 w-full h-0"></div>
                  <div className="border-t border-dashed border-gray-400 dark:border-gray-500 w-full h-0"></div>
                </div>

                {barChartData.map((entry, index) => (
                  <div key={index} className="flex flex-col items-center justify-end h-full flex-1 group z-10 relative px-1">
                     <div className="w-full max-w-[48px] relative flex justify-center items-end h-[85%]">
                        {/* Tooltip */}
                        <div className="absolute -top-12 bg-gray-800 dark:bg-slate-700 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg font-medium">
                          {entry.media}% Frequência
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-800 dark:bg-slate-700 rotate-45"></div>
                        </div>
                        {/* Bar */}
                        <div 
                          className="w-full rounded-t-md transition-all duration-700 ease-out hover:brightness-110 cursor-pointer shadow-sm relative overflow-hidden"
                          style={{ height: `${Math.max(entry.media, 4)}%`, backgroundColor: entry.fill }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/10 dark:from-black/30 to-transparent"></div>
                        </div>
                     </div>
                     <span className="mt-3 text-xs font-semibold text-gray-500 dark:text-gray-400 truncate w-full text-center">{entry.name}</span>
                  </div>
                ))}
             </div>
          </div>
        )}
      </motion.div>

      {/* Lista Detalhada de Desempenho por Aluno */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col overflow-hidden min-h-[420px] transition-colors duration-200">
        <div className="flex justify-between items-center p-6 border-b dark:border-slate-700 transition-colors duration-300">
          <div className="flex items-center gap-3">
             <ListFilter size={20} className={activeChartFilter ? "text-brand-500 animate-pulse" : "text-gray-400 dark:text-gray-500"} />
             <div>
               <h3 className="text-lg font-bold dark:text-white">Desempenho por Aluno</h3>
               <p className="text-xs opacity-80 text-gray-500 dark:text-gray-400">{activeChartFilter ? 'Filtrado pelo gráfico' : 'Todos os Alunos'}</p>
             </div>
          </div>
          <button onClick={() => onNavigate(ViewState.STUDENTS)} className="text-xs bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 transition-colors font-medium">
              Gerenciar
          </button>
        </div>
        
        <div className="overflow-x-auto flex-1 p-2 overscroll-contain">
           <table className="w-full text-left min-w-[500px]">
             <thead>
               <tr className="border-b border-gray-100 dark:border-slate-700">
                 <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Aluno</th>
                 <th className="py-3 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Turma</th>
                 <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Indicador</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
               {displayStudents.length > 0 ? (
                 displayStudents.map(student => (
                   <motion.tr 
                     initial={{ opacity: 0 }} 
                     animate={{ opacity: 1 }} 
                     key={student.id} 
                     className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group cursor-default"
                   >
                     <td className="py-3 px-4">
                       <div className="flex items-center gap-3">
                          <img src={student.photoUrl} alt={student.name} className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-slate-600" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[150px]">{student.name}</span>
                       </div>
                     </td>
                     <td className="py-3 px-2">
                       <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded whitespace-nowrap">
                         {getClassName(student.classId)}
                       </span>
                     </td>
                     <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 w-full max-w-[140px]">
                          <div className="flex justify-between text-xs">
                             <span className={getAttendanceTextColor(student.attendanceRate)}>
                               {student.attendanceRate >= 90 ? 'Excelente' : student.attendanceRate >= 75 ? 'Regular' : 'Atenção'}
                             </span>
                             <span className="font-bold text-gray-600 dark:text-gray-300">{student.attendanceRate}%</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${getAttendanceColor(student.attendanceRate)}`} style={{ width: `${student.attendanceRate}%` }} />
                          </div>
                        </div>
                     </td>
                   </motion.tr>
                 ))
               ) : (
                 <tr>
                   <td colSpan={3} className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                     <div className="flex flex-col items-center gap-2">
                       <Users size={32} className="opacity-20" />
                       <p>Nenhum aluno encontrado.</p>
                     </div>
                   </td>
                 </tr>
               )}
             </tbody>
           </table>
        </div>
      </motion.div>
    </motion.div>
  );
};