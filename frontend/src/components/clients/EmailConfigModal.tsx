import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Server, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Globe, 
  Layers,
  HelpCircle
} from 'lucide-react';
import { testEmailConnection } from '../../services/api';


export interface EmailAccountConfig {
  provider: string;
  displayName: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: 'ssl' | 'tls' | 'none';
  incomingType: 'imap' | 'pop3';
  incomingHost: string;
  incomingPort: number;
  incomingSecure: 'ssl' | 'tls' | 'none';
  username: string;
  password?: string;
  isConnected: boolean;
  lastSync?: string;
}

export const DEFAULT_EMAIL_CONFIG: EmailAccountConfig = {
  provider: 'outlook',
  displayName: '',
  email: '',
  smtpHost: '',
  smtpPort: 465,
  smtpSecure: 'ssl',
  incomingType: 'imap',
  incomingHost: '',
  incomingPort: 993,
  incomingSecure: 'ssl',
  username: '',
  password: '',
  isConnected: false,
  lastSync: undefined
};


interface EmailConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: EmailAccountConfig) => void;
  initialConfig?: EmailAccountConfig;
}

export const EmailConfigModal: React.FC<EmailConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig
}) => {
  const [config, setConfig] = useState<EmailAccountConfig>(() => {
    return initialConfig || DEFAULT_EMAIL_CONFIG;
  });

  const [activeTab, setActiveTab] = useState<'provider' | 'outgoing' | 'incoming'>('provider');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  if (!isOpen) return null;

  const applyLecasuOfficialConfig = (type: 'imap' | 'pop3' = 'imap') => {
    setConfig(prev => ({
      ...prev,
      provider: 'cpanel',
      displayName: prev.displayName || 'LECASU - Engenharia & Serviços',
      email: prev.email || 'info@lecasu.co.mz',
      username: prev.username || 'info@lecasu.co.mz',
      smtpHost: 'mail.lecasu.co.mz',
      smtpPort: 465,
      smtpSecure: 'ssl',
      incomingType: type,
      incomingHost: 'mail.lecasu.co.mz',
      incomingPort: type === 'imap' ? 993 : 995,
      incomingSecure: 'ssl',
    }));
    setTestResult(null);
  };

  const handleProviderSelect = (provider: EmailAccountConfig['provider']) => {
    if (provider === 'gmail') {
      setConfig(prev => ({
        ...prev,
        provider: 'gmail',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpSecure: 'tls',
        incomingType: 'imap',
        incomingHost: 'imap.gmail.com',
        incomingPort: 993,
        incomingSecure: 'ssl',
      }));
    } else if (provider === 'office365') {
      setConfig(prev => ({
        ...prev,
        provider: 'office365',
        smtpHost: 'smtp.office365.com',
        smtpPort: 587,
        smtpSecure: 'tls',
        incomingType: 'imap',
        incomingHost: 'outlook.office365.com',
        incomingPort: 993,
        incomingSecure: 'ssl',
      }));
    } else if (provider === 'cpanel') {
      applyLecasuOfficialConfig(config.incomingType);
    } else {
      setConfig(prev => ({ ...prev, provider: 'custom' }));
    }
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    if (!config.email || !config.smtpHost || !config.incomingHost) {
      setTestResult({
        success: false,
        message: 'Por favor preencha todos os campos obrigatórios (E-mail, Host SMTP e Host IMAP).'
      });
      setIsTesting(false);
      return;
    }

    try {
      const res = await testEmailConnection(config);
      if (res.success) {
        setTestResult({
          success: true,
          message: `Conexão bem-sucedida! Servidor SMTP (${config.smtpHost}:${config.smtpPort}) e IMAP (${config.incomingHost}:${config.incomingPort}) autenticados e operacionais.`
        });
        setConfig(prev => ({
          ...prev,
          isConnected: true,
          lastSync: 'Agora mesmo'
        }));
      } else {
        const errorParts: string[] = [];
        if (!res.smtp.success) errorParts.push(`SMTP: ${res.smtp.message}`);
        if (!res.imap.success) errorParts.push(`IMAP: ${res.imap.message}`);
        setTestResult({
          success: false,
          message: errorParts.join(' | ') || 'Falha ao conectar com os servidores de correio.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erro ao conectar ao serviço de verificação do backend.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...config,
      isConnected: true,
      lastSync: 'Sincronizado agora'
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="modal-overlay-erp animate-in fade-in select-none">
      <div className="bg-white text-slate-800 rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Window Bar - Clean White & Professional */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#0078D4]/10 text-[#0078D4] flex items-center justify-center font-bold text-base shadow-xs">
              <Mail size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Configurações de Conta de Correio</h2>
              <p className="text-xs text-slate-500">Servidores SMTP (Envio), IMAP / POP3 e Contas Google</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('provider')}
            className={`px-4 py-3 border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'provider'
                ? 'border-[#0078D4] text-[#0078D4]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe size={15} />
            <span>Provedor & Conta</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('outgoing')}
            className={`px-4 py-3 border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'outgoing'
                ? 'border-[#0078D4] text-[#0078D4]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server size={15} />
            <span>Envio (SMTP)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('incoming')}
            className={`px-4 py-3 border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'incoming'
                ? 'border-[#0078D4] text-[#0078D4]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers size={15} />
            <span>Recebimento (IMAP / POP3)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
          
          {/* TAB 1: PROVIDER & ACCOUNT */}
          {activeTab === 'provider' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Selecione o Serviço de E-mail
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  
                  {/* Google Workspace */}
                  <div
                    onClick={() => handleProviderSelect('gmail')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col items-center justify-center text-center gap-2 ${
                      config.provider === 'gmail'
                        ? 'border-[#0078D4] bg-[#0078D4]/5 text-[#0078D4] font-bold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                      <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.3-.7-.5-1.5-.5-2.3z"/>
                      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 17.4C3.7 21.1 7.5 24 12 24z"/>
                    </svg>
                    <span className="text-xs">Google Workspace</span>
                  </div>

                  {/* Microsoft 365 */}
                  <div
                    onClick={() => handleProviderSelect('office365')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col items-center justify-center text-center gap-2 ${
                      config.provider === 'office365'
                        ? 'border-[#0078D4] bg-[#0078D4]/5 text-[#0078D4] font-bold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-6 h-6 rounded bg-[#0078D4] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                      O
                    </div>
                    <span className="text-xs">Microsoft 365</span>
                  </div>

                  {/* cPanel / Webmail Corporativo */}
                  <div
                    onClick={() => handleProviderSelect('cpanel')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col items-center justify-center text-center gap-2 ${
                      config.provider === 'cpanel'
                        ? 'border-[#FF8000] bg-[#FFF2E5] text-[#FF8000] font-bold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Globe size={24} className="text-[#FF8000]" />
                    <span className="text-xs">cPanel LECASU</span>
                  </div>

                  {/* Personalizado */}
                  <div
                    onClick={() => handleProviderSelect('custom')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col items-center justify-center text-center gap-2 ${
                      config.provider === 'custom'
                        ? 'border-[#0078D4] bg-[#0078D4]/5 text-[#0078D4] font-bold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Server size={24} className="text-sky-600" />
                    <span className="text-xs">Personalizado</span>
                  </div>
                </div>
              </div>

              {/* Informações da Conta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome de Exibição
                  </label>
                  <input
                    type="text"
                    required
                    value={config.displayName}
                    onChange={e => setConfig(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="ex: LECASU Engenharia & Serviços"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0078D4] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Endereço de E-mail
                  </label>
                  <input
                    type="email"
                    required
                    value={config.email}
                    onChange={e => setConfig(prev => ({ ...prev, email: e.target.value, username: e.target.value }))}
                    placeholder="info@lecasu.co.mz"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0078D4] focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Credenciais de Autenticação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome de Utilizador / Login
                  </label>
                  <input
                    type="text"
                    required
                    value={config.username}
                    onChange={e => setConfig(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="info@lecasu.co.mz"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#0078D4] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Palavra-passe da Conta</span>
                    <span className="text-slate-400 font-normal text-[10px]">Criptografado</span>
                  </label>
                  <input
                    type="password"
                    value={config.password || ''}
                    onChange={e => setConfig(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Usar a senha da conta de e-mail"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#0078D4] focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Tabela de Parâmetros Oficiais de SSL/TLS (cPanel LECASU) */}
              <div className="border border-sky-300 rounded-xl overflow-hidden shadow-xs bg-white mt-2">
                <div className="bg-[#2B88D8] text-white px-4 py-2 font-bold flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} />
                    <span>Configurações Seguras de SSL/TLS (Recomendado)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyLecasuOfficialConfig(config.incomingType)}
                    className="px-2.5 py-0.5 rounded bg-white text-[#2B88D8] hover:bg-sky-50 text-[11px] font-semibold transition cursor-pointer shadow-xs"
                  >
                    Aplicar no Formulário
                  </button>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 items-center">
                    <span className="font-semibold text-slate-700">Nome do usuário:</span>
                    <span className="sm:col-span-2 font-mono font-medium text-slate-900">info@lecasu.co.mz</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 items-center">
                    <span className="font-semibold text-slate-700">Senha:</span>
                    <span className="sm:col-span-2 italic text-slate-500">Usar a senha da conta do e-mail.</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 items-center">
                    <span className="font-semibold text-slate-700">Servidor de entrada:</span>
                    <div className="sm:col-span-2 flex flex-wrap items-center gap-2.5">
                      <span className="font-mono font-medium text-slate-900">mail.lecasu.co.mz</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-mono border border-blue-200">
                        IMAP Port: 993
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono border border-slate-200">
                        POP3 Port: 995
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 items-center">
                    <span className="font-semibold text-slate-700">Servidor de saída:</span>
                    <div className="sm:col-span-2 flex items-center gap-2.5">
                      <span className="font-mono font-medium text-slate-900">mail.lecasu.co.mz</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-mono border border-emerald-200">
                        SMTP Port: 465
                      </span>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-slate-50 text-[11px] text-slate-500 font-medium">
                    IMAP, POP3 e SMTP require authentication.
                  </div>
                </div>
              </div>

              {config.provider === 'gmail' && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
                  <HelpCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-blue-950 font-bold">Dica para Google Workspace / Gmail:</strong> Use uma <em>Senha de Aplicativo (App Password)</em> de 16 dígitos gerada em sua Conta Google para autenticação instantânea com SMTP e IMAP.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OUTGOING (SMTP) */}
          {activeTab === 'outgoing' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span>Servidor de Envio de Mensagens (SMTP)</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Responsável pelo envio de propostas comerciais e respostas diretamente do ERP.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Servidor SMTP
                  </label>
                  <input
                    type="text"
                    required
                    value={config.smtpHost}
                    onChange={e => setConfig(prev => ({ ...prev, smtpHost: e.target.value }))}
                    placeholder="mail.lecasu.co.mz"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#0078D4] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Porta SMTP
                  </label>
                  <input
                    type="number"
                    required
                    value={config.smtpPort}
                    onChange={e => setConfig(prev => ({ ...prev, smtpPort: parseInt(e.target.value, 10) || 587 }))}
                    placeholder="465 ou 587"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#0078D4] focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tipo de Criptografia / Segurança
                </label>
                <div className="flex gap-4">
                  {(['ssl', 'tls', 'none'] as const).map(sec => (
                    <label key={sec} className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 font-medium">
                      <input
                        type="radio"
                        name="smtpSecure"
                        checked={config.smtpSecure === sec}
                        onChange={() => setConfig(prev => ({ ...prev, smtpSecure: sec }))}
                        className="text-[#0078D4]"
                      />
                      <span className="uppercase font-mono text-xs">{sec === 'none' ? 'Nenhuma' : sec.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INCOMING (IMAP / POP3) */}
          {activeTab === 'incoming' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span>Servidor de Recebimento de Mensagens (IMAP / POP3)</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Sincroniza a Caixa de Entrada, respostas de clientes e propostas recebidas.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Protocolo de Recebimento
                  </label>
                  <select
                    value={config.incomingType}
                    onChange={e => {
                      const type = e.target.value as 'imap' | 'pop3';
                      setConfig(prev => ({
                        ...prev,
                        incomingType: type,
                        incomingPort: type === 'imap' ? 993 : 995
                      }));
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0078D4] focus:bg-white transition"
                  >
                    <option value="imap">IMAP (Recomendado - Tempo Real)</option>
                    <option value="pop3">POP3 (Download)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Porta de Recebimento
                  </label>
                  <input
                    type="number"
                    required
                    value={config.incomingPort}
                    onChange={e => setConfig(prev => ({ ...prev, incomingPort: parseInt(e.target.value, 10) || 993 }))}
                    placeholder="993"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#0078D4] focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Servidor {config.incomingType.toUpperCase()}
                </label>
                <input
                  type="text"
                  required
                  value={config.incomingHost}
                  onChange={e => setConfig(prev => ({ ...prev, incomingHost: e.target.value }))}
                  placeholder="mail.lecasu.co.mz"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#0078D4] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Criptografia de Recebimento
                </label>
                <div className="flex gap-4">
                  {(['ssl', 'tls', 'none'] as const).map(sec => (
                    <label key={sec} className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 font-medium">
                      <input
                        type="radio"
                        name="incomingSecure"
                        checked={config.incomingSecure === sec}
                        onChange={() => setConfig(prev => ({ ...prev, incomingSecure: sec }))}
                        className="text-[#0078D4]"
                      />
                      <span className="uppercase font-mono text-xs">{sec === 'none' ? 'Nenhuma' : sec.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Test Connection Results Banner */}
          {testResult && (
            <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
              testResult.success 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              {testResult.success ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <strong className="font-bold">{testResult.success ? 'Conexão Estabelecida:' : 'Erro na Verificação:'}</strong>
                <p className="mt-0.5">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold border border-slate-300 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isTesting ? (
                <Loader2 size={14} className="animate-spin text-[#0078D4]" />
              ) : (
                <RefreshCw size={14} className="text-slate-600" />
              )}
              <span>{isTesting ? 'A testar portas...' : 'Testar Conexão'}</span>
            </button>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#0078D4] hover:bg-[#106EBE] text-white font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={15} />
                <span>Salvar Configuração</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
