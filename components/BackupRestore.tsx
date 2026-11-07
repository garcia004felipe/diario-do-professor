import React, { useRef } from 'react';
import { DatabaseBackup, Download, Upload, ShieldCheck } from 'lucide-react';

interface BackupRestoreProps {
  onExport: () => void;
  onImport: (file: File) => Promise<string>;
}

export const BackupRestore: React.FC<BackupRestoreProps> = ({ onExport, onImport }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [isError, setIsError] = React.useState(false);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await onImport(file);
      setMessage(result);
      setIsError(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao restaurar o backup.');
      setIsError(true);
    }
    event.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Backup & Restore</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Exporte uma cópia completa ou restaure os dados do diário.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
            <DatabaseBackup size={24} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Proteja seus dados</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              O backup inclui turmas, alunos, aulas extras, relatórios, conteúdos de IA, notificações e comunicados.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          <button
            onClick={onExport}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
          >
            <Download size={18} />
            Exportar backup completo
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            <Upload size={18} />
            Importar backup JSON
          </button>
          <input ref={inputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>

        {message && (
          <div className={`mt-4 rounded-lg p-3 text-sm ${
            isError
              ? 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800'
          }`}>
            {message}
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 text-sm text-gray-500 dark:text-gray-400 px-1">
        <ShieldCheck className="shrink-0 mt-0.5 text-emerald-600" size={18} />
        <p>Os dados são restaurados por mesclagem: informações existentes não são excluídas nem substituídas silenciosamente.</p>
      </div>
    </div>
  );
};
