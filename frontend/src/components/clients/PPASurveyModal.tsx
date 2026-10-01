import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  Zap, 
  CheckSquare, 
  Square, 
  Award, 
  FileSpreadsheet, 
  Save, 
  Printer, 
  CheckCircle2, 
  Sun
} from 'lucide-react';

export interface PPASurveyData {
  id?: string;
  data: string;
  responsavel: string;
  nomeEmpresa: string;
  sector: string;
  cidadeProvincia: string;
  morada: string;
  website: string;
  googleMaps: string;
  telefone: string;
  email: string;
  directorDecisor: string;
  contactoDecisor: string;
  
  // Perfil Operacional (Checkboxes)
  funcionaDia: boolean;
  opera24h: boolean;
  grandeCobertura: boolean;
  estacionamentoAmplo: boolean;
  possuiGerador: boolean;
  possuiSistemaSolar: boolean;
  
  // Diagnóstico & Classificação Técnica
  actividadePrincipal: string;
  potencialEstimado: 'Baixo' | 'Médio' | 'Alto' | 'Muito Alto';
  solucaoRecomendada: 'PPA' | 'EaaS' | 'EPC' | 'O&M' | 'Auditoria';
  prioridade: 'A' | 'B' | 'C' | 'D';
  observacoes: string;

  // Estimativas Financeiras & Técnicas
  consumoMensalEstimadoMZN?: number;
  potenciaSolarRecomendadakWp?: number;
  economiaMensalEstimadaMZN?: number;
}

interface PPASurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<PPASurveyData>;
  onSave: (survey: PPASurveyData) => void;
  onConvertToClient: (survey: PPASurveyData) => void;
  onGenerateProposal: (survey: PPASurveyData) => void;
}

export const DEFAULT_SURVEY_DATA: PPASurveyData = {
  data: new Date().toLocaleDateString('pt-MZ'),
  responsavel: 'Gestor Comercial LECASU',
  nomeEmpresa: '',
  sector: 'Industrial / Fabril',
  cidadeProvincia: 'Matola, Maputo',
  morada: '',
  website: '',
  googleMaps: '',
  telefone: '',
  email: '',
  directorDecisor: '',
  contactoDecisor: '',
  funcionaDia: true,
  opera24h: false,
  grandeCobertura: true,
  estacionamentoAmplo: true,
  possuiGerador: true,
  possuiSistemaSolar: false,
  actividadePrincipal: 'Processamento Industrial e Armazenamento',
  potencialEstimado: 'Alto',
  solucaoRecomendada: 'PPA',
  prioridade: 'A',
  observacoes: 'Cliente com alto consumo diurno de energia e espaço amplo em cobertura de pavilhão.'
};

