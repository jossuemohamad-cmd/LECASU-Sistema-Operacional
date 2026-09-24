import React, { useState, useEffect, useMemo } from 'react';
import { 
  HardHat, 
  Users, 
  Clock, 
  CheckCircle2, 
  Search, 
  RefreshCw, 
  UserCheck, 
  Calendar, 
  AlertCircle,
  Phone,
  Mail,
  Filter,
  ArrowRightLeft,
  X
} from 'lucide-react';
import type { Technician, TeamTask, TeamKPIs, ToastMessage } from '../../types';
import { fetchTechnicians, fetchTeamKPIs, fetchTeamTasks, assignTask } from '../../services/api';
import { Toast } from '../common/Toast';

export const TechnicalTeamView: React.FC = () => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [kpis, setKpis] = useState<TeamKPIs>({
    total_technicians: 0,
    in_progress_tasks: 0,
    completed_tasks_this_month: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedTechFilter, setSelectedTechFilter] = useState<number | 'ALL'>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Allocation Modal State
  const [selectedTaskForAssign, setSelectedTaskForAssign] = useState<TeamTask | null>(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | ''>('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Toast Notifications
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

  const loadData = async (showToast = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const [techsData, kpisData, tasksData] = await Promise.all([
        fetchTechnicians(),
        fetchTeamKPIs(),
        fetchTeamTasks()
      ]);

      setTechnicians(techsData);
      setKpis(kpisData);
      setTasks(tasksData);

      if (showToast) {
        addToast('success', 'Dados atualizados', 'Informações da equipa sincronizadas com o PostgreSQL.');
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados da equipa:', err);
      setError(err.message || 'Falha ao carregar dados da equipa técnica.');
      addToast('error', 'Falha na sincronização', 'Não foi possível obter dados da equipa.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Tech filter
      if (selectedTechFilter !== 'ALL') {
        if (task.assigned_to !== selectedTechFilter) return false;
      }
      // Status filter
      if (selectedStatusFilter !== 'ALL') {
        if (task.status !== selectedStatusFilter) return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(query);
        const matchProject = (task.project_name || '').toLowerCase().includes(query) || (task.project_code || '').toLowerCase().includes(query);
        const matchTech = (task.assigned_technician_name || '').toLowerCase().includes(query);
        if (!matchTitle && !matchProject && !matchTech) return false;
      }
      return true;
    });
  }, [tasks, selectedTechFilter, selectedStatusFilter, searchQuery]);

  // Handle task re-assignment
  const handleConfirmAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForAssign || selectedAssigneeId === '') return;

    try {
      setIsAssigning(true);
      const updatedTask = await assignTask(selectedTaskForAssign.id, Number(selectedAssigneeId));
      
      // Update tasks state
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));

      // Reload technicians to refresh their counts
      const updatedTechs = await fetchTechnicians();
      setTechnicians(updatedTechs);

      addToast('success', 'Responsável atribuído!', `Tarefa alocada para ${updatedTask.assigned_technician_name}.`);
      setSelectedTaskForAssign(null);
      setSelectedAssigneeId('');
    } catch (err: any) {
      console.error('Erro ao alocar tarefa:', err);
      addToast('error', 'Falha na alocação', err.message || 'Não foi possível transferir a tarefa.');
    } finally {
      setIsAssigning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'DONE':
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Concluída</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Em Execução</span>;
      case 'TODO':
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">A Fazer</span>;
    }
  };

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

  return (
    <div className="space-y-6">
      {/* HEADER OFICIAL */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-5 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Equipa Técnica & Intervenções
            </h1>
            <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-[11px] font-semibold rounded">
              Módulo 05
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão operacional de técnicos, alocação de tarefas e controlo de intervenções no terreno.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadData(true)}
            disabled={isLoading}
            className="flex items-center space-x-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-md shadow-2xs transition disabled:opacity-50"
            title="Atualizar lista de técnicos e tarefas"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-orange-600' : 'text-slate-500'} />
            <span>{isLoading ? 'A sincronizar...' : 'Atualizar'}</span>
          </button>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start space-x-3 text-xs">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1">
            <span className="font-semibold block text-red-900">Erro de Carregamento</span>
            <span>{error}</span>
          </div>
          <button 
            onClick={() => loadData(true)} 
            className="underline font-semibold hover:text-red-900 ml-2"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* GRADE DE 3 CARDS DE KPI OPERACIONAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: Técnicos no Terreno */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
              Técnicos no Terreno
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {kpis.total_technicians} <span className="text-xs font-normal text-slate-500">colaboradores</span>
            </h3>
            <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
              <UserCheck size={13} />
              100% disponíveis para alocação
            </p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
            <HardHat size={24} />
          </div>
        </div>

        {/* KPI 2: Tarefas em Execução */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
              Intervenções em Execução
            </p>
            <h3 className="text-2xl font-bold text-blue-700 mt-1">
              {kpis.in_progress_tasks} <span className="text-xs font-normal text-slate-500">ativas</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <Clock size={13} />
              Operações em curso nos projetos
            </p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Clock size={24} />
          </div>
        </div>

        {/* KPI 3: Concluídas este Mês */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
              Concluídas este Mês
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">
              {kpis.completed_tasks_this_month} <span className="text-xs font-normal text-slate-500">finalizadas</span>
            </h3>
            <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 size={13} />
              Entregas validadas no terreno
            </p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {/* GRADE DE CARTÕES DA EQUIPE TÉCNICA */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users size={16} className="text-orange-600" />
            Membros da Equipa Técnica
          </h2>
          <span className="text-xs text-slate-500">
            Clique num técnico para filtrar as suas intervenções
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {technicians.map((tech) => {
            const isSelected = selectedTechFilter === tech.id;
            const initials = tech.name
              .split(' ')
              .map(n => n[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <div
                key={tech.id}
                onClick={() => setSelectedTechFilter(isSelected ? 'ALL' : tech.id)}
                className={`p-4 rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                  isSelected 
                    ? 'bg-orange-50/60 border-orange-400 ring-2 ring-orange-400/20 shadow-xs' 
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center tracking-wider border-2 border-white shadow-xs">
                      {initials}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      tech.role === 'engenheiro'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {tech.role}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 truncate" title={tech.name}>
                    {tech.name}
                  </h3>

                  <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                    <p className="flex items-center gap-1.5 truncate" title={tech.email}>
                      <Mail size={12} className="text-slate-400 flex-shrink-0" />
                      {tech.email}
                    </p>
                    {tech.phone && (
                      <p className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600">
                        <Phone size={12} className="text-slate-400 flex-shrink-0" />
                        {tech.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500">Tarefas ativas:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                    tech.active_tasks_count > 0 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tech.active_tasks_count} em mãos
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TABELA DE INTERVENÇÕES & TAREFAS TÉCNICAS */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        {/* BARRA DE FILTROS */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-orange-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Intervenções Técnicas & Tarefas
            </h2>
            <span className="text-xs text-slate-500">
              ({filteredTasks.length} de {tasks.length})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* SEARCH */}
            <div className="relative min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Pesquisar tarefa ou projeto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            {/* STATUS FILTER */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-700"
            >
              <option value="ALL">Todos os Status</option>
              <option value="TODO">A Fazer</option>
              <option value="IN_PROGRESS">Em Execução</option>
              <option value="DONE">Concluídas</option>
            </select>

            {/* TECH FILTER */}
            <select
              value={selectedTechFilter}
              onChange={(e) => setSelectedTechFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-700"
            >
              <option value="ALL">Todos os Técnicos</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            {selectedTechFilter !== 'ALL' && (
              <button
                onClick={() => setSelectedTechFilter('ALL')}
                className="px-2 py-1 text-xs text-orange-600 hover:text-orange-800 bg-orange-50 rounded flex items-center gap-1 font-semibold"
                title="Limpar filtro de técnico"
              >
                Limpar Filtro
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* LISTAGEM */}
        <div className="overflow-x-auto">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center">
              <HardHat size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Nenhuma tarefa encontrada</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Não há tarefas correspondentes aos filtros selecionados.
              </p>
              {(selectedTechFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedTechFilter('ALL');
                    setSelectedStatusFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="mt-3 text-xs font-semibold text-orange-600 hover:underline"
                >
                  Redefinir Filtros
                </button>
              )}
            </div>
          ) : (
          <div className="table-scroll-container">
            <table className="table-erp">
              <thead>
                <tr className="table-header-erp">
                  <th className="px-4">Intervenção / Tarefa</th>
                  <th className="px-4">Projeto</th>
                  <th className="px-4">Técnico Responsável</th>
                  <th className="px-4">Prazo</th>
                  <th className="px-4">Status</th>
                  <th className="px-4 text-right">Alocação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="table-row-erp hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 min-w-[240px]">
                      <div className="font-semibold text-slate-900 font-heading">
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {task.description}
                        </div>
                      )}
                    </td>

                    <td className="px-4 min-w-[180px]">
                      <div className="font-medium text-slate-700">
                        {task.project_name || 'Geral'}
                      </div>
                      <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5 inline-block cell-nowrap">
                        {task.project_code || 'PRJ'}
                      </span>
                    </td>

                    <td className="px-4 min-w-[160px] cell-nowrap">
                      {task.assigned_technician_name ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                            {task.assigned_technician_name.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-800">
                            {task.assigned_technician_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Não atribuído
                        </span>
                      )}
                    </td>

                    <td className="px-4 cell-nowrap text-slate-600 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        {formatDate(task.due_date)}
                      </span>
                    </td>

                    <td className="px-4 cell-nowrap">
                      {getStatusBadge(task.status)}
                    </td>

                    <td className="px-4 td-actions cell-nowrap">
                      <button
                        onClick={() => {
                          setSelectedTaskForAssign(task);
                          setSelectedAssigneeId(task.assigned_to || (technicians[0]?.id ?? ''));
                        }}
                        className="btn-secondary btn-sm"
                      >
                        <ArrowRightLeft size={11} className="text-orange-600" />
                        <span>{task.assigned_to ? 'Reatribuir' : 'Atribuir'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>

      {/* MODAL DE ALOCAÇÃO / REATRIBUIÇÃO DE TAREFA */}
      {selectedTaskForAssign && (
        <div className="modal-overlay-erp animate-in fade-in">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <HardHat size={18} className="text-orange-600" />
                <h3 className="font-bold text-sm text-slate-900">Alocar Técnico Responsável</h3>
              </div>
              <button
                onClick={() => setSelectedTaskForAssign(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmAssignment} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-xs">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Intervenção / Tarefa:</p>
                <p className="font-bold text-slate-900 mt-0.5">{selectedTaskForAssign.title}</p>
                <p className="text-slate-500 text-[11px] mt-1">
                  Projeto: {selectedTaskForAssign.project_name} ({selectedTaskForAssign.project_code})
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Selecione o Técnico / Colaborador Operacional:
                </label>
                <select
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(Number(e.target.value))}
                  required
                  className="w-full text-xs bg-white border border-slate-300 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="" disabled>Selecione um membro da equipa...</option>
                  {technicians.map(tech => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name} ({tech.role}) — {tech.active_tasks_count} tarefas ativas
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForAssign(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || selectedAssigneeId === ''}
                  className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {isAssigning ? 'A guardar...' : 'Confirmar Alocação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
