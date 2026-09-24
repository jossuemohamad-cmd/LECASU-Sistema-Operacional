import { useState, useEffect } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Search, 
  RefreshCw, 
  Receipt,
  FileText,
  X
} from 'lucide-react';
import { 
  fetchInvoices, 
  createInvoice, 
  payInvoice, 
  cancelInvoice, 
  fetchFinanceOverviewKPIs, 
  fetchClients, 
  fetchProjects 
} from '../../services/api';
import type { 
  Invoice, 
  InvoiceCreateInput, 
  FinanceOverviewKPIs, 
  Client, 
  Project 
} from '../../types';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { formatMZN } from '../../utils/formatters';

export function FinanceView() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [kpis, setKpis] = useState<FinanceOverviewKPIs | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState<InvoiceCreateInput>({
    client_id: 0,
    project_id: null,
    invoice_number: '',
    amount: 0,
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'ISSUED'
  });

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setErrorMessage(null);
    try {
      const [invData, kpiData, clientData, projData] = await Promise.all([
        fetchInvoices({ status: statusFilter, search: searchTerm }),
        fetchFinanceOverviewKPIs(),
        fetchClients(),
        fetchProjects()
      ]);
      setInvoices(invData);
      setKpis(kpiData);
      setClients(clientData);
      setProjects(projData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao carregar dados financeiros.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(true);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id || formData.client_id === 0) {
      setErrorMessage('Por favor selecione o cliente para emitir a fatura.');
      return;
    }
    if (formData.amount <= 0) {
      setErrorMessage('O valor da fatura deve ser superior a zero.');
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);
    try {
      await createInvoice({
        client_id: Number(formData.client_id),
        project_id: formData.project_id ? Number(formData.project_id) : null,
        invoice_number: formData.invoice_number ? formData.invoice_number.trim() : undefined,
        amount: Number(formData.amount),
        due_date: formData.due_date ? `${formData.due_date}T00:00:00` : null,
        status: formData.status
      });
      setSuccessMessage('Fatura emitida com sucesso!');
      setIsModalOpen(false);
      setFormData({
        client_id: 0,
        project_id: null,
        invoice_number: '',
        amount: 0,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'ISSUED'
      });
      await loadData(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao emitir fatura.');
    } finally {
      setActionLoading(false);
    }
  };

  const [confirmAction, setConfirmAction] = useState<{ type: 'PAY' | 'CANCEL'; invoice: Invoice } | null>(null);

  const handlePayInvoice = (invoice: Invoice) => {
    setConfirmAction({ type: 'PAY', invoice });
  };

  const handleCancelInvoice = (invoice: Invoice) => {
    setConfirmAction({ type: 'CANCEL', invoice });
  };

  const handleConfirmInvoiceAction = async () => {
    if (!confirmAction) return;
    const { type, invoice } = confirmAction;
    setActionLoading(true);
    try {
      if (type === 'PAY') {
        await payInvoice(invoice.id);
        setSuccessMessage(`Pagamento da fatura ${invoice.invoice_number || invoice.id} registado com sucesso!`);
      } else {
        await cancelInvoice(invoice.id);
        setSuccessMessage(`Fatura ${invoice.invoice_number || invoice.id} cancelada com sucesso.`);
      }
      setConfirmAction(null);
      await loadData(false);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar ação na fatura.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="text-orange-600" size={26} />
            Gestão Financeira & Faturação
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Controlo de receitas, faturas emitidas, recebimentos e saldo operacional
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => loadData(true)}
            className="btn-secondary btn-md"
            title="Atualizar dados"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-[#FF8000]' : 'text-neutral-600'} />
            <span>Atualizar</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary btn-md"
          >
            <Plus size={16} />
            <span>Emitir Fatura</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-md flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-800">
            <X size={14} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPIS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Faturado */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Faturado</span>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText size={16} />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">
            {formatMZN(kpis?.total_invoiced)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {kpis?.issued_invoices_count || 0} faturas emitidas
          </p>
        </div>

        {/* Total Cobrado / Recebido */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Recebido</span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle size={16} />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-700 mt-2">
            {formatMZN(kpis?.total_received)}
          </p>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">
            {kpis?.paid_invoices_count || 0} liquidadas
          </p>
        </div>

        {/* Contas a Receber */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Contas a Receber</span>
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-xl font-bold text-amber-700 mt-2">
            {formatMZN(kpis?.pending_receivables)}
          </p>
          <p className="text-[11px] text-amber-600 mt-1">
            Pendente de pagamento
          </p>
        </div>

        {/* Saldo Líquido Operacional */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Saldo Líquido</span>
            <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className={`text-xl font-bold mt-2 ${(kpis?.net_cashflow || 0) >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            {formatMZN(kpis?.net_cashflow)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Recebido menos compras pagas
          </p>
        </div>
      </div>

      {/* TABELA E FILTROS */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {/* FILTERS TOOLBAR */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-md border border-slate-200">
            {[
              { id: 'ALL', label: 'Todas as Faturas' },
              { id: 'ISSUED', label: 'Emitidas (Pendentes)' },
              { id: 'PAID', label: 'Pagas' },
              { id: 'CANCELLED', label: 'Canceladas' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition ${
                  statusFilter === tab.id
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* SEARCH */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Pesquisar nº fatura ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 transition"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition"
            >
              Buscar
            </button>
          </form>
        </div>

        {/* INVOICES TABLE */}
        <div className="table-scroll-container">
          <table className="table-erp">
            <thead>
              <tr className="table-header-erp">
                <th className="px-4">Nº Fatura</th>
                <th className="px-4">Cliente</th>
                <th className="px-4">Projeto</th>
                <th className="px-4 text-right">Valor Total</th>
                <th className="px-4">Data Vencimento</th>
                <th className="px-4">Status</th>
                <th className="px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="animate-spin text-orange-600" size={18} />
                      <span>A carregar faturas...</span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Receipt className="mx-auto text-slate-300 mb-2" size={32} />
                    <p className="font-semibold text-slate-700 font-heading">Nenhuma fatura encontrada</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Clique em "Emitir Fatura" para gerar o primeiro documento financeiro.
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isPaid = inv.status === 'PAID';
                  const isCancelled = inv.status === 'CANCELLED';
                  const isPending = inv.status === 'ISSUED';

                  return (
                    <tr key={inv.id} className="table-row-erp hover:bg-slate-50/80 transition">
                      <td className="px-4 font-mono font-semibold text-slate-900 cell-nowrap">
                        {inv.invoice_number || `FT-${inv.id}`}
                      </td>
                      <td className="px-4 min-w-[180px] font-medium text-slate-800">
                        {inv.client_name || `Cliente #${inv.client_id}`}
                      </td>
                      <td className="px-4 cell-nowrap min-w-[150px] text-slate-500">
                        {inv.project_code ? (
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-mono">
                            {inv.project_code}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Geral / Sem Projeto</span>
                        )}
                      </td>
                      <td className="px-4 text-right font-bold text-slate-900 cell-nowrap font-heading">
                        {formatMZN(inv.amount)}
                      </td>
                      <td className="px-4 cell-nowrap text-slate-500">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('pt-PT') : '-'}
                      </td>
                      <td className="px-4 cell-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : isCancelled
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPaid ? 'Paga' : isCancelled ? 'Cancelada' : 'Emitida (Pendente)'}
                        </span>
                      </td>
                      <td className="px-4 td-actions cell-nowrap">
                        <div className="flex items-center justify-end space-x-2">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handlePayInvoice(inv)}
                                disabled={actionLoading}
                                className="btn-success btn-sm"
                                title="Registar Recebimento"
                              >
                                Receber
                              </button>
                              <button
                                onClick={() => handleCancelInvoice(inv)}
                                disabled={actionLoading}
                                className="btn-danger btn-sm"
                                title="Anular Fatura"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                          {!isPending && (
                            <span className="text-[11px] text-slate-400 italic">Concluído</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: EMITIR NOVA FATURA */}
      {isModalOpen && (
        <div className="modal-overlay-erp animate-in fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-orange-100 text-orange-600 rounded flex items-center justify-center">
                  <Receipt size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Emitir Nova Fatura Comercial</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4">
              {/* Cliente */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cliente Destinatário <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value={0}>Selecione o Cliente...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.nuit ? `(NUIT: ${c.nuit})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Projeto Opcional */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Projeto Associado (Opcional)
                </label>
                <select
                  value={formData.project_id || ''}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="">Nenhum / Faturamento Direto</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code ? `[${p.code}] ` : ''}{p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Valor Total */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor Total (MT) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="0.00"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                {/* Data de Vencimento */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={formData.due_date || ''}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Número personalizado (opcional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número da Fatura (Opcional - deixe vazio para numeração sequencial automática)
                </label>
                <input
                  type="text"
                  placeholder="Ex: FT-2026-0001"
                  value={formData.invoice_number || ''}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* AÇÕES DO MODAL */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary btn-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-primary btn-md disabled:opacity-50"
                >
                  {actionLoading ? 'A emitir...' : 'Emitir Fatura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Ações Financeiras */}
      <ConfirmationModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmInvoiceAction}
        title={
          confirmAction?.type === 'PAY'
            ? 'Confirmar Recebimento da Fatura?'
            : 'Anular / Cancelar Fatura Comercial?'
        }
        description={
          confirmAction ? (
            confirmAction.type === 'PAY' ? (
              <span>
                Deseja confirmar a liquidação e entrada em caixa do valor de{' '}
                <strong className="text-emerald-700 font-bold">{formatMZN(confirmAction.invoice.amount)}</strong> referente à fatura{' '}
                <strong className="text-[#101010]">"{confirmAction.invoice.invoice_number || `FAT-${confirmAction.invoice.id}`}"</strong>?
              </span>
            ) : (
              <span>
                Tem a certeza que deseja anular a fatura{' '}
                <strong className="text-[#101010]">"{confirmAction.invoice.invoice_number || `FAT-${confirmAction.invoice.id}`}"</strong> no valor de{' '}
                <strong>{formatMZN(confirmAction.invoice.amount)}</strong>? O status passará para cancelado.
              </span>
            )
          ) : ''
        }
        confirmText={confirmAction?.type === 'PAY' ? 'Confirmar Recebimento' : 'Sim, Cancelar Fatura'}
        cancelText="Voltar"
        variant={confirmAction?.type === 'PAY' ? 'success' : 'danger'}
        isLoading={actionLoading}
      />
    </div>
  );
}
