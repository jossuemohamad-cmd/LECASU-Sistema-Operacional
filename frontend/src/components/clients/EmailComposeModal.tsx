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
      <div className="bg-white text-slate-800 rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Top Window Bar - Clean White & Professional */}
        <div className="bg-slate-50/80 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0078D4]/10 text-[#0078D4] flex items-center justify-center font-bold text-sm shadow-2xs">
              <Send size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">Novo E-mail / Envio de Proposta</h3>
              <p className="text-xs text-slate-500">Composição corporativa via servidor SMTP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Compose Action Bar */}
        <div className="bg-white px-6 py-2.5 border-b border-slate-200 flex items-center justify-between shrink-0 gap-3 text-xs">
          <div className="flex items-center space-x-2.5">
            
            {/* Botão Enviar Azul */}
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending}
              className="px-4 py-2 bg-[#0078D4] hover:bg-[#106EBE] text-white font-semibold rounded-lg text-xs flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <Loader2 size={14} className="animate-spin text-white" />
              ) : (
                <Send size={14} />
              )}
              <span>{isSending ? 'A enviar...' : 'Enviar Mensagem'}</span>
            </button>

            {/* Modelos Rápidos */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <Sparkles size={14} className="text-amber-500" />
              <select
                value={selectedTemplate}
                onChange={e => handleTemplateChange(e.target.value)}
                className="bg-transparent text-slate-700 text-xs font-medium focus:outline-none cursor-pointer"
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
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Vincular proposta cadastrada"
            >
              <FileText size={14} className="text-[#FF8000]" />
              <span>Anexar Proposta</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
            title="Descartar rascunho"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Compose Form Fields */}
        <form onSubmit={handleSend} className="p-6 space-y-3 overflow-y-auto flex-1 text-xs">
          
          {/* De (From) */}
          <div className="flex items-center gap-3 border-b border-slate-100 pb-2.5">
            <span className="w-14 font-semibold text-slate-500 text-right shrink-0">De:</span>
            <div className="flex items-center gap-2 text-slate-800 font-mono text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 flex-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{senderEmail}</span>
              <span className="text-[11px] text-slate-400 ml-auto font-sans">(SMTP Seguro SSL)</span>
            </div>
          </div>

          {/* Selecionar Cliente Registado */}
          <div className="flex items-center gap-3 border-b border-slate-100 pb-2.5">
            <span className="w-14 font-semibold text-slate-500 text-right shrink-0">Cliente:</span>
            <div className="flex-1 flex items-center gap-2">
              <select
                value={selectedClientId}
                onChange={e => handleClientChange(Number(e.target.value))}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-[#0078D4] focus:bg-white transition"
              >
                <option value="">-- Selecionar Cliente da Base LECASU --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.email ? `(${c.email})` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCc(!showCc)}
                className="text-slate-500 hover:text-slate-900 px-2.5 py-1 text-xs font-semibold rounded-md hover:bg-slate-100 border border-slate-200"
              >
                Cc
              </button>
            </div>
          </div>

          {/* Para (To) */}
          <div className="flex items-center gap-3 border-b border-slate-100 pb-2.5">
            <span className="w-14 font-semibold text-slate-500 text-right shrink-0">Para:</span>
            <input
              type="email"
              required
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="ex: contato@cliente.co.mz"
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-[#0078D4] focus:bg-white transition"
            />
          </div>

          {/* Cc (Opcional) */}
          {showCc && (
            <div className="flex items-center gap-3 border-b border-slate-100 pb-2.5 animate-in fade-in">
              <span className="w-14 font-semibold text-slate-500 text-right shrink-0">Cc:</span>
              <input
                type="email"
                value={ccEmail}
                onChange={e => setCcEmail(e.target.value)}
                placeholder="gerencia@lecasu.co.mz"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-[#0078D4] focus:bg-white transition"
              />
            </div>
          )}

          {/* Assunto */}
          <div className="flex items-center gap-3 border-b border-slate-100 pb-2.5">
            <span className="w-14 font-semibold text-slate-500 text-right shrink-0">Assunto:</span>
            <input
              type="text"
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Assunto da comunicação ou orçamento..."
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#0078D4] focus:bg-white transition"
            />
          </div>

          {/* Attached Proposal Preview Banner */}
          {attachedProposal && (
            <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                  PDF
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-xs leading-tight">
                    Proposta_{attachedProposal.id}_{attachedProposal.title.replace(/\s+/g, '_')}.pdf
                  </p>
                  <p className="text-[11px] text-orange-700 font-mono font-medium">
                    Valor: {formatMZN(Number(attachedProposal.total_amount) || 0)} (Documento Timbrado LECASU)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedProposal(null)}
                className="text-slate-400 hover:text-rose-600 p-1 rounded-md"
                title="Remover anexo"
              >
                <X size={15} />
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
              placeholder="Escreva a sua mensagem..."
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#0078D4] focus:bg-white resize-none transition"
            />
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-medium">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

        </form>

        {/* Footer info */}
        <div className="bg-slate-50 px-6 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Servidor SMTP Conectado</span>
          <span className="font-mono text-slate-400">LECASU Corporate Mail</span>
        </div>

      </div>
    </div>
  );
};
