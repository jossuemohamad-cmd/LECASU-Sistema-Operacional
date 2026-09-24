import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FolderArchive, 
  HardDrive, 
  UploadCloud, 
  Search, 
  RefreshCw, 
  Download, 
  Trash2, 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  FileCode, 
  FileArchive, 
  File as FileIcon, 
  X, 
  CheckCircle2, 
  Loader2, 
  Folder, 
  FolderOpen, 
  Cloud, 
  ExternalLink, 
  ShieldCheck, 
  Home, 
  ChevronRight, 
  ArrowUp, 
  ArrowLeft, 
  ArrowRight, 
  CheckSquare, 
  Square 
} from 'lucide-react';
import type { 
  GEDDocument, 
  GEDOverviewKPIs, 
  Project, 
  Client, 
  ToastMessage 
} from '../../types';
import { 
  fetchDocuments, 
  uploadDocument, 
  deleteDocument, 
  downloadDocument,
  fetchGEDOverviewKPIs, 
  fetchProjects, 
  fetchClients 
} from '../../services/api';
import { Toast } from '../common/Toast';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { GoogleDriveExplorerModal, getStoredGoogleToken } from './GoogleDriveExplorerModal';

interface FolderNode {
  id: string;
  name: string;
  path: string;
  color: string;
  description: string;
}

const SYSTEM_FOLDERS: FolderNode[] = [
  { id: 'pdf', name: 'pdf', path: '/pdf', color: 'text-rose-500', description: 'Documentos, Relatórios e Especificações Técnicas' },
  { id: 'png', name: 'png', path: '/png', color: 'text-blue-500', description: 'Imagens e Gráficos em PNG' },
  { id: 'jpg', name: 'jpg', path: '/jpg', color: 'text-indigo-500', description: 'Fotografias de Obras e Imagens JPEG' },
  { id: 'logos', name: 'logos', path: '/logos', color: 'text-amber-500', description: 'Identidade Visual e Marcas da Empresa' },
  { id: 'planilhas', name: 'planilhas', path: '/planilhas', color: 'text-emerald-500', description: 'Folhas de Cálculo, Medições e Orçamentos' },
  { id: 'projetos_cad', name: 'projetos_cad', path: '/projetos_cad', color: 'text-purple-500', description: 'Plantas de Engenharia, DWG e Modelos Técnicos' },
  { id: 'contratos', name: 'contratos', path: '/contratos', color: 'text-cyan-500', description: 'Contratos, Acordos e Documentação Jurídica' },
  { id: 'rh_pessoal', name: 'rh_pessoal', path: '/rh_pessoal', color: 'text-teal-500', description: 'Fichas de Funcionários e RH' },
  { id: 'geral', name: 'geral', path: '/geral', color: 'text-neutral-500', description: 'Outros Ficheiros e Documentos Diversos' },
];

const CATEGORIES = [
  'Contratos',
  'Projetos Técnicos',
  'Faturas & Recibos',
  'RH & Pessoal',
  'Certificações & Licenças',
  'Logotipos & Marcas',
  'Geral'
];

