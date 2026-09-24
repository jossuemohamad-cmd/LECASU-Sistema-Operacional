import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FolderArchive, 
  Layers, 
  HardDrive, 
  UploadCloud, 
  Search, 
  Filter, 
  Plus, 
  RefreshCw, 
  Download, 
  Trash2, 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  FileCode, 
  FileArchive, 
  File, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Briefcase,
  Building2,
  Calendar,
  Loader2,
  Folder,
  FolderOpen,
  Cloud,
  ExternalLink,
  ShieldCheck,
  Check
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

const CATEGORIES = [
  'Contratos',
  'Projetos Técnicos',
  'Faturas & Recibos',
  'RH & Pessoal',
  'Certificações & Licenças',
  'Logotipos & Marcas',
  'Geral'
];

const FOLDERS = [
  { id: 'all', label: 'Todas as Pastas', icon: Folder, color: 'text-neutral-600', path: '/' },
  { id: 'pdf', label: 'PDFs & Documentos', icon: FileText, color: 'text-rose-500', path: '/pdf' },
  { id: 'png', label: 'Imagens PNG', icon: FileImage, color: 'text-blue-500', path: '/png' },
  { id: 'jpg', label: 'Fotos & JPG', icon: FileImage, color: 'text-indigo-500', path: '/jpg' },
  { id: 'logos', label: 'Logos & Marcas', icon: Layers, color: 'text-amber-500', path: '/logos' },
  { id: 'planilhas', label: 'Planilhas Excel/CSV', icon: FileSpreadsheet, color: 'text-emerald-500', path: '/planilhas' },
  { id: 'projetos', label: 'Projetos CAD/Técnicos', icon: Briefcase, color: 'text-purple-500', path: '/projetos_cad' },
  { id: 'contratos', label: 'Contratos & Jurídico', icon: ShieldCheck, color: 'text-cyan-500', path: '/contratos' },
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
  const [error, setError] = useState<string | null>(null);

  // Filters & Folder selection
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCloudIntegrationsOpen, setIsCloudIntegrationsOpen] = useState(false);
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
    setError(null);
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
        showToast('success', 'GED Atualizado', 'Repositório sincronizado com o banco de dados.');
      }
    } catch (err: any) {
      console.error('Erro ao carregar repositório GED:', err);
      setError(err.message || 'Erro ao carregar dados do GED.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

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
      showToast('success', 'Documento Arquivado!', `"${formData.title}" foi enviado com sucesso.`);
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
      showToast('success', 'Documento Excluído', `"${doc.title}" foi removido do repositório.`);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      const updatedKpis = await fetchGEDOverviewKPIs();
      setKpis(updatedKpis);
      setDocToDelete(null);
    } catch (err: any) {
      console.error('Erro ao excluir documento:', err);
      showToast('error', 'Falha ao Excluir', err.message || 'Não foi possível excluir o documento.');
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
      return (
        <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5" />
        </div>
      );
    }
    if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext) || mimeType?.includes('image')) {
      return (
        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center flex-shrink-0">
          <FileImage className="w-5 h-5" />
        </div>
      );
    }
    if (['xlsx', 'xls', 'csv'].includes(ext) || mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) {
      return (
        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center flex-shrink-0">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
      );
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mimeType?.includes('zip')) {
      return (
        <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center flex-shrink-0">
          <FileArchive className="w-5 h-5" />
        </div>
      );
    }
    if (['js', 'ts', 'py', 'json', 'html', 'css', 'sql'].includes(ext)) {
      return (
        <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center flex-shrink-0">
          <FileCode className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center flex-shrink-0">
        <File className="w-5 h-5" />
      </div>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'Contratos':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">Contratos</span>;
      case 'Projetos Técnicos':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Projetos Técnicos</span>;
      case 'Faturas & Recibos':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Faturas & Recibos</span>;
      case 'RH & Pessoal':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">RH & Pessoal</span>;
      case 'Certificações & Licenças':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">Certificações</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">{category || 'Geral'}</span>;
    }
  };

  // Helper to determine document folder
  const getDocumentFolder = (doc: GEDDocument): string => {
    const ext = doc.file_name.split('.').pop()?.toLowerCase() || '';
    const titleLower = doc.title.toLowerCase();
    const catLower = (doc.category || '').toLowerCase();
    
    if (titleLower.includes('logo') || catLower.includes('logo') || (doc.file_path && doc.file_path.includes('/logos/'))) {
      return 'logos';
    }
    if (ext === 'pdf' || (doc.file_path && doc.file_path.includes('/pdf/'))) {
      return 'pdf';
    }
    if (ext === 'png' || (doc.file_path && doc.file_path.includes('/png/'))) {
      return 'png';
    }
    if (['jpg', 'jpeg', 'webp'].includes(ext) || (doc.file_path && doc.file_path.includes('/jpg/'))) {
      return 'jpg';
    }
    if (['xlsx', 'xls', 'csv'].includes(ext) || (doc.file_path && doc.file_path.includes('/planilhas/'))) {
      return 'planilhas';
    }
    if (['dwg', 'dxf'].includes(ext) || catLower.includes('projet') || (doc.file_path && doc.file_path.includes('/projetos_cad/'))) {
      return 'projetos';
    }
    if (catLower.includes('contrat') || (doc.file_path && doc.file_path.includes('/contratos/'))) {
      return 'contratos';
    }
    return 'all';
  };

  // Folder counts map
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { all: documents.length };
    FOLDERS.forEach(f => {
      if (f.id !== 'all') {
        counts[f.id] = documents.filter(doc => getDocumentFolder(doc) === f.id).length;
      }
    });
    return counts;
  }, [documents]);

  // Filtered documents list
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // 1. Folder filter
      if (selectedFolder !== 'all') {
        if (getDocumentFolder(doc) !== selectedFolder) {
          return false;
        }
      }

      // 2. Search filter
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query || 
        doc.title.toLowerCase().includes(query) ||
        doc.file_name.toLowerCase().includes(query) ||
        (doc.description && doc.description.toLowerCase().includes(query)) ||
        (doc.project_name && doc.project_name.toLowerCase().includes(query)) ||
        (doc.client_name && doc.client_name.toLowerCase().includes(query));
      
      // 3. Category filter
      const matchesCategory = !categoryFilter || doc.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [documents, selectedFolder, searchTerm, categoryFilter]);


  return (
    <div className="space-y-6">
      <Toast 
        toasts={toasts} 
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} 
      />

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E2E2DE] gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#FFF2E5] text-[#FF8000] border border-[#FFD9B3]">
            <FolderArchive size={13} className="text-[#FF8000]" />
            <span>{kpis.total_documents} Documentos no Repositório</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check size={13} className="text-emerald-600" />
            <span>Neon S3 Storage Sincronizado</span>
          </span>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsCloudIntegrationsOpen(true)}
            className="btn-secondary btn-md flex items-center gap-1.5"
            title="Conectar Google Drive ou OneDrive"
          >
            <Cloud className="w-4 h-4 text-[#FF8000]" />
            <span>Conectar Cloud (Drive/OneDrive)</span>
          </button>

          <button
            onClick={() => loadAllData(true)}
            disabled={isLoading}
            className="btn-secondary btn-icon-md"
            title="Atualizar Repositório"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#FF8000]' : 'text-neutral-600'}`} />
          </button>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="btn-primary btn-md"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Documento</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Documentos no Repositório */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
              Documentos no Repositório
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1 font-heading">
              {kpis.total_documents}
            </h3>
            <p className="mt-1 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Arquivos homologados
            </p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
            <FolderArchive className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Categorias Homologadas */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
              Categorias Homologadas
            </p>
            <h3 className="text-2xl font-bold text-blue-700 mt-1 font-heading">
              {kpis.active_categories_count}
            </h3>
            <p className="mt-1 text-[11px] text-slate-400">
              Estruturação ativa
            </p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Armazenamento Total */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
              Armazenamento S3
            </p>
            <h3 className="text-2xl font-bold text-emerald-700 mt-1 font-heading">
              {kpis.total_storage_formatted}
            </h3>
            <p className="mt-1 text-[11px] text-slate-400">
              Storage Neon Cloud
            </p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <HardDrive className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Uploads no Mês Atual */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
              Uploads no Mês
            </p>
            <h3 className="text-2xl font-bold text-amber-700 mt-1 font-heading">
              {kpis.monthly_uploads_count}
            </h3>
            <p className="mt-1 text-[11px] text-slate-400">
              Novas adições recentes
            </p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <UploadCloud className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Navegador Visual de Pastas Organizadas (Pastas Inteligentes) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#FF8000]" />
            <h4 className="text-xs font-bold text-slate-900 font-heading uppercase tracking-wider">
              Estrutura de Pastas no Storage Neon
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">
            Pastas automáticas organizadas por tipo de arquivo
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {FOLDERS.map((folder) => {
            const Icon = folder.icon;
            const count = folderCounts[folder.id] || 0;
            const isSelected = selectedFolder === folder.id;

            return (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-[#FFF2E5] border-[#FF8000] text-[#101010] shadow-2xs ring-1 ring-[#FF8000]' 
                    : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <Icon className={`w-4 h-4 ${folder.color}`} />
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                    isSelected ? 'bg-[#FF8000] text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {count}
                  </span>
                </div>
                <span className="text-xs font-semibold truncate w-full font-heading">
                  {folder.label}
                </span>
                <span className="text-[10px] text-slate-400 font-mono truncate w-full">
                  {folder.path}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por título, arquivo, projeto ou cliente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full md:w-48 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white transition"
            >
              <option value="">Todas as Categorias</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {(searchTerm || categoryFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('');
              }}
              className="btn-ghost btn-sm text-slate-500"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start space-x-3 text-xs">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1">
            <span className="font-semibold block text-red-900">Erro de Carregamento</span>
            <span>{error}</span>
          </div>
          <button 
            onClick={() => loadAllData(true)} 
            className="underline font-semibold hover:text-red-900 ml-2"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Technical Documents Table */}
      <div className="table-container-erp">
        <div className="table-scroll-container">
          <table className="table-erp">
            <thead>
              <tr className="table-header-erp">
                <th className="px-4 text-center w-12">Tipo</th>
                <th className="px-4">Título & Arquivo</th>
                <th className="px-4">Versão</th>
                <th className="px-4">Categoria</th>
                <th className="px-4">Vínculo</th>
                <th className="px-4">Tamanho</th>
                <th className="px-4">Data Envio</th>
                <th className="px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 text-orange-600 animate-spin" />
                      <span>Carregando repositório de documentos...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FolderArchive className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-700 font-heading">Nenhum documento encontrado</p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {searchTerm || categoryFilter 
                          ? 'Tente ajustar os critérios de pesquisa ou limpar os filtros.' 
                          : 'Clique no botão acima para realizar o upload do primeiro documento oficial.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map(doc => (
                  <tr 
                    key={doc.id}
                    className="table-row-erp hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Icon Column */}
                    <td className="px-4 text-center cell-nowrap">
                      {getFileIcon(doc.file_name, doc.mime_type)}
                    </td>

                    {/* Title & File Name */}
                    <td className="px-4 min-w-[240px]">
                      <div className="font-semibold text-slate-900 font-heading">
                        {doc.title}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {doc.file_name}
                      </div>
                      {doc.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5 italic">
                          {doc.description}
                        </p>
                      )}
                    </td>

                    {/* Version */}
                    <td className="px-4 cell-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px] font-semibold">
                        {doc.version || 'v1.0'}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="px-4 cell-nowrap">
                      {getCategoryBadge(doc.category)}
                    </td>

                    {/* Link (Project or Client) */}
                    <td className="px-4 min-w-[160px] cell-nowrap">
                      {doc.project_name ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <Briefcase className="w-3 h-3" />
                          <span>{doc.project_name}</span>
                        </span>
                      ) : doc.client_name ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Building2 className="w-3 h-3" />
                          <span>{doc.client_name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">
                          Geral
                        </span>
                      )}
                    </td>

                    {/* File Size */}
                    <td className="px-4 text-slate-600 text-xs font-mono cell-nowrap">
                      {formatFileSize(doc.file_size_bytes)}
                    </td>

                    {/* Created Date */}
                    <td className="px-4 text-slate-500 text-xs cell-nowrap">
                      {doc.created_at ? (
                        <span className="flex items-center">
                          <Calendar size={12} className="mr-1 text-slate-400" />
                          {new Date(doc.created_at).toLocaleDateString('pt-MZ')}
                        </span>
                      ) : '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-4 td-actions cell-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleDownload(doc)}
                          className="btn-secondary btn-icon-sm"
                          title="Descarregar Arquivo"
                        >
                          <Download className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={deletingId === doc.id}
                          className="btn-ghost btn-icon-sm text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Excluir Documento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: + Novo Documento / Upload */}
      {isUploadModalOpen && (
        <div className="modal-overlay-erp animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg overflow-hidden shadow-xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded bg-orange-100 text-orange-600 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 leading-tight">Upload de Documento</h3>
                  <p className="text-xs text-slate-500">Arquivamento eletrónico com controle de versões</p>
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
                <div className="border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-lg p-5 text-center cursor-pointer transition-colors bg-slate-50">
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
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
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
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
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
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Project Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vincular a Projeto (Opcional)
                  </label>
                  <select
                    value={formData.project_id}
                    onChange={e => setFormData({ ...formData, project_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
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
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Nenhum Cliente</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição / Observações Técnicas
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais sobre o documento ou revisão..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 resize-none"
                />
              </div>

              {/* S3 Target Folder Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex items-center justify-between">
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
                      <span>Arquivar Documento</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Repositórios em Nuvem (Google Drive & OneDrive) - Simples & Elegante */}
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
                    {/* Header with Official Icon */}
                    <div className="flex items-center space-x-3 mb-3">
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

                    <p className="text-xs text-[#525250] leading-relaxed mb-5">
                      Aceda a projetos, plantas e orçamentos guardados na sua conta Google.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      window.open('https://drive.google.com', '_blank', 'noopener,noreferrer');
                    }}
                    className="w-full py-2.5 px-3 rounded-xl text-xs font-bold font-heading flex items-center justify-center gap-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white shadow-sm transition cursor-pointer"
                  >
                    <span>Aceder ao Google Drive</span>
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

      {/* Confirmation Modal for Document Deletion */}
      <ConfirmationModal
        isOpen={!!docToDelete}
        onClose={() => setDocToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Documento do GED?"
        description={
          docToDelete ? (
            <span>
              Tem a certeza que deseja excluir permanentemente o documento <strong className="text-[#101010]">"{docToDelete.title}"</strong> ({docToDelete.file_name})? Esta ação não pode ser desfeita.
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
