import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Users, Calendar, FileText, Settings, LogOut,
  Menu, X, GraduationCap, Sparkles, School, Bell, BookOpen, Clock, Building, Edit2, RotateCcw,
  Download, Upload, Save, CheckCircle, Smartphone, Moon, Sun, Search, RefreshCw, WifiOff, CloudOff, Cloud, MessageSquareText
} from 'lucide-react';

import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Students } from './components/Students';
import { ExtraClasses } from './components/ExtraClasses';
import { Classes } from './components/Classes';
import { AiAssistant } from './components/AiAssistant';
import { Reports } from './components/Reports';
import { NotificationPanel } from './components/NotificationPanel';
import { EditProfileModal } from './components/EditProfileModal';
import { GlobalSearch } from './components/GlobalSearch';
import { ForgotPassword } from './components/ForgotPassword';
import { DatabaseTest } from './components/DatabaseTest';
import { Communications } from './components/Communications';
import { ViewState, Student, ExtraClass, ActivityType, ClassGroup, Report, NotificationItem, UserProfile, AiGeneratedContent, Communication } from './types';
import { generateStudentPerformanceReport, hasApiKey } from './services/geminiService';
import * as db from './services/database';
import { ExportService } from './services/exportService';
import { generateIntelligentNotifications } from './services/notificationService';
import { useTheme } from './contexts/ThemeContext';
import { supabase } from './services/supabaseClient';
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/Toast';
import { DashboardSkeleton, StudentsListSkeleton, ClassesGridSkeleton } from './components/Skeleton';

// --- DADOS INICIAIS (SEED DATA) ---
// Configurado como VAZIO para instalação limpa (Produção)

const INITIAL_CLASSES: ClassGroup[] = [];

const INITIAL_STUDENTS: Student[] = [];

const getTodayString = () => {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[new Date().getDay()];
};

const INITIAL_EXTRA_CLASSES: ExtraClass[] = [];

const INITIAL_REPORTS: Report[] = [];

// Função para carregar apenas sessão do usuário do localStorage
const loadUserSession = (): UserProfile | null => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('dp_user');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error('Error loading user session', e);
    return null;
  }
};

