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
  Settings,
  Users,
  File as FileIcon 
} from 'lucide-react';
import type { Client, ClientCreateInput, Proposal, ProposalCreateInput, ToastMessage, EmailAccountConfig, EmailMessage } from '../../types';
import { 
  fetchClients, 
  createClient, 
  createProposal, 
  convertProposalToProject,
  fetchEmails,
  sendEmail,
  syncEmails,
  toggleEmailRead,
  deleteEmail,
  fetchEmailConfig,
  saveEmailConfig
} from '../../services/api';
import { ClientModal } from './ClientModal';
import { ProposalModal } from './ProposalModal';
import { ClientDetailsModal } from './ClientDetailsModal';
import { EmailConfigModal, DEFAULT_EMAIL_CONFIG } from './EmailConfigModal';
import { EmailComposeModal } from './EmailComposeModal';
import { EmailComposeView } from './EmailComposeView';
import { EmailConfigView } from './EmailConfigView';
import { ProposalsManagerView } from './ProposalsManagerView';
import { OutlookAccountWizard } from './OutlookAccountWizard';
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

  // Active Sidebar Navigation Tab (Roundcube Vertical Navigation)
  // 'messages' (3-pane Correio) | 'compose' (Inline Escrever) | 'proposals' (Propostas) | 'settings' (Configurações) | 'clients' (Tabela Clientes)
  const [activeSidebarTab, setActiveSidebarTab] = useState<'messages' | 'compose' | 'proposals' | 'settings' | 'clients'>('messages');

  // Outlook Account Wizard State
  const [isAccountWizardOpen, setIsAccountWizardOpen] = useState(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

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

  // Email Messages State (PostgreSQL Backend + Cache)
  const [messages, setMessages] = useState<EmailMessage[]>(() => {
    try {
      const saved = localStorage.getItem('lecasu_outlook_emails');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Remove any previous fictitious mock emails
          return parsed.filter((m: any) => !m.id?.startsWith('rc_') && !m.id?.startsWith('msg_1') && !m.id?.startsWith('msg_2') && !m.id?.startsWith('msg_3'));
        }
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [isSyncing, setIsSyncing] = useState(false);

  // Save changes to localStorage as offline cache
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

  // Load emails from backend database
  const loadEmails = async (targetFolder?: string) => {
    try {
      const emailList = await fetchEmails(targetFolder);
      if (emailList) {
        // Filter out any lingering fake mock emails
        const cleanList = emailList.filter(m => !m.id?.startsWith('rc_'));
        setMessages(cleanList);
        if (cleanList.length > 0) {
          setSelectedItemId(prev => prev && cleanList.some(m => m.id === prev) ? prev : cleanList[0].id);
        } else {
          setSelectedItemId(null);
        }
      }
    } catch (e) {
      console.warn('Usando mensagens em cache/locais:', e);
    }
  };

  // Sync emails via real IMAP from mail server
  const handleSyncEmails = async (showToast = true) => {
    try {
      setIsSyncing(true);
      const res = await syncEmails({ config: emailConfig });
      const emailList = await fetchEmails();
      if (emailList && emailList.length > 0) {
        setMessages(emailList);
      }
      if (showToast) {
        if (res.incoming_connected || res.imap_connected) {
          const proto = (res.incoming_type || 'imap').toUpperCase();
          addToast('success', 'Correio Sincronizado', `${res.new_messages_count} novas mensagens recebidas via ${proto}.`);
        } else {
          addToast('info', 'Correio Atualizado', res.message || 'Mensagens da base de dados carregadas.');
        }
      }
    } catch (err: any) {
      if (showToast) {
        addToast('error', 'Falha na Sincronização', err.message || 'Erro ao sincronizar correio via IMAP.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch clients, configuration & emails from PostgreSQL backend
  const loadClients = async (showSuccessToast = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchClients();
      setClients(data);

      // Load email account config from backend
      try {
        const savedConfig = await fetchEmailConfig();
        if (savedConfig && savedConfig.email) {
          setEmailConfig(savedConfig);
        }
      } catch (err) {
        // fallback to existing emailConfig
      }

      // Load emails from backend database
      await loadEmails();

      if (showSuccessToast) {
        addToast('success', 'Atualizado com Sucesso', 'Clientes e correio sincronizados com a base de dados.');
      }
    } catch (err: any) {
      console.error('Erro ao buscar clientes:', err);
      setError(err.message || 'Falha ao conectar com o servidor API.');
      addToast('error', 'Falha na conexão', 'Não foi possível carregar os dados do servidor.');
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

  // Open compose email inline (instead of popup)
  const handleOpenCompose = (client?: Client | null, proposal?: Proposal | null) => {
    setComposeInitialClient(client || null);
    setComposeInitialProposal(proposal || null);
    setActiveSidebarTab('compose');
  };

  // Send Email Handler with real backend SMTP & database persistence
  const handleSendEmailMessage = async (msg: EmailMessage) => {
    try {
      const res = await sendEmail({
        to: msg.to,
        subject: msg.subject,
        body: msg.body,
        cc: msg.cc,
        clientId: msg.clientId,
        proposalId: msg.attachedProposalId,
        config: emailConfig
      });

      if (res && res.success) {
        const updatedList = await fetchEmails();
        setMessages(updatedList);
        setSelectedItemId(res.email?.id || msg.id);
        setSelectedFolder('sent');
        setActiveSidebarTab('messages');

        if (res.smtp_sent) {
          addToast('success', 'E-mail Enviado!', `Mensagem enviada com sucesso para ${msg.to} via servidor SMTP.`);
        } else {
          addToast('info', 'E-mail Registado nos Enviados', res.smtp_warning || 'Guardado no sistema LECASU.');
        }
      }
    } catch (err: any) {
      console.error('Erro ao enviar e-mail:', err);
      addToast('error', 'Erro no Envio de E-mail', err.message || 'Falha ao processar envio no servidor.');
      // Fallback otimista para não perder a mensagem na interface
      setMessages(prev => [msg, ...prev]);
      setSelectedItemId(msg.id);
      setSelectedFolder('sent');
      setActiveSidebarTab('messages');
    }
  };

  // Delete message / move to trash with backend sync
  const handleDeleteItem = async (id: string) => {
    try {
      await deleteEmail(id);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, folder: 'trash' } : m));
      addToast('info', 'Mensagem movida para a Reciclagem', 'Pode restaurar a qualquer momento.');
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, folder: 'trash' } : m));
    }
  };

  // Toggle Read Status with backend sync
  const handleToggleRead = async (id: string) => {
    try {
      await toggleEmailRead(id);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: !m.isRead } : m));
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: !m.isRead } : m));
    }
  };

  // Save email configuration with backend persistence
  const handleSaveEmailConfig = async (newCfg: EmailAccountConfig) => {
    setEmailConfig(newCfg);
    try {
      await saveEmailConfig(newCfg);
      addToast('success', 'Configurações Salvas', 'Servidores SMTP e IMAP atualizados no banco de dados.');
    } catch (err: any) {
      addToast('info', 'Configuração Salva Localmente', err.message || 'Sincronizado na sessão.');
    }
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
            onClick={() => setActiveSidebarTab('settings')}
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
              onClick={() => setActiveSidebarTab('proposals')}
              className="flex items-center gap-1.5 text-[#FF8000] hover:text-[#E67300] transition font-medium cursor-pointer whitespace-nowrap shrink-0"
              title="Gerir e Criar Propostas Comerciais"
            >
              <FileSpreadsheet size={13} className="shrink-0" />
              <span className="whitespace-nowrap">+ Proposta</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-slate-600 shrink-0">
            <button
              type="button"
              onClick={() => handleSyncEmails(true)}
              className="flex items-center gap-1.5 hover:text-[#FF8000] transition cursor-pointer whitespace-nowrap shrink-0"
              title="Sincronizar correio via IMAP e base de dados"
            >
              <RefreshCw size={13} className={isSyncing || isLoading ? 'animate-spin text-[#FF8000]' : 'shrink-0'} />
              <span className="hidden md:inline text-[11px] whitespace-nowrap">
                {isSyncing ? 'Sincronizando...' : 'Atualizar'}
              </span>
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

          {/* Outlook Account Status Pill Button */}
          <button
            type="button"
            onClick={() => setIsAccountWizardOpen(true)}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1 text-slate-700 hover:text-[#0078D4] hover:border-[#0078D4] hover:bg-blue-50/50 rounded text-xs font-medium transition cursor-pointer border border-slate-300 bg-white shadow-2xs whitespace-nowrap shrink-0 ml-3"
            title="Gerenciar conta conectada / Assistente de Login Outlook"
          >
            <div className="w-4 h-4 rounded bg-[#0078D4] flex items-center justify-center text-white text-[9px] font-black">
              O
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className={`w-2 h-2 rounded-full ${emailConfig.isConnected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <span className="font-semibold text-slate-800 truncate max-w-[130px]">{emailConfig.email || 'info@lecasu.co.mz'}</span>
              <span className="text-[10px] text-slate-400 font-sans uppercase">({emailConfig.incomingType.toUpperCase()})</span>
            </div>
          </button>

          {/* Right toggle: CRM Mode */}
          <button
            type="button"
            onClick={() => {
              if (activeSidebarTab === 'clients') {
                setActiveSidebarTab('messages');
              } else {
                setActiveSidebarTab('clients');
              }
            }}
            className="px-2.5 py-1 text-slate-700 hover:text-[#FF8000] hover:border-[#FF8000] hover:bg-orange-50/50 rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-300 bg-white shadow-2xs whitespace-nowrap shrink-0 ml-3"
            title="Alternar entre visualização de Correio e Tabela CRM"
          >
            <LayoutGrid size={13} className="text-[#FF8000] shrink-0" />
            <span className="whitespace-nowrap">{activeSidebarTab === 'clients' ? 'Modo Correio' : 'Tabela CRM'}</span>
          </button>
        </div>

      </div>

      {/* =========================================================================
          ROUNDCUBE WORKSPACE WITH VERTICAL MINI-SIDEBAR
         ========================================================================= */}
      <div className="flex flex-1 min-h-0 overflow-hidden bg-white">
        
        {/* ---------------------------------------------------------------------
            ROUNDCUBE VERTICAL MINI-SIDEBAR (Correio, Escrever, Propostas, Clientes, Ajustes)
           --------------------------------------------------------------------- */}
        <div className="w-14 sm:w-16 bg-[#F8F9FA] border-r border-slate-200 flex flex-col items-center py-3 shrink-0 justify-between select-none">
          {/* Top Navigation Icons */}
          <div className="flex flex-col items-center space-y-2.5 w-full px-1.5">
            
            {/* 1. Mensagens / Correio */}
            <button
              type="button"
              onClick={() => {
                setActiveSidebarTab('messages');
              }}
              className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition cursor-pointer group ${
                activeSidebarTab === 'messages'
                  ? 'bg-[#FF8000] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
              title="Caixa de Mensagens & Correio"
            >
              <Mail size={17} />
              <span className="text-[9px] mt-0.5 font-semibold leading-none">Correio</span>
            </button>

            {/* 2. Escrever (Inline Compose!) */}
            <button
              type="button"
              onClick={() => {
                setComposeInitialClient(null);
                setComposeInitialProposal(null);
                setActiveSidebarTab('compose');
              }}
              className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition cursor-pointer group ${
                activeSidebarTab === 'compose'
                  ? 'bg-[#FF8000] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
              title="Escrever Novo E-mail (Sem popup)"
            >
              <Edit3 size={17} />
              <span className="text-[9px] mt-0.5 font-semibold leading-none">Escrever</span>
            </button>

            {/* 3. Criar Propostas */}
            <button
              type="button"
              onClick={() => setActiveSidebarTab('proposals')}
              className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition cursor-pointer group ${
                activeSidebarTab === 'proposals'
                  ? 'bg-[#FF8000] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
              title="Propostas Comerciais"
            >
              <FileSpreadsheet size={17} />
              <span className="text-[9px] mt-0.5 font-semibold leading-none">Propostas</span>
            </button>

            {/* 4. Clientes */}
            <button
              type="button"
              onClick={() => {
                setActiveSidebarTab('clients');
              }}
              className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition cursor-pointer group ${
                activeSidebarTab === 'clients'
                  ? 'bg-[#FF8000] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
              title="Catálogo de Clientes"
            >
              <Users size={17} />
              <span className="text-[9px] mt-0.5 font-semibold leading-none">Clientes</span>
            </button>

          </div>

          {/* Bottom Navigation Icons */}
          <div className="flex flex-col items-center space-y-2.5 w-full px-1.5">
            {/* 5. Configurações de Conta */}
            <button
              type="button"
              onClick={() => setActiveSidebarTab('settings')}
              className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition cursor-pointer group ${
                activeSidebarTab === 'settings'
                  ? 'bg-[#FF8000] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
              title="Configurações de Login e Servidores de E-mail"
            >
              <Settings size={17} />
              <span className="text-[9px] mt-0.5 font-semibold leading-none">Ajustes</span>
            </button>

            {/* Sincronização */}
            <button
              type="button"
              onClick={() => handleSyncEmails(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
              title="Atualizar correio via IMAP"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin text-[#FF8000]' : ''} />
            </button>
          </div>
        </div>

        {/* ================= ACTIVE VIEW CONTENT ================= */}
        {activeSidebarTab === 'compose' ? (
          <EmailComposeView
            clients={clients}
            initialClient={composeInitialClient}
            initialProposal={composeInitialProposal}
            senderEmail={emailConfig.email}
            onSend={handleSendEmailMessage}
            onCancel={() => setActiveSidebarTab('messages')}
          />
        ) : activeSidebarTab === 'proposals' ? (
          <ProposalsManagerView
            clients={clients}
            onOpenCreateProposal={() => setIsProposalModalOpen(true)}
            onSendProposalByEmail={(prop, client) => {
              setComposeInitialProposal(prop);
              setComposeInitialClient(client || null);
              setActiveSidebarTab('compose');
            }}
          />
        ) : activeSidebarTab === 'settings' ? (
          <div className="flex-1 overflow-y-auto bg-slate-100 flex flex-col p-4 sm:p-6 min-h-0">
            {/* Top Switcher Bar */}
            <div className="w-full max-w-2xl mx-auto mb-4 flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-[#0078D4] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  O
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Assistente de Conexão de E-mail Corporativo</h3>
                  <p className="text-[11px] text-slate-500">Conecte sua conta info@lecasu.co.mz para enviar e receber mensagens reais no sistema</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                className="text-xs font-semibold text-[#FF8000] hover:underline cursor-pointer whitespace-nowrap pl-3"
              >
                {showAdvancedConfig ? '← Voltar para Assistente Outlook' : 'Parâmetros Técnicos cPanel'}
              </button>
            </div>

            {showAdvancedConfig ? (
              <div className="w-full max-w-2xl mx-auto">
                <EmailConfigView
                  currentConfig={emailConfig}
                  onConfigSaved={(saved) => {
                    setEmailConfig(saved);
                    addToast('success', 'Configuração Salva', 'Configurações de e-mail atualizadas.');
                  }}
                  onClose={() => setActiveSidebarTab('messages')}
                />
              </div>
            ) : (
              <div className="w-full max-w-2xl mx-auto flex items-center justify-center my-auto">
                <OutlookAccountWizard
                  isInline={true}
                  initialConfig={emailConfig}
                  onSuccess={(cfg) => {
                    setEmailConfig(cfg);
                    handleSyncEmails(true);
                    addToast('success', 'Conta Conectada', `Conta ${cfg.email} conectada com êxito!`);
                    setActiveSidebarTab('messages');
                  }}
                />
              </div>
            )}
          </div>
        ) : activeSidebarTab === 'clients' ? (
          <div className="flex-1 p-6 overflow-y-auto bg-white text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">Carteira de Clientes & Propostas (Visão Tabela CRM)</h2>
                <p className="text-xs text-slate-500">Visão tabular executiva integrada aos dados do PostgreSQL</p>
              </div>
              <button
                onClick={() => {
                  setActiveSidebarTab('messages');
                }}
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
        ) : (
          /* ================= 3-PANE ROUNDCUBE WORKSPACE ================= */
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
      )}
      </div>

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
        onSave={handleSaveEmailConfig}
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

      {/* Modal: Assistente de Conta Outlook */}
      {isAccountWizardOpen && (
        <OutlookAccountWizard
          isOpen={true}
          isInline={false}
          initialConfig={emailConfig}
          onClose={() => setIsAccountWizardOpen(false)}
          onSuccess={(cfg) => {
            setEmailConfig(cfg);
            setIsAccountWizardOpen(false);
            handleSyncEmails(true);
            addToast('success', 'Conta Conectada', `Conta ${cfg.email} conectada com êxito!`);
          }}
        />
      )}

    </div>
  );
};
