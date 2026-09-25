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

export interface EmailAccountConfig {
  provider: 'gmail' | 'office365' | 'cpanel' | 'custom';
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
  provider: 'cpanel',
  displayName: 'LECASU - Departamento Comercial',
  email: 'comercial@lecasu.co.mz',
  smtpHost: 'mail.lecasu.co.mz',
  smtpPort: 465,
  smtpSecure: 'ssl',
  incomingType: 'imap',
  incomingHost: 'mail.lecasu.co.mz',
  incomingPort: 993,
  incomingSecure: 'ssl',
  username: 'comercial@lecasu.co.mz',
  password: '••••••••••••',
  isConnected: true,
  lastSync: 'Hoje às 08:30'
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
      setConfig(prev => ({
        ...prev,
        provider: 'cpanel',
        smtpHost: 'mail.lecasu.co.mz',
        smtpPort: 465,
        smtpSecure: 'ssl',
        incomingType: 'imap',
        incomingHost: 'mail.lecasu.co.mz',
        incomingPort: 993,
        incomingSecure: 'ssl',
      }));
    } else {
      setConfig(prev => ({ ...prev, provider: 'custom' }));
    }
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    // Simulate real connection test to SMTP and IMAP
    await new Promise(res => setTimeout(res, 1800));

    if (!config.email || !config.smtpHost || !config.incomingHost) {
      setTestResult({
        success: false,
        message: 'Por favor preencha todos os campos obrigatórios (E-mail, SMTP e IMAP).'
      });
      setIsTesting(false);
      return;
    }

    setTestResult({
      success: true,
      message: `Conexão bem-sucedida! Servidor SMTP (${config.smtpHost}:${config.smtpPort}) e IMAP (${config.incomingHost}:${config.incomingPort}) autenticados com sucesso.`
    });
    setConfig(prev => ({
      ...prev,
      isConnected: true,
      lastSync: 'Agora mesmo'
    }));
    setIsTesting(false);
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
      <div className="bg-[#242424] text-slate-100 rounded-xl border border-[#3C3C3C] shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Window Bar (Outlook Style) */}
        <div className="bg-[#1F1F1F] px-4 py-3 border-b border-[#3C3C3C] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-[#0078D4] text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <Mail size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Configurações de Conta de Correio</h2>
              <p className="text-[11px] text-neutral-400">Microsoft Outlook / Protocolos de Envio & Recebimento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-md hover:bg-neutral-800 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#3C3C3C] bg-[#1B1B1B] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('provider')}
            className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'provider'
                ? 'border-[#0078D4] text-white bg-[#242424]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Globe size={14} />
            <span>Provedor & Conta</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('outgoing')}
            className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'outgoing'
                ? 'border-[#0078D4] text-white bg-[#242424]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Server size={14} />
            <span>Envio (SMTP)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('incoming')}
            className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'incoming'
                ? 'border-[#0078D4] text-white bg-[#242424]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers size={14} />
            <span>Recebimento (IMAP / POP3)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          
          {/* TAB 1: PROVIDER & ACCOUNT */}
          {activeTab === 'provider' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                  Selecione o Serviço de E-mail
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  
                  {/* Google Workspace */}
                  <div
                    onClick={() => handleProviderSelect('gmail')}
                    className={`p-3 rounded-lg border cursor-pointer transition flex flex-col items-center justify-center text-center gap-1.5 ${
                      config.provider === 'gmail'
                        ? 'border-[#0078D4] bg-[#0078D4]/15 text-white'
                        : 'border-[#3C3C3C] bg-[#2A2A2A] text-neutral-300 hover:border-neutral-500'
                    }`}
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                      <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.3-.7-.5-1.5-.5-2.3z"/>
                      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 17.4C3.7 21.1 7.5 24 12 24z"/>
                    </svg>
                    <span className="font-semibold text-[11px]">Google Workspace</span>
                  </div>

                  {/* Microsoft 365 */}
                  <div
                    onClick={() => handleProviderSelect('office365')}
                    className={`p-3 rounded-lg border cursor-pointer transition flex flex-col items-center justify-center text-center gap-1.5 ${
                      config.provider === 'office365'
                        ? 'border-[#0078D4] bg-[#0078D4]/15 text-white'
                        : 'border-[#3C3C3C] bg-[#2A2A2A] text-neutral-300 hover:border-neutral-500'
                    }`}
                  >
                    <div className="w-6 h-6 rounded bg-[#0078D4] text-white flex items-center justify-center font-bold text-xs">
                      O
                    </div>
                    <span className="font-semibold text-[11px]">Microsoft 365</span>
                  </div>

                  {/* cPanel / Webmail Corporativo */}
                  <div
                    onClick={() => handleProviderSelect('cpanel')}
                    className={`p-3 rounded-lg border cursor-pointer transition flex flex-col items-center justify-center text-center gap-1.5 ${
                      config.provider === 'cpanel'
                        ? 'border-[#0078D4] bg-[#0078D4]/15 text-white'
                        : 'border-[#3C3C3C] bg-[#2A2A2A] text-neutral-300 hover:border-neutral-500'
                    }`}
                  >
                    <Globe size={24} className="text-orange-500" />
                    <span className="font-semibold text-[11px]">cPanel LECASU</span>
                  </div>

                  {/* Personalizado */}
                  <div
                    onClick={() => handleProviderSelect('custom')}
                    className={`p-3 rounded-lg border cursor-pointer transition flex flex-col items-center justify-center text-center gap-1.5 ${
                      config.provider === 'custom'
                        ? 'border-[#0078D4] bg-[#0078D4]/15 text-white'
                        : 'border-[#3C3C3C] bg-[#2A2A2A] text-neutral-300 hover:border-neutral-500'
                    }`}
                  >
                    <Server size={24} className="text-sky-400" />
                    <span className="font-semibold text-[11px]">Personalizado</span>
                  </div>
                </div>
              </div>

              {/* Informações da Conta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                    Nome de Exibição
                  </label>
                  <input
                    type="text"
                    required
                    value={config.displayName}
                    onChange={e => setConfig(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="ex: LECASU Engenharia"
                    className="w-full px-3 py-2 bg-[#1B1B1B] border border-[#3C3C3C] rounded text-white focus:outline-none focus:border-[#0078D4]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                    Endereço de E-mail
                  </label>
                  <input
                    type="email"
                    required
                    value={config.email}
                    onChange={e => setConfig(prev => ({ ...prev, email: e.target.value, username: e.target.value }))}
                    placeholder="comercial@lecasu.co.mz"
                    className="w-full px-3 py-2 bg-[#1B1B1B] border border-[#3C3C3C] rounded text-white focus:outline-none focus:border-[#0078D4]"
                  />
                </div>
              </div>

              {/* Credenciais de Autenticação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                    Nome de Utilizador / Login
                  </label>
                  <input
                    type="text"
                    required
                    value={config.username}
                    onChange={e => setConfig(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#1B1B1B] border border-[#3C3C3C] rounded text-white font-mono focus:outline-none focus:border-[#0078D4]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1 flex items-center justify-between">
                    <span>Palavra-passe / Token de App</span>
                    <span className="text-neutral-500 font-normal text-[10px]">Criptografado</span>
                  </label>
                  <input
                    type="password"
                    value={config.password || ''}
                    onChange={e => setConfig(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Palavra-passe do e-mail"
                    className="w-full px-3 py-2 bg-[#1B1B1B] border border-[#3C3C3C] rounded text-white font-mono focus:outline-none focus:border-[#0078D4]"
                  />
                </div>
              </div>

              {config.provider === 'gmail' && (
                <div className="p-3 bg-blue-950/40 border border-blue-800/50 rounded-lg flex items-start gap-2.5 text-[11px] text-blue-200">
                  <HelpCircle size={15} className="text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Dica para Google Workspace / Gmail:</strong> Use uma <em>Senha de Aplicativo (App Password)</em> de 16 dígitos gerada em sua Conta Google para autenticação instantânea com SMTP e IMAP.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OUTGOING (SMTP) */}
          {activeTab === 'outgoing' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#1B1B1B] border border-[#3C3C3C] rounded-lg">
                <h4 className="font-semibold text-white mb-1 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>Servidor de Envio de Mensagens (SMTP)</span>
                </h4>
                <p className="text-[11px] text-neutral-400">
                  Responsável pelo envio de propostas comerciais e respostas diretamente do ERP.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                    Servidor SMTP
                  </label>
                  <input
                    type="text"
                    required
                    value={config.smtpHost}
                    onChange={e => setConfig(prev => ({ ...prev, smtpHost: e.target.value }))}
                    placeholder="mail.lecasu.co.mz"
                    className="w-full px-3 py-2 bg-[#1B1B1B] border border-[#3C3C3C] rounded text-white font-mono focus:outline-none focus:border-[#0078D4]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                    Porta SMTP
                  </label>
                  <input
                    type="number"
                    required
                    value={config.smtpPort}
                    onChange={e => setConfig(prev => ({ ...prev, smtpPort: parseInt(e.target.value, 10) || 587 }))}
                    placeholder="465 ou 587"
                    className="w-full px-3 py-2 bg-[#1B1B1B] border border-[#3C3C3C] rounded text-white font-mono focus:outline-none focus:border-[#0078D4]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                  Tipo de Criptografia / Segurança
                </label>
                <div className="flex gap-4">
                  {(['ssl', 'tls', 'none'] as const).map(sec => (
                    <label key={sec} className="flex items-center gap-2 cursor-pointer text-neutral-300 hover:text-white">
                      <input
                        type="radio"
                        name="smtpSecure"
                        checked={config.smtpSecure === sec}
                        onChange={() => setConfig(prev => ({ ...prev, smtpSecure: sec }))}
                        className="text-[#0078D4]"
                      />
                      <span className="uppercase font-mono text-[11px]">{sec === 'none' ? 'Nenhuma' : sec.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INCOMING (IMAP / POP3) */}
          {activeTab === 'incoming' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#1B1B1B] border border-[#3C3C3C] rounded-lg">
                <h4 className="font-semibold text-white mb-1 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>Servidor de Recebimento de Mensagens (IMAP / POP3)</span>
                </h4>
                <p className="text-[11px] text-neutral-400">
                  Sincroniza a Caixa de Entrada, respostas de clientes e propostas recebidas.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
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
                    className="w-full px-3 py-2 bg-[#1B1B1B] border border-[#3C3C3C] rounded text-white focus:outline-none focus:border-[#0078D4]"
                  >
                    <option value="imap">IMAP (Recomendado - Sincronização em tempo real)</option>
                    <option value="pop3">POP3 (Download de mensagens)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                    Porta de Recebimento
                  </label>
                  <input
                    type="number"
                    required
                    value={config.incomingPort}
                    onChange={e => setConfig(prev => ({ ...prev, incomingPort: parseInt(e.target.value, 10) || 993 }))}
                    placeholder="993"
                    className="w-full px-3 py-2 bg-[#1B1B1B] border border-[#3C3C3C] rounded text-white font-mono focus:outline-none focus:border-[#0078D4]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                  Servidor {config.incomingType.toUpperCase()}
                </label>
                <input
                  type="text"
                  required
                  value={config.incomingHost}
                  onChange={e => setConfig(prev => ({ ...prev, incomingHost: e.target.value }))}
                  placeholder="mail.lecasu.co.mz"
                  className="w-full px-3 py-2 bg-[#1B1B1B] border border-[#3C3C3C] rounded text-white font-mono focus:outline-none focus:border-[#0078D4]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                  Criptografia de Recebimento
                </label>
                <div className="flex gap-4">
                  {(['ssl', 'tls', 'none'] as const).map(sec => (
                    <label key={sec} className="flex items-center gap-2 cursor-pointer text-neutral-300 hover:text-white">
                      <input
                        type="radio"
                        name="incomingSecure"
                        checked={config.incomingSecure === sec}
                        onChange={() => setConfig(prev => ({ ...prev, incomingSecure: sec }))}
                        className="text-[#0078D4]"
                      />
                      <span className="uppercase font-mono text-[11px]">{sec === 'none' ? 'Nenhuma' : sec.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Test Connection Results Banner */}
          {testResult && (
            <div className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs ${
              testResult.success 
                ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200' 
                : 'bg-rose-950/40 border-rose-600/50 text-rose-200'
            }`}>
              {testResult.success ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <strong>{testResult.success ? 'Conexão Estabelecida:' : 'Erro na Verificação:'}</strong>
                <p className="mt-0.5">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-[#3C3C3C] flex items-center justify-between">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-3 py-1.5 rounded bg-[#333333] hover:bg-[#3D3D3D] text-white font-medium border border-[#4C4C4C] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isTesting ? (
                <Loader2 size={14} className="animate-spin text-[#0078D4]" />
              ) : (
                <RefreshCw size={14} className="text-neutral-400" />
              )}
              <span>{isTesting ? 'A testar portas...' : 'Testar Conexão'}</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded bg-transparent hover:bg-neutral-800 text-neutral-300 font-medium transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-[#0078D4] hover:bg-[#106EBE] text-white font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>Salvar Configuração</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