export default function App() {
  // Verificar se está no modo de teste
  const isTestMode = new URLSearchParams(window.location.search).get('test') === 'db';

  // Theme hook
  const { theme, toggleTheme } = useTheme();

  // Toast notifications
  const { toasts, showToast, dismissToast } = useToast();

  // Estado inicial otimista (UI rápida), mas validado pelo Supabase depois
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => loadUserSession());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!loadUserSession());
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);

  // Lógica de estado inicial da Sidebar - Começa sempre fechada
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Novos estados para funcionalidades avançadas
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Estados de Rede e Sincronização
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // Estados inicializados vazios - dados virão do Supabase
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [extraClasses, setExtraClasses] = useState<ExtraClass[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [aiContents, setAiContents] = useState<AiGeneratedContent[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);

  // Ref para controlar a execução única do monitoramento IA
  const hasRunAiCheck = useRef(false);
  const initialLoadComplete = useRef(false);

  // Atalho de teclado Ctrl+K para busca global
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Monitorar Offline Sync Events
  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    
    const handleSyncStart = () => setIsSyncing(true);
    const handleSyncFinish = () => {
      setIsSyncing(false);
      // Recarregar os dados do Supabase agora que a sync terminou
      if (currentUser?.email && userId) {
        loadUserData(currentUser.email, userId);
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline-sync-started', handleSyncStart);
    window.addEventListener('offline-sync-finished', handleSyncFinish);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline-sync-started', handleSyncStart);
      window.removeEventListener('offline-sync-finished', handleSyncFinish);
    };
  }, [currentUser, userId]);

  const loadUserData = async (email: string, authId: string) => {
    console.log('✅ Iniciando carregamento de dados do Supabase para:', email, 'AuthID:', authId);
    setIsLoading(true);
    // CRÍTICO: Usar o ID da autenticação para o RLS funcionar
    setUserId(authId);

    try {
      // Buscar ou criar perfil do usuário
      let userProfile = await db.getUserProfileByEmail(email);

      if (!userProfile) {
        // Criar novo perfil se não existir — SEMPRE usando authId como id
        const localUser = loadUserSession();
        const profileToCreate = {
          id: authId, // CRÍTICO: o id deve ser = auth.uid() para RLS funcionar
          name: (localUser?.email === email ? localUser?.name : null) || email.split('@')[0],
          email: email,
          school: (localUser?.email === email ? localUser?.school : null) || '',
          photoUrl: '',
          shifts: [] as string[]
        };
        userProfile = await db.createUserProfile(profileToCreate);
      }

      console.log('👤 Perfil do usuário carregado/criado:', userProfile);
      // IMPORTANTE: NÃO sobrescrever userId com userProfile.id — o userId deve
      // sempre ser o authId do Supabase, pois é o que o RLS e as queries usam.

      // Atualizar estado de usuário com dados reais do banco
      setCurrentUser(userProfile);
      // Persistir sessão atualizada localmente para next load rápido
      localStorage.setItem('dp_user', JSON.stringify(userProfile));

      // Carregar todos os dados do usuário EM PARALELO usando AuthID garantido
      const [classesData, studentsData, extraClassesData, reportsData, aiContentsData, notificationsData, communicationsData] = await Promise.all([
        db.getClassGroups(authId),
        db.getStudents(authId),
        db.getExtraClasses(authId),
        db.getReports(authId),
        db.getAiContents(authId),
        db.getNotifications(authId),
        db.getCommunications(authId)
      ]);

      console.log('📊 Dados carregados com sucesso');
      console.log('📄 Reports carregados:', reportsData?.length || 0, 'itens');
      setClasses(classesData || []);
      setStudents(studentsData || []);
      setExtraClasses(extraClassesData || []);
      setReports(reportsData || []);
      setAiContents(aiContentsData || []);
      setNotifications(notificationsData || []);
      setCommunications(communicationsData || []);

      initialLoadComplete.current = true;
    } catch (error) {
      console.error('❌ Erro crítico ao carregar dados:', error);
      // Tentar ler do localStorage como fallback se falhar (opcional)
    } finally {
      setIsLoading(false);
    }
  };

  // Monitorar Autenticação do Supabase - O VERDADEIRO GATILHO DE CARREGAMENTO
  useEffect(() => {
    // Verificar sessão atual ao montar
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 Sessão inicial Supabase:', session ? 'Ativa' : 'Nenhuma');
      if (session?.user?.email && session?.user?.id) {
        setIsAuthenticated(true);
        setUserId(session.user.id);
        if (!initialLoadComplete.current) {
          loadUserData(session.user.email, session.user.id);
        }
      } else {
        // Se NÃO há sessão ativa no Supabase, limpa o estado fantasma do localStorage
        console.warn('⚠️ Nenhuma sessão ativa no Supabase. Redirecionando para login.');
        setIsAuthenticated(false);
        setCurrentUser(null);
        setUserId(null);
        localStorage.removeItem('dp_user');
        setIsLoading(false);
      }
    });

    // Ouvir mudanças de auth (login, logout, refresh token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 Auth Change:', event, session?.user?.email);

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user?.email && session?.user?.id) {
        setIsAuthenticated(true);
        setUserId(session.user.id);
        loadUserData(session.user.email, session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setUserId(null);
        localStorage.removeItem('dp_user');
        setStudents([]);
        setClasses([]);
        setReports([]);
        setCommunications([]);
        initialLoadComplete.current = false;
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  // Persistência APENAS da sessão do usuário no localStorage (para manter login)
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('dp_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('dp_user');
    }
  }, [currentUser]);

  // REMOVIDO: Não salvamos mais dados no localStorage
  // Todos os dados agora vêm exclusivamente do Supabase

  // --- MONITORAMENTO INTELIGENTE DA IA ---
  useEffect(() => {
    if (!isAuthenticated || !hasApiKey() || hasRunAiCheck.current) return;

    const runAiMonitor = async () => {
      hasRunAiCheck.current = true;
      const now = new Date();
      const COOLDOWN_DAYS = 5;

      for (const student of students) {
        if (student.status !== 'active') continue;

        const lastCheckKey = `ai_last_report_${student.id}`;
        const lastCheckDateStr = localStorage.getItem(lastCheckKey);

        if (lastCheckDateStr) {
          const lastDate = new Date(lastCheckDateStr);
          const diffTime = Math.abs(now.getTime() - lastDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays < COOLDOWN_DAYS) continue;
        }

        let avgGrade = 0;
        let subjectsSummary = "Sem notas registradas.";

        if (student.subjects && student.subjects.length > 0) {
          const total = student.subjects.reduce((sum, s) => sum + s.grade, 0);
          avgGrade = total / student.subjects.length;
          subjectsSummary = student.subjects.map(s => `${s.name}: ${s.grade.toFixed(1)}`).join(', ');
        }

        let scenario: 'EXCELLENT' | 'CRITICAL' | 'IMPROVING' | 'DECLINING' | null = null;
        let notificationTitle = "";

        if (avgGrade >= 8.5 && student.attendanceRate >= 95) {
          scenario = 'EXCELLENT';
          notificationTitle = "🏆 Destaque Acadêmico";
        } else if (avgGrade < 6.0 || student.attendanceRate < 75) {
          scenario = 'CRITICAL';
          notificationTitle = "⚠️ Alerta de Rendimento";
        } else if (avgGrade >= 6.0 && avgGrade < 7.5 && student.attendanceRate > 90) {
          scenario = 'IMPROVING';
          notificationTitle = "📈 Melhora Percebida";
        } else if (avgGrade > 8.0 && student.attendanceRate < 85) {
          scenario = 'DECLINING';
          notificationTitle = "📉 Queda na Frequência";
        }

        if (scenario) {
          try {
            const reportText = await generateStudentPerformanceReport(
              student.name,
              scenario,
              { averageGrade: avgGrade, attendance: student.attendanceRate, subjectsSummary }
            );

            if (reportText && reportText !== 'MISSING_KEY' && reportText !== 'INVALID_KEY') {
              const newReport: Report = {
                id: Date.now().toString() + Math.random().toString().slice(2, 5),
                studentId: student.id,
                studentName: student.name,
                date: new Date().toISOString().split('T')[0],
                attendanceRate: student.attendanceRate,
                absencesCount: 0,
                dietaryRestrictions: student.needs,
                comorbidities: 'Gerado automaticamente pela IA',
                extraClassesSummary: [],
                observations: reportText
              };

              setReports(prev => [newReport, ...prev]);

              const newNotif: NotificationItem = {
                id: `ai-rep-${newReport.id}`,
                type: 'info',
                priority: scenario === 'CRITICAL' ? 'high' : 'medium',
                title: `${notificationTitle}: ${student.name}`,
                message: `Um relatório automático foi gerado baseado no desempenho recente. Toque para ver.`,
                time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                read: false,
                targetView: ViewState.REPORTS
              };

              setNotifications(prev => [newNotif, ...prev]);
              localStorage.setItem(lastCheckKey, now.toISOString());
              await new Promise(r => setTimeout(r, 2000));
            }
          } catch (err) {
            console.error("Erro ao gerar relatório automático:", err);
          }
        }
      }
    };

    const timeoutId = setTimeout(() => {
      runAiMonitor();
    }, 5000);

    return () => clearTimeout(timeoutId);

  }, [students, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const today = getTodayString();
    
    // Check locally for updates on students, classes, and extra classes
    const generatedNotifications = generateIntelligentNotifications(students, classes, extraClasses, today);

    setNotifications(prev => {
      const aiNotifications = prev.filter(n => n.id.startsWith('ai-rep-'));
      const existingMap = new Map(prev.map(n => [n.id, n]));
      const merged = [...aiNotifications];
      generatedNotifications.forEach(n => {
        const existing = existingMap.get(n.id);
        merged.push(existing ? { ...n, read: (existing as NotificationItem).read } : n);
      });
      return Array.from(new Map(merged.map(item => [item.id, item])).values()).sort((a, b) => b.time.localeCompare(a.time));
    });
  }, [students, extraClasses, isAuthenticated]);

  const handleMarkAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (userId) {
      try {
        await db.updateNotification(id, { read: true });
      } catch (error) {
        console.error('Erro ao atualizar notificação:', error);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (userId) {
      try {
        await db.updateAllNotificationsAsRead(userId);
      } catch (error) {
        console.error('Erro ao marcar todas como lidas:', error);
      }
    }
  };

  // Helper para obter com segurança o ID do usuário autenticado no Supabase
  const getActiveUserId = async (): Promise<string | null> => {
    if (userId) return userId;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
        return session.user.id;
      }
    } catch (e) {
      console.warn('Erro ao checar sessão ativa:', e);
    }
    if (currentUser?.id) {
      setUserId(currentUser.id);
      return currentUser.id;
    }
    return null;
  };

  const handleDeleteStudent = async (id: string) => {
    const student = students.find(s => s.id === id);
    if (student) {
      setClasses(prev => prev.map(cls =>
        cls.id === student.classId
          ? { ...cls, studentCount: Math.max(0, cls.studentCount - 1) }
          : cls
      ));
    }
    setStudents(prev => prev.filter(s => s.id !== id));

    const activeUserId = await getActiveUserId();
    if (activeUserId) {
      try {
        await db.deleteStudent(id);
        if (student) {
          await db.updateClassGroup(student.classId, { studentCount: Math.max(0, (classes.find(c => c.id === student.classId)?.studentCount || 1) - 1) });
        }
      } catch (error) {
        console.error('Erro ao deletar aluno:', error);
      }
    }
  };

  const handleAddStudent = async (studentData: Omit<Student, 'id' | 'status' | 'attendanceRate' | 'photoUrl'> & { photoUrl?: string }) => {
    let initialAttendance = 100;
    if (studentData.subjects && studentData.subjects.length > 0) {
      const total = studentData.subjects.reduce((acc, sub) => acc + sub.attendance, 0);
      initialAttendance = Math.round(total / studentData.subjects.length);
    }

    const newStudent: Student = {
      ...studentData,
      id: 'temp-' + Date.now(), // ID temporário
      status: 'active',
      attendanceRate: initialAttendance,
      photoUrl: studentData.photoUrl || `https://picsum.photos/100/100?random=${Date.now()}`
    };

    // Adiciona temporariamente ao estado local para UI responsiva
    setStudents(prev => [newStudent, ...prev]);

    setClasses(prev => prev.map(cls =>
      cls.id === studentData.classId
        ? { ...cls, studentCount: cls.studentCount + 1 }
        : cls
    ));

    const activeUserId = await getActiveUserId();
    if (activeUserId) {
      try {
        // Cria no Supabase e obtém o ID real
        const createdStudent = await db.createStudent(activeUserId, newStudent);

        // Atualiza o estado com o ID real do Supabase
        setStudents(prev => prev.map(s =>
          s.id === newStudent.id
            ? { ...newStudent, id: createdStudent.id }
            : s
        ));

        await db.updateClassGroup(studentData.classId, { studentCount: (classes.find(c => c.id === studentData.classId)?.studentCount || 0) + 1 });
      } catch (error) {
        console.error('Erro ao adicionar aluno:', error);
        // Remove do estado local em caso de erro
        setStudents(prev => prev.filter(s => s.id !== newStudent.id));
        setClasses(prev => prev.map(cls =>
          cls.id === studentData.classId
            ? { ...cls, studentCount: Math.max(0, cls.studentCount - 1) }
            : cls
        ));
        showToast('Erro ao salvar aluno no banco de dados.', 'error');
      }
    } else {
      showToast('Atenção: Faça login para salvar seus dados.', 'warning');
    }
  };

  const handleEditStudent = async (updatedStudent: Student) => {
    let globalAttendance = updatedStudent.attendanceRate;
    if (updatedStudent.subjects && updatedStudent.subjects.length > 0) {
      const total = updatedStudent.subjects.reduce((acc, sub) => acc + sub.attendance, 0);
      globalAttendance = Math.round(total / updatedStudent.subjects.length);
    }
    const finalStudent = { ...updatedStudent, attendanceRate: globalAttendance };

    setStudents(prev => {
      const oldStudent = prev.find(s => s.id === finalStudent.id);
      if (oldStudent && oldStudent.classId !== finalStudent.classId) {
        setClasses(currentClasses => currentClasses.map(cls => {
          if (cls.id === oldStudent.classId) return { ...cls, studentCount: Math.max(0, cls.studentCount - 1) };
          if (cls.id === finalStudent.classId) return { ...cls, studentCount: cls.studentCount + 1 };
          return cls;
        }));
      }
      return prev.map(s => s.id === finalStudent.id ? finalStudent : s);
    });

    const activeUserId = await getActiveUserId();
    if (activeUserId) {
      try {
        await db.updateStudent(finalStudent);
      } catch (error) {
        console.error('Erro ao editar aluno:', error);
      }
    }
  };

  const handleDeleteClass = async (id: string) => {
    setClasses(prev => prev.filter(c => c.id !== id));
    const activeUserId = await getActiveUserId();
    if (activeUserId) {
      try {
        await db.deleteClassGroup(id);
      } catch (error) {
        console.error('Erro ao deletar turma:', error);
      }
    }
  };

  // Função para Editar Turma
  const handleEditClass = async (updatedClass: ClassGroup) => {
    setClasses(prev => prev.map(c => c.id === updatedClass.id ? updatedClass : c));
    const activeUserId = await getActiveUserId();
    if (activeUserId) {
      try {
        await db.updateClassGroup(updatedClass.id, updatedClass);
      } catch (error) {
        console.error('Erro ao editar turma:', error);
      }
    }
  };

  const handleAddClass = async (newClassData: Omit<ClassGroup, 'id' | 'studentCount'>) => {
    const newClass: ClassGroup = {
      ...newClassData,
      id: 'temp-' + Date.now(), // ID temporário
      studentCount: 0
    };

    // Adiciona temporariamente ao estado local
    setClasses(prev => [...prev, newClass]);

    const activeUserId = await getActiveUserId();
    if (activeUserId) {
      try {
        const createdClass = await db.createClassGroup(activeUserId, newClassData);

        // Atualiza com o ID real do Supabase
        setClasses(prev => prev.map(c =>
          c.id === newClass.id
            ? { ...newClass, id: createdClass.id }
            : c
        ));
      } catch (error) {
        console.error('Erro ao adicionar turma:', error);
        // Remove do estado local em caso de erro
        setClasses(prev => prev.filter(c => c.id !== newClass.id));
        showToast('Erro ao salvar turma no banco de dados.', 'error');
      }
    } else {
      showToast('Atenção: Faça login para salvar seus dados.', 'warning');
    }
  };

  const handleExportClass = (classId: string) => {
    const classGroup = classes.find(c => c.id === classId);
    if (!classGroup) {
      console.warn('⚠️ Turma não encontrada para exportação:', classId);
      return;
    }

    console.log('📄 Iniciando exportação de boletins para:', classGroup.name);

    try {
      const result = ExportService.exportClassBulletin(classGroup, students, reports);
      if (result.success) {
        showToast(result.message, 'success');
      } else {
        showToast(result.message, 'warning');
      }
    } catch (error) {
      console.error('❌ Erro ao exportar boletins:', error);
      showToast('Erro ao gerar os boletins. Tente novamente.', 'error');
    }
  };

  const handleAddExtraClass = async (newExtraClass: Omit<ExtraClass, 'id'>) => {
    console.log('🎯 handleAddExtraClass CHAMADO:', newExtraClass);

    const newItem: ExtraClass = {
      ...newExtraClass,
      id: 'temp-' + Date.now(), // ID temporário
    };

    console.log('➕ Adicionando ao estado local:', newItem);
    // Adiciona temporariamente ao estado local
    setExtraClasses(prev => {
      console.log('📝 Estado anterior de extraClasses:', prev.length, 'itens');
      const newState = [...prev, newItem];
      console.log('📝 Novo estado de extraClasses:', newState.length, 'itens');
      return newState;
    });

    const activeUserId = await getActiveUserId();
    if (activeUserId) {
      try {
        console.log('💾 Salvando no Supabase...');

        // Converter 'all' para null para o banco de dados (UUID não aceita 'all')
        const dataToSave = {
          ...newExtraClass,
          classId: newExtraClass.classId === 'all' ? null : newExtraClass.classId
        };

        const createdExtraClass = await db.createExtraClass(activeUserId, dataToSave);
        console.log('✅ Salvo no Supabase com ID:', createdExtraClass.id);

        // Atualiza com o ID real do Supabase
        setExtraClasses(prev => {
          console.log('🔄 Atualizando ID temporário para ID real...');
          return prev.map(ec =>
            ec.id === newItem.id
              ? { ...newItem, id: createdExtraClass.id }
              : ec
          );
        });
        console.log('✅ ID atualizado com sucesso!');
      } catch (error) {
        console.error('❌ Erro ao adicionar aula extra:', error);
        // Remove do estado local em caso de erro
        setExtraClasses(prev => prev.filter(ec => ec.id !== newItem.id));
        showToast('Erro ao salvar aula extra no banco de dados.', 'error');
      }
    } else {
      showToast('Atenção: Faça login para salvar seus dados.', 'warning');
    }
  };

  const handleEditExtraClass = async (updatedClass: ExtraClass) => {
    setExtraClasses(prev => prev.map(item => item.id === updatedClass.id ? updatedClass : item));
    const activeUserId = await getActiveUserId();
    if (activeUserId) {
      try {
        await db.updateExtraClass(updatedClass);
      } catch (error) {
        console.error('Erro ao editar aula extra:', error);
      }
    }
  };

  const handleDeleteExtraClass = async (id: string) => {
    setExtraClasses(prev => prev.filter(c => c.id !== id));
    const activeUserId = await getActiveUserId();
    if (activeUserId) {
      try {
        await db.deleteExtraClass(id);
      } catch (error) {
        console.error('Erro ao deletar aula extra:', error);
      }
    }
  };

  const handleAddReport = async (newReport: Omit<Report, 'id'>) => {
    console.log('🎯 handleAddReport CHAMADO:', newReport);

    const report: Report = {
      ...newReport,
      id: 'temp-' + Date.now(), // ID temporário
    };

    console.log('➕ Adicionando ao estado local com ID temporário:', report.id);
    // Adiciona temporariamente ao estado local para UI responsiva
    setReports(prev => {
      console.log('📝 Estado anterior de reports:', prev.length, 'itens');
      const newState = [report, ...prev];
      console.log('📝 Novo estado de reports:', newState.length, 'itens');
      return newState;
    });

    const activeUserId = await getActiveUserId();
    if (activeUserId) {
      try {
        console.log('💾 Salvando no Supabase com userId:', activeUserId);
        // Cria no Supabase e obtém o ID real
        const createdReport = await db.createReport(activeUserId, newReport);
        console.log('✅ Salvo no Supabase com ID real:', createdReport.id);

        // Atualiza o estado com o ID real do Supabase
        setReports(prev => {
          console.log('🔄 Atualizando ID temporário', report.id, 'para ID real', createdReport.id);
          return prev.map(r =>
            r.id === report.id
              ? { ...report, id: createdReport.id }
              : r
          );
        });
        console.log('✅ ID atualizado com sucesso!');
      } catch (error) {
        console.error('❌ Erro ao adicionar relatório:', error);
        // Remove do estado local em caso de erro
        setReports(prev => prev.filter(r => r.id !== report.id));
        showToast('Erro ao salvar relatório no banco de dados.', 'error');
      }
    } else {
      showToast('Atenção: Faça login para salvar seus dados.', 'warning');
    }
  };

  const handleEditReport = async (updatedReport: Report) => {
    setReports(prev => prev.map(item => item.id === updatedReport.id ? updatedReport : item));
    const activeUserId = await getActiveUserId();
    if (activeUserId) {
      try {
        await db.updateReport(updatedReport);
      } catch (error) {
        console.error('Erro ao editar relatório:', error);
      }
    }
  };

  const handleDeleteReport = async (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
    const activeUserId = await getActiveUserId();
    if (activeUserId) {
      try {
        await db.deleteReport(id);
      } catch (error) {
        console.error('Erro ao deletar relatório:', error);
      }
    }
  };

  const handleSaveAiContent = async (content: Omit<AiGeneratedContent, 'id' | 'createdAt'>) => {
    const newItem: AiGeneratedContent = {
      ...content,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    setAiContents(prev => [newItem, ...prev]);
    const activeUserId = await getActiveUserId();
    if (activeUserId) {
      try {
        await db.createAiContent(activeUserId, content);
      } catch (error) {
        console.error('Erro ao salvar conteúdo IA:', error);
      }
    }
  };

  // --- COMMUNICATIONS HANDLERS ---
  const handleAddCommunication = async (commData: Omit<Communication, 'id' | 'createdAt'>) => {
    const newComm: Communication = {
      ...commData,
      id: 'temp-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setCommunications(prev => [newComm, ...prev]);

    const activeUserId = await getActiveUserId();
    if (activeUserId) {
      try {
        const created = await db.createCommunication(activeUserId, commData);
        setCommunications(prev => prev.map(c =>
          c.id === newComm.id ? { ...newComm, id: created.id, createdAt: created.created_at } : c
        ));
      } catch (error) {
        console.error('Erro ao criar comunicado:', error);
        setCommunications(prev => prev.filter(c => c.id !== newComm.id));
        showToast('Erro ao salvar comunicado no banco de dados.', 'error');
      }
    } else {
      showToast('Atenção: Faça login para salvar seus dados.', 'warning');
    }
  };

  const handleEditCommunication = async (updatedComm: Communication) => {
    setCommunications(prev => prev.map(c => c.id === updatedComm.id ? updatedComm : c));
    const activeUserId = await getActiveUserId();
    if (activeUserId) {
      try {
        await db.updateCommunication(updatedComm);
      } catch (error) {
        console.error('Erro ao editar comunicado:', error);
      }
    }
  };

  const handleDeleteCommunication = async (id: string) => {
    setCommunications(prev => prev.filter(c => c.id !== id));
    const activeUserId = await getActiveUserId();
    if (activeUserId) {
      try {
        await db.deleteCommunication(id);
      } catch (error) {
        console.error('Erro ao deletar comunicado:', error);
      }
    }
  };

  const handleDeleteAiContent = async (id: string) => {
    setAiContents(prev => prev.filter(c => c.id !== id));
    const activeUserId = await getActiveUserId();
    if (activeUserId) {
      try {
        await db.deleteAiContent(id);
      } catch (error) {
        console.error('Erro ao deletar conteúdo IA:', error);
      }
    }
  };

  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    if (user.id) {
      setUserId(user.id);
      loadUserData(user.email, user.id);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('dp_user');
    setCurrentView(ViewState.DASHBOARD);
  };

  const handleFactoryReset = () => {
    if (confirm("Atenção: Isso apagará TODOS os dados, incluindo seu cadastro de login. Tem certeza?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleProfileUpdate = (updatedProfile: UserProfile, updatedClasses: ClassGroup[]) => {
    setCurrentUser(updatedProfile);
    setClasses(updatedClasses);
  };

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        // Skeleton enquanto carrega pela primeira vez
        if (isLoading && students.length === 0 && classes.length === 0) {
          return <DashboardSkeleton />;
        }
        const today = getTodayString();
        console.log('📅 Hoje é:', today);
        console.log('📚 Total de aulas extras:', extraClasses.length);
        console.log('📚 Aulas extras:', extraClasses.map(c => ({ name: c.name, day: c.dayOfWeek })));
        const extraClassesTodayCount = extraClasses.filter(c => c.dayOfWeek === today).length;
        console.log('✅ Aulas extras HOJE:', extraClassesTodayCount);
        return (
          <Dashboard
            totalStudents={students.length}
            totalClasses={classes.length}
            extraClassesToday={extraClassesTodayCount}
            students={students}
            classes={classes}
            onNavigate={setCurrentView}
          />
        );
      case ViewState.STUDENTS:
        if (isLoading && students.length === 0) {
          return <StudentsListSkeleton />;
        }
        return (
          <Students
            students={students}
            classGroups={classes}
            onAdd={handleAddStudent}
            onEdit={handleEditStudent}
            onDelete={handleDeleteStudent}
          />
        );
      case ViewState.CLASSES:
        if (isLoading && classes.length === 0) {
          return <ClassesGridSkeleton />;
        }
        return (
          <Classes
            classes={classes}
            onAdd={handleAddClass}
            onEdit={handleEditClass}
            onDelete={handleDeleteClass}
            onAddStudent={handleAddStudent}
            onExportClass={handleExportClass}
            currentUser={currentUser}
          />
        );
      case ViewState.EXTRA_CLASSES:
        return (
          <ExtraClasses
            classes={extraClasses}
            classGroups={classes}
            students={students}
            onAdd={handleAddExtraClass}
            onEdit={handleEditExtraClass}
            onDelete={handleDeleteExtraClass}
          />
        );
      case ViewState.AI_PLANNER:
        return (
          <AiAssistant
            students={students}
            savedContents={aiContents}
            onSaveContent={handleSaveAiContent}
            onDeleteContent={handleDeleteAiContent}
          />
        );
      case ViewState.REPORTS:
        return (
          <Reports
            reports={reports}
            students={students}
            extraClasses={extraClasses}
            onAdd={handleAddReport}
            onEdit={handleEditReport}
            onDelete={handleDeleteReport}
            currentUser={currentUser}
          />
        );
      case ViewState.COMMUNICATIONS:
        return (
          <Communications
            communications={communications}
            classGroups={classes}
            currentUser={currentUser}
            onAdd={handleAddCommunication}
            onEdit={handleEditCommunication}
            onDelete={handleDeleteCommunication}
          />
        );
      default:
        return null;
    }
  };

  // Se estiver no modo de teste, mostrar apenas a página de teste (APÓS todos os hooks)
  if (isTestMode) {
    return <DatabaseTest />;
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} onForgotPassword={() => setShowForgotPassword(true)} />;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-brand-600 border-r-transparent"></div>
          <p className="mt-4 text-lg font-medium text-slate-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Visão Geral', icon: LayoutDashboard },
    { id: ViewState.CLASSES, label: 'Minhas Turmas', icon: School },
    { id: ViewState.STUDENTS, label: 'Alunos', icon: Users },
    { id: ViewState.EXTRA_CLASSES, label: 'Integral & Extras', icon: Calendar },
    { id: ViewState.AI_PLANNER, label: 'Central IA', icon: Sparkles },
    { id: ViewState.REPORTS, label: 'Relatórios', icon: FileText },
    { id: ViewState.COMMUNICATIONS, label: 'Comunicados', icon: MessageSquareText },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  // Mostrar tela de recuperação de senha
  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className="flex h-[100dvh] bg-slate-100 dark:bg-slate-900 overflow-hidden font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Busca Global */}
      {isSearchOpen && (
        <GlobalSearch
          students={students}
          classes={classes}
          reports={reports}
          extraClasses={extraClasses}
          onNavigate={(view) => {
            setCurrentView(view);
            setIsSearchOpen(false);
          }}
          onClose={() => setIsSearchOpen(false)}
        />
      )}

      {/* Overlay GLOBAL - Visível sempre que a sidebar estiver aberta, independente da tela */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity animate-in fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR - Agora é sempre FIXED (Gaveta) em qualquer resolução */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 
          w-64 bg-sidebar-bg border-r border-sidebar-hover text-white 
          flex flex-col shrink-0
          transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1)
          ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        `}
      >
        <div className="h-full flex flex-col w-full overflow-hidden w-64">
          {/* Logo Area */}
          <div className="h-20 flex items-center justify-center border-b border-sidebar-hover/50 relative shrink-0">
            <div className="absolute inset-0 bg-gradient-to-b from-brand-600/10 to-transparent pointer-events-none" />
            <div className="flex items-center gap-3 text-white font-bold text-xl z-10 transition-all">
              <div className="p-2 bg-brand-600 rounded-lg shadow-lg shadow-brand-900/40">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="transition-all duration-200 tracking-tight whitespace-nowrap">
                Diário<span className="text-brand-400">.Pro</span>
              </span>
            </div>

            {/* Botão de Fechar - Visível em todas as telas */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Botões de Ação Rápida */}
          <div className="px-3 py-4 space-y-2 border-b border-sidebar-hover/30">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-all duration-200 group"
              title="Buscar (Ctrl+K)"
            >
              <Search className="w-5 h-5 text-slate-500 group-hover:text-brand-300" />
              <span className="text-sm font-medium">Buscar</span>
              <span className="ml-auto text-xs text-slate-500 bg-sidebar-hover/50 px-2 py-0.5 rounded">Ctrl+K</span>
            </button>

            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-all duration-200 group"
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-slate-500 group-hover:text-brand-300" />
              ) : (
                <Moon className="w-5 h-5 text-slate-500 group-hover:text-brand-300" />
              )}
              <span className="text-sm font-medium">{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
            </button>
          </div>

          <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto overflow-x-hidden">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  setIsSidebarOpen(false); // Fecha o menu ao clicar em qualquer item
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden ${currentView === item.id
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/30'
                  : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
                  }`}
                title={item.label}
              >
                {currentView === item.id && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
                )}
                <item.icon className={`w-5 h-5 flex-shrink-0 ${currentView === item.id ? 'text-white' : 'text-slate-500 group-hover:text-brand-300'}`} />
                <span className="whitespace-nowrap font-medium text-sm transition-opacity duration-200">
                  {item.label}
                </span>

                {currentView === item.id && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60 block" />
                )}
              </button>
            ))}
          </nav>

          <div className="px-4 pb-4 shrink-0">
            <div className="flex items-center gap-3 px-4 py-3 text-xs font-medium bg-sidebar-hover/50 rounded-xl border border-sidebar-hover/50 transition-opacity duration-300 animate-in fade-in">
              <div className={`w-2 h-2 rounded-full ${window.navigator.onLine ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-amber-500'}`} />
              <div className="flex flex-col">
                <span className="text-slate-300">Sistema</span>
                <span className={window.navigator.onLine ? 'text-emerald-400' : 'text-amber-400'}>
                  {window.navigator.onLine ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-sidebar-hover/50 bg-sidebar-bg shrink-0">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setIsProfileOpen(true)}>
              <div className="w-10 h-10 rounded-full bg-brand-900 border-2 border-sidebar-hover flex items-center justify-center text-brand-200 font-bold shrink-0 relative overflow-hidden">
                {currentUser?.photoUrl ? (
                  <img src={currentUser.photoUrl} alt="User" className="w-full h-full object-cover" />
                ) : (
                  getInitials(currentUser?.name || 'P')
                )}
              </div>

              <div className="flex-1 min-w-0 transition-all duration-200">
                <p className="text-sm font-semibold text-white truncate group-hover:text-brand-300 transition-colors">{currentUser?.name}</p>
                <p className="text-xs text-slate-500 truncate">{currentUser?.school}</p>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setIsProfileOpen(true)}
                className="flex-1 flex items-center justify-center p-2 text-sidebar-text hover:text-white hover:bg-sidebar-hover rounded-lg transition-colors border border-transparent hover:border-sidebar-hover"
                title="Configurações"
              >
                <Settings size={18} />
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center p-2 text-sidebar-text hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-900 relative z-0 transition-colors duration-300">
        {/* Decorative Background gradient */}
        <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-brand-100/40 dark:from-brand-900/20 to-transparent pointer-events-none transition-colors duration-300" />

        {/* Header - z-30 (Acima do conteúdo z-0, abaixo do overlay z-40 e sidebar z-50) */}
        <header className="h-20 flex items-center justify-between px-4 lg:px-8 shrink-0 relative z-30">
          <div className="flex items-center gap-4">
            {/* Botão Menu visível em TODAS as resoluções */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm rounded-lg transition-all"
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white hidden sm:block tracking-tight">
                {navItems.find(i => i.id === currentView)?.label}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block font-medium">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            
            {/* Status de Rede */}
            {isOffline && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-200">
                 <WifiOff size={16} className="text-amber-500" />
                 <span className="text-xs font-semibold text-amber-700">Offline</span>
              </div>
            )}
            {isSyncing && (
               <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-xl border border-blue-200">
                 <Cloud size={16} className="text-blue-500 animate-pulse" />
                 <span className="text-xs font-semibold text-blue-700">Sincronizando...</span>
              </div>
            )}

            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`p-2.5 hover:text-brand-600 dark:hover:text-brand-400 hover:shadow-md border border-transparent hover:border-slate-100 dark:hover:border-slate-700 rounded-xl transition-all relative ${isNotificationsOpen ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800"></span>
                )}
              </button>

              {isNotificationsOpen && (
                <NotificationPanel
                  notifications={notifications}
                  onClose={() => setIsNotificationsOpen(false)}
                  onMarkAsRead={handleMarkAsRead}
                  onMarkAllAsRead={handleMarkAllAsRead}
                  onNavigate={(view) => { setCurrentView(view); setIsNotificationsOpen(false); }}
                />
              )}
            </div>

            <button
              onClick={() => {
                if (currentUser?.email && userId) {
                  loadUserData(currentUser.email, userId);
                } else {
                  supabase.auth.getSession().then(({ data: { session } }) => {
                    if (session?.user?.email && session?.user?.id) {
                      loadUserData(session.user.email, session.user.id);
                    }
                  });
                }
              }}
              disabled={isLoading}
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-xs font-bold text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-800 border border-brand-100 dark:border-brand-900/30 hover:bg-brand-50 dark:hover:bg-brand-900/50 hover:border-brand-200 dark:hover:border-brand-800 rounded-xl transition-all shadow-sm hover:shadow disabled:opacity-50"
              title="Recarregar dados do servidor"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              {isLoading ? 'Carregando...' : 'Atualizar'}
            </button>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

            <button
              onClick={handleFactoryReset}
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 border border-rose-100 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-900/50 hover:border-rose-200 dark:hover:border-rose-800 rounded-xl transition-all shadow-sm hover:shadow"
              title="Apagar dados e resetar"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </header>

        {/* Content Area - Fix for tablet/mobile scroll with min-h-0 and explicit touch support */}
        <div
          id="main-content"
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 relative z-0 scroll-smooth min-h-0"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {renderContent()}
        </div>
      </main>

      {currentUser && (
        <EditProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          currentUser={currentUser}
          currentClasses={classes}
          onSave={handleProfileUpdate}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}