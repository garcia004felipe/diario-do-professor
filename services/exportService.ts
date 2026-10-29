import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { Report, Student, ClassGroup, ExtraClass } from '../types';

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
     */
    static exportClassBulletin(classGroup: ClassGroup, students: Student[], allReports: Report[]): { success: boolean; message: string; count: number } {
        try {
            console.log('🔧 Iniciando exportClassBulletin...');
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
                return String(val);
            };

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
                    doc.setFillColor(79, 70, 229);
                    doc.rect(0, 0, 210, 40, 'F');

                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(22);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Boletim de Desempenho', marginX, 22);
                    
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`${safe(classGroup.name)} \u2022 ${safe(classGroup.grade)}`, marginX, 32);

                    // --- Dados do Aluno ---
                    currentY = 55;
                    doc.setTextColor(30, 41, 59);
                    
                    doc.setFontSize(16);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`Aluno(a): ${safe(student.name)}`, marginX, currentY);
                    currentY += 10;

                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`Idade: ${safe(student.age)} anos`, marginX, currentY);
                    doc.text(`Frequencia Global: ${safe(student.attendanceRate)}%`, 100, currentY);
                    currentY += 8;

                    doc.text(`Professor Responsavel: ${safe(classGroup.teacherName || 'Nao informado')}`, marginX, currentY);
                    currentY += 8;

                    doc.text(`Observacoes Medicas: ${safe(student.needs || 'Nenhuma restricao registrada')}`, marginX, currentY);
                    currentY += 15;

                    // --- Tabela de Notas ---
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Desempenho por Disciplina', marginX, currentY);
                    currentY += 10;

                    if (student.subjects && student.subjects.length > 0) {
                        doc.setFontSize(10);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(100, 116, 139);
                        doc.text('Disciplina', marginX, currentY);
                        doc.text('Professor', 90, currentY);
                        doc.text('Nota', 160, currentY);
                        doc.text('Frequencia', 180, currentY);
                        currentY += 4;
                        doc.line(marginX, currentY, 200, currentY); 
                        currentY += 6;

                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(30, 41, 59);

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
                    doc.text('Parecer Pedagogico', marginX, currentY);
                    currentY += 8;

                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    
                    if (latestReport && latestReport.observations) {
                        doc.setTextColor(71, 85, 105);
                        const dataFechamento = new Date(latestReport.date).toLocaleDateString('pt-BR');
                        doc.text(`Ultima Analise (Fechamento: ${dataFechamento}):`, marginX, currentY);
                        currentY += 6;
                        
                        doc.setTextColor(30, 41, 59);
                        const obsText = safe(latestReport.observations);
                        const splitText = doc.splitTextToSize(obsText, 170);
                        
                        if (currentY + (splitText.length * 5) > 280) {
                             doc.addPage();
                             currentY = 20;
                        }
                        
                        doc.text(splitText, marginX, currentY);
                    } else {
                        doc.setTextColor(148, 163, 184);
                        doc.setFont('helvetica', 'italic');
                        doc.text('Nenhum relatorio ou parecer registrado para este aluno no periodo.', marginX, currentY);
                    }

                    // --- Rodapé ---
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'italic');
                    doc.setTextColor(148, 163, 184);
                    doc.text(`Documento gerado pelo Diario do Professor - ${new Date().toLocaleDateString('pt-BR')}`, marginX, 290);
                    
                    console.log(`  ✅ Aluno ${student.name} processado com sucesso`);
                } catch (studentError) {
                    console.error(`  ❌ Erro ao processar aluno ${student.name}:`, studentError);
                }
            });

            // Salvar
            const sanitizeName = (classGroup.name || 'turma').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `boletins-${sanitizeName}-${new Date().toISOString().split('T')[0]}.pdf`;
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
            'Observações': r.observations
        }));
        const reportsSheet = XLSX.utils.json_to_sheet(reportsData);
        XLSX.utils.book_append_sheet(workbook, reportsSheet, 'Relatórios');

        XLSX.writeFile(workbook, `backup-completo-${new Date().toISOString().split('T')[0]}.xlsx`);
    }
}
