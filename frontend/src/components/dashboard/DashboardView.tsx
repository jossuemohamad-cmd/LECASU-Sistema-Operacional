import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Briefcase, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ListTodo,
  TrendingUp,
  Truck,
  HardHat,
  UserCheck,
  FolderArchive,
  Wrench,
  Layers,
  FileText,
  Receipt
} from 'lucide-react';

import type { DashboardOverview, ToastMessage } from '../../types';
import { fetchDashboardOverview } from '../../services/api';
import { Toast } from '../common/Toast';
import { formatMZN, formatDate } from '../../utils/formatters';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [data, setData] = useState<DashboardOverview | null>(() => {
    try {
      const saved = localStorage.getItem('lecasu_dashboard_cache');
      if (saved) {
        return JSON.parse(saved);
      }
      // Check api cached entries
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes('dashboard/overview')) {
          const entry = JSON.parse(localStorage.getItem(k) || '{}');
          if (entry.data) return entry.data;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(!data);
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
      if (!data) setIsLoading(true);
      setError(null);
      const res = await fetchDashboardOverview();
      setData(res);
      try {
        localStorage.setItem('lecasu_dashboard_cache', JSON.stringify(res));
      } catch {}
      if (showToast) {
        addToast('success', 'Painel atualizado', 'Estatísticas consolidadas de todos os módulos.');
      }
    } catch (err: any) {
      console.error('Erro ao carregar dashboard:', err);
      setError(err.message || 'Falha ao conectar com o servidor API.');
      addToast('error', 'Falha na sincronização', 'Não foi possível carregar as estatísticas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            Pago
          </span>
        );
      case 'ISSUED':
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
            Pendente
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200">
            Cancelada
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
            Em Execução
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            Concluído
          </span>
        );
      case 'PLANNING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Planeamento
          </span>
        );
      case 'TODO':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
            A Fazer
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-100 text-neutral-700">
            {status}
          </span>
        );
    }
  };

  const kpis = data?.kpis || {
    active_clients_count: 0,
    total_proposals_count: 0,
    open_proposals_count: 0,
    accepted_proposals_count: 0,
    proposals_total_amount: 0,
    total_projects_count: 0,
    active_projects_count: 0,
    completed_projects_count: 0,
    average_project_progress: 0,
    total_tasks_count: 0,
    pending_tasks_count: 0,
    completed_tasks_count: 0,
    technicians_count: 0,
    total_invoiced: 0,
    total_received: 0,
    pending_amount: 0,
    invoices_paid_count: 0,
    invoices_pending_count: 0,
    total_services_count: 0,
    active_services_count: 0,
    suppliers_count: 0,
    purchase_orders_count: 0,
    pending_purchase_orders_count: 0,
    total_purchases_amount: 0,
    pending_purchases_amount: 0,
    employees_count: 0,
    active_employees_count: 0,
    total_payroll_monthly: 0,
    active_leaves_count: 0,
    documents_count: 0,
    system_users_count: 0,
    active_users_count: 0
  };

  const collectionRate = kpis.total_invoiced > 0 
    ? Math.min(100, Math.round((kpis.total_received / kpis.total_invoiced) * 100)) 
    : 0;

  const taskCompletionRate = kpis.total_tasks_count > 0
    ? Math.round((kpis.completed_tasks_count / kpis.total_tasks_count) * 100)
    : 0;

  if (isLoading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Skeleton Top KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                <div className="w-16 h-4 bg-slate-100 rounded-md" />
              </div>
              <div className="w-24 h-7 bg-slate-200 rounded-md" />
              <div className="w-32 h-3 bg-slate-100 rounded-md" />
            </div>
          ))}
        </div>

        {/* Skeleton Secondary Modules Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-2xs space-y-2">
              <div className="w-7 h-7 bg-slate-100 rounded-lg" />
              <div className="w-14 h-5 bg-slate-200 rounded" />
              <div className="w-20 h-3 bg-slate-100 rounded" />
            </div>
          ))}
        </div>

        {/* Skeleton Charts & Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-2xs space-y-4">
            <div className="flex justify-between items-center">
              <div className="w-40 h-5 bg-slate-200 rounded" />
              <div className="w-20 h-4 bg-slate-100 rounded" />
            </div>
            <div className="h-56 bg-slate-50 rounded-xl border border-slate-100" />
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-2xs space-y-4">
            <div className="w-36 h-5 bg-slate-200 rounded" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 bg-slate-50 rounded-lg border border-slate-100" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* ERROR ALERT */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start space-x-3 text-xs">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1">
            <span className="font-semibold block font-heading text-rose-900">Falha de Conexão</span>
            <span>{error}</span>
          </div>
          <button 
            onClick={() => loadDashboardData()} 
            className="btn-secondary btn-sm text-xs text-rose-700 hover:bg-rose-100"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* 
        SEÇÃO 1: PULSO FINANCEIRO & COMERCIAL (4 Cards Executivos)
      */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#737370] font-heading flex items-center gap-1.5">
            <TrendingUp size={15} className="text-[#FF8000]" />
            Performance Financeira & Comercial
          </h2>
          <span className="text-[11px] text-neutral-500 font-medium">Valores em Meticais (MZN)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Faturado */}
          <div className="bg-white border border-[#E2E2DE] rounded-xl shadow-xs p-5 hover:border-[#FF8000]/40 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737370]">Faturação Emitida</span>
              <div className="w-8 h-8 rounded-lg bg-[#FFF2E5] text-[#FF8000] flex items-center justify-center">
                <Wallet size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-extrabold text-[#101010] font-heading tracking-tight cell-nowrap">
                {formatMZN(kpis.total_invoiced)}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1 flex items-center justify-between">
                <span>{kpis.invoices_paid_count + kpis.invoices_pending_count} faturas no total</span>
                <span className="text-emerald-700 font-semibold">{kpis.invoices_paid_count} liquidadas</span>
              </div>
            </div>
          </div>

          {/* 2. Total Recebido */}
          <div className="bg-white border border-[#E2E2DE] rounded-xl shadow-xs p-5 hover:border-emerald-400 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737370]">Receitas em Caixa</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-extrabold text-emerald-700 font-heading tracking-tight cell-nowrap">
                {formatMZN(kpis.total_received)}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1 flex items-center justify-between">
                <span>Taxa de Liquidação</span>
                <span className="font-bold text-emerald-700">{collectionRate}%</span>
              </div>
            </div>
          </div>

          {/* 3. Pendente / A Receber */}
          <div className="bg-white border border-[#E2E2DE] rounded-xl shadow-xs p-5 hover:border-amber-400 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737370]">Contas a Receber</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-extrabold text-amber-700 font-heading tracking-tight cell-nowrap">
                {formatMZN(kpis.pending_amount)}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1 flex items-center justify-between">
                <span>Faturas Pendentes</span>
                <span className="font-bold text-amber-700">{kpis.invoices_pending_count} faturas</span>
              </div>
            </div>
          </div>

          {/* 4. Pipeline Comercial / Propostas */}
          <div className="bg-white border border-[#E2E2DE] rounded-xl shadow-xs p-5 hover:border-[#FF8000]/40 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737370]">Propostas & Pipeline</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <FileText size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-extrabold text-purple-800 font-heading tracking-tight cell-nowrap">
                {formatMZN(kpis.proposals_total_amount)}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1 flex items-center justify-between">
                <span>{kpis.open_proposals_count} em negociação</span>
                <span className="text-purple-700 font-semibold">{kpis.accepted_proposals_count} aprovadas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 
        SEÇÃO 2: PULSO OPERACIONAL, ENGENHARIA & RECURSOS (4 Cards Departamentos)
      */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#737370] font-heading flex items-center gap-1.5">
            <Briefcase size={15} className="text-[#FF8000]" />
            Operações, Engenharia, Fornecedores & Recursos Humanos
          </h2>
          <span className="text-[11px] text-neutral-500 font-medium">Capacidade Operacional</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Projetos Ativos */}
          <div className="bg-white border border-[#E2E2DE] rounded-xl shadow-xs p-5 hover:border-[#FF8000]/40 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737370]">Projetos & Obras</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Briefcase size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-[#101010] font-heading">
                  {kpis.active_projects_count}
                </span>
                <span className="text-xs text-neutral-500 font-medium">em execução</span>
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-[11px] text-neutral-500 mb-1">
                  <span>Progresso Médio</span>
                  <span className="font-bold text-[#101010]">{kpis.average_project_progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#FF8000] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, kpis.average_project_progress))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Equipe Técnica & Tarefas */}
          <div className="bg-white border border-[#E2E2DE] rounded-xl shadow-xs p-5 hover:border-[#FF8000]/40 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737370]">Equipa & Intervenções</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <HardHat size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-[#101010] font-heading">
                  {kpis.technicians_count}
                </span>
                <span className="text-xs text-neutral-500 font-medium">técnicos ativos</span>
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-[11px] text-neutral-500 mb-1">
                  <span>Conclusão de Tarefas</span>
                  <span className="font-bold text-neutral-800">{taskCompletionRate}%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${taskCompletionRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Fornecedores & Compras */}
          <div className="bg-white border border-[#E2E2DE] rounded-xl shadow-xs p-5 hover:border-[#FF8000]/40 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737370]">Compras & Suprimentos</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Truck size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-[#101010] font-heading">
                  {kpis.purchase_orders_count}
                </span>
                <span className="text-xs text-neutral-500 font-medium">ordens emitidas</span>
              </div>
              <div className="text-[11px] text-neutral-500 mt-2 flex items-center justify-between">
                <span>Total em Compras</span>
                <span className="font-bold text-neutral-800 cell-nowrap">{formatMZN(kpis.total_purchases_amount)}</span>
              </div>
            </div>
          </div>

          {/* 4. Recursos Humanos & GED */}
          <div className="bg-white border border-[#E2E2DE] rounded-xl shadow-xs p-5 hover:border-[#FF8000]/40 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#737370]">Pessoal & Documentos</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <UserCheck size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-[#101010] font-heading">
                  {kpis.active_employees_count}
                </span>
                <span className="text-xs text-neutral-500 font-medium">colaboradores ({kpis.documents_count} docs GED)</span>
              </div>
              <div className="text-[11px] text-neutral-500 mt-2 flex items-center justify-between">
                <span>Folha Salarial Base</span>
                <span className="font-bold text-neutral-800 cell-nowrap">{formatMZN(kpis.total_payroll_monthly)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 
        SEÇÃO 3: TABELAS DE DADOS DE ALTA DENSIDADE (Projetos Recentes & Faturas)
      */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PROJETOS EM ANDAMENTO */}
        <div className="bg-white border border-[#E2E2DE] rounded-xl shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E2DE]">
              <div className="flex items-center space-x-2">
                <Briefcase size={16} className="text-[#FF8000]" />
                <h3 className="font-heading font-bold text-sm text-[#101010]">
                  Projetos Recentes & Status
                </h3>
              </div>
              <button 
                onClick={() => onNavigate('projetos')}
                className="text-xs font-semibold text-[#FF8000] hover:text-[#E67300] flex items-center gap-1 group"
              >
                <span>Ver Todos ({kpis.total_projects_count})</span>
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition" />
              </button>
            </div>

            <div className="table-scroll-container mt-2">
              <table className="table-erp">
                <thead>
                  <tr className="table-header-erp">
                    <th>Código</th>
                    <th>Projeto / Obra</th>
                    <th>Progresso</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEDEA]">
                  {(!data?.recent_projects || data.recent_projects.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-neutral-500">
                        Nenhum projeto registado.
                      </td>
                    </tr>
                  ) : (
                    data.recent_projects.map((proj) => (
                      <tr key={proj.id} className="table-row-erp">
                        <td className="cell-nowrap">
                          <span className="font-mono text-[11px] font-bold bg-[#EDEDEA] px-2 py-0.5 rounded text-[#101010]">
                            {proj.code || `PRJ-${proj.id}`}
                          </span>
                        </td>
                        <td className="min-w-[180px]">
                          <div className="font-heading font-semibold text-[#101010] text-xs">
                            {proj.name}
                          </div>
                          <div className="text-[11px] text-[#737370]">
                            {proj.client_name || 'Sem cliente associado'}
                          </div>
                        </td>
                        <td className="cell-nowrap">
                          <div className="w-24">
                            <div className="flex justify-between text-[10px] text-neutral-600 mb-1">
                              <span>{proj.completed_tasks}/{proj.total_tasks}</span>
                              <span className="font-bold">{proj.progress_percent}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#FF8000] rounded-full"
                                style={{ width: `${proj.progress_percent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="cell-nowrap">
                          {getStatusBadge(proj.status)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FATURAS RECENTES & RECEBIMENTOS */}
        <div className="bg-white border border-[#E2E2DE] rounded-xl shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E2DE]">
              <div className="flex items-center space-x-2">
                <Receipt size={16} className="text-[#FF8000]" />
                <h3 className="font-heading font-bold text-sm text-[#101010]">
                  Faturas Comerciais Recentes
                </h3>
              </div>
              <button 
                onClick={() => onNavigate('financeiro')}
                className="text-xs font-semibold text-[#FF8000] hover:text-[#E67300] flex items-center gap-1 group"
              >
                <span>Gestão Financeira</span>
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition" />
              </button>
            </div>

            <div className="table-scroll-container mt-2">
              <table className="table-erp">
                <thead>
                  <tr className="table-header-erp">
                    <th>Fatura</th>
                    <th>Cliente</th>
                    <th>Valor (MZN)</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEDEA]">
                  {(!data?.recent_invoices || data.recent_invoices.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-neutral-500">
                        Nenhuma fatura emitida recentemente.
                      </td>
                    </tr>
                  ) : (
                    data.recent_invoices.map((inv) => (
                      <tr key={inv.id} className="table-row-erp">
                        <td className="cell-nowrap">
                          <span className="font-mono text-[11px] font-bold text-neutral-800">
                            {inv.invoice_number || `FT-${inv.id}`}
                          </span>
                        </td>
                        <td className="min-w-[160px]">
                          <span className="font-semibold text-xs text-[#101010]">
                            {inv.client_name || 'Geral'}
                          </span>
                        </td>
                        <td className="cell-nowrap font-bold text-xs text-[#101010] font-heading">
                          {formatMZN(inv.amount)}
                        </td>
                        <td className="cell-nowrap text-neutral-500 text-[11px]">
                          {formatDate(inv.due_date)}
                        </td>
                        <td className="cell-nowrap">
                          {getStatusBadge(inv.status)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* 
        SEÇÃO 4: RESUMO DE CATÁLOGO & INTERVENÇÕES TÉCNICAS PENDENTES
      */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* INTERVENÇÕES TÉCNICAS PENDENTES (2 colunas) */}
        <div className="bg-white border border-[#E2E2DE] rounded-xl shadow-xs p-5 lg:col-span-2">
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E2DE]">
            <div className="flex items-center space-x-2">
              <ListTodo size={16} className="text-[#FF8000]" />
              <h3 className="font-heading font-bold text-sm text-[#101010]">
                Tarefas & Intervenções em Aberto
              </h3>
            </div>
            <button 
              onClick={() => onNavigate('equipa')}
              className="text-xs font-semibold text-[#FF8000] hover:text-[#E67300] flex items-center gap-1 group"
            >
              <span>Escala Técnica ({kpis.pending_tasks_count})</span>
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition" />
            </button>
          </div>

          <div className="table-scroll-container mt-2">
            <table className="table-erp">
              <thead>
                <tr className="table-header-erp">
                  <th>Intervenção</th>
                  <th>Projeto</th>
                  <th>Prazo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEDEA]">
                {(!data?.pending_tasks || data.pending_tasks.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-neutral-500">
                      Nenhuma intervenção pendente no momento. Todas as tarefas concluídas!
                    </td>
                  </tr>
                ) : (
                  data.pending_tasks.slice(0, 5).map((task) => (
                    <tr key={task.id} className="table-row-erp">
                      <td className="min-w-[200px]">
                        <div className="font-semibold text-xs text-[#101010] font-heading">
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-[11px] text-neutral-500 line-clamp-1">
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td className="min-w-[140px] text-neutral-600 text-xs">
                        {task.project_name || 'Geral'}
                      </td>
                      <td className="cell-nowrap text-neutral-500 text-[11px]">
                        {formatDate(task.due_date)}
                      </td>
                      <td className="cell-nowrap">
                        {getStatusBadge(task.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RESUMO GERAL DE MÓDULOS E RECURSOS (1 coluna) */}
        <div className="bg-white border border-[#E2E2DE] rounded-xl shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-4 border-b border-[#E2E2DE]">
              <Layers size={16} className="text-[#FF8000]" />
              <h3 className="font-heading font-bold text-sm text-[#101010]">
                Inventário & Repositórios
              </h3>
            </div>

            <div className="mt-4 space-y-3">
              {/* Catálogo de Serviços */}
              <div 
                onClick={() => onNavigate('servicos')}
                className="p-3 bg-[#FAFAF9] hover:bg-[#FFF2E5] border border-[#EDEDEA] hover:border-[#FF8000]/40 rounded-lg flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded bg-white text-[#FF8000] border border-[#E2E2DE] flex items-center justify-center font-bold text-xs">
                    <Wrench size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#101010] font-heading">Serviços Cadastrados</p>
                    <p className="text-[11px] text-[#737370]">{kpis.active_services_count} ativos no catálogo</p>
                  </div>
                </div>
                <span className="font-bold text-sm text-[#101010] font-heading">{kpis.total_services_count}</span>
              </div>

              {/* Fornecedores */}
              <div 
                onClick={() => onNavigate('fornecedores')}
                className="p-3 bg-[#FAFAF9] hover:bg-[#FFF2E5] border border-[#EDEDEA] hover:border-[#FF8000]/40 rounded-lg flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded bg-white text-rose-600 border border-[#E2E2DE] flex items-center justify-center font-bold text-xs">
                    <Truck size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#101010] font-heading">Fornecedores Homologados</p>
                    <p className="text-[11px] text-[#737370]">{kpis.pending_purchase_orders_count} ordens de compra pendentes</p>
                  </div>
                </div>
                <span className="font-bold text-sm text-[#101010] font-heading">{kpis.suppliers_count}</span>
              </div>

              {/* GED Documentos */}
              <div 
                onClick={() => onNavigate('ged')}
                className="p-3 bg-[#FAFAF9] hover:bg-[#FFF2E5] border border-[#EDEDEA] hover:border-[#FF8000]/40 rounded-lg flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded bg-white text-indigo-600 border border-[#E2E2DE] flex items-center justify-center font-bold text-xs">
                    <FolderArchive size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#101010] font-heading">Documentos GED</p>
                    <p className="text-[11px] text-[#737370]">Faturas, contratos, plantas e relatórios</p>
                  </div>
                </div>
                <span className="font-bold text-sm text-[#101010] font-heading">{kpis.documents_count}</span>
              </div>

              {/* Utilizadores e Segurança */}
              <div 
                onClick={() => onNavigate('definicoes')}
                className="p-3 bg-[#FAFAF9] hover:bg-[#FFF2E5] border border-[#EDEDEA] hover:border-[#FF8000]/40 rounded-lg flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded bg-white text-emerald-600 border border-[#E2E2DE] flex items-center justify-center font-bold text-xs">
                    <Users size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#101010] font-heading">Utilizadores do Sistema</p>
                    <p className="text-[11px] text-[#737370]">Controlo de acessos RBAC</p>
                  </div>
                </div>
                <span className="font-bold text-sm text-[#101010] font-heading">{kpis.system_users_count}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
