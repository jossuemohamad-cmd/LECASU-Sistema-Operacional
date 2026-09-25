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
  Trash2,
  Reply,
  Forward,
  Settings,
  ShieldCheck,
  Paperclip,
  LayoutGrid,
  Check,
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

  // View Mode: 'outlook' (default, modern clean communication center) or 'crm' (tabular CRM)
  const [viewMode, setViewMode] = useState<'outlook' | 'crm'>('outlook');

  // Selected Folder in Tree
  // 'inbox' | 'sent' | 'proposals_all' | 'drafts' | 'trash' | 'client_[id]'
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
    <div className="flex flex-col h-[calc(100vh-120px)] min-h-[660px] font-sans select-none rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white text-slate-800">
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
          1. CLEAN EXECUTIVE ACTION TOOLBAR (Sem poluição visual, paleta branca)
         ========================================================================= */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Left Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* + Novo E-mail */}
          <button
            type="button"
            onClick={() => handleOpenCompose()}
            className="px-3.5 py-2 bg-[#0078D4] hover:bg-[#106EBE] text-white font-semibold rounded-lg text-xs flex items-center gap-2 shadow-xs transition cursor-pointer active:scale-95"
            title="Compor Novo E-mail (Ctrl+N)"
          >
            <Mail size={15} />
            <span>Novo E-mail</span>
          </button>

          {/* + Nova Proposta */}
          <button
            type="button"
            onClick={() => setIsProposalModalOpen(true)}
            className="px-3.5 py-2 bg-[#FFF2E5] hover:bg-[#FFE5CC] text-[#FF8000] border border-[#FFD9B3] font-semibold rounded-lg text-xs flex items-center gap-2 transition cursor-pointer active:scale-95"
            title="Elaborar Proposta Comercial para Cliente"
          >
            <FileSpreadsheet size={15} className="text-[#FF8000]" />
            <span>+ Proposta</span>
          </button>

          {/* + Novo Cliente */}
          <button
            type="button"
            onClick={() => setIsClientModalOpen(true)}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-lg text-xs flex items-center gap-2 transition cursor-pointer"
            title="Registar Novo Cliente no ERP"
          >
            <Users size={15} className="text-slate-600" />
            <span>+ Cliente</span>
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Sincronizar */}
          <button
            type="button"
            onClick={() => loadClients(true)}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition cursor-pointer border border-transparent hover:border-slate-200"
            title="Enviar / Receber (F9)"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin text-[#0078D4]' : ''} />
          </button>

          {/* Configuração de E-mail (SMTP/IMAP) */}
          <button
            type="button"
            onClick={() => setIsEmailConfigModalOpen(true)}
            className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer flex items-center gap-1.5 border border-slate-200 bg-slate-50/50"
            title="Configurar Protocolos SMTP, IMAP, POP3 e Conta Google"
          >
            <Settings size={14} className="text-slate-500" />
            <span className="hidden md:inline font-medium">Contas</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="SMTP Conectado" />
          </button>

        </div>

        {/* Right Actions: Search + View Switcher */}
        <div className="flex items-center gap-3">
          
          {/* Clean Search Input */}
          <div className="relative w-56 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar mensagens ou clientes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-[#0078D4] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Toggle View Mode */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'outlook' ? 'crm' : 'outlook')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'crm'
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
            }`}
            title="Alternar entre visão de Correio/Propostas e visão Tabular CRM"
          >
            <LayoutGrid size={13} className={viewMode === 'crm' ? 'text-orange-400' : 'text-slate-500'} />
            <span className="hidden sm:inline">{viewMode === 'outlook' ? 'Modo Tabela CRM' : 'Modo Correio'}</span>
          </button>

        </div>

      </div>

      {/* =========================================================================
          2. WORKSPACE EM 3 COLUNAS (Espaçoso, Visual Limpo, Sem Sufoco)
         ========================================================================= */}
      {viewMode === 'outlook' ? (
        <div className="flex flex-1 min-h-0 overflow-hidden bg-white">
          
          {/* ---------------------------------------------------------------------
              COLUNA 1: PASTAS & CLIENTES (Limpo, Background Suave #FAFAF9)
             --------------------------------------------------------------------- */}
          <div className="w-56 sm:w-60 bg-[#FAFAF9] border-r border-slate-200 flex flex-col shrink-0 min-h-0 overflow-y-auto text-xs">
            
            {/* Account Card */}
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="min-w-0 pr-1">
                <p className="font-bold text-slate-900 text-xs truncate leading-tight">
                  {emailConfig.displayName}
                </p>
                <p className="text-[11px] text-slate-500 font-mono truncate">
                  {emailConfig.email}
                </p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-2xs" title="Servidor Ativo" />
            </div>

            {/* Pastas de Correio */}
            <div className="p-2 space-y-1">
              
              {/* Caixa de Entrada */}
              <div
                onClick={() => setSelectedFolder('inbox')}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition ${
                  selectedFolder === 'inbox'
                    ? 'bg-[#EBF3FB] text-[#0078D4] font-bold shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox size={15} className={selectedFolder === 'inbox' ? 'text-[#0078D4]' : 'text-slate-500'} />
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
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition ${
                  selectedFolder === 'sent'
                    ? 'bg-[#EBF3FB] text-[#0078D4] font-bold shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Send size={15} className={selectedFolder === 'sent' ? 'text-[#0078D4]' : 'text-slate-500'} />
                  <span>Itens Enviados</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{sentCount}</span>
              </div>

              {/* Propostas Comerciais */}
              <div
                onClick={() => setSelectedFolder('proposals_all')}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition ${
                  selectedFolder === 'proposals_all'
                    ? 'bg-[#FFF2E5] text-[#FF8000] font-bold shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet size={15} className={selectedFolder === 'proposals_all' ? 'text-[#FF8000]' : 'text-slate-500'} />
                  <span>Propostas Comerciais</span>
                </div>
                <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {allProposals.length}
                </span>
              </div>

              {/* Rascunhos */}
              <div
                onClick={() => setSelectedFolder('drafts')}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition ${
                  selectedFolder === 'drafts'
                    ? 'bg-[#EBF3FB] text-[#0078D4] font-bold shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText size={15} className="text-slate-500" />
                  <span>Rascunhos</span>
                </div>
              </div>

              {/* Lixeira */}
              <div
                onClick={() => setSelectedFolder('trash')}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition ${
                  selectedFolder === 'trash'
                    ? 'bg-rose-50 text-rose-700 font-bold shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 size={15} className="text-slate-500" />
                  <span>Lixeira</span>
                </div>
              </div>
            </div>

            {/* Clientes Registados (Filtro Direto) */}
            <div className="mt-3 pt-3 border-t border-slate-200 px-3.5 pb-1 flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <span>Clientes ({clients.length})</span>
              <button
                type="button"
                onClick={() => setIsClientModalOpen(true)}
                className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                title="Novo Cliente"
              >
                <Plus size={14} />
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
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition ${
                      isSelected
                        ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                        : 'text-slate-600 hover:bg-slate-200/50'
                    }`}
                    title={client.name}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-md bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {client.name.substring(0, 1)}
                      </div>
                      <span className="truncate text-xs">{truncate45(client.name, 20)}</span>
                    </div>

                    {clientProposalsCount > 0 && (
                      <span className="text-[10px] text-orange-600 font-mono font-semibold ml-1 shrink-0 bg-orange-50 px-1 rounded">
                        {clientProposalsCount}p
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Rodapé da Coluna 1 */}
            <div className="p-3 bg-white border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1.5 text-[11px]">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>IMAP 993 (SSL)</span>
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">Ativo</span>
            </div>

          </div>

          {/* ---------------------------------------------------------------------
              COLUNA 2: LISTA DE MENSAGENS / PROPOSTAS (w-72 a w-80, Fundo Branco)
             --------------------------------------------------------------------- */}
          <div className="w-72 sm:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-0 overflow-hidden text-xs">
            
            {/* Header com Abas Limpas */}
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center space-x-3 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMessageFilterTab('all')}
                  className={`pb-1 border-b-2 transition cursor-pointer ${
                    messageFilterTab === 'all'
                      ? 'border-[#0078D4] text-[#0078D4]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Todas
                </button>

                <button
                  type="button"
                  onClick={() => setMessageFilterTab('unread')}
                  className={`pb-1 border-b-2 transition cursor-pointer ${
                    messageFilterTab === 'unread'
                      ? 'border-[#0078D4] text-[#0078D4]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Não lidos
                </button>

                <button
                  type="button"
                  onClick={() => setMessageFilterTab('proposals')}
                  className={`pb-1 border-b-2 transition cursor-pointer ${
                    messageFilterTab === 'proposals'
                      ? 'border-[#0078D4] text-[#0078D4]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Propostas
                </button>
              </div>

              <span className="text-[11px] text-slate-400 font-medium">Por Data</span>
            </div>

            {/* Lista de Mensagens */}
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
              {filteredMessages.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Mail size={32} className="mx-auto mb-2 opacity-30 text-slate-400" />
                  <p className="font-semibold text-slate-600 text-xs">Nenhuma mensagem nesta pasta</p>
                  <p className="text-[11px] mt-1 text-slate-400">Envie um e-mail ou crie uma proposta.</p>
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
                      className={`p-3.5 cursor-pointer transition relative ${
                        isSelected
                          ? 'bg-[#F2F7FD] border-l-4 border-[#0078D4]'
                          : 'hover:bg-slate-50 border-l-4 border-transparent'
                      }`}
                    >
                      {/* Remetente & Data */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 truncate">
                          {!msg.isRead && (
                            <span className="w-2 h-2 rounded-full bg-[#0078D4] shrink-0" />
                          )}
                          <span className={`text-xs truncate ${!msg.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                            {truncate45(msg.clientName || msg.from, 28)}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0 font-mono ml-2">
                          {formatOutlookDate(msg.date)}
                        </span>
                      </div>

                      {/* Assunto */}
                      <p className={`text-xs truncate mb-1 ${!msg.isRead ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                        {truncate45(msg.subject, 38)}
                      </p>

                      {/* Snippet do Texto */}
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {truncate45(msg.body.replace(/\n+/g, ' '), 70)}
                      </p>

                      {/* Tag de Proposta Comercial Anexa */}
                      {msg.attachedProposalId && (
                        <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px]">
                          <span className="inline-flex items-center gap-1 text-[#FF8000] font-semibold bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                            <FileSpreadsheet size={12} />
                            <span>Proposta #{msg.attachedProposalId}</span>
                          </span>

                          {msg.attachedProposalAmount && (
                            <span className="font-mono text-emerald-700 font-bold text-[11px]">
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
            <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
              <span>{filteredMessages.length} mensagem(ns)</span>
              <span>Sincronizado</span>
            </div>

          </div>

          {/* ---------------------------------------------------------------------
              COLUNA 3: PAINEL DE LEITURA & PROPOSTA (Espaçoso, Visual Limpo)
             --------------------------------------------------------------------- */}
          <div className="flex-1 bg-slate-50/40 flex flex-col min-h-0 overflow-y-auto">
            {currentItem ? (
              <div className="p-6 md:p-8 space-y-5 max-w-4xl mx-auto w-full">
                
                {/* Header do E-mail */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  
                  {/* Subject Title & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                        {currentItem.subject}
                      </h2>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span>Pasta: <strong className="text-slate-700 capitalize">{currentItem.folder}</strong></span>
                        <span>•</span>
                        <span>{new Date(currentItem.date).toLocaleString('pt-MZ')}</span>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenCompose(clients.find(c => c.id === currentItem.clientId))}
                        className="px-3 py-1.5 bg-[#0078D4] hover:bg-[#106EBE] text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                        title="Responder"
                      >
                        <Reply size={14} />
                        <span>Responder</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => addToast('info', 'Encaminhar', 'Selecione o destinatário para encaminhar.')}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
                        title="Encaminhar"
                      >
                        <Forward size={14} />
                        <span className="hidden sm:inline">Encaminhar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(currentItem.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Sender & Recipient Details */}
                  <div className="flex items-center space-x-3 text-xs">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-[#0078D4] border border-slate-200 font-bold flex items-center justify-center text-sm shadow-2xs shrink-0">
                      {(currentItem.clientName || currentItem.from).substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 text-xs">
                        {currentItem.clientName || currentItem.from}
                      </p>
                      <p className="text-slate-500 font-mono text-[11px] truncate">
                        De: <span className="text-slate-700">{currentItem.from}</span>
                      </p>
                      <p className="text-slate-500 font-mono text-[11px] truncate">
                        Para: <span className="text-slate-700">{currentItem.to}</span>
                      </p>
                    </div>
                  </div>

                </div>

                {/* Card de Proposta Comercial Anexa */}
                {currentItem.attachedProposalId && (
                  <div className="bg-white p-5 rounded-2xl border border-orange-200 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-orange-100 pb-3.5">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                          <FileSpreadsheet size={20} />
                        </div>
                        <div>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 uppercase mb-0.5">
                            Proposta Comercial #{currentItem.attachedProposalId}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900">
                            {currentItem.attachedProposalTitle}
                          </h3>
                        </div>
                      </div>

                      {currentItem.attachedProposalAmount && (
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Valor Global da Proposta</span>
                          <span className="text-lg font-bold font-mono text-emerald-600">
                            {formatMZN(currentItem.attachedProposalAmount)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Ações da Proposta */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-2 text-xs font-mono">
                          <Paperclip size={13} className="text-[#FF8000]" />
                          <span>Proposta_LECASU_{currentItem.attachedProposalId}.pdf</span>
                        </span>
                      </div>

                      <div className="flex items-center space-x-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            const p = allProposals.find(item => item.proposal.id === currentItem.attachedProposalId);
                            if (p) handleConvertToProject(p.proposal);
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                        >
                          <Check size={15} />
                          <span>Aprovar & Gerar Projeto</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Email Body Message */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs text-xs text-slate-800 leading-relaxed font-sans space-y-4 whitespace-pre-line">
                  {currentItem.body}
                </div>

                {/* Corporate Signature */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-1">
                  <p className="font-bold text-slate-800 text-xs">LECASU - Engenharia & Prestação de Serviços</p>
                  <p>Departamento de Relações com Clientes & Gestão de Contratos</p>
                  <p className="text-slate-400">Maputo, Moçambique • Email: {emailConfig.email}</p>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <Mail size={48} className="opacity-30 mb-3 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-700">Selecione uma mensagem para ler</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Escolha um e-mail ou proposta comercial na lista ao lado para visualizar os detalhes completos.
                </p>
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
              onClick={() => setViewMode('outlook')}
              className="btn-primary btn-sm bg-[#0078D4] hover:bg-[#106EBE] text-white flex items-center gap-1.5"
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
          3. BARRA DE ESTADO INFERIOR (Limpa & Minimalista)
         ========================================================================= */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-500 shrink-0">
        <div className="flex items-center space-x-3">
          <span>Itens: <strong className="text-slate-700">{filteredMessages.length}</strong></span>
          <span>•</span>
          <span className="flex items-center gap-1.5 text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Conectado a <strong>{emailConfig.smtpHost}</strong></span>
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="text-slate-400 font-mono hidden sm:inline">Última sincronização: {emailConfig.lastSync || 'Hoje'}</span>
        </div>

        <div className="flex items-center space-x-2 text-[11px]">
          <span className="bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono">
            SSL/TLS Criptografado
          </span>
        </div>
      </div>

      {/* =========================================================================
          4. MODAIS INTEGRADOS
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
