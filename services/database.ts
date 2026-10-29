import { supabase } from './supabaseClient';
import { openDB, IDBPDatabase } from 'idb';
import {
    UserProfile,
    ClassGroup,
    Student,
    StudentSubject,
    ExtraClass,
    Report,
    AiGeneratedContent,
    NotificationItem,
    Communication
} from '../types';
import { offlineSyncService } from './offlineSync';

// ==================== CACHE D.B. INIT ====================
let dbPromise: Promise<IDBPDatabase> | null = null;
const getCacheDB = () => {
    if (!dbPromise) {
        dbPromise = openDB('diario-do-professor-cache', 1, {
            upgrade(db) {
                db.createObjectStore('class_groups', { keyPath: 'id' });
                db.createObjectStore('students', { keyPath: 'id' });
                db.createObjectStore('reports', { keyPath: 'id' });
                db.createObjectStore('user_profiles', { keyPath: 'id' });
                // other stores can be added as needed
            },
        });
    }
    return dbPromise;
};

// Generic cache helpers
const saveToCache = async (storeName: string, items: any[]) => {
    try {
        const db = await getCacheDB();
        const tx = db.transaction(storeName, 'readwrite');
        for (const item of items) {
            tx.store.put(item);
        }
        await tx.done;
    } catch (e) { console.error('Cache save error', e); }
};

const getFromCache = async (storeName: string, filterFn: (item: any) => boolean = () => true) => {
    try {
        const db = await getCacheDB();
        const all = await db.getAll(storeName);
        return all.filter(filterFn);
    } catch (e) {
        console.error('Cache read error', e);
        return [];
    }
};

// ==================== USER PROFILES ====================

export const createUserProfile = async (profile: Omit<UserProfile, 'id'> & { id?: string }) => {
    const insertData: any = {
        name: profile.name,
        email: profile.email,
        school: profile.school,
        photo_url: profile.photoUrl,
        shifts: profile.shifts
    };
    // CRÍTICO: sempre passar o id = auth.uid() para que o RLS funcione corretamente
    if (profile.id) {
        insertData.id = profile.id;
    }
    const { data, error } = await supabase
        .from('user_profiles')
        .insert(insertData)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const getUserProfileByEmail = async (email: string) => {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
};

export const updateUserProfile = async (id: string, updates: Partial<UserProfile>) => {
    const { data, error } = await supabase
        .from('user_profiles')
        .update({
            name: updates.name,
            school: updates.school,
            photo_url: updates.photoUrl,
            shifts: updates.shifts
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

// ==================== CLASS GROUPS ====================

export const getClassGroups = async (userId: string): Promise<ClassGroup[]> => {
    if (!navigator.onLine) {
        const cached = await getFromCache('class_groups', (c: any) => c.user_id === userId);
        return cached.map((item: any) => ({
            id: item.id,
            name: item.name,
            grade: item.grade,
            shift: item.shift,
            studentCount: item.student_count,
            teacherName: item.teacher_name
        })).sort((a, b) => b.id.localeCompare(a.id)); // simple sort
    }

    const { data, error } = await supabase
        .from('class_groups')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
        await saveToCache('class_groups', data);
    }

    return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        grade: item.grade,
        shift: item.shift,
        studentCount: item.student_count,
        teacherName: item.teacher_name
    }));
};

