import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, KeyRound } from 'lucide-react';
import type { User } from '../../types';
import { loginUser } from '../../services/api';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Por favor, preencha o e-mail e a senha.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await loginUser({ email, password });
      onLoginSuccess(res.user);
    } catch (err: any) {
      console.error('Erro ao iniciar sessão:', err);
      setErrorMessage(err.message || 'Falha na autenticação. Verifique as credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemoAdmin = () => {
    setEmail('admin@lecasu.co.mz');
    setPassword('AdminLECASU@2026');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* BACKGROUND ACCENTS */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* LOGO AREA */}
        <div className="flex items-center justify-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-white text-xl tracking-wider shadow-lg shadow-orange-600/30">
            L
          </div>
          <span className="font-bold text-2xl tracking-tight text-white">
            LECASU <span className="text-orange-500 text-sm font-semibold tracking-normal">ERP</span>
          </span>
        </div>
        <p className="text-center text-xs text-slate-400 font-medium">
          Sistema Integrado Operacional & Financeiro • v2.0
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-xl border border-slate-800 sm:px-10">
          
          <div className="mb-6 pb-4 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck size={18} className="text-orange-500" />
              Autenticação de Acesso
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Introduza as suas credenciais corporativas para entrar.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg flex items-start space-x-2.5 text-xs animate-in fade-in">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* EMAIL */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Endereço de E-mail
              </label>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  required
                  placeholder="utilizador@lecasu.co.mz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-xs bg-slate-950/80 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition"
                />
              </div>
            </div>

            {/* SENHA */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Palavra-passe
              </label>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock size={15} />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-xs bg-slate-950/80 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition"
                />
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition disabled:opacity-50"
              >
                {isLoading ? (
                  <span>A autenticar...</span>
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* DEMO CREDENTIALS BOX */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <KeyRound size={13} className="text-orange-500" />
                  Credenciais de Administrador Padrão:
                </span>
              </div>
              <div className="font-mono text-[11px] text-slate-300 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span>admin@lecasu.co.mz</span>
                <span className="text-orange-400 font-semibold">AdminLECASU@2026</span>
              </div>
              <button
                type="button"
                onClick={handleFillDemoAdmin}
                className="text-[11px] font-semibold text-orange-400 hover:text-orange-300 text-left hover:underline transition self-start"
              >
                + Preencher automaticamente
              </button>
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <p className="text-center text-[11px] text-slate-600 mt-6">
          LECASU, Lda • Moçambique • Todos os direitos reservados 2026
        </p>
      </div>
    </div>
  );
};
