import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, CheckCircle, HelpCircle, Loader2, X } from 'lucide-react';

export type ConfirmationVariant = 'danger' | 'warning' | 'primary' | 'success';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationVariant;
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <Trash2 className="text-rose-600" size={24} />,
          iconBg: 'bg-rose-50 border-rose-100',
          confirmBtn: 'btn-danger btn-md',
          accentBorder: 'border-rose-100',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="text-amber-600" size={24} />,
          iconBg: 'bg-amber-50 border-amber-100',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white font-heading font-semibold btn-md',
          accentBorder: 'border-amber-100',
        };
      case 'success':
        return {
          icon: <CheckCircle className="text-emerald-600" size={24} />,
          iconBg: 'bg-emerald-50 border-emerald-100',
          confirmBtn: 'btn-success btn-md',
          accentBorder: 'border-emerald-100',
        };
      case 'primary':
      default:
        return {
          icon: <HelpCircle className="text-[#FF8000]" size={24} />,
          iconBg: 'bg-[#FFF2E5] border-[#FFEACC]',
          confirmBtn: 'btn-primary btn-md',
          accentBorder: 'border-[#FFEACC]',
        };
    }
  };

  const currentStyles = getVariantStyles();

  const handleConfirmClick = async () => {
    if (isLoading) return;
    await onConfirm();
  };

  return (
    <div className="modal-overlay-erp animate-in fade-in duration-150">
      {/* Backdrop */}
      <div 
        className="fixed inset-0" 
        onClick={!isLoading ? onClose : undefined} 
      />

      {/* Modal Dialog (8-Point Grid & High-Density Standards) */}
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-[#E2E2DE] z-10 overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header with Close */}
        <div className="p-6 pb-4 flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 ${currentStyles.iconBg}`}>
              {currentStyles.icon}
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-[#101010] leading-snug">
                {title}
              </h3>
              <span className="text-[11px] font-medium text-[#737370] uppercase tracking-wider font-heading">
                Confirmação de Ação
              </span>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-[#F5F5F3] transition disabled:opacity-50"
            title="Fechar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-6 py-2">
          <div className="text-xs text-[#555552] leading-relaxed">
            {typeof description === 'string' ? (
              <p>{description}</p>
            ) : (
              description
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-5 bg-[#FAFAF9] border-t border-[#EDEDEA] flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="btn-secondary btn-md"
          >
            {cancelText}
          </button>
          
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isLoading}
            className={`${currentStyles.confirmBtn} flex items-center space-x-2 min-w-[100px]`}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>A processar...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
