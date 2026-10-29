import React, { useState, useEffect } from 'react';
import { GraduationCap, Mail, Lock, Loader2, ArrowRight, User, Building, Eye, EyeOff, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../services/supabaseClient';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
  onForgotPassword?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onForgotPassword }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Registration specific state
  const [fullName, setFullName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Ao iniciar, carrega email salvo e limpa senhas antigas (segurança)
  useEffect(() => {
    // SEGURANÇA: Limpar senhas salvas de versões anteriores
    localStorage.removeItem('dp_last_password');

    const savedEmail = localStorage.getItem('dp_last_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validações Básicas
    if (!email || !password) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (isRegistering) {
      if (!fullName || !schoolName || !confirmPassword) {
        setError('Por favor, preencha todos os campos do cadastro.');
        return;
      }
      if (password !== confirmPassword) {
        setError('As senhas não coincidem.');
        return;
      }
      if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isRegistering) {
        // --- REGISTRO COM SUPABASE AUTH ---
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              full_name: fullName,
              school: schoolName
            }
          }
        });

        if (error) {
          if (error.message.includes('User already registered')) {
            setError('Este email já está cadastrado. Tente fazer login.');
          } else if (error.message.includes('Failed to fetch')) {
            setError('Não foi possível conectar ao servidor. O banco de dados (Supabase) pode estar pausado ou offline.');
          } else {
            setError(error.message);
          }
          setIsLoading(false);
          return;
        }

        if (data.user) {
          handleRememberMe();

          // Se veio sessão direto no signUp (confirmação desativada):
          if (data.session) {
            setSuccessMessage('Conta criada com sucesso! Redirecionando...');
            onLogin({
              id: data.user.id,
              name: fullName,
              email: email,
              school: schoolName,
              photoUrl: '',
              shifts: []
            });
            return;
          }

          // Se não veio sessão direto, tenta login automático:
          const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (loginData?.session && loginData?.user) {
            setSuccessMessage('Conta criada e autenticada! Redirecionando...');
            onLogin({
              id: loginData.user.id,
              name: fullName,
              email: email,
              school: schoolName,
              photoUrl: '',
              shifts: []
            });
            return;
          }

          if (loginErr?.message?.includes('Email not confirmed')) {
            setSuccessMessage('Conta criada! Por favor, confirme seu email no link enviado ou desative a opção "Confirm email" no painel do Supabase (Auth > Providers > Email).');
            setIsLoading(false);
            return;
          }

          // Fallback
          onLogin({
            id: data.user.id,
            name: fullName,
            email: email,
            school: schoolName,
            photoUrl: '',
            shifts: []
          });
        }

      } else {
        // --- LOGIN COM SUPABASE AUTH ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Email ou senha incorretos.');
          } else if (error.message.includes('Email not confirmed')) {
            setError('Seu email ainda não foi confirmado. Verifique sua caixa de entrada ou desative "Confirm email" nas configurações de Auth do Supabase.');
          } else if (error.message.includes('Failed to fetch')) {
            setError('Não foi possível conectar ao servidor. O banco de dados (Supabase) pode estar pausado ou offline.');
          } else {
            setError(error.message);
          }
          setIsLoading(false);
          return;
        }

        if (data.user) {
          handleRememberMe();

          // O App.tsx vai detectar a sessão e carregar os dados
          // Mas vamos chamar onLogin para garantir
          const metadata = data.user.user_metadata;
          onLogin({
            id: data.user.id,
            name: metadata?.full_name || email.split('@')[0],
            email: email,
            school: metadata?.school || '',
            photoUrl: '',
            shifts: []
          });
        }
      }
    } catch (err: any) {
      console.error('Erro na autenticação:', err);
      setError('Erro ao processar. Tente novamente.');
      setIsLoading(false);
    }
  };

  const handleRememberMe = () => {
    if (rememberMe) {
      localStorage.setItem('dp_last_email', email);
    } else {
      localStorage.removeItem('dp_last_email');
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans overflow-hidden bg-slate-100">

      {/* Background Decorativo com Gradiente Vibrante */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-indigo-800 z-0" />

      {/* Círculos decorativos de fundo */}
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 -right-20 w-80 h-80 bg-brand-400 opacity-20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-pink-500 opacity-10 rounded-full blur-3xl" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-brand-900/20 transform rotate-6 border-4 border-white/20 backdrop-blur-sm">
            <GraduationCap className="w-10 h-10 text-brand-600" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-white drop-shadow-sm">
          {isRegistering ? 'Criar sua conta' : 'Diário do Professor'}
        </h2>
        <p className="mt-3 text-center text-sm text-brand-100 max-w-xs mx-auto">
          {isRegistering
            ? 'Junte-se a milhares de professores transformando a educação.'
            : 'Sua sala de aula digital. Simples, rápida e inteligente.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Alterado bg-white/95 para bg-white e removido backdrop-blur-xl para evitar transparência */}
        <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-gray-100">

          {/* Header do Form */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              <button
                onClick={() => !isLoading && setIsRegistering(false)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${!isRegistering ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Entrar
              </button>
              <button
                onClick={() => !isLoading && setIsRegistering(true)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${isRegistering ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Cadastrar
              </button>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>

            {/* Campos de Registro */}
            {isRegistering && (
              <>
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">
                    Nome Completo
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required={isRegistering}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-slate-200 rounded-lg py-2.5 bg-slate-50"
                      placeholder="Seu nome"
                    />
                  </div>
                </div>

                <div className="animate-in fade-in slide-in-from-top-2 duration-300 delay-75">
                  <label htmlFor="schoolName" className="block text-sm font-medium text-slate-700">
                    Nome da Escola
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="schoolName"
                      name="schoolName"
                      type="text"
                      required={isRegistering}
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-slate-200 rounded-lg py-2.5 bg-slate-50"
                      placeholder="Ex: Escola Municipal..."
                    />
                  </div>
                </div>
              </>
            )}

            {/* Campos Comuns */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Endereço de e-mail
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-slate-200 rounded-lg py-2.5 bg-slate-50"
                  placeholder="professor@escola.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Senha
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 pr-10 sm:text-sm border-slate-200 rounded-lg py-2.5 bg-slate-50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {isRegistering && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 delay-100">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                  Confirmar Senha
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required={isRegistering}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-slate-200 rounded-lg py-2.5 bg-slate-50"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 cursor-pointer">
                  Lembrar meus dados
                </label>
              </div>

              {!isRegistering && (
                <div className="text-sm">
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="font-medium text-brand-600 hover:text-brand-500"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4 animate-in fade-in duration-200 border border-red-100">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg shadow-brand-200 text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="flex items-center">
                    {isRegistering ? 'Criar Conta Grátis' : 'Acessar Sistema'} <ArrowRight className="ml-2 w-4 h-4" />
                  </span>
                )}
              </button>
            </div>
          </form>

          {isRegistering && (
            <div className="mt-6">
              <div className="flex items-center gap-2 p-3 bg-indigo-50 text-indigo-700 rounded-lg text-xs">
                <Sparkles size={16} className="shrink-0" />
                <span>Conta gratuita com acesso total às ferramentas de Inteligência Artificial.</span>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-brand-200/60 mt-8">
          &copy; 2024 Diário do Professor SaaS. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};