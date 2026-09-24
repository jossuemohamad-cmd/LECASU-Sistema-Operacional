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
  Loader2, 
  Folder, 
  FolderOpen, 
  FolderPlus,
  ShieldCheck, 
  ChevronRight, 
  ArrowUp, 
  ArrowLeft, 
  ArrowRight, 
  CheckSquare, 
  Square,
  LayoutGrid,
  List,
  Edit2,
  RotateCcw,
  Sparkles,
  Users,
  Compass,
  FileCheck2
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
  updateDocument,
  downloadDocument,
  fetchGEDOverviewKPIs, 
  fetchProjects, 
  fetchClients 
} from '../../services/api';
import { Toast } from '../common/Toast';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { GoogleDriveExplorerModal, getStoredGoogleToken } from './GoogleDriveExplorerModal';

export interface CustomFolder {
  id: string;
  name: string;
  path: string;
  category: string;
  iconType: string;
  color: string;
  description: string;
  createdAt: string;
}

const DEFAULT_SYSTEM_FOLDERS: CustomFolder[] = [
  { id: 'pdf', name: 'pdf', path: '/pdf', category: 'Documentos PDF', iconType: 'pdf', color: 'text-rose-500', description: 'Documentos, Relatórios e Especificações Técnicas', createdAt: '2026-01-01' },
  { id: 'planilhas', name: 'planilhas', path: '/planilhas', category: 'Folhas de Cálculo', iconType: 'excel', color: 'text-emerald-500', description: 'Folhas de Cálculo, Medições e Orçamentos Excel', createdAt: '2026-01-01' },
  { id: 'word', name: 'word', path: '/word', category: 'Documentos Word', iconType: 'word', color: 'text-blue-600', description: 'Minutas, Cartas e Textos Formatados', createdAt: '2026-01-01' },
  { id: 'png', name: 'png', path: '/png', category: 'Imagens PNG', iconType: 'image', color: 'text-sky-500', description: 'Imagens e Gráficos com Transparência', createdAt: '2026-01-01' },
  { id: 'jpg', name: 'jpg', path: '/jpg', category: 'Fotografias JPEG', iconType: 'image', color: 'text-indigo-500', description: 'Fotografias de Obras e Imagens de Campo', createdAt: '2026-01-01' },
  { id: 'logos', name: 'logos', path: '/logos', category: 'Logotipos & Marcas', iconType: 'brand', color: 'text-amber-500', description: 'Identidade Visual e Marcas da Empresa', createdAt: '2026-01-01' },
  { id: 'projetos_cad', name: 'projetos_cad', path: '/projetos_cad', category: 'Projetos CAD', iconType: 'cad', color: 'text-purple-500', description: 'Plantas de Engenharia, DWG e Modelos Técnicos', createdAt: '2026-01-01' },
  { id: 'contratos', name: 'contratos', path: '/contratos', category: 'Contratos & Jurídico', iconType: 'contract', color: 'text-cyan-600', description: 'Contratos, Acordos e Documentação Jurídica', createdAt: '2026-01-01' },
  { id: 'rh_pessoal', name: 'rh_pessoal', path: '/rh_pessoal', category: 'RH & Pessoal', iconType: 'rh', color: 'text-teal-500', description: 'Fichas de Colaboradores e Documentos RH', createdAt: '2026-01-01' },
  { id: 'geral', name: 'geral', path: '/geral', category: 'Geral', iconType: 'folder', color: 'text-neutral-500', description: 'Outros Ficheiros e Documentos Diversos', createdAt: '2026-01-01' },
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

  // Custom Folders State (Persisted in localStorage)
  const [folders, setFolders] = useState<CustomFolder[]>(() => {
    try {
      const saved = localStorage.getItem('lecasu_ged_folders');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SYSTEM_FOLDERS;
  });

  // Trashed Document IDs (Lixeira)
  const [trashedDocIds, setTrashedDocIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('lecasu_ged_trash_ids');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Trashed Folder IDs
  const [trashedFolderIds, setTrashedFolderIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lecasu_ged_trash_folder_ids');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('lecasu_ged_folders', JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem('lecasu_ged_trash_ids', JSON.stringify(trashedDocIds));
  }, [trashedDocIds]);

  useEffect(() => {
    localStorage.setItem('lecasu_ged_trash_folder_ids', JSON.stringify(trashedFolderIds));
  }, [trashedFolderIds]);

  // View Mode: 'list' (Table) or 'grid' (Cards)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // File Manager Navigation State
  const [currentPath, setCurrentPath] = useState<string>('/'); // '/' is root, '/pdf', '/trash', etc.
  const [history, setHistory] = useState<string[]>(['/']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isTreeExpanded, setIsTreeExpanded] = useState<boolean>(true);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isGoogleDriveModalOpen, setIsGoogleDriveModalOpen] = useState(false);
  const [isOneDriveModalOpen, setIsOneDriveModalOpen] = useState(false);
  const [isEmptyTrashModalOpen, setIsEmptyTrashModalOpen] = useState(false);

  // Target item for Rename / Delete
  const [renameTarget, setRenameTarget] = useState<{ type: 'file' | 'folder'; id: number | string; name: string; description?: string } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'file' | 'folder'; id: number | string; name: string } | null>(null);
  const [itemToPermanentDelete, setItemToPermanentDelete] = useState<{ type: 'file' | 'folder'; id: number | string; name: string } | null>(null);

  // Form Data for New Folder
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderCategory, setNewFolderCategory] = useState('Geral');
  const [newFolderIcon, setNewFolderIcon] = useState('folder');
  const [newFolderColor, setNewFolderColor] = useState('text-amber-500');

  // Form Data for Rename
  const [renameValue, setRenameValue] = useState('');
  const [renameDescValue, setRenameDescValue] = useState('');

  // Form Data for Upload
  const [formData, setFormData] = useState({
    title: '',
    category: 'Projetos Técnicos',
    version: 'v1.0',
    description: '',
    project_id: '',
    client_id: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast System
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

  // Helper to determine which folder a document belongs to
  const getDocumentFolderId = (doc: GEDDocument): string => {
    const ext = doc.file_name.split('.').pop()?.toLowerCase() || '';
    const cat = (doc.category || '').toLowerCase();

    // Check custom folders first
    const customMatch = folders.find(f => f.category.toLowerCase() === cat || f.name.toLowerCase() === cat);
    if (customMatch) return customMatch.id;

    if (ext === 'pdf' || doc.mime_type?.includes('pdf')) return 'pdf';
    if (['xlsx', 'xls', 'csv'].includes(ext) || doc.mime_type?.includes('spreadsheet')) return 'planilhas';
    if (['doc', 'docx'].includes(ext) || doc.mime_type?.includes('word')) return 'word';
    if (ext === 'png' || doc.mime_type?.includes('png')) return 'png';
    if (['jpg', 'jpeg'].includes(ext) || doc.mime_type?.includes('jpeg')) return 'jpg';
    if (['dwg', 'dxf'].includes(ext) || cat.includes('cad') || cat.includes('projeto')) return 'projetos_cad';
    if (cat.includes('contrato') || cat.includes('jurídico')) return 'contratos';
    if (cat.includes('rh') || cat.includes('pessoal')) return 'rh_pessoal';
    if (cat.includes('logo') || cat.includes('marca')) return 'logos';
    return 'geral';
  };

  // Active (non-trashed) documents and folders
  const activeDocuments = useMemo(() => {
    return documents.filter(d => !trashedDocIds.includes(d.id));
  }, [documents, trashedDocIds]);

  const activeFolders = useMemo(() => {
    return folders.filter(f => !trashedFolderIds.includes(f.id));
  }, [folders, trashedFolderIds]);

  const trashedDocuments = useMemo(() => {
    return documents.filter(d => trashedDocIds.includes(d.id));
  }, [documents, trashedDocIds]);

  const trashedFolders = useMemo(() => {
    return folders.filter(f => trashedFolderIds.includes(f.id));
  }, [folders, trashedFolderIds]);

  // Counts per folder
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    activeFolders.forEach(f => {
      counts[f.id] = 0;
    });
    activeDocuments.forEach(doc => {
      const folderId = getDocumentFolderId(doc);
      counts[folderId] = (counts[folderId] || 0) + 1;
    });
    return counts;
  }, [activeDocuments, activeFolders]);

  // Documents in current path
  const currentFolderDocuments = useMemo(() => {
    if (currentPath === '/trash') {
      return trashedDocuments;
    }

    let docs = activeDocuments;
    if (currentPath !== '/') {
      const folderId = currentPath.replace('/', '');
      docs = docs.filter(doc => getDocumentFolderId(doc) === folderId);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      docs = docs.filter(doc => 
        doc.title.toLowerCase().includes(term) ||
        doc.file_name.toLowerCase().includes(term) ||
        (doc.description && doc.description.toLowerCase().includes(term))
      );
    }

    return docs;
  }, [activeDocuments, trashedDocuments, currentPath, searchTerm]);

  // Navigation handlers
  const navigateTo = (path: string) => {
    if (path === currentPath) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(path);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentPath(path);
    setSelectedDocIds([]);
  };

  const handleGoBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentPath(history[historyIndex - 1]);
      setSelectedDocIds([]);
    }
  };

  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentPath(history[historyIndex + 1]);
      setSelectedDocIds([]);
    }
  };

  const handleUpLevel = () => {
    if (currentPath !== '/') {
      navigateTo('/');
    }
  };

  // Selection
  const handleSelectAll = () => {
    setSelectedDocIds(currentFolderDocuments.map(d => d.id));
    if (currentPath === '/') {
      setSelectedFolderIds(activeFolders.map(f => f.id));
    } else if (currentPath === '/trash') {
      setSelectedFolderIds(trashedFolders.map(f => f.id));
    }
  };

  const handleDeselectAll = () => {
    setSelectedDocIds([]);
    setSelectedFolderIds([]);
  };

  const toggleSelectDoc = (id: number) => {
    setSelectedDocIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectFolder = (id: string) => {
    setSelectedFolderIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
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
      showToast('error', 'Arquivo obrigatório', 'Por favor selecione um arquivo.');
      return;
    }
    if (!formData.title.trim()) {
      showToast('error', 'Título obrigatório', 'Por favor forneça um título.');
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
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadAllData();
    } catch (err: any) {
      console.error('Erro no upload de documento:', err);
      showToast('error', 'Falha no Upload', err.message || 'Falha ao enviar documento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Folder
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFolderName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (!cleanName) {
      showToast('error', 'Nome Inválido', 'Insira um nome válido para a pasta.');
      return;
    }

    if (folders.some(f => f.name.toLowerCase() === cleanName && !trashedFolderIds.includes(f.id))) {
      showToast('error', 'Pasta Existente', 'Já existe uma pasta com este nome.');
      return;
    }

    const newFolder: CustomFolder = {
      id: cleanName,
      name: cleanName,
      path: `/${cleanName}`,
      category: newFolderCategory,
      iconType: newFolderIcon,
      color: newFolderColor,
      description: `Pasta personalizada criada para ${newFolderCategory}`,
      createdAt: new Date().toISOString()
    };

    setFolders(prev => [...prev, newFolder]);
    setIsNewFolderModalOpen(false);
    setNewFolderName('');
    showToast('success', 'Pasta Criada', `Pasta "/${cleanName}" pronta para receber ficheiros.`);
  };

  // Move to Trash (Soft Delete)
  const handleMoveToTrash = (item: { type: 'file' | 'folder'; id: number | string; name: string }) => {
    setItemToDelete(item);
  };

  const handleConfirmMoveToTrash = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'file') {
      const docId = itemToDelete.id as number;
      setTrashedDocIds(prev => [...prev, docId]);
      setSelectedDocIds(prev => prev.filter(id => id !== docId));
      showToast('info', 'Ficheiro movido para a Lixeira', `"${itemToDelete.name}" foi movido. Pode restaurá-lo a qualquer momento.`);
    } else {
      const folderId = itemToDelete.id as string;
      setTrashedFolderIds(prev => [...prev, folderId]);
      showToast('info', 'Pasta movida para a Lixeira', `A pasta "${itemToDelete.name}" foi movida para a lixeira.`);
      if (currentPath === `/${folderId}`) {
        navigateTo('/');
      }
    }
    setItemToDelete(null);
  };

  // Restore from Trash
  const handleRestoreItem = (item: { type: 'file' | 'folder'; id: number | string; name: string }) => {
    if (item.type === 'file') {
      const docId = item.id as number;
      setTrashedDocIds(prev => prev.filter(id => id !== docId));
      showToast('success', 'Ficheiro Restaurado', `"${item.name}" foi recuperado com sucesso.`);
    } else {
      const folderId = item.id as string;
      setTrashedFolderIds(prev => prev.filter(id => id !== folderId));
      showToast('success', 'Pasta Restaurada', `A pasta "${item.name}" foi recuperada.`);
    }
  };

  // Permanent Delete
  const handlePermanentDelete = (item: { type: 'file' | 'folder'; id: number | string; name: string }) => {
    setItemToPermanentDelete(item);
  };

  const handleConfirmPermanentDelete = async () => {
    if (!itemToPermanentDelete) return;
    if (itemToPermanentDelete.type === 'file') {
      const docId = itemToPermanentDelete.id as number;
      try {
        await deleteDocument(docId);
        setDocuments(prev => prev.filter(d => d.id !== docId));
        setTrashedDocIds(prev => prev.filter(id => id !== docId));
        showToast('success', 'Ficheiro Eliminado Definitivamente', `"${itemToPermanentDelete.name}" foi apagado do S3 e da base de dados.`);
      } catch (err: any) {
        showToast('error', 'Erro ao Eliminar', err.message || 'Falha ao excluir arquivo.');
      }
    } else {
      const folderId = itemToPermanentDelete.id as string;
      setFolders(prev => prev.filter(f => f.id !== folderId));
      setTrashedFolderIds(prev => prev.filter(id => id !== folderId));
      showToast('success', 'Pasta Eliminada Definitivamente', `A pasta "${itemToPermanentDelete.name}" foi excluída.`);
    }
    setItemToPermanentDelete(null);
  };

  // Empty Trash
  const handleConfirmEmptyTrash = async () => {
    try {
      for (const id of trashedDocIds) {
        await deleteDocument(id).catch(() => {});
      }
      setDocuments(prev => prev.filter(d => !trashedDocIds.includes(d.id)));
      setFolders(prev => prev.filter(f => !trashedFolderIds.includes(f.id)));
      setTrashedDocIds([]);
      setTrashedFolderIds([]);
      setIsEmptyTrashModalOpen(false);
      showToast('success', 'Lixeira Esvaziada', 'Todos os ficheiros e pastas da lixeira foram permanentemente eliminados.');
      loadAllData();
    } catch (err: any) {
      showToast('error', 'Erro ao Esvaziar', err.message || 'Falha ao esvaziar lixeira.');
    }
  };

  // Rename
  const handleOpenRename = (item: { type: 'file' | 'folder'; id: number | string; name: string; description?: string }) => {
    setRenameTarget(item);
    setRenameValue(item.name);
    setRenameDescValue(item.description || '');
    setIsRenameModalOpen(true);
  };

  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;

    if (renameTarget.type === 'file') {
      const docId = renameTarget.id as number;
      try {
        await updateDocument(docId, {
          title: renameValue.trim(),
          description: renameDescValue.trim()
        });
        setDocuments(prev => prev.map(d => d.id === docId ? { ...d, title: renameValue.trim(), description: renameDescValue.trim() } : d));
        showToast('success', 'Ficheiro Renomeado', `"${renameValue}" atualizado com sucesso.`);
        setIsRenameModalOpen(false);
      } catch (err: any) {
        showToast('error', 'Erro ao Renomear', err.message || 'Falha ao atualizar nome do ficheiro.');
      }
    } else {
      const folderId = renameTarget.id as string;
      const cleanName = renameValue.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: cleanName, description: renameDescValue.trim() } : f));
      showToast('success', 'Pasta Renomeada', `Pasta atualizada para "${cleanName}".`);
      setIsRenameModalOpen(false);
    }
  };

  // Download
  const handleDownload = async (doc: GEDDocument) => {
    try {
      await downloadDocument(doc.id, doc.file_name);
    } catch (err: any) {
      console.error('Erro ao descarregar documento:', err);
      showToast('error', 'Erro no Download', 'Não foi possível descarregar o arquivo.');
    }
  };

  // Folder Icon with Category Corner Badge (cPanel-style)
  const renderFolderWithBadge = (iconType: string, folderSize = "w-5 h-5", badgeSize = "w-2.5 h-2.5") => {
    return (
      <div className="relative inline-flex items-center justify-center shrink-0">
        <Folder className={`${folderSize} text-amber-500 fill-amber-400/20 shrink-0`} />
        {iconType === 'pdf' && (
          <span className="absolute -bottom-1 -right-1 bg-rose-500 text-white rounded-full p-[1.5px] ring-1 ring-white shadow-2xs" title="Documentos PDF">
            <FileText className={badgeSize} />
          </span>
        )}
        {iconType === 'excel' && (
          <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-[1.5px] ring-1 ring-white shadow-2xs" title="Folhas de Cálculo Excel">
            <FileSpreadsheet className={badgeSize} />
          </span>
        )}
        {iconType === 'word' && (
          <span className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-[1.5px] ring-1 ring-white shadow-2xs" title="Documentos Word">
            <FileText className={badgeSize} />
          </span>
        )}
        {iconType === 'image' && (
          <span className="absolute -bottom-1 -right-1 bg-indigo-500 text-white rounded-full p-[1.5px] ring-1 ring-white shadow-2xs" title="Imagens & Fotografias">
            <FileImage className={badgeSize} />
          </span>
        )}
        {iconType === 'cad' && (
          <span className="absolute -bottom-1 -right-1 bg-purple-600 text-white rounded-full p-[1.5px] ring-1 ring-white shadow-2xs" title="Projetos CAD & DWG">
            <Compass className={badgeSize} />
          </span>
        )}
        {iconType === 'contract' && (
          <span className="absolute -bottom-1 -right-1 bg-cyan-600 text-white rounded-full p-[1.5px] ring-1 ring-white shadow-2xs" title="Contratos & Jurídico">
            <FileCheck2 className={badgeSize} />
          </span>
        )}
        {iconType === 'rh' && (
          <span className="absolute -bottom-1 -right-1 bg-teal-600 text-white rounded-full p-[1.5px] ring-1 ring-white shadow-2xs" title="RH & Pessoal">
            <Users className={badgeSize} />
          </span>
        )}
        {iconType === 'brand' && (
          <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-[1.5px] ring-1 ring-white shadow-2xs" title="Logotipos & Marcas">
            <Sparkles className={badgeSize} />
          </span>
        )}
        {iconType === 'google_drive' && (
          <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-[1.5px] ring-1 ring-neutral-300 shadow-2xs" title="Google Drive">
            <svg className={badgeSize} viewBox="0 0 87.3 78" fill="none">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.9 2.5 3.2 3.3l16.3-28.2H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/>
              <path d="M43.65 25 29.8 1c-1.3.8-2.4 1.9-3.2 3.3L1.2 48.2c-.8 1.4-1.2 2.95-1.2 4.5h29.95z" fill="#00AC47"/>
              <path d="m73.55 76.8c1.3-.8 2.4-1.9 3.2-3.3l1.6-2.75 7.75-13.45c.8-1.4 1.2-2.95 1.2-4.5H57.35l6.55 11.35z" fill="#EA4335"/>
              <path d="M43.65 25 57.5 1c-1.3-.8-2.4-1.9-3.2-3.3H33c-1.55 0-3.1.4-4.5 1.2z" fill="#00832D"/>
              <path d="M87.3 48.2 72.8 23.05c-.8-1.4-1.9-2.5-3.2-3.3L57.5 44.9h29.8z" fill="#FFBA00"/>
              <path d="M57.35 44.9H27.45L13.65 68.8c.8 1.4 1.9 2.5 3.2 3.3h53.7c1.55 0 3.1-.4 4.5-1.2z" fill="#2684FC"/>
            </svg>
          </span>
        )}
      </div>
    );
  };

  // File type icons
  const getFileIcon = (fileName: string, mimeType?: string | null, size = "w-5 h-5") => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf' || mimeType?.includes('pdf')) {
      return <FileText className={`${size} text-rose-500 flex-shrink-0`} />;
    }
    if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext) || mimeType?.includes('image')) {
      return <FileImage className={`${size} text-blue-500 flex-shrink-0`} />;
    }
    if (['xlsx', 'xls', 'csv'].includes(ext) || mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) {
      return <FileSpreadsheet className={`${size} text-emerald-500 flex-shrink-0`} />;
    }
    if (['doc', 'docx'].includes(ext) || mimeType?.includes('word')) {
      return <FileText className={`${size} text-blue-600 flex-shrink-0`} />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mimeType?.includes('zip')) {
      return <FileArchive className={`${size} text-amber-500 flex-shrink-0`} />;
    }
    if (['js', 'ts', 'py', 'json', 'html', 'css', 'sql'].includes(ext)) {
      return <FileCode className={`${size} text-purple-500 flex-shrink-0`} />;
    }
    if (['dwg', 'dxf'].includes(ext)) {
      return <Compass className={`${size} text-purple-600 flex-shrink-0`} />;
    }
    return <FileIcon className={`${size} text-slate-500 flex-shrink-0`} />;
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
    if (['doc', 'docx'].includes(ext)) return 'Documento Word';
    if (['xlsx', 'xls'].includes(ext)) return 'Folha de Cálculo Excel';
    if (ext === 'csv') return 'Tabela CSV';
    if (['dwg', 'dxf'].includes(ext)) return 'Projeto CAD (AutoCAD)';
    if (['zip', 'rar', '7z'].includes(ext)) return 'Arquivo Comprimido';
    return mimeType || 'Ficheiro Binário';
  };

  const isGoogleConnected = !!getStoredGoogleToken();
  const trashTotalCount = trashedDocuments.length + trashedFolders.length;

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] min-h-[580px] font-sans select-none gap-3">
      <Toast 
        toasts={toasts} 
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} 
      />

      {/* =========================================================================
          1. BARRA SUPERIOR DE FERRAMENTAS DO GESTOR DE FICHEIROS (cPanel-Style Toolbar)
         ========================================================================= */}
      <div className="bg-white border border-[#E2E2DE] rounded-xl px-3 py-2 shadow-2xs flex items-center justify-between gap-3 shrink-0 overflow-x-auto scrollbar-none">
        
        {/* Bloco 1: Navegação Histórica */}
        <div className="flex items-center gap-1 shrink-0 flex-nowrap">
          <button
            type="button"
            onClick={handleGoBack}
            disabled={historyIndex === 0}
            className="btn-ghost btn-sm whitespace-nowrap shrink-0 flex items-center gap-1.5 text-neutral-700 disabled:opacity-35"
            title="Voltar"
          >
            <ArrowLeft size={14} />
            <span className="text-xs">Voltar</span>
          </button>

          <button
            type="button"
            onClick={handleGoForward}
            disabled={historyIndex >= history.length - 1}
            className="btn-ghost btn-sm whitespace-nowrap shrink-0 flex items-center gap-1.5 text-neutral-700 disabled:opacity-35"
            title="Avançar"
          >
            <ArrowRight size={14} />
            <span className="text-xs">Avançar</span>
          </button>

          <button
            type="button"
            onClick={handleUpLevel}
            disabled={currentPath === '/'}
            className="btn-ghost btn-sm whitespace-nowrap shrink-0 flex items-center gap-1.5 text-neutral-700 disabled:opacity-35"
            title="Subir um nível de diretório"
          >
            <ArrowUp size={14} />
            <span className="text-xs">Subir Nível</span>
          </button>

          <button
            type="button"
            onClick={() => loadAllData(true)}
            disabled={isLoading}
            className="btn-ghost btn-sm whitespace-nowrap shrink-0 flex items-center gap-1.5 text-neutral-700"
            title="Recarregar dados do S3"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-[#FF8000]' : ''} />
            <span className="text-xs">Recarregar</span>
          </button>

          <div className="h-4 w-px bg-neutral-200 mx-0.5 shrink-0" />

          {/* Bloco 2: Gestão de Pastas e Arquivos */}
          <button
            type="button"
            onClick={() => setIsNewFolderModalOpen(true)}
            className="btn-ghost btn-sm whitespace-nowrap shrink-0 flex items-center gap-1.5 text-neutral-700 hover:text-[#FF8000]"
            title="Criar Nova Pasta no Repositório"
          >
            <FolderPlus size={14} className="text-amber-500" />
            <span className="text-xs font-semibold">Nova Pasta</span>
          </button>

          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="btn-ghost btn-sm whitespace-nowrap shrink-0 flex items-center gap-1.5 text-neutral-700 hover:text-[#FF8000]"
            title="Carregar Novo Arquivo"
          >
            <UploadCloud size={14} className="text-[#FF8000]" />
            <span className="text-xs font-semibold">Novo Arquivo</span>
          </button>

          <div className="h-4 w-px bg-neutral-200 mx-0.5 shrink-0" />

          {/* Bloco 3: Seleção em Lote */}
          <button
            type="button"
            onClick={handleSelectAll}
            className="btn-ghost btn-sm whitespace-nowrap shrink-0 flex items-center gap-1.5 text-neutral-600"
            title="Selecionar todos os ficheiros da pasta"
          >
            <CheckSquare size={13} />
            <span className="text-xs">Selecionar Tudo</span>
          </button>

          <button
            type="button"
            onClick={handleDeselectAll}
            disabled={selectedDocIds.length === 0}
            className="btn-ghost btn-sm whitespace-nowrap shrink-0 flex items-center gap-1.5 text-neutral-600 disabled:opacity-35"
            title="Desmarcar seleção"
          >
            <Square size={13} />
            <span className="text-xs">Desmarcar</span>
          </button>
        </div>

        {/* Bloco 4: Lixeira, Visualização e Cloud */}
        <div className="flex items-center gap-2 shrink-0 flex-nowrap">
          
          {/* Alternador Lista / Grelha */}
          <div className="flex items-center bg-[#F5F5F3] p-0.5 rounded-lg border border-[#E2E2DE]">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition ${viewMode === 'list' ? 'bg-white shadow-2xs text-[#FF8000] font-bold' : 'text-neutral-500 hover:text-neutral-800'}`}
              title="Visualização em Lista (Tabela cPanel)"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition ${viewMode === 'grid' ? 'bg-white shadow-2xs text-[#FF8000] font-bold' : 'text-neutral-500 hover:text-neutral-800'}`}
              title="Visualização em Grelha (Cartões / Ícones)"
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          <div className="h-4 w-px bg-neutral-200 mx-0.5 shrink-0" />

          {/* Botão Ver Lixeira */}
          <button
            type="button"
            onClick={() => navigateTo('/trash')}
            className={`btn-ghost btn-sm whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              currentPath === '/trash' 
                ? 'bg-rose-50 text-rose-600 font-bold border border-rose-200' 
                : 'text-neutral-600 hover:text-rose-600'
            }`}
            title="Ver Ficheiros e Pastas na Lixeira"
          >
            <Trash2 size={14} className={trashTotalCount > 0 ? 'text-rose-500' : 'text-neutral-400'} />
            <span className="text-xs">Lixeira</span>
            {trashTotalCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white font-mono">
                {trashTotalCount}
              </span>
            )}
          </button>

          {/* Esvaziar Lixeira (Quando na lixeira ou com itens) */}
          {currentPath === '/trash' && trashTotalCount > 0 && (
            <button
              type="button"
              onClick={() => setIsEmptyTrashModalOpen(true)}
              className="btn-danger btn-sm whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Trash2 size={13} />
              <span className="text-xs font-bold">Esvaziar Lixeira</span>
            </button>
          )}

          {/* Google Drive Direct Button */}
          <button
            type="button"
            onClick={() => setIsGoogleDriveModalOpen(true)}
            className="btn-secondary btn-sm whitespace-nowrap shrink-0 flex items-center gap-1.5 border border-slate-200"
            title="Abrir Google Drive Integrado"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 87.3 78" fill="none">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.9 2.5 3.2 3.3l16.3-28.2H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/>
              <path d="M43.65 25 29.8 1c-1.3.8-2.4 1.9-3.2 3.3L1.2 48.2c-.8 1.4-1.2 2.95-1.2 4.5h29.95z" fill="#00AC47"/>
              <path d="m73.55 76.8c1.3-.8 2.4-1.9 3.2-3.3l1.6-2.75 7.75-13.45c.8-1.4 1.2-2.95 1.2-4.5H57.35l6.55 11.35z" fill="#EA4335"/>
              <path d="M43.65 25 57.5 1c-1.3-.8-2.4-1.9-3.2-3.3H33c-1.55 0-3.1.4-4.5 1.2z" fill="#00832D"/>
              <path d="M87.3 48.2 72.8 23.05c-.8-1.4-1.9-2.5-3.2-3.3L57.5 44.9h29.8z" fill="#FFBA00"/>
              <path d="M57.35 44.9H27.45L13.65 68.8c.8 1.4 1.9 2.5 3.2 3.3h53.7c1.55 0 3.1-.4 4.5-1.2z" fill="#2684FC"/>
            </svg>
            <span className="text-xs font-semibold">Google Drive</span>
            {isGoogleConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" title="Conectado" />
            )}
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. PAINEL PRINCIPAL: ÁRVORE DE DIRETÓRIOS (ESQUERDA) + EXPLORADOR (DIREITA)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 overflow-hidden">
        
        {/* -----------------------------------------------------------------------
            PAINEL ESQUERDO: ÁRVORE DE DIRETÓRIOS (Folder Tree Explorer)
           ----------------------------------------------------------------------- */}
        <div className="lg:col-span-3 xl:col-span-3 bg-white border border-[#E2E2DE] rounded-xl shadow-2xs flex flex-col h-full min-h-0 overflow-hidden">
          
          {/* Cabeçalho do Caminho / Path Input */}
          <div className="p-2.5 bg-[#FAFAF9] border-b border-[#EDEDEA] flex items-center justify-between gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <FolderArchive size={15} className="text-[#FF8000] shrink-0" />
              <div className="px-2 py-1 bg-white border border-[#E2E2DE] rounded-md text-[11px] font-mono text-[#101010] truncate w-full shadow-2xs">
                {currentPath === '/trash' ? '/assets/lixeira' : currentPath === '/' ? '/assets/ged' : `/assets/ged${currentPath}`}
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

          {/* Lista de Pastas e Subpastas com Scroll Vertical Independente */}
          <div className="p-2 space-y-0.5 flex-1 min-h-0 overflow-y-auto">
            
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
                <FolderOpen size={15} className={currentPath === '/' ? 'text-[#FF8000]' : 'text-neutral-400'} />
                <span className="font-heading truncate font-semibold">assets (Raiz)</span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600">
                {activeDocuments.length}
              </span>
            </button>

            {/* Subpastas com hierarquia e ícones por categoria */}
            {isTreeExpanded && (
              <div className="pl-3.5 space-y-0.5 border-l border-neutral-200 ml-3.5 my-1">
                {activeFolders.map((folder) => {
                  const isActive = currentPath === folder.path;
                  const count = folderCounts[folder.id] || 0;

                  return (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => navigateTo(folder.path)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs transition cursor-pointer group ${
                        isActive 
                          ? 'bg-[#FFF2E5] text-[#FF8000] font-bold ring-1 ring-[#FF8000]/30 shadow-2xs' 
                          : 'text-neutral-700 hover:bg-[#FAFAF9]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {renderFolderWithBadge(folder.iconType, "w-4 h-4", "w-2 h-2")}
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

            {/* Secção Cloud Repositories na Árvore de Pastas */}
            <div className="mt-3 pt-2.5 border-t border-neutral-100 px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-heading">
                Repositórios Cloud
              </span>
              <div className="mt-1 space-y-0.5">
                
                {/* Google Drive Folder Item */}
                <button
                  type="button"
                  onClick={() => setIsGoogleDriveModalOpen(true)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs text-neutral-700 hover:bg-[#FAFAF9] transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 87.3 78" fill="none">
                      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.9 2.5 3.2 3.3l16.3-28.2H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/>
                      <path d="M43.65 25 29.8 1c-1.3.8-2.4 1.9-3.2 3.3L1.2 48.2c-.8 1.4-1.2 2.95-1.2 4.5h29.95z" fill="#00AC47"/>
                      <path d="m73.55 76.8c1.3-.8 2.4-1.9 3.2-3.3l1.6-2.75 7.75-13.45c.8-1.4 1.2-2.95 1.2-4.5H57.35l6.55 11.35z" fill="#EA4335"/>
                      <path d="M43.65 25 57.5 1c-1.3-.8-2.4-1.9-3.2-3.3H33c-1.55 0-3.1.4-4.5 1.2z" fill="#00832D"/>
                      <path d="M87.3 48.2 72.8 23.05c-.8-1.4-1.9-2.5-3.2-3.3L57.5 44.9h29.8z" fill="#FFBA00"/>
                      <path d="M57.35 44.9H27.45L13.65 68.8c.8 1.4 1.9 2.5 3.2 3.3h53.7c1.55 0 3.1-.4 4.5-1.2z" fill="#2684FC"/>
                    </svg>
                    <span className="font-heading text-xs font-semibold truncate text-slate-800">
                      Google Drive
                    </span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${isGoogleConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                    {isGoogleConnected ? 'Ativo' : 'Conectar'}
                  </span>
                </button>

                {/* OneDrive Folder Item */}
                <button
                  type="button"
                  onClick={() => setIsOneDriveModalOpen(true)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs text-neutral-700 hover:bg-[#FAFAF9] transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 shrink-0 text-[#0078D4]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"/>
                    </svg>
                    <span className="font-heading text-xs font-semibold truncate text-slate-800">
                      OneDrive
                    </span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-500">
                    Em Breve
                  </span>
                </button>

                {/* Lixeira Folder Item */}
                <button
                  type="button"
                  onClick={() => navigateTo('/trash')}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs transition cursor-pointer group ${
                    currentPath === '/trash' ? 'bg-rose-50 text-rose-600 font-bold' : 'text-neutral-700 hover:bg-[#FAFAF9]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Trash2 size={14} className={currentPath === '/trash' ? 'text-rose-600' : 'text-rose-400'} />
                    <span className="font-heading text-xs font-semibold truncate">
                      Lixeira
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-100 text-rose-600 font-bold">
                    {trashTotalCount}
                  </span>
                </button>

              </div>
            </div>

          </div>

          {/* Informação de Capacidade / Storage */}
          <div className="p-2.5 bg-[#FAFAF9] border-t border-[#EDEDEA] shrink-0 text-[11px] text-neutral-500">
            <div className="flex items-center justify-between mb-0.5">
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

        {/* -----------------------------------------------------------------------
            PAINEL DIREITO: EXPLORADOR DE FICHEIROS E TABELA DE CONTEÚDO
           ----------------------------------------------------------------------- */}
        <div className="lg:col-span-9 xl:col-span-9 bg-white border border-[#E2E2DE] rounded-xl shadow-2xs flex flex-col h-full min-h-0 overflow-hidden">
          
          {/* Breadcrumb Path & Search Bar */}
          <div className="px-3.5 py-2.5 bg-[#FAFAF9] border-b border-[#EDEDEA] flex items-center justify-between gap-3 shrink-0">
            
            {/* Breadcrumb clicável */}
            <div className="flex items-center gap-1.5 text-xs text-[#101010] flex-nowrap min-w-0">
              <button
                type="button"
                onClick={() => navigateTo('/')}
                className="font-bold text-[#FF8000] hover:underline flex items-center gap-1 shrink-0"
              >
                <FolderArchive size={14} />
                <span>assets</span>
              </button>
              
              {currentPath !== '/' && (
                <>
                  <ChevronRight size={13} className="text-neutral-400 shrink-0" />
                  <span className={`font-bold font-mono px-2 py-0.5 rounded border shrink-0 ${
                    currentPath === '/trash' 
                      ? 'bg-rose-50 text-rose-600 border-rose-200' 
                      : 'bg-white text-[#101010] border-[#E2E2DE]'
                  }`}>
                    {currentPath === '/trash' ? 'Lixeira do Sistema' : currentPath.replace('/', '')}
                  </span>
                </>
              )}
            </div>

            {/* Search Input */}
            <div className="relative w-48 sm:w-64 shrink-0">
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

          {/* Banner de Aviso na Lixeira */}
          {currentPath === '/trash' && (
            <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 flex items-center justify-between text-xs text-rose-800 shrink-0">
              <div className="flex items-center gap-2">
                <Trash2 size={15} className="text-rose-600" />
                <span>
                  <strong>Lixeira do Sistema:</strong> Os ficheiros aqui podem ser restaurados ou eliminados permanentemente.
                </span>
              </div>
              {trashTotalCount > 0 && (
                <span className="font-semibold text-rose-700">
                  {trashTotalCount} {trashTotalCount === 1 ? 'item' : 'itens'} na lixeira
                </span>
              )}
            </div>
          )}

          {/* ===================================================================
              CONTEÚDO PRINCIPAL: MODO LISTA (Tabela) OU MODO GRELHA (Cards)
             =================================================================== */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto relative">
            
            {/* 1. SE FOR MODO LISTA */}
            {viewMode === 'list' ? (
              <table className="table-erp w-full">
                <thead className="sticky top-0 bg-[#FAFAF9] z-10 shadow-2xs">
                  <tr className="table-header-erp text-[11px] border-b border-[#E2E2DE]">
                    <th className="w-8 px-3 text-center bg-[#FAFAF9]">
                      <input
                        type="checkbox"
                        checked={
                          currentPath === '/' 
                            ? (activeFolders.length > 0 && selectedFolderIds.length === activeFolders.length)
                            : currentPath === '/trash'
                            ? ((trashedFolders.length + trashedDocuments.length > 0) && (selectedFolderIds.length + selectedDocIds.length === trashedFolders.length + trashedDocuments.length))
                            : (currentFolderDocuments.length > 0 && selectedDocIds.length === currentFolderDocuments.length)
                        }
                        onChange={(e) => e.target.checked ? handleSelectAll() : handleDeselectAll()}
                        className="rounded border-[#E2E2DE] text-[#FF8000] focus:ring-[#FF8000] accent-[#FF8000] cursor-pointer"
                      />
                    </th>
                    <th className="px-4 bg-[#FAFAF9]">Nome do Ficheiro / Pasta</th>
                    <th className="px-4 w-28 bg-[#FAFAF9]">Tamanho</th>
                    <th className="px-4 w-36 bg-[#FAFAF9]">Data de Envio</th>
                    <th className="px-4 w-44 bg-[#FAFAF9]">Formato / Tipo</th>
                    <th className="px-4 w-28 text-right bg-[#FAFAF9]">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#F0F0ED] text-xs">
                  
                  {/* Linha de Subir Diretório (..) */}
                  {currentPath !== '/' && currentPath !== '/trash' && !searchTerm && (
                    <tr 
                      onDoubleClick={handleUpLevel}
                      onClick={handleUpLevel}
                      className="hover:bg-[#FFF8F2] transition-colors cursor-pointer group select-none"
                      title="Duplo clique para subir ao diretório anterior"
                    >
                      <td className="px-3 text-center"></td>
                      <td className="px-4 py-2.5 flex items-center gap-2.5">
                        <Folder size={16} className="text-amber-500 shrink-0" />
                        <span className="font-mono font-bold text-[#101010] group-hover:text-[#FF8000]">.. (Diretório Anterior)</span>
                      </td>
                      <td className="px-4 text-neutral-400 font-mono text-[11px]">—</td>
                      <td className="px-4 text-neutral-400 text-[11px]">—</td>
                      <td className="px-4 text-neutral-400 text-[11px]">Pasta de Ficheiros</td>
                      <td className="px-4 text-right"></td>
                    </tr>
                  )}

                  {/* Listar Pastas Principais se estiver na Raiz */}
                  {currentPath === '/' && !searchTerm && (
                    <>
                      {/* Pastas de Armazenamento Ativas com Checkbox */}
                      {activeFolders.map((folder) => {
                        const count = folderCounts[folder.id] || 0;
                        const isFolderSelected = selectedFolderIds.includes(folder.id);

                        return (
                          <tr
                            key={folder.id}
                            onDoubleClick={() => navigateTo(folder.path)}
                            className={`hover:bg-[#FFF8F2] transition-colors cursor-pointer group ${isFolderSelected ? 'bg-[#FFF2E5]/50' : ''}`}
                            title="Duplo clique para abrir a pasta"
                          >
                            <td className="px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isFolderSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleSelectFolder(folder.id);
                                }}
                                className="rounded border-[#E2E2DE] text-[#FF8000] focus:ring-[#FF8000] accent-[#FF8000] cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => navigateTo(folder.path)}
                                className="text-left group-hover:text-[#FF8000] transition flex items-center gap-3"
                              >
                                {renderFolderWithBadge(folder.iconType, "w-5 h-5", "w-2.5 h-2.5")}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-[#101010] font-mono group-hover:text-[#FF8000]">
                                      {folder.name}
                                    </span>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                                      {folder.category}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-[#737370] mt-0.5">
                                    {folder.description}
                                  </p>
                                </div>
                              </button>
                            </td>
                            <td className="px-4 font-mono text-[11px] text-neutral-500">
                              {count} {count === 1 ? 'ficheiro' : 'ficheiros'}
                            </td>
                            <td className="px-4 text-neutral-400 text-[11px]">
                              {folder.createdAt}
                            </td>
                            <td className="px-4 text-neutral-600 text-[11px]">
                              Pasta do Sistema
                            </td>
                            <td className="px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleOpenRename({ type: 'folder', id: folder.id, name: folder.name, description: folder.description }); }}
                                  className="btn-ghost btn-icon-sm text-neutral-500 hover:text-neutral-800"
                                  title="Renomear Pasta"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleMoveToTrash({ type: 'folder', id: folder.id, name: folder.name }); }}
                                  className="btn-ghost btn-icon-sm text-neutral-500 hover:text-rose-600"
                                  title="Mover Pasta para a Lixeira"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => navigateTo(folder.path)}
                                  className="btn-secondary btn-sm text-[11px] py-1 px-2 ml-1"
                                >
                                  Abrir
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Google Drive Folder Row */}
                      <tr 
                        onDoubleClick={() => setIsGoogleDriveModalOpen(true)}
                        className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-3 text-center">
                          <input
                            type="checkbox"
                            disabled
                            className="rounded border-[#E2E2DE] opacity-25 cursor-not-allowed"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setIsGoogleDriveModalOpen(true)}
                            className="text-left group-hover:text-blue-600 transition flex items-center gap-3"
                          >
                            {renderFolderWithBadge('google_drive', "w-5 h-5", "w-2.5 h-2.5")}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-[#101010] font-mono group-hover:text-blue-600">
                                  Google Drive
                                </span>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isGoogleConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {isGoogleConnected ? 'Sincronizado' : 'OAuth 2.0'}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#737370] mt-0.5">
                                Navegue e importe ficheiros diretamente da sua conta Google Drive
                              </p>
                            </div>
                          </button>
                        </td>
                        <td className="px-4 font-mono text-[11px] text-neutral-500">Cloud Storage</td>
                        <td className="px-4 text-neutral-400 text-[11px]">Tempo Real</td>
                        <td className="px-4 text-blue-600 text-[11px] font-medium">Repositório Cloud</td>
                        <td className="px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setIsGoogleDriveModalOpen(true)}
                            className="btn-secondary btn-sm text-[11px] py-1 px-2.5"
                          >
                            Explorar
                          </button>
                        </td>
                      </tr>
                    </>
                  )}

                  {/* Pastas na Lixeira se estiver na Lixeira */}
                  {currentPath === '/trash' && trashedFolders.map((f) => {
                    const isTrashedFolderSelected = selectedFolderIds.includes(f.id);

                    return (
                      <tr key={f.id} className={`bg-rose-50/40 hover:bg-rose-50 transition-colors ${isTrashedFolderSelected ? 'bg-rose-100/50' : ''}`}>
                        <td className="px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isTrashedFolderSelected}
                            onChange={() => toggleSelectFolder(f.id)}
                            className="rounded border-rose-300 text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {renderFolderWithBadge(f.iconType, "w-5 h-5", "w-2.5 h-2.5")}
                            <div>
                              <span className="font-bold text-sm text-rose-900 font-mono">
                                {f.name} (Pasta Eliminada)
                              </span>
                              <p className="text-[11px] text-rose-600 mt-0.5">
                                {f.description}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 font-mono text-[11px] text-neutral-500">—</td>
                        <td className="px-4 text-neutral-400 text-[11px]">{f.createdAt}</td>
                        <td className="px-4 text-rose-600 text-[11px]">Pasta na Lixeira</td>
                        <td className="px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleRestoreItem({ type: 'folder', id: f.id, name: f.name })}
                              className="btn-secondary btn-sm text-[11px] py-1 px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                              title="Restaurar Pasta"
                            >
                              <RotateCcw className="w-3 h-3 mr-1 text-emerald-600 inline" />
                              Restaurar
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePermanentDelete({ type: 'folder', id: f.id, name: f.name })}
                              className="btn-danger btn-icon-sm"
                              title="Eliminar Permanentemente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Lista de Ficheiros */}
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
                          <p className="text-sm font-bold text-neutral-700 font-heading">
                            {currentPath === '/trash' ? 'A lixeira está vazia' : 'Esta pasta está vazia'}
                          </p>
                          <p className="text-xs text-neutral-400 max-w-sm">
                            {searchTerm 
                              ? 'Nenhum ficheiro encontrado com os termos pesquisados.' 
                              : currentPath === '/trash'
                              ? 'Nenhum item foi enviado para a lixeira.'
                              : 'Clique em "Novo Arquivo" acima para fazer upload para este diretório.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentFolderDocuments.map((doc) => {
                      const isSelected = selectedDocIds.includes(doc.id);
                      const isTrashed = trashedDocIds.includes(doc.id);

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
                              {isTrashed ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleRestoreItem({ type: 'file', id: doc.id, name: doc.title })}
                                    className="btn-secondary btn-sm text-[11px] py-1 px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                    title="Restaurar Ficheiro"
                                  >
                                    <RotateCcw className="w-3 h-3 mr-1 text-emerald-600 inline" />
                                    Restaurar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePermanentDelete({ type: 'file', id: doc.id, name: doc.title })}
                                    className="btn-danger btn-icon-sm"
                                    title="Eliminar Definitivamente"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
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
                                    onClick={() => handleOpenRename({ type: 'file', id: doc.id, name: doc.title, description: doc.description || '' })}
                                    className="btn-ghost btn-icon-sm text-neutral-500 hover:text-neutral-800"
                                    title="Renomear Ficheiro"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveToTrash({ type: 'file', id: doc.id, name: doc.title })}
                                    className="btn-ghost btn-icon-sm text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                    title="Mover para Lixeira"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}

                </tbody>
              </table>
            ) : (
              /* 2. MODO GRELHA (GRID VIEW) */
              <div className="p-4 space-y-5">
                
                {/* Pastas em Grelha (Se estiver na raiz) */}
                {currentPath === '/' && !searchTerm && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-heading mb-3">
                      Pastas do Sistema & Armazenamento
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {activeFolders.map((folder) => {
                        const count = folderCounts[folder.id] || 0;
                        return (
                          <div
                            key={folder.id}
                            onDoubleClick={() => navigateTo(folder.path)}
                            onClick={() => navigateTo(folder.path)}
                            className="bg-[#FAFAF9] hover:bg-white border border-[#E2E2DE] hover:border-[#FF8000] hover:shadow-md rounded-xl p-3.5 transition cursor-pointer flex flex-col justify-between group"
                          >
                            <div className="flex items-start justify-between">
                              <div className="p-2.5 rounded-xl bg-white border border-[#E2E2DE] shadow-2xs group-hover:scale-105 transition">
                                {renderFolderWithBadge(folder.iconType, "w-7 h-7", "w-3.5 h-3.5")}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleOpenRename({ type: 'folder', id: folder.id, name: folder.name, description: folder.description }); }}
                                  className="p-1 text-neutral-400 hover:text-neutral-700 rounded"
                                  title="Renomear"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleMoveToTrash({ type: 'folder', id: folder.id, name: folder.name }); }}
                                  className="p-1 text-neutral-400 hover:text-rose-600 rounded"
                                  title="Mover para Lixeira"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                            <div className="mt-3">
                              <p className="font-bold text-xs text-[#101010] font-mono group-hover:text-[#FF8000] truncate">
                                {folder.name}
                              </p>
                              <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                                {count} {count === 1 ? 'ficheiro' : 'ficheiros'}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      {/* Google Drive Card */}
                      <div
                        onClick={() => setIsGoogleDriveModalOpen(true)}
                        className="bg-blue-50/50 hover:bg-white border border-blue-200 hover:border-blue-500 hover:shadow-md rounded-xl p-3.5 transition cursor-pointer flex flex-col justify-between group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="p-2.5 rounded-xl bg-white border border-blue-200 shadow-2xs group-hover:scale-105 transition">
                            {renderFolderWithBadge('google_drive', "w-7 h-7", "w-3.5 h-3.5")}
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isGoogleConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {isGoogleConnected ? 'Ativo' : 'Conectar'}
                          </span>
                        </div>
                        <div className="mt-3">
                          <p className="font-bold text-xs text-blue-900 font-heading truncate">
                            Google Drive
                          </p>
                          <p className="text-[10px] text-blue-600 font-sans mt-0.5">
                            Cloud Explorer
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* Ficheiros em Grelha */}
                <div>
                  {currentPath !== '/' && (
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-heading">
                        Ficheiros ({currentFolderDocuments.length})
                      </h4>
                      <button
                        type="button"
                        onClick={handleUpLevel}
                        className="text-xs text-[#FF8000] hover:underline font-bold flex items-center gap-1"
                      >
                        <ArrowUp size={13} />
                        <span>Subir Nível</span>
                      </button>
                    </div>
                  )}

                  {currentFolderDocuments.length === 0 ? (
                    <div className="py-14 text-center text-neutral-400">
                      <FolderArchive className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-neutral-700 font-heading">Nenhum ficheiro para exibir</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
                      {currentFolderDocuments.map((doc) => {
                        const isSelected = selectedDocIds.includes(doc.id);
                        const isTrashed = trashedDocIds.includes(doc.id);

                        return (
                          <div
                            key={doc.id}
                            className={`bg-white border rounded-xl p-3.5 shadow-2xs hover:shadow-md transition flex flex-col justify-between group ${
                              isSelected ? 'border-[#FF8000] ring-1 ring-[#FF8000]' : 'border-[#E2E2DE] hover:border-neutral-400'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="p-2 rounded-xl bg-[#FAFAF9] border border-[#EDEDEA] shrink-0">
                                {getFileIcon(doc.file_name, doc.mime_type, "w-7 h-7")}
                              </div>
                              <div className="flex items-center gap-1">
                                {isTrashed ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreItem({ type: 'file', id: doc.id, name: doc.title })}
                                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                                      title="Restaurar"
                                    >
                                      <RotateCcw size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handlePermanentDelete({ type: 'file', id: doc.id, name: doc.title })}
                                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                                      title="Eliminar Permanentemente"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleDownload(doc)}
                                      className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded"
                                      title="Descarregar"
                                    >
                                      <Download size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenRename({ type: 'file', id: doc.id, name: doc.title, description: doc.description || '' })}
                                      className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded"
                                      title="Renomear"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMoveToTrash({ type: 'file', id: doc.id, name: doc.title })}
                                      className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                      title="Mover para Lixeira"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="mt-3">
                              <h5 className="font-bold text-xs text-[#101010] font-heading truncate group-hover:text-[#FF8000]">
                                {doc.title}
                              </h5>
                              <p className="text-[10px] text-neutral-400 font-mono truncate mt-0.5">
                                {doc.file_name}
                              </p>
                            </div>

                            <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                              <span>{formatFileSize(doc.file_size_bytes)}</span>
                              <span>{doc.created_at ? new Date(doc.created_at).toLocaleDateString('pt-MZ') : '—'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

          {/* Barra de Status no Rodapé */}
          <div className="px-4 py-2 bg-[#FAFAF9] border-t border-[#EDEDEA] flex flex-wrap items-center justify-between text-xs text-[#737370] shrink-0">
            <div className="flex items-center gap-3">
              <span>
                <strong>{currentFolderDocuments.length}</strong> ficheiros na visualização
              </span>
              {selectedDocIds.length > 0 && (
                <span className="font-semibold text-[#FF8000]">
                  ({selectedDocIds.length} selecionados)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Storage Neon S3: <strong>{kpis.total_storage_formatted}</strong></span>
            </div>
          </div>

        </div>
      </div>

      {/* =========================================================================
          3. MODAL: NOVA PASTA
         ========================================================================= */}
      {isNewFolderModalOpen && (
        <div className="modal-overlay-erp animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight font-heading">Criar Nova Pasta</h3>
                  <p className="text-[11px] text-slate-500">Organize ficheiros por categoria no repositório</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewFolderModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome da Pasta <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: orcamentos_2026, plantas_estruturais"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAFAF9] border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#FF8000]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categoria / Finalidade
                </label>
                <select
                  value={newFolderCategory}
                  onChange={(e) => setNewFolderCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAFAF9] border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#FF8000]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Ícone & Formato
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'folder', label: 'Pasta', color: 'text-amber-500', icon: <Folder className="w-4 h-4 text-amber-500" /> },
                    { id: 'pdf', label: 'PDF', color: 'text-rose-500', icon: <FileText className="w-4 h-4 text-rose-500" /> },
                    { id: 'excel', label: 'Excel', color: 'text-emerald-600', icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> },
                    { id: 'word', label: 'Word', color: 'text-blue-600', icon: <FileText className="w-4 h-4 text-blue-600" /> },
                    { id: 'image', label: 'Imagem', color: 'text-indigo-500', icon: <FileImage className="w-4 h-4 text-indigo-500" /> },
                    { id: 'cad', label: 'CAD', color: 'text-purple-600', icon: <Compass className="w-4 h-4 text-purple-600" /> },
                    { id: 'contract', label: 'Contrato', color: 'text-cyan-600', icon: <FileCheck2 className="w-4 h-4 text-cyan-600" /> },
                    { id: 'rh', label: 'RH', color: 'text-teal-600', icon: <Users className="w-4 h-4 text-teal-600" /> },
                  ].map((ic) => (
                    <button
                      key={ic.id}
                      type="button"
                      onClick={() => {
                        setNewFolderIcon(ic.id);
                        setNewFolderColor(ic.color);
                      }}
                      className={`p-2 rounded-lg border text-center flex flex-col items-center gap-1 transition ${
                        newFolderIcon === ic.id 
                          ? 'border-[#FF8000] bg-[#FFF2E5] text-[#FF8000] font-bold' 
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {ic.icon}
                      <span className="text-[10px]">{ic.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="btn-secondary btn-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary btn-sm"
                >
                  Criar Pasta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. MODAL: RENOMEAR (PASTA / FICHEIRO)
         ========================================================================= */}
      {isRenameModalOpen && renameTarget && (
        <div className="modal-overlay-erp animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#FF8000] flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight font-heading">
                    Renomear {renameTarget.type === 'file' ? 'Ficheiro' : 'Pasta'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Altere o nome e a descrição do elemento</p>
                </div>
              </div>
              <button
                onClick={() => setIsRenameModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRename} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Novo Nome <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAFAF9] border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#FF8000]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={renameDescValue}
                  onChange={(e) => setRenameDescValue(e.target.value)}
                  placeholder="Adicione detalhes sobre o arquivo..."
                  className="w-full px-3 py-2 bg-[#FAFAF9] border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#FF8000]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRenameModalOpen(false)}
                  className="btn-secondary btn-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary btn-sm"
                >
                  Guardar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          5. MODAL: NOVO ARQUIVO / UPLOAD (S3)
         ========================================================================= */}
      {isUploadModalOpen && (
        <div className="modal-overlay-erp animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
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
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Arquivo Físico <span className="text-rose-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-[#FF8000] transition-colors cursor-pointer bg-slate-50/50">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    id="ged-file-input"
                  />
                  <label htmlFor="ged-file-input" className="cursor-pointer block">
                    <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                    {selectedFile ? (
                      <div>
                        <p className="text-xs font-bold text-slate-800 font-mono truncate max-w-xs mx-auto">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-medium text-slate-600">
                          Clique para selecionar ou arraste um arquivo
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          PDF, DWG, Imagens, Excel, Word até 100MB
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título do Documento <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Projeto Estrutural da Obra X"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAFAF9] border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#FF8000]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoria do Arquivo
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAFAF9] border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#FF8000]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Versão
                  </label>
                  <input
                    type="text"
                    placeholder="v1.0, Rev B"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAFAF9] border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#FF8000]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Associar a Projeto (Opcional)
                  </label>
                  <select
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAFAF9] border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#FF8000]"
                  >
                    <option value="">Nenhum Projeto</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id.toString()}>{p.code ? `[${p.code}] ` : ''}{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Associar a Cliente (Opcional)
                  </label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAFAF9] border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#FF8000]"
                  >
                    <option value="">Nenhum Cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id.toString()}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição / Notas
                </label>
                <textarea
                  rows={2}
                  placeholder="Adicione observações relevantes sobre o arquivo..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAFAF9] border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#FF8000]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="btn-secondary btn-sm"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary btn-sm flex items-center space-x-1.5"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>A Enviar para o S3...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Concluir Upload</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. MODAIS DE INTEGRAÇÃO CLOUD (GOOGLE DRIVE & ONEDRIVE)
         ========================================================================= */}
      <GoogleDriveExplorerModal
        isOpen={isGoogleDriveModalOpen}
        onClose={() => setIsGoogleDriveModalOpen(false)}
        onSuccess={(fileName) => {
          showToast('success', 'Google Drive Sincronizado', `"${fileName}" foi transferido com sucesso para o Neon S3.`);
          loadAllData();
        }}
      />

      {isOneDriveModalOpen && (
        <div className="modal-overlay-erp animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0078D4] flex items-center justify-center mx-auto">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">Microsoft OneDrive</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                A integração do Microsoft Graph / OneDrive está configurada no backend e será ativada com o Azure Client ID do LECASU ERP.
              </p>
            </div>
            <button
              onClick={() => setIsOneDriveModalOpen(false)}
              className="btn-primary btn-sm w-full"
            >
              Compreendi
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. MODAIS DE CONFIRMAÇÃO (MOVER PARA LIXEIRA, ESVAZIAR, PERMANENTE)
         ========================================================================= */}
      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmMoveToTrash}
        title="Mover para a Lixeira?"
        description={`Tem a certeza de que deseja enviar "${itemToDelete?.name}" para a lixeira? Poderá restaurá-lo mais tarde se precisar.`}
        confirmText="Mover para Lixeira"
        cancelText="Cancelar"
        variant="warning"
      />

      <ConfirmationModal
        isOpen={!!itemToPermanentDelete}
        onClose={() => setItemToPermanentDelete(null)}
        onConfirm={handleConfirmPermanentDelete}
        title="Eliminar Definitivamente?"
        description={`Esta ação apagará permanentemente "${itemToPermanentDelete?.name}" do Neon S3 e da base de dados. Não poderá ser recuperado.`}
        confirmText="Eliminar Definitivamente"
        cancelText="Cancelar"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={isEmptyTrashModalOpen}
        onClose={() => setIsEmptyTrashModalOpen(false)}
        onConfirm={handleConfirmEmptyTrash}
        title="Esvaziar toda a Lixeira?"
        description="Todos os ficheiros e pastas atualmente na lixeira serão permanentemente eliminados do Neon S3. Esta ação é irreversível."
        confirmText="Sim, Esvaziar Tudo"
        cancelText="Cancelar"
        variant="danger"
      />

    </div>
  );
};
