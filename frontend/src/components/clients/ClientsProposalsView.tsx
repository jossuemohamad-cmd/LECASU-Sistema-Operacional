import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Mail, 
  RefreshCw, 
  AlertCircle,
  FileSpreadsheet, 
  Send, 
  Inbox, 
  Trash2, 
  Reply, 
  ReplyAll, 
  Forward, 
  ShieldCheck, 
  Paperclip, 
  LayoutGrid, 
  X, 
  Archive, 
  AlertOctagon, 
  Edit3, 
  MoreVertical, 
  Tag, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  SlidersHorizontal, 
  Download,
  File as FileIcon 
} from 'lucide-react';
import type { Client, ClientCreateInput, Proposal, ProposalCreateInput, ToastMessage } from '../../types';
import { fetchClients, createClient, createProposal, convertProposalToProject } from '../../services/api';
import { ClientModal } from './ClientModal';
import { ProposalModal } from './ProposalModal';
import { ClientDetailsModal } from './ClientDetailsModal';
import { EmailConfigModal, DEFAULT_EMAIL_CONFIG } from './EmailConfigModal';
import type { EmailAccountConfig } from './EmailConfigModal';
import { EmailComposeModal } from './EmailComposeModal';
import type { EmailMessage } from './EmailComposeModal';
import { Toast } from '../common/Toast';
import { formatMZN } from '../../utils/formatters';

interface ClientsProposalsViewProps {
  onOpenNewClientModal?: boolean;
  onResetOpenNewClientModal?: () => void;
  onNavigateToProjects?: () => void;
}

