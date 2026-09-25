import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Server, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Layers, 
  Eye, 
  EyeOff, 
  Save, 
  KeyRound
} from 'lucide-react';
import type { EmailAccountConfig } from '../../types';
import { testEmailConnection, saveEmailConfig } from '../../services/api';

interface EmailConfigViewProps {
  currentConfig: EmailAccountConfig;
  onConfigSaved: (config: EmailAccountConfig) => void;
  onClose?: () => void;
}

export const EmailConfigView: React.FC<EmailConfigViewProps> = ({
  currentConfig,
  onConfigSaved,
  onClose
}) => {
  const [config, setConfig] = useState<EmailAccountConfig>(currentConfig);
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setConfig(currentConfig);
  }, [currentConfig]);

  const applyLecasuOfficialConfig = (type: 'imap' | 'pop3' = 'imap') => {
    setConfig(prev => ({
      ...prev,
      provider: 'cpanel',
      displayName: prev.displayName || 'LECASU - Engenharia & Serviços',
      email: 'info@lecasu.co.mz',
      username: 'info@lecasu.co.mz',
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

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setSaveSuccessMessage(null);

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
          message: `Conexão bem-sucedida! Servidor SMTP (${config.smtpHost}:${config.smtpPort}) e ${config.incomingType.toUpperCase()} (${config.incomingHost}:${config.incomingPort}) autenticados e operacionais.`
        });
        setConfig(prev => ({
          ...prev,
          isConnected: true,
          lastSync: 'Agora mesmo'
        }));
      } else {
        const errorParts: string[] = [];
        if (!res.smtp.success) errorParts.push(`SMTP: ${res.smtp.message}`);
        if (!res.imap.success) errorParts.push(`${config.incomingType.toUpperCase()}: ${res.imap.message}`);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMessage(null);

    try {
      const saved = await saveEmailConfig(config);
      onConfigSaved(saved);
      setSaveSuccessMessage('Configuração de conta salva com sucesso na base de dados PostgreSQL!');
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erro ao salvar configuração no servidor.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white select-none overflow-y-auto p-5 md:p-8">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#FF8000] flex items-center justify-center font-bold text-lg shadow-2xs">
            <Mail size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">Configurações de Conta de Correio</h2>
            <p className="text-xs text-slate-500">Credenciais para envio (SMTP) e recebimento (IMAP/POP3) corporativo</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Voltar ao Correio
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="max-w-4xl space-y-6 text-xs">
        
        {/* Banner de Feedback */}
        {saveSuccessMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{saveSuccessMessage}</span>
          </div>
        )}

        {testResult && (
          <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in ${
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

        {/* Tabela de Parâmetros Oficiais de SSL/TLS (cPanel LECASU) */}
        <div className="border border-sky-300 rounded-xl overflow-hidden shadow-xs bg-white">
          <div className="bg-[#2B88D8] text-white px-4 py-2.5 font-bold flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} />
              <span>Configurações Seguras de SSL/TLS (Recomendado)</span>
            </div>
            <button
              type="button"
              onClick={() => applyLecasuOfficialConfig(config.incomingType)}
              className="px-3 py-1 rounded bg-white text-[#2B88D8] hover:bg-sky-50 text-[11px] font-semibold transition cursor-pointer shadow-xs"
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
              <span className="sm:col-span-2 italic text-slate-500">Usar a senha da conta do e-mail corporativo.</span>
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

        {/* Informações da Conta e Login */}
        <div className="p-5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-4">
          <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
            <KeyRound size={15} className="text-[#FF8000]" />
            <span>Dados de Acesso & Identidade Corporativa</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome de Exibição
              </label>
              <input
                type="text"
                required
                value={config.displayName}
                onChange={e => setConfig(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="LECASU - Engenharia & Serviços"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#FF8000] transition"
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
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-[#FF8000] transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-[#FF8000] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Palavra-passe da Conta de E-mail</span>
                <span className="text-slate-400 font-normal text-[10px]">Criptografado</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={config.password || ''}
                  onChange={e => setConfig(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Introduza a sua senha do cPanel"
                  className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-[#FF8000] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-700 p-1"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Servidores SMTP e IMAP/POP3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Servidor SMTP */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Server size={14} className="text-[#FF8000]" />
              <span>Servidor de Saída (SMTP)</span>
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Host SMTP</label>
              <input
                type="text"
                required
                value={config.smtpHost}
                onChange={e => setConfig(prev => ({ ...prev, smtpHost: e.target.value }))}
                placeholder="mail.lecasu.co.mz"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-[#FF8000]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Porta</label>
                <input
                  type="number"
                  required
                  value={config.smtpPort}
                  onChange={e => setConfig(prev => ({ ...prev, smtpPort: parseInt(e.target.value, 10) || 465 }))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-[#FF8000]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Segurança</label>
                <select
                  value={config.smtpSecure}
                  onChange={e => setConfig(prev => ({ ...prev, smtpSecure: e.target.value as any }))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-[#FF8000]"
                >
                  <option value="ssl">SSL / TLS (Recomendado)</option>
                  <option value="tls">STARTTLS</option>
                  <option value="none">Nenhuma</option>
                </select>
              </div>
            </div>
          </div>

          {/* Servidor IMAP / POP3 */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Layers size={14} className="text-[#FF8000]" />
              <span>Servidor de Entrada (IMAP / POP3)</span>
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Protocolo</label>
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
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:border-[#FF8000]"
              >
                <option value="imap">IMAP (Recomendado - Porta 993)</option>
                <option value="pop3">POP3 (Download - Porta 995)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Host de Entrada</label>
              <input
                type="text"
                required
                value={config.incomingHost}
                onChange={e => setConfig(prev => ({ ...prev, incomingHost: e.target.value }))}
                placeholder="mail.lecasu.co.mz"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-[#FF8000]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Porta</label>
                <input
                  type="number"
                  required
                  value={config.incomingPort}
                  onChange={e => setConfig(prev => ({ ...prev, incomingPort: parseInt(e.target.value, 10) || 993 }))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-[#FF8000]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Segurança</label>
                <select
                  value={config.incomingSecure}
                  onChange={e => setConfig(prev => ({ ...prev, incomingSecure: e.target.value as any }))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-[#FF8000]"
                >
                  <option value="ssl">SSL / TLS (Recomendado)</option>
                  <option value="tls">STARTTLS</option>
                  <option value="none">Nenhuma</option>
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold border border-slate-300 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isTesting ? (
              <Loader2 size={15} className="animate-spin text-[#FF8000]" />
            ) : (
              <RefreshCw size={15} className="text-slate-600" />
            )}
            <span>{isTesting ? 'Testando conexão...' : 'Testar Conexão Real'}</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-lg bg-[#FF8000] hover:bg-[#E67300] active:bg-[#CC6600] text-white font-bold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 size={15} className="animate-spin text-white" />
            ) : (
              <Save size={15} />
            )}
            <span>Salvar Configuração</span>
          </button>
        </div>

      </form>

    </div>
  );
};
