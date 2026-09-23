import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Users, 
  Building2, 
  Plus, 
  RefreshCw, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  X, 
  AlertCircle,
  Mail,
  Phone,
  Lock,
  Globe,
  Coins,
  Clock
} from 'lucide-react';
import type { User, UserCreateInput, ToastMessage } from '../../types';
import { fetchUsers, createUser, toggleUserStatus } from '../../services/api';
import { Toast } from '../common/Toast';

export const SettingsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'company'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<UserCreateInput>({
    name: '',
    email: '',
    password: '',
    role: 'tecnico',
    phone: '',
    is_active: true
  });

  // Toasts
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

  const loadUsers = async (showToast = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchUsers();
      setUsers(data);
      if (showToast) {
        addToast('success', 'Utilizadores atualizados', 'Dados sincronizados com o PostgreSQL.');
      }
    } catch (err: any) {
      console.error('Erro ao buscar utilizadores:', err);
      setError(err.message || 'Falha ao carregar utilizadores.');
      addToast('error', 'Falha de Conexão', 'Não foi possível listar os utilizadores.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenCreateModal = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'tecnico',
      phone: '',
      is_active: true
    });
    setIsCreateModalOpen(true);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      addToast('error', 'Campos obrigatórios', 'Preencha o nome, e-mail e senha.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newUser = await createUser(formData);
      setUsers(prev => [...prev, newUser]);
      addToast('success', 'Utilizador cadastrado!', `Conta criada com sucesso para ${newUser.name}.`);
      setIsCreateModalOpen(false);
    } catch (err: any) {
      console.error('Erro ao criar utilizador:', err);
      addToast('error', 'Falha no cadastro', err.message || 'Verifique os dados informados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      const newStatus = !user.is_active;
      const updated = await toggleUserStatus(user.id, newStatus);
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      addToast(
        'info',
        newStatus ? 'Acesso Ativado' : 'Acesso Desativado',
        `O utilizador "${user.name}" foi ${newStatus ? 'ativado' : 'desativado'}.`
      );
    } catch (err: any) {
      console.error('Erro ao alterar status do utilizador:', err);
      addToast('error', 'Ação Bloqueada', err.message || 'Não foi possível alterar o status.');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">Administrador</span>;
      case 'direcao':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">Direção</span>;
      case 'financeiro':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">Financeiro</span>;
      case 'engenheiro':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">Engenharia</span>;
      case 'tecnico':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">Técnico</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER OFICIAL */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-5 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Definições & Configurações do Sistema
            </h1>
            <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-[11px] font-semibold rounded">
              Módulo 10
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão de utilizadores corporativos, perfis de segurança e parâmetros da empresa.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadUsers(true)}
            disabled={isLoading}
            className="flex items-center space-x-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-md shadow-2xs transition disabled:opacity-50"
            title="Atualizar lista de utilizadores"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-orange-600' : 'text-slate-500'} />
            <span>{isLoading ? 'Sincronizando...' : 'Atualizar'}</span>
          </button>

          {activeSubTab === 'users' && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-xs transition"
            >
              <Plus size={15} />
              <span>+ Novo Utilizador</span>
            </button>
          )}
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
            onClick={() => loadUsers(true)} 
            className="underline font-semibold hover:text-red-900 ml-2"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* NAVEGAÇÃO DE SUB-ABAS */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-medium">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
            activeSubTab === 'users'
              ? 'border-orange-600 text-orange-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users size={16} />
          <span>Utilizadores & Perfis de Acesso</span>
          <span className="ml-1.5 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-semibold">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('company')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
            activeSubTab === 'company'
              ? 'border-orange-600 text-orange-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 size={16} />
          <span>Parâmetros da Empresa</span>
        </button>
      </div>

      {/* CONTEÚDO DA SUB-ABA 1: UTILIZADORES */}
      {activeSubTab === 'users' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck size={16} className="text-orange-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Contas de Acesso Autorizadas
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              {users.filter(u => u.is_active).length} utilizadores ativos no PostgreSQL
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Utilizador</th>
                  <th className="py-2.5 px-3">E-mail Corporativo</th>
                  <th className="py-2.5 px-3">Contacto</th>
                  <th className="py-2.5 px-3">Perfil de Acesso</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{user.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: #{user.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Mail size={12} className="text-slate-400" />
                        <span>{user.email}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                      {user.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone size={12} className="text-slate-400" />
                          <span>{user.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {getRoleBadge(user.role)}
                    </td>

                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                        user.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {user.is_active ? (
                          <>
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            Ativo
                          </>
                        ) : (
                          <>
                            <XCircle size={11} className="text-slate-400" />
                            Inativo
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(user)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded transition border ${
                          user.is_active
                            ? 'bg-white hover:bg-rose-50 text-rose-700 border-slate-200 hover:border-rose-300'
                            : 'bg-white hover:bg-emerald-50 text-emerald-700 border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        {user.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 2: PARÂMETROS DA EMPRESA */}
      {activeSubTab === 'company' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-6 space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Building2 size={18} className="text-orange-600" />
              <h3 className="font-bold text-sm text-slate-900">Dados Cadastrais da Empresa</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-500 text-[11px]">Razão Social</p>
                <p className="font-bold text-slate-900 mt-0.5">LECASU, Lda</p>
              </div>
              <div>
                <p className="text-slate-500 text-[11px]">NUIT</p>
                <p className="font-bold text-slate-900 mt-0.5">400192837</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-500 text-[11px]">Endereço / Sede</p>
                <p className="font-semibold text-slate-900 mt-0.5">
                  Av. 24 de Julho, Nº 1890, Maputo - Moçambique
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-[11px]">Contacto Telefónico</p>
                <p className="font-semibold text-slate-900 mt-0.5">+258 84 000 2026</p>
              </div>
              <div>
                <p className="text-slate-500 text-[11px]">E-mail Corporativo</p>
                <p className="font-semibold text-slate-900 mt-0.5">contacto@lecasu.co.mz</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-6 space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Globe size={18} className="text-orange-600" />
              <h3 className="font-bold text-sm text-slate-900">Parâmetros Operacionais</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200">
                <div className="flex items-center space-x-2">
                  <Coins size={16} className="text-orange-600" />
                  <span className="font-medium text-slate-700">Moeda Oficial do Sistema</span>
                </div>
                <span className="font-bold text-slate-900">MZN (Metical de Moçambique)</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200">
                <div className="flex items-center space-x-2">
                  <Clock size={16} className="text-blue-600" />
                  <span className="font-medium text-slate-700">Fuso Horário Operacional</span>
                </div>
                <span className="font-bold text-slate-900">CAT / GMT+2 (Maputo)</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200">
                <div className="flex items-center space-x-2">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span className="font-medium text-slate-700">Validade dos Tokens JWT</span>
                </div>
                <span className="font-bold text-emerald-700">24 Horas (HS256)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL + NOVO UTILIZADOR */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Users size={18} className="text-orange-600" />
                <h3 className="font-bold text-sm text-slate-900">Cadastrar Novo Utilizador</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitUser} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Manuel Mabote"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail Corporativo *
                </label>
                <input
                  type="email"
                  required
                  placeholder="manuel.mabote@lecasu.co.mz"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Palavra-passe *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contacto Telefónico
                  </label>
                  <input
                    type="text"
                    placeholder="+258 84 123 4567"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Perfil de Acesso (Role) *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="tecnico">Técnico Operacional</option>
                  <option value="engenheiro">Engenheiro / Gestor Técnico</option>
                  <option value="financeiro">Financeiro / Cobranças</option>
                  <option value="direcao">Direção / Gestor Comercial</option>
                  <option value="admin">Administrador Geral</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="user_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                />
                <label htmlFor="user_active" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Conta ativa para início de sessão imediato
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? 'A criar...' : 'Criar Utilizador'}
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
