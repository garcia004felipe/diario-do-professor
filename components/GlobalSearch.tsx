import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Student, ClassGroup, Report, ExtraClass, ViewState } from '../types';

interface GlobalSearchProps {
    students: Student[];
    classes: ClassGroup[];
    reports: Report[];
    extraClasses: ExtraClass[];
    onNavigate: (view: ViewState, itemId?: string) => void;
    onClose: () => void;
}

type SearchResult = {
    type: 'student' | 'class' | 'report' | 'extraClass';
    id: string;
    title: string;
    subtitle: string;
    view: ViewState;
};

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
    students,
    classes,
    reports,
    extraClasses,
    onNavigate,
    onClose
}) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);

    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            return;
        }

        const searchResults: SearchResult[] = [];
        const lowerQuery = query.toLowerCase();

        // Buscar alunos
        students.forEach(student => {
            if (student.name.toLowerCase().includes(lowerQuery)) {
                searchResults.push({
                    type: 'student',
                    id: student.id,
                    title: student.name,
                    subtitle: `Frequência: ${student.attendanceRate}%`,
                    view: ViewState.STUDENTS
                });
            }
        });

        // Buscar turmas
        classes.forEach(cls => {
            if (cls.name.toLowerCase().includes(lowerQuery)) {
                searchResults.push({
                    type: 'class',
                    id: cls.id,
                    title: cls.name,
                    subtitle: `${cls.studentCount} alunos`,
                    view: ViewState.CLASSES
                });
            }
        });

        // Buscar aulas extras
        extraClasses.forEach(ec => {
            if (ec.name.toLowerCase().includes(lowerQuery) || ec.teacher.toLowerCase().includes(lowerQuery)) {
                searchResults.push({
                    type: 'extraClass',
                    id: ec.id,
                    title: ec.name,
                    subtitle: `${ec.teacher} - ${ec.dayOfWeek}`,
                    view: ViewState.EXTRA_CLASSES
                });
            }
        });

        // Buscar relatórios
        reports.forEach(report => {
            if (report.studentName.toLowerCase().includes(lowerQuery) || report.observations.toLowerCase().includes(lowerQuery)) {
                searchResults.push({
                    type: 'report',
                    id: report.id,
                    title: `Relatório - ${report.studentName}`,
                    subtitle: new Date(report.date).toLocaleDateString('pt-BR'),
                    view: ViewState.REPORTS
                });
            }
        });

        setResults(searchResults.slice(0, 10)); // Limitar a 10 resultados
    }, [query, students, classes, reports, extraClasses]);

    const handleSelect = (result: SearchResult) => {
        onNavigate(result.view, result.id);
        onClose();
    };

    const getTypeLabel = (type: SearchResult['type']) => {
        switch (type) {
            case 'student': return 'Aluno';
            case 'class': return 'Turma';
            case 'report': return 'Relatório';
            case 'extraClass': return 'Aula Extra';
        }
    };

    const getTypeColor = (type: SearchResult['type']) => {
        switch (type) {
            case 'student': return 'bg-blue-100 text-blue-700';
            case 'class': return 'bg-indigo-100 text-indigo-700';
            case 'report': return 'bg-amber-100 text-amber-700';
            case 'extraClass': return 'bg-emerald-100 text-emerald-700';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20 px-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-200">
                    <Search className="text-gray-400" size={20} />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar alunos, turmas, relatórios..."
                        className="flex-1 outline-none text-lg"
                        autoFocus
                    />
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto">
                    {results.length === 0 && query.length >= 2 && (
                        <div className="p-8 text-center text-gray-500">
                            Nenhum resultado encontrado
                        </div>
                    )}

                    {results.map((result, index) => (
                        <button
                            key={`${result.type}-${result.id}-${index}`}
                            onClick={() => handleSelect(result)}
                            className="w-full p-4 hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                        >
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(result.type)}`}>
                                {getTypeLabel(result.type)}
                            </span>
                            <div className="flex-1 text-left">
                                <div className="font-medium text-gray-800">{result.title}</div>
                                <div className="text-sm text-gray-500">{result.subtitle}</div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between rounded-b-xl">
                    <span>Use Ctrl+K para abrir a busca</span>
                    <span>ESC para fechar</span>
                </div>
            </div>
        </div>
    );
};
