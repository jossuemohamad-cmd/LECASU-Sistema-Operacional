import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  Building2, 
  MapPin, 
  FileText, 
  Plus, 
  Award, 
  Loader2, 
  Filter, 
  FileSpreadsheet, 
  UserCheck
} from 'lucide-react';
import { PPASurveyModal, DEFAULT_SURVEY_DATA, type PPASurveyData } from './PPASurveyModal';

export interface ProspectiveLead {
  id: string;
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
  funcionaDia: boolean;
  opera24h: boolean;
  grandeCobertura: boolean;
  estacionamentoAmplo: boolean;
  possuiGerador: boolean;
  possuiSistemaSolar: boolean;
  actividadePrincipal: string;
  potencialEstimado: 'Baixo' | 'Médio' | 'Alto' | 'Muito Alto';
  solucaoRecomendada: 'PPA' | 'EaaS' | 'EPC' | 'O&M' | 'Auditoria';
  prioridade: 'A' | 'B' | 'C' | 'D';
  observacoes: string;

  // AI Analytics Metrics
  matchPercentage: number;
  consumoMensalEstimadoMZN: number;
  potenciaSolarRecomendadakWp: number;
  economiaMensalEstimadaMZN: number;
  status: 'Pesquisado' | 'Ficha Preenchida' | 'Convertido em Cliente' | 'Proposta Enviada';
}

