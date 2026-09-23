import React, { useState, useEffect, useMemo } from 'react';
import { 
  Briefcase, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  ListTodo, 
  ChevronRight, 
  AlertCircle,
  TrendingUp,
  Building2,
  Calendar,
  CheckCircle
} from 'lucide-react';
import type { Project, TaskCreateInput, TaskUpdateInput, ToastMessage } from '../../types';
import { fetchProjects, createProjectTask, updateTask, deleteTask } from '../../services/api';
import { ProjectDetailsModal } from './ProjectDetailsModal';
import { Toast } from '../common/Toast';

export const ProjectsView: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Selected project for details / tasks modal
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

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

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchProjects();
      setProjects(data);

      // If a project is selected in modal, keep its active state updated
      if (selectedProject) {
        const updated = data.find(p => p.id === selectedProject.id);
        if (updated) setSelectedProject(updated);
      }
    } catch (err: any) {
      console.error('Erro ao buscar projetos:', err);
      setError(err.message || 'Falha ao conectar com o servidor API.');
      addToast('error', 'Falha na conexão', 'Não foi possível carregar a lista de projetos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // Add task to project
  const handleAddTask = async (projectId: number, taskInput: TaskCreateInput) => {
    await createProjectTask(projectId, taskInput);
    await loadProjects();
    addToast('success', 'Tarefa adicionada!', `"${taskInput.title}" associada ao projeto.`);
  };

  // Update task
  const handleUpdateTask = async (taskId: number, updates: TaskUpdateInput) => {
    await updateTask(taskId, updates);
    await loadProjects();
    addToast('success', 'Tarefa atualizada!', `Status alterado com sucesso.`);
  };

  // Delete task
  const handleDeleteTask = async (taskId: number) => {
    await deleteTask(taskId);
    await loadProjects();
    addToast('info', 'Tarefa removida', `A tarefa foi excluída do projeto.`);
  };

  // Open details modal
  const handleOpenDetails = (project: Project) => {
    setSelectedProject(project);
    setIsDetailsModalOpen(true);
  };

  // Filtered projects list
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = 
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.client_name && p.client_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'IN_PROGRESS').length;
    const completedProjects = projects.filter(p => p.status === 'COMPLETED').length;

    let totalTasks = 0;
    let completedTasks = 0;

    projects.forEach(p => {
      totalTasks += p.total_tasks || 0;
      completedTasks += p.completed_tasks || 0;
    });

    const overallExecutionRate = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0;

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalTasks,
      completedTasks,
      overallExecutionRate
    };
  }, [projects]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle size={12} className="mr-1" /> Concluído
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <Clock size={12} className="mr-1" /> Em Execução
          </span>
        );
      case 'ON_HOLD':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle size={12} className="mr-1" /> Em Pausa
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Planeamento
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>04. Projetos & Execução Técnica</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {projects.length} {projects.length === 1 ? 'projeto' : 'projetos'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhamento de obras, tarefas técnicas operacionais e progresso de execução
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={loadProjects}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition"
            title="Atualizar lista de projetos"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Projetos Ativos */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Projetos Ativos</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{stats.activeProjects}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Em fase de execução</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>

        {/* Projetos Concluídos */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Concluídos</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.completedProjects}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">De {stats.totalProjects} projetos totais</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Taxa de Execução de Tarefas */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Taxa de Execução de Tarefas</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.overallExecutionRate}%</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {stats.completedTasks} de {stats.totalTasks} tarefas concluídas
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* Main Table / Grid */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Pesquisar por código, projeto, cliente..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white transition"
              />
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('IN_PROGRESS')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  statusFilter === 'IN_PROGRESS'
                    ? 'bg-orange-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Em Execução
              </button>
              <button
                onClick={() => setStatusFilter('COMPLETED')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  statusFilter === 'COMPLETED'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Concluídos
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Exibindo <span className="font-semibold text-slate-800">{filteredProjects.length}</span> de <span className="font-semibold text-slate-800">{projects.length}</span> projetos
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
              onClick={loadProjects}
              className="font-semibold underline text-rose-700 hover:text-rose-900 ml-3"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-orange-600 border-t-transparent"></div>
            <p className="text-xs text-slate-500 mt-2 font-medium">A carregar projetos do PostgreSQL...</p>
          </div>
        )}

        {/* Empty State: No projects in DB */}
        {!isLoading && !error && projects.length === 0 && (
          <div className="p-12 text-center max-w-md mx-auto">
            <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Briefcase size={28} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Nenhum projeto em execução
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-5 leading-relaxed">
              Os projetos são gerados automaticamente a partir da aprovação de propostas comerciais na aba "Clientes & Propostas".
            </p>
          </div>
        )}

        {/* Empty State: Filter yields 0 */}
        {!isLoading && !error && projects.length > 0 && filteredProjects.length === 0 && (
          <div className="p-10 text-center text-slate-500 text-xs">
            <p className="font-semibold text-slate-700">Nenhum projeto corresponde aos filtros aplicados.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="mt-3 text-orange-600 font-semibold hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {/* Data Table */}
        {!isLoading && !error && filteredProjects.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Nome do Projeto</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Progresso de Tarefas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Início</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredProjects.map((project) => {
                  const percent = project.progress_percent || 0;
                  return (
                    <tr 
                      key={project.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetails(project)}
                    >
                      {/* Código */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200 group-hover:border-orange-200 group-hover:bg-orange-50 group-hover:text-orange-700 transition-colors">
                          {project.code || 'PRJ-2026-XXX'}
                        </span>
                      </td>

                      {/* Nome do Projeto */}
                      <td className="py-3 px-4 font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">
                        <div className="flex items-center space-x-2">
                          <Briefcase size={14} className="text-slate-400 group-hover:text-orange-500 flex-shrink-0" />
                          <span className="truncate max-w-xs">{project.name}</span>
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="py-3 px-4">
                        <span className="text-slate-700 font-medium flex items-center">
                          <Building2 size={13} className="mr-1.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[180px]">{project.client_name || '—'}</span>
                        </span>
                      </td>

                      {/* Progresso (% de tarefas concluídas) */}
                      <td className="py-3 px-4">
                        <div className="w-40 space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-600">
                            <span className="font-semibold">{percent}%</span>
                            <span>{project.completed_tasks || 0}/{project.total_tasks || 0} tarefas</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                            <div 
                              className={`h-1.5 rounded-full ${
                                percent === 100 ? 'bg-emerald-600' : 'bg-orange-600'
                              }`}
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {getStatusBadge(project.status)}
                      </td>

                      {/* Prazo / Início */}
                      <td className="py-3 px-4 text-slate-500">
                        {project.created_at ? (
                          <span className="flex items-center text-[11px]">
                            <Calendar size={12} className="mr-1 text-slate-400" />
                            {new Date(project.created_at).toLocaleDateString('pt-MZ')}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenDetails(project)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded border border-orange-200 transition flex items-center space-x-1"
                          >
                            <ListTodo size={12} />
                            <span>Gerir Tarefas</span>
                          </button>
                          <button
                            onClick={() => handleOpenDetails(project)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
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

      {/* Modal de Detalhes do Projeto e Checklist de Tarefas */}
      <ProjectDetailsModal
        project={selectedProject}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedProject(null);
        }}
        onAddTask={handleAddTask}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
      />
    </div>
  );
};
