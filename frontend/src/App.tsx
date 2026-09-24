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
  LogOut
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

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }



  return (
    <div className="flex h-screen bg-[#F5F5F3] overflow-hidden font-sans text-[#101010]">
      {/* SIDEBAR OFICIAL LECASU */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-[#101010] text-white flex flex-col transition-all duration-200 border-r border-[#222222] z-20 flex-shrink-0 shadow-lg`}
      >
        {/* LOGO AREA */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#222222]">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#FF8000] flex items-center justify-center font-heading font-extrabold text-white tracking-wider flex-shrink-0 shadow-sm">
              L
            </div>
            {sidebarOpen && (
              <span className="font-heading font-bold text-lg tracking-tight text-white whitespace-nowrap">
                LECASU <span className="text-[#FF8000] text-xs font-semibold tracking-wider">ERP</span>
              </span>
            )}
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-neutral-400 hover:text-white p-1.5 rounded-md hover:bg-[#1F1F1F] transition"
            title={sidebarOpen ? "Recolher menu" : "Expandir menu"}
          >
            <Menu size={18} />
          </button>
        </div>

        {/* NAVEGAÇÃO DAS 10 ABAS */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
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

        {/* VERSÃO NO RODAPÉ */}
        {sidebarOpen && (
          <div className="p-4 border-t border-[#222222] text-[11px] text-neutral-500 font-sans flex items-center justify-between">
            <span>LECASU OS v2.0</span>
            <span className="w-2 h-2 rounded-full bg-[#FF8000] animate-pulse"></span>
          </div>
        )}
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F5F5F3]">
        {/* HEADER OFICIAL */}
        <header className="h-16 bg-white border-b border-[#E2E2DE] flex items-center justify-between px-6 z-10 flex-shrink-0 shadow-xs">
          <div className="flex items-center w-96">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 text-neutral-400" size={16} />
              <input
                type="text"
                placeholder="Pesquisa rápida no sistema..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#F5F5F3] border border-[#E2E2DE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8000]/30 focus:border-[#FF8000] focus:bg-white transition"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button className="text-neutral-500 hover:text-neutral-800 relative p-1.5 rounded-lg hover:bg-neutral-100 transition">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF8000] rounded-full"></span>
            </button>
            <div className="flex items-center space-x-3 border-l border-[#E2E2DE] pl-4">
              <div className="w-8 h-8 rounded-full bg-[#101010] text-white font-heading font-bold text-xs flex items-center justify-center flex-shrink-0 border border-neutral-700">
                {(currentUser?.name || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="text-left text-xs">
                <p className="font-heading font-semibold text-[#101010] leading-tight">
                  {currentUser?.name || 'Admin LECASU'}
                </p>
                <p className="text-neutral-500 text-[11px] capitalize font-sans">
                  {currentUser?.role ? `Perfil: ${currentUser.role}` : 'Direção Geral'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition ml-1"
                title="Terminar Sessão"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* CONTEÚDO DA ABA SELECIONADA */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#F5F5F3]">
          <div className="max-w-7xl mx-auto">
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
    </div>
  );
}