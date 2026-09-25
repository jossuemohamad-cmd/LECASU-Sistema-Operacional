import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  Save, 
  PenTool, 
  MessageSquare, 
  Pencil, 
  Users, 
  Plus, 
  Image as ImageIcon, 
  UploadCloud, 
  Trash2, 
  FileText, 
  Loader2, 
  Check, 
  ChevronDown,
  AlertCircle,
  X
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
  bcc?: string;
  subject: string;
  body: string;
  date: string;
  isRead: boolean;
  hasAttachment: boolean;
  attachedProposalId?: number;
  attachedProposalTitle?: string;
  attachedProposalAmount?: number;
  attachments?: Array<{ filename: string; size_bytes?: number }>;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash';
}

interface EmailComposeViewProps {
  clients: Client[];
  initialClient?: Client | null;
  initialProposal?: Proposal | null;
  senderEmail: string;
  onSend: (message: EmailMessage) => Promise<void>;
  onCancel?: () => void;
}

export const EmailComposeView: React.FC<EmailComposeViewProps> = ({
  clients,
  initialClient,
  initialProposal,
  senderEmail,
  onSend,
  onCancel
}) => {
  // Form fields
  const [fromEmail, setFromEmail] = useState(senderEmail || 'info@lecasu.co.mz');
  const [recipientEmail, setRecipientEmail] = useState(initialClient?.email || '');
  const [ccEmail, setCcEmail] = useState('');
  const [bccEmail, setBccEmail] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  
  // UI states
  const [isEditingFrom, setIsEditingFrom] = useState(false);
  const [isContactsDropdownOpen, setIsContactsDropdownOpen] = useState(false);
  const [isTemplatesDropdownOpen, setIsTemplatesDropdownOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successDraftMessage, setSuccessDraftMessage] = useState<string | null>(null);

  // Right sidebar options
  const [readReceipt, setReadReceipt] = useState(false);
  const [deliveryReceipt, setDeliveryReceipt] = useState(false);
  const [keepFormatting, setKeepFormatting] = useState(true);
  const [priority, setPriority] = useState<'Normal' | 'Baixa' | 'Alta' | 'Muito Alta'>('Normal');
  const [saveFolder, setSaveFolder] = useState('Enviados');

  // Attachments
  const [attachedProposal, setAttachedProposal] = useState<Proposal | null>(initialProposal || null);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; size: number }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default signature
  const defaultSignature = `\n\n--\nLECASU Engenharia & Serviços\nMaputo, Moçambique\nEmail: ${fromEmail}\nWeb: www.lecasu.co.mz`;

  useEffect(() => {
    if (senderEmail) {
      setFromEmail(senderEmail);
    }
    if (initialClient) {
      setRecipientEmail(initialClient.email || '');
    }
    if (initialProposal) {
      setAttachedProposal(initialProposal);
      setSubject(`Proposta Comercial #${initialProposal.id} - ${initialProposal.title} | LECASU`);
      setBody(
`Prezados,

Segue em anexo a nossa Proposta Comercial referente ao projeto "${initialProposal.title}".

Valor Total Proposto: ${formatMZN(Number(initialProposal.total_amount) || 0)}
Escopo: ${initialProposal.scope || 'Conforme alinhamento técnico.'}

Ficamos à inteira disposição para qualquer esclarecimento técnico ou ajuste necessário.

Atenciosamente,
LECASU Engenharia & Serviços
Maputo, Moçambique
Email: ${senderEmail || 'info@lecasu.co.mz'}
Web: www.lecasu.co.mz`
      );
    }
  }, [initialClient, initialProposal, senderEmail]);

  // Insert signature
  const handleToggleSignature = () => {
    if (body.includes('--\nLECASU Engenharia')) {
      setBody(prev => prev.replace(/\n\n--\nLECASU Engenharia[\s\S]*$/, ''));
    } else {
      setBody(prev => prev.trim() + defaultSignature);
    }
  };

  // Quick responses templates
  const handleApplyTemplate = (type: 'proposta' | 'followup' | 'boasvindas' | 'recibo') => {
    setIsTemplatesDropdownOpen(false);
    if (type === 'proposta') {
      setSubject('Proposta Comercial de Engenharia & Serviços | LECASU');
      setBody(
`Exmo.(s) Senhor(es),

Temos a honra de apresentar a nossa proposta técnica e comercial para a execução dos serviços de engenharia solicitados.

Reiteramos o nosso compromisso com a excelência técnica, prazos rigorosos e conformidade com as normas vigentes em Moçambique.

Por favor, encontrem a minuta e o orçamento detalhado em anexo.

Com os melhores cumprimentos,
Departamento Comercial | LECASU
Maputo - Moçambique`
      );
    } else if (type === 'followup') {
      setSubject('Acompanhamento de Proposta Comercial | LECASU');
      setBody(
`Prezados,

Esperamos que este e-mail o(a) encontre bem.

Gostaríamos de acompanhar o status da proposta comercial enviada recentemente e verificar se houve alguma dúvida técnica ou se necessitam de ajustes para a formalização do contrato.

Estamos disponíveis para agendar uma reunião presencial ou virtual a vosso critério.

Atenciosamente,
Equipa Comercial LECASU`
      );
    } else if (type === 'boasvindas') {
      setSubject('Bem-vindo à LECASU Engenharia | Abertura de Conta de Cliente');
      setBody(
`Prezados Senhores,

É com enorme satisfação que confirmamos o vosso registo na carteira de parceiros e clientes da LECASU.

A partir de agora, a vossa empresa conta com suporte direto de nossa equipa técnica especializada para todos os projetos de construção, manutenção e gestão de ativos.

Não hesite em contactar-nos para novas cotações e soluções.

Cordialmente,
Diretoria Executiva LECASU`
      );
    } else if (type === 'recibo') {
      setSubject('Confirmação de Recepção de Documentos | LECASU');
      setBody(
`Prezados,

Acusamos a boa recepção da vossa comunicação e documentos anexos. Os mesmos foram reencaminhados para o departamento responsável para análise técnica.

Entraremos em contacto brevemente.

Melhores cumprimentos,
LECASU Engenharia & Serviços`
      );
    }
  };

  // File attachments handling
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files).map(f => ({
        name: f.name,
        size: f.size
      }));
      setAttachedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Save draft
  const handleSaveDraft = () => {
    setSuccessDraftMessage('Rascunho guardado com sucesso.');
    setTimeout(() => setSuccessDraftMessage(null), 3000);
  };

  // Submit send
  const handleSubmitSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!recipientEmail || !recipientEmail.includes('@')) {
      setErrorMessage('Por favor informe um endereço de destinatário válido no campo "Para".');
      return;
    }

    if (!subject.trim()) {
      setErrorMessage('Por favor informe o assunto da mensagem.');
      return;
    }

    try {
      setIsSending(true);

      const allAttachments = [];
      if (attachedProposal) {
        allAttachments.push({
          filename: `Proposta_${attachedProposal.id}_${attachedProposal.title.replace(/\s+/g, '_')}.pdf`,
          size_bytes: 124500
        });
      }
      for (const f of attachedFiles) {
        allAttachments.push({
          filename: f.name,
          size_bytes: f.size
        });
      }

      const client = clients.find(c => c.email && c.email.toLowerCase() === recipientEmail.trim().toLowerCase());

      const newMsg: EmailMessage = {
        id: `sent_${Date.now()}`,
        clientId: client?.id,
        clientName: client?.name || recipientEmail,
        from: fromEmail,
        to: recipientEmail.trim(),
        cc: ccEmail.trim() || undefined,
        bcc: bccEmail.trim() || undefined,
        subject: subject.trim(),
        body: body.trim(),
        date: new Date().toISOString(),
        isRead: true,
        hasAttachment: allAttachments.length > 0,
        attachedProposalId: attachedProposal?.id,
        attachedProposalTitle: attachedProposal?.title,
        attachedProposalAmount: attachedProposal ? Number(attachedProposal.total_amount) : undefined,
        attachments: allAttachments,
        folder: 'sent'
      };

      await onSend(newMsg);
      if (onCancel) onCancel();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao enviar e-mail via servidor SMTP.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white select-none overflow-hidden h-full">
      
      {/* ================= TOP TOOLBAR (ROUNDCUBE COMPILANT) ================= */}
      <div className="h-11 bg-slate-50/90 border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        
        {/* Actions Left */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-xs font-medium text-slate-700">
          
          {/* Guardar */}
          <button
            type="button"
            onClick={handleSaveDraft}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-200/70 text-slate-700 hover:text-slate-900 transition cursor-pointer"
            title="Guardar como rascunho"
          >
            <Save size={15} className="text-slate-600" />
            <span>Guardar</span>
          </button>

          {/* Anexar */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-200/70 text-slate-700 hover:text-slate-900 transition cursor-pointer"
            title="Anexar ficheiro"
          >
            <Paperclip size={15} className="text-slate-600" />
            <span>Anexar</span>
          </button>

          {/* Assinatura */}
          <button
            type="button"
            onClick={handleToggleSignature}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-200/70 text-slate-700 hover:text-slate-900 transition cursor-pointer"
            title="Inserir assinatura da LECASU"
          >
            <PenTool size={15} className="text-slate-600" />
            <span>Assinatura</span>
          </button>

          {/* Respostas Pré-definidas */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTemplatesDropdownOpen(!isTemplatesDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-200/70 text-slate-700 hover:text-slate-900 transition cursor-pointer"
              title="Modelos de respostas comerciais"
            >
              <MessageSquare size={15} className="text-slate-600" />
              <span>Respostas</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>

            {isTemplatesDropdownOpen && (
              <div className="absolute left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 text-xs animate-in fade-in">
                <div className="px-3 py-1.5 font-bold text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Modelos Rápidos LECASU
                </div>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('proposta')}
                  className="w-full text-left px-3 py-2 hover:bg-orange-50 hover:text-[#FF8000] font-medium transition cursor-pointer"
                >
                  📄 Envio de Proposta Comercial
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('followup')}
                  className="w-full text-left px-3 py-2 hover:bg-orange-50 hover:text-[#FF8000] font-medium transition cursor-pointer"
                >
                  ⏰ Acompanhamento de Proposta
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('boasvindas')}
                  className="w-full text-left px-3 py-2 hover:bg-orange-50 hover:text-[#FF8000] font-medium transition cursor-pointer"
                >
                  🤝 Boas-vindas ao Cliente
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('recibo')}
                  className="w-full text-left px-3 py-2 hover:bg-orange-50 hover:text-[#FF8000] font-medium transition cursor-pointer"
                >
                  📬 Confirmação de Recepção
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Right Section Header */}
        <div className="flex items-center space-x-3">
          <span className="font-bold text-xs text-slate-700 tracking-tight pr-3 border-r border-slate-200">
            Opções e anexos
          </span>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-200 transition cursor-pointer"
              title="Voltar para mensagens"
            >
              <X size={16} />
            </button>
          )}
        </div>

      </div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        multiple 
        className="hidden" 
      />

      {/* ================= 2-COLUMN MAIN BODY ================= */}
      <form onSubmit={handleSubmitSend} className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white">
        
        {/* ================= LEFT COLUMN: MESSAGE COMPOSER ================= */}
        <div className="flex-1 flex flex-col p-4 md:p-5 border-r border-slate-200 overflow-y-auto space-y-3">
          
          {/* Feedback banners */}
          {successDraftMessage && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2 animate-in fade-in">
              <Check size={15} className="text-emerald-600" />
              <span>{successDraftMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Field: De */}
          <div className="flex items-center gap-3">
            <label className="w-14 text-xs font-semibold text-slate-600 text-left shrink-0">
              De
            </label>
            <div className="flex-1 relative flex items-center">
              {isEditingFrom ? (
                <input
                  type="email"
                  value={fromEmail}
                  onChange={e => setFromEmail(e.target.value)}
                  onBlur={() => setIsEditingFrom(false)}
                  autoFocus
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono text-slate-800 focus:outline-none focus:border-[#FF8000]"
                />
              ) : (
                <div className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-800 flex items-center justify-between">
                  <span>{fromEmail}</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingFrom(true)}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200/50 transition cursor-pointer"
                    title="Editar remetente"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Field: Para */}
          <div className="flex items-center gap-3">
            <label className="w-14 text-xs font-semibold text-slate-600 text-left shrink-0">
              Para
            </label>
            <div className="flex-1 relative flex items-center">
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                placeholder="destinatario@cliente.co.mz"
                className="w-full pl-3 pr-20 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#FF8000] rounded text-xs text-slate-800 focus:outline-none transition"
              />
              
              <div className="absolute right-1.5 flex items-center space-x-1">
                
                {/* Contacts Book Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsContactsDropdownOpen(!isContactsDropdownOpen)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    title="Selecionar da lista de clientes cadastrados"
                  >
                    <Users size={14} />
                  </button>

                  {isContactsDropdownOpen && (
                    <div className="absolute right-0 mt-1 w-72 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 text-xs">
                      <div className="px-3 py-1.5 font-bold text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        Clientes Cadastrados ({clients.length})
                      </div>
                      {clients.length === 0 ? (
                        <div className="px-3 py-3 text-slate-400 text-center">Nenhum cliente disponível</div>
                      ) : (
                        clients.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setRecipientEmail(c.email || '');
                              setIsContactsDropdownOpen(false);
                              if (c.proposals && c.proposals.length > 0 && !attachedProposal) {
                                setAttachedProposal(c.proposals[0]);
                              }
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-orange-50 hover:text-[#FF8000] border-b border-slate-50 last:border-0 transition cursor-pointer"
                          >
                            <div className="font-semibold text-slate-800">{c.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{c.email || 'Sem e-mail'}</div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Toggle Cc/Bcc */}
                <button
                  type="button"
                  onClick={() => {
                    if (!showCc) setShowCc(true);
                    else if (!showBcc) setShowBcc(true);
                    else {
                      setShowCc(false);
                      setShowBcc(false);
                    }
                  }}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  title="Adicionar campo Cc / Cco"
                >
                  <Plus size={14} />
                </button>

              </div>
            </div>
          </div>

          {/* Field: Cc */}
          {showCc && (
            <div className="flex items-center gap-3 animate-in fade-in">
              <label className="w-14 text-xs font-semibold text-slate-600 text-left shrink-0">
                Cc
              </label>
              <div className="flex-1 relative flex items-center">
                <input
                  type="email"
                  value={ccEmail}
                  onChange={e => setCcEmail(e.target.value)}
                  placeholder="comercial@lecasu.co.mz"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#FF8000] rounded text-xs text-slate-800 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => { setCcEmail(''); setShowCc(false); }}
                  className="absolute right-2 text-slate-400 hover:text-rose-600"
                  title="Remover Cc"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Field: Cco */}
          {showBcc && (
            <div className="flex items-center gap-3 animate-in fade-in">
              <label className="w-14 text-xs font-semibold text-slate-600 text-left shrink-0">
                Cco
              </label>
              <div className="flex-1 relative flex items-center">
                <input
                  type="email"
                  value={bccEmail}
                  onChange={e => setBccEmail(e.target.value)}
                  placeholder="arquivo@lecasu.co.mz"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#FF8000] rounded text-xs text-slate-800 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => { setBccEmail(''); setShowBcc(false); }}
                  className="absolute right-2 text-slate-400 hover:text-rose-600"
                  title="Remover Cco"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Field: Assunto */}
          <div className="flex items-center gap-3">
            <label className="w-14 text-xs font-semibold text-slate-600 text-left shrink-0">
              Assunto
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Introduza o assunto do e-mail..."
              className="flex-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#FF8000] rounded text-xs font-medium text-slate-800 focus:outline-none transition"
            />
          </div>

          {/* Attached Proposal Pill */}
          {attachedProposal && (
            <div className="p-2.5 bg-orange-50/70 border border-orange-200 rounded-lg flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-[#FF8000] text-white flex items-center justify-center font-bold text-[10px]">
                  PDF
                </div>
                <div>
                  <span className="font-semibold text-slate-800">
                    Proposta_{attachedProposal.id}_{attachedProposal.title.replace(/\s+/g, '_')}.pdf
                  </span>
                  <span className="ml-2 text-slate-500 font-mono text-[11px]">
                    ({formatMZN(Number(attachedProposal.total_amount) || 0)})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedProposal(null)}
                className="text-slate-400 hover:text-rose-600 p-1 rounded"
                title="Remover proposta vinculada"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* ================= EDITOR CONTAINER ================= */}
          <div className="flex-1 flex flex-col border border-slate-200 rounded-lg overflow-hidden focus-within:border-[#FF8000] transition min-h-[220px]">
            
            {/* Formatting Header Bar */}
            <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-slate-500">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  className="p-1 rounded hover:bg-slate-200/60 text-slate-600 transition cursor-pointer"
                  title="Inserir imagem / logotipo timbrado"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon size={15} />
                </button>
                <span className="text-[11px] text-slate-400">Texto formatado (HTML / Plain)</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">UTF-8</span>
            </div>

            {/* Textarea Area */}
            <textarea
              required
              rows={11}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Escreva a sua mensagem..."
              className="w-full flex-1 p-3.5 bg-white text-slate-800 text-xs font-sans leading-relaxed focus:outline-none resize-none"
            />
          </div>

          {/* Bottom Action Bar */}
          <div className="pt-2 flex items-center justify-between shrink-0">
            
            {/* Enviar Button - LECASU Brand Palette */}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSending}
                className="px-5 py-2 rounded-lg bg-[#FF8000] hover:bg-[#E67300] active:bg-[#CC6600] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isSending ? (
                  <Loader2 size={15} className="animate-spin text-white" />
                ) : (
                  <Send size={15} />
                )}
                <span>{isSending ? 'A enviar...' : 'Enviar'}</span>
              </button>

              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-medium transition cursor-pointer"
                >
                  Descartar
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
              LECASU Mail Client (SMTP Port 465 SSL)
            </div>

          </div>

        </div>

        {/* ================= RIGHT COLUMN: OPÇÕES E ANEXOS ================= */}
        <div className="w-full md:w-72 lg:w-80 p-4 md:p-5 bg-slate-50/50 flex flex-col space-y-4 overflow-y-auto">
          
          <div className="font-bold text-xs text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-200">
            Opções e anexos
          </div>

          {/* Dashed Drop Zone Container */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-[#FF8000] bg-white rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition group"
          >
            <p className="text-[11px] text-slate-500 mb-3 font-medium">
              Tamanho máximo permitido do ficheiro é 50 MB
            </p>

            {/* Adicionar anexo button */}
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 group-hover:bg-orange-50 group-hover:text-[#FF8000] text-slate-700 font-semibold text-xs border border-slate-200 group-hover:border-orange-200 transition flex items-center gap-1.5 mb-3"
            >
              <Paperclip size={13} className="text-[#FF8000]" />
              <span>Adicionar anexo</span>
            </button>

            {/* Subtle tray / upload icon */}
            <div className="text-slate-300 group-hover:text-orange-300 transition my-1">
              <UploadCloud size={44} strokeWidth={1.2} />
            </div>
          </div>

          {/* Uploaded Files List */}
          {attachedFiles.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-500">
                Ficheiros Anexados ({attachedFiles.length}):
              </div>
              {attachedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText size={14} className="text-slate-500 shrink-0" />
                    <span className="truncate text-slate-800 font-medium" title={file.name}>
                      {file.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    className="text-slate-400 hover:text-rose-600 p-0.5 ml-1 shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Options & Switches */}
          <div className="space-y-3.5 pt-2 text-xs">
            
            {/* Recibo de leitura */}
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium">Recibo de leitura</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={readReceipt}
                  onChange={e => setReadReceipt(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF8000]" />
              </label>
            </div>

            {/* Recibo de entrega */}
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium">Recibo de entrega</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={deliveryReceipt}
                  onChange={e => setDeliveryReceipt(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF8000]" />
              </label>
            </div>

            {/* Manter formatação */}
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium">Manter formatação</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepFormatting}
                  onChange={e => setKeepFormatting(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF8000]" />
              </label>
            </div>

            {/* Prioridade */}
            <div className="space-y-1">
              <label className="text-slate-700 font-medium block">Prioridade</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#FF8000] cursor-pointer"
              >
                <option value="Baixa">Baixa</option>
                <option value="Normal">Normal</option>
                <option value="Alta">Alta</option>
                <option value="Muito Alta">Muito Alta</option>
              </select>
            </div>

            {/* Guardar mensagem enviada em */}
            <div className="space-y-1">
              <label className="text-slate-700 font-medium block">
                Guardar mensagem enviada em
              </label>
              <select
                value={saveFolder}
                onChange={e => setSaveFolder(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#FF8000] cursor-pointer"
              >
                <option value="Enviados">Enviados</option>
                <option value="Rascunhos">Rascunhos</option>
                <option value="Arquivo">Arquivo</option>
              </select>
            </div>

          </div>

        </div>

      </form>

    </div>
  );
};
