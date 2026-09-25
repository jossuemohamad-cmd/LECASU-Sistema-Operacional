import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  FileText, 
  Trash2, 
  Loader2, 
  Sparkles, 
  AlertCircle
} from 'lucide-react';
import type { Client, Proposal } from '../../types';
import { formatMZN } from '../../utils/formatters';

export interface EmailMessage {
  id: string;
  clientId?: number;
  clientName?: string;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  body: string;
  date: string;
  isRead: boolean;
  hasAttachment: boolean;
  attachedProposalId?: number;
  attachedProposalTitle?: string;
  attachedProposalAmount?: number;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash';
}

interface EmailComposeModalProps {
  isOpen: boolean;
  clients: Client[];
  initialClient?: Client | null;
  initialProposal?: Proposal | null;
  senderEmail: string;
  onClose: () => void;
  onSend: (message: EmailMessage) => Promise<void>;
}

export const EmailComposeModal: React.FC<EmailComposeModalProps> = ({
  isOpen,
  clients,
  initialClient,
  initialProposal,
  senderEmail,
  onClose,
  onSend
}) => {
  const [selectedClientId, setSelectedClientId] = useState<number | ''>(initialClient?.id || '');
  const [recipientEmail, setRecipientEmail] = useState(initialClient?.email || '');
  const [ccEmail, setCcEmail] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachedProposal, setAttachedProposal] = useState<Proposal | null>(initialProposal || null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync when initialClient or initialProposal changes
  useEffect(() => {
    if (initialClient) {
      setSelectedClientId(initialClient.id);
      setRecipientEmail(initialClient.email || '');
    }
    if (initialProposal) {
      setAttachedProposal(initialProposal);
      setSubject(`Proposta Comercial #${initialProposal.id} - ${initialProposal.title} | LECASU`);
      setBody(
`Prezados,

Segue em anexo a Proposta Comercial referente ao projeto "${initialProposal.title}".

Valor Total Proposto: ${formatMZN(Number(initialProposal.total_amount) || 0)}
Escopo: ${initialProposal.scope || 'Conforme alinhamento técnico.'}

Ficamos à inteira disposição para qualquer esclarecimento técnico ou ajuste necessário.

Atenciosamente,
LECASU Engenharia & Serviços
Maputo, Moçambique
Email: ${senderEmail}
Web: www.lecasu.co.mz`
      );
    }
  }, [initialClient, initialProposal, senderEmail]);

  if (!isOpen) return null;

  // Handle client selection dropdown
  const handleClientChange = (clientId: number) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setRecipientEmail(client.email || '');
      // If client has proposals, auto-suggest first proposal
      if (client.proposals && client.proposals.length > 0 && !attachedProposal) {
        setAttachedProposal(client.proposals[0]);
      }
    }
  };

  // Handle email template selection
  const handleTemplateChange = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    const targetClient = clients.find(c => c.id === Number(selectedClientId));
    const clientName = targetClient ? targetClient.name : 'Cliente';

    if (templateKey === 'proposal') {
      setSubject(`Proposta Comercial de Engenharia & Serviços | ${clientName} - LECASU`);
      setBody(
`Exmo.(s) Senhor(es) da ${clientName},

Temos a honra de apresentar a nossa proposta técnica e comercial para a execução dos serviços de engenharia solicitados.

Reiteramos o nosso compromisso com a excelência técnica, prazos rigorosos e conformidade com as normas vigentes em Moçambique.

Por favor, encontrem a minuta e o orçamento detalhado em anexo.

Com os melhores cumprimentos,
Departamento Comercial | LECASU
Maputo - Moçambique`
      );
    } else if (templateKey === 'followup') {
      setSubject(`Acompanhamento de Proposta Comercial | LECASU - ${clientName}`);
      setBody(
`Olá ${targetClient?.contact_person || clientName},

Esperamos que este e-mail o(a) encontre bem.

Gostaríamos de acompanhar o status da proposta comercial enviada recentemente e verificar se houve alguma dúvida técnica ou se necessitam de ajustes para a formalização do contrato.

Estamos disponíveis para agendar uma reunião presencial ou virtual a vosso critério.

Atenciosamente,
Equipa Comercial LECASU`
      );
    } else if (templateKey === 'welcome') {
      setSubject(`Bem-vindo à LECASU Engenharia | Abertura de Conta de Cliente`);
      setBody(
`Prezado(a) ${targetClient?.contact_person || clientName},

É com enorme satisfação que confirmamos o vosso registo na carteira de parceiros e clientes da LECASU.

A partir de agora, a vossa empresa conta com suporte direto de nossa equipa técnica especializada para todos os projetos de construção, manutenção e gestão de ativos.

Não hesite em contactar-nos para novas cotações e soluções.

Cordialmente,
Diretoria Executiva LECASU`
      );
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!recipientEmail || !recipientEmail.includes('@')) {
      setErrorMessage('Por favor informe um endereço de e-mail de destinatário válido.');
      return;
    }

    if (!subject.trim()) {
      setErrorMessage('Por favor informe o assunto do e-mail.');
      return;
    }

    try {
      setIsSending(true);

      const targetClient = clients.find(c => c.id === Number(selectedClientId));

      const newMsg: EmailMessage = {
        id: `msg_${Date.now()}`,
        clientId: targetClient?.id,
        clientName: targetClient?.name || 'Cliente Direto',
        from: senderEmail,
        to: recipientEmail.trim(),
        cc: ccEmail.trim() || undefined,
        subject: subject.trim(),
        body: body.trim(),
        date: new Date().toISOString(),
        isRead: true,
        hasAttachment: !!attachedProposal,
        attachedProposalId: attachedProposal?.id,
        attachedProposalTitle: attachedProposal?.title,
        attachedProposalAmount: attachedProposal ? Number(attachedProposal.total_amount) : undefined,
        folder: 'sent'
      };

      await onSend(newMsg);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao enviar e-mail via servidor SMTP.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="modal-overlay-erp animate-in fade-in select-none">
      <div className="bg-[#242424] text-slate-100 rounded-xl border border-[#3C3C3C] shadow-2xl max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Top Window Bar (Outlook Compose Style) */}
        <div className="bg-[#1F1F1F] px-4 py-2.5 border-b border-[#3C3C3C] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-[#0078D4] text-white flex items-center justify-center font-bold text-xs">
              ✉
            </div>
            <span className="text-xs font-semibold text-white tracking-wide">
              Novo E-mail - Microsoft Outlook / LECASU Mail
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition"
          >
            <X size={15} />
          </button>
        </div>

        {/* Compose Ribbon Actions Bar */}
        <div className="bg-[#2D2D2D] px-4 py-2 border-b border-[#3C3C3C] flex items-center justify-between shrink-0 gap-2 overflow-x-auto text-xs">
          <div className="flex items-center space-x-2">
            
            {/* Botão Enviar Azul */}
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending}
              className="px-4 py-1.5 bg-[#0078D4] hover:bg-[#106EBE] text-white font-semibold rounded text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <Loader2 size={13} className="animate-spin text-white" />
              ) : (
                <Send size={13} />
              )}
              <span>{isSending ? 'A enviar...' : 'Enviar'}</span>
            </button>

            {/* Modelos Rápidos */}
            <div className="flex items-center gap-1.5 bg-[#202020] px-2 py-1 rounded border border-[#3C3C3C]">
              <Sparkles size={13} className="text-amber-400" />
              <select
                value={selectedTemplate}
                onChange={e => handleTemplateChange(e.target.value)}
                className="bg-transparent text-neutral-300 text-xs focus:outline-none cursor-pointer"
              >
                <option value="custom">Mensagem Personalizada</option>
                <option value="proposal">Modelo: Envio de Proposta</option>
                <option value="followup">Modelo: Acompanhamento</option>
                <option value="welcome">Modelo: Boas-vindas</option>
              </select>
            </div>

            {/* Vincular Proposta */}
            <button
              type="button"
              onClick={() => {
                const targetClient = clients.find(c => c.id === Number(selectedClientId));
                if (targetClient && targetClient.proposals && targetClient.proposals.length > 0) {
                  setAttachedProposal(targetClient.proposals[0]);
                }
              }}
              className="px-2.5 py-1 bg-[#383838] hover:bg-[#444444] text-neutral-200 rounded border border-[#4C4C4C] text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Vincular proposta cadastrada"
            >
              <FileText size={13} className="text-orange-400" />
              <span>Anexar Proposta</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-rose-400 p-1.5 rounded hover:bg-neutral-800 transition"
            title="Descartar rascunho"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Compose Form Fields */}
        <form onSubmit={handleSend} className="p-4 space-y-2.5 overflow-y-auto flex-1 text-xs">
          
          {/* De (From) */}
          <div className="flex items-center gap-2 border-b border-[#383838] pb-2">
            <span className="w-16 font-semibold text-neutral-400 text-right shrink-0">De:</span>
            <div className="flex items-center gap-2 text-neutral-200 font-mono text-[11px] bg-[#1E1E1E] px-2.5 py-1 rounded border border-[#3A3A3A] flex-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{senderEmail}</span>
              <span className="text-[10px] text-neutral-400 ml-auto">(SMTP Seguro)</span>
            </div>
          </div>

          {/* Selecionar Cliente Registado */}
          <div className="flex items-center gap-2 border-b border-[#383838] pb-2">
            <span className="w-16 font-semibold text-neutral-400 text-right shrink-0">Cliente:</span>
            <div className="flex-1 flex items-center gap-2">
              <select
                value={selectedClientId}
                onChange={e => handleClientChange(Number(e.target.value))}
                className="flex-1 px-2.5 py-1.5 bg-[#1E1E1E] border border-[#3A3A3A] rounded text-white focus:outline-none focus:border-[#0078D4]"
              >
                <option value="">-- Selecionar Cliente do Catálogo LECASU --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.email ? `(${c.email})` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCc(!showCc)}
                className="text-neutral-400 hover:text-white px-2 py-1 text-[11px] rounded hover:bg-neutral-800"
              >
                Cc
              </button>
            </div>
          </div>

          {/* Para (To) */}
          <div className="flex items-center gap-2 border-b border-[#383838] pb-2">
            <span className="w-16 font-semibold text-neutral-400 text-right shrink-0">Para:</span>
            <input
              type="email"
              required
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="ex: contato@cliente.co.mz"
              className="flex-1 px-2.5 py-1.5 bg-[#1E1E1E] border border-[#3A3A3A] rounded text-white focus:outline-none focus:border-[#0078D4]"
            />
          </div>

          {/* Cc (Opcional) */}
          {showCc && (
            <div className="flex items-center gap-2 border-b border-[#383838] pb-2 animate-in fade-in">
              <span className="w-16 font-semibold text-neutral-400 text-right shrink-0">Cc:</span>
              <input
                type="email"
                value={ccEmail}
                onChange={e => setCcEmail(e.target.value)}
                placeholder="gerencia@lecasu.co.mz"
                className="flex-1 px-2.5 py-1.5 bg-[#1E1E1E] border border-[#3A3A3A] rounded text-white focus:outline-none focus:border-[#0078D4]"
              />
            </div>
          )}

          {/* Assunto */}
          <div className="flex items-center gap-2 border-b border-[#383838] pb-2">
            <span className="w-16 font-semibold text-neutral-400 text-right shrink-0">Assunto:</span>
            <input
              type="text"
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Digite o assunto do e-mail..."
              className="flex-1 px-2.5 py-1.5 bg-[#1E1E1E] border border-[#3A3A3A] rounded text-white focus:outline-none focus:border-[#0078D4]"
            />
          </div>

          {/* Attached Proposal Preview Banner */}
          {attachedProposal && (
            <div className="p-2.5 bg-[#282F3A] border border-[#0078D4]/40 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-rose-950/60 border border-rose-500/40 text-rose-400 flex items-center justify-center font-bold text-xs">
                  PDF
                </div>
                <div>
                  <p className="font-semibold text-white text-xs leading-tight">
                    Proposta_{attachedProposal.id}_{attachedProposal.title.replace(/\s+/g, '_')}.pdf
                  </p>
                  <p className="text-[11px] text-sky-300 font-mono">
                    Valor: {formatMZN(Number(attachedProposal.total_amount) || 0)} (Anexo Timbrado)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedProposal(null)}
                className="text-neutral-400 hover:text-rose-400 p-1"
                title="Remover anexo"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Body Editor */}
          <div className="pt-1">
            <textarea
              rows={11}
              required
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Escreva a sua mensagem aqui..."
              className="w-full p-3 bg-[#1B1B1B] border border-[#3A3A3A] rounded text-neutral-200 text-xs font-sans leading-relaxed focus:outline-none focus:border-[#0078D4] resize-none"
            />
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-2.5 bg-rose-950/50 border border-rose-600/50 rounded flex items-center gap-2 text-rose-200 text-xs">
              <AlertCircle size={15} className="text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

        </form>

        {/* Footer info */}
        <div className="bg-[#1C1C1C] px-4 py-2 border-t border-[#383838] flex items-center justify-between text-[11px] text-neutral-400 shrink-0">
          <span>Servidor SMTP Conectado</span>
          <span className="font-mono text-neutral-500">LECASU Secure Gateway</span>
        </div>

      </div>
    </div>
  );
};
