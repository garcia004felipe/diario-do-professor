import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import {
    Report,
    Student,
    ClassGroup,
    ExtraClass,
    AiGeneratedContent,
    Communication,
    NotificationItem,
    UserProfile
} from '../types';

export interface BackupPayload {
    schemaVersion: 1;
    app: 'diario-do-professor';
    exportedAt: string;
    profile: UserProfile | null;
    classes: ClassGroup[];
    students: Student[];
    extraClasses: ExtraClass[];
    reports: Report[];
    aiContents: AiGeneratedContent[];
    notifications: NotificationItem[];
    communications: Communication[];
}

export class ExportService {
    /**
     * Exporta relatório individual em PDF
     */
    static exportReportToPDF(report: Report, student?: Student) {
        const doc = new jsPDF();

        // Cabeçalho
        doc.setFontSize(20);
        doc.text('Relatório do Aluno', 20, 20);

        doc.setFontSize(12);
        doc.text(`Aluno: ${report.studentName}`, 20, 35);
        doc.text(`Data: ${new Date(report.date).toLocaleDateString('pt-BR')}`, 20, 45);
        doc.text(`Frequência: ${report.attendanceRate}%`, 20, 55);

        // Observações
        doc.setFontSize(14);
        doc.text('Observações:', 20, 70);
        doc.setFontSize(10);

        const splitText = doc.splitTextToSize(report.observations, 170);
        doc.text(splitText, 20, 80);

        if (report.reinforcementActivities) {
            const reinforcementTitleY = 80 + (splitText.length * 5) + 12;
            doc.setFontSize(14);
            doc.text('Atividades de reforço sugeridas pela IA:', 20, reinforcementTitleY);
            doc.setFontSize(10);
            const reinforcementText = doc.splitTextToSize(report.reinforcementActivities, 170);
            doc.text(reinforcementText, 20, reinforcementTitleY + 10);
        }

        // Salvar
        doc.save(`relatorio-${report.studentName}-${report.date}.pdf`);
    }

    /**
     * Exporta múltiplos relatórios em PDF
     */
    static exportMultipleReportsToPDF(reports: Report[]) {
        const doc = new jsPDF();

        reports.forEach((report, index) => {
            if (index > 0) doc.addPage();

            doc.setFontSize(20);
            doc.text('Relatório do Aluno', 20, 20);

            doc.setFontSize(12);
            doc.text(`Aluno: ${report.studentName}`, 20, 35);
            doc.text(`Data: ${new Date(report.date).toLocaleDateString('pt-BR')}`, 20, 45);
            doc.text(`Frequência: ${report.attendanceRate}%`, 20, 55);

            doc.setFontSize(14);
            doc.text('Observações:', 20, 70);
            doc.setFontSize(10);

            const splitText = doc.splitTextToSize(report.observations, 170);
            doc.text(splitText, 20, 80);
        });

        doc.save(`relatorios-${new Date().toISOString().split('T')[0]}.pdf`);
    }

