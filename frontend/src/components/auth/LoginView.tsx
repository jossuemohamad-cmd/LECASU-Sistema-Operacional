import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  KeyRound, 
  CheckCircle2, 
  X, 
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import type { User } from '../../types';
import { loginUser, forgotPassword, resetPassword } from '../../services/api';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState(() => localStorage.getItem('lecasu_remember_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem('lecasu_remember_email')));
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotToken, setForgotToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [tempCodeNotice, setTempCodeNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Por favor, preencha o e-mail e a senha.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      if (rememberMe) {
        localStorage.setItem('lecasu_remember_email', email.trim());
      } else {
        localStorage.removeItem('lecasu_remember_email');
      }

      const res = await loginUser({ email, password });
      onLoginSuccess(res.user);
    } catch (err: any) {
      console.error('Erro ao iniciar sessão:', err);
      setErrorMessage(err.message || 'Falha na autenticação. Verifique as credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenForgotModal = () => {
    setForgotStep(1);
    setForgotEmail(email || '');
    setForgotToken('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setForgotError(null);
    setForgotSuccess(null);
    setTempCodeNotice(null);
    setIsForgotModalOpen(true);
  };

  const handleCloseForgotModal = () => {
    setIsForgotModalOpen(false);
    setForgotError(null);
    setForgotSuccess(null);
    setTempCodeNotice(null);
  };

  const handleRequestRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Por favor, informe o seu endereço de e-mail.');
      return;
    }

    try {
      setForgotLoading(true);
      setForgotError(null);
      setForgotSuccess(null);
      setTempCodeNotice(null);

      const res = await forgotPassword({ email: forgotEmail.trim() });
      if (res.temp_code) {
        setTempCodeNotice(`Código de verificação gerado: ${res.temp_code}`);
        setForgotToken(res.temp_code);
      }
      setForgotSuccess(res.message || 'Código de verificação enviado.');
      setForgotStep(2);
    } catch (err: any) {
      setForgotError(err.message || 'Erro ao processar a solicitação de recuperação.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotToken.trim()) {
      setForgotError('Por favor, insira o código de verificação recebido.');
      return;
    }
    if (newPassword.length < 6) {
      setForgotError('A nova palavra-passe deve conter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('A confirmação da palavra-passe não coincide.');
      return;
    }

    try {
      setForgotLoading(true);
      setForgotError(null);

      const res = await resetPassword({
        email: forgotEmail.trim(),
        token: forgotToken.trim(),
        new_password: newPassword
      });

      setForgotSuccess(res.message || 'Palavra-passe redefinida com sucesso!');
      setEmail(forgotEmail.trim());
      setPassword('');

      setTimeout(() => {
        setIsForgotModalOpen(false);
      }, 2000);
    } catch (err: any) {
      setForgotError(err.message || 'Erro ao redefinir a palavra-passe.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* BACKGROUND ACCENTS */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* LOGO AREA LIMPA */}
        <div className="flex items-center justify-center space-x-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-orange-600 flex items-center justify-center font-bold text-white text-2xl tracking-wider shadow-xl shadow-orange-600/30">
            L
          </div>
          <span className="font-bold text-2xl tracking-tight text-white">
            LECASU <span className="text-orange-500 text-sm font-semibold tracking-normal">ERP</span>
          </span>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
          
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

            {/* SENHA COM BOTÃO VER SENHA */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Palavra-passe
                </label>
                <button
                  type="button"
                  onClick={handleOpenForgotModal}
                  className="text-[11px] text-orange-400 hover:text-orange-300 hover:underline transition font-medium cursor-pointer"
                >
                  Esqueceu-se da palavra-passe?
                </button>
              </div>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock size={15} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-10 py-2 text-xs bg-slate-950/80 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  title={showPassword ? 'Ocultar palavra-passe' : 'Ver palavra-passe'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* CHECKBOX LEMBRAR-ME */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-orange-600 focus:ring-orange-500 focus:ring-offset-slate-900 cursor-pointer accent-orange-600"
                />
                <span className="text-xs text-slate-300 font-medium">Lembrar o meu e-mail</span>
              </label>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition disabled:opacity-50 cursor-pointer"
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

        </div>

        {/* FOOTER */}
        <p className="text-center text-[11px] text-slate-500 mt-8">
          LECASU, Lda • Moçambique • Todos os direitos reservados 2026
        </p>
      </div>

      {/* MODAL DE RECUPERAÇÃO DE PALAVRA-PASSE */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={handleCloseForgotModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Recuperação de Palavra-passe</h3>
                <p className="text-xs text-slate-400">
                  {forgotStep === 1 
                    ? 'Etapa 1 de 2: Confirmação do e-mail corporativo' 
                    : 'Etapa 2 de 2: Inserção do código e nova palavra-passe'}
                </p>
              </div>
            </div>

            {forgotError && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg flex items-start space-x-2 text-xs">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg flex items-start space-x-2 text-xs">
                <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {tempCodeNotice && (
              <div className="mb-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3 rounded-lg flex items-center justify-between text-xs font-mono">
                <span>{tempCodeNotice}</span>
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleRequestRecoveryCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    E-mail Institucional
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail size={15} />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="utilizador@lecasu.co.mz"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2 text-xs bg-slate-950/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Um código seguro de 6 dígitos será gerado e associado à sua conta com validade de 15 minutos.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseForgotModal}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>A processar...</span>
                      </>
                    ) : (
                      <>
                        <span>Solicitar Código</span>
                        <ArrowRight size={13} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Código de 6 Dígitos
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Ex: 482910"
                    value={forgotToken}
                    onChange={(e) => setForgotToken(e.target.value)}
                    className="block w-full px-3 py-2 text-center tracking-widest font-mono text-base font-bold bg-slate-950/80 border border-slate-700 rounded-lg text-orange-400 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nova Palavra-passe
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock size={15} />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full pl-9 pr-10 py-2 text-xs bg-slate-950/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition cursor-pointer"
                      title={showNewPassword ? 'Ocultar palavra-passe' : 'Ver palavra-passe'}
                    >
                      {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Confirmar Nova Palavra-passe
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock size={15} />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Confirme a nova palavra-passe"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2 text-xs bg-slate-950/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="text-xs font-medium text-orange-400 hover:text-orange-300 hover:underline transition cursor-pointer"
                  >
                    ← Voltar ao e-mail
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>A redefinir...</span>
                      </>
                    ) : (
                      <>
                        <span>Redefinir Palavra-passe</span>
                        <CheckCircle2 size={13} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