export const GEDView: React.FC = () => {
  // Data States
  const [documents, setDocuments] = useState<GEDDocument[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [kpis, setKpis] = useState<GEDOverviewKPIs>({
    total_documents: 0,
    active_categories_count: 0,
    total_storage_bytes: 0,
    total_storage_formatted: '0 KB',
    monthly_uploads_count: 0
  });

  const [isLoading, setIsLoading] = useState(true);

  // File Manager Navigation State
  const [currentPath, setCurrentPath] = useState<string>('/'); // '/' is root, '/pdf', '/png', etc.
  const [history, setHistory] = useState<string[]>(['/']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isTreeExpanded, setIsTreeExpanded] = useState<boolean>(true);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCloudIntegrationsOpen, setIsCloudIntegrationsOpen] = useState(false);
  const [isGoogleDriveExplorerOpen, setIsGoogleDriveExplorerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Projetos Técnicos',
    version: 'v1.0',
    description: '',
    project_id: '',
    client_id: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const loadAllData = async (showToastFeedback = false) => {
    setIsLoading(true);
    try {
      const [docsData, kpisData, projectsData, clientsData] = await Promise.all([
        fetchDocuments(),
        fetchGEDOverviewKPIs(),
        fetchProjects().catch(() => []),
        fetchClients().catch(() => [])
      ]);
      setDocuments(docsData);
      setKpis(kpisData);
      setProjects(projectsData);
      setClients(clientsData);
      if (showToastFeedback) {
        showToast('success', 'Repositório Atualizado', 'Gestor de ficheiros sincronizado com o Storage Neon.');
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados do GED:', err);
      showToast('error', 'Erro de Sincronização', err.message || 'Erro ao carregar dados do Gestor de Ficheiros.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Determine which folder a document belongs to
  const getDocumentFolderName = (doc: GEDDocument): string => {
    const ext = doc.file_name.split('.').pop()?.toLowerCase() || '';
    const titleLower = doc.title.toLowerCase();
    const catLower = (doc.category || '').toLowerCase();
    const filePath = (doc.file_path || '').toLowerCase();
    
    if (filePath.includes('/logos/') || titleLower.includes('logo') || catLower.includes('logo')) {
      return 'logos';
    }
    if (filePath.includes('/pdf/') || ext === 'pdf') {
      return 'pdf';
    }
    if (filePath.includes('/png/') || ext === 'png') {
      return 'png';
    }
    if (filePath.includes('/jpg/') || ['jpg', 'jpeg', 'webp'].includes(ext)) {
      return 'jpg';
    }
    if (filePath.includes('/planilhas/') || ['xlsx', 'xls', 'csv'].includes(ext)) {
      return 'planilhas';
    }
    if (filePath.includes('/projetos_cad/') || ['dwg', 'dxf'].includes(ext) || catLower.includes('projet')) {
      return 'projetos_cad';
    }
    if (filePath.includes('/contratos/') || catLower.includes('contrat')) {
      return 'contratos';
    }
    if (filePath.includes('/rh_pessoal/') || catLower.includes('rh') || catLower.includes('pessoal')) {
      return 'rh_pessoal';
    }
    return 'geral';
  };

  // Folder documents count map
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    SYSTEM_FOLDERS.forEach(f => {
      counts[f.id] = documents.filter(doc => getDocumentFolderName(doc) === f.id).length;
    });
    return counts;
  }, [documents]);

  // Navigate to a folder path
  const navigateTo = (path: string) => {
    if (path === currentPath) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(path);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentPath(path);
    setSelectedDocIds([]);
  };

  // Navigation: Go Back
  const handleGoBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentPath(history[newIndex]);
      setSelectedDocIds([]);
    }
  };

  // Navigation: Go Forward
  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentPath(history[newIndex]);
      setSelectedDocIds([]);
    }
  };

  // Navigation: Up One Level
  const handleUpLevel = () => {
    if (currentPath !== '/') {
      navigateTo('/');
    }
  };

  // Select all visible documents in current folder
  const handleSelectAll = () => {
    setSelectedDocIds(currentFolderDocuments.map(d => d.id));
  };

  const handleDeselectAll = () => {
    setSelectedDocIds([]);
  };

  const toggleSelectDoc = (id: number) => {
    setSelectedDocIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Documents inside current path
  const currentFolderDocuments = useMemo(() => {
    return documents.filter(doc => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        return (
          doc.title.toLowerCase().includes(q) ||
          doc.file_name.toLowerCase().includes(q) ||
          (doc.description && doc.description.toLowerCase().includes(q))
        );
      }

      if (currentPath === '/') {
        return false;
      }

      const folderId = currentPath.replace('/', '');
      return getDocumentFolderName(doc) === folderId;
    });
  }, [documents, currentPath, searchTerm]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!formData.title) {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setFormData(prev => ({ ...prev, title: nameWithoutExt }));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('error', 'Arquivo Obrigatório', 'Selecione um arquivo para upload.');
      return;
    }
    if (!formData.title.trim()) {
      showToast('error', 'Título Obrigatório', 'Informe o título do documento.');
      return;
    }

    try {
      setIsSubmitting(true);
      const data = new FormData();
      data.append('file', selectedFile);
      data.append('title', formData.title.trim());
      data.append('category', formData.category);
      data.append('version', formData.version || 'v1.0');
      if (formData.description) data.append('description', formData.description.trim());
      if (formData.project_id) data.append('project_id', formData.project_id);
      if (formData.client_id) data.append('client_id', formData.client_id);

      await uploadDocument(data);
      showToast('success', 'Ficheiro Arquivado!', `"${formData.title}" foi enviado com sucesso para o Neon S3.`);
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setFormData({
        title: '',
        category: 'Projetos Técnicos',
        version: 'v1.0',
        description: '',
        project_id: '',
        client_id: ''
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      loadAllData();
    } catch (err: any) {
      console.error('Erro no upload de documento:', err);
      showToast('error', 'Falha no Upload', err.message || 'Falha ao enviar documento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [docToDelete, setDocToDelete] = useState<GEDDocument | null>(null);

  const handleDelete = (doc: GEDDocument) => {
    setDocToDelete(doc);
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    const doc = docToDelete;
    setDeletingId(doc.id);
    try {
      await deleteDocument(doc.id);
      showToast('success', 'Ficheiro Eliminado', `"${doc.title}" foi removido do Neon S3 e da base de dados.`);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      setSelectedDocIds(prev => prev.filter(id => id !== doc.id));
      const updatedKpis = await fetchGEDOverviewKPIs();
      setKpis(updatedKpis);
      setDocToDelete(null);
    } catch (err: any) {
      console.error('Erro ao excluir documento:', err);
      showToast('error', 'Falha ao Eliminar', err.message || 'Não foi possível excluir o ficheiro.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (doc: GEDDocument) => {
    try {
      await downloadDocument(doc.id, doc.file_name);
    } catch (err: any) {
      console.error('Erro ao descarregar documento:', err);
      showToast('error', 'Erro no Download', 'Não foi possível descarregar o arquivo.');
    }
  };

  // Helper for file type icons
  const getFileIcon = (fileName: string, mimeType?: string | null) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf' || mimeType?.includes('pdf')) {
      return <FileText className="w-5 h-5 text-rose-500 flex-shrink-0" />;
    }
    if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext) || mimeType?.includes('image')) {
      return <FileImage className="w-5 h-5 text-blue-500 flex-shrink-0" />;
    }
    if (['xlsx', 'xls', 'csv'].includes(ext) || mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500 flex-shrink-0" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mimeType?.includes('zip')) {
      return <FileArchive className="w-5 h-5 text-amber-500 flex-shrink-0" />;
    }
    if (['js', 'ts', 'py', 'json', 'html', 'css', 'sql'].includes(ext)) {
      return <FileCode className="w-5 h-5 text-purple-500 flex-shrink-0" />;
    }
    return <FileIcon className="w-5 h-5 text-slate-500 flex-shrink-0" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFormatName = (fileName: string, mimeType?: string | null): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return 'Documento PDF';
    if (ext === 'png') return 'Imagem PNG';
    if (['jpg', 'jpeg'].includes(ext)) return 'Fotografia JPEG';
    if (ext === 'webp') return 'Imagem WebP';
    if (['xlsx', 'xls'].includes(ext)) return 'Folha de Cálculo Excel';
    if (ext === 'csv') return 'Tabela CSV';
    if (['dwg', 'dxf'].includes(ext)) return 'Projeto CAD (AutoCAD)';
    if (['zip', 'rar', '7z'].includes(ext)) return 'Arquivo Comprimido';
    return mimeType || 'Ficheiro Binário';
  };

  return (
    <div className="space-y-4 font-sans select-none">
      <Toast 
        toasts={toasts} 
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} 
      />

      {/* =========================================================================
          1. BARRA SUPERIOR DE FERRAMENTAS DO GESTOR DE FICHEIROS (File Manager Toolbar)
         ========================================================================= */}
      <div className="bg-white border border-[#E2E2DE] rounded-xl p-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Botões de Navegação & Ações Rápidas (Estilo File Manager / cPanel) */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => navigateTo('/')}
            className={`btn-ghost btn-sm flex items-center gap-1.5 ${currentPath === '/' ? 'bg-[#FFF2E5] text-[#FF8000] font-bold' : 'text-neutral-700'}`}
            title="Ir para o Início / Raiz"
          >
            <Home size={15} className={currentPath === '/' ? 'text-[#FF8000]' : 'text-neutral-500'} />
            <span className="text-xs">Início</span>
          </button>

          <div className="h-4 w-px bg-neutral-200 mx-1" />

          <button
            type="button"
            onClick={handleUpLevel}
            disabled={currentPath === '/'}
            className="btn-ghost btn-sm flex items-center gap-1 text-neutral-700 disabled:opacity-35"
            title="Subir um nível de diretório"
          >
            <ArrowUp size={14} />
            <span className="text-xs">Subir Um Nível</span>
          </button>

          <button
            type="button"
            onClick={handleGoBack}
            disabled={historyIndex === 0}
            className="btn-ghost btn-sm flex items-center gap-1 text-neutral-700 disabled:opacity-35"
            title="Voltar"
          >
            <ArrowLeft size={14} />
            <span className="text-xs">Voltar</span>
          </button>

          <button
            type="button"
            onClick={handleGoForward}
            disabled={historyIndex >= history.length - 1}
            className="btn-ghost btn-sm flex items-center gap-1 text-neutral-700 disabled:opacity-35"
            title="Avançar"
          >
            <ArrowRight size={14} />
            <span className="text-xs">Avançar</span>
          </button>

          <button
            type="button"
            onClick={() => loadAllData(true)}
            disabled={isLoading}
            className="btn-ghost btn-sm flex items-center gap-1 text-neutral-700"
            title="Recarregar e sincronizar"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-[#FF8000]' : ''} />
            <span className="text-xs">Recarregar</span>
          </button>

          <div className="h-4 w-px bg-neutral-200 mx-1" />

          <button
            type="button"
            onClick={handleSelectAll}
            className="btn-ghost btn-sm flex items-center gap-1 text-neutral-600"
            title="Selecionar todos os ficheiros da pasta"
          >
            <CheckSquare size={13} />
            <span className="text-xs">Selecionar Tudo</span>
          </button>

          <button
            type="button"
            onClick={handleDeselectAll}
            disabled={selectedDocIds.length === 0}
            className="btn-ghost btn-sm flex items-center gap-1 text-neutral-600 disabled:opacity-35"
            title="Desmarcar seleção"
          >
            <Square size={13} />
            <span className="text-xs">Desmarcar Tudo</span>
          </button>
        </div>

        {/* Ações Primárias (Upload, Conectar Cloud) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCloudIntegrationsOpen(true)}
            className="btn-secondary btn-sm flex items-center gap-1.5"
            title="Repositórios em Nuvem (Google Drive / OneDrive)"
          >
            <Cloud size={14} className="text-[#FF8000]" />
            <span className="text-xs font-semibold">Repositórios Cloud</span>
            {getStoredGoogleToken() && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ml-0.5" title="Google Drive Conectado" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="btn-primary btn-sm flex items-center gap-1.5 shadow-sm"
          >
            <UploadCloud size={14} />
            <span className="text-xs font-bold">Novo Arquivo</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. PAINEL PRINCIPAL: ÁRVORE DE DIRETÓRIOS (ESQUERDA) + EXPLORADOR (DIREITA)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* -----------------------------------------------------------------------
            PAINEL ESQUERDO: ÁRVORE DE DIRETÓRIOS (Folder Tree Explorer)
           ----------------------------------------------------------------------- */}
        <div className="lg:col-span-3 bg-white border border-[#E2E2DE] rounded-xl overflow-hidden shadow-2xs">
          
          {/* Cabeçalho do Caminho / Path Input */}
          <div className="p-3 bg-[#FAFAF9] border-b border-[#EDEDEA] flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Home size={15} className="text-[#FF8000] shrink-0" />
              <div className="px-2 py-1 bg-white border border-[#E2E2DE] rounded-md text-[11px] font-mono text-[#101010] truncate w-full shadow-2xs">
                {currentPath === '/' ? '/assets/ged' : `/assets/ged${currentPath}`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsTreeExpanded(!isTreeExpanded)}
              className="btn-ghost btn-sm text-[11px] text-[#737370] hover:text-[#101010] px-2 py-1 shrink-0"
              title={isTreeExpanded ? 'Reduzir todas as pastas' : 'Expandir todas as pastas'}
            >
              {isTreeExpanded ? 'Reduzir' : 'Expandir'}
            </button>
          </div>

          {/* Lista de Pastas e Subpastas */}
          <div className="p-2 space-y-0.5 max-h-[620px] overflow-y-auto">
            
            {/* Raiz: (/home/lecasu-storage/assets) */}
            <button
              type="button"
              onClick={() => navigateTo('/')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition cursor-pointer ${
                currentPath === '/' 
                  ? 'bg-[#FFF2E5] text-[#FF8000] font-bold shadow-2xs' 
                  : 'text-neutral-700 hover:bg-[#FAFAF9]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen size={16} className={currentPath === '/' ? 'text-[#FF8000]' : 'text-neutral-400'} />
                <span className="font-heading truncate font-semibold">assets (Raiz)</span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600">
                {kpis.total_documents}
              </span>
            </button>

            {/* Subpastas com hierarquia */}
            {isTreeExpanded && (
              <div className="pl-4 space-y-0.5 border-l border-neutral-200 ml-3.5 my-1">
                {SYSTEM_FOLDERS.map((folder) => {
                  const isActive = currentPath === folder.path;
                  const count = folderCounts[folder.id] || 0;

                  return (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => navigateTo(folder.path)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition cursor-pointer group ${
                        isActive 
                          ? 'bg-[#FFF2E5] text-[#FF8000] font-bold ring-1 ring-[#FF8000]/30 shadow-2xs' 
                          : 'text-neutral-700 hover:bg-[#FAFAF9]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Folder size={15} className={isActive ? 'text-[#FF8000]' : 'text-amber-500'} />
                        <span className="font-mono text-xs truncate">
                          {folder.name}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        isActive ? 'bg-[#FF8000] text-white font-bold' : 'bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Informação de Capacidade / Storage */}
            <div className="mt-4 pt-3 border-t border-neutral-100 px-2 text-[11px] text-neutral-500">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1 text-neutral-600 font-medium">
                  <HardDrive size={13} className="text-[#FF8000]" />
                  <span>Storage Neon S3</span>
                </span>
                <span className="font-mono font-bold text-neutral-800">{kpis.total_storage_formatted}</span>
              </div>
              <p className="text-[10px] text-neutral-400">
                Sincronização em tempo real ativa
              </p>
            </div>

          </div>
        </div>

        {/* -----------------------------------------------------------------------
            PAINEL DIREITO: EXPLORADOR DE FICHEIROS E TABELA DE CONTEÚDO
           ----------------------------------------------------------------------- */}
        <div className="lg:col-span-9 bg-white border border-[#E2E2DE] rounded-xl shadow-2xs overflow-hidden flex flex-col">
          
          {/* Breadcrumb Path & Search Bar */}
          <div className="p-3 bg-[#FAFAF9] border-b border-[#EDEDEA] flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Breadcrumb clicável */}
            <div className="flex items-center gap-1.5 text-xs text-[#101010] flex-wrap w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigateTo('/')}
                className="font-bold text-[#FF8000] hover:underline flex items-center gap-1"
              >
                <Home size={14} />
                <span>assets</span>
              </button>
              
              {currentPath !== '/' && (
                <>
                  <ChevronRight size={13} className="text-neutral-400" />
                  <span className="font-bold text-[#101010] font-mono bg-white px-2 py-0.5 rounded border border-[#E2E2DE]">
                    {currentPath.replace('/', '')}
                  </span>
                </>
              )}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquisar ficheiro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E2E2DE] rounded-lg text-xs text-[#101010] placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#FF8000] focus:border-[#FF8000]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Tabela de Ficheiros e Pastas */}
          <div className="table-scroll-container min-h-[460px]">
            <table className="table-erp">
              <thead>
                <tr className="table-header-erp text-[11px]">
                  <th className="w-8 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={currentFolderDocuments.length > 0 && selectedDocIds.length === currentFolderDocuments.length}
                      onChange={(e) => e.target.checked ? handleSelectAll() : handleDeselectAll()}
                      className="rounded border-[#E2E2DE] text-[#FF8000] focus:ring-[#FF8000] accent-[#FF8000] cursor-pointer"
                    />
                  </th>
                  <th className="px-4">Nome do Ficheiro / Pasta</th>
                  <th className="px-4 w-28">Tamanho</th>
                  <th className="px-4 w-36">Data de Envio</th>
                  <th className="px-4 w-44">Formato / Tipo</th>
                  <th className="px-4 w-24 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F0F0ED] text-xs">
                
                {/* 1. SE ESTIVER DENTRO DE UMA PASTA, MOSTRAR LINHA DE SUBIR NÍVEL (..) */}
                {currentPath !== '/' && !searchTerm && (
                  <tr 
                    onDoubleClick={handleUpLevel}
                    onClick={handleUpLevel}
                    className="hover:bg-[#FFF8F2] transition-colors cursor-pointer group select-none"
                    title="Duplo clique para subir ao diretório anterior"
                  >
                    <td className="px-3 text-center"></td>
                    <td className="px-4 py-2.5 flex items-center gap-2.5">
                      <Folder size={17} className="text-amber-500 shrink-0" />
                      <span className="font-mono font-bold text-[#101010] group-hover:text-[#FF8000]">.. (Diretório Anterior)</span>
                    </td>
                    <td className="px-4 text-neutral-400 font-mono text-[11px]">—</td>
                    <td className="px-4 text-neutral-400 text-[11px]">—</td>
                    <td className="px-4 text-neutral-400 text-[11px]">Pasta de Ficheiros</td>
                    <td className="px-4 text-right"></td>
                  </tr>
                )}

                {/* 2. SE ESTIVER NA RAIZ E NÃO HOUVER BUSCA, LISTAR AS PASTAS PRINCIPAIS */}
                {currentPath === '/' && !searchTerm && (
                  SYSTEM_FOLDERS.map((folder) => {
                    const count = folderCounts[folder.id] || 0;
                    return (
                      <tr
                        key={folder.id}
                        onDoubleClick={() => navigateTo(folder.path)}
                        className="hover:bg-[#FFF8F2] transition-colors cursor-pointer group"
                        title="Duplo clique para abrir a pasta"
                      >
                        <td className="px-3 text-center">
                          <Folder size={16} className="text-amber-500 mx-auto" />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => navigateTo(folder.path)}
                            className="text-left group-hover:text-[#FF8000] transition"
                          >
                            <span className="font-bold text-sm text-[#101010] font-mono group-hover:text-[#FF8000]">
                              {folder.name}
                            </span>
                            <p className="text-[11px] text-[#737370] mt-0.5">
                              {folder.description}
                            </p>
                          </button>
                        </td>
                        <td className="px-4 font-mono text-[11px] text-neutral-500">
                          {count} {count === 1 ? 'ficheiro' : 'ficheiros'}
                        </td>
                        <td className="px-4 text-neutral-400 text-[11px]">
                          Automático
                        </td>
                        <td className="px-4 text-neutral-600 text-[11px]">
                          Pasta do Sistema
                        </td>
                        <td className="px-4 text-right">
                          <button
                            type="button"
                            onClick={() => navigateTo(folder.path)}
                            className="btn-secondary btn-sm text-[11px] py-1 px-2.5"
                          >
                            Abrir
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* 3. LISTA DE FICHEIROS DENTRO DA PASTA ATUAL OU RESULTADO DA PESQUISA */}
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 text-[#FF8000] animate-spin" />
                        <span className="text-xs">A sincronizar ficheiros com o Neon S3...</span>
                      </div>
                    </td>
                  </tr>
                ) : currentFolderDocuments.length === 0 && (currentPath !== '/' || searchTerm) ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FolderArchive className="w-9 h-9 text-neutral-300" />
                        <p className="text-sm font-bold text-neutral-700 font-heading">Esta pasta está vazia</p>
                        <p className="text-xs text-neutral-400 max-w-sm">
                          {searchTerm 
                            ? 'Nenhum ficheiro encontrado com os termos pesquisados.' 
                            : 'Clique em "Novo Arquivo" acima para fazer upload para este diretório.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentFolderDocuments.map((doc) => {
                    const isSelected = selectedDocIds.includes(doc.id);

                    return (
                      <tr 
                        key={doc.id}
                        className={`hover:bg-[#FAFAF9] transition-colors group ${isSelected ? 'bg-[#FFF2E5]/50' : ''}`}
                      >
                        {/* Checkbox */}
                        <td className="px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectDoc(doc.id)}
                            className="rounded border-[#E2E2DE] text-[#FF8000] focus:ring-[#FF8000] accent-[#FF8000] cursor-pointer"
                          />
                        </td>

                        {/* Nome do Ficheiro */}
                        <td className="px-4 py-2.5 min-w-[260px]">
                          <div className="flex items-center space-x-3">
                            {getFileIcon(doc.file_name, doc.mime_type)}
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-[#101010] font-heading truncate max-w-md group-hover:text-[#FF8000] transition">
                                {doc.title}
                              </div>
                              <div className="text-[11px] text-neutral-400 font-mono truncate">
                                {doc.file_name}
                              </div>
                              {doc.description && (
                                <p className="text-[11px] text-neutral-400 italic truncate max-w-md">
                                  {doc.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Tamanho */}
                        <td className="px-4 font-mono text-[11px] text-neutral-700 whitespace-nowrap">
                          {formatFileSize(doc.file_size_bytes)}
                        </td>

                        {/* Data */}
                        <td className="px-4 text-neutral-500 text-[11px] whitespace-nowrap">
                          {doc.created_at ? new Date(doc.created_at).toLocaleDateString('pt-MZ', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '—'}
                        </td>

                        {/* Formato */}
                        <td className="px-4 text-neutral-600 text-[11px] whitespace-nowrap">
                          {getFormatName(doc.file_name, doc.mime_type)}
                        </td>

                        {/* Ações */}
                        <td className="px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleDownload(doc)}
                              className="btn-secondary btn-icon-sm"
                              title="Descarregar ficheiro"
                            >
                              <Download className="w-3.5 h-3.5 text-neutral-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(doc)}
                              disabled={deletingId === doc.id}
                              className="btn-ghost btn-icon-sm text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              title="Eliminar ficheiro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}

              </tbody>
            </table>
          </div>

          {/* Barra de Status no Rodapé */}
          <div className="px-4 py-2.5 bg-[#FAFAF9] border-t border-[#EDEDEA] flex flex-wrap items-center justify-between text-xs text-[#737370]">
            <div className="flex items-center gap-3">
              <span>
                <strong>{currentFolderDocuments.length}</strong> ficheiros na pasta atual
              </span>
              {selectedDocIds.length > 0 && (
                <span className="font-semibold text-[#FF8000]">
                  ({selectedDocIds.length} selecionados)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Armazenamento Sincronizado: <strong>{kpis.total_storage_formatted}</strong></span>
            </div>
          </div>

        </div>
      </div>

      {/* =========================================================================
          3. MODAL: NOVO ARQUIVO / UPLOAD
         ========================================================================= */}
      {isUploadModalOpen && (
        <div className="modal-overlay-erp animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#FF8000] flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight font-heading">Carregar Novo Arquivo</h3>
                  <p className="text-xs text-slate-500">Armazenamento direto no Storage Neon S3</p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              {/* File Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Arquivo Físico <span className="text-rose-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-xl p-5 text-center cursor-pointer transition-colors bg-slate-50">
                  <input
                    ref={fileInputRef}
                    type="file"
                    required
                    onChange={handleFileChange}
                    className="hidden"
                    id="ged-file-upload"
                  />
                  <label htmlFor="ged-file-upload" className="cursor-pointer block">
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-2 text-emerald-700">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span className="text-xs font-semibold truncate max-w-xs">{selectedFile.name}</span>
                        <span className="text-xs text-slate-500 font-mono">({formatFileSize(selectedFile.size)})</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-xs font-semibold text-slate-700">
                          Clique para selecionar ou arraste um arquivo
                        </p>
                        <p className="text-[11px] text-slate-500">
                          PDF, DWG, DOCX, XLSX, PNG, JPG, ZIP até 50MB
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Title & Version */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Título do Documento <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Contrato de Fornecimento Solar"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Versão
                  </label>
                  <input
                    type="text"
                    placeholder="v1.0"
                    value={formData.version}
                    onChange={e => setFormData({ ...formData, version: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categoria Homologada <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Project & Client Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vincular a Projeto (Opcional)
                  </label>
                  <select
                    value={formData.project_id}
                    onChange={e => setFormData({ ...formData, project_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Nenhum Projeto</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.code ? `[${p.code}] ` : ''}{p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vincular a Cliente (Opcional)
                  </label>
                  <select
                    value={formData.client_id}
                    onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Nenhum Cliente</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* S3 Target Folder Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700">
                  <HardDrive className="w-4 h-4 text-[#FF8000]" />
                  <span className="font-semibold">Destino no Storage Neon:</span>
                </div>
                <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {selectedFile 
                    ? `ged/${(() => {
                        const name = selectedFile.name.toLowerCase();
                        const ext = name.split('.').pop() || '';
                        const cat = formData.category.toLowerCase();
                        if (name.includes('logo') || cat.includes('logo')) return 'logos';
                        if (ext === 'pdf') return 'pdf';
                        if (ext === 'png') return 'png';
                        if (['jpg', 'jpeg', 'webp'].includes(ext)) return 'jpg';
                        if (['xlsx', 'xls', 'csv'].includes(ext)) return 'planilhas';
                        if (['dwg', 'dxf'].includes(ext)) return 'projetos_cad';
                        if (cat.includes('contrato')) return 'contratos';
                        return 'geral';
                      })()}/`
                    : 'ged/automatico/'}
                </span>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isSubmitting}
                  className="btn-secondary btn-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary btn-md disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enviando para S3...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Arquivar Ficheiro</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. MODAL: REPOSITÓRIOS EM NUVEM (Google Drive & OneDrive)
         ========================================================================= */}
      {isCloudIntegrationsOpen && (
        <div className="modal-overlay-erp animate-in fade-in duration-200">
          <div className="bg-white border border-[#E2E2DE] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[#EDEDEA] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF2E5] text-[#FF8000] border border-[#FFD9B3] flex items-center justify-center">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#101010] font-heading">
                    Repositórios em Nuvem
                  </h3>
                  <p className="text-xs text-[#737370]">
                    Aceda e importe documentos das suas contas diretamente para o sistema
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCloudIntegrationsOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-neutral-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: 2 Clean Cards */}
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Card 1: Google Drive */}
                <div className="border border-[#E2E2DE] rounded-2xl p-5 bg-[#FAFAF9] hover:bg-white hover:border-[#4285F4]/40 hover:shadow-md transition-all flex flex-col justify-between group">
                  <div>
                    {/* Header with Official Icon & Connection Status */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-xl bg-white border border-[#E2E2DE] shadow-2xs flex items-center justify-center p-2 flex-shrink-0 group-hover:scale-105 transition-transform">
                          <svg className="w-7 h-7" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                            <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                            <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                            <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                            <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                            <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                            <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#101010] font-heading">Google Drive</h4>
                          <p className="text-[11px] text-[#737370]">Workspace & Gmail</p>
                        </div>
                      </div>
                      {getStoredGoogleToken() && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ● Conectado
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#525250] leading-relaxed mb-5">
                      Aceda a projetos, plantas e orçamentos guardados na sua conta Google.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCloudIntegrationsOpen(false);
                      setIsGoogleDriveExplorerOpen(true);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl text-xs font-bold font-heading flex items-center justify-center gap-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white shadow-sm transition cursor-pointer"
                  >
                    <span>{getStoredGoogleToken() ? 'Abrir Google Drive' : 'Aceder ao Google Drive'}</span>
                    <ExternalLink size={13} />
                  </button>
                </div>

                {/* Card 2: Microsoft OneDrive */}
                <div className="border border-[#E2E2DE] rounded-2xl p-5 bg-[#FAFAF9] hover:bg-white hover:border-[#0078D4]/40 hover:shadow-md transition-all flex flex-col justify-between group">
                  <div>
                    {/* Header with Official Icon */}
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-11 h-11 rounded-xl bg-white border border-[#E2E2DE] shadow-2xs flex items-center justify-center p-2 flex-shrink-0 group-hover:scale-105 transition-transform">
                        <svg className="w-7 h-7" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id="od_blue_grad" x1="5" y1="25" x2="27" y2="10" gradientUnits="userSpaceOnUse">
                              <stop stopColor="#0078D4"/>
                              <stop offset="1" stopColor="#28A8EA"/>
                            </linearGradient>
                          </defs>
                          <path d="M19.4 12.5a6.5 6.5 0 0 0-11.8 2.3A5.7 5.7 0 0 0 3.5 20.3C3.5 23.5 6.1 26 9.3 26h14.9a5.8 5.8 0 0 0 5.8-5.8c0-2.8-2-5.2-4.7-5.7a6.5 6.5 0 0 0-5.9-2z" fill="url(#od_blue_grad)"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#101010] font-heading">OneDrive</h4>
                        <p className="text-[11px] text-[#737370]">Microsoft 365 & SharePoint</p>
                      </div>
                    </div>

                    <p className="text-xs text-[#525250] leading-relaxed mb-5">
                      Aceda a pastas partilhadas, relatórios e medições da sua conta Microsoft.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      window.open('https://onedrive.live.com', '_blank', 'noopener,noreferrer');
                    }}
                    className="w-full py-2.5 px-3 rounded-xl text-xs font-bold font-heading flex items-center justify-center gap-2 bg-[#0078D4] hover:bg-[#005A9E] text-white shadow-sm transition cursor-pointer"
                  >
                    <span>Aceder ao OneDrive</span>
                    <ExternalLink size={13} />
                  </button>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#FAFAF9] border-t border-[#EDEDEA] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsCloudIntegrationsOpen(false)}
                className="btn-secondary btn-md"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          5. MODAL: GOOGLE DRIVE EXPLORER
         ========================================================================= */}
      <GoogleDriveExplorerModal
        isOpen={isGoogleDriveExplorerOpen}
        onClose={() => setIsGoogleDriveExplorerOpen(false)}
        onSuccess={(fileName) => {
          setIsGoogleDriveExplorerOpen(false);
          loadAllData();
          showToast('success', 'Documento Importado do Google Drive', `"${fileName}" foi sincronizado com sucesso para o Repositório e Storage Neon.`);
        }}
      />

      {/* =========================================================================
          6. MODAL: CONFIRMAÇÃO DE EXCLUSÃO
         ========================================================================= */}
      <ConfirmationModal
        isOpen={!!docToDelete}
        onClose={() => setDocToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Ficheiro do GED?"
        description={
          docToDelete ? (
            <span>
              Tem a certeza que deseja excluir permanentemente o ficheiro <strong className="text-[#101010]">"{docToDelete.title}"</strong> ({docToDelete.file_name}) do Storage Neon? Esta ação não pode ser desfeita.
            </span>
          ) : ''
        }
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deletingId !== null}
      />
    </div>
  );
};
