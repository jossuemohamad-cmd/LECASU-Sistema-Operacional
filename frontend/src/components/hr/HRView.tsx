import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Building2, 
  Clock, 
  Plus, 
  RefreshCw, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  X, 
  Coins, 
  CalendarCheck, 
  Check
} from 'lucide-react';
import type { 
  Employee, 
  EmployeeCreateInput, 
  EmployeeLeave, 
  LeaveCreateInput, 
  HROverviewKPIs,
  ToastMessage
} from '../../types';
import { 
  fetchEmployees, 
  createEmployee, 
  toggleEmployeeStatus, 
  fetchLeaves, 
  createLeave, 
  approveLeave, 
  fetchHROverviewKPIs 
} from '../../services/api';
import { Toast } from '../common/Toast';
import { formatMZN } from '../../utils/formatters';

const DEPARTMENTS = [
  'Engenharia & Operações',
  'Comercial & Vendas',
  'Financeiro & Administrativo',
  'Direção Geral',
  'Logística & Compras'
];

const CONTRACT_TYPES = [
  'Indeterminado',
  'Prazo Determinado',
  'Prestação de Serviços',
  'Estágio Profissional'
];

const LEAVE_TYPES = [
  'Férias',
  'Licença Médica',
  'Falta Justificada',
  'Licença de Casamento/Paternidade',
  'Outra Licença'
];

