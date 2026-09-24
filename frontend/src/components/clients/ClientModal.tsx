import React, { useState } from 'react';
import { X, Building2, User, Mail, Phone, Hash, MapPin, Loader2, AlertCircle } from 'lucide-react';
import type { ClientCreateInput } from '../../types';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ClientCreateInput) => Promise<void>;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState<ClientCreateInput>({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    nuit: '',
    address: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'O nome da empresa/cliente é obrigatório (mínimo 2 caracteres).';
    }

    if (formData.email && formData.email.trim().length > 0) {
      const emailRegex = /^[\w.-]+@[\w.-]+\.\w+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Insira um endereço de e-mail válido (ex: contato@empresa.co.mz).';
      }
    }

    if (formData.nuit && formData.nuit.trim().length > 0) {
      if (formData.nuit.trim().length < 5) {
        newErrors.nuit = 'O NUIT deve ter pelo menos 5 dígitos.';
      }
    }

    if (formData.phone && formData.phone.trim().length > 0) {
      if (formData.phone.trim().length < 6) {
        newErrors.phone = 'O número de telefone deve conter no mínimo 6 dígitos.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    try {
      setIsSubmitting(true);
      await onSubmit({
        name: formData.name.trim(),
        contact_person: formData.contact_person?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        nuit: formData.nuit?.trim() || undefined,
        address: formData.address?.trim() || undefined
      });
      // Reset form on success
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        nuit: '',
        address: ''
      });
      setErrors({});
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || 'Erro ao cadastrar cliente. Verifique os dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof ClientCreateInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (submitError) setSubmitError(null);
  };

  return (
    <div className="modal-overlay-erp animate-in fade-in">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-orange-100 text-orange-600 flex items-center justify-center">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 leading-tight">Novo Cliente</h2>
              <p className="text-xs text-slate-500">Registo oficial no banco de dados LECASU</p>
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

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-start space-x-2.5 text-rose-800 text-xs">
              <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Nome da Empresa / Cliente */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome da Empresa / Cliente <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="Ex: Construtora Maputo, Lda"
                className={`w-full pl-9 pr-3 py-2 text-xs bg-white border rounded-md focus:outline-none focus:ring-1 transition ${
                  errors.name
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/30'
                    : 'border-slate-300 focus:border-orange-500 focus:ring-orange-500'
                }`}
              />
            </div>
            {errors.name && <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.name}</p>}
          </div>

          {/* NUIT & Contact Person */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NUIT (Número Fiscal)
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  value={formData.nuit || ''}
                  onChange={e => handleChange('nuit', e.target.value)}
                  placeholder="Ex: 400123456"
                  className={`w-full pl-9 pr-3 py-2 text-xs bg-white border rounded-md focus:outline-none focus:ring-1 transition ${
                    errors.nuit
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-slate-300 focus:border-orange-500 focus:ring-orange-500'
                  }`}
                />
              </div>
              {errors.nuit && <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.nuit}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pessoa de Contacto
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  value={formData.contact_person || ''}
                  onChange={e => handleChange('contact_person', e.target.value)}
                  placeholder="Ex: Eng. Carlos Matola"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Email & Telefone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={e => handleChange('email', e.target.value)}
                  placeholder="geral@cliente.co.mz"
                  className={`w-full pl-9 pr-3 py-2 text-xs bg-white border rounded-md focus:outline-none focus:ring-1 transition ${
                    errors.email
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/30'
                      : 'border-slate-300 focus:border-orange-500 focus:ring-orange-500'
                  }`}
                />
              </div>
              {errors.email && <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Telefone / Celular
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={e => handleChange('phone', e.target.value)}
                  placeholder="+258 84 000 0000"
                  className={`w-full pl-9 pr-3 py-2 text-xs bg-white border rounded-md focus:outline-none focus:ring-1 transition ${
                    errors.phone
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-slate-300 focus:border-orange-500 focus:ring-orange-500'
                  }`}
                />
              </div>
              {errors.phone && <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.phone}</p>}
            </div>
          </div>

          {/* Endereço */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Endereço / Província
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                value={formData.address || ''}
                onChange={e => handleChange('address', e.target.value)}
                placeholder="Ex: Av. 24 de Julho nº 1200, Maputo"
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
            </div>
          </div>

          {/* Footer Actions */}
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
                  <span>A Registar...</span>
                </>
              ) : (
                <span>Guardar Cliente</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
