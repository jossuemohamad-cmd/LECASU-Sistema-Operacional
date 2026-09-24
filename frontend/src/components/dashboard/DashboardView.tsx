import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Briefcase, 
  Wallet, 
  Clock, 
  RefreshCw, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ArrowUpRight,
  Calendar,
  ListTodo,
  DollarSign
} from 'lucide-react';

import type { DashboardOverview, ToastMessage } from '../../types';
import { fetchDashboardOverview } from '../../services/api';
import { Toast } from '../common/Toast';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const loadDashboardData = async (showToast = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetchDashboardOverview();
      setData(res);
      if (showToast) {
        addToast('success', 'Painel atualizado', 'Dados sincronizados com o PostgreSQL em tempo real.');
      }
    } catch (err: any) {
      console.error('Erro ao carregar dashboard:', err);
      setError(err.message || 'Falha ao conectar com o servidor API.');
      addToast('error', 'Falha na sincronização', 'Não foi possível carregar os dados do dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Format currency in MZN (Meticais)
  const formatMZN = (val: number | undefined | null) => {
    const amount = val || 0;
    return new Intl.NumberFormat('pt-MZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' MZN';
  };

  // Format friendly date
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Sem prazo';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-MZ', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Today formatted header string
  const getTodayFormatted = () => {
    const today = new Date();
    return today.toLocaleDateString('pt-MZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            Pago
          </span>
        );
      case 'ISSUED':
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
            Pendente
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200">
            Cancelada
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
            Em Execução
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            Concluído
          </span>
        );
      case 'PLANNING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Planeamento
          </span>
        );
      case 'TODO':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
            A Fazer
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-700">
            {status}
          </span>
        );
    }
  };

  const kpis = data?.kpis || {
    active_clients_count: 0,
    active_projects_count: 0,
    open_proposals_count: 0,
    total_invoiced: 0,
    total_received: 0,
    pending_amount: 0,
    average_project_progress: 0
  };

  return (
    <div className="space-y-6">
      {/* 
        HEADER DE BOAS-VINDAS & AÇÕES DO DASHBOARD (8-Point Grid Spacing)
      */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-[#E2E2DE] gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-[#101010] tracking-tight font-heading">
              Visão Geral Operacional & Financeira
            </h1>
            <span className="badge-lecasu-orange flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF8000] animate-pulse"></span>
              Tempo Real
            </span>
          </div>
          <p className="text-xs text-[#737370] mt-1 capitalize flex items-center gap-2">
            <Calendar size={14} className="text-[#FF8000]" />
            {getTodayFormatted()} • Painel central de inteligência operacional
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadDashboardData(true)}
            disabled={isLoading}
            className="btn-secondary btn-md"
            title="Sincronizar indicadores em tempo real"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin text-[#FF8000]' : 'text-neutral-600'} />
            <span>{isLoading ? 'Sincronizando...' : 'Atualizar'}</span>
          </button>
        </div>
      </div>

      {/* 
        BARRA DE AÇÕES RÁPIDAS (High-Density ERP Toolbar)
      */}
      <div className="bg-white border border-[#E2E2DE] rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-[#FFF2E5] flex items-center justify-center text-[#FF8000]">
            <ArrowUpRight size={16} />
          </div>
          <span className="text-xs font-bold text-[#101010] uppercase tracking-wider font-heading">
            Atalhos Operacionais:
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('clientes')}
            className="btn-secondary btn-sm hover:border-[#FF8000] hover:text-[#FF8000] hover:bg-[#FFF2E5]"
          >
            <Plus size={14} className="text-[#FF8000]" />
            <span>Novo Cliente / Proposta</span>
          </button>
          <button
            onClick={() => onNavigate('projetos')}
            className="btn-secondary btn-sm hover:border-[#FF8000] hover:text-[#FF8000] hover:bg-[#FFF2E5]"
          >
            <Briefcase size={14} className="text-[#FF8000]" />
            <span>Projetos & Tarefas</span>
          </button>
          <button
            onClick={() => onNavigate('financeiro')}
            className="btn-secondary btn-sm hover:border-[#FF8000] hover:text-[#FF8000] hover:bg-[#FFF2E5]"
          >
            <Wallet size={14} className="text-[#FF8000]" />
            <span>Módulo Financeiro</span>
          </button>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start space-x-3 text-xs">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1">
            <span className="font-semibold block font-heading text-rose-900">Falha de Conexão</span>
            <span>{error}</span>
          </div>
          <button 
            onClick={() => loadDashboardData(true)} 
            className="underline font-semibold hover:text-rose-900 ml-2"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* 
        GRADE DE 4 CARDS DE KPI (Tremor / Shadcn High-Density Style)
        - Padding: 20px a 24px (p-5 / p-6)
        - Border radius: 12px (rounded-xl)
        - Border: 1px border-[#E2E2DE]
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* KPI 1: Faturação Consolidada */}
        <div className="bg-white p-5 md:p-6 rounded-xl border border-[#E2E2DE] shadow-xs hover:border-[#D4D4D0] transition flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#737370] uppercase tracking-wider font-heading">
                Faturação Consolidada
              </p>
              <h3 className="text-2xl font-bold text-[#101010] mt-1.5 font-heading tracking-tight">
                {formatMZN(kpis.total_invoiced)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#FFF2E5] border border-[#FFEACC] flex items-center justify-center text-[#FF8000] flex-shrink-0">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#EDEDEA] flex items-center justify-between text-xs">
            <span className="text-[#737370]">Recebido em caixa:</span>
            <span className="font-semibold text-emerald-600 flex items-center gap-1 font-heading">
              <CheckCircle2 size={13} />
              {formatMZN(kpis.total_received)}
            </span>
          </div>
        </div>

        {/* KPI 2: Projetos em Execução */}
        <div className="bg-white p-5 md:p-6 rounded-xl border border-[#E2E2DE] shadow-xs hover:border-[#D4D4D0] transition flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#737370] uppercase tracking-wider font-heading">
                Projetos em Execução
              </p>
              <h3 className="text-2xl font-bold text-[#101010] mt-1.5 font-heading tracking-tight">
                {kpis.active_projects_count} <span className="text-xs font-normal text-[#737370]">ativos</span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
              <Briefcase size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#EDEDEA]">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[#737370]">Avanço médio:</span>
              <span className="font-bold text-blue-700 font-heading">{kpis.average_project_progress}%</span>
            </div>
            <div className="w-full bg-[#EDEDEA] rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-[#FF8000] h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(0, kpis.average_project_progress))}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 3: Clientes na Carteira */}
        <div className="bg-white p-5 md:p-6 rounded-xl border border-[#E2E2DE] shadow-xs hover:border-[#D4D4D0] transition flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#737370] uppercase tracking-wider font-heading">
                Clientes na Carteira
              </p>
              <h3 className="text-2xl font-bold text-[#101010] mt-1.5 font-heading tracking-tight">
                {kpis.active_clients_count} <span className="text-xs font-normal text-[#737370]">registados</span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#EDEDEA] flex items-center justify-between text-xs">
            <span className="text-[#737370]">Propostas ativas:</span>
            <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
              {kpis.open_proposals_count} abertas
            </span>
          </div>
        </div>

        {/* KPI 4: Contas a Receber / Pendentes */}
        <div className="bg-white p-5 md:p-6 rounded-xl border border-[#E2E2DE] shadow-xs hover:border-[#D4D4D0] transition flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#737370] uppercase tracking-wider font-heading">
                Contas a Receber
              </p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1.5 font-heading tracking-tight">
                {formatMZN(kpis.pending_amount)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#EDEDEA] flex items-center justify-between text-xs">
            <span className="text-[#737370]">Fluxo pendente:</span>
            <span className="font-semibold text-[#101010]">
              {kpis.pending_amount > 0 ? 'Cobranças ativas' : 'Sem pendências'}
            </span>
          </div>
        </div>
      </div>

      {/* 
        TABELAS DE DADOS CORPORATIVAS (Padrão 48px–52px row height, 16px px cells)
      */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* TABELA 1: PROJETOS EM ANDAMENTO */}
        <div className="table-container-erp flex flex-col">
          <div className="p-4 border-b border-[#E2E2DE] flex items-center justify-between bg-[#FAFAF9]">
            <div className="flex items-center space-x-2">
              <Briefcase size={16} className="text-[#FF8000]" />
              <h2 className="text-sm font-bold text-[#101010] font-heading">Projetos em Andamento</h2>
            </div>
            <button
              onClick={() => onNavigate('projetos')}
              className="text-xs font-semibold text-[#FF8000] hover:text-[#E67300] flex items-center gap-1 transition"
            >
              Ver todos ({data?.recent_projects?.length || 0})
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="table-scroll-container">
            {!data?.recent_projects || data.recent_projects.length === 0 ? (
              <div className="p-8 text-center">
                <Briefcase size={32} className="mx-auto text-neutral-300 mb-2" />
                <p className="text-xs font-semibold text-neutral-700 font-heading">Nenhum projeto cadastrado</p>
                <p className="text-xs text-neutral-500 mt-1 mb-4">
                  Converta propostas aprovadas ou crie um projeto operacional.
                </p>
                <button
                  onClick={() => onNavigate('projetos')}
                  className="btn-primary btn-sm"
                >
                  Abrir Módulo de Projetos
                </button>
              </div>
            ) : (
              <table className="table-erp">
                <thead>
                  <tr className="table-header-erp">
                    <th className="px-4">Projeto & Código</th>
                    <th className="px-4">Cliente</th>
                    <th className="px-4 w-36">Progresso</th>
                    <th className="px-4">Status</th>
                    <th className="px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEDEA]">
                  {data.recent_projects.map((proj) => (
                    <tr key={proj.id} className="table-row-erp">
                      <td className="px-4 min-w-[200px]">
                        <div className="font-semibold text-[#101010] font-heading">
                          {proj.name}
                        </div>
                        <span className="font-mono text-[10px] text-neutral-500 bg-[#EDEDEA] px-1.5 py-0.5 rounded mt-0.5 inline-block cell-nowrap">
                          {proj.code || 'PRJ-S/N'}
                        </span>
                      </td>
                      <td className="px-4 min-w-[140px] text-neutral-700">
                        {proj.client_name || 'Geral'}
                      </td>
                      <td className="px-4 w-36 min-w-[130px]">
                        <div className="flex items-center justify-between text-[11px] mb-1 cell-nowrap">
                          <span className="text-neutral-500">{proj.completed_tasks}/{proj.total_tasks}</span>
                          <span className="font-bold text-neutral-700 font-heading ml-2">{proj.progress_percent}%</span>
                        </div>
                        <div className="w-full bg-[#EDEDEA] rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              proj.progress_percent === 100 ? 'bg-emerald-500' : 'bg-[#FF8000]'
                            }`}
                            style={{ width: `${proj.progress_percent}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 cell-nowrap">
                        {getStatusBadge(proj.status)}
                      </td>
                      <td className="px-4 td-actions cell-nowrap">
                        <button
                          onClick={() => onNavigate('projetos')}
                          className="btn-ghost btn-sm text-[#FF8000] hover:text-[#E67300]"
                          title="Ver detalhes"
                        >
                          Detalhes
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* TABELA 2: ÚLTIMAS FATURAS & COBRANÇAS */}
        <div className="table-container-erp flex flex-col">
          <div className="p-4 border-b border-[#E2E2DE] flex items-center justify-between bg-[#FAFAF9]">
            <div className="flex items-center space-x-2">
              <Wallet size={16} className="text-emerald-600" />
              <h2 className="text-sm font-bold text-[#101010] font-heading">Últimas Faturas & Cobranças</h2>
            </div>
            <button
              onClick={() => onNavigate('financeiro')}
              className="text-xs font-semibold text-[#FF8000] hover:text-[#E67300] flex items-center gap-1 transition"
            >
              Ver finanças
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="table-scroll-container">
            {!data?.recent_invoices || data.recent_invoices.length === 0 ? (
              <div className="p-8 text-center">
                <Wallet size={32} className="mx-auto text-neutral-300 mb-2" />
                <p className="text-xs font-semibold text-neutral-700 font-heading">Nenhuma fatura recente</p>
                <p className="text-xs text-neutral-500 mt-1 mb-4">
                  Emita faturas de serviços para acompanhar pagamentos.
                </p>
                <button
                  onClick={() => onNavigate('financeiro')}
                  className="btn-dark btn-sm"
                >
                  Abrir Módulo Financeiro
                </button>
              </div>
            ) : (
              <table className="table-erp">
                <thead>
                  <tr className="table-header-erp">
                    <th className="px-4">Nº Fatura</th>
                    <th className="px-4">Cliente</th>
                    <th className="px-4">Valor (MZN)</th>
                    <th className="px-4">Vencimento</th>
                    <th className="px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEDEA]">
                  {data.recent_invoices.map((inv) => (
                    <tr key={inv.id} className="table-row-erp">
                      <td className="px-4 font-mono font-semibold text-[#101010] cell-nowrap">
                        {inv.invoice_number || `FAT-${inv.id}`}
                      </td>
                      <td className="px-4 min-w-[150px] text-neutral-700">
                        {inv.client_name || 'Cliente'}
                      </td>
                      <td className="px-4 font-semibold text-[#101010] font-heading cell-nowrap">
                        {formatMZN(inv.amount)}
                      </td>
                      <td className="px-4 text-neutral-500 text-xs cell-nowrap">
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="px-4 cell-nowrap">
                        {getStatusBadge(inv.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* 
        SECÇÃO: TAREFAS TÉCNICAS PRIORITÁRIAS
      */}
      <div className="table-container-erp">
        <div className="p-4 border-b border-[#E2E2DE] flex items-center justify-between bg-[#FAFAF9]">
          <div className="flex items-center space-x-2">
            <ListTodo size={16} className="text-[#FF8000]" />
            <h2 className="text-sm font-bold text-[#101010] font-heading">
              Fila de Tarefas Técnicas Prioritárias
            </h2>
          </div>
          <button
            onClick={() => onNavigate('projetos')}
            className="text-xs font-semibold text-[#FF8000] hover:text-[#E67300] flex items-center gap-1 transition"
          >
            Quadro Geral de Tarefas
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="p-5">
          {!data?.pending_tasks || data.pending_tasks.length === 0 ? (
            <div className="py-6 text-center">
              <CheckCircle2 size={28} className="mx-auto text-emerald-500 mb-2" />
              <p className="text-xs font-semibold text-neutral-800 font-heading">Sem tarefas pendentes imediatas</p>
              <p className="text-xs text-neutral-500 mt-1">
                Todas as tarefas operacionais estão em dia ou concluídas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.pending_tasks.slice(0, 6).map((task) => (
                <div 
                  key={task.id}
                  className="p-4 rounded-xl border border-[#E2E2DE] bg-white hover:border-[#D4D4D0] transition flex flex-col justify-between shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[10px] text-neutral-600 bg-[#F5F5F3] px-2 py-0.5 rounded border border-[#E2E2DE] truncate max-w-[120px]">
                        {task.project_code || 'PRJ'}
                      </span>
                      {getStatusBadge(task.status)}
                    </div>
                    <h4 className="text-xs font-semibold text-[#101010] line-clamp-2 font-heading" title={task.title}>
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-xs text-neutral-500 line-clamp-1 mt-1">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-[#EDEDEA] flex items-center justify-between text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-neutral-400" />
                      {formatDate(task.due_date)}
                    </span>
                    <button
                      onClick={() => onNavigate('projetos')}
                      className="text-[#FF8000] font-semibold hover:underline text-xs"
                    >
                      Abrir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TOAST NOTIFICATIONS */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
