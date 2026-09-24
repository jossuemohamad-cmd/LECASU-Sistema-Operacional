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
import { LoginView } from './components/auth/LoginView';
import { getAuthToken, removeAuthToken, fetchCurrentUser } from './services/api';
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
    if (token && !currentUser) {
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
  };

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }



  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* SIDEBAR OFICIAL LECASU */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-slate-900 text-white flex flex-col transition-all duration-200 border-r border-slate-800 z-20 flex-shrink-0`}
      >
        {/* LOGO AREA */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded bg-orange-600 flex items-center justify-center font-bold text-white tracking-wider flex-shrink-0">
              L
            </div>
            {sidebarOpen && (
              <span className="font-bold text-lg tracking-tight text-white whitespace-nowrap">
                LECASU <span className="text-orange-500 text-xs font-normal">ERP</span>
              </span>
            )}
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
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
                className={`w-full flex items-center px-3 py-2.5 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-orange-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title={!sidebarOpen ? tab.name : undefined}
              >
                <Icon size={18} className="flex-shrink-0" />
                {sidebarOpen && (
                  <span className="ml-3 truncate">{tab.name}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* VERSÃO NO RODAPÉ */}
        {sidebarOpen && (
          <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500">
            LECASU OS v2.0 • 2026
          </div>
        )}
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* HEADER OFICIAL */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 flex-shrink-0">
          <div className="flex items-center w-96">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Pesquisa rápida no sistema..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button className="text-slate-500 hover:text-slate-700 relative p-1.5 rounded hover:bg-slate-100 transition">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-orange-600 rounded-full"></span>
            </button>
            <div className="flex items-center space-x-3 border-l border-slate-200 pl-4">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                {(currentUser?.name || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="text-left text-xs">
                <p className="font-semibold text-slate-800 leading-tight">
                  {currentUser?.name || 'Admin LECASU'}
                </p>
                <p className="text-slate-500 text-[11px] capitalize">
                  {currentUser?.role ? `Perfil: ${currentUser.role}` : 'Direção Geral'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition ml-1"
                title="Terminar Sessão"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* CONTEÚDO DA ABA SELECIONADA */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
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
            ) : activeTab === 'fornecedores' ? (
              <SuppliersView />
            ) : activeTab === 'rh' ? (
              <HRView />
            ) : activeTab === 'ged' ? (
              <GEDView />
            ) : activeTab === 'definicoes' ? (
              <SettingsView />
            ) : (




              <div>
                <div className="flex items-center justify-between pb-6 border-b border-slate-200 mb-6">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 capitalize">
                      {TABS.find(t => t.id === activeTab)?.name}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Módulo operacional ativo no domínio LECASU
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setOpenNewRecordTrigger(true)}
                      className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-xs transition"
                    >
                      + Novo Registo
                    </button>
                  </div>
                </div>

                {/* ESTADO VAZIO / CONTEÚDO INICIAL PARA OUTRAS ABAS */}
                <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-xs">
                  <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <LayoutDashboard size={24} />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Domínio de {TABS.find(t => t.id === activeTab)?.name} pronto para dados
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                    Nenhum registo cadastrado até o momento. Clique no botão abaixo para adicionar o primeiro item.
                  </p>
                  <button 
                    onClick={() => setOpenNewRecordTrigger(true)}
                    className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2 rounded-md transition"
                  >
                    Iniciar Cadastro
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}