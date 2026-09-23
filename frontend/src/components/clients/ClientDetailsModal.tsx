import React, { useState } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Hash, 
  MapPin, 
  Calendar, 
  FileText, 
  Plus, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Send, 
  Briefcase, 
  Loader2 
} from 'lucide-react';
import type { Client, Proposal } from '../../types';

interface ClientDetailsModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onNewProposal: (clientId: number) => void;
  onConvertToProject?: (proposal: Proposal) => Promise<void>;
}

export const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({
  client,
  isOpen,
  onClose,
  onNewProposal,
  onConvertToProject
}) => {
  const [convertingId, setConvertingId] = useState<number | null>(null);

  if (!isOpen || !client) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-MZ', {
      style: 'currency',
      currency: 'MZN',
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle size={12} className="mr-1" /> Aprovada
          </span>
        );
      case 'SENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Send size={12} className="mr-1" /> Enviada
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={12} className="mr-1" /> Rejeitada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock size={12} className="mr-1" /> Rascunho
          </span>
        );
    }
  };

  const handleConvert = async (prop: Proposal) => {
    if (!onConvertToProject) return;
    try {
      setConvertingId(prop.id);
      await onConvertToProject(prop);
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-base">
              {client.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">{client.name}</h2>
              <p className="text-xs text-slate-500">
                {client.nuit ? `NUIT: ${client.nuit}` : 'Cliente Registado'}
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

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Informações Cadastrais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div className="flex items-center space-x-2 text-slate-700">
              <User size={15} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-500">Contacto:</span>
              <span className="font-semibold text-slate-900 truncate">
                {client.contact_person || '—'}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <Hash size={15} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-500">NUIT:</span>
              <span className="font-mono font-semibold text-slate-900">
                {client.nuit || '—'}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <Mail size={15} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-500">E-mail:</span>
              <span className="font-semibold text-slate-900 truncate">
                {client.email || '—'}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <Phone size={15} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-500">Telefone:</span>
              <span className="font-semibold text-slate-900">
                {client.phone || '—'}
              </span>
            </div>
            {client.address && (
              <div className="flex items-start space-x-2 text-slate-700 sm:col-span-2 mt-1">
                <MapPin size={15} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-500">Endereço:</span>
                <span className="font-medium text-slate-900">{client.address}</span>
              </div>
            )}
          </div>

          {/* Seção de Propostas Vinculadas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FileText size={16} className="text-orange-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Propostas Comerciais ({client.proposals?.length || 0})
                </h3>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onNewProposal(client.id);
                }}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-2.5 py-1 rounded transition"
              >
                <Plus size={14} />
                <span>Nova Proposta</span>
              </button>
            </div>

            {(!client.proposals || client.proposals.length === 0) ? (
              <div className="p-6 border border-dashed border-slate-200 rounded-lg text-center bg-slate-50/50">
                <p className="text-xs text-slate-500">Nenhuma proposta vinculada a este cliente.</p>
                <button
                  onClick={() => {
                    onClose();
                    onNewProposal(client.id);
                  }}
                  className="mt-2 text-xs font-semibold text-orange-600 hover:underline"
                >
                  + Criar primeira proposta
                </button>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                {client.proposals.map((prop) => (
                  <div key={prop.id} className="p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <span className="text-xs font-bold text-slate-900">{prop.title}</span>
                        {getStatusBadge(prop.status)}
                      </div>
                      {prop.scope && (
                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                          {prop.scope}
                        </p>
                      )}
                      <div className="flex items-center space-x-3 text-[10px] text-slate-400">
                        {prop.created_at && (
                          <span className="flex items-center">
                            <Calendar size={11} className="mr-1" />
                            {new Date(prop.created_at).toLocaleDateString('pt-MZ')}
                          </span>
                        )}
                        <span className="font-semibold text-slate-700">
                          Valor: {formatCurrency(prop.total_amount)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 sm:self-center flex-shrink-0">
                      {onConvertToProject && (
                        <button
                          onClick={() => handleConvert(prop)}
                          disabled={convertingId === prop.id}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md shadow-xs transition flex items-center space-x-1.5 disabled:opacity-60"
                          title="Aprovar proposta e iniciar projeto de execução"
                        >
                          {convertingId === prop.id ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              <span>A Gerar...</span>
                            </>
                          ) : (
                            <>
                              <Briefcase size={13} />
                              <span>Aprovar e Gerar Projeto</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
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
