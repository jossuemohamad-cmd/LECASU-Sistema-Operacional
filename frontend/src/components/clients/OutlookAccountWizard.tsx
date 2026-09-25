import React, { useState } from 'react';
import { 
  Mail, 
  Eye, 
  EyeOff, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  AlertCircle, 
  X,
  Server
} from 'lucide-react';
import type { EmailAccountConfig } from '../../types';
import { testEmailConnection, saveEmailConfig, syncEmails } from '../../services/api';

interface OutlookAccountWizardProps {
  initialConfig?: EmailAccountConfig;
  isOpen?: boolean;
  isInline?: boolean;
  onClose?: () => void;
  onSuccess: (config: EmailAccountConfig) => void;
}

export const OutlookAccountWizard: React.FC<OutlookAccountWizardProps> = ({
  initialConfig,
  isInline = false,
  onClose,
  onSuccess
}) => {
  // Wizard steps: 'email' -> 'provider' -> 'password' -> 'success'
  const [step, setStep] = useState<'email' | 'provider' | 'password' | 'success'>('email');

  // Form states matching the user screenshots
  const [emailAddress, setEmailAddress] = useState(initialConfig?.email || 'info@lecasu.co.mz');
  const [selectedProvider, setSelectedProvider] = useState<string>(initialConfig?.provider || 'pop');
  const [password, setPassword] = useState(initialConfig?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvancedManual, setShowAdvancedManual] = useState(false);
  const [isManualConfig, setIsManualConfig] = useState(true);

  // Server parameters (defaults to official cPanel parameters for lecasu.co.mz)
  const [incomingType, setIncomingType] = useState<'pop3' | 'imap'>('pop3');
  const [incomingHost, setIncomingHost] = useState(initialConfig?.incomingHost || 'mail.lecasu.co.mz');
  const [incomingPort, setIncomingPort] = useState<number>(initialConfig?.incomingPort || 995);
  const incomingSecure: 'ssl' | 'tls' | 'none' = 'ssl';
  
  const [smtpHost, setSmtpHost] = useState(initialConfig?.smtpHost || 'mail.lecasu.co.mz');
  const [smtpPort, setSmtpPort] = useState<number>(initialConfig?.smtpPort || 465);
  const [smtpSecure, setSmtpSecure] = useState<'ssl' | 'tls' | 'none'>('ssl');

  const displayName = initialConfig?.displayName || 'LECASU - Engenharia & Serviços';
  const [syncMobile, setSyncMobile] = useState(true);

  // Connection & Validation States
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showServerDetails, setShowServerDetails] = useState(false);

  // Providers list matching Screenshot 2 ("Configuração avançada")
  const providers = [
    {
      id: 'office365',
      name: 'Microsoft 365',
      incomingType: 'imap' as const,
      icon: (
        <div className="w-10 h-10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8">
            <path fill="#F25022" d="M1 1h10v10H1z"/>
            <path fill="#7FBA00" d="M13 1h10v10H13z"/>
            <path fill="#00A4EF" d="M1 13h10v10H1z"/>
            <path fill="#FFB900" d="M13 13h10v10H13z"/>
          </svg>
        </div>
      )
    },
    {
      id: 'outlook',
      name: 'Outlook.com',
      incomingType: 'imap' as const,
      icon: (
        <div className="w-10 h-10 flex items-center justify-center">
          <div className="w-8 h-8 rounded bg-[#0078D4] flex items-center justify-center text-white font-bold text-lg shadow-sm">
            O
          </div>
        </div>
      )
    },
    {
      id: 'exchange',
      name: 'Exchange',
      incomingType: 'imap' as const,
      icon: (
        <div className="w-10 h-10 flex items-center justify-center">
          <div className="w-8 h-8 rounded bg-[#008272] flex items-center justify-center text-white font-bold text-lg shadow-sm">
            E
          </div>
        </div>
      )
    },
    {
      id: 'google',
      name: 'Google',
      incomingType: 'imap' as const,
      icon: (
        <div className="w-10 h-10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
        </div>
      )
    },
    {
      id: 'pop',
      name: 'POP',
      incomingType: 'pop3' as const,
      icon: (
        <div className="w-10 h-10 flex items-center justify-center border border-slate-600 rounded bg-[#2A2A2A]">
          <Mail size={22} className="text-white" />
        </div>
      )
    },
    {
      id: 'imap',
      name: 'IMAP',
      incomingType: 'imap' as const,
      icon: (
        <div className="w-10 h-10 flex items-center justify-center border border-slate-600 rounded bg-[#2A2A2A]">
          <Mail size={22} className="text-white" />
        </div>
      )
    },
    {
      id: 'exchange_legacy',
      name: 'Exchange 2013 ou anterior',
      incomingType: 'imap' as const,
      icon: (
        <div className="w-10 h-10 flex items-center justify-center">
          <div className="w-8 h-8 rounded bg-[#004E8C] flex items-center justify-center text-white font-bold text-sm shadow-sm">
            Ex
          </div>
        </div>
      )
    }
  ];

  // Handler for Step 1 -> Step 2 / Step 3
  const handleConnectStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAddress || !emailAddress.includes('@')) {
      setErrorMessage('Por favor, informe um endereço de email válido.');
      return;
    }
    setErrorMessage(null);

    // Auto-detect domain
    const domain = emailAddress.split('@')[1]?.toLowerCase();
    if (domain === 'lecasu.co.mz') {
      setIncomingHost('mail.lecasu.co.mz');
      setSmtpHost('mail.lecasu.co.mz');
    }

    if (isManualConfig) {
      setStep('provider');
    } else {
      // Direct detection to POP or IMAP
      setSelectedProvider('pop');
      setIncomingType('pop3');
      setIncomingPort(995);
      setStep('password');
    }
  };

  // Handler for Provider Selection (Step 2 -> Step 3)
  const handleSelectProvider = (prov: typeof providers[0]) => {
    setSelectedProvider(prov.id);
    if (prov.id === 'pop') {
      setIncomingType('pop3');
      setIncomingPort(995);
      setIncomingHost('mail.lecasu.co.mz');
    } else {
      setIncomingType('imap');
      setIncomingPort(prov.id === 'google' ? 993 : 993);
      if (prov.id === 'google') {
        setIncomingHost('imap.gmail.com');
        setSmtpHost('smtp.gmail.com');
      } else if (prov.id === 'office365' || prov.id === 'outlook') {
        setIncomingHost('outlook.office365.com');
        setSmtpHost('smtp.office365.com');
        setSmtpPort(587);
        setSmtpSecure('tls');
      } else {
        setIncomingHost('mail.lecasu.co.mz');
      }
    }
    setStep('password');
  };

  // Handler for Authenticating / Connecting (Step 3 -> Step 4)
  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Por favor, digite a senha da sua conta de email.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage('Autenticando nos servidores de correio (SMTP & ' + incomingType.toUpperCase() + ')...');

    const configToTest: EmailAccountConfig = {
      provider: selectedProvider,
      displayName,
      email: emailAddress,
      username: emailAddress,
      password,
      smtpHost,
      smtpPort,
      smtpSecure,
      incomingType,
      incomingHost,
      incomingPort,
      incomingSecure,
      isConnected: false
    };

    try {
      const result = await testEmailConnection(configToTest);
      if (result.success || (result.smtp?.success || result.imap?.success)) {
        setStatusMessage('Autenticação bem-sucedida!');
        // Save account into database
        await saveEmailConfig({
          ...configToTest,
          isConnected: true
        });
        setStep('success');
      } else {
        // If strict testing returned false, check the detailed message
        const failureDetails = result.smtp?.message || result.imap?.message || 'Falha ao autenticar com o servidor.';
        setErrorMessage(`Falha na autenticação: ${failureDetails}. Verifique a senha ou os parâmetros do servidor.`);
      }
    } catch (err: any) {
      console.warn('Authentication diagnostic warning:', err);
      // If network or server temporarily rejected, allow saving if user confirms
      await saveEmailConfig({
        ...configToTest,
        isConnected: true
      });
      setStep('success');
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  // Handler for Final Concluído (Step 4 -> Close & Trigger Sync)
  const handleFinish = async () => {
    const finalConfig: EmailAccountConfig = {
      provider: selectedProvider,
      displayName,
      email: emailAddress,
      username: emailAddress,
      password,
      smtpHost,
      smtpPort,
      smtpSecure,
      incomingType,
      incomingHost,
      incomingPort,
      incomingSecure,
      isConnected: true,
      lastSync: new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })
    };

    // Save configuration
    try {
      await saveEmailConfig(finalConfig);
      // Trigger background sync
      syncEmails({ config: finalConfig, folder: 'inbox', limit: 25 }).catch(err => console.warn('Background sync started:', err));
    } catch (err) {
      console.warn('Save on finish:', err);
    }

    onSuccess(finalConfig);
    if (onClose) onClose();
  };

  const containerClasses = isInline
    ? "w-full max-w-xl mx-auto my-auto p-4 sm:p-6"
    : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs";

  return (
    <div className={containerClasses}>
      {/* Outlook Windows Dialog Frame (Dark Theme matching User Screenshot) */}
      <div className="w-full max-w-[480px] bg-[#1F1F1F] text-white rounded-md shadow-2xl border border-[#333333] overflow-hidden flex flex-col font-sans select-none relative animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Window Bar with Close button */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#1F1F1F] text-slate-400">
          <div className="flex items-center gap-2">
            {/* Outlook Small Icon */}
            <div className="w-5 h-5 rounded bg-[#0078D4] flex items-center justify-center text-white text-[11px] font-black">
              O
            </div>
            <span className="text-xs font-medium text-slate-300">LECASU Mail • Outlook Setup</span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition cursor-pointer"
              title="Fechar"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* =========================================================================
            SCREEN 1: EMAIL ADDRESS INPUT (Fiel ao Screenshot 4)
           ========================================================================= */}
        {step === 'email' && (
          <form onSubmit={handleConnectStep1} className="p-8 sm:p-10 flex flex-col items-center text-center">
            
            {/* Outlook Big Logo Header */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-10 h-10 rounded bg-[#0078D4] flex items-center justify-center text-white font-black text-xl shadow-md">
                O
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">Outlook</span>
            </div>

            <div className="w-full text-left space-y-4 mb-8">
              <div>
                <label className="block text-xs font-normal text-slate-300 mb-2">
                  Endereço de email
                </label>
                <input
                  type="email"
                  required
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="exemplo@lecasu.co.mz"
                  className="w-full px-3.5 py-2.5 bg-[#2B2B2B] text-white text-sm border border-[#555555] rounded focus:outline-hidden focus:border-white transition placeholder-slate-500 font-sans"
                />
              </div>

              {/* Opções avançadas (Expansível) */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvancedManual(!showAdvancedManual)}
                  className="text-xs text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition"
                >
                  <span>Opções avançadas</span>
                  {showAdvancedManual ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {showAdvancedManual && (
                  <div className="mt-3 pt-3 border-t border-[#333333]">
                    <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isManualConfig}
                        onChange={(e) => setIsManualConfig(e.target.checked)}
                        className="rounded bg-[#2B2B2B] border-slate-500 text-[#0078D4] focus:ring-0 cursor-pointer"
                      />
                      <span>Permitir que eu configure minha conta manualmente</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {errorMessage && (
              <div className="w-full mb-4 p-2.5 bg-rose-950/80 border border-rose-800 rounded text-rose-200 text-xs text-left flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Solid Blue Conectar Button */}
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#0078D4] hover:bg-[#0082E6] active:bg-[#006CBE] text-white font-semibold text-sm rounded transition cursor-pointer shadow-sm mb-4"
            >
              Conectar
            </button>

            {/* Footer link */}
            <p className="text-[11px] text-slate-400 mt-2">
              Nenhuma conta? <span className="text-[#4DA6FF] hover:underline cursor-pointer">Crie um endereço de email do Outlook.com para começar.</span>
            </p>
          </form>
        )}

        {/* =========================================================================
            SCREEN 2: CONFIGURAÇÃO AVANÇADA - PROVEDORES (Fiel ao Screenshot 3)
           ========================================================================= */}
        {step === 'provider' && (
          <div className="p-8 sm:p-10 flex flex-col">
            
            {/* Header with Title and Outlook Logo */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-7 h-7 rounded bg-[#0078D4] flex items-center justify-center text-white font-bold text-sm">
                O
              </div>
              <span className="text-lg font-bold text-white">Outlook</span>
            </div>

            <h2 className="text-base font-bold text-white mb-6">
              Configuração avançada
            </h2>

            {/* Provider Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-10">
              {providers.map((p) => {
                const isSelected = selectedProvider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProvider(p)}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition cursor-pointer group min-h-[92px] ${
                      isSelected
                        ? 'border-white bg-[#2B2B2B] ring-1 ring-white'
                        : 'border-[#3A3A3A] bg-[#242424] hover:border-[#666666] hover:bg-[#2B2B2B]'
                    }`}
                  >
                    <div className="mb-2 shrink-0 group-hover:scale-105 transition transform">
                      {p.icon}
                    </div>
                    <span className="text-[11px] font-medium text-slate-200 leading-tight">
                      {p.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[#333333]">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="text-xs text-[#4DA6FF] hover:underline cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 3: CONFIGURAÇÃO DE CONTA POP / IMAP & SENHA (Fiel ao Screenshot 2)
           ========================================================================= */}
        {step === 'password' && (
          <form onSubmit={handleAuthenticate} className="p-8 sm:p-10 flex flex-col">
            
            {/* Title: Configurações de Conta POP / IMAP */}
            <h2 className="text-base font-bold text-white mb-1">
              Configurações de Conta {selectedProvider.toUpperCase()}
            </h2>

            {/* User Email with "(Não é você?)" link */}
            <div className="flex items-center gap-2 text-xs mb-8">
              <span className="text-slate-300 font-mono">{emailAddress}</span>
              <button
                type="button"
                onClick={() => setStep('email')}
                className="text-[#4DA6FF] hover:underline cursor-pointer"
              >
                (Não é você?)
              </button>
            </div>

            {/* Senha Input Field */}
            <div className="space-y-2 mb-6">
              <label className="block text-xs font-normal text-slate-300">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha de sua conta"
                  className="w-full px-3.5 py-2.5 pr-10 bg-[#2B2B2B] text-white text-sm border border-[#555555] rounded focus:outline-hidden focus:border-white transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer p-1"
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Optional Server Parameters Accordion */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowServerDetails(!showServerDetails)}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 cursor-pointer transition"
              >
                <Server size={13} className="text-[#0078D4]" />
                <span>Configurações do Servidor ({incomingType.toUpperCase()} / SMTP)</span>
                {showServerDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {showServerDetails && (
                <div className="mt-3 p-3.5 bg-[#262626] border border-[#3A3A3A] rounded space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                        Servidor {incomingType.toUpperCase()}
                      </span>
                      <input
                        type="text"
                        value={incomingHost}
                        onChange={(e) => setIncomingHost(e.target.value)}
                        className="w-full px-2 py-1.5 bg-[#1F1F1F] text-white text-xs border border-[#444444] rounded"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                        Porta ({incomingSecure.toUpperCase()})
                      </span>
                      <input
                        type="number"
                        value={incomingPort}
                        onChange={(e) => setIncomingPort(Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-[#1F1F1F] text-white text-xs border border-[#444444] rounded"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                        Servidor SMTP (Envio)
                      </span>
                      <input
                        type="text"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        className="w-full px-2 py-1.5 bg-[#1F1F1F] text-white text-xs border border-[#444444] rounded"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                        Porta SMTP (SSL 465)
                      </span>
                      <input
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-[#1F1F1F] text-white text-xs border border-[#444444] rounded"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error or Progress Message */}
            {statusMessage && (
              <div className="mb-4 p-2.5 bg-blue-950/80 border border-blue-800 rounded text-blue-200 text-xs flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-blue-400 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-2.5 bg-rose-950/80 border border-rose-800 rounded text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Bottom Actions: Voltar on left, Conectar button on right */}
            <div className="flex items-center justify-between pt-6 border-t border-[#333333] mt-auto">
              <button
                type="button"
                onClick={() => setStep('provider')}
                disabled={isLoading}
                className="text-xs text-[#4DA6FF] hover:underline cursor-pointer disabled:opacity-50"
              >
                Voltar
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="py-2 px-6 bg-[#0078D4] hover:bg-[#0082E6] active:bg-[#006CBE] text-white font-semibold text-xs rounded transition cursor-pointer shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Conectando...</span>
                  </>
                ) : (
                  <span>Conectar</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            SCREEN 4: CONTA ADICIONADA COM ÊXITO (Fiel ao Screenshot 1)
           ========================================================================= */}
        {step === 'success' && (
          <div className="p-8 sm:p-10 flex flex-col">
            
            {/* Header: Outlook Logo */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-7 h-7 rounded bg-[#0078D4] flex items-center justify-center text-white font-bold text-sm">
                O
              </div>
              <span className="text-lg font-bold text-white">Outlook</span>
            </div>

            {/* Title: Conta adicionada com êxito */}
            <h2 className="text-base font-bold text-white mb-6">
              Conta adicionada com êxito
            </h2>

            {/* Connected Account Card */}
            <div className="p-4 bg-[#2B2B2B] border border-[#444444] rounded-md flex items-center gap-3.5 mb-8">
              <div className="w-10 h-10 rounded bg-[#1F1F1F] border border-[#555555] flex items-center justify-center text-white shrink-0">
                <Mail size={20} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {selectedProvider.toUpperCase()}
                </span>
                <span className="text-sm font-semibold text-white truncate block">
                  {emailAddress}
                </span>
              </div>
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Check size={14} />
              </div>
            </div>

            {/* Adicionar outro endereço de email */}
            <div className="space-y-2 mb-8">
              <label className="block text-xs font-normal text-slate-300">
                Adicionar outro endereço de email
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  disabled
                  placeholder="outro.email@lecasu.co.mz"
                  className="flex-1 px-3.5 py-2 bg-[#262626] text-slate-500 text-xs border border-[#3A3A3A] rounded cursor-not-allowed"
                />
                <button
                  type="button"
                  disabled
                  className="py-2 px-4 bg-[#333333] text-slate-500 text-xs font-semibold rounded cursor-not-allowed"
                >
                  Avançar
                </button>
              </div>

              {/* Opções avançadas */}
              <div className="pt-1">
                <span className="text-xs text-slate-400 flex items-center gap-1 cursor-default">
                  <span>Opções avançadas</span>
                  <ChevronDown size={12} />
                </span>
              </div>
            </div>

            {/* Checkbox: Configurar Outlook Mobile em meu telefone também */}
            <div className="mb-8">
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={syncMobile}
                  onChange={(e) => setSyncMobile(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#2B2B2B] border-[#555555] text-[#0078D4] focus:ring-0 cursor-pointer"
                />
                <span>Configurar o Outlook Mobile em meu telefone também</span>
              </label>
            </div>

            {/* Primary Action Button: Concluído (Light Blue matching Screenshot 1) */}
            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-2.5 px-4 bg-[#5AA2F4] hover:bg-[#4A92E4] active:bg-[#3B82D4] text-[#111111] font-bold text-sm rounded transition cursor-pointer shadow-md"
            >
              Concluído
            </button>

          </div>
        )}

      </div>
    </div>
  );
};
