import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wrench, 
  Search, 
  Plus, 
  RefreshCw, 
  Layers, 
  DollarSign, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  X, 
  AlertCircle,
  Tag
} from 'lucide-react';
import type { Service, ServiceCreateInput, ServiceKPIs, ToastMessage } from '../../types';
import { fetchServices, fetchServiceCategories, fetchServiceKPIs, createService, updateService } from '../../services/api';
import { Toast } from '../common/Toast';
import { formatMZN } from '../../utils/formatters';

const PREDEFINED_CATEGORIES = [
  'Energia Solar',
  'Auditoria',
  'Instalação Elétrica',
  'Consultoria',
  'Telecomunicações & Redes',
  'Manutenção & Climatização'
];

const PREDEFINED_UNITS = [
  'Projeto',
  'Ponto',
  'Hora',
  'Mês',
  'kWp',
  'Unidade',
  'Metro'
];

export const ServicesView: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [kpis, setKpis] = useState<ServiceKPIs>({
    total_services: 0,
    active_categories_count: 0,
    average_base_price: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<ServiceCreateInput>({
    code: '',
    name: '',
    category: 'Energia Solar',
    description: '',
    unit: 'Projeto',
    base_price: 0,
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

  const loadData = async (showToast = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const [servicesData, categoriesData, kpisData] = await Promise.all([
        fetchServices(),
        fetchServiceCategories(),
        fetchServiceKPIs()
      ]);

      setServices(servicesData);
      setCategories(categoriesData);
      setKpis(kpisData);

      if (showToast) {
        addToast('success', 'Catálogo atualizado', 'Serviços sincronizados com o PostgreSQL.');
      }
    } catch (err: any) {
      console.error('Erro ao carregar serviços:', err);
      setError(err.message || 'Falha ao conectar com o catálogo de serviços.');
      addToast('error', 'Falha de Conexão', 'Não foi possível obter a lista de serviços.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      if (selectedCategory !== 'ALL' && service.category !== selectedCategory) {
        return false;
      }
      if (selectedStatusFilter === 'ACTIVE' && !service.is_active) {
        return false;
      }
      if (selectedStatusFilter === 'INACTIVE' && service.is_active) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = service.name.toLowerCase().includes(q);
        const matchCode = (service.code || '').toLowerCase().includes(q);
        const matchDesc = (service.description || '').toLowerCase().includes(q);
        const matchCat = service.category.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [services, selectedCategory, selectedStatusFilter, searchQuery]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setFormData({
      code: '',
      name: '',
      category: categories[0] || 'Energia Solar',
      description: '',
      unit: 'Projeto',
      base_price: 0,
      is_active: true
    });
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (service: Service) => {
    setEditingService(service);
    setFormData({
      code: service.code || '',
      name: service.name,
      category: service.category,
      description: service.description || '',
      unit: service.unit,
      base_price: service.base_price,
      is_active: service.is_active
    });
  };

  // Handle Form Submit (Create or Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addToast('error', 'Campo obrigatório', 'O nome do serviço é obrigatório.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingService) {
        // Update
        const updated = await updateService(editingService.id, formData);
        setServices(prev => prev.map(s => s.id === updated.id ? updated : s));
        addToast('success', 'Serviço atualizado!', `"${updated.name}" foi alterado com sucesso.`);
        setEditingService(null);
      } else {
        // Create
        const created = await createService(formData);
        setServices(prev => [created, ...prev]);
        addToast('success', 'Serviço cadastrado!', `"${created.name}" adicionado ao catálogo.`);
        setIsCreateModalOpen(false);
      }

      // Refresh KPIs & categories
      const [updatedCats, updatedKpis] = await Promise.all([
        fetchServiceCategories(),
        fetchServiceKPIs()
      ]);
      setCategories(updatedCats);
      setKpis(updatedKpis);
    } catch (err: any) {
      console.error('Erro ao guardar serviço:', err);
      addToast('error', 'Falha ao guardar', err.message || 'Verifique os dados informados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active status directly from table
  const handleToggleStatus = async (service: Service) => {
    try {
      const newStatus = !service.is_active;
      const updated = await updateService(service.id, { is_active: newStatus });
      setServices(prev => prev.map(s => s.id === updated.id ? updated : s));
      addToast(
        'info', 
        newStatus ? 'Serviço ativado' : 'Serviço desativado',
        `"${service.name}" agora está ${newStatus ? 'ativo' : 'inativo'}.`
      );
      const updatedKpis = await fetchServiceKPIs();
      setKpis(updatedKpis);
    } catch (err: any) {
      console.error('Erro ao alternar status:', err);
      addToast('error', 'Erro ao alterar status', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER OFICIAL */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-5 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Catálogo de Serviços & Tabela Base
            </h1>
            <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-[11px] font-semibold rounded">
              Módulo 03
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Padronização de serviços técnicos, preços base e unidades para propostas comerciais e execução.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => loadData(true)}
            disabled={isLoading}
            className="btn-secondary btn-md"
            title="Atualizar lista de serviços"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-[#FF8000]' : 'text-neutral-600'} />
            <span>{isLoading ? 'Sincronizando...' : 'Atualizar'}</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="btn-primary btn-md"
          >
            <Plus size={15} />
            <span>+ Novo Serviço</span>
          </button>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start space-x-3 text-xs">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1">
            <span className="font-semibold block text-red-900">Erro de Conexão</span>
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

      {/* GRADE DE 3 CARDS DE KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: Total Serviços */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
              Serviços no Catálogo
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {kpis.total_services} <span className="text-xs font-normal text-slate-500">cadastrados</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Referência técnica para orçamentos
            </p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
            <Wrench size={24} />
          </div>
        </div>

        {/* KPI 2: Categorias Ativas */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
              Categorias Ativas
            </p>
            <h3 className="text-2xl font-bold text-blue-700 mt-1">
              {kpis.active_categories_count} <span className="text-xs font-normal text-slate-500">especialidades</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Áreas técnicas integradas
            </p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Layers size={24} />
          </div>
        </div>

        {/* KPI 3: Ticket Médio Base */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
              Ticket Médio Base
            </p>
            <h3 className="text-xl font-bold text-emerald-600 mt-1">
              {formatMZN(kpis.average_base_price)}
            </h3>
            <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 size={12} />
              Média ponderada por serviço
            </p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      {/* TABELA DE SERVIÇOS & BARRA DE FILTROS */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        {/* BARRA DE FILTROS */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-orange-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Serviços Cadastrados
            </h2>
            <span className="text-xs text-slate-500">
              ({filteredServices.length} de {services.length})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* PESQUISA */}
            <div className="relative min-w-[220px]">
              <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Pesquisar por código, nome ou descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            {/* FILTRO DE CATEGORIA */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-700"
            >
              <option value="ALL">Todas as Categorias</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* FILTRO DE STATUS */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-700"
            >
              <option value="ALL">Todos os Status</option>
              <option value="ACTIVE">Apenas Ativos</option>
              <option value="INACTIVE">Apenas Inativos</option>
            </select>

            {(selectedCategory !== 'ALL' || selectedStatusFilter !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCategory('ALL');
                  setSelectedStatusFilter('ALL');
                  setSearchQuery('');
                }}
                className="px-2 py-1 text-xs text-orange-600 hover:text-orange-800 bg-orange-50 rounded flex items-center gap-1 font-semibold"
                title="Limpar todos os filtros"
              >
                Limpar
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* LISTAGEM TABELADA */}
        <div className="overflow-x-auto">
          {filteredServices.length === 0 ? (
            <div className="p-12 text-center">
              <Wrench size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Nenhum serviço encontrado</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Não há itens que correspondam aos filtros aplicados ou nenhum serviço foi cadastrado.
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="mt-3 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-semibold transition"
              >
                + Cadastrar Primeiro Serviço
              </button>
            </div>
          ) : (
          <div className="table-scroll-container">
            <table className="table-erp">
              <thead>
                <tr className="table-header-erp">
                  <th className="px-4">Código</th>
                  <th className="px-4">Nome do Serviço</th>
                  <th className="px-4">Categoria</th>
                  <th className="px-4">Unidade</th>
                  <th className="px-4">Preço Base (MZN)</th>
                  <th className="px-4">Status</th>
                  <th className="px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredServices.map((service) => (
                  <tr key={service.id} className="table-row-erp hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 cell-nowrap">
                      <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {service.code || `SRV-${service.id}`}
                      </span>
                    </td>

                    <td className="px-4 min-w-[260px]">
                      <div className="font-semibold text-slate-900 font-heading">
                        {service.name}
                      </div>
                      {service.description && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {service.description}
                        </div>
                      )}
                    </td>

                    <td className="px-4 cell-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        <Tag size={10} className="text-orange-600" />
                        {service.category}
                      </span>
                    </td>

                    <td className="px-4 cell-nowrap text-slate-600 font-medium">
                      {service.unit}
                    </td>

                    <td className="px-4 cell-nowrap font-bold text-slate-900 font-heading">
                      {formatMZN(service.base_price)}
                    </td>

                    <td className="px-4 cell-nowrap">
                      <button
                        onClick={() => handleToggleStatus(service)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                          service.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Clique para alternar o status"
                      >
                        {service.is_active ? (
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
                      </button>
                    </td>

                    <td className="px-4 td-actions cell-nowrap">
                      <button
                        onClick={() => handleOpenEditModal(service)}
                        className="btn-secondary btn-sm"
                        title="Editar detalhes do serviço"
                      >
                        <Edit3 size={11} className="text-[#FF8000]" />
                        <span>Editar</span>
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

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE SERVIÇO */}
      {(isCreateModalOpen || editingService) && (
        <div className="modal-overlay-erp animate-in fade-in">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Wrench size={18} className="text-[#FF8000]" />
                <h3 className="font-bold text-sm text-slate-900">
                  {editingService ? 'Editar Serviço Técnico' : 'Novo Serviço no Catálogo'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingService(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* CÓDIGO */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código <span className="text-[10px] text-slate-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: SRV-SOL-01"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full text-xs font-mono uppercase bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                {/* CATEGORIA */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoria *
                  </label>
                  <input
                    type="text"
                    list="categories-list"
                    required
                    placeholder="Selecione ou digite..."
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <datalist id="categories-list">
                    {Array.from(new Set([...categories, ...PREDEFINED_CATEGORIES])).map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* NOME DO SERVIÇO */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Instalação de Sistema Solar 5kWp"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* UNIDADE */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unidade de Medida *
                  </label>
                  <select
                    value={formData.unit || 'Projeto'}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    {PREDEFINED_UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                {/* PREÇO BASE */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Preço Base (MZN) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* DESCRIÇÃO / ESCOPO TÉCNICO */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição Técnica do Serviço
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalhes operacionais, equipamentos inclusos e escopo padrão..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                />
              </div>

              {/* STATUS ATIVO */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                />
                <label htmlFor="is_active" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Disponível para seleção em propostas e orçamentos comerciais
                </label>
              </div>

              {/* BOTOES DE ACAO */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingService(null);
                  }}
                  className="btn-secondary btn-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary btn-md disabled:opacity-50"
                >
                  {isSubmitting ? 'A guardar...' : editingService ? 'Atualizar Serviço' : 'Cadastrar Serviço'}
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
