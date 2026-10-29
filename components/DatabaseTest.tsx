import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export const DatabaseTest: React.FC = () => {
    const [status, setStatus] = useState<string[]>([]);
    const [session, setSession] = useState<any>(null);

    const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
        const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
        setStatus(prev => [...prev, `${emoji} ${message}`]);
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        addLog('Verificando autenticação...');
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            setSession(session);
            addLog(`Sessão ativa! User ID: ${session.user.id}`, 'success');
            addLog(`Email: ${session.user.email}`, 'info');
        } else {
            addLog('Nenhuma sessão ativa', 'error');
            addLog('Você precisa fazer login primeiro!', 'error');
        }
    };

    const testDatabaseWrite = async () => {
        if (!session) {
            addLog('Faça login primeiro!', 'error');
            return;
        }

        addLog('Verificando se o perfil do usuário existe...');

        try {
            // Primeiro, verificar se o perfil existe
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') {
                addLog(`Erro ao verificar perfil por ID: ${profileError.message}`, 'error');
            }

            if (!profile) {
                addLog('Perfil não encontrado por ID. Verificando por email...', 'info');

                // Tentar encontrar por email
                const { data: profileByEmail } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('email', session.user.email)
                    .single();

                if (profileByEmail) {
                    addLog(`⚠️ PROBLEMA: Perfil existe com email ${session.user.email} mas ID diferente!`, 'error');
                    addLog(`ID do perfil existente: ${profileByEmail.id}`, 'error');
                    addLog(`ID da sessão atual: ${session.user.id}`, 'error');
                    addLog('Você precisa deletar a conta antiga e criar uma nova.', 'error');
                    return;
                }

                addLog('Perfil não existe! Criando perfil...', 'info');

                // Criar o perfil do usuário
                const { error: createProfileError } = await supabase
                    .from('user_profiles')
                    .insert({
                        id: session.user.id,
                        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário',
                        email: session.user.email,
                        school: session.user.user_metadata?.school || 'Escola Teste',
                        photo_url: ''
                    });

                if (createProfileError) {
                    addLog(`ERRO ao criar perfil: ${createProfileError.message}`, 'error');
                    addLog(`Código: ${createProfileError.code}`, 'error');
                    return;
                }

                addLog('✅ Perfil criado com sucesso!', 'success');
            } else {
                addLog('✅ Perfil já existe!', 'success');
            }

            addLog('Testando INSERT no banco de dados...');

            const testData = {
                name: 'Teste ' + Date.now(),
                grade: '1º Ano',
                shift: 'morning',
                teacher_name: 'Professor Teste',
                student_count: 0,
                user_id: session.user.id
            };

            addLog(`Tentando inserir: ${JSON.stringify(testData)}`);

            const { data, error } = await supabase
                .from('class_groups')
                .insert(testData)
                .select()
                .single();

            if (error) {
                addLog(`ERRO ao inserir: ${error.message}`, 'error');
                addLog(`Código do erro: ${error.code}`, 'error');

                if (error.message.includes('permission denied') || error.code === '42501') {
                    addLog('⚠️ PROBLEMA: RLS está bloqueando! Configure as políticas RLS no Supabase.', 'error');
                }
            } else {
                addLog(`Sucesso! Turma criada com ID: ${data.id}`, 'success');
                addLog('Agora testando leitura...', 'info');
                testDatabaseRead();
            }
        } catch (err: any) {
            addLog(`Erro inesperado: ${err.message}`, 'error');
        }
    };

    const testDatabaseRead = async () => {
        if (!session) {
            addLog('Faça login primeiro!', 'error');
            return;
        }

        addLog('Testando SELECT no banco de dados...');

        try {
            const { data, error } = await supabase
                .from('class_groups')
                .select('*')
                .eq('user_id', session.user.id);

            if (error) {
                addLog(`ERRO ao ler: ${error.message}`, 'error');

                if (error.message.includes('permission denied') || error.code === '42501') {
                    addLog('⚠️ PROBLEMA: RLS está bloqueando leitura!', 'error');
                }
            } else {
                addLog(`Sucesso! Encontradas ${data.length} turmas`, 'success');
                if (data.length > 0) {
                    addLog(`Primeira turma: ${data[0].name}`, 'info');
                }
            }
        } catch (err: any) {
            addLog(`Erro inesperado: ${err.message}`, 'error');
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">🔧 Teste de Conexão Supabase</h1>
                <p className="text-gray-600 mb-6">
                    Use esta página para diagnosticar problemas de persistência de dados.
                </p>

                <div className="space-y-3 mb-6">
                    <button
                        onClick={checkAuth}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                        1. Verificar Autenticação
                    </button>

                    <button
                        onClick={testDatabaseWrite}
                        disabled={!session}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        2. Testar Escrita no Banco
                    </button>

                    <button
                        onClick={testDatabaseRead}
                        disabled={!session}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        3. Testar Leitura do Banco
                    </button>
                </div>

                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                    {status.length === 0 ? (
                        <div className="text-gray-500">Clique nos botões acima para começar os testes...</div>
                    ) : (
                        status.map((log, index) => (
                            <div key={index} className="mb-1">{log}</div>
                        ))
                    )}
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 className="font-bold text-yellow-800 mb-2">⚠️ Se aparecer erro de RLS:</h3>
                    <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                        <li>Acesse o Supabase Dashboard</li>
                        <li>Vá em SQL Editor</li>
                        <li>Execute o script SQL do plano de implementação</li>
                        <li>OU desabilite RLS em cada tabela temporariamente</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};
