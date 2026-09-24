import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  ShoppingBag, 
  Plus, 
  RefreshCw, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  AlertCircle, 
  X, 
  Building2, 
  Phone, 
  Mail, 
  Briefcase
} from 'lucide-react';
import type { 
  Supplier, 
  SupplierCreateInput, 
  PurchaseOrder, 
  PurchaseOrderCreateInput, 
  SupplierOverviewKPIs, 
  Project, 
  ToastMessage 
} from '../../types';
import { 
  fetchSuppliers, 
  createSupplier, 
  toggleSupplierStatus, 
  fetchSupplierOverviewKPIs, 
  fetchPurchaseOrders, 
  createPurchaseOrder, 
  payPurchaseOrder, 
  fetchProjects 
} from '../../services/api';
import { Toast } from '../common/Toast';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { formatMZN } from '../../utils/formatters';

const CATEGORIES = [
  'Equipamentos Solares',
  'Material Elétrico',
  'Ferramentas',
  'Subcontratados',
  'Serviços Especializados',
  'Geral'
];

export const SuppliersView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'purchases'>('suppliers');
  
  // Data States
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [kpis, setKpis] = useState<SupplierOverviewKPIs>({
    total_suppliers: 0,
    active_suppliers_count: 0,
    pending_amount_mzn: 0,
    paid_amount_mzn: 0,
    total_purchases_count: 0,
    pending_orders_count: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');

  // Modal States
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States - Supplier
  const [supplierFormData, setSupplierFormData] = useState<SupplierCreateInput>({
    name: '',
    nuit: '',
    contact_person: '',
    email: '',
    phone: '',
    category: 'Equipamentos Solares',
    address: '',
    is_active: true
  });

  // Form States - Purchase Order
  const [purchaseFormData, setPurchaseFormData] = useState<PurchaseOrderCreateInput>({
    supplier_id: 0,
    project_id: null,
    description: '',
    total_amount: 0,
    due_date: ''
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

  const formatCurrency = (amount: number) => {
    return formatMZN(amount);
  };

  const loadData = async (showToast = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const [suppliersData, purchasesData, kpisData, projectsData] = await Promise.all([
        fetchSuppliers(),
        fetchPurchaseOrders(),
        fetchSupplierOverviewKPIs(),
        fetchProjects()
      ]);

      setSuppliers(suppliersData);
      setPurchases(purchasesData);
      setKpis(kpisData);
      setProjects(projectsData);

      if (showToast) {
        addToast('success', 'Dados sincronizados', 'Informações de fornecedores e compras atualizadas.');
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados de fornecedores:', err);
      setError(err.message || 'Falha ao carregar dados do servidor.');
      addToast('error', 'Falha de Conexão', 'Não foi possível sincronizar os dados do módulo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const matchSearch = 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.nuit && s.nuit.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.contact_person && s.contact_person.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCategory = !categoryFilter || s.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [suppliers, searchTerm, categoryFilter]);

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const matchSearch = 
        p.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.supplier_name && p.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.project_name && p.project_name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = purchaseStatusFilter === 'ALL' || p.status === purchaseStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [purchases, searchTerm, purchaseStatusFilter]);

  // Handlers - Supplier
  const handleOpenSupplierModal = () => {
    setSupplierFormData({
      name: '',
      nuit: '',
      contact_person: '',
      email: '',
      phone: '',
      category: 'Equipamentos Solares',
      address: '',
      is_active: true
    });
    setIsSupplierModalOpen(true);
  };

  const handleSubmitSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierFormData.name.trim()) {
      addToast('error', 'Nome obrigatório', 'Informe a razão social ou nome do fornecedor.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newSupplier = await createSupplier(supplierFormData);
      setSuppliers(prev => [newSupplier, ...prev]);
      addToast('success', 'Fornecedor Cadastrado', `"${newSupplier.name}" foi registrado com sucesso.`);
      setIsSupplierModalOpen(false);
      loadData(false);
    } catch (err: any) {
      console.error('Erro ao cadastrar fornecedor:', err);
      addToast('error', 'Falha no Cadastro', err.message || 'Verifique os dados informados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSupplierStatus = async (supplier: Supplier) => {
    try {
      const updated = await toggleSupplierStatus(supplier.id, !supplier.is_active);
      setSuppliers(prev => prev.map(s => s.id === updated.id ? updated : s));
      addToast(
        'info',
        updated.is_active ? 'Fornecedor Ativado' : 'Fornecedor Desativado',
        `O fornecedor "${supplier.name}" foi ${updated.is_active ? 'ativado' : 'desativado'}.`
      );
      loadData(false);
    } catch (err: any) {
      console.error('Erro ao alterar status do fornecedor:', err);
      addToast('error', 'Ação Bloqueada', err.message || 'Não foi possível alterar o status.');
    }
  };

  // Handlers - Purchase Order
  const handleOpenPurchaseModal = () => {
    const activeSuppliers = suppliers.filter(s => s.is_active);
    setPurchaseFormData({
      supplier_id: activeSuppliers.length > 0 ? activeSuppliers[0].id : 0,
      project_id: null,
      description: '',
      total_amount: 0,
      due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    setIsPurchaseModalOpen(true);
  };

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseFormData.supplier_id) {
      addToast('error', 'Fornecedor Obrigatório', 'Selecione um fornecedor para a compra.');
      return;
    }
    if (!purchaseFormData.description.trim()) {
      addToast('error', 'Descrição Obrigatória', 'Informe a descrição dos insumos.');
      return;
    }
    if (purchaseFormData.total_amount <= 0) {
      addToast('error', 'Valor Inválido', 'O valor total deve ser maior que zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newOrder = await createPurchaseOrder(purchaseFormData);
      setPurchases(prev => [newOrder, ...prev]);
      addToast('success', 'Ordem de Compra Emitida', `Pedido ${newOrder.order_number} criado com sucesso.`);
      setIsPurchaseModalOpen(false);
      loadData(false);
    } catch (err: any) {
      console.error('Erro ao emitir ordem de compra:', err);
      addToast('error', 'Falha na Emissão', err.message || 'Não foi possível criar a ordem de compra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [purchaseToPay, setPurchaseToPay] = useState<PurchaseOrder | null>(null);
  const [isPayingPurchase, setIsPayingPurchase] = useState(false);

  const handlePayPurchase = (order: PurchaseOrder) => {
    if (order.status === 'PAID') return;
    setPurchaseToPay(order);
  };

  const handleConfirmPayPurchase = async () => {
    if (!purchaseToPay) return;
    try {
      setIsPayingPurchase(true);
      const paid = await payPurchaseOrder(purchaseToPay.id);
      setPurchases(prev => prev.map(p => p.id === paid.id ? paid : p));
      addToast('success', 'Pagamento Registado', `A ordem de compra ${paid.order_number} foi liquidada com sucesso.`);
      setPurchaseToPay(null);
      loadData(false);
    } catch (err: any) {
      console.error('Erro ao liquidar pagamento:', err);
      addToast('error', 'Erro no Pagamento', err.message || 'Não foi possível liquidar o pedido.');
    } finally {
      setIsPayingPurchase(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'Equipamentos Solares':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">Equipamentos Solares</span>;
      case 'Material Elétrico':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">Material Elétrico</span>;
      case 'Ferramentas':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">Ferramentas</span>;
      case 'Subcontratados':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">Subcontratados</span>;
      case 'Serviços Especializados':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">Serviços</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">{category || 'Geral'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER OFICIAL */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-5 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Fornecedores & Gestão de Compras
            </h1>
            <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-[11px] font-semibold rounded">
              Módulo 07
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão de parceiros comerciais de insumos, equipamentos solares, ordens de compra e liquidação de despesas.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadData(true)}
            disabled={isLoading}
            className="flex items-center space-x-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-md shadow-2xs transition disabled:opacity-50 cursor-pointer"
            title="Sincronizar dados"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-orange-600' : 'text-slate-500'} />
            <span>{isLoading ? 'Sincronizando...' : 'Atualizar'}</span>
          </button>

          {activeTab === 'suppliers' ? (
            <button
              onClick={handleOpenSupplierModal}
              className="flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-xs transition cursor-pointer"
            >
              <Plus size={15} />
              <span>+ Novo Fornecedor</span>
            </button>
          ) : (
            <button
              onClick={handleOpenPurchaseModal}
              className="flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-xs transition cursor-pointer"
            >
              <Plus size={15} />
              <span>+ Nova Compra</span>
            </button>
          )}
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start space-x-3 text-xs">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1">
            <span className="font-semibold block text-red-900">Erro no Carregamento</span>
            <span>{error}</span>
          </div>
          <button 
            onClick={() => loadData(true)} 
            className="underline font-semibold hover:text-red-900 ml-2 cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* 3 KPI CARDS OFICIAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Fornecedores Registados</span>
            <div className="w-8 h-8 rounded-md bg-orange-50 text-orange-600 flex items-center justify-center">
              <Truck size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {kpis.total_suppliers}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">
              ({kpis.active_suppliers_count} ativos)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Parceiros homologados no sistema</p>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Compras em Aberto (MZN)</span>
            <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-amber-600 tracking-tight font-mono">
              {formatCurrency(kpis.pending_amount_mzn)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {kpis.pending_orders_count} ordens pendentes de liquidação
          </p>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Despesas Liquidadas (MZN)</span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-600 tracking-tight font-mono">
              {formatCurrency(kpis.paid_amount_mzn)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Total de pagamentos já efetuados</p>
        </div>
      </div>

      {/* NAVEGAÇÃO DE SUB-ABAS */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-medium">
        <button
          onClick={() => { setActiveTab('suppliers'); setSearchTerm(''); }}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition cursor-pointer ${
            activeTab === 'suppliers'
              ? 'border-orange-600 text-orange-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck size={16} />
          <span>Lista de Fornecedores</span>
          <span className="ml-1.5 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-semibold">
            {suppliers.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('purchases'); setSearchTerm(''); }}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition cursor-pointer ${
            activeTab === 'purchases'
              ? 'border-orange-600 text-orange-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag size={16} />
          <span>Ordens de Compra & Despesas</span>
          <span className="ml-1.5 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-semibold">
            {purchases.length}
          </span>
        </button>
      </div>

      {/* FILTROS E BARRA DE BUSCA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={14} />
          </div>
          <input
            type="text"
            placeholder={
              activeTab === 'suppliers' 
                ? 'Pesquisar por nome, NUIT ou contacto...' 
                : 'Pesquisar por nº pedido, descrição ou fornecedor...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === 'suppliers' ? (
            <div className="flex items-center space-x-1.5">
              <Filter size={13} className="text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="">Todas as Categorias</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5">
              <Filter size={13} className="text-slate-400" />
              <select
                value={purchaseStatusFilter}
                onChange={(e) => setPurchaseStatusFilter(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="ALL">Todos os Status</option>
                <option value="PENDING">Apenas Pendentes</option>
                <option value="PAID">Apenas Pagas / Liquidadas</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* CONTEÚDO DA SUB-ABA 1: FORNECEDORES */}
      {activeTab === 'suppliers' && (
        <div className="table-container-erp">
          <div className="table-scroll-container">
            <table className="table-erp">
              <thead>
                <tr className="table-header-erp">
                  <th className="px-4">Fornecedor</th>
                  <th className="px-4">NUIT</th>
                  <th className="px-4">Categoria</th>
                  <th className="px-4">Contacto Principal</th>
                  <th className="px-4">Telefone / E-mail</th>
                  <th className="px-4 text-right">Total Compras</th>
                  <th className="px-4">Status</th>
                  <th className="px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      Nenhum fornecedor encontrado com os critérios de filtro.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="table-row-erp hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 min-w-[220px]">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 flex-shrink-0">
                            <Building2 size={14} className="text-orange-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 font-heading">{supplier.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">ID: #{supplier.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 cell-nowrap text-slate-600 font-mono text-[11px]">
                        {supplier.nuit || '—'}
                      </td>

                      <td className="px-4 cell-nowrap">
                        {getCategoryBadge(supplier.category)}
                      </td>

                      <td className="px-4 min-w-[140px] text-slate-700 font-medium">
                        {supplier.contact_person || '—'}
                      </td>

                      <td className="px-4 cell-nowrap text-slate-600 text-[11px]">
                        <div className="space-y-0.5">
                          {supplier.phone && (
                            <div className="flex items-center gap-1">
                              <Phone size={11} className="text-slate-400" />
                              <span className="font-mono">{supplier.phone}</span>
                            </div>
                          )}
                          {supplier.email && (
                            <div className="flex items-center gap-1">
                              <Mail size={11} className="text-slate-400" />
                              <span>{supplier.email}</span>
                            </div>
                          )}
                          {!supplier.phone && !supplier.email && (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 text-right font-mono font-semibold text-slate-800 cell-nowrap font-heading">
                        {formatCurrency(supplier.total_spent)}
                        <span className="block text-[10px] text-slate-400 font-normal font-sans">
                          {supplier.purchases_count} pedido(s)
                        </span>
                      </td>

                      <td className="px-4 cell-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          supplier.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {supplier.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      <td className="px-4 td-actions cell-nowrap">
                        <button
                          onClick={() => handleToggleSupplierStatus(supplier)}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded transition border cursor-pointer ${
                            supplier.is_active
                              ? 'bg-white hover:bg-rose-50 text-rose-700 border-slate-200 hover:border-rose-300'
                              : 'bg-white hover:bg-emerald-50 text-emerald-700 border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          {supplier.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 2: ORDENS DE COMPRA */}
      {activeTab === 'purchases' && (
        <div className="table-container-erp">
          <div className="table-scroll-container">
            <table className="table-erp">
              <thead>
                <tr className="table-header-erp">
                  <th className="px-4">Nº Ordem</th>
                  <th className="px-4">Fornecedor</th>
                  <th className="px-4">Descrição dos Insumos</th>
                  <th className="px-4">Projeto Vinculado</th>
                  <th className="px-4 text-right">Valor (MZN)</th>
                  <th className="px-4">Vencimento</th>
                  <th className="px-4">Status</th>
                  <th className="px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      Nenhuma ordem de compra cadastrada ou encontrada com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((order) => (
                    <tr key={order.id} className="table-row-erp hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 font-mono font-bold text-slate-900 cell-nowrap">
                        {order.order_number}
                      </td>

                      <td className="px-4 min-w-[180px]">
                        <div className="font-semibold text-slate-900 font-heading">{order.supplier_name}</div>
                        <div className="text-[10px] text-slate-400">{order.supplier_category}</div>
                      </td>

                      <td className="px-4 text-slate-700 min-w-[220px]">
                        {order.description}
                      </td>

                      <td className="px-4 cell-nowrap min-w-[140px]">
                        {order.project_code ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium">
                            <Briefcase size={11} />
                            <span className="font-mono font-semibold">{order.project_code}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Sem projeto</span>
                        )}
                      </td>

                      <td className="px-4 text-right font-mono font-bold text-slate-900 cell-nowrap font-heading">
                        {formatCurrency(order.total_amount)}
                      </td>

                      <td className="px-4 text-slate-600 font-mono text-[11px] cell-nowrap">
                        {order.due_date ? new Date(order.due_date).toLocaleDateString('pt-MZ') : '—'}
                      </td>

                      <td className="px-4 cell-nowrap">
                        {order.status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            Pago / Liquidado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock size={11} className="text-amber-600" />
                            Pendente
                          </span>
                        )}
                      </td>

                      <td className="px-4 td-actions cell-nowrap">
                        {order.status === 'PENDING' ? (
                          <button
                            onClick={() => handlePayPurchase(order)}
                            className="btn-success btn-sm"
                            title="Registar liquidação de pagamento"
                          >
                            <CreditCard size={12} />
                            <span>Liquidar</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">
                            {order.paid_at ? new Date(order.paid_at).toLocaleDateString('pt-MZ') : 'Liquidado'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL NOVO FORNECEDOR */}
      {isSupplierModalOpen && (
        <div className="modal-overlay-erp animate-in fade-in">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Truck size={18} className="text-orange-600" />
                <h3 className="font-bold text-sm text-slate-900">Cadastrar Novo Fornecedor</h3>
              </div>
              <button
                onClick={() => setIsSupplierModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitSupplier} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Razão Social / Nome da Empresa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Solares de Moçambique, Lda"
                  value={supplierFormData.name}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NUIT do Fornecedor
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 400987654"
                    value={supplierFormData.nuit || ''}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, nuit: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoria de Insumos *
                  </label>
                  <select
                    value={supplierFormData.category}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, category: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pessoa de Contacto
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Eng. Carlos Nhantumbo"
                    value={supplierFormData.contact_person || ''}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, contact_person: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contacto Telefónico
                  </label>
                  <input
                    type="text"
                    placeholder="+258 84 999 1234"
                    value={supplierFormData.phone || ''}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail Corporativo
                </label>
                <input
                  type="email"
                  placeholder="vendas@solares.co.mz"
                  value={supplierFormData.email || ''}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Endereço / Sede
                </label>
                <textarea
                  rows={2}
                  placeholder="Av. das Indústrias, Parcela 12, Matola - Moçambique"
                  value={supplierFormData.address || ''}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="supplier_active"
                  checked={supplierFormData.is_active}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, is_active: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                />
                <label htmlFor="supplier_active" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Fornecedor ativo para emissão imediata de ordens de compra
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'A salvar...' : 'Registar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVA ORDEM DE COMPRA */}
      {isPurchaseModalOpen && (
        <div className="modal-overlay-erp animate-in fade-in">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <ShoppingBag size={18} className="text-orange-600" />
                <h3 className="font-bold text-sm text-slate-900">Emitir Nova Ordem de Compra</h3>
              </div>
              <button
                onClick={() => setIsPurchaseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fornecedor Destinatário *
                </label>
                <select
                  required
                  value={purchaseFormData.supplier_id}
                  onChange={(e) => setPurchaseFormData({ ...purchaseFormData, supplier_id: parseInt(e.target.value) })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value={0} disabled>Selecione um fornecedor homologado...</option>
                  {suppliers.filter(s => s.is_active).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição dos Insumos / Materiais *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ex: Aquisição de 20 Painéis Solares Monocristalinos 550W Tier-1 com cabos solares 6mm²"
                  value={purchaseFormData.description}
                  onChange={(e) => setPurchaseFormData({ ...purchaseFormData, description: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor Total da Compra (MZN) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    step="0.01"
                    placeholder="0.00"
                    value={purchaseFormData.total_amount || ''}
                    onChange={(e) => setPurchaseFormData({ ...purchaseFormData, total_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data Limite de Vencimento
                  </label>
                  <input
                    type="date"
                    value={purchaseFormData.due_date ? purchaseFormData.due_date.split('T')[0] : ''}
                    onChange={(e) => setPurchaseFormData({ ...purchaseFormData, due_date: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vínculo a Projeto do Sistema (Opcional)
                </label>
                <select
                  value={purchaseFormData.project_id || ''}
                  onChange={(e) => setPurchaseFormData({ 
                    ...purchaseFormData, 
                    project_id: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="">— Sem vínculo a projeto específico (Despesa Geral) —</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name} ({p.client_name || 'Cliente'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Vincular a despesa a um projeto permite apurar a margem real de lucro no módulo financeiro.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'A emitir...' : 'Emitir Ordem de Compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* MODAL DE CONFIRMAÇÃO DE PAGAMENTO DE COMPRA */}
      <ConfirmationModal
        isOpen={!!purchaseToPay}
        onClose={() => setPurchaseToPay(null)}
        onConfirm={handleConfirmPayPurchase}
        title="Liquidar Ordem de Compra?"
        description={
          purchaseToPay ? (
            <span>
              Deseja confirmar a liquidação e pagamento no valor de{' '}
              <strong className="text-emerald-700 font-bold">{formatCurrency(purchaseToPay.total_amount)}</strong> referente ao pedido{' '}
              <strong className="text-[#101010]">"{purchaseToPay.order_number}"</strong> para o fornecedor{' '}
              <strong>{purchaseToPay.supplier_name || 'Fornecedor'}</strong>?
            </span>
          ) : ''
        }
        confirmText="Confirmar Liquidação"
        cancelText="Voltar"
        variant="success"
        isLoading={isPayingPurchase}
      />
    </div>
  );
};
