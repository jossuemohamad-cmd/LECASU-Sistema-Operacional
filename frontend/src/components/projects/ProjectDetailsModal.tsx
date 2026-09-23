import React, { useState } from 'react';
import { 
  X, 
  Briefcase, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Plus, 
  Trash2, 
  Loader2, 
  ListTodo,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import type { Project, Task, TaskCreateInput, TaskUpdateInput } from '../../types';

interface ProjectDetailsModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (projectId: number, task: TaskCreateInput) => Promise<void>;
  onUpdateTask: (taskId: number, updates: TaskUpdateInput) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
}

export const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({
  project,
  isOpen,
  onClose,
  onAddTask,
  onUpdateTask,
  onDeleteTask
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !project) return null;

  const totalTasks = project.tasks?.length || 0;
  const completedTasks = project.tasks?.filter(t => t.status === 'DONE').length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleToggleTaskStatus = async (task: Task) => {
    try {
      setUpdatingTaskId(task.id);
      const nextStatus = task.status === 'DONE' ? 'TODO' : task.status === 'TODO' ? 'IN_PROGRESS' : 'DONE';
      await onUpdateTask(task.id, { status: nextStatus });
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao atualizar tarefa.');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      setIsAddingTask(true);
      setErrorMessage(null);
      await onAddTask(project.id, {
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim() || undefined,
        due_date: newTaskDueDate || undefined,
        status: 'TODO'
      });
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskDueDate('');
      setShowTaskForm(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao adicionar tarefa.');
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente remover esta tarefa?')) return;
    try {
      await onDeleteTask(taskId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao remover tarefa.');
    }
  };

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <Briefcase size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
                  {project.code || 'PRJ-2026-XXX'}
                </span>
                <h2 className="text-base font-bold text-slate-900 leading-tight">{project.name}</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span className="flex items-center"><Building2 size={12} className="mr-1" /> {project.client_name || 'Cliente'}</span>
                <span>•</span>
                {getStatusBadge(project.status)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="text-rose-600 font-bold ml-2">×</button>
            </div>
          )}

          {/* Progress Overview Bar */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-700">Progresso Geral de Execução</span>
              <span className="font-bold text-slate-900">{completedTasks} de {totalTasks} tarefas ({progressPercent}%)</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  progressPercent === 100 ? 'bg-emerald-600' : 'bg-orange-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Checklist de Tarefas Técnicas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <ListTodo size={16} className="text-orange-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Checklist & Tarefas Técnicas ({totalTasks})
                </h3>
              </div>
              {!showTaskForm && (
                <button
                  onClick={() => setShowTaskForm(true)}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-2.5 py-1 rounded border border-orange-200 transition"
                >
                  <Plus size={14} />
                  <span>+ Adicionar Tarefa</span>
                </button>
              )}
            </div>

            {/* Form Inline para Nova Tarefa */}
            {showTaskForm && (
              <form onSubmit={handleCreateTask} className="p-4 mb-4 bg-orange-50/50 border border-orange-200 rounded-lg space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800">Nova Tarefa Técnica</h4>
                  <button 
                    type="button" 
                    onClick={() => setShowTaskForm(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Cancelar
                  </button>
                </div>

                <div>
                  <input
                    type="text"
                    required
                    placeholder="Título da tarefa técnica *"
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Descrição / Detalhes técnicos"
                    value={newTaskDesc}
                    onChange={e => setNewTaskDesc(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={e => setNewTaskDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowTaskForm(false)}
                    className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingTask || !newTaskTitle.trim()}
                    className="px-4 py-1 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded shadow-xs transition flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {isAddingTask ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    <span>Guardar Tarefa</span>
                  </button>
                </div>
              </form>
            )}

            {/* Tasks List */}
            {totalTasks === 0 ? (
              <div className="p-8 border border-dashed border-slate-200 rounded-lg text-center bg-slate-50/50">
                <ListTodo size={24} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs text-slate-500">Nenhuma tarefa técnica adicionada a este projeto.</p>
                <button
                  onClick={() => setShowTaskForm(true)}
                  className="mt-2 text-xs font-semibold text-orange-600 hover:underline"
                >
                  + Adicionar primeira tarefa
                </button>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 bg-white">
                {project.tasks?.map((task) => {
                  const isDone = task.status === 'DONE';
                  const isInProgress = task.status === 'IN_PROGRESS';
                  const isUpdating = updatingTaskId === task.id;

                  return (
                    <div 
                      key={task.id}
                      className={`p-3.5 flex items-start justify-between transition group ${
                        isDone ? 'bg-slate-50/50' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-start space-x-3 flex-1 min-w-0 pr-3">
                        <button
                          onClick={() => handleToggleTaskStatus(task)}
                          disabled={isUpdating}
                          className="mt-0.5 text-slate-400 hover:text-orange-600 transition flex-shrink-0"
                          title="Clique para alternar status da tarefa"
                        >
                          {isUpdating ? (
                            <Loader2 size={18} className="animate-spin text-orange-600" />
                          ) : isDone ? (
                            <CheckCircle2 size={18} className="text-emerald-600 fill-emerald-50" />
                          ) : isInProgress ? (
                            <Clock size={18} className="text-orange-600" />
                          ) : (
                            <Circle size={18} className="text-slate-300 hover:text-slate-500" />
                          )}
                        </button>

                        <div className="space-y-0.5 flex-1 min-w-0">
                          <p className={`text-xs font-semibold transition ${
                            isDone ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-3 pt-1 text-[10px]">
                            {task.due_date && (
                              <span className="text-slate-500 flex items-center">
                                <Calendar size={11} className="mr-1 text-slate-400" />
                                Prazo: {new Date(task.due_date).toLocaleDateString('pt-MZ')}
                              </span>
                            )}
                            <span className={`font-semibold px-1.5 py-0.5 rounded text-[9px] ${
                              isDone ? 'bg-emerald-100 text-emerald-800' :
                              isInProgress ? 'bg-orange-100 text-orange-800' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {task.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <button
                          onClick={(e) => handleDeleteTask(task.id, e)}
                          className="p-1 text-slate-300 hover:text-rose-600 rounded transition opacity-0 group-hover:opacity-100"
                          title="Remover tarefa"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
