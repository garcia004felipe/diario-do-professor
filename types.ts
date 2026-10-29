

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  STUDENTS = 'STUDENTS',
  CLASSES = 'CLASSES',
  EXTRA_CLASSES = 'EXTRA_CLASSES',
  REPORTS = 'REPORTS',
  AI_PLANNER = 'AI_PLANNER',
  COMMUNICATIONS = 'COMMUNICATIONS',
  DB_TEST = 'DB_TEST'
}

export interface UserProfile {
  id?: string; // Opcional pois na criação não existe, mas no retorno do banco sim
  name: string;
  email: string;
  school: string;
  photoUrl?: string;
  shifts?: string[]; // 'morning', 'afternoon', 'night', 'full-time'
}

export interface StudentSubject {
  id: string;
  name: string; // Ex: Matemática
  teacher: string; // Ex: Prof. Xavier
  grade: number; // Nota atual (0-10)
  attendance: number; // Frequência na matéria (0-100)
}

export interface Student {
  id: string;
  name: string;
  age: number;
  classId: string;
  photoUrl: string;
  needs: string; // Special needs or dietary restrictions
  status: 'active' | 'inactive';
  attendanceRate: number; // Média global
  subjects: StudentSubject[]; // Lista de matérias e notas
}

export interface ClassGroup {
  id: string;
  name: string;
  grade: string;
  shift: 'morning' | 'afternoon' | 'full-time';
  studentCount: number;
  teacherName?: string;
}

export enum ActivityType {
  // Categorias Gerais
  PEDAGOGICAL = 'Pedagógica',
  RECREATION = 'Recreação',
  WORKSHOP = 'Oficina',
  MEAL = 'Alimentação',
  REST = 'Descanso',

  // Esportes
  SWIMMING = 'Natação',
  JUDO = 'Judô',
  FUTSAL = 'Futsal',
  SPORTS_INIT = 'Iniciação Esportiva',

  // Artes e Música
  BALLET = 'Ballet',
  MUSIC = 'Música',
  SINGING = 'Canto',
  CHOIR = 'Coral',

  // Educação e Tecnologia
  STUDY_GROUP = 'Grupo de Estudos',
  ED_TECH = 'Ed. Tec'
}

export interface ExtraClass {
  id: string;
  name: string;
  type: ActivityType;
  teacher: string;
  classId: string; // Associated class group
  participants: string[]; // Student IDs
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  location: string;
  frequency: 'Weekly' | 'Bi-weekly' | 'Eventual';
  objective: string;
}

export interface Report {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  attendanceRate: number;
  absencesCount: number;
  dietaryRestrictions: string;
  comorbidities: string;
  extraClassesSummary: string[]; // List of strings like "Futsal (Seg 14:00)"
  observations: string;
}

export interface AiGeneratedContent {
  id: string;
  title: string;
  type: 'LESSON_PLAN' | 'WEEKLY_PLAN' | 'OBJECTIVES' | 'ACTIVITIES' | 'STUDENT_ANALYSIS' | 'TEXT_CORRECTION';
  content: string;
  createdAt: string;
  tags?: string[];
}

export interface ChartData {
  name: string;
  value: number;
}

export interface NotificationItem {
  id: string;
  type: 'alert' | 'schedule' | 'info';
  title: string;
  message: string;
  time: string;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
  targetView?: ViewState; // Optional view to navigate to when clicked
}

export type CommunicationCategory = 'meeting' | 'absence' | 'congratulation' | 'event' | 'general';

export interface Communication {
  id: string;
  classId: string | null;
  className: string;
  title: string;
  category: CommunicationCategory;
  content: string;
  sharedVia: string[];
  createdAt: string;
}