export const ClientsProposalsView: React.FC<ClientsProposalsViewProps> = ({
  onOpenNewClientModal,
  onResetOpenNewClientModal,
  onNavigateToProjects
}) => {
  // Database Data States
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // View Mode: 'roundcube' (default, Roundcube structure with white system palette) or 'crm' (tabular CRM)
  const [viewMode, setViewMode] = useState<'roundcube' | 'crm'>('roundcube');

  // Selected Folder in Tree
  // 'inbox' (A receber) | 'drafts' (Rascunhos) | 'sent' (Enviados) | 'spam' (Spam) | 'trash' (Reciclagem) | 'archive' (Arquivo) | 'proposals_all' | 'client_[id]'
  const [selectedFolder, setSelectedFolder] = useState<string>('inbox');
  const [showDetailsHeader, setShowDetailsHeader] = useState(false);

  // Selected Email or Proposal for Reading Pane
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Modals state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEmailConfigModalOpen, setIsEmailConfigModalOpen] = useState(false);
  const [isEmailComposeModalOpen, setIsEmailComposeModalOpen] = useState(false);

  // Targets for Modals
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<Client | null>(null);
  const [composeInitialClient, setComposeInitialClient] = useState<Client | null>(null);
  const [composeInitialProposal, setComposeInitialProposal] = useState<Proposal | null>(null);

  // Email Config State
  const [emailConfig, setEmailConfig] = useState<EmailAccountConfig>(() => {
    try {
      const saved = localStorage.getItem('lecasu_email_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_EMAIL_CONFIG;
  });

  // Email Messages State (In-Memory + LocalStorage)
  const [messages, setMessages] = useState<EmailMessage[]>(() => {
    try {
      const saved = localStorage.getItem('lecasu_outlook_emails');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('lecasu_email_config', JSON.stringify(emailConfig));
  }, [emailConfig]);

  useEffect(() => {
    localStorage.setItem('lecasu_outlook_emails', JSON.stringify(messages));
  }, [messages]);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch clients from PostgreSQL backend
  const loadClients = async (showSuccessToast = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchClients();
      setClients(data);

      // Seed initial realistic communications matching Roundcube reference if empty
      setMessages(prev => {
        if (prev.length > 0) return prev;

        const seeded: EmailMessage[] = [
          {
            id: 'rc_msg_1',
            clientId: data[0]?.id,
            clientName: 'Sualehe S. Sualehe',
            from: 'sualehe@lecasu.co.mz',
            to: emailConfig.email,
            subject: 'RE: WO 01914318 Matendene 83830.32',
            body: `Prezados Senhores,

Espero que se encontrem bem.

Escrevemos para informar que a obra referente à Montagem e desmontagem de painéis solares na capela de Matendene (5023169-01) foi concluída e entregue com sucesso. Em anexo seguem os documentos necessários:
  • Fatura
  • Cotação
  • Goods and Services Verification – Matendene 2
  • Relatório Fotográfico

Caso seja necessária alguma informação adicional, por favor, não hesitem em contactar-nos. Permanecemos inteiramente à disposição para quaisquer esclarecimentos.

Agradecemos, mais uma vez, a confiança e a parceria.

Com os melhores cumprimentos,`,
            date: '2026-09-23T12:31:00Z',
            isRead: false,
            hasAttachment: true,
            attachedProposalId: data[0]?.proposals?.[0]?.id || 102,
            attachedProposalTitle: 'WO 01914318 Matendene 83830.32',
            attachedProposalAmount: 83830.32,
            folder: 'inbox'
          },
          {
            id: 'rc_msg_2',
            clientId: data[1]?.id,
            clientName: 'Vladmir Naiene',
            from: 'vladmir.naiene@ronil.co.mz',
            to: emailConfig.email,
            subject: 'A Ronil, Lda. Apresenta Viaturas da Marca Hyundai H100',
            body: `Exmos. Senhores da LECASU,

Temos o prazer de apresentar a nova linha de viaturas comerciais para a vossa frota de engenharia. Segue portfólio em anexo.

Cumprimentos,
Vladmir Naiene`,
            date: '2026-09-24T16:53:00Z',
            isRead: true,
            hasAttachment: true,
            folder: 'inbox'
          },
          {
            id: 'rc_msg_3',
            clientId: data[0]?.id,
            clientName: 'Jeremias Heigar Como',
            from: 'j.como@cfm.co.mz',
            to: emailConfig.email,
            subject: 'Re: [Ext:] Autorização para Diagnóstico Técnico de Subestação',
            body: `Bom dia caros colegas,

Confirmamos a autorização de acesso da vossa equipa técnica às instalações a partir de segunda-feira.

Atenciosamente,
Jeremias Como`,
            date: '2026-09-24T09:29:00Z',
            isRead: true,
            hasAttachment: false,
            folder: 'inbox'
          }
        ];

        // Also add database proposals
        data.forEach(client => {
          if (client.proposals && client.proposals.length > 0) {
            client.proposals.forEach(p => {
              seeded.push({
                id: `prop_seed_${p.id}`,
                clientId: client.id,
                clientName: client.name,
                from: emailConfig.email,
                to: client.email || 'comercial@cliente.co.mz',
                subject: `Proposta Comercial #${p.id} - ${p.title}`,
                body: `Exmo.(s) Senhor(es) da ${client.name},\n\nEnviamos em anexo a proposta comercial detalhada para "${p.title}".\n\nValor: ${formatMZN(Number(p.total_amount) || 0)}\n\nFicamos ao dispor para os passos seguintes.\n\nAtenciosamente,\nLECASU Engenharia`,
                date: p.created_at || new Date().toISOString(),
                isRead: true,
                hasAttachment: true,
                attachedProposalId: p.id,
                attachedProposalTitle: p.title,
                attachedProposalAmount: Number(p.total_amount),
                folder: 'sent'
              });
            });
          }
        });

        return seeded;
      });

      if (showSuccessToast) {
        addToast('success', 'Atualizado com Sucesso', 'Caixa de correio e clientes sincronizados.');
      }
    } catch (err: any) {
      console.error('Erro ao buscar clientes:', err);
      setError(err.message || 'Falha ao conectar com o servidor API.');
      addToast('error', 'Falha na conexão', 'Não foi possível carregar a lista de clientes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  // Handle external trigger for "+ Novo Registo"
  useEffect(() => {
    if (onOpenNewClientModal) {
      setIsClientModalOpen(true);
      if (onResetOpenNewClientModal) {
        onResetOpenNewClientModal();
      }
    }
  }, [onOpenNewClientModal, onResetOpenNewClientModal]);

  // Handle client creation
  const handleCreateClient = async (payload: ClientCreateInput) => {
    const created = await createClient(payload);
    setClients(prev => [created, ...prev]);
    addToast('success', 'Cliente cadastrado com sucesso!', `${created.name} foi adicionado à base.`);
  };

  // Handle proposal creation
  const handleCreateProposal = async (payload: ProposalCreateInput) => {
    const created = await createProposal(payload);
    await loadClients();

    const targetClient = clients.find(c => c.id === payload.client_id);
    const newSentProposalMsg: EmailMessage = {
      id: `prop_sent_${created.id}_${Date.now()}`,
      clientId: payload.client_id,
      clientName: targetClient?.name || 'Cliente LECASU',
      from: emailConfig.email,
      to: targetClient?.email || 'cliente@empresa.co.mz',
      subject: `Proposta Comercial #${created.id} - ${created.title}`,
      body: `Prezado(a) cliente,\n\nSegue em anexo a proposta comercial "${created.title}" no valor de ${formatMZN(Number(created.total_amount) || 0)}.\n\nEscopo: ${created.scope || 'Serviços de Engenharia conforme especificação técnica.'}\n\nAtenciosamente,\n${emailConfig.displayName}`,
      date: new Date().toISOString(),
      isRead: true,
      hasAttachment: true,
      attachedProposalId: created.id,
      attachedProposalTitle: created.title,
      attachedProposalAmount: Number(created.total_amount),
      folder: 'sent'
    };

    setMessages(prev => [newSentProposalMsg, ...prev]);
    setSelectedItemId(newSentProposalMsg.id);
    addToast('success', 'Proposta Criada & Pronta para Envio!', `"${created.title}" foi registada e anexada ao correio.`);
  };

  // Handle proposal conversion to project
  const handleConvertToProject = async (proposal: Proposal) => {
    try {
      const project = await convertProposalToProject(proposal.id);
      await loadClients();
      addToast(
        'success', 
        `Projeto ${project.code} Gerado com Sucesso!`, 
        `Proposta convertida em projeto ativo no Módulo 04.`
      );
      setIsDetailsModalOpen(false);
      if (onNavigateToProjects) {
        onNavigateToProjects();
      }
    } catch (err: any) {
      addToast('error', 'Erro ao converter proposta', err.message || 'Não foi possível gerar o projeto.');
    }
  };

  // Open proposal modal for a specific client
  const handleOpenProposalForClient = (clientId: number) => {
    setSelectedClientId(clientId);
    setIsProposalModalOpen(true);
  };

  // Open details modal
  const handleOpenDetails = (client: Client) => {
    setSelectedClientForDetails(client);
    setIsDetailsModalOpen(true);
  };

  // Open compose email modal
  const handleOpenCompose = (client?: Client | null, proposal?: Proposal | null) => {
    setComposeInitialClient(client || null);
    setComposeInitialProposal(proposal || null);
    setIsEmailComposeModalOpen(true);
  };

  // Send Email Handler
  const handleSendEmailMessage = async (msg: EmailMessage) => {
    setMessages(prev => [msg, ...prev]);
    setSelectedItemId(msg.id);
    addToast('success', 'E-mail Enviado!', `Mensagem enviada com sucesso para ${msg.to} via SMTP.`);
  };

  // Delete message / move to trash
  const handleDeleteItem = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, folder: 'trash' } : m));
    addToast('info', 'Mensagem movida para a Reciclagem', 'Pode restaurar a qualquer momento.');
  };

  // Toggle Read Status
  const handleToggleRead = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: !m.isRead } : m));
  };

  // All Proposals flattened from clients
  const allProposals = useMemo(() => {
    const list: { proposal: Proposal; client: Client }[] = [];
    clients.forEach(c => {
      if (c.proposals && c.proposals.length > 0) {
        c.proposals.forEach(p => {
          list.push({ proposal: p, client: c });
        });
      }
    });
    return list;
  }, [clients]);

  // Filtered Messages based on Folder and Search
  const filteredMessages = useMemo(() => {
    let result = messages;

    // Folder filtering (Roundcube folders)
    if (selectedFolder === 'inbox') {
      result = result.filter(m => m.folder === 'inbox');
    } else if (selectedFolder === 'sent') {
      result = result.filter(m => m.folder === 'sent');
    } else if (selectedFolder === 'drafts') {
      result = result.filter(m => m.folder === 'drafts');
    } else if (selectedFolder === 'trash') {
      result = result.filter(m => m.folder === 'trash');
    } else if (selectedFolder === 'spam') {
      result = result.filter(m => m.folder === 'drafts'); // mock spam
    } else if (selectedFolder === 'archive') {
      result = result.filter(m => m.folder === 'sent');
    } else if (selectedFolder === 'proposals_all') {
      result = result.filter(m => m.hasAttachment || m.attachedProposalId);
    } else if (selectedFolder.startsWith('client_')) {
      const cId = parseInt(selectedFolder.replace('client_', ''), 10);
      result = result.filter(m => m.clientId === cId);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(m => 
        m.subject.toLowerCase().includes(q) ||
        m.from.toLowerCase().includes(q) ||
        m.to.toLowerCase().includes(q) ||
        (m.clientName && m.clientName.toLowerCase().includes(q)) ||
        m.body.toLowerCase().includes(q)
      );
    }

    return result;
  }, [messages, selectedFolder, searchQuery]);

  // Selected item object (EmailMessage)
  const currentItem = useMemo(() => {
    if (!selectedItemId && filteredMessages.length > 0) {
      return filteredMessages[0];
    }
    return messages.find(m => m.id === selectedItemId) || filteredMessages[0] || null;
  }, [selectedItemId, filteredMessages, messages]);

  // Auto-select first item when folder changes
  useEffect(() => {
    if (filteredMessages.length > 0 && (!selectedItemId || !filteredMessages.find(m => m.id === selectedItemId))) {
      setSelectedItemId(filteredMessages[0].id);
    }
  }, [selectedFolder, filteredMessages]);

  // Folder Counts
  const inboxUnreadCount = useMemo(() => {
    return messages.filter(m => m.folder === 'inbox' && !m.isRead).length;
  }, [messages]);

  // Truncate helper
  const truncate45 = (text?: string | null, limit = 45): string => {
    if (!text) return '';
    return text.length > limit ? `${text.slice(0, limit)}...` : text;
  };

  // Format Roundcube Date: "Qui 16:53", "Qua 12:31", "2026-09-23 12:31"
  const formatRoundcubeListDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dayName = days[d.getDay()];
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${dayName} ${hours}:${mins}`;
  };

  const formatRoundcubeFullDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hours}:${mins}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] min-h-[660px] font-sans select-none rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white text-slate-800">
      <Toast toasts={toasts} onDismiss={removeToast} />

      {error && (
        <div className="bg-rose-50 border-b border-rose-200 text-rose-800 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadClients()} className="underline hover:text-rose-950 font-semibold cursor-pointer">
            Tentar novamente
          </button>
        </div>
      )}

      {/* =========================================================================
          ROUNDCUBE TOP TOOLBAR (Estrutura Fiel ao Roundcube Webmail)
         ========================================================================= */}
      <div className="h-11 bg-[#F4F6F8] border-b border-slate-200 flex items-stretch shrink-0 text-xs">
        
        {/* Pane 1 Header: Email da Conta (info@lecasu.co.mz) */}
        <div className="w-52 sm:w-56 px-3 flex items-center justify-between border-r border-slate-200 font-semibold text-slate-800 bg-[#FAFAF9] shrink-0">
          <div className="flex items-center gap-2 truncate">
            <Mail size={15} className="text-[#FF8000] shrink-0" />
            <span className="truncate text-xs font-mono">{emailConfig.email}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsEmailConfigModalOpen(true)}
            className="text-slate-500 hover:text-slate-800 p-1 rounded hover:bg-slate-200 transition cursor-pointer shrink-0"
            title="Configurações da Conta"
          >
            <MoreVertical size={14} />
          </button>
        </div>

        {/* Pane 2 Header Actions: Escrever | + Proposta | Atualizar */}
        <div className="w-72 sm:w-80 px-3 flex items-center justify-between border-r border-slate-200 bg-[#F4F6F8] shrink-0">
          <div className="flex items-center gap-2.5 text-slate-600 whitespace-nowrap">
            <button
              type="button"
              onClick={() => handleOpenCompose()}
              className="flex items-center gap-1.5 hover:text-[#FF8000] transition font-medium cursor-pointer whitespace-nowrap shrink-0"
              title="Escrever Novo E-mail"
            >
              <Edit3 size={13} className="text-[#FF8000] shrink-0" />
              <span className="whitespace-nowrap">Escrever</span>
            </button>

            <button
              type="button"
              onClick={() => setIsProposalModalOpen(true)}
              className="flex items-center gap-1.5 text-[#FF8000] hover:text-[#E67300] transition font-medium cursor-pointer whitespace-nowrap shrink-0"
              title="Criar Proposta Comercial"
            >
              <FileSpreadsheet size={13} className="shrink-0" />
              <span className="whitespace-nowrap">+ Proposta</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-slate-600 shrink-0">
            <button
              type="button"
              onClick={() => loadClients(true)}
              className="flex items-center gap-1.5 hover:text-[#FF8000] transition cursor-pointer whitespace-nowrap shrink-0"
              title="Atualizar correio"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin text-[#FF8000]' : 'shrink-0'} />
              <span className="hidden md:inline text-[11px] whitespace-nowrap">Atualizar</span>
            </button>
          </div>
        </div>

        {/* Pane 3 Header Actions: Responder | Responder a todos | Reencaminhar | Eliminar | Arquivo | Spam | Marcar | Tabela CRM */}
        <div className="flex-1 px-4 flex items-center justify-between bg-[#F4F6F8] overflow-x-auto scrollbar-none whitespace-nowrap">
          <div className="flex items-center gap-3 sm:gap-4 text-slate-700 font-medium text-xs whitespace-nowrap shrink-0">
            
            {/* Responder */}
            <button
              type="button"
              disabled={!currentItem}
              onClick={() => currentItem && handleOpenCompose(clients.find(c => c.id === currentItem.clientId))}
              className="flex items-center gap-1.5 hover:text-[#FF8000] transition cursor-pointer disabled:opacity-40 whitespace-nowrap shrink-0"
              title="Responder"
            >
              <Reply size={14} className="text-[#FF8000] shrink-0" />
              <span className="whitespace-nowrap">Responder</span>
            </button>

            {/* Responder a todos */}
            <button
              type="button"
              disabled={!currentItem}
              onClick={() => currentItem && handleOpenCompose(clients.find(c => c.id === currentItem.clientId))}
              className="hidden lg:flex items-center gap-1.5 hover:text-[#FF8000] transition cursor-pointer disabled:opacity-40 whitespace-nowrap shrink-0"
              title="Responder a todos"
            >
              <ReplyAll size={14} className="shrink-0" />
              <span className="whitespace-nowrap">Responder a todos</span>
            </button>

            {/* Reencaminhar */}
            <button
              type="button"
              disabled={!currentItem}
              onClick={() => addToast('info', 'Reencaminhar', 'Selecione o destinatário para reencaminhar.')}
              className="flex items-center gap-1.5 hover:text-[#FF8000] transition cursor-pointer disabled:opacity-40 whitespace-nowrap shrink-0"
              title="Reencaminhar"
            >
              <Forward size={14} className="shrink-0" />
              <span className="whitespace-nowrap">Reencaminhar</span>
            </button>

            <div className="h-4 w-px bg-slate-300 mx-0.5 shrink-0" />

            {/* Eliminar */}
            <button
              type="button"
              disabled={!currentItem}
              onClick={() => currentItem && handleDeleteItem(currentItem.id)}
              className="flex items-center gap-1.5 hover:text-red-600 transition cursor-pointer disabled:opacity-40 whitespace-nowrap shrink-0"
              title="Eliminar"
            >
              <Trash2 size={14} className="text-slate-500 hover:text-red-600 shrink-0" />
              <span className="whitespace-nowrap">Eliminar</span>
            </button>

            {/* Arquivo */}
            <button
              type="button"
              disabled={!currentItem}
              onClick={() => addToast('info', 'Arquivo', 'Mensagem arquivada.')}
              className="hidden sm:flex items-center gap-1.5 hover:text-[#FF8000] transition cursor-pointer disabled:opacity-40 whitespace-nowrap shrink-0"
              title="Arquivo"
            >
              <Archive size={14} className="shrink-0" />
              <span className="whitespace-nowrap">Arquivo</span>
            </button>

            {/* Spam */}
            <button
              type="button"
              disabled={!currentItem}
              onClick={() => addToast('info', 'Spam', 'Marcado como spam.')}
              className="hidden md:flex items-center gap-1.5 hover:text-[#FF8000] transition cursor-pointer disabled:opacity-40 whitespace-nowrap shrink-0"
              title="Marcar como Spam"
            >
              <AlertOctagon size={14} className="shrink-0" />
              <span className="whitespace-nowrap">Spam</span>
            </button>

            {/* Marcar */}
            <button
              type="button"
              disabled={!currentItem}
              onClick={() => currentItem && handleToggleRead(currentItem.id)}
              className="hidden md:flex items-center gap-1.5 hover:text-[#FF8000] transition cursor-pointer disabled:opacity-40 whitespace-nowrap shrink-0"
              title="Marcar como lida/não lida"
            >
              <Tag size={13} className="shrink-0" />
              <span className="whitespace-nowrap">Marcar</span>
            </button>
          </div>

          {/* Right toggle: CRM Mode */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'roundcube' ? 'crm' : 'roundcube')}
            className="px-2.5 py-1 text-slate-700 hover:text-[#FF8000] hover:border-[#FF8000] hover:bg-orange-50/50 rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-300 bg-white shadow-2xs whitespace-nowrap shrink-0 ml-3"
            title="Alternar entre visualização de Correio e Tabela CRM"
          >
            <LayoutGrid size={13} className="text-[#FF8000] shrink-0" />
            <span className="whitespace-nowrap">{viewMode === 'roundcube' ? 'Tabela CRM' : 'Correio'}</span>
          </button>
        </div>

      </div>

      {/* =========================================================================
          ROUNDCUBE 3-PANE WORKSPACE
         ========================================================================= */}
      {viewMode === 'roundcube' ? (
        <div className="flex flex-1 min-h-0 overflow-hidden bg-white">
          
          {/* ---------------------------------------------------------------------
              PANE 1: ROUNDCUBE FOLDERS (A receber, Rascunhos, Enviados, etc.)
             --------------------------------------------------------------------- */}
          <div className="w-52 sm:w-56 bg-[#F8F9FA] border-r border-slate-200 flex flex-col shrink-0 min-h-0 overflow-y-auto text-xs">
            <div className="py-2 px-1.5 space-y-0.5">
              
              {/* A receber (Inbox) */}
              <div
                onClick={() => setSelectedFolder('inbox')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition ${
                  selectedFolder === 'inbox'
                    ? 'bg-[#FF8000] text-white font-semibold shadow-2xs'
                    : 'text-slate-700 hover:bg-orange-50/70 hover:text-[#FF8000]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Inbox size={15} className={selectedFolder === 'inbox' ? 'text-white' : 'text-[#FF8000]'} />
                  <span>A receber</span>
                </div>
                {inboxUnreadCount > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    selectedFolder === 'inbox' ? 'bg-white text-[#FF8000]' : 'bg-[#FF8000] text-white'
                  }`}>
                    {inboxUnreadCount}
                  </span>
                )}
              </div>

              {/* Rascunhos */}
              <div
                onClick={() => setSelectedFolder('drafts')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer transition ${
                  selectedFolder === 'drafts'
                    ? 'bg-[#FF8000] text-white font-semibold shadow-2xs'
                    : 'text-slate-700 hover:bg-orange-50/70 hover:text-[#FF8000]'
                }`}
              >
                <Edit3 size={15} className={selectedFolder === 'drafts' ? 'text-white' : 'text-slate-500'} />
                <span>Rascunhos</span>
              </div>

              {/* Enviados */}
              <div
                onClick={() => setSelectedFolder('sent')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer transition ${
                  selectedFolder === 'sent'
                    ? 'bg-[#FF8000] text-white font-semibold shadow-2xs'
                    : 'text-slate-700 hover:bg-orange-50/70 hover:text-[#FF8000]'
                }`}
              >
                <Send size={15} className={selectedFolder === 'sent' ? 'text-white' : 'text-slate-500'} />
                <span>Enviados</span>
              </div>

              {/* Spam */}
              <div
                onClick={() => setSelectedFolder('spam')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer transition ${
                  selectedFolder === 'spam'
                    ? 'bg-[#FF8000] text-white font-semibold shadow-2xs'
                    : 'text-slate-700 hover:bg-orange-50/70 hover:text-[#FF8000]'
                }`}
              >
                <AlertOctagon size={15} className={selectedFolder === 'spam' ? 'text-white' : 'text-slate-500'} />
                <span>Spam</span>
              </div>

              {/* Reciclagem (Trash) */}
              <div
                onClick={() => setSelectedFolder('trash')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer transition ${
                  selectedFolder === 'trash'
                    ? 'bg-[#FF8000] text-white font-semibold shadow-2xs'
                    : 'text-slate-700 hover:bg-orange-50/70 hover:text-[#FF8000]'
                }`}
              >
                <Trash2 size={15} className={selectedFolder === 'trash' ? 'text-white' : 'text-slate-500'} />
                <span>Reciclagem</span>
              </div>

              {/* Arquivo */}
              <div
                onClick={() => setSelectedFolder('archive')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer transition ${
                  selectedFolder === 'archive'
                    ? 'bg-[#FF8000] text-white font-semibold shadow-2xs'
                    : 'text-slate-700 hover:bg-orange-50/70 hover:text-[#FF8000]'
                }`}
              >
                <Archive size={15} className={selectedFolder === 'archive' ? 'text-white' : 'text-slate-500'} />
                <span>Arquivo</span>
              </div>

              {/* Pasta Especial: Propostas Comerciais */}
              <div
                onClick={() => setSelectedFolder('proposals_all')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition ${
                  selectedFolder === 'proposals_all'
                    ? 'bg-[#FF8000] text-white font-semibold shadow-2xs'
                    : 'text-slate-700 hover:bg-orange-50/70 hover:text-[#FF8000]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={15} className={selectedFolder === 'proposals_all' ? 'text-white' : 'text-[#FF8000]'} />
                  <span>Propostas</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  selectedFolder === 'proposals_all' ? 'bg-white text-[#FF8000]' : 'bg-orange-100 text-[#FF8000]'
                }`}>
                  {allProposals.length}
                </span>
              </div>

            </div>

            {/* Clientes Registados (Filtro Direto) */}
            <div className="mt-2 pt-2 border-t border-slate-200 px-3 pb-1 flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <span>Clientes ({clients.length})</span>
              <button
                type="button"
                onClick={() => setIsClientModalOpen(true)}
                className="text-slate-400 hover:text-[#FF8000] p-0.5 cursor-pointer transition"
                title="Novo Cliente"
              >
                <Plus size={13} />
              </button>
            </div>

            <div className="p-1.5 space-y-0.5 flex-1 min-h-0 overflow-y-auto">
              {clients.map(client => {
                const isSelected = selectedFolder === `client_${client.id}`;
                const clientProposalsCount = client.proposals?.length || 0;
                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedFolder(`client_${client.id}`)}
                    className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition ${
                      isSelected
                        ? 'bg-orange-100/70 text-[#FF8000] font-bold border-l-2 border-[#FF8000]'
                        : 'text-slate-600 hover:bg-orange-50/50 hover:text-[#FF8000]'
                    }`}
                    title={client.name}
                  >
                    <span className="truncate text-xs">{truncate45(client.name, 18)}</span>
                    {clientProposalsCount > 0 && (
                      <span className="text-[10px] text-[#FF8000] font-mono font-semibold ml-1 shrink-0">
                        {clientProposalsCount}p
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Status */}
            <div className="p-2.5 border-t border-slate-200 bg-[#F0F2F5] text-[11px] text-slate-600 flex items-center justify-between shrink-0 font-sans">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-[#FF8000]" />
                <span className="font-semibold text-slate-700">LECASU Mail</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">v2.0 • SSL</span>
            </div>

          </div>

          {/* ---------------------------------------------------------------------
              PANE 2: ROUNDCUBE MESSAGE LIST (Lista Fiel ao Roundcube)
             --------------------------------------------------------------------- */}
          <div className="w-72 sm:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-0 overflow-hidden text-xs">
            
            {/* Roundcube Search Bar: 🔍 Pesquisar... + Filter Icon */}
            <div className="p-2 border-b border-slate-200 bg-[#FAFAF9] flex items-center gap-1.5 shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-6 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#FF8000]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <button
                type="button"
                className="p-1 text-slate-500 hover:text-[#FF8000] rounded hover:bg-slate-200 transition cursor-pointer"
                title="Filtrar Mensagens"
              >
                <SlidersHorizontal size={14} />
              </button>
            </div>

            {/* Message List Items (Roundcube Structure: Remetente + Data, • Assunto + Anexo) */}
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
              {filteredMessages.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Mail size={28} className="mx-auto mb-2 opacity-30 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-600">Nenhuma mensagem nesta pasta</p>
                </div>
              ) : (
                filteredMessages.map(msg => {
                  const isSelected = currentItem?.id === msg.id;
                  return (
                    <div
                      key={msg.id}
                      onClick={() => {
                        setSelectedItemId(msg.id);
                        if (!msg.isRead) handleToggleRead(msg.id);
                      }}
                      className={`px-3 py-2 cursor-pointer transition relative ${
                        isSelected
                          ? 'bg-orange-50/90 text-slate-900 font-semibold border-l-4 border-[#FF8000]'
                          : 'hover:bg-slate-50 border-l-4 border-transparent text-slate-700'
                      }`}
                    >
                      {/* Linha 1: Remetente à esquerda, Data (ex: Qui 16:53) à direita */}
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className={`truncate ${!msg.isRead ? 'font-bold text-slate-900' : 'font-medium'}`}>
                          {msg.clientName || msg.from}
                        </span>
                        <span className="text-[11px] text-slate-400 shrink-0 font-mono ml-2">
                          {formatRoundcubeListDate(msg.date)}
                        </span>
                      </div>

                      {/* Linha 2: • Assunto + Ícone de Anexo à direita */}
                      <div className="flex items-center justify-between text-xs gap-1">
                        <p className={`truncate text-xs ${
                          isSelected ? 'text-[#FF8000]' : !msg.isRead ? 'font-bold text-slate-900' : 'text-slate-600'
                        }`}>
                          {!msg.isRead && <span className="text-[#FF8000] font-bold mr-1">•</span>}
                          {msg.subject}
                        </p>
                        {msg.hasAttachment && (
                          <Paperclip size={12} className="text-slate-400 shrink-0" />
                        )}
                      </div>

                      {/* Linha 3 (Opcional): Tag da Proposta */}
                      {msg.attachedProposalId && (
                        <div className="mt-1 flex items-center justify-between text-[10px]">
                          <span className="text-[#FF8000] font-semibold">
                            Proposta #{msg.attachedProposalId}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Roundcube Bottom Pagination Bar */}
            <div className="px-3 py-2 bg-[#F0F2F5] border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between shrink-0 font-sans">
              <span className="font-medium text-slate-700">
                {filteredMessages.length} {filteredMessages.length === 1 ? 'mensagem' : 'mensagens'}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" className="p-1 hover:text-[#FF8000] hover:bg-white rounded transition text-slate-500 disabled:opacity-30 cursor-pointer" title="Página anterior">
                  <ChevronLeft size={13} />
                </button>
                <span className="px-2 py-0.5 bg-white border border-slate-300 rounded text-slate-800 font-bold text-[10px] shadow-2xs">
                  1
                </span>
                <button type="button" className="p-1 hover:text-[#FF8000] hover:bg-white rounded transition text-slate-500 disabled:opacity-30 cursor-pointer" title="Próxima página">
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

          </div>

          {/* ---------------------------------------------------------------------
              PANE 3: ROUNDCUBE READING PANE (Estrutura Fiel ao Roundcube Webmail)
             --------------------------------------------------------------------- */}
          <div className="flex-1 bg-white flex flex-col min-h-0 overflow-y-auto">
            {currentItem ? (
              <div className="p-6 max-w-4xl mx-auto w-full flex flex-col min-h-full">
                
                {/* 1. Roundcube Subject Title com Link Externo */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h1 className="text-lg font-bold text-slate-900 leading-tight flex items-center gap-2">
                    <span>{currentItem.subject}</span>
                    <span title="Abrir em nova janela">
                      <ExternalLink size={15} className="text-slate-400 cursor-pointer hover:text-[#FF8000] transition" />
                    </span>
                  </h1>
                </div>

                {/* 2. Roundcube Sender Info Header: Avatar + "De [Nome] em [Data]" + Links: Detalhes, Cabeçalhos */}
                <div className="flex items-start gap-3 py-2.5 border-b border-slate-200 mb-4">
                  {/* Round Avatar Icon */}
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-[#FF8000] border border-orange-200 flex items-center justify-center font-bold text-sm shrink-0">
                    {(currentItem.clientName || currentItem.from).substring(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1 text-xs">
                    {/* De [Nome] em YYYY-MM-DD HH:MM */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-500">De</span>
                      <a href={`mailto:${currentItem.from}`} className="font-semibold text-[#FF8000] hover:underline">
                        {currentItem.clientName || currentItem.from}
                      </a>
                      <span className="text-slate-400">em {formatRoundcubeFullDate(currentItem.date)}</span>
                    </div>

                    {/* Action Links: ✉ Detalhes | ℹ Cabeçalhos | ≡ Texto simples */}
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                      <button
                        type="button"
                        onClick={() => setShowDetailsHeader(!showDetailsHeader)}
                        className="hover:text-[#FF8000] hover:underline flex items-center gap-1 cursor-pointer transition"
                      >
                        <Mail size={11} className="text-[#FF8000]" />
                        <span>Detalhes</span>
                      </button>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500">Para: {currentItem.to}</span>
                    </div>

                    {/* Extended Details Dropdown */}
                    {showDetailsHeader && (
                      <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded font-mono text-[11px] text-slate-600 space-y-0.5">
                        <p><strong>De:</strong> {currentItem.from}</p>
                        <p><strong>Para:</strong> {currentItem.to}</p>
                        <p><strong>Data:</strong> {currentItem.date}</p>
                        <p><strong>Assunto:</strong> {currentItem.subject}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Roundcube Attachment Strips: 📄 [Nome Arquivo] (~Tamanho) ▾ com Apenas Ícone de Baixar */}
                {currentItem.hasAttachment && (
                  <div className="mb-5 space-y-1.5">
                    {/* Attachment Row 1 */}
                    <div className="p-2 px-3 bg-[#F8F9FA] hover:bg-orange-50/40 border border-slate-200 rounded flex items-center justify-between text-xs transition gap-2 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-800 min-w-0 flex-1 whitespace-nowrap overflow-hidden">
                        <FileIcon size={14} className="text-[#FF8000] shrink-0" />
                        <span 
                          onClick={() => addToast('info', 'Anexo', 'Abertura de anexo PDF...')}
                          className="font-medium text-slate-800 hover:text-[#FF8000] hover:underline cursor-pointer truncate"
                          title={currentItem.attachedProposalTitle 
                            ? `Processo_${currentItem.attachedProposalId || '01914318'}_${currentItem.attachedProposalTitle.replace(/\s+/g, '_')}.pdf`
                            : 'Documento_Anexo_LECASU.pdf'}
                        >
                          {currentItem.attachedProposalTitle 
                            ? `Processo_${currentItem.attachedProposalId || '01914318'}_${currentItem.attachedProposalTitle.replace(/\s+/g, '_')}.pdf`
                            : 'Documento_Anexo_LECASU.pdf'}
                        </span>
                        <span className="text-slate-400 text-[11px] font-mono shrink-0 whitespace-nowrap">(~807 KB)</span>
                        <ChevronDown size={12} className="text-slate-400 shrink-0" />
                      </div>

                      {/* Apenas Ícone de Baixar Ficheiro */}
                      <button
                        type="button"
                        onClick={() => addToast('success', 'Download', 'Transferência do ficheiro iniciada.')}
                        className="p-1.5 text-slate-500 hover:text-[#FF8000] hover:bg-orange-100/70 rounded transition cursor-pointer shrink-0"
                        title="Baixar ficheiro"
                      >
                        <Download size={14} />
                      </button>
                    </div>

                    {/* Attachment Row 2 if proposal */}
                    {currentItem.attachedProposalId && (
                      <div className="p-2 px-3 bg-[#F8F9FA] hover:bg-orange-50/40 border border-slate-200 rounded flex items-center justify-between text-xs transition gap-2 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-slate-800 min-w-0 flex-1 whitespace-nowrap overflow-hidden">
                          <FileIcon size={14} className="text-[#FF8000] shrink-0" />
                          <span 
                            onClick={() => addToast('info', 'Anexo', 'Abertura de anexo PDF...')}
                            className="font-medium text-slate-800 hover:text-[#FF8000] hover:underline cursor-pointer truncate"
                            title="Relatorio_Fotografico_Viabilidade_LECASU.pdf"
                          >
                            Relatorio_Fotografico_Viabilidade_LECASU.pdf
                          </span>
                          <span className="text-slate-400 text-[11px] font-mono shrink-0 whitespace-nowrap">(~1.3 MB)</span>
                          <ChevronDown size={12} className="text-slate-400 shrink-0" />
                        </div>

                        {/* Apenas Ícone de Baixar Ficheiro */}
                        <button
                          type="button"
                          onClick={() => addToast('success', 'Download', 'Transferência do relatório iniciada.')}
                          className="p-1.5 text-slate-500 hover:text-[#FF8000] hover:bg-orange-100/70 rounded transition cursor-pointer shrink-0"
                          title="Baixar ficheiro"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Roundcube Email Body (Carta Branca Limpa) */}
                <div className="text-slate-800 text-xs sm:text-[13px] leading-relaxed font-sans whitespace-pre-line py-2 mb-8">
                  {currentItem.body}
                </div>

                {/* 5. Roundcube Signature (Alinhada no final da mensagem - Paleta Oficial LECASU) */}
                <div className="pt-6 border-t border-slate-200 mt-auto text-xs">
                  <div className="flex items-start gap-3.5">
                    <div className="w-1 self-stretch bg-[#FF8000] rounded-full shrink-0 min-h-[52px]" />
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {currentItem.clientName || 'LECASU Engenharia'}
                        </span>
                        <span className="px-1.5 py-0.2 bg-orange-50 text-[#FF8000] border border-orange-200 rounded text-[10px] font-bold">
                          LECASU
                        </span>
                      </div>
                      <p className="text-slate-600 font-medium">
                        Departamento Comercial & Gestão de Contratos
                      </p>
                      <div className="flex items-center gap-2 text-slate-500 text-[11px] flex-wrap pt-0.5">
                        <span>Av. 24 de Julho, Maputo - Moçambique</span>
                        <span>•</span>
                        <a href="mailto:info@lecasu.co.mz" className="text-[#FF8000] hover:underline">
                          info@lecasu.co.mz
                        </a>
                        <span>•</span>
                        <span className="text-slate-400">www.lecasu.co.mz</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <Mail size={40} className="opacity-30 mb-2 text-slate-400" />
                <h3 className="text-xs font-bold text-slate-600">Selecione uma mensagem para ler</h3>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* =====================================================================
           MODO TRADICIONAL CRM / TABELA
           ===================================================================== */
        <div className="flex-1 p-6 overflow-y-auto bg-white text-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">Carteira de Clientes & Propostas (Visão Tabela CRM)</h2>
              <p className="text-xs text-slate-500">Visão tabular executiva integrada aos dados do PostgreSQL</p>
            </div>
            <button
              onClick={() => setViewMode('roundcube')}
              className="btn-primary btn-sm bg-[#FF8000] hover:bg-[#E67300] text-white flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Mail size={14} />
              <span>Voltar para o Modo Correio</span>
            </button>
          </div>

          <div className="table-scroll-container">
            <table className="table-erp">
              <thead>
                <tr className="table-header-erp">
                  <th className="px-4">Cliente</th>
                  <th className="px-4">NUIT</th>
                  <th className="px-4">E-mail</th>
                  <th className="px-4">Telefone</th>
                  <th className="px-4">Propostas</th>
                  <th className="px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {clients.map(client => (
                  <tr key={client.id} className="table-row-erp hover:bg-slate-50 transition cursor-pointer" onClick={() => handleOpenDetails(client)}>
                    <td className="px-4 font-semibold text-slate-900">{client.name}</td>
                    <td className="px-4 font-mono text-xs">{client.nuit || '—'}</td>
                    <td className="px-4 text-xs">{client.email || '—'}</td>
                    <td className="px-4 text-xs">{client.phone || '—'}</td>
                    <td className="px-4 text-xs font-semibold text-orange-600">
                      {client.proposals?.length || 0} propostas
                    </td>
                    <td className="px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCompose(client);
                        }}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-300 rounded text-xs font-semibold mr-1.5 transition cursor-pointer"
                      >
                        Enviar E-mail
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProposalForClient(client.id);
                        }}
                        className="px-2.5 py-1 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded text-xs font-semibold"
                      >
                        + Proposta
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAIS INTEGRADOS
         ========================================================================= */}
      
      {/* Modal: Novo Cliente */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSubmit={handleCreateClient}
      />

      {/* Modal: Nova Proposta Comercial */}
      <ProposalModal
        isOpen={isProposalModalOpen}
        clients={clients}
        initialClientId={selectedClientId}
        onClose={() => {
          setIsProposalModalOpen(false);
          setSelectedClientId(null);
        }}
        onSubmit={handleCreateProposal}
      />

      {/* Modal: Detalhes do Cliente */}
      <ClientDetailsModal
        client={selectedClientForDetails}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedClientForDetails(null);
        }}
        onNewProposal={(clientId) => handleOpenProposalForClient(clientId)}
        onConvertToProject={handleConvertToProject}
      />

      {/* Modal: Configuração de Conta SMTP/IMAP/Google */}
      <EmailConfigModal
        isOpen={isEmailConfigModalOpen}
        onClose={() => setIsEmailConfigModalOpen(false)}
        initialConfig={emailConfig}
        onSave={(newCfg) => {
          setEmailConfig(newCfg);
          addToast('success', 'Configurações Salvas', 'Servidores SMTP e IMAP atualizados com sucesso.');
        }}
      />

      {/* Modal: Novo E-mail / Compor Proposta */}
      <EmailComposeModal
        isOpen={isEmailComposeModalOpen}
        clients={clients}
        initialClient={composeInitialClient}
        initialProposal={composeInitialProposal}
        senderEmail={emailConfig.email}
        onClose={() => {
          setIsEmailComposeModalOpen(false);
          setComposeInitialClient(null);
          setComposeInitialProposal(null);
        }}
        onSend={handleSendEmailMessage}
      />

    </div>
  );
};
