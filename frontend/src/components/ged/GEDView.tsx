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
  Loader2
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

  // Filtered documents list
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query || 
        doc.title.toLowerCase().includes(query) ||
        doc.file_name.toLowerCase().includes(query) ||
        (doc.description && doc.description.toLowerCase().includes(query)) ||
        (doc.project_name && doc.project_name.toLowerCase().includes(query)) ||
        (doc.client_name && doc.client_name.toLowerCase().includes(query));
      
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
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight font-heading">
              Repositório GED
            </h1>
            <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-[11px] font-semibold rounded">
              Módulo 09
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão Eletrónica de Documentos, Contratos, Projetos Técnicos e Certificações Oficiais
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => loadAllData(true)}
            disabled={isLoading}
            className="btn-secondary btn-md"
            title="Atualizar Repositório"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#FF8000]' : 'text-neutral-600'}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="btn-primary btn-md"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Documento / Upload</span>
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
              Armazenamento Total
            </p>
            <h3 className="text-2xl font-bold text-emerald-700 mt-1 font-heading">
              {kpis.total_storage_formatted}
            </h3>
            <p className="mt-1 text-[11px] text-slate-400">
              Volume físico no servidor
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
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