export const createClassGroup = async (userId: string, classGroup: Omit<ClassGroup, 'id' | 'studentCount'>) => {
    if (!navigator.onLine) {
        // Gera um ID temporário e adiciona à fila
        const tempId = `temp-${Date.now()}`;
        const newClass = {
            id: tempId,
            name: classGroup.name,
            grade: classGroup.grade,
            shift: classGroup.shift,
            teacher_name: classGroup.teacherName,
            student_count: 0,
            user_id: userId
        };
        await offlineSyncService.addOperation('create', 'class_groups', newClass);
        return newClass;
    }

    const { data, error } = await supabase
        .from('class_groups')
        .insert({
            name: classGroup.name,
            grade: classGroup.grade,
            shift: classGroup.shift,
            teacher_name: classGroup.teacherName,
            student_count: 0,
            user_id: userId
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateClassGroup = async (id: string, updates: Partial<ClassGroup>) => {
    if (!navigator.onLine) {
        // Add to offline queue
        await offlineSyncService.addOperation('update', 'class_groups', { id, ...updates });
        return { id, ...updates }; // Retorna o objeto modificado p/ UI otimista
    }

    const { data, error } = await supabase
        .from('class_groups')
        .update({
            name: updates.name,
            grade: updates.grade,
            shift: updates.shift,
            teacher_name: updates.teacherName,
            student_count: updates.studentCount
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteClassGroup = async (id: string) => {
    if (!navigator.onLine) {
        await offlineSyncService.addOperation('delete', 'class_groups', { id });
        return;
    }

    const { error } = await supabase
        .from('class_groups')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// ==================== STUDENTS ====================

export const getStudents = async (userId: string): Promise<Student[]> => {
    if (!navigator.onLine) {
        const cached = await getFromCache('students', (s: any) => s.user_id === userId);
        return cached.map((item: any) => ({
            id: item.id,
            name: item.name,
            age: item.age,
            classId: item.class_id,
            photoUrl: item.photo_url,
            needs: item.needs,
            status: item.status,
            attendanceRate: item.attendance_rate,
            subjects: (item.student_subjects || []).map((sub: any) => ({
                id: sub.id,
                name: sub.name,
                teacher: sub.teacher,
                grade: sub.grade,
                attendance: sub.attendance
            }))
        })).sort((a, b) => b.id.localeCompare(a.id));
    }

    const { data, error } = await supabase
        .from('students')
        .select(`
      *,
      student_subjects (*)
    `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
        await saveToCache('students', data);
    }

    return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        age: item.age,
        classId: item.class_id,
        photoUrl: item.photo_url,
        needs: item.needs,
        status: item.status,
        attendanceRate: item.attendance_rate,
        subjects: (item.student_subjects || []).map((sub: any) => ({
            id: sub.id,
            name: sub.name,
            teacher: sub.teacher,
            grade: sub.grade,
            attendance: sub.attendance
        }))
    }));
};

export const createStudent = async (userId: string, student: Omit<Student, 'id'>) => {
    if (!navigator.onLine) {
        const tempId = `temp-${Date.now()}`;
        const newStudent = { id: tempId, ...student, user_id: userId };
        await offlineSyncService.addOperation('create', 'students', {
            id: tempId,
            name: student.name,
            age: student.age,
            class_id: student.classId,
            photo_url: student.photoUrl,
            needs: student.needs,
            status: student.status,
            attendance_rate: student.attendanceRate,
            user_id: userId
        });

        if (student.subjects && student.subjects.length > 0) {
            for (const sub of student.subjects) {
                await offlineSyncService.addOperation('create', 'student_subjects', {
                    student_id: tempId,
                    name: sub.name,
                    teacher: sub.teacher,
                    grade: sub.grade,
                    attendance: sub.attendance
                });
            }
        }
        return newStudent;
    }

    const { data: studentData, error: studentError } = await supabase
        .from('students')
        .insert({
            name: student.name,
            age: student.age,
            class_id: student.classId,
            photo_url: student.photoUrl,
            needs: student.needs,
            status: student.status,
            attendance_rate: student.attendanceRate,
            user_id: userId
        })
        .select()
        .single();

    if (studentError) throw studentError;

    // Insert subjects
    if (student.subjects && student.subjects.length > 0) {
        const { error: subjectsError } = await supabase
            .from('student_subjects')
            .insert(
                student.subjects.map(sub => ({
                    student_id: studentData.id,
                    name: sub.name,
                    teacher: sub.teacher,
                    grade: sub.grade,
                    attendance: sub.attendance
                }))
            );

        if (subjectsError) throw subjectsError;
    }

    return studentData;
};

export const updateStudent = async (student: Student) => {
    if (!navigator.onLine) {
        await offlineSyncService.addOperation('update', 'students', {
            id: student.id,
            name: student.name,
            age: student.age,
            class_id: student.classId,
            photo_url: student.photoUrl,
            needs: student.needs,
            status: student.status,
            attendance_rate: student.attendanceRate
        });

        // Complex sync for subjects would require deleting all offline and recreating. 
        // For simplicity in guerrilla mode, we just add the update operation for the parent.
        return student;
    }

    const { data, error } = await supabase
        .from('students')
        .update({
            name: student.name,
            age: student.age,
            class_id: student.classId,
            photo_url: student.photoUrl,
            needs: student.needs,
            status: student.status,
            attendance_rate: student.attendanceRate
        })
        .eq('id', student.id)
        .select()
        .single();

    if (error) throw error;

    // Delete old subjects and insert new ones
    await supabase
        .from('student_subjects')
        .delete()
        .eq('student_id', student.id);

    if (student.subjects && student.subjects.length > 0) {
        await supabase
            .from('student_subjects')
            .insert(
                student.subjects.map(sub => ({
                    student_id: student.id,
                    name: sub.name,
                    teacher: sub.teacher,
                    grade: sub.grade,
                    attendance: sub.attendance
                }))
            );
    }

    return data;
};

export const deleteStudent = async (id: string) => {
    if (!navigator.onLine) {
        await offlineSyncService.addOperation('delete', 'students', { id });
        return;
    }

    const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// ==================== EXTRA CLASSES ====================

export const getExtraClasses = async (userId: string): Promise<ExtraClass[]> => {
    const { data, error } = await supabase
        .from('extra_classes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        teacher: item.teacher,
        classId: item.class_id,
        participants: item.participants || [],
        dayOfWeek: item.day_of_week,
        startTime: item.start_time,
        endTime: item.end_time,
        location: item.location,
        frequency: item.frequency,
        objective: item.objective
    }));
};

export const createExtraClass = async (userId: string, extraClass: Omit<ExtraClass, 'id'>) => {
    if (!navigator.onLine) {
        const tempId = `temp-${Date.now()}`;
        const newExtraClass = {
            id: tempId,
            name: extraClass.name,
            type: extraClass.type,
            teacher: extraClass.teacher,
            class_id: extraClass.classId,
            participants: extraClass.participants,
            day_of_week: extraClass.dayOfWeek,
            start_time: extraClass.startTime,
            end_time: extraClass.endTime,
            location: extraClass.location,
            frequency: extraClass.frequency,
            objective: extraClass.objective,
            user_id: userId
        };
        await offlineSyncService.addOperation('create', 'extra_classes', newExtraClass);
        return newExtraClass;
    }

    const { data, error } = await supabase
        .from('extra_classes')
        .insert({
            name: extraClass.name,
            type: extraClass.type,
            teacher: extraClass.teacher,
            class_id: extraClass.classId,
            participants: extraClass.participants,
            day_of_week: extraClass.dayOfWeek,
            start_time: extraClass.startTime,
            end_time: extraClass.endTime,
            location: extraClass.location,
            frequency: extraClass.frequency,
            objective: extraClass.objective,
            user_id: userId
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateExtraClass = async (extraClass: ExtraClass) => {
    if (!navigator.onLine) {
        await offlineSyncService.addOperation('update', 'extra_classes', {
            id: extraClass.id,
            name: extraClass.name,
            type: extraClass.type,
            teacher: extraClass.teacher,
            class_id: extraClass.classId,
            participants: extraClass.participants,
            day_of_week: extraClass.dayOfWeek,
            start_time: extraClass.startTime,
            end_time: extraClass.endTime,
            location: extraClass.location,
            frequency: extraClass.frequency,
            objective: extraClass.objective
        });
        return extraClass;
    }

    const { data, error } = await supabase
        .from('extra_classes')
        .update({
            name: extraClass.name,
            type: extraClass.type,
            teacher: extraClass.teacher,
            class_id: extraClass.classId,
            participants: extraClass.participants,
            day_of_week: extraClass.dayOfWeek,
            start_time: extraClass.startTime,
            end_time: extraClass.endTime,
            location: extraClass.location,
            frequency: extraClass.frequency,
            objective: extraClass.objective
        })
        .eq('id', extraClass.id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteExtraClass = async (id: string) => {
    if (!navigator.onLine) {
        await offlineSyncService.addOperation('delete', 'extra_classes', { id });
        return;
    }

    const { error } = await supabase
        .from('extra_classes')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// ==================== REPORTS ====================

export const getReports = async (userId: string): Promise<Report[]> => {
    console.log('🗄️ database.getReports - Buscando reports para userId:', userId);

    if (!navigator.onLine) {
        const cached = await getFromCache('reports', (r: any) => r.user_id === userId);
        return cached.map((item: any) => ({
            id: item.id,
            studentId: item.student_id,
            studentName: item.student_name,
            date: item.date,
            attendanceRate: item.attendance_rate,
            absencesCount: item.absences_count,
            dietaryRestrictions: item.dietary_restrictions,
            comorbidities: item.comorbidities,
            extraClassesSummary: item.extra_classes_summary || [],
            observations: item.observations
        })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('🗄️ ❌ Erro ao buscar reports:', error);
        throw error;
    }

    if (data && data.length > 0) {
        await saveToCache('reports', data);
    }

    console.log('🗄️ ✅ Reports encontrados:', data?.length || 0, 'itens');

    return (data || []).map(item => ({
        id: item.id,
        studentId: item.student_id,
        studentName: item.student_name,
        date: item.date,
        attendanceRate: item.attendance_rate,
        absencesCount: item.absences_count,
        dietaryRestrictions: item.dietary_restrictions,
        comorbidities: item.comorbidities,
        extraClassesSummary: item.extra_classes_summary || [],
        observations: item.observations
    }));
};

export const createReport = async (userId: string, report: Omit<Report, 'id'>) => {
    console.log('🗄️ database.createReport - Iniciando insert no Supabase');
    console.log('🗄️ userId:', userId);
    console.log('🗄️ report data:', report);

    if (!navigator.onLine) {
        const tempId = `temp-${Date.now()}`;
        const newReport = {
            id: tempId,
            student_id: report.studentId,
            student_name: report.studentName,
            date: report.date,
            attendance_rate: report.attendanceRate,
            absences_count: report.absencesCount,
            dietary_restrictions: report.dietaryRestrictions,
            comorbidities: report.comorbidities,
            extra_classes_summary: report.extraClassesSummary,
            observations: report.observations,
            user_id: userId
        };
        await offlineSyncService.addOperation('create', 'reports', newReport);
        console.log('🗄️ ✅ Report salvo offline (IndexedDB):', newReport);
        return newReport;
    }

    const { data, error } = await supabase
        .from('reports')
        .insert({
            student_id: report.studentId,
            student_name: report.studentName,
            date: report.date,
            attendance_rate: report.attendanceRate,
            absences_count: report.absencesCount,
            dietary_restrictions: report.dietaryRestrictions,
            comorbidities: report.comorbidities,
            extra_classes_summary: report.extraClassesSummary,
            observations: report.observations,
            user_id: userId
        })
        .select()
        .single();

    if (error) {
        console.error('🗄️ ❌ Erro ao inserir no Supabase:', error);
        throw error;
    }

    console.log('🗄️ ✅ Report criado com sucesso:', data);
    return data;
};

export const updateReport = async (report: Report) => {
    if (!navigator.onLine) {
        await offlineSyncService.addOperation('update', 'reports', {
            id: report.id,
            student_id: report.studentId,
            student_name: report.studentName,
            date: report.date,
            attendance_rate: report.attendanceRate,
            absences_count: report.absencesCount,
            dietary_restrictions: report.dietaryRestrictions,
            comorbidities: report.comorbidities,
            extra_classes_summary: report.extraClassesSummary,
            observations: report.observations
        });
        return report;
    }

    const { data, error } = await supabase
        .from('reports')
        .update({
            student_id: report.studentId,
            student_name: report.studentName,
            date: report.date,
            attendance_rate: report.attendanceRate,
            absences_count: report.absencesCount,
            dietary_restrictions: report.dietaryRestrictions,
            comorbidities: report.comorbidities,
            extra_classes_summary: report.extraClassesSummary,
            observations: report.observations
        })
        .eq('id', report.id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteReport = async (id: string) => {
    const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// ==================== AI CONTENTS ====================

export const getAiContents = async (userId: string): Promise<AiGeneratedContent[]> => {
    const { data, error } = await supabase
        .from('ai_contents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(item => ({
        id: item.id,
        title: item.title,
        type: item.type,
        content: item.content,
        tags: item.tags || [],
        createdAt: item.created_at
    }));
};

export const createAiContent = async (userId: string, content: Omit<AiGeneratedContent, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase
        .from('ai_contents')
        .insert({
            title: content.title,
            type: content.type,
            content: content.content,
            tags: content.tags,
            user_id: userId
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteAiContent = async (id: string) => {
    const { error } = await supabase
        .from('ai_contents')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// ==================== NOTIFICATIONS ====================

export const getNotifications = async (userId: string): Promise<NotificationItem[]> => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(item => ({
        id: item.id,
        type: item.notification_type,
        title: item.title,
        message: item.message,
        time: item.time,
        read: item.read,
        priority: item.priority,
        targetView: item.target_view
    }));
};

export const createNotification = async (userId: string, notification: Omit<NotificationItem, 'id'>) => {
    const { data, error } = await supabase
        .from('notifications')
        .insert({
            notification_type: notification.type,
            title: notification.title,
            message: notification.message,
            time: notification.time,
            read: notification.read,
            priority: notification.priority,
            target_view: notification.targetView,
            user_id: userId
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateNotification = async (id: string, updates: Partial<NotificationItem>) => {
    const { data, error } = await supabase
        .from('notifications')
        .update({
            read: updates.read
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateAllNotificationsAsRead = async (userId: string) => {
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId);

    if (error) throw error;
};

// ==================== COMMUNICATIONS ====================

export const getCommunications = async (userId: string): Promise<Communication[]> => {
    const { data, error } = await supabase
        .from('communications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(item => ({
        id: item.id,
        classId: item.class_id,
        className: item.class_name || '',
        title: item.title,
        category: item.category,
        content: item.content,
        sharedVia: item.shared_via || [],
        createdAt: item.created_at
    }));
};

export const createCommunication = async (userId: string, comm: Omit<Communication, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase
        .from('communications')
        .insert({
            user_id: userId,
            class_id: comm.classId,
            class_name: comm.className,
            title: comm.title,
            category: comm.category,
            content: comm.content,
            shared_via: comm.sharedVia
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateCommunication = async (comm: Communication) => {
    const { data, error } = await supabase
        .from('communications')
        .update({
            class_id: comm.classId,
            class_name: comm.className,
            title: comm.title,
            category: comm.category,
            content: comm.content,
            shared_via: comm.sharedVia
        })
        .eq('id', comm.id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteCommunication = async (id: string) => {
    const { error } = await supabase
        .from('communications')
        .delete()
        .eq('id', id);

    if (error) throw error;
};
