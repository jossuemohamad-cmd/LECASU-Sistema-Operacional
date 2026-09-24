import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Wrench, 
  Briefcase, 
  HardHat, 
  Wallet, 
  Truck, 
  UserCheck, 
  FolderArchive, 
  Settings, 
  Menu, 
  Search, 
  Bell, 
  LogOut,
  ChevronLeft,
  ShieldCheck,
  CheckCircle2,
  X
} from 'lucide-react';
import { ClientsProposalsView } from './components/clients/ClientsProposalsView';
import { ProjectsView } from './components/projects/ProjectsView';
import { DashboardView } from './components/dashboard/DashboardView';
import { TechnicalTeamView } from './components/team/TechnicalTeamView';
import { ServicesView } from './components/services/ServicesView';
import { SettingsView } from './components/settings/SettingsView';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { HRView } from './components/hr/HRView';
import { GEDView } from './components/ged/GEDView';
import { FinanceView } from './components/finance/FinanceView';
import { LoginView } from './components/auth/LoginView';
import { ConfirmationModal } from './components/common/ConfirmationModal';
import { getAuthToken, removeAuthToken, fetchCurrentUser, prefetchAllCoreData } from './services/api';
import type { User } from './types';

const TABS = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { id: 'clientes', name: 'Clientes & Propostas', icon: Users },
  { id: 'servicos', name: 'Serviços', icon: Wrench },
  { id: 'projetos', name: 'Projetos', icon: Briefcase },
  { id: 'equipa', name: 'Equipa Técnica', icon: HardHat },
  { id: 'financeiro', name: 'Gestão Financeira', icon: Wallet },
  { id: 'fornecedores', name: 'Fornecedores', icon: Truck },
  { id: 'rh', name: 'Recursos Humanos', icon: UserCheck },
  { id: 'ged', name: 'Repositório GED', icon: FolderArchive },
  { id: 'definicoes', name: 'Definições', icon: Settings },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('lecasu_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getAuthToken());

  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openNewRecordTrigger, setOpenNewRecordTrigger] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      prefetchAllCoreData();
      if (!currentUser) {
        fetchCurrentUser()
          .then(user => {
            setCurrentUser(user);
            setIsAuthenticated(true);
          })
          .catch(() => {
            removeAuthToken();
            setIsAuthenticated(false);
            setCurrentUser(null);
          });
      }
    }
  }, []);

  const handleLogout = () => {
    setIsLogoutModalOpen(false);
    removeAuthToken();
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setActiveTab('dashboard');
    prefetchAllCoreData();
  };

  // Quick module search filter
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearch.trim()) return;
    const query = globalSearch.toLowerCase().trim();
    const matchedTab = TABS.find(t => t.name.toLowerCase().includes(query) || t.id.toLowerCase().includes(query));
    if (matchedTab) {
      setActiveTab(matchedTab.id);
      setGlobalSearch('');
    }
  };

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-[#F5F5F3] overflow-hidden font-sans text-[#101010]">
      {/* 
        1. SIDEBAR RETRÁTIL DA APLICAÇÃO (AppShell Sidebar)
        - 256px expandida (w-64)
        - 68px recolhida (w-[68px])
        - Ícones centralizados quando recolhida
      */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-[68px]'
        } bg-[#101010] text-white flex flex-col transition-[width] duration-200 ease-in-out border-r border-[#222222] z-20 flex-shrink-0 shadow-lg select-none`}
      >
        {/* LOGO & TOGGLE HEADER (64px altura) */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#222222]">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#FF8000] flex items-center justify-center font-heading font-extrabold text-white text-base tracking-wider flex-shrink-0 shadow-sm">
              L
            </div>
            {sidebarOpen && (
              <span className="font-heading font-bold text-base tracking-tight text-white whitespace-nowrap">
                LECASU <span className="text-[#FF8000] text-xs font-semibold tracking-wider">ERP</span>
              </span>
            )}
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1F1F1F] transition flex items-center justify-center"
            title={sidebarOpen ? "Recolher menu (68px)" : "Expandir menu (256px)"}
          >
            {sidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* NAVEGAÇÃO DOS MÓDULOS */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center rounded-lg text-[13px] font-medium transition-all ${
                  sidebarOpen 
                    ? 'px-3 py-2.5 justify-start' 
                    : 'h-10 px-0 justify-center'
                } ${
                  isActive
                    ? 'bg-[#FF8000] text-white font-heading font-semibold shadow-md shadow-[#FF8000]/20'
                    : 'text-neutral-300 hover:bg-[#1A1A1A] hover:text-white'
                }`}
                title={!sidebarOpen ? tab.name : undefined}
              >
                <Icon size={18} className="flex-shrink-0" />
                {sidebarOpen && (
                  <span className="ml-3 truncate font-sans">{tab.name}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* RODAPÉ DA SIDEBAR */}
        <div className={`p-4 border-t border-[#222222] text-[11px] text-neutral-500 font-sans flex items-center ${
          sidebarOpen ? 'justify-between' : 'justify-center'
        }`}>
          {sidebarOpen ? (
            <>
              <div className="flex items-center space-x-1.5">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>LECASU OS v2.0</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-[#FF8000] animate-pulse" title="Sistema online"></span>
            </>
          ) : (
            <span className="w-2 h-2 rounded-full bg-[#FF8000] animate-pulse" title="Online v2.0"></span>
          )}
        </div>
      </aside>

      {/* 
        2. ÁREA PRINCIPAL DA APLICAÇÃO (AppShell Main Area)
      */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F5F5F3]">
        {/* TOPBAR / HEADER FIXO (64px de altura, px-6 padding horizontal) */}
        <header className="h-16 bg-white border-b border-[#E2E2DE] flex items-center justify-between px-6 z-10 flex-shrink-0 shadow-xs relative">
          {/* SEARCH BAR (40px height, 12px px) */}
          <form onSubmit={handleSearchSubmit} className="flex items-center w-80 md:w-96">
            <div className="relative w-full">
              <Search className="absolute left-3 top-3 text-neutral-400" size={16} />
              <input
                type="text"
                placeholder="Pesquisa rápida de módulos... (Enter para navegar)"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-4 text-[13px] bg-[#F5F5F3] border border-[#E2E2DE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8000]/20 focus:border-[#FF8000] focus:bg-white transition"
              />
            </div>
          </form>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center space-x-4">
            {/* NOTIFICAÇÕES */}
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="text-neutral-500 hover:text-neutral-900 relative p-2 rounded-lg hover:bg-neutral-100 transition"
                title="Notificações do Sistema"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF8000] rounded-full"></span>
              </button>

              {/* Notification Popover Dropdown */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-[#E2E2DE] z-30 p-4 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-3 border-b border-[#EDEDEA]">
                    <h4 className="text-xs font-bold text-[#101010] font-heading">Notificações do Sistema</h4>
                    <button 
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-neutral-400 hover:text-neutral-600 p-1 rounded"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="py-3 space-y-2">
                    <div className="flex items-start space-x-2.5 p-2 rounded-lg bg-[#FAFAF9] border border-[#EDEDEA]">
                      <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-semibold text-[#101010]">Base de Dados Sincronizada</p>
                        <p className="text-[#737370] text-[11px] mt-0.5">PostgreSQL Neon DB conectado e operacional.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* PERFIL DO UTILIZADOR */}
            <div className="flex items-center space-x-3 border-l border-[#E2E2DE] pl-4">
              <div className="w-9 h-9 rounded-full bg-[#101010] text-white font-heading font-bold text-xs flex items-center justify-center flex-shrink-0 border border-neutral-700 shadow-xs">
                {(currentUser?.name || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="text-left text-xs hidden sm:block">
                <p className="font-heading font-semibold text-[#101010] leading-tight">
                  {currentUser?.name || 'Admin LECASU'}
                </p>
                <p className="text-neutral-500 text-[11px] capitalize font-sans">
                  {currentUser?.role ? `Perfil: ${currentUser.role}` : 'Direção Geral'}
                </p>
              </div>
              <button
                onClick={() => setIsLogoutModalOpen(true)}
                className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition ml-1"
                title="Terminar Sessão"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* 
          3. CONTAINER PRINCIPAL DE CONTEÚDO (Padding 24px desktop, 16px mobile, Max-Width 1440px)
        */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F5F5F3]">
          <div className="max-w-[1440px] mx-auto w-full">
            {activeTab === 'dashboard' ? (
              <DashboardView onNavigate={(tab) => setActiveTab(tab)} />
            ) : activeTab === 'clientes' ? (
              <ClientsProposalsView
                onOpenNewClientModal={openNewRecordTrigger}
                onResetOpenNewClientModal={() => setOpenNewRecordTrigger(false)}
                onNavigateToProjects={() => setActiveTab('projetos')}
              />
            ) : activeTab === 'servicos' ? (
              <ServicesView />
            ) : activeTab === 'projetos' ? (
              <ProjectsView />
            ) : activeTab === 'equipa' ? (
              <TechnicalTeamView />
            ) : activeTab === 'financeiro' ? (
              <FinanceView />
            ) : activeTab === 'fornecedores' ? (
              <SuppliersView />
            ) : activeTab === 'rh' ? (
              <HRView />
            ) : activeTab === 'ged' ? (
              <GEDView />
            ) : activeTab === 'definicoes' ? (
              <SettingsView />
            ) : null}
          </div>
        </main>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE ENCERRAMENTO DE SESSÃO */}
      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title="Terminar Sessão?"
        description="Deseja realmente sair da sua conta no sistema LECASU ERP? Terá de introduzir as credenciais para voltar a aceder."
        confirmText="Sim, Terminar Sessão"
        cancelText="Permanecer Conectado"
        variant="warning"
      />
    </div>
  );
}