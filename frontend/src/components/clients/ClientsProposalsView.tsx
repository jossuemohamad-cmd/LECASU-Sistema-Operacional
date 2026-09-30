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
  X, 
  Archive, 
  AlertOctagon, 
  Edit3, 
  Tag, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal, 
  Download,
  Settings,
  Users,
  Check,
  File as FileIcon,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import type { Client, ClientCreateInput, Proposal, ProposalCreateInput, ToastMessage, EmailAccountConfig, EmailMessage, EmailAttachment } from '../../types';
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
  moveEmailFolder,
  getEmailAttachmentUrl,
  saveEmailConfig,
  fetchEmailAccounts,
  switchEmailAccount,
  logoutEmailAccount,
  deleteEmailAccount
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

  // Selected Folder in Tree
  // 'inbox' (A receber) | 'drafts' (Rascunhos) | 'sent' (Enviados) | 'spam' (Spam) | 'trash' (Reciclagem) | 'archive' (Arquivo) | 'proposals_all' | 'client_[id]'
  const [selectedFolder, setSelectedFolder] = useState<string>('inbox');
  const [showDetailsHeader, setShowDetailsHeader] = useState(false);
  const [bodyViewMode, setBodyViewMode] = useState<'html' | 'text'>('html');

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

  // Multi-Account Management State
  const [emailAccounts, setEmailAccounts] = useState<Array<{
    id: number;
    email: string;
    displayName: string;
    provider: string;
    incomingType: string;
    incomingHost: string;
    smtpHost: string;
    isActive: boolean;
    lastSync?: string;
  }>>([]);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
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

  // Load all configured email accounts from database
  const loadAccounts = async () => {
    try {
      const accounts = await fetchEmailAccounts();
      if (Array.isArray(accounts)) {
        setEmailAccounts(accounts);
        const active = accounts.find(a => a.isActive);
        if (active) {
          setEmailConfig(prev => ({
            ...prev,
            email: active.email,
            username: active.email,
            displayName: active.displayName || 'LECASU - Engenharia & Serviços',
            provider: active.provider || 'cpanel',
            incomingType: (active.incomingType || 'imap') as any,
            incomingHost: active.incomingHost,
            smtpHost: active.smtpHost,
            isConnected: true,
            lastSync: active.lastSync
          }));
        } else if (accounts.length === 0) {
          setEmailConfig(prev => ({ ...prev, isConnected: false }));
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar contas cadastradas:', e);
    }
  };

  // Switch active email account (Multi-Account isolation)
  const handleSwitchAccount = async (accountId: number, emailStr: string) => {
    try {
      setIsLoading(true);
      await switchEmailAccount({ accountId });
      await loadAccounts();
      await loadEmails();
      addToast('success', 'Conta Alterada', `Sessão ativa alterada para ${emailStr}.`);
      setShowAccountDropdown(false);
      handleSyncEmails(false);
    } catch (e: any) {
      addToast('error', 'Falha ao trocar conta', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect / Logout from active account
  const handleLogoutAccount = async () => {
    try {
      await logoutEmailAccount();
      setEmailConfig(prev => ({ ...prev, isConnected: false }));
      setMessages([]);
      setSelectedItemId(null);
      await loadAccounts();
      setShowAccountDropdown(false);
      addToast('info', 'Conta Desconectada', 'Sessão de correio desconectada com sucesso.');
    } catch (e: any) {
      addToast('error', 'Erro ao sair', e.message);
    }
  };

  // Delete an email account permanently from PostgreSQL database
  const handleDeleteAccount = async (e: React.MouseEvent, accountId: number, emailStr: string) => {
    e.stopPropagation();
    if (!window.confirm(`Tem certeza que deseja remover permanentemente a conta ${emailStr}?`)) {
      return;
    }
    try {
      await deleteEmailAccount(accountId);
      addToast('success', 'Conta Removida', `A conta ${emailStr} foi excluída.`);
      await loadAccounts();
      if (emailConfig.email === emailStr) {
        await handleLogoutAccount();
      } else {
        await loadEmails();
      }
    } catch (err: any) {
      addToast('error', 'Erro ao Remover', err.message || 'Falha ao remover a conta.');
    }
  };

  // Load emails from backend database (strictly for active account)
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
      } else {
        setMessages([]);
        setSelectedItemId(null);
      }
    } catch (e) {
      console.warn('Usando mensagens em cache/locais:', e);
    }
  };

  // Sync emails via real IMAP from mail server
  const handleSyncEmails = async (showToast = true) => {
    if (!emailConfig.isConnected) return;
    try {
      if (showToast) setIsSyncing(true);
      const res = await syncEmails({ config: emailConfig, limit: showToast ? 50 : 15 });
      const emailList = await fetchEmails();
      if (emailList) {
        setMessages(emailList.filter(m => !m.id?.startsWith('rc_')));
      }
      if (res.new_messages_count > 0 && !showToast) {
        addToast('success', 'Nova Mensagem Recebida!', `${res.new_messages_count} novo(s) e-mail(s) sincronizado(s) em tempo real.`);
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
        addToast('error', 'Falha na Sincronização', err.message || 'Erro ao sincronizar correio.');
      }
    } finally {
      if (showToast) setIsSyncing(false);
    }
  };

  // Fetch clients, configuration & emails from PostgreSQL backend concurrently in parallel
  const loadClients = async (showSuccessToast = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Carregamento ultrarrápido em paralelo (0ms de atraso sequencial)
      const [clientsRes, accountsRes, emailsRes] = await Promise.allSettled([
        fetchClients(),
        fetchEmailAccounts(),
        fetchEmails()
      ]);

      if (clientsRes.status === 'fulfilled') {
        setClients(clientsRes.value);
      }
      if (accountsRes.status === 'fulfilled' && Array.isArray(accountsRes.value)) {
        setEmailAccounts(accountsRes.value);
        const active = accountsRes.value.find(a => a.isActive);
        if (active) {
          setEmailConfig(prev => ({
            ...prev,
            email: active.email,
            username: active.email,
            displayName: active.displayName || 'LECASU - Engenharia & Serviços',
            provider: active.provider || 'cpanel',
            incomingType: (active.incomingType || 'imap') as any,
            incomingHost: active.incomingHost,
            smtpHost: active.smtpHost,
            isConnected: true,
            lastSync: active.lastSync
          }));
        }
      }
      if (emailsRes.status === 'fulfilled' && Array.isArray(emailsRes.value)) {
        const cleanList = emailsRes.value.filter(m => !m.id?.startsWith('rc_'));
        setMessages(cleanList);
        if (cleanList.length > 0) {
          setSelectedItemId(prev => prev && cleanList.some(m => m.id === prev) ? prev : cleanList[0].id);
        }
      }

      if (showSuccessToast) {
        addToast('success', 'Atualizado com Sucesso', 'Clientes e correio sincronizados com a base de dados.');
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados:', err);
      setError(err.message || 'Falha ao conectar com o servidor API.');
      addToast('error', 'Falha na conexão', 'Não foi possível carregar os dados do servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-sync e Polling automático em segundo plano a cada 10 segundos + no foco da janela (tempo real sem precisar dar refresh)
  useEffect(() => {
    if (!emailConfig.isConnected || !emailConfig.email) return;

    handleSyncEmails(false);

    const intervalId = setInterval(() => {
      handleSyncEmails(false);
    }, 10000);

    const handleFocus = () => {
      handleSyncEmails(false);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [emailConfig.email, emailConfig.isConnected]);


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

      if (res && res.smtp_sent) {
        const updatedList = await fetchEmails();
        setMessages(updatedList);
        setSelectedItemId(res.email?.id || msg.id);
        setSelectedFolder('sent');
        setActiveSidebarTab('messages');
        addToast('success', 'E-mail Enviado!', `Mensagem enviada com sucesso para ${msg.to} via servidor SMTP.`);
      } else {
        const errorMsg = res?.message || res?.smtp_warning || 'O servidor SMTP rejeitou o envio da mensagem.';
        addToast('error', 'Falha no Envio via SMTP', errorMsg);
      }
    } catch (err: any) {
      console.error('Erro ao enviar e-mail:', err);
      addToast('error', 'Erro no Envio de E-mail', err.message || 'Falha ao processar envio no servidor.');
    }
  };

  // Delete message / move to trash with optimistic update (0ms delay) + backend sync
  const handleDeleteItem = (id: string) => {
    // 1. Atualização Otimista Imediata na UI
    setMessages(prev => prev.map(m => m.id === id ? { ...m, folder: 'trash' } : m));
    addToast('info', 'Mensagem movida para a Reciclagem', 'Pode restaurar a qualquer momento.');
    // 2. Sincronização assíncrona em segundo plano
    deleteEmail(id).catch(err => {
      console.warn('Erro ao sincronizar eliminação:', err);
    });
  };

  // Move email to any folder with optimistic update (0ms delay) + backend sync
  const handleMoveFolder = (id: string, targetFolder: string) => {
    // 1. Atualização Otimista Imediata na UI
    setMessages(prev => prev.map(m => m.id === id ? { ...m, folder: targetFolder } : m));
    const folderLabels: Record<string, string> = {
      inbox: 'A receber',
      sent: 'Enviados',
      drafts: 'Rascunhos',
      spam: 'Spam',
      trash: 'Reciclagem',
      archive: 'Arquivo'
    };
    addToast('success', 'Pasta Alterada', `Mensagem movida para "${folderLabels[targetFolder] || targetFolder}".`);
    // 2. Sincronização assíncrona em segundo plano
    moveEmailFolder(id, targetFolder).catch(err => {
      console.warn('Erro ao sincronizar movimentação de pasta:', err);
      addToast('error', 'Falha ao sincronizar pasta', err.message || 'Erro de conexão.');
    });
  };

  // Toggle Read Status with optimistic update (0ms delay) + backend sync
  const handleToggleRead = (id: string) => {
    // 1. Atualização Otimista Imediata na UI (0ms)
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: !m.isRead } : m));
    // 2. Sincronização assíncrona em segundo plano
    toggleEmailRead(id).catch(err => {
      console.warn('Erro ao sincronizar status de leitura:', err);
    });
  };

  // Download attachment handler
  const handleDownloadAttachment = (att: EmailAttachment, emailId: string) => {
    if (att.data_url) {
      const link = document.createElement('a');
      link.href = att.data_url;
      link.download = att.filename || 'anexo';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('success', 'Download Iniciado', `A transferir ${att.filename}...`);
    } else {
      const downloadEndpoint = getEmailAttachmentUrl(emailId, att.index ?? 0);
      const link = document.createElement('a');
      link.href = downloadEndpoint;
      link.download = att.filename || 'anexo';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('success', 'Download Iniciado', `A transferir ${att.filename}...`);
    }
  };

  // Format file size nicely
  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Reset page to 1 when folder or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFolder, searchQuery]);

  // Filtered Messages based on Folder and Search
  const filteredMessages = useMemo(() => {
    let result = messages;

    // Folder filtering (Roundcube folders)
    if (selectedFolder === 'inbox') {
      result = result.filter(m => m.folder === 'inbox' || !m.folder);
    } else if (selectedFolder === 'sent') {
      result = result.filter(m => m.folder === 'sent');
    } else if (selectedFolder === 'drafts') {
      result = result.filter(m => m.folder === 'drafts');
    } else if (selectedFolder === 'trash') {
      result = result.filter(m => m.folder === 'trash');
    } else if (selectedFolder === 'spam') {
      result = result.filter(m => m.folder === 'spam');
    } else if (selectedFolder === 'archive') {
      result = result.filter(m => m.folder === 'archive');
    } else if (selectedFolder === 'proposals_all') {
      result = result.filter(m => m.hasAttachment || m.attachedProposalId || (m.attachments && m.attachments.length > 0));
    } else if (selectedFolder.startsWith('client_')) {
      const cId = parseInt(selectedFolder.replace('client_', ''), 10);
      result = result.filter(m => m.clientId === cId);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(m => 
        (m.subject && m.subject.toLowerCase().includes(q)) ||
        (m.from && m.from.toLowerCase().includes(q)) ||
        (m.to && m.to.toLowerCase().includes(q)) ||
        (m.clientName && m.clientName.toLowerCase().includes(q)) ||
        (m.body && m.body.toLowerCase().includes(q))
      );
    }

    // Ordenação estrita da mensagem MAIS RECENTE no TOPO (Decrescente por Data)
    return [...result].sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    });
  }, [messages, selectedFolder, searchQuery]);


  // Paginated slice
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredMessages.length / pageSize));
  }, [filteredMessages.length, pageSize]);

  const paginatedMessages = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMessages.slice(start, start + pageSize);
  }, [filteredMessages, currentPage, pageSize]);

  // Selected item object (EmailMessage)
  const currentItem = useMemo(() => {
    if (filteredMessages.length === 0) return null;
    return filteredMessages.find(m => m.id === selectedItemId) || filteredMessages[0] || null;
  }, [selectedItemId, filteredMessages]);

  // Auto-select first item when folder changes or reset to null when empty
  useEffect(() => {
    if (filteredMessages.length > 0) {
      if (!selectedItemId || !filteredMessages.find(m => m.id === selectedItemId)) {
        setSelectedItemId(filteredMessages[0].id);
      }
    } else {
      setSelectedItemId(null);
    }
  }, [selectedFolder, filteredMessages]);

  // Folder Counts
  const folderCounts = useMemo(() => {
    return {
      inboxUnread: messages.filter(m => (m.folder === 'inbox' || !m.folder) && !m.isRead).length,
      inboxTotal: messages.filter(m => m.folder === 'inbox' || !m.folder).length,
      sentTotal: messages.filter(m => m.folder === 'sent').length,
      draftsTotal: messages.filter(m => m.folder === 'drafts').length,
      trashTotal: messages.filter(m => m.folder === 'trash').length,
      spamTotal: messages.filter(m => m.folder === 'spam').length,
      archiveTotal: messages.filter(m => m.folder === 'archive').length,
      proposalsTotal: messages.filter(m => m.hasAttachment || m.attachedProposalId || (m.attachments && m.attachments.length > 0)).length
    };
  }, [messages]);

  // Helper: Extrair e limpar Remetente (Nome, Email limpo e Iniciais para Avatar)
  const parseSenderDetails = (rawFrom?: string, rawClientName?: string) => {
    let name = (rawClientName || '').trim();
    let email = (rawFrom || '').trim();

    // Se email vier no formato "Nome Exemplo <email@dominio.com>"
    const emailMatch = email.match(/^(.*?)\s*<([^>]+)>$/);
    if (emailMatch) {
      if (!name || name === email) {
        name = emailMatch[1].trim().replace(/^["']|["']$/g, '');
      }
      email = emailMatch[2].trim();
    }

    // Se name vier no formato "Nome Exemplo <email@dominio.com>"
    const nameMatch = name.match(/^(.*?)\s*<([^>]+)>$/);
    if (nameMatch) {
      name = nameMatch[1].trim().replace(/^["']|["']$/g, '');
      if (!email || email.includes('<')) {
        email = nameMatch[2].trim();
      }
    }

    // Limpar aspas e colchetes residuais
    name = name.replace(/^["']|["']$/g, '').trim();
    email = email.replace(/^<+|>+$/g, '').trim();

    // Se name for igual ao email ou vazio, extrair nome amigável
    let displayName = name;
    if (!displayName || displayName.toLowerCase() === email.toLowerCase()) {
      if (email.includes('@')) {
        const localPart = email.split('@')[0];
        displayName = localPart.replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      } else {
        displayName = email || 'Desconhecido';
      }
    }

    // Gerar Iniciais limpas para o Avatar
    let initials = 'L';
    if (displayName && displayName.toLowerCase() !== email.toLowerCase()) {
      const parts = displayName.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        initials = (parts[0][0] + parts[1][0]).toUpperCase();
      } else if (parts.length === 1 && parts[0].length >= 2) {
        initials = parts[0].substring(0, 2).toUpperCase();
      } else if (parts.length === 1) {
        initials = parts[0][0].toUpperCase();
      }
    } else if (email) {
      initials = email.substring(0, 2).toUpperCase();
    }

    return {
      displayName,
      emailAddress: email,
      initials
    };
  };

  // Helper: Formatar lista de destinatários (To / Cc)
  const formatEmailList = (raw?: string) => {
    if (!raw) return '';
    return raw.split(',').map(item => {
      const trimmed = item.trim();
      const match = trimmed.match(/^(.*?)\s*<([^>]+)>$/);
      if (match) {
        const n = match[1].trim().replace(/^["']|["']$/g, '');
        const e = match[2].trim().replace(/^<+|>+$/g, '');
        return n ? `${n} <${e}>` : `<${e}>`;
      }
      const clean = trimmed.replace(/^<+|>+$/g, '');
      return clean.includes('@') ? `<${clean}>` : clean;
    }).join(', ');
  };

  // Helper: Sanitizar e Otimizar HTML do corpo do e-mail
  const sanitizeEmailHtml = (htmlContent: string): string => {
    if (!htmlContent) return '';
    let cleaned = htmlContent;

    // 1. Remover tags de script
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // 2. Ocultar imagens cid: residuais não resolvidas para não quebrar o layout
    cleaned = cleaned.replace(/<img\b([^>]*?)src=["']cid:[^"']*["']([^>]*?)>/gi, '');

    // 3. Adicionar fallback de erro em imagens e carregamento sob demanda
    cleaned = cleaned.replace(/<img\b(?![^>]*\bonerror=)([^>]*?)>/gi, '<img $1 onerror="this.style.display=\'none\';" loading="lazy">');

    // 4. Garantir que links externos abram em nova aba com segurança
    cleaned = cleaned.replace(/<a\b(?![^>]*\btarget=)([^>]*?)>/gi, '<a target="_blank" rel="noopener noreferrer" $1>');

    return cleaned;
  };

  // Helper: Renderizar texto puro com links clicáveis e blocos de citação
  const renderPlainTextBody = (text: string) => {
    if (!text || !text.trim()) {
      return <p className="text-slate-400 italic">Mensagem sem conteúdo de texto disponível.</p>;
    }

    const lines = text.split('\n');
    return (
      <div className="space-y-2.5 font-sans text-[13.5px] leading-relaxed text-slate-800">
        {lines.map((line, idx) => {
          if (line.trim().startsWith('>')) {
            return (
              <blockquote key={idx} className="border-l-4 border-orange-300 bg-orange-50/50 pl-3 py-1.5 text-slate-600 italic rounded-r text-xs sm:text-[13px] my-1">
                {line.replace(/^>\s?/, '')}
              </blockquote>
            );
          }

          if (!line.trim()) {
            return <div key={idx} className="h-2" />;
          }

          const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
          const parts = line.split(urlRegex);

          return (
            <p key={idx} className="leading-relaxed break-words">
              {parts.map((part, pIdx) => {
                if (part.match(/^https?:\/\//i)) {
                  return (
                    <a key={pIdx} href={part} target="_blank" rel="noopener noreferrer" className="text-[#FF8000] hover:underline font-medium break-all">
                      {part}
                    </a>
                  );
                } else if (part.match(/^www\./i)) {
                  return (
                    <a key={pIdx} href={`https://${part}`} target="_blank" rel="noopener noreferrer" className="text-[#FF8000] hover:underline font-medium break-all">
                      {part}
                    </a>
                  );
                } else if (part.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
                  return (
                    <a key={pIdx} href={`mailto:${part}`} className="text-[#FF8000] hover:underline font-mono text-xs">
                      {part}
                    </a>
                  );
                }
                return part;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  // Format Roundcube Date: "16:53" (hoje), "Sex 16:57" (esta semana), "25/09 16:57" ou "25/09/2026"
  const formatRoundcubeListDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr || '—';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');

    if (isToday) {
      return `${hours}:${mins}`;
    }

    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 7) {
      const dayName = days[d.getDay()];
      return `${dayName} ${hours}:${mins}`;
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    if (d.getFullYear() === now.getFullYear()) {
      return `${day}/${month} ${hours}:${mins}`;
    }

    return `${day}/${month}/${d.getFullYear()}`;
  };


  const formatRoundcubeFullDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${m}/${y} às ${hours}:${mins}`;
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
        
        {/* Pane 1 Header: Email da Conta & Multi-Account Switcher */}
        <div className="relative w-44 sm:w-48 px-2.5 flex items-center justify-between border-r border-slate-200 font-semibold text-slate-800 bg-[#FAFAF9] shrink-0">
          <button
            type="button"
            onClick={() => setShowAccountDropdown(!showAccountDropdown)}
            className="flex items-center gap-2 truncate text-left hover:text-[#FF8000] cursor-pointer flex-1 py-1 mr-1"
            title="Alternar conta ou gerenciar conexões de e-mail"
          >
            <div className={`w-2 h-2 rounded-full shrink-0 ${emailConfig.isConnected ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-300'}`} />
            <span className="truncate text-xs font-mono font-bold text-slate-800">
              {emailConfig.isConnected ? emailConfig.email : 'Sem Conta'}
            </span>
            <ChevronDown size={13} className="text-slate-400 shrink-0 ml-auto" />
          </button>
          
          <button
            type="button"
            onClick={() => setActiveSidebarTab('settings')}
            className="text-slate-400 hover:text-slate-800 p-1 rounded hover:bg-slate-200 transition cursor-pointer shrink-0"
            title="Ajustes Técnicos da Conta"
          >
            <Settings size={13} />
          </button>

          {/* Multi-Account Dropdown in Pane 1 */}
          {showAccountDropdown && (
            <div className="absolute left-1 top-full mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-2 text-xs divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
              <div className="pb-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 px-2 block mb-1">
                  Contas de Correio ({emailAccounts.length})
                </span>
                {emailAccounts.length === 0 ? (
                  <p className="text-slate-500 px-2 py-1 text-[11px]">Nenhuma conta ativa no momento</p>
                ) : (
                  emailAccounts.map(acc => {
                    const isCurActive = acc.isActive && emailConfig.isConnected;
                    return (
                      <div
                        key={acc.id}
                        onClick={() => handleSwitchAccount(acc.id, acc.email)}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition group ${
                          isCurActive
                            ? 'bg-orange-50 text-[#FF8000] font-semibold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isCurActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <span className="truncate text-xs font-mono">{acc.email}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block pl-3.5">
                            {acc.incomingType.toUpperCase()} • {acc.displayName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {isCurActive && (
                            <Check size={14} className="text-[#FF8000]" />
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteAccount(e, acc.id, acc.email)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer opacity-70 hover:opacity-100"
                            title={`Remover conta ${acc.email}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAccountDropdown(false);
                    setIsAccountWizardOpen(true);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded hover:bg-orange-50/60 text-slate-700 hover:text-[#FF8000] font-medium transition cursor-pointer text-left"
                >
                  <Plus size={14} className="text-[#FF8000]" />
                  <span>Adicionar Nova Conta de Correio</span>
                </button>

                {emailConfig.isConnected && (
                  <button
                    type="button"
                    onClick={handleLogoutAccount}
                    className="w-full flex items-center gap-2 p-2 rounded hover:bg-rose-50 text-rose-600 font-medium transition cursor-pointer text-left"
                  >
                    <X size={14} className="text-rose-500" />
                    <span>Desconectar Conta Atual</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pane 2 Header Actions: Escrever | Atualizar */}
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
              onClick={() => currentItem && handleMoveFolder(currentItem.id, 'archive')}
              className="hidden sm:flex items-center gap-1.5 hover:text-[#FF8000] transition cursor-pointer disabled:opacity-40 whitespace-nowrap shrink-0"
              title="Mover para o Arquivo"
            >
              <Archive size={14} className="shrink-0" />
              <span className="whitespace-nowrap">Arquivo</span>
            </button>

            {/* Spam */}
            <button
              type="button"
              disabled={!currentItem}
              onClick={() => currentItem && handleMoveFolder(currentItem.id, 'spam')}
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
          !emailConfig.isConnected ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4 shadow-sm">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Conecte uma Conta para Compor Mensagens</h2>
              <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
                Você precisa estar autenticado com uma conta de correio corporativo ativa para redigir e enviar propostas ou mensagens aos seus clientes.
              </p>
              <button
                type="button"
                onClick={() => setIsAccountWizardOpen(true)}
                className="py-2.5 px-6 bg-[#0078D4] hover:bg-[#0082E6] text-white font-semibold text-xs rounded-lg transition cursor-pointer shadow-sm flex items-center gap-2"
              >
                <div className="w-4 h-4 rounded bg-white text-[#0078D4] flex items-center justify-center text-[10px] font-black">
                  O
                </div>
                <span>Conectar Conta Agora (Outlook)</span>
              </button>
            </div>
          ) : (
            <EmailComposeView
              clients={clients}
              initialClient={composeInitialClient}
              initialProposal={composeInitialProposal}
              senderEmail={emailConfig.email}
              onSend={handleSendEmailMessage}
              onCancel={() => setActiveSidebarTab('messages')}
            />
          )
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
            <div className="w-full">
              <EmailConfigView
                currentConfig={emailConfig}
                onConfigSaved={(saved) => {
                  setEmailConfig(saved);
                  loadAccounts();
                  loadEmails();
                  addToast('success', 'Configuração Salva', 'Configurações de e-mail atualizadas com sucesso.');
                }}
                onClose={() => setActiveSidebarTab('messages')}
              />
            </div>
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
        ) : !emailConfig.isConnected ? (
          /* ================= ESTADO DESLOGADO (ZERO MENSAGENS) ================= */
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-[#0078D4] flex items-center justify-center mb-4 shadow-sm">
              <Mail size={32} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Nenhuma Conta de Correio Conectada</h2>
            <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
              Para visualizar, sincronizar e enviar mensagens reais aos seus clientes diretamente pelo sistema, conecte sua conta corporativa (ex: <code className="font-mono text-slate-700 bg-slate-200/70 px-1 py-0.5 rounded">info@lecasu.co.mz</code>).
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsAccountWizardOpen(true)}
                className="py-2.5 px-6 bg-[#0078D4] hover:bg-[#0082E6] text-white font-semibold text-xs rounded-lg transition cursor-pointer shadow-sm flex items-center gap-2"
              >
                <div className="w-4 h-4 rounded bg-white text-[#0078D4] flex items-center justify-center text-[10px] font-black">
                  O
                </div>
                <span>Conectar Conta de E-mail (Outlook)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSidebarTab('settings')}
                className="py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition cursor-pointer"
              >
                Parâmetros Manuais
              </button>
            </div>
          </div>
        ) : (
          /* ================= 3-PANE ROUNDCUBE WORKSPACE ================= */
          <div className="flex flex-1 min-h-0 overflow-hidden bg-white">
            
            {/* ---------------------------------------------------------------------
                PANE 1: ROUNDCUBE FOLDERS (A receber, Rascunhos, Enviados, etc.)
               --------------------------------------------------------------------- */}
            <div className="w-44 sm:w-48 bg-[#F8F9FA] border-r border-slate-200 flex flex-col shrink-0 min-h-0 overflow-y-auto text-xs">
            <div className="py-2 px-1.5 space-y-0.5 flex-1 min-h-0 overflow-y-auto">
              
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
                {folderCounts.inboxUnread > 0 ? (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    selectedFolder === 'inbox' ? 'bg-white text-[#FF8000]' : 'bg-[#FF8000] text-white'
                  }`}>
                    {folderCounts.inboxUnread}
                  </span>
                ) : folderCounts.inboxTotal > 0 ? (
                  <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded-full ${
                    selectedFolder === 'inbox' ? 'bg-orange-600 text-white' : 'text-slate-400'
                  }`}>
                    {folderCounts.inboxTotal}
                  </span>
                ) : null}
              </div>

              {/* Rascunhos */}
              <div
                onClick={() => setSelectedFolder('drafts')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition ${
                  selectedFolder === 'drafts'
                    ? 'bg-[#FF8000] text-white font-semibold shadow-2xs'
                    : 'text-slate-700 hover:bg-orange-50/70 hover:text-[#FF8000]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Edit3 size={15} className={selectedFolder === 'drafts' ? 'text-white' : 'text-slate-500'} />
                  <span>Rascunhos</span>
                </div>
                {folderCounts.draftsTotal > 0 && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded-full ${
                    selectedFolder === 'drafts' ? 'bg-white text-[#FF8000]' : 'text-slate-400'
                  }`}>
                    {folderCounts.draftsTotal}
                  </span>
                )}
              </div>

              {/* Enviados */}
              <div
                onClick={() => setSelectedFolder('sent')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition ${
                  selectedFolder === 'sent'
                    ? 'bg-[#FF8000] text-white font-semibold shadow-2xs'
                    : 'text-slate-700 hover:bg-orange-50/70 hover:text-[#FF8000]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Send size={15} className={selectedFolder === 'sent' ? 'text-white' : 'text-slate-500'} />
                  <span>Enviados</span>
                </div>
                {folderCounts.sentTotal > 0 && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded-full ${
                    selectedFolder === 'sent' ? 'bg-white text-[#FF8000]' : 'text-slate-400'
                  }`}>
                    {folderCounts.sentTotal}
                  </span>
                )}
              </div>

              {/* Spam */}
              <div
                onClick={() => setSelectedFolder('spam')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition ${
                  selectedFolder === 'spam'
                    ? 'bg-[#FF8000] text-white font-semibold shadow-2xs'
                    : 'text-slate-700 hover:bg-orange-50/70 hover:text-[#FF8000]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertOctagon size={15} className={selectedFolder === 'spam' ? 'text-white' : 'text-slate-500'} />
                  <span>Spam</span>
                </div>
                {folderCounts.spamTotal > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    selectedFolder === 'spam' ? 'bg-white text-[#FF8000]' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {folderCounts.spamTotal}
                  </span>
                )}
              </div>

              {/* Reciclagem (Trash) */}
              <div
                onClick={() => setSelectedFolder('trash')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition ${
                  selectedFolder === 'trash'
                    ? 'bg-[#FF8000] text-white font-semibold shadow-2xs'
                    : 'text-slate-700 hover:bg-orange-50/70 hover:text-[#FF8000]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Trash2 size={15} className={selectedFolder === 'trash' ? 'text-white' : 'text-slate-500'} />
                  <span>Reciclagem</span>
                </div>
                {folderCounts.trashTotal > 0 && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded-full ${
                    selectedFolder === 'trash' ? 'bg-white text-[#FF8000]' : 'text-slate-400'
                  }`}>
                    {folderCounts.trashTotal}
                  </span>
                )}
              </div>

              {/* Arquivo */}
              <div
                onClick={() => setSelectedFolder('archive')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition ${
                  selectedFolder === 'archive'
                    ? 'bg-[#FF8000] text-white font-semibold shadow-2xs'
                    : 'text-slate-700 hover:bg-orange-50/70 hover:text-[#FF8000]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Archive size={15} className={selectedFolder === 'archive' ? 'text-white' : 'text-slate-500'} />
                  <span>Arquivo</span>
                </div>
                {folderCounts.archiveTotal > 0 && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded-full ${
                    selectedFolder === 'archive' ? 'bg-white text-[#FF8000]' : 'text-slate-400'
                  }`}>
                    {folderCounts.archiveTotal}
                  </span>
                )}
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
              PANE 2: ROUNDCUBE MESSAGE LIST (Lista Fiel ao Roundcube com Paginação)
             --------------------------------------------------------------------- */}
          <div className="w-80 sm:w-96 lg:w-[380px] bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-0 overflow-hidden text-xs">
            
            {/* Roundcube Search Bar: 🔍 Pesquisar... + Filter Icon */}
            <div className="p-2 border-b border-slate-200 bg-[#FAFAF9] flex items-center gap-1.5 shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar remetente, assunto, texto..."
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
              {paginatedMessages.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Mail size={28} className="mx-auto mb-2 opacity-30 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-600">Nenhuma mensagem nesta pasta</p>
                  {searchQuery && <p className="text-[11px] text-slate-400 mt-1">Tente ajustar sua busca.</p>}
                </div>
              ) : (
                paginatedMessages.map(msg => {
                  const isSelected = currentItem?.id === msg.id;
                  const hasAtt = Boolean(msg.hasAttachment || (msg.attachments && msg.attachments.length > 0));
                  const senderInfo = parseSenderDetails(msg.from, msg.clientName);
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
                          {senderInfo.displayName}
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
                          {msg.subject || '(Sem assunto)'}
                        </p>
                        {hasAtt && (
                          <Paperclip size={12} className="text-slate-400 shrink-0" />
                        )}
                      </div>

                      {/* Linha 3 (Opcional): Tag da Proposta ou Anexos */}
                      {msg.attachedProposalId ? (
                        <div className="mt-1 flex items-center justify-between text-[10px]">
                          <span className="text-[#FF8000] font-semibold">
                            Proposta #{msg.attachedProposalId}
                          </span>
                        </div>
                      ) : (msg.attachments && msg.attachments.length > 0) ? (
                        <div className="mt-0.5 text-[10px] text-slate-400 flex items-center gap-1">
                          <span>{msg.attachments.length} anexo(s)</span>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>

            {/* Roundcube Bottom Pagination Bar com controles reais */}
            <div className="px-3 py-2 bg-[#F0F2F5] border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between shrink-0 font-sans">
              <span className="font-medium text-slate-700">
                {filteredMessages.length === 0 ? (
                  '0 mensagens'
                ) : (
                  `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredMessages.length)} de ${filteredMessages.length}`
                )}
              </span>
              <div className="flex items-center gap-1">
                <button 
                  type="button" 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                  className="p-1 hover:text-[#FF8000] hover:bg-white rounded transition text-slate-500 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed" 
                  title="Página anterior"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="px-2 py-0.5 bg-white border border-slate-300 rounded text-slate-800 font-bold text-[10px] shadow-2xs">
                  {currentPage} / {totalPages}
                </span>
                <button 
                  type="button" 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1 hover:text-[#FF8000] hover:bg-white rounded transition text-slate-500 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed" 
                  title="Próxima página"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

          </div>

          {/* ---------------------------------------------------------------------
              PANE 3: ROUNDCUBE READING PANE (Estrutura Fiel, Tipografia e Imagens)
             --------------------------------------------------------------------- */}
          <div className="flex-1 bg-slate-50/60 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-6">
            {currentItem ? (() => {
              const currentSender = parseSenderDetails(currentItem.from, currentItem.clientName);
              const folderLabel = currentItem.folder === 'sent' 
                ? 'Enviados' 
                : currentItem.folder === 'trash' 
                ? 'Reciclagem' 
                : currentItem.folder === 'spam' 
                ? 'Spam' 
                : currentItem.folder === 'archive' 
                ? 'Arquivo' 
                : currentItem.folder === 'drafts' 
                ? 'Rascunhos' 
                : 'A receber';

              return (
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-7 max-w-4xl mx-auto w-full flex flex-col min-h-full shadow-2xs">
                  
                  {/* 1. Subject Title com Badge de Pasta */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 border text-[10px] font-bold uppercase rounded-md tracking-wider ${
                        currentItem.folder === 'sent' 
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : currentItem.folder === 'trash'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : currentItem.folder === 'spam'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : currentItem.folder === 'archive'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : currentItem.folder === 'drafts'
                          ? 'bg-slate-100 text-slate-700 border-slate-300'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {folderLabel}
                      </span>

                      {currentItem.attachedProposalId && (
                        <span className="px-2.5 py-0.5 bg-orange-50 text-[#FF8000] border border-orange-200 text-[10px] font-bold rounded-md">
                          Proposta #{currentItem.attachedProposalId}
                        </span>
                      )}
                    </div>

                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug break-words">
                      {currentItem.subject || '(Sem assunto)'}
                    </h1>
                  </div>

                  {/* 2. Sender / Recipients Info Card Estruturado e Harmonioso */}
                  <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-xl p-3.5 sm:p-4 mb-5 shadow-2xs">
                    <div className="flex items-start gap-3.5">
                      {/* Avatar com Gradiente Suave e Iniciais Limpas */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 text-[#FF8000] border border-orange-200 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs tracking-wider">
                        {currentSender.initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Linha Superior: Remetente + Data e Hora alinhada */}
                        <div className="flex items-baseline justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span className="text-xs font-semibold text-slate-500">De:</span>
                            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {currentSender.displayName}
                            </span>
                            {currentSender.emailAddress && (
                              <span className="text-[11px] text-slate-400 font-mono truncate">
                                &lt;{currentSender.emailAddress}&gt;
                              </span>
                            )}
                          </div>

                          {/* Data e Hora */}
                          <div className="text-[11px] text-slate-500 font-mono font-medium shrink-0 ml-auto">
                            {formatRoundcubeFullDate(currentItem.date)}
                          </div>
                        </div>

                        {/* Linha Inferior: Destinatário + Ações de Detalhes / Modo Texto */}
                        <div className="flex items-center justify-between gap-3 mt-2.5 pt-2.5 border-t border-slate-200/60 flex-wrap">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0 truncate">
                            <span className="text-slate-400 font-medium">Para:</span>
                            <span className="text-slate-800 font-medium truncate font-mono text-[11px]">
                              {formatEmailList(currentItem.to)}
                            </span>
                            {currentItem.cc && (
                              <span className="text-slate-400 text-[11px] font-mono ml-2 truncate">
                                (Cc: {formatEmailList(currentItem.cc)})
                              </span>
                            )}
                          </div>

                          {/* Botões de Ação Contextuais */}
                          <div className="flex items-center gap-2 shrink-0 ml-auto">
                            <button
                              type="button"
                              onClick={() => setShowDetailsHeader(!showDetailsHeader)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                                showDetailsHeader
                                  ? 'bg-orange-50 border-orange-200 text-[#FF8000]'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-2xs'
                              }`}
                            >
                              <Mail size={12} className={showDetailsHeader ? 'text-[#FF8000]' : 'text-slate-400'} />
                              <span>{showDetailsHeader ? 'Ocultar Detalhes' : 'Detalhes'}</span>
                            </button>

                            {currentItem.bodyHtml && (
                              <button
                                type="button"
                                onClick={() => setBodyViewMode(prev => prev === 'html' ? 'text' : 'html')}
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-orange-200 bg-orange-50 hover:bg-orange-100 text-[#FF8000] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="Alternar entre visualização HTML rica e Texto Simples"
                              >
                                <span>{bodyViewMode === 'html' ? '≡ Modo Texto' : '🌐 Modo HTML'}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Painel expansível de Detalhes Técnicos */}
                        {showDetailsHeader && (
                          <div className="mt-3 p-3 bg-white border border-slate-200 rounded-lg font-mono text-[11px] text-slate-700 space-y-1 shadow-2xs">
                            <div className="grid grid-cols-[85px_1fr] gap-1">
                              <span className="text-slate-400 font-semibold">Remetente:</span>
                              <span className="text-slate-900 break-all">{currentItem.from}</span>
                              
                              <span className="text-slate-400 font-semibold">Destinatário:</span>
                              <span className="text-slate-900 break-all">{currentItem.to}</span>

                              {currentItem.cc && (
                                <>
                                  <span className="text-slate-400 font-semibold">Cópia (Cc):</span>
                                  <span className="text-slate-900 break-all">{currentItem.cc}</span>
                                </>
                              )}

                              <span className="text-slate-400 font-semibold">Data RFC:</span>
                              <span className="text-slate-900">{currentItem.date}</span>

                              <span className="text-slate-400 font-semibold">Assunto:</span>
                              <span className="text-slate-900 break-all">{currentItem.subject || '(Sem assunto)'}</span>

                              <span className="text-slate-400 font-semibold">Pasta:</span>
                              <span className="text-slate-900 uppercase font-bold text-[10px]">{currentItem.folder}</span>

                              <span className="text-slate-400 font-semibold">ID Registo:</span>
                              <span className="text-slate-500">{currentItem.id}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. Attachment Cards Section (Downloads Reais com Ícones e Tamanho) */}
                  {Boolean(currentItem.hasAttachment || (currentItem.attachments && currentItem.attachments.length > 0) || currentItem.attachedProposalId) && (
                    <div className="mb-6 p-3.5 bg-[#F8F9FA] border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-600 font-semibold mb-1">
                        <div className="flex items-center gap-1.5">
                          <Paperclip size={14} className="text-[#FF8000]" />
                          <span>Ficheiros Anexados ({currentItem.attachments?.length || 1})</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-normal">Clique para transferir</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {currentItem.attachments && currentItem.attachments.length > 0 ? (
                          currentItem.attachments.map((att, idx) => {
                            const ext = (att.filename || '').split('.').pop()?.toLowerCase() || '';
                            return (
                              <div
                                key={idx}
                                className="p-2.5 bg-white hover:bg-orange-50/40 border border-slate-200 hover:border-orange-200 rounded-lg flex items-center justify-between text-xs transition gap-2 shadow-2xs group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  {ext === 'pdf' ? (
                                    <FileIcon size={18} className="text-rose-500 shrink-0" />
                                  ) : ['xlsx', 'xls', 'csv'].includes(ext) ? (
                                    <FileSpreadsheet size={18} className="text-emerald-600 shrink-0" />
                                  ) : ['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext) ? (
                                    <ImageIcon size={18} className="text-indigo-500 shrink-0" />
                                  ) : ['zip', 'rar', '7z'].includes(ext) ? (
                                    <Archive size={18} className="text-amber-500 shrink-0" />
                                  ) : (
                                    <FileText size={18} className="text-[#FF8000] shrink-0" />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <span 
                                      onClick={() => handleDownloadAttachment(att, currentItem.id)}
                                      className="font-semibold text-slate-800 hover:text-[#FF8000] cursor-pointer truncate block" 
                                      title={att.filename}
                                    >
                                      {att.filename}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {formatFileSize(att.size_bytes)}
                                    </span>
                                  </div>
                                </div>

                                {/* Botão de Download */}
                                <button
                                  type="button"
                                  onClick={() => handleDownloadAttachment(att, currentItem.id)}
                                  className="p-1.5 text-slate-400 group-hover:text-[#FF8000] group-hover:bg-orange-100/70 rounded-md transition cursor-pointer shrink-0"
                                  title={`Baixar ${att.filename}`}
                                >
                                  <Download size={15} />
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          /* Fallback para Proposta Comercial */
                          <div className="p-2.5 bg-white hover:bg-orange-50/40 border border-slate-200 hover:border-orange-200 rounded-lg flex items-center justify-between text-xs transition gap-2 shadow-2xs group">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <FileIcon size={18} className="text-rose-500 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span 
                                  onClick={() => handleDownloadAttachment({ index: 0, filename: `Proposta_${currentItem.attachedProposalId || 'LECASU'}.pdf`, size_bytes: 850000 }, currentItem.id)}
                                  className="font-semibold text-slate-800 hover:text-[#FF8000] cursor-pointer truncate block"
                                >
                                  {currentItem.attachedProposalTitle ? `Proposta_${currentItem.attachedProposalId}_${currentItem.attachedProposalTitle.replace(/\s+/g, '_')}.pdf` : 'Proposta_Comercial_LECASU.pdf'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">~850 KB • PDF</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDownloadAttachment({ index: 0, filename: `Proposta_${currentItem.attachedProposalId || 'LECASU'}.pdf`, size_bytes: 850000 }, currentItem.id)}
                              className="p-1.5 text-slate-400 group-hover:text-[#FF8000] group-hover:bg-orange-100/70 rounded-md transition cursor-pointer shrink-0"
                              title="Baixar Proposta em PDF"
                            >
                              <Download size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 4. Roundcube Email Body (Renderização Rica, Tipografia Limpa e Imagens Responsivas) */}
                  <div className="bg-white rounded-xl border border-slate-100 p-4 sm:p-5 mb-6 min-h-[160px] text-xs sm:text-[13.5px] leading-relaxed font-sans text-slate-800">
                    {currentItem.bodyHtml && bodyViewMode === 'html' ? (
                      <div 
                        className="email-html-body overflow-x-auto max-w-full text-[13.5px] leading-relaxed select-text font-sans [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_img]:my-2.5 [&_img]:shadow-2xs [&_img[src='']]:hidden [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:my-3.5 [&_td]:p-2.5 [&_th]:p-2.5 [&_a]:text-[#FF8000] [&_a]:underline [&_a]:font-medium [&_p]:my-2.5 [&_p]:leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-3 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-800 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-orange-300 [&_blockquote]:bg-orange-50/40 [&_blockquote]:p-3 [&_blockquote]:rounded-r-md [&_blockquote]:my-3 [&_blockquote]:text-slate-600 [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:p-3.5 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:text-xs [&_pre]:font-mono"
                        dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(currentItem.bodyHtml) }}
                      />
                    ) : (
                      renderPlainTextBody(currentItem.body)
                    )}
                  </div>

                  {/* 5. Roundcube Signature (Totalmente Isolada com Clearfix para Não Sobrepor Texto) */}
                  {((currentItem.folder === 'sent' || currentItem.from.toLowerCase().includes('lecasu.co.mz')) && (!currentItem.bodyHtml || currentItem.bodyHtml.includes('LECASU - Engenharia & Serviços') === false)) && (
                    <div className="clear-both pt-6 border-t border-slate-200 mt-auto text-xs">
                      <div className="flex items-start gap-3.5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                        <div className="w-1 self-stretch bg-[#FF8000] rounded-full shrink-0 min-h-[52px]" />
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {currentSender.displayName || 'LECASU Engenharia & Serviços'}
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
                            <a href="mailto:info@lecasu.co.mz" className="text-[#FF8000] hover:underline font-mono">
                              info@lecasu.co.mz
                            </a>
                            <span>•</span>
                            <span className="text-slate-400">www.lecasu.co.mz</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              );
            })() : (
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
            loadAccounts();
            loadEmails();
            handleSyncEmails(true);
            addToast('success', 'Conta Conectada', `Conta ${cfg.email} conectada com êxito!`);
          }}
        />
      )}

    </div>
  );
};