const INITIAL_PROSPECTIVE_LEADS: ProspectiveLead[] = [
  {
    id: 'lead_1',
    nomeEmpresa: 'Cervejas de Moçambique - Fábrica de Marracuene',
    sector: 'Industrial / Fabril',
    cidadeProvincia: 'Marracuene, Maputo',
    morada: 'Estrada Nacional N1, Km 22, Marracuene',
    website: 'www.cdm.co.mz',
    googleMaps: '-25.7381, 32.6719',
    telefone: '+258 21 480 000',
    email: 'contacto@cdm.co.mz',
    directorDecisor: 'Eng. Mário Silva (Director de Operações)',
    contactoDecisor: '+258 84 312 9000 / msilva@cdm.co.mz',
    funcionaDia: true,
    opera24h: true,
    grandeCobertura: true,
    estacionamentoAmplo: true,
    possuiGerador: true,
    possuiSistemaSolar: false,
    actividadePrincipal: 'Linha de Produção Industrial de Bebidas & Envasamento',
    potencialEstimado: 'Muito Alto',
    solucaoRecomendada: 'PPA',
    prioridade: 'A',
    observacoes: 'Pavilhão fabril com mais de 8.000m² de telhado. Alto consumo diurno em tarifa industrial EDM.',
    matchPercentage: 98,
    consumoMensalEstimadoMZN: 1850000,
    potenciaSolarRecomendadakWp: 750,
    economiaMensalEstimadaMZN: 420000,
    status: 'Ficha Preenchida'
  },
  {
    id: 'lead_2',
    nomeEmpresa: 'Kambaku Safari Lodge & Spa',
    sector: 'Hotelaria & Resorts',
    cidadeProvincia: 'Inhambane / Vilankulo',
    morada: 'Praia de Vilanculos, Inhambane',
    website: 'www.kambakuresort.com',
    googleMaps: '-22.0094, 35.3161',
    telefone: '+258 29 382 100',
    email: 'reservas@kambakuresort.com',
    directorDecisor: 'Sra. Beatriz Ramos (General Manager)',
    contactoDecisor: '+258 82 450 1122',
    funcionaDia: true,
    opera24h: true,
    grandeCobertura: false,
    estacionamentoAmplo: true,
    possuiGerador: true,
    possuiSistemaSolar: false,
    actividadePrincipal: 'Resort de Luxo com Climatização Central e Dessalinizadora',
    potencialEstimado: 'Alto',
    solucaoRecomendada: 'EaaS',
    prioridade: 'A',
    observacoes: 'Resort isolado da rede principal com dependência crítica de geradores a diesel. Excelente para EaaS com bateria.',
    matchPercentage: 94,
    consumoMensalEstimadoMZN: 920000,
    potenciaSolarRecomendadakWp: 350,
    economiaMensalEstimadaMZN: 280000,
    status: 'Pesquisado'
  },
  {
    id: 'lead_3',
    nomeEmpresa: 'Tropigalia Centro de Distribuição Matola',
    sector: 'Logística & Armazéns',
    cidadeProvincia: 'Matola, Maputo',
    morada: 'Av. das Indústrias, Parcela 404, Matola',
    website: 'www.tropigalia.co.mz',
    googleMaps: '-25.9610, 32.4851',
    telefone: '+258 21 720 500',
    email: 'comercial@tropigalia.co.mz',
    directorDecisor: 'Dr. Paulo Guimarães (Director de Logística)',
    contactoDecisor: '+258 84 990 0110',
    funcionaDia: true,
    opera24h: false,
    grandeCobertura: true,
    estacionamentoAmplo: true,
    possuiGerador: true,
    possuiSistemaSolar: false,
    actividadePrincipal: 'Armazenamento Frigorífico de Produtos Alimentares',
    potencialEstimado: 'Alto',
    solucaoRecomendada: 'PPA',
    prioridade: 'B',
    observacoes: 'Câmara de frio contínua. Carport Solar para frota de distribuição seria diferencial.',
    matchPercentage: 91,
    consumoMensalEstimadoMZN: 1250000,
    potenciaSolarRecomendadakWp: 500,
    economiaMensalEstimadaMZN: 310000,
    status: 'Pesquisado'
  },
  {
    id: 'lead_4',
    nomeEmpresa: 'Hospital Privado de Maputo (Grupo HPA)',
    sector: 'Hospitais & Saúde',
    cidadeProvincia: 'Maputo Cidade',
    morada: 'Rua do Bagamoyo, Bairro Central, Maputo',
    website: 'www.hpa.co.mz',
    googleMaps: '-25.9712, 32.5733',
    telefone: '+258 21 350 400',
    email: 'info@hpa.co.mz',
    directorDecisor: 'Dr. António Mendonça (Director Clínico/Administrativo)',
    contactoDecisor: '+258 84 100 2000',
    funcionaDia: true,
    opera24h: true,
    grandeCobertura: true,
    estacionamentoAmplo: false,
    possuiGerador: true,
    possuiSistemaSolar: false,
    actividadePrincipal: 'Centro Hospitalar Privado e Unidades de Bloco Operatório',
    potencialEstimado: 'Muito Alto',
    solucaoRecomendada: 'EaaS',
    prioridade: 'A',
    observacoes: 'Necessidade crítica de energia ininterrupta e redução do custo da tarifa de pico.',
    matchPercentage: 96,
    consumoMensalEstimadoMZN: 2100000,
    potenciaSolarRecomendadakWp: 600,
    economiaMensalEstimadaMZN: 490000,
    status: 'Pesquisado'
  },
  {
    id: 'lead_5',
    nomeEmpresa: 'Agro-Industrial do Licungo',
    sector: 'Agricultura & Agro-processamento',
    cidadeProvincia: 'Mocuba, Zambézia',
    morada: 'Estrada Principal Mocuba - Gurúè, Km 14',
    website: 'www.licungoagro.co.mz',
    googleMaps: '-16.8201, 36.9854',
    telefone: '+258 24 810 022',
    email: 'geral@licungoagro.co.mz',
    directorDecisor: 'Eng. Fernando Machava (Gerente de Operações)',
    contactoDecisor: '+258 82 771 9900',
    funcionaDia: true,
    opera24h: false,
    grandeCobertura: true,
    estacionamentoAmplo: true,
    possuiGerador: true,
    possuiSistemaSolar: false,
    actividadePrincipal: 'Descasque e Processamento de Arroz e Milho',
    potencialEstimado: 'Médio',
    solucaoRecomendada: 'EPC',
    prioridade: 'C',
    observacoes: 'Operação sazonal na época de colheita com pico de consumo no período diurno.',
    matchPercentage: 84,
    consumoMensalEstimadoMZN: 580000,
    potenciaSolarRecomendadakWp: 200,
    economiaMensalEstimadaMZN: 140000,
    status: 'Pesquisado'
  }
];

