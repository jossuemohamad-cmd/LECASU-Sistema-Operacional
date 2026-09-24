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
  const [loadingStep, setLoadingStep] = useState(1);
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
      setLoadingStep(1);
      setErrorMessage(null);

      // Dynamic loading step indicators for real-time user feedback
      const stepTimer1 = setTimeout(() => setLoadingStep(2), 1200);
      const stepTimer2 = setTimeout(() => setLoadingStep(3), 2600);
      
      if (rememberMe) {
        localStorage.setItem('lecasu_remember_email', email.trim());
      } else {
        localStorage.removeItem('lecasu_remember_email');
      }

      const res = await loginUser({ email, password });
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      onLoginSuccess(res.user);
    } catch (err: any) {
      console.error('Erro ao iniciar sessão:', err);
      setErrorMessage(err.message || 'Falha na autenticação. Verifique as credenciais.');
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
      setForgotSuccess(res.message || 'Código de verificação gerado.');
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
    <div 
      className="min-h-screen w-full flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden bg-[#101010] bg-cover bg-center bg-no-repeat selection:bg-[#FF8000] selection:text-white"
    >
      {/* LUXURY DARK GRADIENT & GLASS OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#101010] via-[#141414] to-[#1a1a1a] pointer-events-none" />
      
      {/* AMBIENT GLOW EFFECTS */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#FF8000]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-[#FF8000]/10 rounded-full blur-3xl pointer-events-none" />

      {/* LOGIN CARD CONTAINER */}
      <div className="w-full max-w-md z-10 relative">
        <div className="bg-[#181818]/90 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-[#2E2E2E] transition-all duration-300 relative overflow-hidden">
          
          {/* TOP ACCENT LINE WITH LOADING PULSE */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF8000] via-[#FFA347] to-[#FF8000] overflow-hidden">
            {isLoading && (
              <div className="w-full h-full bg-white/40 animate-pulse" />
            )}
          </div>

          {/* INTEGRATED BRANDING & HEADER */}
          <div className="mb-6 pb-5 border-b border-[#282828] text-center">
            <div className="inline-flex items-center justify-center space-x-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-[#FF8000] flex items-center justify-center font-heading font-black text-white text-2xl tracking-wider shadow-lg shadow-[#FF8000]/30 ring-1 ring-[#FF8000]/50">
                L
              </div>
              <div className="text-left">
                <span className="font-heading font-extrabold text-2xl tracking-tight text-white block leading-none">
                  LECASU <span className="text-[#FF8000] text-xs font-bold tracking-wider uppercase ml-0.5">ERP</span>
                </span>
                <span className="text-[11px] text-neutral-400 font-sans font-medium tracking-wide">
                  Sistema Operacional
                </span>
              </div>
            </div>
            
            <p className="text-xs text-neutral-400 max-w-xs mx-auto font-sans">
              Introduza as suas credenciais corporativas para entrar no sistema.
            </p>
          </div>

          {/* ERROR ALERT */}
          {errorMessage && (
            <div className="mb-5 bg-rose-500/15 border border-rose-500/30 text-rose-300 p-3 rounded-lg flex items-start space-x-2.5 text-xs animate-in fade-in zoom-in-95 font-sans">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-rose-400" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* EMAIL */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Endereço de E-mail
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="utilizador@lecasu.co.mz"
                  value={email}
                  disabled={isLoading}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 text-xs bg-[#10121A] border border-[#2E3342] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#FF8000] focus:border-[#FF8000] transition disabled:opacity-60"
                />
              </div>
            </div>

            {/* SENHA */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Palavra-passe
                </label>
                <button
                  type="button"
                  onClick={handleOpenForgotModal}
                  disabled={isLoading}
                  className="text-[11px] text-[#FF8000] hover:text-[#FFA347] hover:underline transition font-medium cursor-pointer disabled:opacity-50"
                >
                  Esqueceu-se da palavra-passe?
                </button>
              </div>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock size={15} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  disabled={isLoading}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-10 py-2.5 text-xs bg-[#10121A] border border-[#2E3342] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#FF8000] focus:border-[#FF8000] transition disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition cursor-pointer disabled:opacity-50"
                  title={showPassword ? 'Ocultar palavra-passe' : 'Ver palavra-passe'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* CHECKBOX LEMBRAR-ME */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  disabled={isLoading}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-orange-600 focus:ring-orange-500 focus:ring-offset-slate-900 cursor-pointer accent-orange-600"
                />
                <span className="text-xs text-slate-300 font-medium">Lembrar o meu e-mail</span>
              </label>
            </div>

            {/* SUBMIT BUTTON COM EFEITO DE LOAD BONITO */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full relative overflow-hidden py-3 px-4 border border-transparent rounded-lg shadow-lg text-xs font-bold text-white transition-all duration-300 cursor-pointer ${
                  isLoading 
                    ? 'bg-orange-700 cursor-wait shadow-orange-600/20' 
                    : 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/30 hover:shadow-orange-600/40 active:scale-[0.99]'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2.5">
                    {/* CUSTOM ROTATING DUAL-RING SPINNER */}
                    <div className="relative w-4 h-4 flex-shrink-0">
                      <div className="absolute inset-0 rounded-full border-2 border-white/20" />
                      <div className="absolute inset-0 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    </div>
                    <span className="font-semibold tracking-wide">
                      {loadingStep === 1 && 'A verificar credenciais...'}
                      {loadingStep === 2 && 'A autenticar perfil e permissões...'}
                      {loadingStep >= 3 && 'A sincronizar dados do sistema...'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>Entrar no Sistema</span>
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </div>
                )}
              </button>
            </div>
          </form>

          {/* ELEGANT FULL-CARD LOADING OVERLAY DURING AUTHENTICATION */}
          {isLoading && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
              {/* GLOWING LOGO */}
              <div className="relative mb-4">
                <div className="absolute -inset-2 bg-orange-600/40 rounded-2xl blur-md animate-pulse" />
                <div className="relative w-14 h-14 rounded-2xl bg-orange-600 flex items-center justify-center text-white font-black text-2xl shadow-xl">
                  L
                </div>
              </div>

              {/* DUAL SPINNER */}
              <div className="relative w-8 h-8 my-2">
                <div className="absolute inset-0 rounded-full border-2 border-orange-500/20" />
                <div className="absolute inset-0 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
              </div>

              {/* STEP TEXT */}
              <h4 className="text-sm font-bold text-white mt-2">
                LECASU Sistema Operacional
              </h4>
              <p className="text-xs text-orange-400 font-medium mt-1 animate-pulse">
                {loadingStep === 1 && 'A validar credenciais de segurança...'}
                {loadingStep === 2 && 'A carregar perfil de utilizador e acessos...'}
                {loadingStep >= 3 && 'A sincronizar dados operacionais...'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Por favor aguarde um instante
              </p>

              {/* PROGRESS BAR */}
              <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden mt-4">
                <div className="h-full bg-gradient-to-r from-orange-600 via-amber-400 to-orange-600 w-full animate-[shimmer_1.5s_infinite_linear]" />
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="text-center mt-6">
          <p className="text-[11px] text-slate-400 font-medium">
            LECASU, Lda • Moçambique • Todos os direitos reservados 2026
          </p>
          <p className="text-[10px] text-slate-500 mt-1 flex items-center justify-center gap-1">
            <ShieldCheck size={12} className="text-orange-500" />
            Ambiente Seguro & Criptografado (TLS/AES-256)
          </p>
        </div>
      </div>

      {/* MODAL DE RECUPERAÇÃO DE PALAVRA-PASSE */}
      {isForgotModalOpen && (
        <div className="modal-overlay-erp animate-in fade-in">
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
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>A processar...</span>
                      </div>
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
                      className="block w-full pl-9 pr-10 py-2 text-xs bg-slate-950/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition"
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
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>A redefinir...</span>
                      </div>
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
