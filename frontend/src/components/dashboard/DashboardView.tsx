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
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Pago</span>;
      case 'ISSUED':
      case 'PENDING':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Pendente</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">Cancelada</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Em Execução</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Concluído</span>;
      case 'PLANNING':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">Planeamento</span>;
      case 'TODO':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">A Fazer</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">{status}</span>;
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
      {/* HEADER DE BOAS-VINDAS & AÇÕES DO DASHBOARD */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-5 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Visão Geral Operacional e Financeira
            </h1>
            <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-[11px] font-semibold rounded">
              Tempo Real
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 capitalize flex items-center gap-1.5">
            <Calendar size={13} className="text-slate-400" />
            {getTodayFormatted()} • Monitoramento integrado LECASU ERP
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadDashboardData(true)}
            disabled={isLoading}
            className="flex items-center space-x-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-md shadow-2xs transition disabled:opacity-50"
            title="Recarregar indicadores"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-orange-600' : 'text-slate-500'} />
            <span>{isLoading ? 'Sincronizando...' : 'Atualizar'}</span>
          </button>
        </div>
      </div>

      {/* BARRA DE AÇÕES RÁPIDAS */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <ArrowUpRight size={14} className="text-orange-600" />
          Ações Rápidas:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('clientes')}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border border-slate-200 rounded text-xs font-medium text-slate-700 hover:text-orange-700 transition"
          >
            <Plus size={13} className="text-orange-600" />
            <span>Novo Cliente / Proposta</span>
          </button>
          <button
            onClick={() => onNavigate('projetos')}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border border-slate-200 rounded text-xs font-medium text-slate-700 hover:text-orange-700 transition"
          >
            <Briefcase size={13} className="text-orange-600" />
            <span>Gerir Projetos & Tarefas</span>
          </button>
          <button
            onClick={() => onNavigate('financeiro')}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border border-slate-200 rounded text-xs font-medium text-slate-700 hover:text-orange-700 transition"
          >
            <Wallet size={13} className="text-orange-600" />
            <span>Módulo Financeiro</span>
          </button>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start space-x-3 text-xs">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1">
            <span className="font-semibold block text-red-900">Erro de Conexão com a Base de Dados</span>
            <span>{error}</span>
          </div>
          <button 
            onClick={() => loadDashboardData(true)} 
            className="underline font-semibold hover:text-red-900 ml-2"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* GRADE DE 4 CARDS DE KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Faturação Consolidada */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                Faturação Consolidada
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {formatMZN(kpis.total_invoiced)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Recebido em caixa:</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={12} />
              {formatMZN(kpis.total_received)}
            </span>
          </div>
        </div>

        {/* KPI 2: Projetos em Execução */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                Projetos em Execução
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {kpis.active_projects_count} <span className="text-xs font-normal text-slate-500">ativos</span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Briefcase size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-slate-500">Avanço médio global:</span>
              <span className="font-bold text-blue-700">{kpis.average_project_progress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(0, kpis.average_project_progress))}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 3: Clientes na Carteira */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                Clientes na Carteira
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {kpis.active_clients_count} <span className="text-xs font-normal text-slate-500">registados</span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Propostas em aberto:</span>
            <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
              {kpis.open_proposals_count} abertas
            </span>
          </div>
        </div>

        {/* KPI 4: Contas a Receber / Pendentes */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                Contas a Receber / Pendente
              </p>
              <h3 className="text-xl font-bold text-amber-600 mt-1">
                {formatMZN(kpis.pending_amount)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Fluxo a faturar:</span>
            <span className="font-semibold text-slate-700">
              {kpis.pending_amount > 0 ? 'Cobranças ativas' : 'Sem pendências'}
            </span>
          </div>
        </div>
      </div>

      {/* LAYOUT EM 2 COLUNAS: PROJETOS EM ANDAMENTO & ÚLTIMAS FATURAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* COLUNA 1: PROJETOS EM ANDAMENTO */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <Briefcase size={16} className="text-orange-600" />
              <h2 className="text-sm font-bold text-slate-900">Projetos em Andamento</h2>
            </div>
            <button
              onClick={() => onNavigate('projetos')}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition"
            >
              Ver todos ({data?.recent_projects?.length || 0})
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex-1 p-0 overflow-x-auto">
            {!data?.recent_projects || data.recent_projects.length === 0 ? (
              <div className="p-10 text-center">
                <Briefcase size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-700">Nenhum projeto cadastrado</p>
                <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                  Converta propostas aprovadas ou crie um projeto operacional.
                </p>
                <button
                  onClick={() => onNavigate('projetos')}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-semibold transition"
                >
                  Abrir Módulo de Projetos
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/30 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Projeto & Código</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3 w-36">Progresso</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {data.recent_projects.map((proj) => (
                    <tr key={proj.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 truncate max-w-[180px]" title={proj.name}>
                          {proj.name}
                        </div>
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          {proj.code || 'PRJ-S/N'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 truncate max-w-[140px]" title={proj.client_name || 'Geral'}>
                        {proj.client_name || 'Geral'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-slate-500">{proj.completed_tasks}/{proj.total_tasks} tarefas</span>
                          <span className="font-bold text-slate-700">{proj.progress_percent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              proj.progress_percent === 100 ? 'bg-emerald-500' : 'bg-orange-600'
                            }`}
                            style={{ width: `${proj.progress_percent}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {getStatusBadge(proj.status)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onNavigate('projetos')}
                          className="text-[11px] font-semibold text-orange-600 hover:text-orange-800 hover:underline inline-flex items-center gap-0.5"
                          title="Ver detalhes e tarefas"
                        >
                          Tarefas
                          <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* COLUNA 2: ÚLTIMAS FATURAS & COBRANÇAS */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <Wallet size={16} className="text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Últimas Faturas & Cobranças</h2>
            </div>
            <button
              onClick={() => onNavigate('financeiro')}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition"
            >
              Ver finanças
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex-1 p-0 overflow-x-auto">
            {!data?.recent_invoices || data.recent_invoices.length === 0 ? (
              <div className="p-10 text-center">
                <Wallet size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-700">Nenhuma fatura emitida no momento</p>
                <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                  Emita faturas de projetos para alimentar o fluxo de recebimento.
                </p>
                <button
                  onClick={() => onNavigate('financeiro')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition"
                >
                  Abrir Módulo Financeiro
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/30 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Nº Fatura</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Valor (MZN)</th>
                    <th className="py-2.5 px-3">Vencimento</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {data.recent_invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {inv.invoice_number || `FAT-${inv.id}`}
                      </td>
                      <td className="py-3 px-3 text-slate-600 truncate max-w-[130px]" title={inv.client_name || 'Cliente'}>
                        {inv.client_name || 'Cliente'}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {formatMZN(inv.amount)}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="py-3 px-3">
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

      {/* SECÇÃO ADICIONAL: TAREFAS TÉCNICAS PENDENTES PRIORITÁRIAS */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <ListTodo size={16} className="text-orange-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Fila de Tarefas Técnicas Prioritárias
            </h2>
          </div>
          <button
            onClick={() => onNavigate('projetos')}
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition"
          >
            Quadro Geral de Tarefas
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="p-4">
          {!data?.pending_tasks || data.pending_tasks.length === 0 ? (
            <div className="py-6 text-center">
              <CheckCircle2 size={28} className="mx-auto text-emerald-500 mb-2" />
              <p className="text-xs font-semibold text-slate-800">Sem tarefas pendentes imediatas</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Todas as tarefas operacionais estão em dia ou concluídas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.pending_tasks.slice(0, 6).map((task) => (
                <div 
                  key={task.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-[10px] text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[120px]">
                        {task.project_code || 'PRJ'}
                      </span>
                      {getStatusBadge(task.status)}
                    </div>
                    <h4 className="text-xs font-semibold text-slate-900 line-clamp-2" title={task.title}>
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={11} className="text-slate-400" />
                      {formatDate(task.due_date)}
                    </span>
                    <button
                      onClick={() => onNavigate('projetos')}
                      className="text-orange-600 font-semibold hover:underline"
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