interface PPAProspectingViewProps {
  onAddClient: (newClient: any) => void;
  onOpenCreateProposal: (initialData?: any) => void;
  addToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const PPAProspectingView: React.FC<PPAProspectingViewProps> = ({
  onAddClient,
  onOpenCreateProposal,
  addToast
}) => {
  const [leads, setLeads] = useState<ProspectiveLead[]>(INITIAL_PROSPECTIVE_LEADS);
  const [selectedSector, setSelectedSector] = useState<string>('todos');
  const [selectedCity, setSelectedCity] = useState<string>('todas');
  const [selectedSolution, setSelectedSolution] = useState<string>('todas');
  const [selectedPriority, setSelectedPriority] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // Survey Modal State
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [activeLeadForSurvey, setActiveLeadForSurvey] = useState<Partial<PPASurveyData> | null>(null);

  // Filtered Leads
  const filteredLeads = leads.filter(lead => {
    if (selectedSector !== 'todos' && !lead.sector.toLowerCase().includes(selectedSector.toLowerCase())) return false;
    if (selectedCity !== 'todas' && !lead.cidadeProvincia.toLowerCase().includes(selectedCity.toLowerCase())) return false;
    if (selectedSolution !== 'todas' && lead.solucaoRecomendada !== selectedSolution) return false;
    if (selectedPriority !== 'todas' && lead.prioridade !== selectedPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        lead.nomeEmpresa.toLowerCase().includes(q) ||
        lead.sector.toLowerCase().includes(q) ||
        lead.cidadeProvincia.toLowerCase().includes(q) ||
        lead.directorDecisor.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Trigger AI Market Scanner Simulation
  const handleRunAIScan = () => {
    setIsScanning(true);
    setScanProgress(10);

    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 20;
      });
    }, 400);

    setTimeout(() => {
      clearInterval(interval);
      setScanProgress(100);
      setIsScanning(false);

      // Add a newly discovered AI lead to the list
      const newLead: ProspectiveLead = {
        id: `lead_${Date.now()}`,
        nomeEmpresa: `Complexo Agro-Industrial Moçambicano, Lda (${selectedCity !== 'todas' ? selectedCity : 'Nampula'})`,
        sector: selectedSector !== 'todos' ? selectedSector : 'Industrial / Fabril',
        cidadeProvincia: selectedCity !== 'todas' ? selectedCity : 'Nampula Cidade',
        morada: 'Zona Industrial da Carrupeia, Nampula',
        website: 'www.agroindnampula.co.mz',
        googleMaps: '-15.1165, 39.2663',
        telefone: '+258 26 218 900',
        email: 'direcao@agroindnampula.co.mz',
        directorDecisor: 'Dr. Salim Cassamo (Director Executivo)',
        contactoDecisor: '+258 84 555 4321',
        funcionaDia: true,
        opera24h: false,
        grandeCobertura: true,
        estacionamentoAmplo: true,
        possuiGerador: true,
        possuiSistemaSolar: false,
        actividadePrincipal: 'Processamento de Castanha de Caju e Amendoim para Exportação',
        potencialEstimado: 'Muito Alto',
        solucaoRecomendada: 'PPA',
        prioridade: 'A',
        observacoes: 'Detectado via Varredura de Mercado IA com base no consumo elétrico diurno e área de cobertura em imagem de satélite.',
        matchPercentage: 99,
        consumoMensalEstimadoMZN: 1600000,
        potenciaSolarRecomendadakWp: 650,
        economiaMensalEstimadaMZN: 380000,
        status: 'Pesquisado'
      };

      setLeads(prev => [newLead, ...prev]);
      addToast('success', 'Varredura Concluída!', `Encontrados novos potenciais clientes PPA/EaaS para ${selectedSector !== 'todos' ? selectedSector : 'o mercado de Moçambique'}.`);
    }, 2500);
  };

  // Open Ficha Técnica Modal
  const handleOpenSurveyModal = (lead: ProspectiveLead) => {
    setActiveLeadForSurvey({
      data: new Date().toLocaleDateString('pt-MZ'),
      responsavel: 'Gestor Comercial LECASU',
      nomeEmpresa: lead.nomeEmpresa,
      sector: lead.sector,
      cidadeProvincia: lead.cidadeProvincia,
      morada: lead.morada,
      website: lead.website,
      googleMaps: lead.googleMaps,
      telefone: lead.telefone,
      email: lead.email,
      directorDecisor: lead.directorDecisor,
      contactoDecisor: lead.contactoDecisor,
      funcionaDia: lead.funcionaDia,
      opera24h: lead.opera24h,
      grandeCobertura: lead.grandeCobertura,
      estacionamentoAmplo: lead.estacionamentoAmplo,
      possuiGerador: lead.possuiGerador,
      possuiSistemaSolar: lead.possuiSistemaSolar,
      actividadePrincipal: lead.actividadePrincipal,
      potencialEstimado: lead.potencialEstimado,
      solucaoRecomendada: lead.solucaoRecomendada,
      prioridade: lead.prioridade,
      observacoes: lead.observacoes,
      consumoMensalEstimadoMZN: lead.consumoMensalEstimadoMZN,
      potenciaSolarRecomendadakWp: lead.potenciaSolarRecomendadakWp,
      economiaMensalEstimadaMZN: lead.economiaMensalEstimadaMZN
    });
    setIsSurveyModalOpen(true);
  };

