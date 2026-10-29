import { Student, ClassGroup, ExtraClass, NotificationItem, ViewState } from '../types';

export const generateIntelligentNotifications = (
  students: Student[], 
  classGroups: ClassGroup[],
  extraClasses: ExtraClass[],
  today: string
): NotificationItem[] => {
  const notifications: NotificationItem[] = [];
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // 1. Check for empty classes
  classGroups.forEach(cls => {
    const studentsInClass = students.filter(s => s.classId === cls.id);
    if (studentsInClass.length === 0) {
      notifications.push({
        id: `empty-class-${cls.id}`,
        title: 'Turma Vazia',
        message: `A turma ${cls.name} não possui alunos matriculados ainda.`,
        type: 'alert',
        priority: 'medium',
        time: now,
        read: false,
        targetView: ViewState.CLASSES
      });
    }
  });

  // 2. Check for extra classes today
  extraClasses.forEach(cls => {
    if (cls.dayOfWeek === today) {
      cls.participants.forEach(studentId => {
        const student = students.find(s => s.id === studentId);
        if (student) {
          notifications.push({
            id: `sched-${cls.id}-${student.id}`,
            type: 'schedule',
            priority: 'medium',
            title: 'Aula Extra Hoje',
            message: `${student.name} tem aula de ${cls.name}. Entrada: ${cls.startTime} | Saída: ${cls.endTime}.`,
            time: now,
            read: false,
            targetView: ViewState.EXTRA_CLASSES
          });
        }
      });
    }
  });

  // 3. Check for students at risk
  students.forEach(student => {
    if (student.status === 'inactive') return; // Ignore inactive students

    // Attendance Risk
    if (student.attendanceRate < 75) {
      notifications.push({
        id: `attendance-risk-${student.id}`,
        title: 'Risco de Evasão (Faltas)',
        message: `${student.name} está com frequência crítica (${student.attendanceRate}%). Mínimo adequado: 75%.`,
        type: 'alert',
        priority: 'high',
        time: now,
        read: false,
        targetView: ViewState.STUDENTS
      });
    }

    // Grade Risk
    if (student.subjects && student.subjects.length > 0) {
      const avgGrade = student.subjects.reduce((sum, s) => sum + s.grade, 0) / student.subjects.length;
      if (avgGrade < 6.0) {
        notifications.push({
          id: `grade-risk-${student.id}`,
          title: 'Alerta Acadêmico',
          message: `${student.name} está com média geral baixa (${avgGrade.toFixed(1)}).`,
          type: 'alert',
          priority: 'medium',
          time: now,
          read: false,
          targetView: ViewState.STUDENTS
        });
      }

      // Specific subject failure
      const severeFailures = student.subjects.filter(s => s.grade < 5.0 && s.attendance >= 75); // Only if attending but failing badly
      if (severeFailures.length > 0) {
        const subjectsList = severeFailures.map(s => s.name).join(', ');
        notifications.push({
          id: `severe-grades-${student.id}`,
          title: 'Dificuldade de Aprendizado',
          message: `${student.name} precisa de suporte em: ${subjectsList}.`,
          type: 'alert',
          priority: 'high',
          time: now,
          read: false,
          targetView: ViewState.STUDENTS
        });
      }
    }
    
    // Special Needs attention reminder
    if (student.needs && student.needs.toLowerCase() !== 'nenhuma') {
      if (student.subjects && student.subjects.length > 0) {
         const avgGrade = student.subjects.reduce((sum, s) => sum + s.grade, 0) / student.subjects.length;
         if (avgGrade >= 6.0 && avgGrade <= 7.0) {
             notifications.push({
                id: `special-needs-support-${student.id}`,
                title: 'Atenção Individualizada (Inclusão)',
                message: `${student.name} possui Necessidades Especiais (${student.needs}). A média está tangenciando o limite (${avgGrade.toFixed(1)}).`,
                type: 'info',
                priority: 'low',
                time: now,
                read: false,
                targetView: ViewState.STUDENTS
              });
         }
      }
    }
  });

  return notifications;
};