    /**
     * Exporta boletim completo de uma turma (Um aluno por página)
     * @param classGroup Turma
     * @param students Alunos
     * @param allReports Relatórios
     * @param template Modelo de boletim: 'classico', 'moderno', 'colorido', 'minimalista'
     */
    static exportClassBulletin(
        classGroup: ClassGroup,
        students: Student[],
        allReports: Report[],
        template: 'classico' | 'moderno' | 'colorido' | 'minimalista' = 'classico'
    ): { success: boolean; message: string; count: number } {
        try {
            console.log('🔧 Iniciando exportClassBulletin com template:', template);
            const doc = new jsPDF();

            // Filtrar apenas alunos desta turma
            const classStudents = students.filter(s => s.classId === classGroup.id);
            console.log(`📋 Turma: ${classGroup.name} (ID: ${classGroup.id})`);
            console.log(`👨‍🎓 Alunos encontrados na turma: ${classStudents.length}`);
            console.log(`📝 Reports disponíveis: ${allReports.length}`);

            if (classStudents.length === 0) {
                return { success: false, message: `Não há alunos cadastrados na turma "${classGroup.name}".`, count: 0 };
            }

            // Helper defensivo: nunca passar undefined/null para doc.text()
            const safe = (val: unknown): string => {
                if (val === null || val === undefined) return '-';
                return String(val)
                    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
                    .replace(/[•●]/g, '-')
                    .replace(/[^\u0000-\u00FF]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            };

            // Configurações de templates
            const templates: Record<string, { primaryColor: [number, number, number]; secondaryColor: [number, number, number]; accentColor: [number, number, number]; showColorBar: boolean; showIcons: boolean }> = {
                classico: { primaryColor: [79, 70, 229], secondaryColor: [30, 41, 59], accentColor: [148, 163, 184], showColorBar: true, showIcons: false },
                moderno: { primaryColor: [16, 185, 129], secondaryColor: [15, 23, 42], accentColor: [52, 211, 153], showColorBar: true, showIcons: false },
                colorido: { primaryColor: [234, 179, 8], secondaryColor: [120, 53, 15], accentColor: [249, 115, 22], showColorBar: true, showIcons: false },
                minimalista: { primaryColor: [71, 85, 105], secondaryColor: [30, 41, 59], accentColor: [203, 213, 225], showColorBar: false, showIcons: false },
            };
            const config = templates[template];

            classStudents.forEach((student, index) => {
                try {
                    console.log(`  📄 Processando aluno ${index + 1}/${classStudents.length}: ${student.name}`);
                    if (index > 0) doc.addPage();

                    const studentReports = (allReports || [])
                        .filter(r => r.studentId === student.id)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    const latestReport = studentReports.length > 0 ? studentReports[0] : null;

                    const marginX = 20;
                    let currentY = 20;

                    // --- Cabeçalho ---
                    if (config.showColorBar) {
                        doc.setFillColor(...config.primaryColor);
                        doc.rect(0, 0, 210, 40, 'F');
                    } else {
                        doc.setFillColor(248, 250, 252);
                        doc.rect(0, 0, 210, 40, 'F');
                        doc.setDrawColor(...config.accentColor);
                        doc.setLineWidth(1);
                        doc.line(0, 40, 210, 40);
                    }

                    if (config.showColorBar) {
                        doc.setTextColor(255, 255, 255);
                    } else {
                        doc.setTextColor(...config.secondaryColor);
                    }
                    doc.setFontSize(22);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Boletim de Desempenho', marginX, 22);

                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`${safe(classGroup.name)} - ${safe(classGroup.grade)}`, marginX, 32);

                    // --- Dados do Aluno ---
                    currentY = 55;
                    doc.setTextColor(...config.secondaryColor);

                    doc.setFontSize(16);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`Aluno(a): ${safe(student.name)}`, marginX, currentY);
                    currentY += 10;

                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`Idade: ${safe(student.age)} anos`, marginX, currentY);
                    doc.text(`Frequência Global: ${safe(student.attendanceRate)}%`, 100, currentY);
                    currentY += 8;

                    doc.text(`Professor Responsável: ${safe(classGroup.teacherName || 'Não informado')}`, marginX, currentY);
                    currentY += 8;

                    doc.text(`Observações Médicas: ${safe(student.needs || 'Nenhuma restrição registrada')}`, marginX, currentY);
                    currentY += 15;

                    // --- Tabela de Notas ---
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Desempenho por Disciplina', marginX, currentY);
                    currentY += 10;

                    if (student.subjects && student.subjects.length > 0) {
                        doc.setFontSize(10);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(...config.accentColor);
                        doc.text('Disciplina', marginX, currentY);
                        doc.text('Professor', 90, currentY);
                        doc.text('Nota', 160, currentY);
                        doc.text('Frequência', 180, currentY);
                        currentY += 4;
                        doc.setDrawColor(...config.accentColor);
                        doc.setLineWidth(0.5);
                        if (config.showColorBar) doc.setDrawColor(255, 255, 255);
                        doc.line(marginX, currentY, 200, currentY);
                        currentY += 6;

                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(...config.secondaryColor);

                        student.subjects.forEach(sub => {
                            doc.text(safe(sub.name), marginX, currentY);
                            doc.text(safe(sub.teacher || '-'), 90, currentY);

                            const grade = typeof sub.grade === 'number' ? sub.grade : 0;
                            if (grade < 6) doc.setTextColor(220, 38, 38);
                            else doc.setTextColor(30, 41, 59);
                            doc.text(grade.toFixed(1), 160, currentY);
                            
                            doc.setTextColor(30, 41, 59);
                            doc.text(`${safe(sub.attendance)}%`, 180, currentY);
                            
                            currentY += 8;
                        });
                    } else {
                        doc.setFontSize(11);
                        doc.setFont('helvetica', 'italic');
                        doc.setTextColor(148, 163, 184);
                        doc.text('Nenhuma nota formativa registrada para este aluno.', marginX, currentY);
                        currentY += 10;
                    }

                    // --- Parecer Pedagógico ---
                    currentY += 10;
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(30, 41, 59);
                    doc.text('Parecer Pedagógico', marginX, currentY);
                    currentY += 8;

                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    
                    if (latestReport && latestReport.observations) {
                        doc.setTextColor(71, 85, 105);
                        const dataFechamento = new Date(latestReport.date).toLocaleDateString('pt-BR');
                        doc.text(`Última Análise (Fechamento: ${dataFechamento}):`, marginX, currentY);
                        currentY += 6;

                        doc.setTextColor(...config.secondaryColor);
                        const obsText = safe(latestReport.observations);
                        const splitText = doc.splitTextToSize(obsText, 170);

                        if (currentY + (splitText.length * 5) > 280) {
                             doc.addPage();
                             currentY = 20;
                        }

                        doc.text(splitText, marginX, currentY);
                    } else {
                        doc.setTextColor(...config.accentColor);
                        doc.setFont('helvetica', 'italic');
                        doc.text('Nenhum relatorio ou parecer registrado para este aluno no periodo.', marginX, currentY);
                    }

                    // --- Rodapé ---
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'italic');
                    doc.setTextColor(...config.accentColor);
                    doc.text(`Documento gerado pelo Diario do Professor - ${new Date().toLocaleDateString('pt-BR')}`, marginX, 290);
                    if (config.showIcons) {
                        doc.text(`Modelo: ${template}`, 20, 295);
                    }

                    console.log(`  ✅ Aluno ${student.name} processado com sucesso`);
                } catch (studentError) {
                    console.error(`  ❌ Erro ao processar aluno ${student.name}:`, studentError);
                }
            });

            // Salvar
            const sanitizeName = (classGroup.name || 'turma').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `boletins-${sanitizeName}-${template}-${new Date().toISOString().split('T')[0]}.pdf`;
            console.log(`💾 Salvando PDF: ${fileName}`);
            doc.save(fileName);

            console.log('✅ PDF exportado com sucesso!');
            return { success: true, message: `Boletins de "${classGroup.name}" gerados! (${classStudents.length} aluno(s))`, count: classStudents.length };
        } catch (error) {
            console.error('❌ Erro fatal ao exportar boletins:', error);
            return { success: false, message: 'Erro ao gerar os boletins. Tente novamente.', count: 0 };
        }
    }

    /**
     * Exporta dados de alunos para Excel
     */
    static exportStudentsToExcel(students: Student[], classes: ClassGroup[]) {
        const data = students.map(student => {
            const classGroup = classes.find(c => c.id === student.classId);

            return {
                'Nome': student.name,
                'Turma': classGroup?.name || 'N/A',
                'Frequência': `${student.attendanceRate}%`,
                'Status': student.status === 'active' ? 'Ativo' : 'Inativo',
                'Necessidades': student.needs || 'Nenhuma'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Alunos');

        XLSX.writeFile(workbook, `alunos-${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    /**
     * Exporta aulas extras para Excel
     */
    static exportExtraClassesToExcel(extraClasses: ExtraClass[], students: Student[]) {
        const data = extraClasses.map(ec => {
            const participantNames = ec.participants
                .map(id => students.find(s => s.id === id)?.name || 'Desconhecido')
                .join(', ');

            return {
                'Nome': ec.name,
                'Tipo': ec.type,
                'Professor': ec.teacher,
                'Dia': ec.dayOfWeek,
                'Horário': `${ec.startTime} - ${ec.endTime}`,
                'Participantes': participantNames
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Aulas Extras');

        XLSX.writeFile(workbook, `aulas-extras-${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    /**
     * Exporta backup completo de todos os dados em formato JSON
     */
    static exportToJSON(data: BackupPayload) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup-diario-professor-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Importa dados de um arquivo JSON
     */
    static async importFromJSON(file: File): Promise<BackupPayload> {
        if (!file.name.toLowerCase().endsWith('.json')) {
            throw new Error('Selecione um arquivo JSON válido.');
        }
        if (file.size > 25 * 1024 * 1024) {
            throw new Error('O backup excede o limite de 25 MB.');
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target?.result as string);
                    if (!json || typeof json !== 'object') {
                        throw new Error('Formato de arquivo inválido.');
                    }
                    if (json.app !== 'diario-do-professor') {
                        throw new Error('Este arquivo não é um backup do Diário do Professor.');
                    }
                    if (json.schemaVersion !== 1) {
                        throw new Error('Versão de backup incompatível.');
                    }

                    const collectionNames = [
                        'classes', 'students', 'extraClasses', 'reports',
                        'aiContents', 'notifications', 'communications'
                    ];
                    const invalidCollection = collectionNames.find(name => !Array.isArray(json[name]));
                    if (invalidCollection) {
                        throw new Error(`Backup incompleto: lista "${invalidCollection}" ausente.`);
                    }

                    resolve(json as BackupPayload);
                } catch (err) {
                    reject(err instanceof Error ? err : new Error('Formato de arquivo inválido.'));
                }
            };
            reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
            reader.readAsText(file);
        });
    }

    /**
     * Exporta backup completo de todos os dados
     */
    static exportFullBackup(data: {
        students: Student[];
        classes: ClassGroup[];
        extraClasses: ExtraClass[];
        reports: Report[];
    }) {
        const workbook = XLSX.utils.book_new();

        // Alunos
        const studentsData = data.students.map(s => ({
            'ID': s.id,
            'Nome': s.name,
            'Turma ID': s.classId,
            'Frequência': s.attendanceRate,
            'Status': s.status
        }));
        const studentsSheet = XLSX.utils.json_to_sheet(studentsData);
        XLSX.utils.book_append_sheet(workbook, studentsSheet, 'Alunos');

        // Turmas
        const classesData = data.classes.map(c => ({
            'ID': c.id,
            'Nome': c.name,
            'Período': c.shift,
            'Total Alunos': data.students.filter(s => s.classId === c.id).length
        }));
        const classesSheet = XLSX.utils.json_to_sheet(classesData);
        XLSX.utils.book_append_sheet(workbook, classesSheet, 'Turmas');

        // Aulas Extras
        const extraClassesData = data.extraClasses.map(ec => ({
            'ID': ec.id,
            'Nome': ec.name,
            'Tipo': ec.type,
            'Professor': ec.teacher,
            'Dia': ec.dayOfWeek,
            'Horário': `${ec.startTime} - ${ec.endTime}`
        }));
        const extraClassesSheet = XLSX.utils.json_to_sheet(extraClassesData);
        XLSX.utils.book_append_sheet(workbook, extraClassesSheet, 'Aulas Extras');

        // Relatórios
        const reportsData = data.reports.map(r => ({
            'ID': r.id,
            'Aluno': r.studentName,
            'Data': r.date,
            'Frequência': r.attendanceRate,
            'Observações': r.observations,
            'Atividades de reforço': r.reinforcementActivities || ''
        }));
        const reportsSheet = XLSX.utils.json_to_sheet(reportsData);
        XLSX.utils.book_append_sheet(workbook, reportsSheet, 'Relatórios');

        XLSX.writeFile(workbook, `backup-completo-${new Date().toISOString().split('T')[0]}.xlsx`);
    }
}