  // Convert Lead to Client in CRM
  const handleConvertLeadToClient = (lead: ProspectiveLead | PPASurveyData) => {
    const newClientData = {
      name: lead.nomeEmpresa,
      nuit: '400' + Math.floor(10000000 + Math.random() * 90000000),
      email: lead.email || 'contacto@' + lead.nomeEmpresa.toLowerCase().replace(/[^a-z0-9]/g, '') + '.co.mz',
      phone: lead.telefone || '+258 84 000 0000',
      address: lead.morada || lead.cidadeProvincia,
      category: lead.sector || 'Industrial',
      isActive: true,
      notes: `Convertido a partir do Radar de Prospecção IA (Ficha PPA/EaaS - Prioridade ${lead.prioridade}). Decisor: ${lead.directorDecisor}`
    };

    onAddClient(newClientData);

    // Update lead status
    setLeads(prev => prev.map(l => l.nomeEmpresa === lead.nomeEmpresa ? { ...l, status: 'Convertido em Cliente' } : l));
    addToast('success', 'Cliente Adicionado', `${lead.nomeEmpresa} foi cadastrado com sucesso na carteira de clientes!`);
    setIsSurveyModalOpen(false);
  };

  // Generate Commercial Proposal for Lead
  const handleGenerateProposalForLead = (lead: ProspectiveLead | PPASurveyData) => {
    const kwp = lead.potenciaSolarRecomendadakWp || 250;
    const estimatedValue = kwp * 45000; // MZN per kWp estimate

    const initialProposalData = {
      title: `Projeto Solar Fotovoltaico ${lead.solucaoRecomendada || 'PPA'} ${kwp} kWp - ${lead.nomeEmpresa}`,
      total_amount: estimatedValue,
      items: [
        {
          description: `Sistema Solar Fotovoltaico ${lead.solucaoRecomendada || 'PPA'} - Potência Nominal ${kwp} kWp (Geração Anual Estimada: ${Math.round(kwp * 1650)} kWh/ano)`,
          quantity: 1,
          unitPrice: estimatedValue * 0.75,
          totalPrice: estimatedValue * 0.75
        },
        {
          description: `Serviços de Engenharia, Integração com Rede EDM / Gerador e Estrutura de Fixação Solar`,
          quantity: 1,
          unitPrice: estimatedValue * 0.25,
          totalPrice: estimatedValue * 0.25
        }
      ],
      notes: `Proposta gerada a partir da Ficha de Levantamento PPA/EaaS. Economia mensal estimada: ${((lead.economiaMensalEstimadaMZN || 250000)).toLocaleString('pt-MZ')} MZN.`
    };

    // Convert to client first if needed, then open proposal modal
    handleConvertLeadToClient(lead);
    onOpenCreateProposal(initialProposalData);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100 flex flex-col p-4 sm:p-6 min-h-0 select-none">
      
      {/* Banner de Inteligência Comercial / Top Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#0F172A] text-white p-5 sm:p-6 rounded-2xl shadow-lg border border-slate-800 mb-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-[#FF8000]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#FF8000] text-white font-bold shadow-sm shrink-0">
                <Sparkles size={20} />
              </div>
              <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-white leading-normal">
                Radar de Prospecção Comercial & Levantamento PPA / EaaS (com IA)
              </h1>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Pesquisa automatizada e diagnóstico técnico de empresas comerciais e industriais em Moçambique. Elimina deslocações desnecessárias através da análise de consumo e fichas técnicas integradas.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunAIScan}
            disabled={isScanning}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#FF8000] to-[#E67300] hover:from-[#E67300] hover:to-[#CC6600] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
          >
            {isScanning ? (
              <Loader2 size={18} className="animate-spin text-white shrink-0" />
            ) : (
              <Sparkles size={18} className="shrink-0" />
            )}
            <span className="whitespace-nowrap">{isScanning ? 'A Varrer Mercado com IA...' : 'Executar Varredura de Mercado com IA'}</span>
          </button>
        </div>

        {/* Progress Bar while scanning */}
        {isScanning && (
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-1.5 animate-in fade-in">
            <div className="flex justify-between text-[11px] font-mono text-orange-300">
              <span>A analisar registros de empresas, faturas estimadas EDM e imagens de satélite...</span>
              <span>{scanProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#FF8000] to-emerald-400 transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Painel de Filtros Avançados */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs mb-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 whitespace-nowrap">
            <Filter size={15} className="text-[#FF8000] shrink-0" />
            <span>Filtros de Prospecção & Varredura Alvo</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
            Exibindo <strong className="text-slate-900 font-bold">{filteredLeads.length}</strong> potenciais clientes
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
          
          {/* Pesquisa por Texto */}
          <div className="lg:col-span-1">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 whitespace-nowrap">Empresa / Palavra-chave</label>
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar empresa..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#FF8000]"
              />
            </div>
          </div>

          {/* Setor */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 whitespace-nowrap">Setor de Actuação</label>
            <select
              value={selectedSector}
              onChange={e => setSelectedSector(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#FF8000]"
            >
              <option value="todos">Todos os Setores</option>
              <option value="Industrial">Industrial / Fabril</option>
              <option value="Comercial">Comercial / Supermercados</option>
              <option value="Hotelaria">Hotelaria & Resorts</option>
              <option value="Agricultura">Agricultura / Agro-processamento</option>
              <option value="Hospitais">Hospitais & Saúde</option>
              <option value="Logística">Logística & Armazéns</option>
            </select>
          </div>

          {/* Cidade/Província */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 whitespace-nowrap">Cidade / Província</label>
            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#FF8000]"
            >
              <option value="todas">Todas as Cidades</option>
              <option value="Maputo">Maputo Cidade</option>
              <option value="Matola">Matola</option>
              <option value="Beira">Beira (Sofala)</option>
              <option value="Nampula">Nampula</option>
              <option value="Tete">Tete</option>
              <option value="Vilankulo">Vilankulo / Inhambane</option>
              <option value="Zambézia">Mocuba (Zambézia)</option>
            </select>
          </div>

          {/* Solução Recomendada */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 whitespace-nowrap">Solução Recomendada</label>
            <select
              value={selectedSolution}
              onChange={e => setSelectedSolution(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#FF8000]"
            >
              <option value="todas">Todas as Soluções</option>
              <option value="PPA">PPA (Power Purchase Agreement)</option>
              <option value="EaaS">EaaS (Energy as a Service)</option>
              <option value="EPC">EPC (Turnkey Solar)</option>
            </select>
          </div>

          {/* Prioridade */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 whitespace-nowrap">Prioridade</label>
            <select
              value={selectedPriority}
              onChange={e => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#FF8000]"
            >
              <option value="todas">Todas as Prioridades</option>
              <option value="A">Prioridade A (Alta)</option>
              <option value="B">Prioridade B (Média)</option>
              <option value="C">Prioridade C (Baixa)</option>
            </select>
          </div>

        </div>
      </div>

      {/* Grid de Cards de Potenciais Clientes PPA/EaaS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {filteredLeads.map(lead => (
          <div 
            key={lead.id} 
            className="bg-white border border-slate-200 hover:border-orange-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
          >
            <div>
              {/* Header Card: Nome, Match & Badge Prioridade */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shrink-0 ${
                      lead.prioridade === 'A' 
                        ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                        : lead.prioridade === 'B'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      Prioridade {lead.prioridade}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1 whitespace-nowrap shrink-0">
                      <Sparkles size={11} className="shrink-0" />
                      {lead.matchPercentage}% Match IA
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 mt-2 leading-snug group-hover:text-[#FF8000] transition">
                    {lead.nomeEmpresa}
                  </h4>
                </div>
              </div>

              {/* Setor e Localização */}
              <div className="space-y-1.5 text-xs text-slate-500 mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Building2 size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{lead.sector}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{lead.cidadeProvincia}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600">
                  <UserCheck size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{lead.directorDecisor}</span>
                </div>
              </div>

              {/* Métricas Energéticas Estimadas */}
              <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-50 border border-slate-100 rounded-xl mb-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase whitespace-nowrap">Fatura Est. (MZN)</span>
                  <strong className="font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                    {(lead.consumoMensalEstimadoMZN).toLocaleString('pt-MZ')} MZN/mês
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase whitespace-nowrap">Economia Est. PPA</span>
                  <strong className="font-mono font-bold text-emerald-600 text-xs whitespace-nowrap">
                    -{(lead.economiaMensalEstimadaMZN).toLocaleString('pt-MZ')} MZN
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase whitespace-nowrap">Solução</span>
                  <span className="font-bold text-[#FF8000] whitespace-nowrap">{lead.solucaoRecomendada} ({lead.potenciaSolarRecomendadakWp} kWp)</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase whitespace-nowrap">Status</span>
                  <span className="font-medium text-slate-700 whitespace-nowrap">{lead.status}</span>
                </div>
              </div>

              {/* Observações / Diagnóstico Resumido */}
              <p className="text-[11px] text-slate-600 italic line-clamp-2 mb-4 bg-orange-50/40 p-2 rounded-lg border border-orange-100/60">
                "{lead.observacoes}"
              </p>
            </div>

            {/* Bottom Actions Buttons */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenSurveyModal(lead)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                title="Ver / Preencher Ficha Técnica de Levantamento PPA"
              >
                <FileText size={14} className="text-[#FF8000] shrink-0" />
                <span className="whitespace-nowrap">Ficha Técnica</span>
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleConvertLeadToClient(lead)}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
                  title="Cadastrar Cliente na Carteira CRM"
                >
                  <Plus size={13} className="shrink-0" />
                  <span className="whitespace-nowrap">+ CRM</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerateProposalForLead(lead)}
                  className="px-3 py-1.5 rounded-lg bg-[#FF8000] hover:bg-[#E67300] text-white text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  title="Gerar Proposta Comercial PPA/EaaS Instantânea"
                >
                  <FileSpreadsheet size={14} className="shrink-0" />
                  <span className="whitespace-nowrap">Proposta</span>
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Tabela de Resumo Diário de Levantamentos (Ficha de 5+ Empresas) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Award size={16} className="text-[#FF8000] shrink-0" />
              <span>Resumo Diário de Levantamentos de Mercado (Empresas Prospectadas)</span>
            </h3>
            <p className="text-xs text-slate-500">Relatório executivo dos levantamentos PPA/EaaS registrados no ERP LECASU</p>
          </div>
        </div>

        <div className="overflow-x-auto select-text scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse min-w-[920px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <th className="p-3 min-w-[200px] whitespace-nowrap">Empresa</th>
                <th className="p-3 min-w-[140px] whitespace-nowrap">Cidade / Província</th>
                <th className="p-3 min-w-[140px] whitespace-nowrap">Potencial Estimado</th>
                <th className="p-3 min-w-[110px] whitespace-nowrap">Prioridade</th>
                <th className="p-3 min-w-[150px] whitespace-nowrap">Solução</th>
                <th className="p-3 min-w-[260px]">Observações / Diagnóstico</th>
                <th className="p-3 text-right min-w-[100px] whitespace-nowrap">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {leads.map(l => (
                <tr key={l.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-bold text-slate-900 min-w-[200px] leading-snug">{l.nomeEmpresa}</td>
                  <td className="p-3 text-slate-600 whitespace-nowrap">{l.cidadeProvincia}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 whitespace-nowrap inline-block text-[11px]">
                      {l.potencialEstimado}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="font-mono font-bold text-slate-900 whitespace-nowrap">Prioridade {l.prioridade}</span>
                  </td>
                  <td className="p-3 font-bold text-[#FF8000] whitespace-nowrap">{l.solucaoRecomendada} ({l.potenciaSolarRecomendadakWp} kWp)</td>
                  <td className="p-3 text-slate-600 min-w-[260px] leading-snug">
                    {l.observacoes}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleOpenSurveyModal(l)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold transition cursor-pointer text-xs whitespace-nowrap shrink-0"
                    >
                      Abrir Ficha
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Ficha Técnica de Levantamento PPA | EaaS */}
      <PPASurveyModal
        isOpen={isSurveyModalOpen}
        onClose={() => setIsSurveyModalOpen(false)}
        initialData={activeLeadForSurvey || DEFAULT_SURVEY_DATA}
        onSave={(savedSurvey) => {
          addToast('success', 'Ficha Salva', `Ficha técnica de ${savedSurvey.nomeEmpresa} salva no ERP.`);
          setIsSurveyModalOpen(false);
        }}
        onConvertToClient={(survey) => handleConvertLeadToClient(survey)}
        onGenerateProposal={(survey) => handleGenerateProposalForLead(survey)}
      />

    </div>
  );
};
