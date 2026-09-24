import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  ChevronRight, 
  RefreshCw, 
  AlertCircle, 
  TrendingUp, 
  FileSpreadsheet, 
  FileText 
} from 'lucide-react';
import type { Client, ClientCreateInput, Proposal, ProposalCreateInput, ToastMessage } from '../../types';
import { fetchClients, createClient, createProposal, convertProposalToProject } from '../../services/api';
import { ClientModal } from './ClientModal';
import { ProposalModal } from './ProposalModal';
import { ClientDetailsModal } from './ClientDetailsModal';
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
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<Client | null>(null);

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
  const loadClients = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchClients();
      setClients(data);
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
    addToast('success', 'Proposta criada com sucesso!', `"${created.title}" vinculada ao cliente.`);
  };

  // Handle proposal conversion to project
  const handleConvertToProject = async (proposal: Proposal) => {
    try {
      const project = await convertProposalToProject(proposal.id);
      await loadClients();
      addToast(
        'success', 
        `Projeto ${project.code} Gerado com Sucesso!`, 
        `Proposta aprovada e projeto em andamento no Módulo 04.`
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

  // Filtered clients list
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const query = searchQuery.toLowerCase().trim();
    return clients.filter(c => 
      c.name.toLowerCase().includes(query) ||
      (c.nuit && c.nuit.toLowerCase().includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.contact_person && c.contact_person.toLowerCase().includes(query)) ||
      (c.phone && c.phone.toLowerCase().includes(query))
    );
  }, [clients, searchQuery]);

  // Summary statistics
  const stats = useMemo(() => {
    const totalClients = clients.length;
    let totalProposals = 0;
    let totalValue = 0;

    clients.forEach(c => {
      if (c.proposals && c.proposals.length > 0) {
        totalProposals += c.proposals.length;
        c.proposals.forEach(p => {
          totalValue += Number(p.total_amount) || 0;
        });
      }
    });

    return { totalClients, totalProposals, totalValue };
  }, [clients]);

  const formatCurrency = (val: number) => {
    return formatMZN(val);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* Top Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Clientes & Propostas</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestão comercial, carteira de clientes e propostas técnicas no PostgreSQL
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={loadClients}
            disabled={isLoading}
            className="btn-secondary btn-icon-md"
            title="Atualizar lista"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin text-[#FF8000]' : 'text-neutral-600'} />
          </button>

          <button
            onClick={() => {
              setSelectedClientId(null);
              setIsProposalModalOpen(true);
            }}
            disabled={clients.length === 0}
            className="btn-secondary btn-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet size={15} className="text-neutral-500" />
            <span>+ Nova Proposta</span>
          </button>

          <button
            onClick={() => setIsClientModalOpen(true)}
            className="btn-primary btn-md"
          >
            <Plus size={15} />
            <span>+ Novo Registo</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Carteira de Clientes</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalClients}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Total de Propostas</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalProposals}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Volume Financeiro Proposto</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(stats.totalValue)}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* Main Content Area: Table / Search / Filters */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Search Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por nome, NUIT, contacto..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white transition"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Exibindo <span className="font-semibold text-slate-800">{filteredClients.length}</span> de <span className="font-semibold text-slate-800">{clients.length}</span> registos
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 m-4 bg-rose-50 border border-rose-200 rounded-md flex items-center justify-between text-xs text-rose-800">
            <div className="flex items-center space-x-2">
              <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadClients}
              className="font-semibold underline text-rose-700 hover:text-rose-900 ml-3"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-orange-600 border-t-transparent"></div>
            <p className="text-xs text-slate-500 mt-2 font-medium">A carregar dados do PostgreSQL...</p>
          </div>
        )}

        {/* Empty State: No clients in DB */}
        {!isLoading && !error && clients.length === 0 && (
          <div className="p-12 text-center max-w-md mx-auto">
            <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users size={28} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Nenhum cliente cadastrado
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-5 leading-relaxed">
              Inicie a carteira de clientes registando a primeira empresa ou cliente direto no banco de dados.
            </p>
            <button
              onClick={() => setIsClientModalOpen(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-xs transition inline-flex items-center space-x-1.5"
            >
              <Plus size={15} />
              <span>+ Registar Primeiro Cliente</span>
            </button>
          </div>
        )}

        {/* Empty State: Search filter yields 0 results */}
        {!isLoading && !error && clients.length > 0 && filteredClients.length === 0 && (
          <div className="p-10 text-center text-slate-500 text-xs">
            <p className="font-semibold text-slate-700">Nenhum resultado para "{searchQuery}"</p>
            <p className="mt-1">Tente pesquisar por outro termo ou limpe o campo de busca.</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 text-orange-600 font-semibold hover:underline"
            >
              Limpar pesquisa
            </button>
          </div>
        )}

        {/* Data Table */}
        {!isLoading && !error && filteredClients.length > 0 && (
          <div className="table-scroll-container">
            <table className="table-erp">
              <thead>
                <tr className="table-header-erp">
                  <th className="px-4">Nome & Responsável</th>
                  <th className="px-4">NUIT</th>
                  <th className="px-4">E-mail</th>
                  <th className="px-4">Telefone</th>
                  <th className="px-4">Propostas</th>
                  <th className="px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredClients.map((client) => {
                  const proposalsCount = client.proposals?.length || 0;
                  const totalClientProposalsValue = client.proposals?.reduce(
                    (acc, p) => acc + (Number(p.total_amount) || 0), 
                    0
                  ) || 0;

                  return (
                    <tr 
                      key={client.id}
                      className="table-row-erp hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetails(client)}
                    >
                      {/* Nome / Empresa */}
                      <td className="px-4 min-w-[220px]">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-xs flex-shrink-0 group-hover:bg-orange-50 group-hover:text-orange-600 group-hover:border-orange-200 transition-colors">
                            {client.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 font-heading group-hover:text-orange-600 transition-colors">
                              {client.name}
                            </p>
                            {client.contact_person && (
                              <p className="text-[11px] text-slate-500">
                                {client.contact_person}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* NUIT */}
                      <td className="px-4 cell-nowrap">
                        {client.nuit ? (
                          <span className="font-mono text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                            {client.nuit}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Contacto / Email */}
                      <td className="px-4 cell-nowrap" onClick={e => e.stopPropagation()}>
                        {client.email ? (
                          <a 
                            href={`mailto:${client.email}`}
                            className="inline-flex items-center text-slate-600 hover:text-orange-600 font-medium"
                            title={client.email}
                          >
                            <Mail size={13} className="mr-1.5 text-slate-400 flex-shrink-0" />
                            <span>{client.email}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Telefone */}
                      <td className="px-4 cell-nowrap" onClick={e => e.stopPropagation()}>
                        {client.phone ? (
                          <a 
                            href={`tel:${client.phone}`}
                            className="inline-flex items-center text-slate-600 hover:text-orange-600 font-medium"
                          >
                            <Phone size={13} className="mr-1.5 text-slate-400 flex-shrink-0" />
                            <span>{client.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Propostas */}
                      <td className="px-4 cell-nowrap">
                        {proposalsCount > 0 ? (
                          <div className="flex items-center space-x-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                              {proposalsCount} {proposalsCount === 1 ? 'proposta' : 'propostas'}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
                              ({formatCurrency(totalClientProposalsValue)})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Nenhuma</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="px-4 td-actions cell-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenProposalForClient(client.id)}
                            className="btn-secondary btn-sm text-[#FF8000] border-[#FF8000]/30 hover:border-[#FF8000] hover:bg-[#FFF2E5]"
                            title="Criar proposta para este cliente"
                          >
                            + Proposta
                          </button>
                          <button
                            onClick={() => handleOpenDetails(client)}
                            className="btn-ghost btn-icon-sm text-neutral-400 hover:text-neutral-900"
                            title="Ver detalhes do cliente"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modais */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSubmit={handleCreateClient}
      />

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
    </div>
  );
};