export const HRView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'employees' | 'leaves'>('employees');

  // Data States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<EmployeeLeave[]>([]);
  const [kpis, setKpis] = useState<HROverviewKPIs>({
    total_employees: 0,
    active_employees_count: 0,
    active_departments_count: 0,
    on_leave_count: 0,
    monthly_payroll_mzn: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Modals
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State - Employee
  const [employeeFormData, setEmployeeFormData] = useState<EmployeeCreateInput>({
    name: '',
    email: '',
    phone: '',
    bi_number: '',
    nuit: '',
    department: 'Engenharia & Operações',
    position: 'Técnico Especialista',
    contract_type: 'Indeterminado',
    base_salary: 0,
    hire_date: new Date().toISOString().split('T')[0],
    is_active: true
  });

  // Form State - Leave
  const [leaveFormData, setLeaveFormData] = useState<LeaveCreateInput>({
    employee_id: 0,
    leave_type: 'Férias',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reason: ''
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
      const [employeesData, leavesData, kpisData] = await Promise.all([
        fetchEmployees(),
        fetchLeaves(),
        fetchHROverviewKPIs()
      ]);

      setEmployees(employeesData);
      setLeaves(leavesData);
      setKpis(kpisData);

      if (showToast) {
        addToast('success', 'RH Sincronizado', 'Dados de colaboradores e ausências atualizados com o PostgreSQL.');
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados de RH:', err);
      setError(err.message || 'Falha ao carregar dados de RH.');
      addToast('error', 'Falha de Conexão', 'Não foi possível carregar os dados do módulo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchSearch = 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (emp.bi_number && emp.bi_number.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchDept = !departmentFilter || emp.department === departmentFilter;
      return matchSearch && matchDept;
    });
  }, [employees, searchTerm, departmentFilter]);

  // Filtered Leaves
  const filteredLeaves = useMemo(() => {
    return leaves.filter(l => {
      const matchSearch = 
        (l.employee_name && l.employee_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        l.leave_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.reason && l.reason.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = leaveStatusFilter === 'ALL' || l.status === leaveStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [leaves, searchTerm, leaveStatusFilter]);

  // Handlers - Employee
  const handleOpenEmployeeModal = () => {
    setEmployeeFormData({
      name: '',
      email: '',
      phone: '',
      bi_number: '',
      nuit: '',
      department: 'Engenharia & Operações',
      position: 'Técnico Especialista',
      contract_type: 'Indeterminado',
      base_salary: 45000,
      hire_date: new Date().toISOString().split('T')[0],
      is_active: true
    });
    setIsEmployeeModalOpen(true);
  };

  const handleSubmitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeFormData.name.trim()) {
      addToast('error', 'Nome Obrigatório', 'Informe o nome completo do colaborador.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newEmp = await createEmployee(employeeFormData);
      setEmployees(prev => [newEmp, ...prev]);
      addToast('success', 'Colaborador Registado', `"${newEmp.name}" foi cadastrado com sucesso.`);
      setIsEmployeeModalOpen(false);
      loadData(false);
    } catch (err: any) {
      console.error('Erro ao cadastrar colaborador:', err);
      addToast('error', 'Falha no Registo', err.message || 'Verifique os dados informados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleEmployeeStatus = async (emp: Employee) => {
    try {
      const updated = await toggleEmployeeStatus(emp.id, !emp.is_active);
      setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
      addToast(
        'info',
        updated.is_active ? 'Colaborador Ativado' : 'Colaborador Desativado',
        `O colaborador "${emp.name}" foi ${updated.is_active ? 'ativado' : 'desativado'}.`
      );
      loadData(false);
    } catch (err: any) {
      console.error('Erro ao alterar status do colaborador:', err);
      addToast('error', 'Ação Bloqueada', err.message || 'Não foi possível alterar o status.');
    }
  };

  // Handlers - Leave
  const handleOpenLeaveModal = () => {
    const activeEmps = employees.filter(e => e.is_active);
    setLeaveFormData({
      employee_id: activeEmps.length > 0 ? activeEmps[0].id : 0,
      leave_type: 'Férias',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      reason: ''
    });
    setIsLeaveModalOpen(true);
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveFormData.employee_id) {
      addToast('error', 'Colaborador Obrigatório', 'Selecione o colaborador para a ausência.');
      return;
    }
    if (!leaveFormData.start_date || !leaveFormData.end_date) {
      addToast('error', 'Datas Obrigatórias', 'Informe as datas de início e fim.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newLeave = await createLeave(leaveFormData);
      setLeaves(prev => [newLeave, ...prev]);
      addToast('success', 'Solicitação Registada', `Pedido de ${newLeave.leave_type} registado com sucesso.`);
      setIsLeaveModalOpen(false);
      loadData(false);
    } catch (err: any) {
      console.error('Erro ao registar ausência:', err);
      addToast('error', 'Falha no Registo', err.message || 'Não foi possível registar o pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveLeave = async (leaveId: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      const updated = await approveLeave(leaveId, status);
      setLeaves(prev => prev.map(l => l.id === updated.id ? updated : l));
      addToast(
        status === 'APPROVED' ? 'success' : 'info',
        status === 'APPROVED' ? 'Ausência Aprovada' : 'Ausência Rejeitada',
        `A solicitação do colaborador foi ${status === 'APPROVED' ? 'aprovada' : 'rejeitada'}.`
      );
      loadData(false);
    } catch (err: any) {
      console.error('Erro ao atualizar ausência:', err);
      addToast('error', 'Erro na Operação', err.message || 'Não foi possível processar a ação.');
    }
  };

  const getDepartmentBadge = (department: string) => {
    switch (department) {
      case 'Engenharia & Operações':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">Engenharia</span>;
      case 'Comercial & Vendas':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-50 text-orange-700 border border-orange-200">Comercial</span>;
      case 'Financeiro & Administrativo':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">Financeiro</span>;
      case 'Direção Geral':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">Direção</span>;
      case 'Logística & Compras':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">{department || 'Geral'}</span>;
    }
  };

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* HEADER OFICIAL */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-5 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Recursos Humanos & Gestão de Pessoal
            </h1>
            <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-[11px] font-semibold rounded">
              Módulo 08
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quadro de colaboradores, departamentos, remunerações base em MZN e controlo de férias e licenças.
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

          {activeTab === 'employees' ? (
            <button
              onClick={handleOpenEmployeeModal}
              className="flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-xs transition cursor-pointer"
            >
              <Plus size={15} />
              <span>+ Novo Colaborador</span>
            </button>
          ) : (
            <button
              onClick={handleOpenLeaveModal}
              className="flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-xs transition cursor-pointer"
            >
              <Plus size={15} />
              <span>+ Registar Ausência / Férias</span>
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

      {/* 4 KPI CARDS OFICIAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total de Colaboradores</span>
            <div className="w-8 h-8 rounded-md bg-orange-50 text-orange-600 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {kpis.total_employees}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">
              ({kpis.active_employees_count} ativos)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Efetivo da empresa registado</p>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Departamentos Ativos</span>
            <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-blue-700 tracking-tight">
              {kpis.active_departments_count}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Áreas operacionais com equipa</p>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Colaboradores em Férias</span>
            <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-amber-600 tracking-tight">
              {kpis.on_leave_count}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Licenças ativas aprovadas</p>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Massa Salarial Mensal</span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Coins size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-emerald-600 tracking-tight font-mono">
              {formatCurrency(kpis.monthly_payroll_mzn)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Soma de salários base ativos</p>
        </div>
      </div>

      {/* NAVEGAÇÃO DE SUB-ABAS */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-medium">
        <button
          onClick={() => { setActiveTab('employees'); setSearchTerm(''); }}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition cursor-pointer ${
            activeTab === 'employees'
              ? 'border-orange-600 text-orange-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users size={16} />
          <span>Quadro de Colaboradores</span>
          <span className="ml-1.5 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-semibold">
            {employees.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('leaves'); setSearchTerm(''); }}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition cursor-pointer ${
            activeTab === 'leaves'
              ? 'border-orange-600 text-orange-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarCheck size={16} />
          <span>Presenças & Ausências</span>
          <span className="ml-1.5 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-semibold">
            {leaves.length}
          </span>
        </button>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={14} />
          </div>
          <input
            type="text"
            placeholder={
              activeTab === 'employees'
                ? 'Pesquisar por nome, cargo, e-mail ou BI...'
                : 'Pesquisar por colaborador, motivo ou tipo...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === 'employees' ? (
            <div className="flex items-center space-x-1.5">
              <Filter size={13} className="text-slate-400" />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="">Todos os Departamentos</option>
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5">
              <Filter size={13} className="text-slate-400" />
              <select
                value={leaveStatusFilter}
                onChange={(e) => setLeaveStatusFilter(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="ALL">Todos os Estados</option>
                <option value="PENDING">Apenas Pendentes</option>
                <option value="APPROVED">Apenas Aprovadas</option>
                <option value="REJECTED">Apenas Rejeitadas</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* CONTEÚDO SUB-ABA 1: COLABORADORES */}
      {activeTab === 'employees' && (
        <div className="table-container-erp">
          <div className="table-scroll-container">
            <table className="table-erp">
              <thead>
                <tr className="table-header-erp">
                  <th className="px-4">Colaborador</th>
                  <th className="px-4">Cargo / Posição</th>
                  <th className="px-4">Departamento</th>
                  <th className="px-4">Contrato</th>
                  <th className="px-4 text-right">Salário Base (MZN)</th>
                  <th className="px-4">Admissão</th>
                  <th className="px-4">Status</th>
                  <th className="px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      Nenhum colaborador encontrado com os critérios de filtro.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="table-row-erp hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 min-w-[220px]">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 font-heading">{emp.name}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2">
                              {emp.email && <span>{emp.email}</span>}
                              {emp.bi_number && <span className="font-mono">BI: {emp.bi_number}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 min-w-[140px] text-slate-800 font-medium">
                        {emp.position}
                      </td>

                      <td className="px-4 cell-nowrap">
                        {getDepartmentBadge(emp.department)}
                      </td>

                      <td className="px-4 cell-nowrap text-slate-600 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                          {emp.contract_type}
                        </span>
                      </td>

                      <td className="px-4 text-right font-mono font-bold text-slate-900 cell-nowrap font-heading">
                        {formatCurrency(emp.base_salary)}
                      </td>

                      <td className="px-4 text-slate-600 font-mono text-[11px] cell-nowrap">
                        {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('pt-MZ') : '—'}
                      </td>

                      <td className="px-4 cell-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          emp.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {emp.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      <td className="px-4 td-actions cell-nowrap">
                        <button
                          onClick={() => handleToggleEmployeeStatus(emp)}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded transition border cursor-pointer ${
                            emp.is_active
                              ? 'bg-white hover:bg-rose-50 text-rose-700 border-slate-200 hover:border-rose-300'
                              : 'bg-white hover:bg-emerald-50 text-emerald-700 border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          {emp.is_active ? 'Desativar' : 'Ativar'}
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

      {/* CONTEÚDO SUB-ABA 2: PRESENÇAS & AUSÊNCIAS */}
      {activeTab === 'leaves' && (
        <div className="table-container-erp">
          <div className="table-scroll-container">
            <table className="table-erp">
              <thead>
                <tr className="table-header-erp">
                  <th className="px-4">Colaborador</th>
                  <th className="px-4">Tipo de Ausência</th>
                  <th className="px-4">Período / Duração</th>
                  <th className="px-4">Motivo / Justificação</th>
                  <th className="px-4">Data de Pedido</th>
                  <th className="px-4">Status</th>
                  <th className="px-4 text-right">Ações de Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      Nenhuma solicitação de férias ou licença registada.
                    </td>
                  </tr>
                ) : (
                  filteredLeaves.map((leave) => {
                    const days = calculateDays(leave.start_date, leave.end_date);
                    return (
                      <tr key={leave.id} className="table-row-erp hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 min-w-[200px]">
                          <div className="font-semibold text-slate-900 font-heading">{leave.employee_name}</div>
                          <div className="text-[10px] text-slate-400">{leave.employee_position} • {leave.employee_department}</div>
                        </td>

                        <td className="px-4 cell-nowrap font-medium text-slate-800 min-w-[140px]">
                          {leave.leave_type}
                        </td>

                        <td className="px-4 cell-nowrap min-w-[180px]">
                          <div className="font-mono text-[11px] text-slate-700">
                            {new Date(leave.start_date).toLocaleDateString('pt-MZ')} ➔ {new Date(leave.end_date).toLocaleDateString('pt-MZ')}
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {days} dia(s) útil(eis)
                          </span>
                        </td>

                        <td className="px-4 text-slate-600 min-w-[220px]">
                          {leave.reason || '—'}
                        </td>

                        <td className="px-4 text-slate-500 font-mono text-[11px] cell-nowrap">
                          {leave.created_at ? new Date(leave.created_at).toLocaleDateString('pt-MZ') : '—'}
                        </td>

                        <td className="px-4 cell-nowrap">
                          {leave.status === 'APPROVED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              Aprovado
                            </span>
                          ) : leave.status === 'REJECTED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle size={11} className="text-rose-600" />
                              Rejeitado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock size={11} className="text-amber-600" />
                              Pendente
                            </span>
                          )}
                        </td>

                        <td className="px-4 td-actions cell-nowrap">
                          {leave.status === 'PENDING' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApproveLeave(leave.id, 'APPROVED')}
                                className="btn-success btn-sm"
                                title="Aprovar ausência"
                              >
                                <Check size={12} />
                                <span>Aprovar</span>
                              </button>
                              <button
                                onClick={() => handleApproveLeave(leave.id, 'REJECTED')}
                                className="btn-secondary btn-sm text-rose-700 hover:bg-rose-50"
                                title="Rejeitar ausência"
                              >
                                <X size={12} />
                                <span>Rejeitar</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">
                              {leave.status === 'APPROVED' ? 'Processado' : 'Finalizado'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL NOVO COLABORADOR */}
      {isEmployeeModalOpen && (
        <div className="modal-overlay-erp animate-in fade-in">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Users size={18} className="text-orange-600" />
                <h3 className="font-bold text-sm text-slate-900">Cadastrar Novo Colaborador</h3>
              </div>
              <button
                onClick={() => setIsEmployeeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitEmployee} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Eng. Américo Sitoe"
                  value={employeeFormData.name}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail Corporativo
                  </label>
                  <input
                    type="email"
                    placeholder="americo.sitoe@lecasu.co.mz"
                    value={employeeFormData.email || ''}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, email: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contacto Telefónico
                  </label>
                  <input
                    type="text"
                    placeholder="+258 84 111 2233"
                    value={employeeFormData.phone || ''}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, phone: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bilhete de Identidade (BI)
                  </label>
                  <input
                    type="text"
                    placeholder="110100234567M"
                    value={employeeFormData.bi_number || ''}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, bi_number: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NUIT Fiscal
                  </label>
                  <input
                    type="text"
                    placeholder="109876543"
                    value={employeeFormData.nuit || ''}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, nuit: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Departamento *
                  </label>
                  <select
                    value={employeeFormData.department}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, department: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cargo / Posição *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Engenheiro Eletrotécnico"
                    value={employeeFormData.position}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, position: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Contrato *
                  </label>
                  <select
                    value={employeeFormData.contract_type}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, contract_type: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    {CONTRACT_TYPES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Salário Base Mensal (MZN) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    value={employeeFormData.base_salary || ''}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, base_salary: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data de Admissão
                </label>
                <input
                  type="date"
                  value={employeeFormData.hire_date ? employeeFormData.hire_date.split('T')[0] : ''}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, hire_date: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="emp_active"
                  checked={employeeFormData.is_active}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, is_active: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                />
                <label htmlFor="emp_active" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Colaborador em exercício ativo das suas funções
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'A salvar...' : 'Registar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTAR AUSÊNCIA */}
      {isLeaveModalOpen && (
        <div className="modal-overlay-erp animate-in fade-in">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <CalendarCheck size={18} className="text-orange-600" />
                <h3 className="font-bold text-sm text-slate-900">Registar Ausência / Férias</h3>
              </div>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Colaborador Beneficiário *
                </label>
                <select
                  required
                  value={leaveFormData.employee_id}
                  onChange={(e) => setLeaveFormData({ ...leaveFormData, employee_id: parseInt(e.target.value) })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value={0} disabled>Selecione um colaborador ativo...</option>
                  {employees.filter(e => e.is_active).map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name} — {e.position} ({e.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Ausência / Licença *
                </label>
                <select
                  value={leaveFormData.leave_type}
                  onChange={(e) => setLeaveFormData({ ...leaveFormData, leave_type: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  {LEAVE_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data de Início *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveFormData.start_date.split('T')[0]}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, start_date: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data de Fim *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveFormData.end_date.split('T')[0]}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, end_date: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Justificação / Observações
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Período regulamentar de férias anuais acordado com a chefia direta."
                  value={leaveFormData.reason || ''}
                  onChange={(e) => setLeaveFormData({ ...leaveFormData, reason: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'A registar...' : 'Registar Ausência'}
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
