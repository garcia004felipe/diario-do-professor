/**
 * Serviço de sincronização offline
 * Gerencia fila de operações quando offline e sincroniza ao reconectar
 * Usa IndexedDB (via pacote 'idb') para armazenamento confiável
 */
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineOperation {
    id: string; // uuid
    type: 'create' | 'update' | 'delete';
    table: string;
    data: any;
    timestamp: number;
}

interface DiariodoProfessorDB extends DBSchema {
  sync_queue: {
    key: string;
    value: OfflineOperation;
    indexes: { 'by-timestamp': number };
  };
}

class OfflineSyncService {
    private dbPromise: Promise<IDBPDatabase<DiariodoProfessorDB>>;
    private isProcessing: boolean = false;

    constructor() {
        this.dbPromise = this.initDB();
        this.setupOnlineListener();
    }

    private async initDB() {
      return openDB<DiariodoProfessorDB>('diario-do-professor-offline', 1, {
        upgrade(db) {
          const store = db.createObjectStore('sync_queue', {
            keyPath: 'id',
          });
          store.createIndex('by-timestamp', 'timestamp');
        },
      });
    }

    /**
     * Adiciona operação à fila (IndexedDB)
     */
    async addOperation(type: 'create' | 'update' | 'delete', table: string, data: any) {
        const operation: OfflineOperation = {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            type,
            table,
            data,
            timestamp: Date.now()
        };

        const db = await this.dbPromise;
        await db.add('sync_queue', operation);
        console.log('[Offline] Operação adicionada à fila (IndexedDB):', operation);
        
        // Tenta sincronizar imediatamente se estiver online
        if (this.isOnline()) {
          this.processQueue();
        }
    }

    /**
     * Retorna a fila atual ordenada por timestamp
     */
    async getQueue(): Promise<OfflineOperation[]> {
       const db = await this.dbPromise;
       return db.getAllFromIndex('sync_queue', 'by-timestamp');
    }

    /**
     * Remove uma operação da fila após sucesso
     */
    private async removeOperation(id: string) {
       const db = await this.dbPromise;
       await db.delete('sync_queue', id);
    }

    /**
     * Limpa toda a fila
     */
    async clearQueue() {
       const db = await this.dbPromise;
       await db.clear('sync_queue');
    }

    /**
     * Processa fila quando online
     */
    async processQueue() {
        if (!navigator.onLine || this.isProcessing) {
            return;
        }

        this.isProcessing = true;
        
        try {
          const operations = await this.getQueue();
          
          if (operations.length === 0) {
              this.isProcessing = false;
              return;
          }

          console.log(`[Offline] Processando fila: ${operations.length} operações`);

          for (const operation of operations) {
              if (!navigator.onLine) {
                 console.log('[Offline] Conexão perdida durante o processamento. Pausando.');
                 break; // Para de processar se a internet cair no meio
              }

              try {
                  await this.executeOperation(operation);
                  console.log('[Offline] Operação sincronizada com sucesso no banco:', operation.id);
                  await this.removeOperation(operation.id);
              } catch (error) {
                  console.error('[Offline] Erro ao sincronizar operação. Mantida na fila.', operation, error);
                  // Opcional: Se o erro for 400 (Bad Request), talvez a operação seja inválida e deva ser descartada.
                  // Para erros temporários (500, timeout), a operação continua na fila para a próxima tentativa.
              }
          }
        } finally {
           this.isProcessing = false;
        }
    }

    /**
     * Executa operação no Supabase
     * IMPORTANTE: Devemos importar dinamicamente o cliente do Supabase para evitar ciclos ou acessar client instanciado
     */
    private async executeOperation(operation: OfflineOperation) {
        const { supabase } = await import('./supabaseClient'); // Importação dinâmica
        
        // Simulação / Preparação da lógica real
        let { error } = { error: null as any };

        switch(operation.type) {
          case 'create':
            // Omitimos o ID se ele for autogerado, ou o enviamos se já tiver sido gerado no cliente
            ({ error } = await supabase.from(operation.table).insert([operation.data]));
            break;
          case 'update':
            // Presume-se que data.id seja a chave primária
            ({ error } = await supabase.from(operation.table).update(operation.data).eq('id', operation.data.id));
            break;
          case 'delete':
            ({ error } = await supabase.from(operation.table).delete().eq('id', operation.data.id));
            break;
        }

        if (error) throw error;
    }

    /**
     * Configura listener para detectar quando volta online
     */
    private setupOnlineListener() {
        window.addEventListener('online', () => {
            console.log('[Offline] Conexão restaurada, sincronizando fila...');
            
            // Disparar evento customizado para a UI saber que está syncando
            window.dispatchEvent(new CustomEvent('offline-sync-started'));
            
            this.processQueue().then(() => {
               window.dispatchEvent(new CustomEvent('offline-sync-finished'));
            });
        });

        window.addEventListener('offline', () => {
            console.log('[Offline] Conexão perdida, modo offline ativado');
        });
    }

    /**
     * Verifica se está online
     */
    isOnline(): boolean {
        return navigator.onLine;
    }

    /**
     * Retorna número de operações pendentes
     */
    async getPendingCount(): Promise<number> {
        const db = await this.dbPromise;
        return db.count('sync_queue');
    }
}

export const offlineSyncService = new OfflineSyncService();
