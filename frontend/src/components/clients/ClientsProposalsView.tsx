import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  RefreshCw, 
  AlertCircle,
  FileSpreadsheet, 
  FileText,
  Send,
  Inbox,
  CheckCircle2,
  Trash2,
  Archive,
  Reply,
  ReplyAll,
  Forward,
  Settings,
  ShieldCheck,
  Paperclip,
  ChevronDown,
  LayoutGrid,
  Check,
  Minimize2,
  Maximize2,
  X
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

  // View Mode: 'outlook' (default, modern Office UI) or 'crm' (tabular CRM)
  const [viewMode, setViewMode] = useState<'outlook' | 'crm'>('outlook');
  const [isModernOutlook, setIsModernOutlook] = useState(true);

  // Active Ribbon Tab in Outlook mode
  const [activeRibbonTab, setActiveRibbonTab] = useState<'home' | 'send_receive' | 'proposals' | 'view'>('home');

  // Active Left Rail Icon: 'mail' | 'proposals' | 'contacts' | 'settings'
  const [activeRail, setActiveRail] = useState<'mail' | 'proposals' | 'contacts' | 'settings'>('mail');

  // Selected Folder in Outlook Tree
  // 'inbox' | 'sent' | 'proposals_all' | 'proposals_pending' | 'proposals_accepted' | 'drafts' | 'trash' | 'client_[id]'
  const [selectedFolder, setSelectedFolder] = useState<string>('inbox');
  const [messageFilterTab, setMessageFilterTab] = useState<'all' | 'unread' | 'proposals'>('all');

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

      // Seed initial realistic communications if messages are empty
      setMessages(prev => {
        if (prev.length > 0) return prev;

        const seeded: EmailMessage[] = [];
        data.forEach((client, idx) => {
          // If client has proposals, create sent & accepted records
          if (client.proposals && client.proposals.length > 0) {
            client.proposals.forEach((p, pIdx) => {
              seeded.push({
                id: `seed_prop_${client.id}_${p.id}`,
                clientId: client.id,
                clientName: client.name,
                from: emailConfig.email,
                to: client.email || `${client.name.toLowerCase().replace(/\s+/g, '')}@empresa.co.mz`,
                subject: `Proposta Comercial #${p.id} - ${p.title} | LECASU Engenharia`,
                body: `Prezado(a) ${client.contact_person || client.name},\n\nConforme solicitado, enviamos em anexo a proposta técnica e comercial referente a "${p.title}".\n\nValor Global: ${formatMZN(Number(p.total_amount) || 0)}.\n\nFicamos à inteira disposição para ajustes necessários.\n\nAtenciosamente,\n${emailConfig.displayName}`,
                date: p.created_at || new Date(Date.now() - (idx * 86400000 + pIdx * 3600000)).toISOString(),
                isRead: true,
                hasAttachment: true,
                attachedProposalId: p.id,
                attachedProposalTitle: p.title,
                attachedProposalAmount: Number(p.total_amount),
                folder: 'sent'
              });

              if (p.status === 'ACCEPTED') {
                seeded.push({
                  id: `seed_reply_${client.id}_${p.id}`,
                  clientId: client.id,
                  clientName: client.name,
                  from: client.email || `gerencia@${client.name.toLowerCase().replace(/\s+/g, '')}.co.mz`,
                  to: emailConfig.email,
                  subject: `Re: Proposta Comercial #${p.id} - Aprovada pelo Conselho Executivo`,
                  body: `Prezada equipa da LECASU,\n\nTemos o prazer de informar que a vossa proposta comercial para "${p.title}" foi aprovada sem ressalvas.\n\nPor favor, deem seguimento à elaboração do cronograma executivo e minuta contratual.\n\nCumprimentos,\n${client.contact_person || 'Diretoria'} - ${client.name}`,
                  date: new Date(Date.now() - (idx * 43200000)).toISOString(),
                  isRead: idx === 0 ? false : true,
                  hasAttachment: false,
                  attachedProposalId: p.id,
                  attachedProposalTitle: p.title,
                  attachedProposalAmount: Number(p.total_amount),
                  folder: 'inbox'
                });
              }
            });
          } else {
            // General inquiry email
            seeded.push({
              id: `seed_inquiry_${client.id}`,
              clientId: client.id,
              clientName: client.name,
              from: client.email || `compras@${client.name.toLowerCase().replace(/\s+/g, '')}.co.mz`,
              to: emailConfig.email,
              subject: `Solicitação de Cotação e Apresentação de Serviços - ${client.name}`,
              body: `Prezados senhores da LECASU,\n\nSolicitamos a vossa cotação para serviços de engenharia e consultoria técnica para as nossas instalações.\n\nAgradecemos o envio do portfólio e proposta preliminar.\n\nMelhores cumprimentos,\n${client.contact_person || client.name}`,
              date: new Date(Date.now() - (idx * 90000000)).toISOString(),
              isRead: false,
              hasAttachment: false,
              folder: 'inbox'
            });
          }
        });

        return seeded;
      });

      if (showSuccessToast) {
        addToast('success', 'Sincronização Concluída', 'Pastas de correio e clientes atualizados.');
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

    // Auto-create proposal email in sent folder
    const targetClient = clients.find(c => c.id === payload.client_id);
    const newSentProposalMsg: EmailMessage = {
      id: `prop_sent_${created.id}_${Date.now()}`,
      clientId: payload.client_id,
      clientName: targetClient?.name || 'Cliente LECASU',
      from: emailConfig.email,
      to: targetClient?.email || 'cliente@empresa.co.mz',
      subject: `Proposta Comercial #${created.id} - ${created.title} | LECASU`,
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
    addToast('info', 'Item movido para a Lixeira', 'Pode restaurar a qualquer momento.');
  };

  // Mark unread / read
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

  // Filtered Messages based on Folder, Search & Tabs
  const filteredMessages = useMemo(() => {
    let result = messages;

    // Folder filtering
    if (selectedFolder === 'inbox') {
      result = result.filter(m => m.folder === 'inbox');
    } else if (selectedFolder === 'sent') {
      result = result.filter(m => m.folder === 'sent');
    } else if (selectedFolder === 'drafts') {
      result = result.filter(m => m.folder === 'drafts');
    } else if (selectedFolder === 'trash') {
      result = result.filter(m => m.folder === 'trash');
    } else if (selectedFolder === 'proposals_all') {
      result = result.filter(m => m.hasAttachment || m.attachedProposalId);
    } else if (selectedFolder.startsWith('client_')) {
      const cId = parseInt(selectedFolder.replace('client_', ''), 10);
      result = result.filter(m => m.clientId === cId);
    }

    // Message tab filter
    if (messageFilterTab === 'unread') {
      result = result.filter(m => !m.isRead);
    } else if (messageFilterTab === 'proposals') {
      result = result.filter(m => m.hasAttachment || m.attachedProposalId);
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
  }, [messages, selectedFolder, messageFilterTab, searchQuery]);

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

  const sentCount = useMemo(() => {
    return messages.filter(m => m.folder === 'sent').length;
  }, [messages]);

  // Truncate helper at 45 characters as established
  const truncate45 = (text?: string | null, limit = 45): string => {
    if (!text) return '';
    return text.length > limit ? `${text.slice(0, limit)}...` : text;
  };

  // Format Date for Outlook
  const formatOutlookDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-[640px] font-sans select-none rounded-xl overflow-hidden border border-[#3C3C3C] shadow-2xl bg-[#1F1F1F] text-slate-100">
      <Toast toasts={toasts} onDismiss={removeToast} />

      {error && (
        <div className="bg-rose-950/80 border-b border-rose-800 text-rose-200 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadClients()} className="underline hover:text-white font-semibold">Tentar novamente</button>
        </div>
      )}

      {/* =========================================================================
          1. OUTLOOK TOP WINDOW BAR (Pesquisar, Avatar, Switch Moderno)
         ========================================================================= */}
      <div className="bg-[#1A1A1A] text-white px-3 py-1.5 flex items-center justify-between border-b border-[#2D2D2D] shrink-0 text-xs">
        
        {/* Left: App Logo / Name */}
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-[#0078D4] flex items-center justify-center font-bold text-[11px] text-white shadow-xs">
            O
          </div>
          <span className="font-semibold text-white tracking-wide flex items-center gap-1.5">
            <span>Microsoft Outlook</span>
            <span className="text-[10px] bg-[#0078D4]/20 text-[#0078D4] px-1.5 py-0.2 rounded font-mono">LECASU ERP</span>
          </span>

          <div className="h-3 w-px bg-neutral-700 mx-1" />

          {/* Quick Action Icons */}
          <button
            type="button"
            onClick={() => loadClients(true)}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition"
            title="Enviar / Receber (F9)"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-[#0078D4]' : ''} />
          </button>
        </div>

        {/* Center: Outlook Global Search Bar */}
        <div className="relative w-80 sm:w-96 max-w-md">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar clientes, propostas ou e-mails... (Ctrl+E)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1 bg-[#2C2C2C] hover:bg-[#333333] focus:bg-[#252525] border border-transparent focus:border-[#0078D4] rounded-md text-[11px] text-white placeholder-neutral-400 focus:outline-none transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Right: Switch "Experimente o novo Outlook" & User Avatar */}
        <div className="flex items-center space-x-3">
          
          {/* Switch: Experimente o novo Outlook */}
          <div className="hidden md:flex items-center space-x-2 text-[11px] text-neutral-300">
            <span>Experimente o novo Outlook</span>
            <button
              type="button"
              onClick={() => setIsModernOutlook(!isModernOutlook)}
              className={`w-9 h-4.5 rounded-full transition-colors relative cursor-pointer ${
                isModernOutlook ? 'bg-[#0078D4]' : 'bg-neutral-600'
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  isModernOutlook ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <div className="h-4 w-px bg-neutral-700 hidden md:block" />

          {/* Account Avatar */}
          <div 
            onClick={() => setIsEmailConfigModalOpen(true)}
            className="flex items-center space-x-1.5 cursor-pointer p-0.5 rounded hover:bg-neutral-800 transition"
            title={`Conta conectada: ${emailConfig.email} (Clique para configurar)`}
          >
            <div className="w-6 h-6 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-[11px] border border-orange-400 shadow-xs">
              J
            </div>
            <span className="text-[11px] font-medium text-neutral-200 hidden lg:inline truncate max-w-[120px]">
              {emailConfig.email.split('@')[0]}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Online & Conectado" />
          </div>

          {/* Window control buttons */}
          <div className="flex items-center space-x-1 text-neutral-400">
            <span className="p-1 hover:text-white cursor-pointer"><Minimize2 size={11} /></span>
            <span className="p-1 hover:text-white cursor-pointer"><Maximize2 size={11} /></span>
          </div>

        </div>

      </div>

      {/* =========================================================================
          2. OUTLOOK RIBBON (Faixa de Opções Superior)
         ========================================================================= */}
      <div className="bg-[#2B2B2B] text-slate-200 border-b border-[#3C3C3C] shrink-0 text-xs">
        
        {/* Ribbon Tab Bar */}
        <div className="flex items-center space-x-0.5 px-2 pt-1 border-b border-[#333333] text-[11px]">
          <button
            type="button"
            onClick={() => setIsEmailConfigModalOpen(true)}
            className="px-3 py-1 font-semibold text-neutral-300 hover:text-white transition"
          >
            Arquivo
          </button>

          <button
            type="button"
            onClick={() => setActiveRibbonTab('home')}
            className={`px-3 py-1 font-semibold transition border-b-2 ${
              activeRibbonTab === 'home'
                ? 'border-[#0078D4] text-white bg-[#333333]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Página Inicial
          </button>

          <button
            type="button"
            onClick={() => setActiveRibbonTab('send_receive')}
            className={`px-3 py-1 font-semibold transition border-b-2 ${
              activeRibbonTab === 'send_receive'
                ? 'border-[#0078D4] text-white bg-[#333333]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Enviar/Receber
          </button>

          <button
            type="button"
            onClick={() => setActiveRibbonTab('proposals')}
            className={`px-3 py-1 font-semibold transition border-b-2 ${
              activeRibbonTab === 'proposals'
                ? 'border-[#0078D4] text-white bg-[#333333]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Propostas & Contratos
          </button>

          <button
            type="button"
            onClick={() => setActiveRibbonTab('view')}
            className={`px-3 py-1 font-semibold transition border-b-2 ${
              activeRibbonTab === 'view'
                ? 'border-[#0078D4] text-white bg-[#333333]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Exibir
          </button>

          {/* Quick CRM Mode Toggle in Ribbon */}
          <div className="ml-auto flex items-center gap-1.5 pb-0.5">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'outlook' ? 'crm' : 'outlook')}
              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#3A3A3A] hover:bg-[#444444] text-white border border-[#4C4C4C] transition flex items-center gap-1.5 cursor-pointer"
            >
              <LayoutGrid size={12} className="text-orange-400" />
              <span>{viewMode === 'outlook' ? 'Ver Tabela CRM' : 'Ver Modo Outlook'}</span>
            </button>
          </div>
        </div>

        {/* Ribbon Content Bar (matching the user reference image) */}
        <div className="px-3 py-1.5 flex items-center gap-2 overflow-x-auto scrollbar-none text-[11px]">
          
          {/* Group 1: NOVO */}
          <div className="flex items-center space-x-1 pr-2 border-r border-[#3D3D3D]">
            
            {/* Novo Email (Grande Botão) */}
            <button
              type="button"
              onClick={() => handleOpenCompose()}
              className="flex flex-col items-center justify-center px-2.5 py-1 rounded bg-[#0078D4] hover:bg-[#106EBE] text-white shadow-xs transition cursor-pointer group active:scale-95"
              title="Compor Novo E-mail (Ctrl+N)"
            >
              <div className="flex items-center gap-1">
                <Mail size={15} />
                <span className="font-bold">Novo</span>
              </div>
              <span className="text-[10px] opacity-90">Email</span>
            </button>

            {/* Nova Proposta */}
            <button
              type="button"
              onClick={() => setIsProposalModalOpen(true)}
              className="flex flex-col items-center justify-center px-2 py-1 rounded hover:bg-white/10 text-neutral-200 transition cursor-pointer"
              title="Elaborar Proposta Comercial para Cliente"
            >
              <FileSpreadsheet size={15} className="text-orange-400" />
              <span className="text-[10px] mt-0.5 font-medium">+ Proposta</span>
            </button>

            {/* Novo Cliente */}
            <button
              type="button"
              onClick={() => setIsClientModalOpen(true)}
              className="flex flex-col items-center justify-center px-2 py-1 rounded hover:bg-white/10 text-neutral-200 transition cursor-pointer"
              title="Registar Novo Cliente no ERP"
            >
              <Users size={15} className="text-emerald-400" />
              <span className="text-[10px] mt-0.5 font-medium">+ Cliente</span>
            </button>
          </div>

          {/* Group 2: EXCLUIR */}
          <div className="flex items-center space-x-1 pr-2 border-r border-[#3D3D3D]">
            <button
              type="button"
              disabled={!currentItem}
              onClick={() => currentItem && handleDeleteItem(currentItem.id)}
              className="flex flex-col items-center justify-center px-2 py-1 rounded hover:bg-rose-500/20 text-neutral-200 hover:text-rose-300 transition cursor-pointer disabled:opacity-40"
              title="Excluir item selecionado"
            >
              <Trash2 size={14} className="text-rose-400" />
              <span className="text-[10px] mt-0.5">Excluir</span>
            </button>

            <button
              type="button"
              disabled={!currentItem}
              onClick={() => addToast('info', 'Item Arquivado', 'Mensagem transferida para o arquivo histórico.')}
              className="flex flex-col items-center justify-center px-2 py-1 rounded hover:bg-white/10 text-neutral-200 transition cursor-pointer disabled:opacity-40"
              title="Arquivar"
            >
              <Archive size={14} />
              <span className="text-[10px] mt-0.5">Arquivar</span>
            </button>
          </div>

          {/* Group 3: RESPONDER */}
          <div className="flex items-center space-x-1 pr-2 border-r border-[#3D3D3D]">
            <button
              type="button"
              disabled={!currentItem}
              onClick={() => currentItem && handleOpenCompose(clients.find(c => c.id === currentItem.clientId))}
              className="flex flex-col items-center justify-center px-2 py-1 rounded hover:bg-white/10 text-neutral-200 transition cursor-pointer disabled:opacity-40"
              title="Responder ao remetente"
            >
              <Reply size={14} />
              <span className="text-[10px] mt-0.5">Responder</span>
            </button>

            <button
              type="button"
              disabled={!currentItem}
              onClick={() => currentItem && handleOpenCompose(clients.find(c => c.id === currentItem.clientId))}
              className="flex flex-col items-center justify-center px-2 py-1 rounded hover:bg-white/10 text-neutral-200 transition cursor-pointer disabled:opacity-40"
              title="Responder a todos"
            >
              <ReplyAll size={14} />
              <span className="text-[10px] mt-0.5">A Todos</span>
            </button>

            <button
              type="button"
              disabled={!currentItem}
              onClick={() => addToast('info', 'Encaminhar', 'Selecione o destinatário para encaminhar.')}
              className="flex flex-col items-center justify-center px-2 py-1 rounded hover:bg-white/10 text-neutral-200 transition cursor-pointer disabled:opacity-40"
              title="Encaminhar e-mail"
            >
              <Forward size={14} />
              <span className="text-[10px] mt-0.5">Encaminhar</span>
            </button>
          </div>

          {/* Group 4: ETAPAS RÁPIDAS & MARCAS */}
          <div className="flex items-center space-x-1 pr-2 border-r border-[#3D3D3D]">
            <button
              type="button"
              disabled={!currentItem}
              onClick={() => currentItem && handleToggleRead(currentItem.id)}
              className="flex flex-col items-center justify-center px-2 py-1 rounded hover:bg-white/10 text-neutral-200 transition cursor-pointer disabled:opacity-40"
              title="Marcar como Lido/Não Lido"
            >
              <Mail size={14} className={currentItem?.isRead ? 'text-neutral-400' : 'text-[#0078D4]'} />
              <span className="text-[10px] mt-0.5">Não Lido/Lido</span>
            </button>

            {currentItem?.attachedProposalId && (
              <button
                type="button"
                onClick={() => {
                  const prop = allProposals.find(p => p.proposal.id === currentItem.attachedProposalId);
                  if (prop) handleConvertToProject(prop.proposal);
                }}
                className="flex flex-col items-center justify-center px-2 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 transition cursor-pointer"
                title="Aprovar Proposta e Gerar Projeto Executivo no Módulo 04"
              >
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span className="text-[10px] mt-0.5 font-bold">Aprovar Proposta</span>
              </button>
            )}
          </div>

          {/* Group 5: LOCALIZAR & CLIENTES */}
          <div className="flex items-center space-x-1 pr-2 border-r border-[#3D3D3D]">
            <button
              type="button"
              onClick={() => setActiveRail('contacts')}
              className="flex flex-col items-center justify-center px-2 py-1 rounded hover:bg-white/10 text-neutral-200 transition cursor-pointer"
              title="Catálogo de Endereços & Clientes"
            >
              <Users size={14} className="text-sky-400" />
              <span className="text-[10px] mt-0.5">Catálogo Clientes</span>
            </button>
          </div>

          {/* Group 6: CONFIGURAR CONTA SMTP/IMAP */}
          <div className="flex items-center space-x-1 pr-2 border-r border-[#3D3D3D]">
            <button
              type="button"
              onClick={() => setIsEmailConfigModalOpen(true)}
              className="flex flex-col items-center justify-center px-2 py-1 rounded hover:bg-white/10 text-neutral-200 transition cursor-pointer"
              title="Configurar Protocolos SMTP, IMAP, POP3 e Conta Google"
            >
              <Settings size={14} className="text-amber-400" />
              <span className="text-[10px] mt-0.5">Contas de Correio</span>
            </button>
          </div>

          {/* Group 7: ENVIAR/RECEBER */}
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => loadClients(true)}
              className="flex flex-col items-center justify-center px-2.5 py-1 rounded hover:bg-white/10 text-neutral-200 transition cursor-pointer"
              title="Enviar/Receber Todas as Pastas (F9)"
            >
              <RefreshCw size={14} className={`text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="text-[10px] mt-0.5 font-semibold">Enviar/Receber</span>
            </button>
          </div>

        </div>

      </div>

      {/* =========================================================================
          3. CORPO PRINCIPAL DO OUTLOOK (Barra Vertical + Pastas + Lista + Leitor)
         ========================================================================= */}
      {viewMode === 'outlook' ? (
        <div className="flex flex-1 min-h-0 overflow-hidden bg-[#242424]">
          
          {/* ---------------------------------------------------------------------
              3.1 BARRA VERTICAL DE APLICATIVOS (Left-most Rail - Outlook Style)
             --------------------------------------------------------------------- */}
          <div className="w-11 bg-[#1A1A1A] border-r border-[#2D2D2D] flex flex-col items-center py-2.5 space-y-3 shrink-0">
            
            {/* Ícone Correio */}
            <button
              type="button"
              onClick={() => setActiveRail('mail')}
              className={`p-2 rounded-lg transition cursor-pointer ${
                activeRail === 'mail'
                  ? 'bg-[#0078D4] text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              title="Correio & E-mails"
            >
              <Mail size={17} />
            </button>

            {/* Ícone Propostas Comerciais */}
            <button
              type="button"
              onClick={() => {
                setActiveRail('proposals');
                setSelectedFolder('proposals_all');
              }}
              className={`p-2 rounded-lg transition cursor-pointer ${
                activeRail === 'proposals'
                  ? 'bg-[#0078D4] text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              title="Propostas Comerciais"
            >
              <FileSpreadsheet size={17} />
            </button>

            {/* Ícone Pessoas / Clientes */}
            <button
              type="button"
              onClick={() => setActiveRail('contacts')}
              className={`p-2 rounded-lg transition cursor-pointer ${
                activeRail === 'contacts'
                  ? 'bg-[#0078D4] text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              title="Clientes & Catálogo de Contatos"
            >
              <Users size={17} />
            </button>

            {/* Ícone Configurações de E-mail */}
            <div className="mt-auto">
              <button
                type="button"
                onClick={() => setIsEmailConfigModalOpen(true)}
                className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                title="Configurações de Conta SMTP / IMAP / Google"
              >
                <Settings size={17} />
              </button>
            </div>
          </div>

          {/* ---------------------------------------------------------------------
              3.2 PAINEL DE PASTAS / ÁRVORE DE DIRETÓRIOS (Pane 1)
             --------------------------------------------------------------------- */}
          <div className="w-56 sm:w-64 bg-[#1F1F1F] border-r border-[#2E2E2E] flex flex-col shrink-0 min-h-0 overflow-y-auto text-xs">
            
            {/* Header da Conta Conectada */}
            <div className="p-3 border-b border-[#2E2E2E] flex items-center justify-between">
              <div className="truncate">
                <p className="font-bold text-white text-xs truncate leading-tight">
                  {emailConfig.displayName}
                </p>
                <p className="text-[11px] text-neutral-400 font-mono truncate">
                  {emailConfig.email}
                </p>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="SMTP/IMAP Ativo" />
            </div>

            {/* Árvore de Pastas do Correio */}
            <div className="p-2 space-y-0.5">
              
              {/* Caixa de Entrada */}
              <div
                onClick={() => setSelectedFolder('inbox')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition ${
                  selectedFolder === 'inbox'
                    ? 'bg-[#333333] text-white font-bold'
                    : 'text-neutral-300 hover:bg-[#2A2A2A] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Inbox size={14} className="text-sky-400" />
                  <span>Caixa de Entrada</span>
                </div>
                {inboxUnreadCount > 0 && (
                  <span className="bg-[#0078D4] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {inboxUnreadCount}
                  </span>
                )}
              </div>

              {/* Itens Enviados */}
              <div
                onClick={() => setSelectedFolder('sent')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition ${
                  selectedFolder === 'sent'
                    ? 'bg-[#333333] text-white font-bold'
                    : 'text-neutral-300 hover:bg-[#2A2A2A] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Send size={14} className="text-emerald-400" />
                  <span>Itens Enviados</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">{sentCount}</span>
              </div>

              {/* Propostas Comerciais */}
              <div
                onClick={() => setSelectedFolder('proposals_all')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition ${
                  selectedFolder === 'proposals_all'
                    ? 'bg-[#333333] text-white font-bold'
                    : 'text-neutral-300 hover:bg-[#2A2A2A] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={14} className="text-orange-400" />
                  <span>Propostas Comerciais</span>
                </div>
                <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {allProposals.length}
                </span>
              </div>

              {/* Rascunhos */}
              <div
                onClick={() => setSelectedFolder('drafts')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition ${
                  selectedFolder === 'drafts'
                    ? 'bg-[#333333] text-white font-bold'
                    : 'text-neutral-300 hover:bg-[#2A2A2A] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-neutral-400" />
                  <span>Rascunhos</span>
                </div>
              </div>

              {/* Lixeira */}
              <div
                onClick={() => setSelectedFolder('trash')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition ${
                  selectedFolder === 'trash'
                    ? 'bg-[#333333] text-white font-bold'
                    : 'text-neutral-300 hover:bg-[#2A2A2A] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Trash2 size={14} className="text-rose-400" />
                  <span>Lixeira</span>
                </div>
              </div>
            </div>

            {/* Divisor & Seção de Clientes */}
            <div className="mt-2 pt-2 border-t border-[#2E2E2E] px-3 pb-1 flex items-center justify-between text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              <span>Clientes Cadastrados</span>
              <button
                type="button"
                onClick={() => setIsClientModalOpen(true)}
                className="text-neutral-400 hover:text-white p-0.5"
                title="Novo Cliente"
              >
                <Plus size={13} />
              </button>
            </div>

            <div className="p-2 space-y-0.5 flex-1 min-h-0 overflow-y-auto">
              {clients.map(client => {
                const isSelected = selectedFolder === `client_${client.id}`;
                const clientProposalsCount = client.proposals?.length || 0;
                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedFolder(`client_${client.id}`)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#333333] text-white font-bold'
                        : 'text-neutral-300 hover:bg-[#2A2A2A] hover:text-white'
                    }`}
                    title={client.name}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-4 h-4 rounded bg-neutral-700 text-neutral-300 font-bold text-[9px] flex items-center justify-center shrink-0">
                        {client.name.substring(0, 1)}
                      </div>
                      <span className="truncate text-xs">{truncate45(client.name, 22)}</span>
                    </div>

                    {clientProposalsCount > 0 && (
                      <span className="text-[10px] text-orange-400 font-mono ml-1 shrink-0">
                        {clientProposalsCount}p
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Rodapé do Painel Esquerdo */}
            <div className="p-2.5 bg-[#1A1A1A] border-t border-[#2E2E2E] text-[11px] text-neutral-400 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-400" />
                <span>IMAP 993 (SSL)</span>
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">OK</span>
            </div>

          </div>

          {/* ---------------------------------------------------------------------
              3.3 LISTA DE MENSAGENS / PROPOSTAS (Pane 2 - Outlook Style)
             --------------------------------------------------------------------- */}
          <div className="w-80 sm:w-96 bg-[#212121] border-r border-[#2E2E2E] flex flex-col shrink-0 min-h-0 overflow-hidden text-xs">
            
            {/* Header da Lista: Abas 'Todas' | 'Não lidos' | 'Propostas' */}
            <div className="p-2.5 border-b border-[#2E2E2E] bg-[#1F1F1F] flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMessageFilterTab('all')}
                  className={`pb-1 border-b-2 transition ${
                    messageFilterTab === 'all'
                      ? 'border-[#0078D4] text-white'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  Todas
                </button>

                <button
                  type="button"
                  onClick={() => setMessageFilterTab('unread')}
                  className={`pb-1 border-b-2 transition ${
                    messageFilterTab === 'unread'
                      ? 'border-[#0078D4] text-white'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  Não lidos
                </button>

                <button
                  type="button"
                  onClick={() => setMessageFilterTab('proposals')}
                  className={`pb-1 border-b-2 transition ${
                    messageFilterTab === 'proposals'
                      ? 'border-[#0078D4] text-white'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  Propostas
                </button>
              </div>

              <div className="flex items-center space-x-1 text-[11px] text-neutral-400 font-medium">
                <span>Por Data</span>
                <ChevronDown size={12} />
              </div>
            </div>

            {/* Lista com Scroll */}
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#2B2B2B]">
              {filteredMessages.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">
                  <Mail size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="font-semibold text-neutral-400 text-xs">Não encontramos nada para mostrar aqui.</p>
                  <p className="text-[11px] mt-1">Selecione outra pasta ou crie uma nova proposta.</p>
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
                      className={`p-3 cursor-pointer transition relative group ${
                        isSelected
                          ? 'bg-[#333333] border-l-4 border-[#0078D4]'
                          : 'hover:bg-[#282828] border-l-4 border-transparent'
                      }`}
                    >
                      {/* Remetente & Data */}
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          {!msg.isRead && (
                            <span className="w-2 h-2 rounded-full bg-[#0078D4] shrink-0" />
                          )}
                          <span className={`text-xs truncate ${!msg.isRead ? 'font-bold text-white' : 'font-medium text-neutral-200'}`}>
                            {truncate45(msg.clientName || msg.from, 28)}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-400 shrink-0 font-mono ml-2">
                          {formatOutlookDate(msg.date)}
                        </span>
                      </div>

                      {/* Assunto */}
                      <div className="flex items-center gap-1 mb-1">
                        <p className={`text-xs truncate leading-snug ${!msg.isRead ? 'font-bold text-white' : 'text-neutral-300'}`}>
                          {truncate45(msg.subject, 42)}
                        </p>
                      </div>

                      {/* Snippet do Corpo */}
                      <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                        {truncate45(msg.body.replace(/\n+/g, ' '), 80)}
                      </p>

                      {/* Tags & Propostas Anexas */}
                      {msg.attachedProposalId && (
                        <div className="mt-2 flex items-center justify-between pt-1 border-t border-[#353535] text-[10px]">
                          <span className="inline-flex items-center gap-1 text-orange-400 font-semibold">
                            <FileSpreadsheet size={11} />
                            <span>Proposta #{msg.attachedProposalId}</span>
                          </span>

                          {msg.attachedProposalAmount && (
                            <span className="font-mono text-emerald-400 font-bold">
                              {formatMZN(msg.attachedProposalAmount)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Contador de Itens */}
            <div className="p-2 bg-[#1A1A1A] border-t border-[#2E2E2E] text-[10px] text-neutral-400 flex items-center justify-between shrink-0">
              <span>{filteredMessages.length} mensagem(ns)</span>
              <span>Outlook Sync: Ativo</span>
            </div>

          </div>

          {/* ---------------------------------------------------------------------
              3.4 PAINEL DE LEITURA & AÇÃO (Pane 3 - Visualizador de E-mail / Proposta)
             --------------------------------------------------------------------- */}
          <div className="flex-1 bg-[#1C1C1C] flex flex-col min-h-0 overflow-y-auto">
            {currentItem ? (
              <div className="p-6 space-y-6 max-w-4xl mx-auto w-full">
                
                {/* Header do E-mail (Outlook Style) */}
                <div className="bg-[#242424] p-5 rounded-xl border border-[#333333] shadow-sm space-y-4">
                  
                  {/* Top Subject & Quick Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#333333] pb-4">
                    <div>
                      <h2 className="text-base font-bold text-white tracking-wide leading-tight">
                        {currentItem.subject}
                      </h2>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-neutral-400">
                        <span>Pasta: <strong className="text-neutral-200 capitalize">{currentItem.folder}</strong></span>
                        <span>•</span>
                        <span>{new Date(currentItem.date).toLocaleString('pt-MZ')}</span>
                      </div>
                    </div>

                    {/* Quick Action Ribbon inside header */}
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenCompose(clients.find(c => c.id === currentItem.clientId))}
                        className="px-3 py-1.5 bg-[#0078D4] hover:bg-[#106EBE] text-white font-semibold rounded text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        title="Responder"
                      >
                        <Reply size={13} />
                        <span>Responder</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(currentItem.id)}
                        className="p-1.5 text-neutral-400 hover:text-rose-400 rounded hover:bg-neutral-800 transition"
                        title="Excluir mensagem"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Sender Details */}
                  <div className="flex items-center space-x-3 text-xs">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                      {(currentItem.clientName || currentItem.from).substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white text-xs truncate">
                        {currentItem.clientName || currentItem.from}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-mono truncate">
                        De: <span className="text-neutral-300">{currentItem.from}</span>
                      </p>
                      <p className="text-[11px] text-neutral-400 font-mono truncate">
                        Para: <span className="text-neutral-300">{currentItem.to}</span>
                      </p>
                    </div>
                  </div>

                </div>

                {/* Banner de Proposta Comercial Anexa */}
                {currentItem.attachedProposalId && (
                  <div className="bg-[#262D38] p-5 rounded-xl border border-[#0078D4]/50 shadow-md space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-[#354354] pb-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold">
                          <FileSpreadsheet size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            Proposta Comercial #{currentItem.attachedProposalId}
                          </h3>
                          <p className="text-[11px] text-sky-300 font-medium">
                            {currentItem.attachedProposalTitle}
                          </p>
                        </div>
                      </div>

                      {currentItem.attachedProposalAmount && (
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-semibold text-neutral-400 block">Valor da Proposta</span>
                          <span className="text-base font-bold font-mono text-emerald-400">
                            {formatMZN(currentItem.attachedProposalAmount)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quick Actions for this Proposal */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="px-2.5 py-1 rounded bg-[#1C222C] border border-[#38485C] text-neutral-300 flex items-center gap-1.5 font-mono text-[11px]">
                          <Paperclip size={12} className="text-orange-400" />
                          <span>Proposta_LECASU_{currentItem.attachedProposalId}.pdf</span>
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Botão Aprovar e Gerar Projeto */}
                        <button
                          type="button"
                          onClick={() => {
                            const p = allProposals.find(item => item.proposal.id === currentItem.attachedProposalId);
                            if (p) handleConvertToProject(p.proposal);
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        >
                          <Check size={14} />
                          <span>Aprovar & Gerar Projeto</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Email Body Message */}
                <div className="bg-[#242424] p-6 rounded-xl border border-[#333333] shadow-sm text-xs text-neutral-200 leading-relaxed font-sans space-y-4 whitespace-pre-line">
                  {currentItem.body}
                </div>

                {/* Corporate Signature of LECASU */}
                <div className="p-4 bg-[#202020] rounded-xl border border-[#2D2D2D] text-[11px] text-neutral-400 space-y-1">
                  <p className="font-bold text-white text-xs">LECASU - Engenharia & Prestação de Serviços</p>
                  <p>Departamento de Relações com Clientes & Gestão de Contratos</p>
                  <p className="text-neutral-500">Maputo, Moçambique • Email: {emailConfig.email}</p>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-neutral-500">
                <Mail size={48} className="opacity-30 mb-3" />
                <h3 className="text-sm font-bold text-neutral-300">Selecione uma mensagem para ler</h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                  Escolha um e-mail ou proposta comercial na lista ao lado para visualizar os detalhes completos.
                </p>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* =====================================================================
           MODO TRADICIONAL CRM / TABELA (Para quem prefere a visão de tabela)
           ===================================================================== */
        <div className="flex-1 p-5 overflow-y-auto bg-white text-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">Carteira de Clientes & Propostas (Visão Tabela CRM)</h2>
              <p className="text-xs text-slate-500">Visão tabular executiva integrada aos dados do PostgreSQL</p>
            </div>
            <button
              onClick={() => setViewMode('outlook')}
              className="btn-primary btn-sm bg-[#0078D4] hover:bg-[#106EBE] text-white flex items-center gap-1.5"
            >
              <Mail size={14} />
              <span>Voltar para o Modo Outlook</span>
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
                        className="px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded text-xs font-semibold mr-1.5"
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
          4. BARRA DE ESTADO INFERIOR (Outlook Bottom Status Bar)
         ========================================================================= */}
      <div className="bg-[#1A1A1A] border-t border-[#2D2D2D] px-3 py-1 flex items-center justify-between text-[11px] text-neutral-400 shrink-0 font-sans">
        <div className="flex items-center space-x-3">
          <span>Itens: <strong>{filteredMessages.length}</strong></span>
          <span>•</span>
          <span className="flex items-center gap-1.5 text-neutral-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Conectado a <strong>{emailConfig.smtpHost}</strong> ({emailConfig.smtpPort})</span>
          </span>
          <span>•</span>
          <span className="text-neutral-500 font-mono">Última sincronização: {emailConfig.lastSync || 'Hoje'}</span>
        </div>

        <div className="flex items-center space-x-2 text-[10px]">
          <span className="bg-[#2D2D2D] text-neutral-300 px-2 py-0.5 rounded font-mono">
            SSL/TLS Criptografado
          </span>
          <span>100%</span>
        </div>
      </div>

      {/* =========================================================================
          5. MODAIS INTEGRADOS
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
