import React, { useState } from 'react';
import { X, FileText, DollarSign, Loader2, AlertCircle, Building2 } from 'lucide-react';
import type { Client, ProposalCreateInput } from '../../types';

interface ProposalModalProps {
  isOpen: boolean;
  clients: Client[];
  initialClientId?: number | null;
  onClose: () => void;
  onSubmit: (data: ProposalCreateInput) => Promise<void>;
}

export const ProposalModal: React.FC<ProposalModalProps> = ({
  isOpen,
  clients,
  initialClientId,
  onClose,
  onSubmit
}) => {
  const [clientId, setClientId] = useState<number | ''>(initialClientId || (clients[0]?.id ?? ''));
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [status, setStatus] = useState('DRAFT');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const effectiveClientId = clientId || initialClientId || (clients[0]?.id ?? '');
    if (!effectiveClientId) {
      newErrors.clientId = 'Selecione um cliente para a proposta.';
    }

    if (!title || title.trim().length < 2) {
      newErrors.title = 'O título da proposta é obrigatório (mínimo 2 caracteres).';
    }

    if (!totalAmount || isNaN(Number(totalAmount)) || Number(totalAmount) < 0) {
      newErrors.totalAmount = 'Informe um valor total válido (>= 0).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    const targetClientId = Number(clientId || initialClientId || clients[0]?.id);

    try {
      setIsSubmitting(true);
      await onSubmit({
        client_id: targetClientId,
        title: title.trim(),
        scope: scope.trim() || undefined,
        total_amount: parseFloat(totalAmount) || 0,
        status: status || 'DRAFT'
      });
      // Reset form
      setTitle('');
      setScope('');
      setTotalAmount('');
      setStatus('DRAFT');
      setErrors({});
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || 'Erro ao criar proposta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentClientId = clientId || initialClientId || (clients[0]?.id ?? '');
  const selectedClient = clients.find(c => c.id === Number(currentClientId));

  return (
    <div className="modal-overlay-erp animate-in fade-in">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-orange-100 text-orange-600 flex items-center justify-center">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 leading-tight">Nova Proposta Comercial</h2>
              <p className="text-xs text-slate-500">
                {selectedClient ? `Vinculada a: ${selectedClient.name}` : 'Criar proposta vinculada ao cliente'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-start space-x-2.5 text-rose-800 text-xs">
              <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Selecionar Cliente */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cliente Associado <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <select
                value={currentClientId}
                onChange={e => setClientId(Number(e.target.value))}
                className={`w-full pl-9 pr-3 py-2 text-xs bg-white border rounded-md focus:outline-none focus:ring-1 transition ${
                  errors.clientId
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                    : 'border-slate-300 focus:border-orange-500 focus:ring-orange-500'
                }`}
              >
                <option value="" disabled>Selecione um cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.nuit ? `(NUIT: ${c.nuit})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {errors.clientId && <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.clientId}</p>}
          </div>

          {/* Título da Proposta */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Título da Proposta <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                value={title}
                onChange={e => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
                }}
                placeholder="Ex: Manutenção Preventiva de Geradores"
                className={`w-full pl-9 pr-3 py-2 text-xs bg-white border rounded-md focus:outline-none focus:ring-1 transition ${
                  errors.title
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/30'
                    : 'border-slate-300 focus:border-orange-500 focus:ring-orange-500'
                }`}
              />
            </div>
            {errors.title && <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.title}</p>}
          </div>

          {/* Valor Total & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor Total (MZN) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalAmount}
                  onChange={e => {
                    setTotalAmount(e.target.value);
                    if (errors.totalAmount) setErrors(prev => ({ ...prev, totalAmount: '' }));
                  }}
                  placeholder="0.00"
                  className={`w-full pl-9 pr-3 py-2 text-xs bg-white border rounded-md focus:outline-none focus:ring-1 transition ${
                    errors.totalAmount
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-slate-300 focus:border-orange-500 focus:ring-orange-500'
                  }`}
                />
              </div>
              {errors.totalAmount && <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.totalAmount}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estado Inicial
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              >
                <option value="DRAFT">Rascunho (DRAFT)</option>
                <option value="SENT">Enviada (SENT)</option>
                <option value="ACCEPTED">Aprovada (ACCEPTED)</option>
                <option value="REJECTED">Rejeitada (REJECTED)</option>
              </select>
            </div>
          </div>

          {/* Escopo da Proposta */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Escopo / Descrição dos Serviços
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={scope}
                onChange={e => setScope(e.target.value)}
                placeholder="Detalhes dos serviços, fornecimento de peças, prazos previstos..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary btn-md"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary btn-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>A Criar...</span>
                </>
              ) : (
                <span>Criar Proposta</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
