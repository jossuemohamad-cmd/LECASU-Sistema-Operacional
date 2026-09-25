import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Plus, 
  Send, 
  Search, 
  Filter, 
  CheckCircle, 
  Clock, 
  Building
} from 'lucide-react';
import type { Client, Proposal } from '../../types';
import { formatMZN } from '../../utils/formatters';

interface ProposalsManagerViewProps {
  clients: Client[];
  onOpenCreateProposal: () => void;
  onSendProposalByEmail: (proposal: Proposal, client?: Client) => void;
}

export const ProposalsManagerView: React.FC<ProposalsManagerViewProps> = ({
  clients,
  onOpenCreateProposal,
  onSendProposalByEmail
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Collect all proposals across all clients
  const allProposals: Array<Proposal & { clientName: string; clientEmail?: string }> = [];
  clients.forEach(c => {
    if (c.proposals && Array.isArray(c.proposals)) {
      c.proposals.forEach(p => {
        allProposals.push({
          ...p,
          clientName: c.name,
          clientEmail: c.email || undefined
        });
      });
    }
  });

  const filteredProposals = allProposals.filter(p => {
    const matchesSearch = 
      (p.title && p.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.clientName && p.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.id.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = allProposals.reduce((acc, p) => acc + (Number(p.total_amount) || 0), 0);
  const approvedCount = allProposals.filter(p => p.status === 'APROVADA' || p.status === 'ACCEPTED').length;
  const pendingCount = allProposals.filter(p => p.status === 'PENDENTE' || p.status === 'SENT' || p.status === 'DRAFT').length;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white select-none overflow-y-auto p-5 md:p-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#FF8000] flex items-center justify-center font-bold text-lg shadow-2xs">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">Propostas Comerciais & Engenharia</h2>
            <p className="text-xs text-slate-500">Gestão e envio direto de orçamentos para clientes</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenCreateProposal}
          className="px-4 py-2.5 rounded-lg bg-[#FF8000] hover:bg-[#E67300] active:bg-[#CC6600] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Criar Nova Proposta</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Total em Propostas</span>
            <span className="text-lg font-bold text-slate-900 font-mono mt-0.5 block">{formatMZN(totalAmount)}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-orange-100 text-[#FF8000] flex items-center justify-center font-bold">
            {allProposals.length}
          </div>
        </div>

        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-800 font-semibold block">Aprovadas / Aceites</span>
            <span className="text-lg font-bold text-emerald-900 font-mono mt-0.5 block">{approvedCount}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle size={18} />
          </div>
        </div>

        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-amber-800 font-semibold block">Em Análise / Pendentes</span>
            <span className="text-lg font-bold text-amber-900 font-mono mt-0.5 block">{pendingCount}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Clock size={18} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 text-xs">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por título, cliente ou #ID..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#FF8000] focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Filter size={14} className="text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF8000] cursor-pointer"
          >
            <option value="all">Todos os Estados</option>
            <option value="DRAFT">Rascunho</option>
            <option value="SENT">Enviada</option>
            <option value="PENDENTE">Pendente</option>
            <option value="APROVADA">Aprovada</option>
            <option value="ACCEPTED">Aceite</option>
            <option value="REJECTED">Recusada</option>
          </select>
        </div>
      </div>

      {/* Proposals List Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white text-xs">
        <table className="w-full text-left divide-y divide-slate-200">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">#ID</th>
              <th className="py-3 px-4">Proposta / Título</th>
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4">Valor Total</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {filteredProposals.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Nenhuma proposta encontrada. Clique em "+ Criar Nova Proposta" para emitir um orçamento.
                </td>
              </tr>
            ) : (
              filteredProposals.map(proposal => {
                const client = clients.find(c => c.name === proposal.clientName);
                return (
                  <tr key={proposal.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      #{proposal.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{proposal.title}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{proposal.scope || 'Serviços de Engenharia'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <Building size={13} className="text-slate-400 shrink-0" />
                        <span>{proposal.clientName}</span>
                      </div>
                      {proposal.clientEmail && (
                        <div className="text-[11px] text-slate-400 font-mono pl-4">{proposal.clientEmail}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#FF8000]">
                      {formatMZN(Number(proposal.total_amount) || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        proposal.status === 'APROVADA' || proposal.status === 'ACCEPTED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : proposal.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {proposal.status || 'PENDENTE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onSendProposalByEmail(proposal, client)}
                        className="px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-[#FF8000] font-semibold text-xs inline-flex items-center gap-1.5 transition cursor-pointer border border-orange-200 shadow-2xs"
                        title="Enviar proposta por e-mail via Roundcube"
                      >
                        <Send size={12} />
                        <span>Enviar E-mail</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
