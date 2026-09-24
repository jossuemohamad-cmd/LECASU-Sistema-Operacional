import React, { useState, useEffect } from 'react';
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
  EyeOff,
  Layers,
  Sparkles,
  Database
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
  
  // Loading & Progress States
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [progressPercent, setProgressPercent] = useState(15);
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

  // Progress animation when loading
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setProgressPercent(prev => {
          if (prev >= 95) return prev;
          return prev + Math.floor(Math.random() * 8) + 4;
        });
      }, 250);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Por favor, preencha o e-mail e a palavra-passe.');
      return;
    }

    try {
      setIsLoading(true);
      setLoadingStep(1);
      setProgressPercent(20);
      setErrorMessage(null);

      // Timers for high-tech progression feedback
      const timer1 = setTimeout(() => {
        setLoadingStep(2);
        setProgressPercent(50);
      }, 900);

      const timer2 = setTimeout(() => {
        setLoadingStep(3);
        setProgressPercent(80);
      }, 1900);

      if (rememberMe) {
        localStorage.setItem('lecasu_remember_email', email.trim());
      } else {
        localStorage.removeItem('lecasu_remember_email');
      }

      const res = await loginUser({ email, password });
      
      clearTimeout(timer1);
      clearTimeout(timer2);
      setLoadingStep(4);
      setProgressPercent(100);

      // Smooth brief pause at 100% before opening ERP
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 600);

    } catch (err: any) {
      console.error('Erro ao iniciar sessão:', err);
      setErrorMessage(err.message || 'Falha na autenticação. Verifique o seu e-mail e palavra-passe.');
      setIsLoading(false);
      setProgressPercent(15);
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
  // 1. LOADER EM TELA CHEIA (Imersivo, Ultra-Profissional & Dinâmico)
  // O formulário fecha e dá lugar a esta tela de processamento até entrar
  // =========================================================================
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[99999] bg-[#101010] flex flex-col items-center justify-center p-6 text-white font-sans overflow-hidden animate-in fade-in duration-300">
        {/* Glow de fundo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FF8000]/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-md w-full flex flex-col items-center text-center">
          {/* Logo animado com pulso de alta tecnologia */}
          <div className="relative mb-8">
            <div className="w-20 h-20 rounded-2xl bg-[#FF8000] flex items-center justify-center font-heading font-black text-white text-4xl tracking-wider shadow-2xl shadow-[#FF8000]/40 ring-4 ring-[#FF8000]/30 animate-pulse">
              L
            </div>
            {/* Anéis orbitais */}
            <div className="absolute -inset-4 rounded-3xl border border-[#FF8000]/30 animate-spin" style={{ animationDuration: '6s' }} />
            <div className="absolute -inset-8 rounded-full border border-dashed border-[#FF8000]/20 animate-spin" style={{ animationDuration: '12s', animationDirection: 'reverse' }} />
          </div>

          <h2 className="text-2xl font-bold font-heading text-white tracking-tight">
            LECASU <span className="text-[#FF8000] text-sm font-semibold uppercase">ERP</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1 font-medium">
            A inicializar sessão corporativa segura
          </p>

          {/* Barra de Progresso com Percentagem */}
          <div className="w-full mt-8 bg-neutral-900 border border-neutral-800 rounded-full p-1 shadow-inner">
            <div className="flex items-center justify-between text-[11px] px-3 pb-1 text-neutral-400 font-mono">
              <span>Carregamento do Sistema</span>
              <span className="font-bold text-[#FF8000]">{Math.min(100, progressPercent)}%</span>
            </div>
            <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#FF8000] to-[#FFA347] rounded-full transition-all duration-300 shadow-sm shadow-[#FF8000]/50"
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
          </div>

          {/* Stepper de Etapas do Loader */}
          <div className="w-full mt-6 space-y-2.5 text-left bg-[#181818] border border-neutral-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center space-x-3 text-xs">
              {loadingStep > 1 ? (
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-[#FF8000] border-t-transparent animate-spin flex-shrink-0" />
              )}
              <span className={loadingStep >= 1 ? 'text-white font-medium' : 'text-neutral-500'}>
                Validação de credenciais e segurança JWT
              </span>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              {loadingStep > 2 ? (
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
              ) : loadingStep === 2 ? (
                <div className="w-4 h-4 rounded-full border-2 border-[#FF8000] border-t-transparent animate-spin flex-shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-neutral-700 flex-shrink-0" />
              )}
              <span className={loadingStep >= 2 ? 'text-white font-medium' : 'text-neutral-500'}>
                Conexão com PostgreSQL Neon Cloud
              </span>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              {loadingStep > 3 ? (
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
              ) : loadingStep === 3 ? (
                <div className="w-4 h-4 rounded-full border-2 border-[#FF8000] border-t-transparent animate-spin flex-shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-neutral-700 flex-shrink-0" />
              )}
              <span className={loadingStep >= 3 ? 'text-white font-medium' : 'text-neutral-500'}>
                Sincronização de módulos e permissões de acesso
              </span>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              {loadingStep === 4 ? (
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-neutral-700 flex-shrink-0" />
              )}
              <span className={loadingStep === 4 ? 'text-emerald-400 font-bold' : 'text-neutral-500'}>
                Acesso autorizado! A entrar no painel...
              </span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center space-x-2 text-[11px] text-neutral-500 font-mono">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Sessão Encriptada TLS 1.3 / AES-256</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. TELA DE LOGIN PROFISSIONAL (Dual-Panel Split-Screen Enterprise)
  // =========================================================================
  return (
    <div className="min-h-screen w-full flex bg-[#F5F5F3] font-sans selection:bg-[#FF8000] selection:text-white">
      
      {/* 
        PAINEL ESQUERDO: BRANDING CORPORATIVO & HIGHLIGHTS DO SISTEMA 
        (Visível em telas grandes para demonstrar autoridade e elegância)
      */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#101010] text-white flex-col justify-between p-12 relative overflow-hidden border-r border-[#222222]">
        {/* Glow ambiente sutil */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF8000]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#FF8000]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header do Painel Esquerdo */}
        <div className="relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF8000] flex items-center justify-center font-heading font-black text-white text-xl shadow-lg shadow-[#FF8000]/30">
              L
            </div>
            <div>
              <span className="font-heading font-extrabold text-xl tracking-tight text-white block">
                LECASU <span className="text-[#FF8000] text-xs font-bold tracking-wider uppercase">ERP</span>
              </span>
              <span className="text-[11px] text-neutral-400 font-medium">
                Sistema Operacional Corporativo
              </span>
            </div>
          </div>
        </div>

        {/* Centro: Mensagem & Destaques de Alto Nível */}
        <div className="relative z-10 my-auto py-12 space-y-8">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#1F1F1F] text-[#FF8000] border border-[#2E2E2E] mb-4">
              <Sparkles size={13} />
              LECASU OS v2.0 Enterprise
            </span>
            <h2 className="text-3xl xl:text-4xl font-black font-heading tracking-tight text-white leading-tight">
              Gestão Integrada para Engenharia & Climatização.
            </h2>
            <p className="text-sm text-neutral-400 mt-3 leading-relaxed">
              Plataforma centralizada para orçamentos, faturação em Meticais (MZN), controle de obras, equipa técnica e conformidade fiscal.
            </p>
          </div>

          {/* Grid de Recursos do Sistema */}
          <div className="space-y-3.5">
            <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-[#181818] border border-[#262626]">
              <div className="p-2 rounded-lg bg-[#222222] text-[#FF8000] flex-shrink-0 mt-0.5">
                <Database size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-heading">PostgreSQL Neon Cloud</h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">Sincronização em tempo real com alta disponibilidade.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-[#181818] border border-[#262626]">
              <div className="p-2 rounded-lg bg-[#222222] text-[#FF8000] flex-shrink-0 mt-0.5">
                <Layers size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-heading">10 Módulos Integrados</h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">Financeiro, Obras, Propostas, RH, GED, Suprimentos e Equipa.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-[#181818] border border-[#262626]">
              <div className="p-2 rounded-lg bg-[#222222] text-[#FF8000] flex-shrink-0 mt-0.5">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-heading">Segurança e Auditoria</h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">Controle de acessos baseado em perfis (RBAC) e logs.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé do Painel Esquerdo */}
        <div className="relative z-10 pt-6 border-t border-[#222222] text-xs text-neutral-500 flex items-center justify-between">
          <span>LECASU, Lda • Moçambique</span>
          <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Serviços Operacionais
          </span>
        </div>
      </div>

      {/* 
        PAINEL DIREITO: FORMULÁRIO DE LOGIN LIMPO, CLARO E PROFISSIONAL
      */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-6 sm:p-12 md:p-16 bg-[#F5F5F3]">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#E2E2DE] shadow-xl p-8 sm:p-10 animate-in fade-in zoom-in-95 duration-200">
          
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