export const PPASurveyModal: React.FC<PPASurveyModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSave,
  onConvertToClient,
  onGenerateProposal
}) => {
  const [formData, setFormData] = useState<PPASurveyData>(() => ({
    ...DEFAULT_SURVEY_DATA,
    ...initialData
  }));

  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleChange = (field: keyof PPASurveyData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleCheckbox = (field: keyof PPASurveyData) => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setSavedSuccessMessage('Ficha Técnica de Levantamento PPA/EaaS salva com sucesso no sistema!');
    setTimeout(() => {
      setSavedSuccessMessage(null);
    }, 3500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay-erp animate-in fade-in select-none z-50 p-4">
      <div className="bg-white text-slate-800 rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF8000] text-white flex items-center justify-center font-bold text-lg shadow-md">
              <Sun size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">LECASU - Ficha de Levantamento de Potenciais Clientes</h2>
                <span className="px-2 py-0.5 rounded bg-orange-500/20 text-[#FF8000] text-[10px] font-bold uppercase tracking-wider border border-orange-500/30">
                  PPA | Energy as a Service
                </span>
              </div>
              <p className="text-xs text-slate-400">Diagnóstico técnico corporativo para concessão de projetos solares sem investimento inicial</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body (Scrollable Form matching DOCX structure) */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs bg-slate-50/50">
          
          {savedSuccessMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span className="font-semibold">{savedSuccessMessage}</span>
            </div>
          )}

          {/* Cabeçalho da Ficha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Data do Levantamento</label>
              <input
                type="text"
                value={formData.data}
                onChange={e => handleChange('data', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-[#FF8000]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Responsável Comercial / Técnico</label>
              <input
                type="text"
                value={formData.responsavel}
                onChange={e => handleChange('responsavel', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#FF8000]"
              />
            </div>
          </div>

          {/* Seção 1: Identificação da Empresa */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 shadow-xs">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building2 size={16} className="text-[#FF8000]" />
              <span>1. Identificação da Empresa & Contactos Principais</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome da Empresa *</label>
                <input
                  type="text"
                  required
                  value={formData.nomeEmpresa}
                  onChange={e => handleChange('nomeEmpresa', e.target.value)}
                  placeholder="ex: Cervejas de Moçambique, Lda."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-[#FF8000]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sector de Actuação</label>
                <select
                  value={formData.sector}
                  onChange={e => handleChange('sector', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#FF8000]"
                >
                  <option value="Industrial / Fabril">Industrial / Fabril</option>
                  <option value="Comercial / Supermercados">Comercial / Supermercados</option>
                  <option value="Hotelaria & Resorts">Hotelaria & Resorts</option>
                  <option value="Agricultura & Agro-processamento">Agricultura & Agro-processamento</option>
                  <option value="Hospitais & Saúde">Hospitais & Saúde</option>
                  <option value="Logística & Armazéns">Logística & Armazéns</option>
                  <option value="Mineração & Extração">Mineração & Extração</option>
                  <option value="Telecomunicações">Telecomunicações</option>
                  <option value="Imobiliária & Escritórios">Imobiliária & Escritórios</option>
                  <option value="Educação">Educação / Campus</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cidade / Província</label>
                <input
                  type="text"
                  value={formData.cidadeProvincia}
                  onChange={e => handleChange('cidadeProvincia', e.target.value)}
                  placeholder="ex: Matola, Maputo"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#FF8000]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Morada Completa</label>
                <input
                  type="text"
                  value={formData.morada}
                  onChange={e => handleChange('morada', e.target.value)}
                  placeholder="ex: Av. das Indústrias, Km 4, Parcela 12B"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#FF8000]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Website</label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={e => handleChange('website', e.target.value)}
                  placeholder="ex: www.empresa.co.mz"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-[#FF8000]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Google Maps / Coordenadas GPS</label>
                <input
                  type="text"
                  value={formData.googleMaps}
                  onChange={e => handleChange('googleMaps', e.target.value)}
                  placeholder="ex: -25.9653, 32.5892 ou Link"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-[#FF8000]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone Principal</label>
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={e => handleChange('telefone', e.target.value)}
                  placeholder="ex: +258 84 123 4567"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-[#FF8000]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Endereço de E-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => handleChange('email', e.target.value)}
                  placeholder="ex: contacto@empresa.co.mz"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-[#FF8000]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Director / Decisor Principal</label>
                <input
                  type="text"
                  value={formData.directorDecisor}
                  onChange={e => handleChange('directorDecisor', e.target.value)}
                  placeholder="ex: Eng. Carlos Alberto (Director Geral)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#FF8000]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contacto Directo do Decisor</label>
                <input
                  type="text"
                  value={formData.contactoDecisor}
                  onChange={e => handleChange('contactoDecisor', e.target.value)}
                  placeholder="ex: +258 82 987 6543 / calberto@empresa.co.mz"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-[#FF8000]"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Perfil Operacional & Requisitos (Checkboxes) */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 shadow-xs">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 border-b border-slate-100 pb-2">
              <Zap size={16} className="text-[#FF8000]" />
              <span>2. Perfil Operacional & Infraestrutura Energética (Checklist)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              
              {/* Funciona de dia */}
              <div 
                onClick={() => handleToggleCheckbox('funcionaDia')}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  formData.funcionaDia 
                    ? 'border-orange-500 bg-orange-50/60 text-orange-950 font-semibold' 
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs">Funciona de dia?</span>
                {formData.funcionaDia ? (
                  <CheckSquare size={18} className="text-[#FF8000]" />
                ) : (
                  <Square size={18} className="text-slate-400" />
                )}
              </div>

              {/* Opera 24h */}
              <div 
                onClick={() => handleToggleCheckbox('opera24h')}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  formData.opera24h 
                    ? 'border-orange-500 bg-orange-50/60 text-orange-950 font-semibold' 
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs">Opera 24 horas por dia?</span>
                {formData.opera24h ? (
                  <CheckSquare size={18} className="text-[#FF8000]" />
                ) : (
                  <Square size={18} className="text-slate-400" />
                )}
              </div>

              {/* Grande Cobertura */}
              <div 
                onClick={() => handleToggleCheckbox('grandeCobertura')}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  formData.grandeCobertura 
                    ? 'border-orange-500 bg-orange-50/60 text-orange-950 font-semibold' 
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs">Grande cobertura (Telhado)?</span>
                {formData.grandeCobertura ? (
                  <CheckSquare size={18} className="text-[#FF8000]" />
                ) : (
                  <Square size={18} className="text-slate-400" />
                )}
              </div>

              {/* Estacionamento Amplo */}
              <div 
                onClick={() => handleToggleCheckbox('estacionamentoAmplo')}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  formData.estacionamentoAmplo 
                    ? 'border-orange-500 bg-orange-50/60 text-orange-950 font-semibold' 
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs">Estacionamento Amplo (Carport)?</span>
                {formData.estacionamentoAmplo ? (
                  <CheckSquare size={18} className="text-[#FF8000]" />
                ) : (
                  <Square size={18} className="text-slate-400" />
                )}
              </div>

              {/* Possui Gerador */}
              <div 
                onClick={() => handleToggleCheckbox('possuiGerador')}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  formData.possuiGerador 
                    ? 'border-orange-500 bg-orange-50/60 text-orange-950 font-semibold' 
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs">Possui Gerador a Diesel/Gás?</span>
                {formData.possuiGerador ? (
                  <CheckSquare size={18} className="text-[#FF8000]" />
                ) : (
                  <Square size={18} className="text-slate-400" />
                )}
              </div>

              {/* Possui Sistema Solar */}
              <div 
                onClick={() => handleToggleCheckbox('possuiSistemaSolar')}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  formData.possuiSistemaSolar 
                    ? 'border-orange-500 bg-orange-50/60 text-orange-950 font-semibold' 
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs">Possui Sistema Solar Prévio?</span>
                {formData.possuiSistemaSolar ? (
                  <CheckSquare size={18} className="text-[#FF8000]" />
                ) : (
                  <Square size={18} className="text-slate-400" />
                )}
              </div>

            </div>
          </div>

          {/* Seção 3: Diagnóstico Técnico & Classificação Comercial */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 shadow-xs">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 border-b border-slate-100 pb-2">
              <Award size={16} className="text-[#FF8000]" />
              <span>3. Diagnóstico Técnico & Classificação de Prospecção</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Potencial Estimado</label>
                <select
                  value={formData.potencialEstimado}
                  onChange={e => handleChange('potencialEstimado', e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-[#FF8000]"
                >
                  <option value="Baixo">Baixo</option>
                  <option value="Médio">Médio</option>
                  <option value="Alto">Alto (⭐ Recomendado)</option>
                  <option value="Muito Alto">Muito Alto (🚀 Prioritário)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Solução Recomendada</label>
                <select
                  value={formData.solucaoRecomendada}
                  onChange={e => handleChange('solucaoRecomendada', e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-[#FF8000]"
                >
                  <option value="PPA">PPA (Contrato de Compra de Energia)</option>
                  <option value="EaaS">EaaS (Energy as a Service)</option>
                  <option value="EPC">EPC (Instalação Solar Chave na Mão)</option>
                  <option value="O&M">O&M (Manutenção & Operação)</option>
                  <option value="Auditoria">Auditoria Energética</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Prioridade de Prospecção</label>
                <select
                  value={formData.prioridade}
                  onChange={e => handleChange('prioridade', e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-[#FF8000]"
                >
                  <option value="A">Prioridade A (Fechamento Imediato)</option>
                  <option value="B">Prioridade B (Em Negociação)</option>
                  <option value="C">Prioridade C (Prospecção)</option>
                  <option value="D">Prioridade D (Futuro)</option>
                </select>
              </div>

            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Actividade Principal da Instalação</label>
              <input
                type="text"
                value={formData.actividadePrincipal}
                onChange={e => handleChange('actividadePrincipal', e.target.value)}
                placeholder="ex: Processamento de Bebidas e Linha de Envasamento Contínua"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#FF8000]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Observações Técnicas & Comerciais</label>
              <textarea
                rows={3}
                value={formData.observacoes}
                onChange={e => handleChange('observacoes', e.target.value)}
                placeholder="Notas sobre o transformador, fatura mensal EDM estimada, acessibilidade da cobertura..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#FF8000] resize-none"
              />
            </div>

          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition cursor-pointer flex items-center gap-1.5"
              >
                <Printer size={15} />
                <span>Imprimir / Exportar Ficha</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => onConvertToClient(formData)}
                className="px-4 py-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 hover:bg-sky-100 font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Building2 size={15} className="text-sky-600" />
                <span>Converter em Cliente (CRM)</span>
              </button>

              <button
                type="button"
                onClick={() => onGenerateProposal(formData)}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <FileSpreadsheet size={15} />
                <span>Elaborar Proposta PPA/EaaS</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#FF8000] hover:bg-[#E67300] text-white font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Save size={15} />
                <span>Salvar Ficha Técnica</span>
              </button>
            </div>

          </div>

        </form>

      </div>
    </div>
  );
};
