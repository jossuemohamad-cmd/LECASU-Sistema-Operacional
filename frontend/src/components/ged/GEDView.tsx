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
  UserCheck
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

const CATEGORIES = [
  'Contratos',
  'Projetos Técnicos',
  'Faturas & Recibos',
  'RH & Pessoal',
  'Certificações & Licenças',
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
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
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

  const showToast = (type: 'success' | 'error' | 'info', title: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, title }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const loadAllData = async () => {
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
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!formData.title) {
        // Pre-fill title based on original filename without extension
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setFormData(prev => ({ ...prev, title: cleanTitle }));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('error', 'Selecione um arquivo para envio.');
      return;
    }
    if (!formData.title.trim()) {
      showToast('error', 'Informe o título do documento.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('file', selectedFile);
      data.append('title', formData.title.trim());
      data.append('category', formData.category);
      data.append('version', formData.version || 'v1.0');
      if (formData.description.trim()) {
        data.append('description', formData.description.trim());
      }
      if (formData.project_id) {
        data.append('project_id', formData.project_id);
      }
      if (formData.client_id) {
        data.append('client_id', formData.client_id);
      }

      await uploadDocument(data);
      showToast('success', 'Documento arquivado com sucesso no Repositório GED!');
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
      showToast('error', err.message || 'Falha ao enviar documento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (doc: GEDDocument) => {
    if (!window.confirm(`Tem a certeza que deseja eliminar permanentemente o documento "${doc.title}"?`)) {
      return;
    }

    setDeletingId(doc.id);
    try {
      await deleteDocument(doc.id);
      showToast('success', `Documento "${doc.title}" excluído do repositório.`);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      // Refresh KPIs
      const updatedKpis = await fetchGEDOverviewKPIs();
      setKpis(updatedKpis);
    } catch (err: any) {
      console.error('Erro ao excluir documento:', err);
      showToast('error', err.message || 'Falha ao excluir documento.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (doc: GEDDocument) => {
    try {
      await downloadDocument(doc.id, doc.file_name);
    } catch (err: any) {
      console.error('Erro ao descarregar documento:', err);
      showToast('error', 'Erro ao baixar o arquivo.');
    }
  };

  // Helper for file type icons
  const getFileIcon = (fileName: string, mimeType?: string | null) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf' || mimeType?.includes('pdf')) {
      return (
        <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
          <FileText className="w-5 h-5" />
        </div>
      );
    }
    if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext) || mimeType?.includes('image')) {
      return (
        <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <FileImage className="w-5 h-5" />
        </div>
      );
    }
    if (['xlsx', 'xls', 'csv'].includes(ext) || mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) {
      return (
        <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
      );
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mimeType?.includes('zip')) {
      return (
        <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <FileArchive className="w-5 h-5" />
        </div>
      );
    }
    if (['js', 'ts', 'py', 'json', 'html', 'css', 'sql'].includes(ext)) {
      return (
        <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <FileCode className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="p-2.5 rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600/30">
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

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Contratos':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Projetos Técnicos':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Faturas & Recibos':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'RH & Pessoal':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Certificações & Licenças':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600/30';
    }
  };

  // Filtered documents list
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.project_name && doc.project_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.client_name && doc.client_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = !categoryFilter || doc.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [documents, searchTerm, categoryFilter]);

  return (
    <div className="space-y-6">
      <Toast 
        toasts={toasts} 
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} 
      />

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/10 text-orange-500 rounded-xl border border-orange-500/20 shadow-sm">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Repositório GED</h1>
              <p className="text-sm text-slate-400">
                Gestão Eletrónica de Documentos, Contratos, Projetos Técnicos e Certificações Oficiais
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAllData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Atualizar Repositório"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Documento / Upload</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Documentos no Repositório */}
        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/50 backdrop-blur-sm relative overflow-hidden group hover:border-slate-600/60 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Documentos no Repositório
            </span>
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <FolderArchive className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-100 tracking-tight">
              {kpis.total_documents}
            </h3>
            <p className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Arquivos homologados e indexados
            </p>
          </div>
        </div>

        {/* Card 2: Categorias Homologadas */}
        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/50 backdrop-blur-sm relative overflow-hidden group hover:border-slate-600/60 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Categorias Homologadas
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-100 tracking-tight">
              {kpis.active_categories_count}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Estruturação departamental ativa
            </p>
          </div>
        </div>

        {/* Card 3: Armazenamento Total */}
        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/50 backdrop-blur-sm relative overflow-hidden group hover:border-slate-600/60 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Armazenamento Total
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-100 tracking-tight">
              {kpis.total_storage_formatted}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Volume físico ocupado no servidor
            </p>
          </div>
        </div>

        {/* Card 4: Uploads no Mês Atual */}
        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/50 backdrop-blur-sm relative overflow-hidden group hover:border-slate-600/60 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Uploads no Mês Atual
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <UploadCloud className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-100 tracking-tight">
              {kpis.monthly_uploads_count}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Novas adições recentes
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por título, arquivo, projeto ou cliente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-700/60 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full md:w-48 px-3 py-2 bg-slate-900/60 border border-slate-700/60 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500 transition-colors"
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
              className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-700/30 hover:bg-slate-700/60 rounded-xl transition-colors whitespace-nowrap"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
          <button 
            onClick={loadAllData}
            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-xs font-semibold text-red-300 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Technical Documents Table */}
      <div className="bg-slate-850 rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700/60 bg-slate-900/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4">Título & Arquivo</th>
                <th className="py-3.5 px-4">Versão</th>
                <th className="py-3.5 px-4">Categoria</th>
                <th className="py-3.5 px-4">Vínculo</th>
                <th className="py-3.5 px-4">Tamanho</th>
                <th className="py-3.5 px-4">Data Envio</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-6 h-6 text-orange-500 animate-spin" />
                      <span>Carregando repositório de documentos...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <FolderArchive className="w-10 h-10 text-slate-600 stroke-[1.5]" />
                      <p className="text-base font-medium text-slate-300">Nenhum documento encontrado</p>
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
                    className="hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* Icon Column */}
                    <td className="py-3.5 px-4">
                      {getFileIcon(doc.file_name, doc.mime_type)}
                    </td>

                    {/* Title & File Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-100 flex items-center gap-2">
                        <span>{doc.title}</span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                        <span className="truncate max-w-xs" title={doc.file_name}>
                          {doc.file_name}
                        </span>
                      </div>
                      {doc.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic">
                          {doc.description}
                        </p>
                      )}
                    </td>

                    {/* Version */}
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs font-medium">
                        {doc.version || 'v1.0'}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryBadgeClass(doc.category)}`}>
                        {doc.category}
                      </span>
                    </td>

                    {/* Link (Project or Client) */}
                    <td className="py-3.5 px-4">
                      {doc.project_name ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium">
                          <Briefcase className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[140px]" title={doc.project_name}>
                            {doc.project_name}
                          </span>
                        </span>
                      ) : doc.client_name ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[140px]" title={doc.client_name}>
                            {doc.client_name}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs italic">
                          Geral / Sem vínculo
                        </span>
                      )}
                    </td>

                    {/* File Size */}
                    <td className="py-3.5 px-4 text-slate-300 text-xs font-mono">
                      {formatFileSize(doc.file_size_bytes)}
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-slate-400 text-xs">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString('pt-MZ', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      }) : '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                          title="Descarregar Arquivo"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={deletingId === doc.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg border border-orange-500/20">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Upload de Documento</h3>
                  <p className="text-xs text-slate-400">Arquivamento eletrónico com controle de versões</p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              {/* File Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Arquivo Físico <span className="text-orange-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-700 hover:border-orange-500/60 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-850">
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
                      <div className="flex items-center justify-center gap-2 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span className="text-sm font-medium truncate max-w-xs">{selectedFile.name}</span>
                        <span className="text-xs text-slate-400 font-mono">({formatFileSize(selectedFile.size)})</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-sm font-medium text-slate-200">
                          Clique para selecionar ou arraste um arquivo
                        </p>
                        <p className="text-xs text-slate-500">
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Título do Documento <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Contrato de Fornecimento Solar"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Versão
                  </label>
                  <input
                    type="text"
                    placeholder="v1.0"
                    value={formData.version}
                    onChange={e => setFormData({ ...formData, version: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Categoria Homologada <span className="text-orange-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-orange-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Project Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Vincular a Projeto (Opcional)
                  </label>
                  <select
                    value={formData.project_id}
                    onChange={e => setFormData({ ...formData, project_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-orange-500"
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Vincular a Cliente (Opcional)
                  </label>
                  <select
                    value={formData.client_id}
                    onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-orange-500"
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descrição / Observações Técnicas
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais sobre o documento ou revisão..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Enviando...</span>
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
    </div>
  );
};
