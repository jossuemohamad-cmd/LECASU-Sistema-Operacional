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
  
  // Loading State
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
      setErrorMessage('Por favor, preencha o e-mail e a palavra-passe.');
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
      setErrorMessage(err.message || 'Falha na autenticação. Verifique o seu e-mail e palavra-passe.');
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
      setForgotError('Por favor, informe o seu endereço de e-mail corporativo.');
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

  // =========================================================================
  // 1. LOADER EM TELA CHEIA (Minimalista, Moderno & Fluído - Linear Style)
  // =========================================================================
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[99999] bg-[#101010] flex flex-col items-center justify-center p-6 text-white font-sans select-none animate-in fade-in duration-200">
        <div className="flex flex-col items-center text-center max-w-sm w-full">
          
          {/* Logo Minimalista com Anel de Carregamento Fluído */}
          <div className="relative mb-6 flex items-center justify-center">
            {/* Anel giratório sutil */}
            <div className="w-16 h-16 rounded-full border-2 border-neutral-800 border-t-[#FF8000] animate-spin" style={{ animationDuration: '0.85s' }} />
            
            {/* Ícone Central */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF8000] to-[#E67300] text-white font-heading font-black text-lg flex items-center justify-center shadow-lg shadow-[#FF8000]/25">
                L
              </div>
            </div>
          </div>

          {/* Nome Corporativo */}
          <h2 className="text-xl font-bold font-heading text-white tracking-tight flex items-center gap-1.5">
            <span>LECASU</span>
            <span className="text-[#FF8000] text-xs font-semibold px-1.5 py-0.5 rounded bg-[#FF8000]/10 border border-[#FF8000]/20">ERP</span>
          </h2>
          
          <p className="text-xs text-neutral-400 mt-2 font-medium">
            A autenticar e inicializar espaço de trabalho...
          </p>

          {/* Micro Linha de Pulso */}
          <div className="w-44 h-1 bg-neutral-900 rounded-full overflow-hidden mt-6">
            <div className="h-full bg-gradient-to-r from-transparent via-[#FF8000] to-transparent w-full animate-pulse" />
          </div>

          {/* Tag de Segurança */}
          <div className="mt-8 flex items-center gap-1.5 text-[11px] text-neutral-500 font-mono">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span>Sessão Encriptada TLS 1.3</span>
          </div>

        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. TELA DE LOGIN PROFISSIONAL (100vh Sem Scroll Vertical)
  // =========================================================================
  return (
    <div className="h-screen max-h-screen w-screen overflow-hidden flex bg-[#F5F5F3] font-sans selection:bg-[#FF8000] selection:text-white">
      
      {/* 
        PAINEL ESQUERDO: IMAGEM CORPORATIVA (100vh Sem Scroll)
      */}
      <div className="hidden lg:block lg:w-1/2 h-full max-h-screen relative overflow-hidden bg-[#101010] border-r border-[#222222]">
        <img
          src="/login-cover.jpg"
          alt="LECASU Serviços de Engenharia, Climatização e Energia Solar"
          className="w-full h-full object-cover object-center"
        />
        {/* Sutil gradiente para acabamento sofisticado */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
      </div>

      {/* 
        PAINEL DIREITO: FORMULÁRIO DE LOGIN CENTRALIZADO
      */}
      <div className="w-full lg:w-1/2 h-full max-h-screen flex items-center justify-center p-6 sm:p-8 md:p-10 overflow-y-auto bg-[#F5F5F3]">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#E2E2DE] shadow-xl p-8 sm:p-9 animate-in fade-in zoom-in-95 duration-200 my-auto">
          
          {/* Logo visível em Mobile */}
          <div className="lg:hidden mb-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#FF8000] text-white font-heading font-black text-2xl shadow-md mb-2">
              L
            </div>
            <h1 className="text-xl font-bold font-heading text-[#101010]">
              LECASU <span className="text-[#FF8000] text-xs font-semibold">ERP</span>
            </h1>
          </div>

          {/* Cabeçalho do Formulário */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold font-heading text-[#101010] tracking-tight">
              Aceder ao Sistema
            </h2>
            <p className="text-xs text-[#737370] mt-1.5">
              Introduza as suas credenciais corporativas para iniciar sessão.
            </p>
          </div>

          {/* ALERTA DE ERRO */}
          {errorMessage && (
            <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl flex items-start space-x-2.5 text-xs animate-in fade-in">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                <p className="font-semibold text-rose-900 font-heading">Erro de Autenticação</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* FORMULÁRIO DE LOGIN */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            
            {/* ENDEREÇO DE E-MAIL */}
            <div>
              <label className="block text-xs font-semibold text-[#101010] mb-1.5 font-heading">
                Endereço de E-mail Corporativo *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="admin@lecasu.co.mz"
                  value={email}
                  disabled={isLoading}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#FAFAF9] border border-[#E2E2DE] rounded-xl text-[#101010] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF8000]/20 focus:border-[#FF8000] focus:bg-white transition"
                />
              </div>
            </div>

            {/* PALAVRA-PASSE */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#101010] font-heading">
                  Palavra-passe *
                </label>
                <button
                  type="button"
                  onClick={handleOpenForgotModal}
                  disabled={isLoading}
                  className="text-[11px] text-[#FF8000] hover:text-[#E67300] hover:underline transition font-semibold cursor-pointer"
                >
                  Esqueceu-se da palavra-passe?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  disabled={isLoading}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 text-xs bg-[#FAFAF9] border border-[#E2E2DE] rounded-xl text-[#101010] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF8000]/20 focus:border-[#FF8000] focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
                  title={showPassword ? 'Ocultar palavra-passe' : 'Ver palavra-passe'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* CHECKBOX LEMBRAR-ME */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  disabled={isLoading}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E2E2DE] text-[#FF8000] focus:ring-[#FF8000] cursor-pointer accent-[#FF8000]"
                />
                <span className="text-xs text-[#737370] font-medium">Lembrar o meu e-mail</span>
              </label>
            </div>

            {/* BOTÃO ENTRAR NO SISTEMA */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-[#FF8000] hover:bg-[#E67300] active:bg-[#CC6600] text-white rounded-xl shadow-md shadow-[#FF8000]/25 text-xs font-bold font-heading flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <span>Entrar no Sistema</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </form>

          {/* Dica de Utilização / Footer */}
          <div className="mt-8 pt-6 border-t border-[#EDEDEA] text-center">
            <p className="text-[11px] text-[#737370] flex items-center justify-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              Ambiente Corporativo Protegido • LECASU Moçambique
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL DE RECUPERAÇÃO DE PALAVRA-PASSE
         ========================================================================= */}
      {isForgotModalOpen && (
        <div className="modal-overlay-erp animate-in fade-in">
          <div className="bg-white border border-[#E2E2DE] rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95">
            <button
              onClick={handleCloseForgotModal}
              className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-[#FFF2E5] text-[#FF8000] rounded-xl">
                <KeyRound size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#101010] font-heading">Recuperar Palavra-passe</h3>
                <p className="text-xs text-[#737370]">Redefinição de credencial corporativa</p>
              </div>
            </div>

            {forgotError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl flex items-start space-x-2 text-xs">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-rose-600" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-start space-x-2 text-xs">
                <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5 text-emerald-600" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {tempCodeNotice && (
              <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs">
                <p className="font-semibold">{tempCodeNotice}</p>
                <p className="text-[11px] text-amber-700 mt-0.5">Utilize este código para redefinir a palavra-passe abaixo.</p>
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleRequestRecoveryCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#101010] mb-1.5 font-heading">
                    E-mail Corporativo Cadastrado
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="utilizador@lecasu.co.mz"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full text-xs bg-[#FAFAF9] border border-[#E2E2DE] rounded-xl p-2.5 text-[#101010] focus:outline-none focus:ring-2 focus:ring-[#FF8000]/20 focus:border-[#FF8000]"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-3">
                  <button
                    type="button"
                    onClick={handleCloseForgotModal}
                    className="btn-secondary btn-md"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn-primary btn-md"
                  >
                    {forgotLoading ? 'A processar...' : 'Gerar Código de Verificação'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#101010] mb-1.5 font-heading">
                    Código de Verificação Recebido
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 839201"
                    value={forgotToken}
                    onChange={(e) => setForgotToken(e.target.value)}
                    className="w-full text-xs bg-[#FAFAF9] border border-[#E2E2DE] rounded-xl p-2.5 text-[#101010] font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#FF8000]/20 focus:border-[#FF8000]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#101010] mb-1.5 font-heading">
                    Nova Palavra-passe
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs bg-[#FAFAF9] border border-[#E2E2DE] rounded-xl p-2.5 text-[#101010] focus:outline-none focus:ring-2 focus:ring-[#FF8000]/20 focus:border-[#FF8000]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#101010] mb-1.5 font-heading">
                    Confirmar Nova Palavra-passe
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Repita a palavra-passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-xs bg-[#FAFAF9] border border-[#E2E2DE] rounded-xl p-2.5 text-[#101010] focus:outline-none focus:ring-2 focus:ring-[#FF8000]/20 focus:border-[#FF8000]"
                  />
                </div>

                <div className="flex justify-between items-center pt-3">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="text-xs text-neutral-500 hover:text-neutral-800 underline"
                  >
                    Voltar etapa
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn-primary btn-md"
                  >
                    {forgotLoading ? 'A redefinir...' : 'Atualizar Palavra-passe'}
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
