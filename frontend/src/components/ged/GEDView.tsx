import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
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
  FolderPlus,
  ShieldCheck, 
  ArrowUp, 
  ArrowLeft, 
  ArrowRight, 
  CheckSquare, 
  Square,
  Edit2,
  RotateCcw,
  Compass,
  Home,
  Plus,
  Copy,
  Move,
  Key,
  Eye,
  Globe,
  Mail
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
  fetchClients,
  fetchGEDFolders,
  createGEDFolder,
  deleteGEDFolder
} from '../../services/api';
import { Toast } from '../common/Toast';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { 
  getStoredGoogleToken, 
  setStoredGoogleToken, 
  removeStoredGoogleToken 
} from './GoogleDriveExplorerModal';

export interface CustomFolder {
  id: string;
  name: string;
  path: string;
  category: string;
  iconType: string;
  color: string;
  permissions: string;
  createdAt: string;
}

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  iconLink?: string;
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '317708028649-gl3gp5ejeft9gq9gn7piqsmole32v1p4.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

const DEFAULT_SYSTEM_FOLDERS: CustomFolder[] = [
  { id: 'etc', name: 'Etc', path: '/etc', category: 'Configurações', iconType: 'folder', color: 'text-amber-500', permissions: '0750', createdAt: '2026-09-23 23:07' },
  { id: 'logs', name: 'Logs', path: '/logs', category: 'Registos do Sistema', iconType: 'folder', color: 'text-amber-500', permissions: '0700', createdAt: '2026-09-24 09:17' },
  { id: 'mail', name: 'Mail', path: '/mail', category: 'Correio Eletrónico', iconType: 'mail', color: 'text-blue-500', permissions: '0751', createdAt: '2026-09-08 01:12' },
  { id: 'public_html', name: 'Public_html', path: '/public_html', category: 'Ficheiros Web Públicos', iconType: 'web', color: 'text-sky-500', permissions: '0755', createdAt: '2026-09-25 00:57' },
  { id: 'pdf', name: 'Pdf', path: '/pdf', category: 'Documentos PDF', iconType: 'pdf', color: 'text-rose-500', permissions: '0755', createdAt: '2026-09-19 13:13' },
  { id: 'planilhas', name: 'Planilhas', path: '/planilhas', category: 'Folhas de Cálculo', iconType: 'excel', color: 'text-emerald-500', permissions: '0755', createdAt: '2026-09-20 17:11' },
  { id: 'word', name: 'Word', path: '/word', category: 'Documentos Word', iconType: 'word', color: 'text-blue-600', permissions: '0755', createdAt: '2026-09-23 00:07' },
  { id: 'png', name: 'Png', path: '/png', category: 'Imagens PNG', iconType: 'image', color: 'text-sky-500', permissions: '0755', createdAt: '2026-09-19 03:33' },
  { id: 'jpg', name: 'Jpg', path: '/jpg', category: 'Fotografias JPEG', iconType: 'image', color: 'text-indigo-500', permissions: '0755', createdAt: '2026-09-19 03:47' },
  { id: 'logos', name: 'Logos', path: '/logos', category: 'Logotipos & Marcas', iconType: 'brand', color: 'text-amber-500', permissions: '0755', createdAt: '2026-09-10 11:08' },
  { id: 'projetos_cad', name: 'Projetos_cad', path: '/projetos_cad', category: 'Projetos CAD', iconType: 'cad', color: 'text-purple-500', permissions: '0755', createdAt: '2026-09-02 10:23' },
  { id: 'contratos', name: 'Contratos', path: '/contratos', category: 'Contratos & Jurídico', iconType: 'contract', color: 'text-cyan-600', permissions: '0755', createdAt: '2026-09-19 18:01' },
  { id: 'rh_pessoal', name: 'Rh_pessoal', path: '/rh_pessoal', category: 'RH & Pessoal', iconType: 'rh', color: 'text-teal-500', permissions: '0755', createdAt: '2026-09-19 12:00' },
  { id: 'ssl', name: 'Ssl', path: '/ssl', category: 'Certificados Digitais', iconType: 'folder', color: 'text-amber-500', permissions: '0755', createdAt: '2026-09-25 00:58' },
  { id: 'tmp', name: 'Tmp', path: '/tmp', category: 'Ficheiros Temporários', iconType: 'folder', color: 'text-amber-500', permissions: '0755', createdAt: '2026-09-24 01:24' },
  { id: 'geral', name: 'Geral', path: '/geral', category: 'Geral', iconType: 'folder', color: 'text-neutral-500', permissions: '0755', createdAt: '2026-09-19 03:33' },
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
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
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

  // File Manager Navigation State
  const [currentPath, setCurrentPath] = useState<string>('/'); // '/' is root, '/pdf', '/google-drive', '/trash', etc.
  const [pathInputText, setPathInputText] = useState<string>('/home/lecasu-storage');
  const [history, setHistory] = useState<string[]>(['/']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isTreeExpanded, setIsTreeExpanded] = useState<boolean>(true);
  
  // Selection State
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [selectedGDriveFileIds, setSelectedGDriveFileIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Google Drive In-Place State
  const [googleToken, setGoogleToken] = useState<string | null>(() => getStoredGoogleToken());
  const [gdriveFiles, setGdriveFiles] = useState<GoogleDriveFile[]>([]);
  const [isGdriveLoading, setIsGdriveLoading] = useState<boolean>(false);
  const [isGdriveAuthenticating, setIsGdriveAuthenticating] = useState<boolean>(false);
  const [gdriveImportingId, setGdriveImportingId] = useState<string | null>(null);

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isEmptyTrashModalOpen, setIsEmptyTrashModalOpen] = useState(false);

  // Target item for Rename / Delete / Permissions
  const [renameTarget, setRenameTarget] = useState<{ type: 'file' | 'folder'; id: number | string; name: string } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'file' | 'folder'; id: number | string; name: string } | null>(null);
  const [itemToPermanentDelete, setItemToPermanentDelete] = useState<{ type: 'file' | 'folder'; id: number | string; name: string } | null>(null);
  const [permissionsTarget, setPermissionsTarget] = useState<{ name: string; permissions: string } | null>(null);

  // Form Data for New Folder
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderCategory, setNewFolderCategory] = useState('Geral');

  // Form Data for Rename
  const [renameValue, setRenameValue] = useState('');

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
      const [docsData, kpisData, projectsData, clientsData, foldersData] = await Promise.all([
        fetchDocuments(),
        fetchGEDOverviewKPIs(),
        fetchProjects().catch(() => []),
        fetchClients().catch(() => []),
        fetchGEDFolders().catch(() => [])
      ]);
      setDocuments(docsData);
      setKpis(kpisData);
      setProjects(projectsData);
      setClients(clientsData);
      if (Array.isArray(foldersData) && foldersData.length > 0) {
        setFolders(foldersData);
      }
      if (showToastFeedback) {
        showToast('success', 'Repositório Atualizado', 'Ficheiros e pastas sincronizados com o Neon S3.');
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

  // Sync Path Input display
  useEffect(() => {
    if (currentPath === '/') {
      setPathInputText('/home/lecasu-storage');
    } else if (currentPath === '/trash') {
      setPathInputText('/home/lecasu-storage/.trash');
    } else if (currentPath === '/google-drive') {
      setPathInputText('/cloud/google-drive');
    } else if (currentPath === '/onedrive') {
      setPathInputText('/cloud/onedrive');
    } else {
      setPathInputText(`/home/lecasu-storage${currentPath}`);
    }
  }, [currentPath]);

  // Fetch Google Drive Files In-Place
  const fetchGoogleDriveFiles = async (token: string) => {
    setIsGdriveLoading(true);
    try {
      const q = "trashed = false and mimeType != 'application/vnd.google-apps.folder'";
      const url = `https://www.googleapis.com/drive/v3/files?pageSize=50&fields=files(id,name,mimeType,size,modifiedTime,thumbnailLink,iconLink)&q=${encodeURIComponent(q)}&orderBy=modifiedTime desc`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        if (res.status === 401) {
          removeStoredGoogleToken();
          setGoogleToken(null);
          showToast('error', 'Sessão Google Expirada', 'Por favor, autentique novamente a conta Google.');
          return;
        }
        throw new Error(`Google API: ${res.statusText}`);
      }

      const data = await res.json();
      setGdriveFiles(data.files || []);
    } catch (err: any) {
      console.error('Erro Google Drive:', err);
      showToast('error', 'Google Drive', err.message || 'Erro ao listar arquivos do Google Drive.');
    } finally {
      setIsGdriveLoading(false);
    }
  };

  // Google OAuth In-Place Connect
  const handleConnectGoogleInPlace = () => {
    if (!(window as any).google?.accounts?.oauth2) {
      showToast('error', 'Google OAuth', 'O serviço Google Identity ainda está a inicializar. Tente em 3 segundos.');
      return;
    }

    try {
      setIsGdriveAuthenticating(true);
      const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: async (resp: any) => {
          setIsGdriveAuthenticating(false);
          if (resp.error) {
            showToast('error', 'Erro Google', 'Não foi possível autenticar a conta Google.');
            return;
          }
          if (resp.access_token) {
            setStoredGoogleToken(resp.access_token, resp.expires_in);
            setGoogleToken(resp.access_token);
            showToast('success', 'Google Drive Conectado', 'Acesso autorizado aos ficheiros da cloud.');
            await fetchGoogleDriveFiles(resp.access_token);
          }
        },
        error_callback: (err: any) => {
          setIsGdriveAuthenticating(false);
          console.error('Google Token Client Error:', err);
          showToast('error', 'Autenticação Cancelada', 'Janela de login fechada ou bloqueada.');
        }
      });

      tokenClient.requestAccessToken({ prompt: '' });
    } catch (err: any) {
      setIsGdriveAuthenticating(false);
      showToast('error', 'Erro de Inicialização', err.message || 'Erro ao inicializar Google Auth.');
    }
  };

  useEffect(() => {
    if (currentPath === '/google-drive') {
      const stored = getStoredGoogleToken();
      if (stored) {
        setGoogleToken(stored);
        fetchGoogleDriveFiles(stored);
      }
    }
  }, [currentPath]);

  // Import Google Drive file to Neon S3
  const handleImportGDriveFile = async (driveFile: GoogleDriveFile) => {
    if (!googleToken) {
      handleConnectGoogleInPlace();
      return;
    }
    setGdriveImportingId(driveFile.id);
    try {
      let downloadUrl = `https://www.googleapis.com/drive/v3/files/${driveFile.id}?alt=media`;
      let finalName = driveFile.name;
      let finalMime = driveFile.mimeType;

      if (driveFile.mimeType === 'application/vnd.google-apps.document') {
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${driveFile.id}/export?mimeType=application/pdf`;
        finalMime = 'application/pdf';
        if (!finalName.toLowerCase().endsWith('.pdf')) finalName = `${finalName}.pdf`;
      } else if (driveFile.mimeType === 'application/vnd.google-apps.spreadsheet') {
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${driveFile.id}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
        finalMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        if (!finalName.toLowerCase().endsWith('.xlsx')) finalName = `${finalName}.xlsx`;
      } else if (driveFile.mimeType === 'application/vnd.google-apps.presentation') {
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${driveFile.id}/export?mimeType=application/pdf`;
        finalMime = 'application/pdf';
        if (!finalName.toLowerCase().endsWith('.pdf')) finalName = `${finalName}.pdf`;
      }

      const fileRes = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${googleToken}` }
      });

      if (!fileRes.ok) {
        throw new Error(`Erro ao baixar da Google (${fileRes.status}): ${fileRes.statusText}`);
      }

      const blob = await fileRes.blob();
      const fileObj = new File([blob], finalName, { type: finalMime });

      const data = new FormData();
      data.append('file', fileObj);
      data.append('title', driveFile.name.substring(0, driveFile.name.lastIndexOf('.')) || driveFile.name);
      data.append('category', 'Projetos Técnicos');
      data.append('version', 'v1.0');

      await uploadDocument(data);
      showToast('success', 'Ficheiro Importado', `"${finalName}" sincronizado para o Neon S3.`);
      loadAllData();
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Falha na Importação', err.message || 'Erro ao sincronizar ficheiro.');
    } finally {
      setGdriveImportingId(null);
    }
  };



  // Helper: Categorize document into folder
  const getDocumentFolderId = (doc: GEDDocument): string => {
    const ext = doc.file_name.split('.').pop()?.toLowerCase() || '';
    const cat = (doc.category || '').toLowerCase();

    const customMatch = folders.find(f => f.category.toLowerCase() === cat || f.name.toLowerCase() === cat || f.id.toLowerCase() === cat);
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

  // Documents in current path
  const currentFolderDocuments = useMemo(() => {
    if (currentPath === '/trash') {
      return trashedDocuments;
    }
    if (currentPath === '/google-drive' || currentPath === '/onedrive') {
      return [];
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
        doc.file_name.toLowerCase().includes(term)
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
    setSelectedFolderIds([]);
    setSelectedGDriveFileIds([]);
  };

  const handleGoBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentPath(history[historyIndex - 1]);
      setSelectedDocIds([]);
      setSelectedFolderIds([]);
      setSelectedGDriveFileIds([]);
    }
  };

  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentPath(history[historyIndex + 1]);
      setSelectedDocIds([]);
      setSelectedFolderIds([]);
      setSelectedGDriveFileIds([]);
    }
  };

  const handleUpLevel = () => {
    if (currentPath !== '/') {
      navigateTo('/');
    }
  };

  const handlePathInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pathInputText.trim().toLowerCase();
    if (clean.includes('trash') || clean.includes('lixeira')) {
      navigateTo('/trash');
    } else if (clean.includes('google')) {
      navigateTo('/google-drive');
    } else if (clean.includes('one') || clean.includes('onedrive')) {
      navigateTo('/onedrive');
    } else {
      const matchingFolder = activeFolders.find(f => clean.endsWith(f.name.toLowerCase()) || clean.endsWith(f.id.toLowerCase()));
      if (matchingFolder) {
        navigateTo(matchingFolder.path);
      } else {
        navigateTo('/');
      }
    }
  };

  // Selection Logic
  const handleSelectAll = () => {
    if (currentPath === '/google-drive') {
      setSelectedGDriveFileIds(gdriveFiles.map(f => f.id));
    } else if (currentPath === '/') {
      setSelectedFolderIds(activeFolders.map(f => f.id));
    } else if (currentPath === '/trash') {
      setSelectedFolderIds(trashedFolders.map(f => f.id));
      setSelectedDocIds(trashedDocuments.map(d => d.id));
    } else {
      setSelectedDocIds(currentFolderDocuments.map(d => d.id));
    }
  };

  const handleDeselectAll = () => {
    setSelectedDocIds([]);
    setSelectedFolderIds([]);
    setSelectedGDriveFileIds([]);
  };

  const toggleSelectDoc = (id: number) => {
    setSelectedDocIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
    setSelectedFolderIds([]);
    setSelectedGDriveFileIds([]);
  };

  const toggleSelectFolder = (id: string) => {
    setSelectedFolderIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
    setSelectedDocIds([]);
    setSelectedGDriveFileIds([]);
  };

  const toggleSelectGDriveFile = (id: string) => {
    setSelectedGDriveFileIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
    setSelectedDocIds([]);
    setSelectedFolderIds([]);
  };

  // Check currently selected single item for Top Toolbar Actions
  const selectedSingleDoc = selectedDocIds.length === 1 ? currentFolderDocuments.find(d => d.id === selectedDocIds[0]) || trashedDocuments.find(d => d.id === selectedDocIds[0]) : null;
  const selectedSingleFolder = selectedFolderIds.length === 1 ? activeFolders.find(f => f.id === selectedFolderIds[0]) || trashedFolders.find(f => f.id === selectedFolderIds[0]) : null;
  const selectedSingleGDrive = selectedGDriveFileIds.length === 1 ? gdriveFiles.find(f => f.id === selectedGDriveFileIds[0]) : null;
  const hasSelection = selectedDocIds.length > 0 || selectedFolderIds.length > 0 || selectedGDriveFileIds.length > 0;

  // File Upload Handlers
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
      if (formData.project_id) data.append('project_id', formData.project_id);
      if (formData.client_id) data.append('client_id', formData.client_id);

      await uploadDocument(data);
      showToast('success', 'Ficheiro Carregado', `"${formData.title}" enviado para o Storage.`);
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

  // Create Folder Handler
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFolderName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    if (!cleanName) {
      showToast('error', 'Nome Inválido', 'Insira um nome válido para a pasta.');
      return;
    }

    const formattedCapName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

    if (folders.some(f => f.name.toLowerCase() === formattedCapName.toLowerCase() && !trashedFolderIds.includes(f.id))) {
      showToast('error', 'Pasta Existente', 'Já existe uma pasta com este nome.');
      return;
    }

    const newFolder: CustomFolder = {
      id: cleanName.toLowerCase(),
      name: formattedCapName,
      path: `/${cleanName.toLowerCase()}`,
      category: newFolderCategory,
      iconType: 'folder',
      color: 'text-amber-500',
      permissions: '0755',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    setFolders(prev => [...prev, newFolder]);
    createGEDFolder(cleanName.toLowerCase(), newFolderCategory).catch((err) => {
      console.warn('Erro ao sincronizar pasta no S3:', err);
    });
    setIsNewFolderModalOpen(false);
    setNewFolderName('');
    showToast('success', 'Pasta Criada', `Pasta "${formattedCapName}" criada e sincronizada no Neon S3.`);
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
      showToast('info', 'Movido para a Lixeira', `"${itemToDelete.name}" foi movido.`);
    } else {
      const folderId = itemToDelete.id as string;
      setTrashedFolderIds(prev => [...prev, folderId]);
      setSelectedFolderIds(prev => prev.filter(id => id !== folderId));
      showToast('info', 'Pasta na Lixeira', `A pasta "${itemToDelete.name}" foi movida para a lixeira.`);
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
      showToast('success', 'Restaurado', `"${item.name}" foi recuperado.`);
    } else {
      const folderId = item.id as string;
      setTrashedFolderIds(prev => prev.filter(id => id !== folderId));
      showToast('success', 'Pasta Restaurada', `"${item.name}" foi recuperada.`);
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
        showToast('success', 'Eliminado Definitivamente', `"${itemToPermanentDelete.name}" foi apagado.`);
      } catch (err: any) {
        showToast('error', 'Erro ao Eliminar', err.message || 'Falha ao excluir arquivo.');
      }
    } else {
      const folderId = itemToPermanentDelete.id as string;
      deleteGEDFolder(folderId).catch((err) => {
        console.warn('Erro ao deletar pasta no S3:', err);
      });
      setFolders(prev => prev.filter(f => f.id !== folderId));
      setTrashedFolderIds(prev => prev.filter(id => id !== folderId));
      showToast('success', 'Pasta Eliminada', `A pasta "${itemToPermanentDelete.name}" foi excluída do Neon S3.`);
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
      showToast('success', 'Lixeira Esvaziada', 'Todos os ficheiros da lixeira foram permanentemente eliminados.');
      loadAllData();
    } catch (err: any) {
      showToast('error', 'Erro ao Esvaziar', err.message || 'Falha ao esvaziar lixeira.');
    }
  };

  // Rename
  const handleOpenRename = (item: { type: 'file' | 'folder'; id: number | string; name: string }) => {
    setRenameTarget(item);
    setRenameValue(item.name);
    setIsRenameModalOpen(true);
  };

  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;

    if (renameTarget.type === 'file') {
      const docId = renameTarget.id as number;
      try {
        await updateDocument(docId, {
          title: renameValue.trim()
        });
        setDocuments(prev => prev.map(d => d.id === docId ? { ...d, title: renameValue.trim() } : d));
        showToast('success', 'Ficheiro Renomeado', `"${renameValue}" atualizado.`);
        setIsRenameModalOpen(false);
      } catch (err: any) {
        showToast('error', 'Erro ao Renomear', err.message || 'Falha ao atualizar nome.');
      }
    } else {
      const folderId = renameTarget.id as string;
      const formatted = renameValue.trim().charAt(0).toUpperCase() + renameValue.trim().slice(1);
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: formatted } : f));
      showToast('success', 'Pasta Renomeada', `Pasta atualizada para "${formatted}".`);
      setIsRenameModalOpen(false);
    }
  };

  // Top Toolbar Action Handlers for Selected Item
  const handleToolbarDownload = () => {
    if (selectedSingleDoc) {
      downloadDocument(selectedSingleDoc.id, selectedSingleDoc.file_name).catch(() => {
        showToast('error', 'Erro no Download', 'Não foi possível descarregar o arquivo.');
      });
    } else if (selectedSingleGDrive) {
      handleImportGDriveFile(selectedSingleGDrive);
    }
  };

  const handleToolbarDelete = () => {
    if (currentPath === '/trash') {
      if (selectedSingleDoc) {
        handlePermanentDelete({ type: 'file', id: selectedSingleDoc.id, name: selectedSingleDoc.title });
      } else if (selectedSingleFolder) {
        handlePermanentDelete({ type: 'folder', id: selectedSingleFolder.id, name: selectedSingleFolder.name });
      }
    } else {
      if (selectedSingleDoc) {
        handleMoveToTrash({ type: 'file', id: selectedSingleDoc.id, name: selectedSingleDoc.title });
      } else if (selectedSingleFolder) {
        handleMoveToTrash({ type: 'folder', id: selectedSingleFolder.id, name: selectedSingleFolder.name });
      }
    }
  };

  const handleToolbarRestore = () => {
    if (selectedSingleDoc) {
      handleRestoreItem({ type: 'file', id: selectedSingleDoc.id, name: selectedSingleDoc.title });
    } else if (selectedSingleFolder) {
      handleRestoreItem({ type: 'folder', id: selectedSingleFolder.id, name: selectedSingleFolder.name });
    }
  };

  const handleToolbarRename = () => {
    if (selectedSingleDoc) {
      handleOpenRename({ type: 'file', id: selectedSingleDoc.id, name: selectedSingleDoc.title });
    } else if (selectedSingleFolder) {
      handleOpenRename({ type: 'folder', id: selectedSingleFolder.id, name: selectedSingleFolder.name });
    }
  };

  const handleToolbarPermissions = () => {
    if (selectedSingleFolder) {
      setPermissionsTarget({ name: selectedSingleFolder.name, permissions: selectedSingleFolder.permissions || '0755' });
      setIsPermissionsModalOpen(true);
    } else if (selectedSingleDoc) {
      setPermissionsTarget({ name: selectedSingleDoc.title, permissions: '0644' });
      setIsPermissionsModalOpen(true);
    }
  };

  const handleToolbarView = () => {
    if (selectedSingleDoc) {
      window.open(`/api/v1/ged/documents/${selectedSingleDoc.id}/download`, '_blank');
    }
  };

  // Folder Icon rendering
  const renderFolderIcon = (iconType: string, className = "w-4 h-4 text-amber-500") => {
    if (iconType === 'mail') return <Mail className="w-4 h-4 text-blue-600" />;
    if (iconType === 'web') return <Globe className="w-4 h-4 text-sky-500" />;
    if (iconType === 'pdf') return <Folder className={`${className} fill-amber-400/20`} />;
    if (iconType === 'excel') return <Folder className={`${className} fill-amber-400/20`} />;
    if (iconType === 'word') return <Folder className={`${className} fill-amber-400/20`} />;
    if (iconType === 'image') return <Folder className={`${className} fill-amber-400/20`} />;
    if (iconType === 'cad') return <Folder className={`${className} fill-amber-400/20`} />;
    if (iconType === 'contract') return <Folder className={`${className} fill-amber-400/20`} />;
    if (iconType === 'rh') return <Folder className={`${className} fill-amber-400/20`} />;
    return <Folder className={`${className} fill-amber-400/20`} />;
  };

  // File Icon
  const getFileRowIcon = (fileName: string, mimeType?: string | null) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf' || mimeType?.includes('pdf')) return <FileText className="w-4 h-4 text-rose-500 shrink-0" />;
    if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext) || mimeType?.includes('image')) return <FileImage className="w-4 h-4 text-blue-500 shrink-0" />;
    if (['xlsx', 'xls', 'csv'].includes(ext) || mimeType?.includes('spreadsheet')) return <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />;
    if (['doc', 'docx'].includes(ext) || mimeType?.includes('word')) return <FileText className="w-4 h-4 text-blue-600 shrink-0" />;
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext) || mimeType?.includes('zip')) return <FileArchive className="w-4 h-4 text-amber-600 shrink-0" />;
    if (['js', 'ts', 'py', 'json', 'html', 'css', 'sql'].includes(ext)) return <FileCode className="w-4 h-4 text-purple-500 shrink-0" />;
    if (['dwg', 'dxf'].includes(ext)) return <Compass className="w-4 h-4 text-purple-600 shrink-0" />;
    return <FileIcon className="w-4 h-4 text-slate-500 shrink-0" />;
  };

  // cPanel Size Formatting
  const formatCPanelSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '0 de bytes';
    if (bytes < 1024) return `${bytes} de bytes`;
    if (bytes < 1024 * 1024) {
      const kb = (bytes / 1024).toFixed(2).replace('.', ',');
      return `${kb} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      const mb = (bytes / (1024 * 1024)).toFixed(2).replace('.', ',');
      return `${mb} MB`;
    }
    const gb = (bytes / (1024 * 1024 * 1024)).toFixed(2).replace('.', ',');
    return `${gb} GB`;
  };

  // cPanel MIME / Type Formatting
  const getCPanelType = (fileName: string, mimeType?: string | null, isDir = false): string => {
    if (isDir) return 'httpd/unix-directory';
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf' || mimeType?.includes('pdf')) return 'application/pdf';
    if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext) || mimeType?.includes('image')) return `image/${ext || 'jpeg'}`;
    if (['xlsx', 'xls'].includes(ext) || mimeType?.includes('spreadsheet')) return 'application/vnd.ms-excel';
    if (['doc', 'docx'].includes(ext) || mimeType?.includes('word')) return 'application/msword';
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return 'package/x-generic';
    if (ext === 'mail' || ext === 'msg') return 'mail';
    if (ext === 'html' || ext === 'htm') return 'publichtml';
    if (['dwg', 'dxf'].includes(ext)) return 'application/acad';
    return mimeType || 'application/octet-stream';
  };

  // cPanel Date Formatting
  const formatCPanelDate = (dateStr?: string | null): string => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const timeStr = d.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Hoje ${timeStr}`;
    if (isYesterday) return `Ontem ${timeStr}`;

    return d.toLocaleDateString('pt-MZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const trashTotalCount = trashedDocuments.length + trashedFolders.length;

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] min-h-[580px] font-sans select-none gap-2">
      <Toast 
        toasts={toasts} 
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} 
      />

      {/* =========================================================================
          1. TOP ACTION TOOLBAR (Image 3 Style: File Manager Top Actions Bar)
         ========================================================================= */}
      <div className="bg-[#2B303A] text-white border-b border-[#1E222A] rounded-t-lg px-2 py-1.5 shadow-xs flex items-center gap-1 shrink-0 overflow-x-auto scrollbar-none text-[12px]">
        
        {/* + Arquivo */}
        <button
          type="button"
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-white/10 transition cursor-pointer text-slate-100 active:scale-95"
          title="Criar / Carregar Novo Ficheiro"
        >
          <Plus size={14} className="text-white font-bold" />
          <span className="font-semibold">Arquivo</span>
        </button>

        {/* + Pasta */}
        <button
          type="button"
          onClick={() => setIsNewFolderModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-white/10 transition cursor-pointer text-slate-100 active:scale-95"
          title="Criar Nova Pasta"
        >
          <Plus size={14} className="text-white font-bold" />
          <span className="font-semibold">Pasta</span>
        </button>

        <div className="h-4 w-px bg-white/20 mx-1 shrink-0" />

        {/* Copiar */}
        <button
          type="button"
          disabled={!hasSelection}
          onClick={() => showToast('info', 'Área de Transferência', 'Elemento copiado para a memória.')}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 transition cursor-pointer text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Copiar"
        >
          <Copy size={13} />
          <span>Copiar</span>
        </button>

        {/* Mover */}
        <button
          type="button"
          disabled={!hasSelection}
          onClick={() => showToast('info', 'Mover Ficheiro', 'Selecione a pasta de destino.')}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 transition cursor-pointer text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Mover"
        >
          <Move size={13} />
          <span>Mover</span>
        </button>

        {/* Carregar */}
        <button
          type="button"
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 transition cursor-pointer text-slate-200"
          title="Carregar ficheiro para esta pasta"
        >
          <UploadCloud size={13} />
          <span>Carregar</span>
        </button>

        {/* Download */}
        <button
          type="button"
          disabled={!selectedSingleDoc && !selectedSingleGDrive}
          onClick={handleToolbarDownload}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 transition cursor-pointer text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Descarregar ficheiro selecionado"
        >
          <Download size={13} />
          <span>Download</span>
        </button>

        {/* Excluir */}
        <button
          type="button"
          disabled={!hasSelection}
          onClick={handleToolbarDelete}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-rose-500/30 text-rose-200 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title="Excluir item selecionado"
        >
          <X size={14} className="text-rose-400 font-bold" />
          <span>Excluir</span>
        </button>

        {/* Restaurar */}
        {currentPath === '/trash' && (
          <button
            type="button"
            disabled={!hasSelection}
            onClick={handleToolbarRestore}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-emerald-500/30 text-emerald-200 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Restaurar item selecionado"
          >
            <RotateCcw size={13} />
            <span>Restaurar</span>
          </button>
        )}

        <div className="h-4 w-px bg-white/20 mx-1 shrink-0" />

        {/* Renomear */}
        <button
          type="button"
          disabled={!selectedSingleDoc && !selectedSingleFolder}
          onClick={handleToolbarRename}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 transition cursor-pointer text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Renomear item selecionado"
        >
          <Edit2 size={13} />
          <span>Renomear</span>
        </button>

        {/* Editar */}
        <button
          type="button"
          disabled={!selectedSingleDoc}
          onClick={handleToolbarRename}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 transition cursor-pointer text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Editar Ficheiro"
        >
          <Edit2 size={13} />
          <span>Editar</span>
        </button>

        {/* Permissões */}
        <button
          type="button"
          disabled={!selectedSingleDoc && !selectedSingleFolder}
          onClick={handleToolbarPermissions}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 transition cursor-pointer text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Alterar Permissões (chmod)"
        >
          <Key size={13} />
          <span>Permissões</span>
        </button>

        {/* Visualizar */}
        <button
          type="button"
          disabled={!selectedSingleDoc}
          onClick={handleToolbarView}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 transition cursor-pointer text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Visualizar Ficheiro"
        >
          <Eye size={13} />
          <span>Visualizar</span>
        </button>
      </div>

      {/* =========================================================================
          2. SUB-TOOLBAR / NAVIGATION BAR (Image 1 Style)
         ========================================================================= */}
      <div className="bg-white border border-[#E2E2DE] px-3 py-1.5 rounded-b-lg shadow-2xs flex items-center justify-between gap-3 shrink-0 overflow-x-auto scrollbar-none text-[12px] text-sky-700">
        
        {/* Navigation Group */}
        <div className="flex items-center gap-3 shrink-0 flex-nowrap">
          
          {/* Início */}
          <button
            type="button"
            onClick={() => navigateTo('/')}
            className="flex items-center gap-1 hover:text-sky-900 transition cursor-pointer"
            title="Ir para o Início (/)"
          >
            <Home size={14} className="text-sky-600" />
            <span className="font-semibold">Início</span>
          </button>

          {/* Subir Um Nível */}
          <button
            type="button"
            onClick={handleUpLevel}
            disabled={currentPath === '/'}
            className="flex items-center gap-1 hover:text-sky-900 transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            title="Subir um nível de diretório"
          >
            <ArrowUp size={14} className="text-sky-600" />
            <span>Subir Um Nível</span>
          </button>

          {/* Voltar */}
          <button
            type="button"
            onClick={handleGoBack}
            disabled={historyIndex === 0}
            className="flex items-center gap-1 hover:text-sky-900 transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            title="Voltar"
          >
            <ArrowLeft size={14} className="text-sky-600" />
            <span>Voltar</span>
          </button>

          {/* Encaminhar */}
          <button
            type="button"
            onClick={handleGoForward}
            disabled={historyIndex >= history.length - 1}
            className="flex items-center gap-1 hover:text-sky-900 transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            title="Encaminhar"
          >
            <ArrowRight size={14} className="text-sky-600" />
            <span>Encaminhar</span>
          </button>

          {/* Recarregar */}
          <button
            type="button"
            onClick={() => {
              loadAllData(true);
              if (currentPath === '/google-drive' && googleToken) {
                fetchGoogleDriveFiles(googleToken);
              }
            }}
            disabled={isLoading || isGdriveLoading}
            className="flex items-center gap-1 hover:text-sky-900 transition cursor-pointer"
            title="Recarregar dados"
          >
            <RefreshCw size={13} className={`text-sky-600 ${isLoading || isGdriveLoading ? 'animate-spin' : ''}`} />
            <span>Recarregar</span>
          </button>

          {/* Selecionar Tudo */}
          <button
            type="button"
            onClick={handleSelectAll}
            className="flex items-center gap-1 hover:text-sky-900 transition cursor-pointer ml-2"
            title="Selecionar todos os itens da tabela"
          >
            <CheckSquare size={13} className="text-sky-600" />
            <span>Selecionar Tudo</span>
          </button>

          {/* Desmarcar Tudo */}
          <button
            type="button"
            onClick={handleDeselectAll}
            disabled={!hasSelection}
            className="flex items-center gap-1 hover:text-sky-900 transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            title="Desmarcar seleção"
          >
            <Square size={13} className="text-sky-600" />
            <span>Desmarcar Tudo</span>
          </button>
        </div>

        {/* Trash Group & Search */}
        <div className="flex items-center gap-3 shrink-0 flex-nowrap">
          <div className="h-4 w-px bg-neutral-200 shrink-0" />

          {/* Ver Lixeira */}
          <button
            type="button"
            onClick={() => navigateTo('/trash')}
            className={`flex items-center gap-1 transition cursor-pointer ${
              currentPath === '/trash' ? 'text-rose-700 font-bold' : 'hover:text-rose-600 text-sky-700'
            }`}
            title="Ver lixeira"
          >
            <Trash2 size={14} className={trashTotalCount > 0 ? 'text-rose-500' : 'text-sky-600'} />
            <span>Ver lixeira</span>
            {trashTotalCount > 0 && (
              <span className="bg-rose-500 text-white rounded-full px-1.5 py-0.2 text-[10px] font-bold">
                {trashTotalCount}
              </span>
            )}
          </button>

          {/* Esvaziar Lixeira */}
          <button
            type="button"
            onClick={() => setIsEmptyTrashModalOpen(true)}
            disabled={trashTotalCount === 0}
            className="flex items-center gap-1 hover:text-rose-700 transition cursor-pointer text-slate-600 disabled:opacity-35 disabled:cursor-not-allowed"
            title="Esvaziar toda a lixeira"
          >
            <Trash2 size={13} />
            <span>Esvaziar Lixeira</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          3. CORPO PRINCIPAL: ÁRVORE À ESQUERDA + TABELA À DIREITA (Image 1 & 2)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 flex-1 min-h-0 overflow-hidden">
        
        {/* -----------------------------------------------------------------------
            PAINEL ESQUERDO: ÁRVORE DE DIRETÓRIOS (Image 2 Style)
           ----------------------------------------------------------------------- */}
        <div className="lg:col-span-3 xl:col-span-3 bg-white border border-[#E2E2DE] rounded-lg shadow-2xs flex flex-col h-full min-h-0 overflow-hidden text-xs">
          
          {/* Top Path Input Box + "Ir" Button (Image 2 Header) */}
          <form onSubmit={handlePathInputSubmit} className="p-2 border-b border-[#E2E2DE] flex items-center gap-1.5 bg-[#FAFAF9] shrink-0">
            <button
              type="button"
              onClick={() => navigateTo('/')}
              className="p-1.5 text-neutral-600 hover:text-neutral-900 border border-[#E2E2DE] rounded bg-white shadow-2xs shrink-0"
              title="Ir para a Raiz"
            >
              <Home size={14} />
            </button>
            <input
              type="text"
              value={pathInputText}
              onChange={(e) => setPathInputText(e.target.value)}
              className="flex-1 px-2 py-1 bg-white border border-[#E2E2DE] rounded text-[11px] font-mono text-neutral-800 focus:outline-none focus:ring-1 focus:ring-sky-500 min-w-0"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-white border border-[#E2E2DE] hover:bg-neutral-100 rounded text-[11px] font-semibold text-neutral-700 shrink-0 shadow-2xs"
            >
              Ir
            </button>
          </form>

          {/* Full-width "Reduzir Tudo" / "Expandir Tudo" Button (Image 2) */}
          <div className="px-2 py-1.5 border-b border-[#E2E2DE] bg-white shrink-0">
            <button
              type="button"
              onClick={() => setIsTreeExpanded(!isTreeExpanded)}
              className="w-full py-1 border border-[#E2E2DE] rounded bg-white hover:bg-neutral-50 text-[11px] font-semibold text-neutral-700 text-center shadow-2xs transition"
            >
              {isTreeExpanded ? 'Reduzir Tudo' : 'Expandir Tudo'}
            </button>
          </div>

          {/* Directory Tree Explorer Hierarchy (Image 2) */}
          <div className="p-2 space-y-1 flex-1 min-h-0 overflow-y-auto font-sans">
            
            {/* Root Node: − 📁 🏠 (/home/lecasu-storage) */}
            <div
              onClick={() => navigateTo('/')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition ${
                currentPath === '/' ? 'bg-sky-100/70 text-sky-900 font-bold' : 'hover:bg-neutral-100 text-neutral-800'
              }`}
            >
              <span className="font-mono text-neutral-400 font-bold select-none">−</span>
              <Folder className="w-4 h-4 text-amber-500 fill-amber-400/20" />
              <Home size={13} className="text-neutral-600" />
              <span className="font-mono text-[11px] font-semibold truncate">
                (/home/lecasu-storage)
              </span>
            </div>

            {/* Folder Children List */}
            {isTreeExpanded && (
              <div className="pl-4 space-y-0.5 border-l border-neutral-200 ml-3.5 my-0.5">
                {activeFolders.map((folder) => {
                  const isActive = currentPath === folder.path;
                  return (
                    <div
                      key={folder.id}
                      onClick={() => navigateTo(folder.path)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition ${
                        isActive ? 'bg-sky-100 text-sky-900 font-bold' : 'hover:bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      <span className="font-mono text-neutral-400 text-[11px] select-none">+</span>
                      {renderFolderIcon(folder.iconType)}
                      <span className="text-[12px] truncate capitalize font-medium">
                        {folder.name}
                      </span>
                    </div>
                  );
                })}

                {/* Cloud & Special items in tree */}
                <div
                  onClick={() => navigateTo('/google-drive')}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition ${
                    currentPath === '/google-drive' ? 'bg-blue-100 text-blue-900 font-bold' : 'hover:bg-neutral-100 text-neutral-700'
                  }`}
                >
                  <span className="font-mono text-neutral-400 text-[11px] select-none">+</span>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 87.3 78" fill="none">
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.9 2.5 3.2 3.3l16.3-28.2H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/>
                    <path d="M43.65 25 29.8 1c-1.3.8-2.4 1.9-3.2 3.3L1.2 48.2c-.8 1.4-1.2 2.95-1.2 4.5h29.95z" fill="#00AC47"/>
                    <path d="m73.55 76.8c1.3-.8 2.4-1.9 3.2-3.3l1.6-2.75 7.75-13.45c.8-1.4 1.2-2.95 1.2-4.5H57.35l6.55 11.35z" fill="#EA4335"/>
                    <path d="M43.65 25 57.5 1c-1.3-.8-2.4-1.9-3.2-3.3H33c-1.55 0-3.1.4-4.5 1.2z" fill="#00832D"/>
                    <path d="M87.3 48.2 72.8 23.05c-.8-1.4-1.9-2.5-3.2-3.3L57.5 44.9h29.8z" fill="#FFBA00"/>
                    <path d="M57.35 44.9H27.45L13.65 68.8c.8 1.4 1.9 2.5 3.2 3.3h53.7c1.55 0 3.1-.4 4.5-1.2z" fill="#2684FC"/>
                  </svg>
                  <span className="text-[12px] font-medium truncate">
                    Google Drive
                  </span>
                  {googleToken && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-auto" />}
                </div>

                <div
                  onClick={() => navigateTo('/onedrive')}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition ${
                    currentPath === '/onedrive' ? 'bg-blue-100 text-blue-900 font-bold' : 'hover:bg-neutral-100 text-neutral-700'
                  }`}
                >
                  <span className="font-mono text-neutral-400 text-[11px] select-none">+</span>
                  <svg className="w-4 h-4 shrink-0 text-[#0078D4]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"/>
                  </svg>
                  <span className="text-[12px] font-medium truncate">
                    OneDrive
                  </span>
                </div>

                <div
                  onClick={() => navigateTo('/trash')}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition ${
                    currentPath === '/trash' ? 'bg-rose-100 text-rose-900 font-bold' : 'hover:bg-neutral-100 text-neutral-700'
                  }`}
                >
                  <span className="font-mono text-neutral-400 text-[11px] select-none">+</span>
                  <Trash2 size={13} className={currentPath === '/trash' ? 'text-rose-600' : 'text-neutral-400'} />
                  <span className="text-[12px] font-medium truncate">
                    Lixeira
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="p-2 bg-[#FAFAF9] border-t border-[#E2E2DE] text-[11px] text-neutral-500 shrink-0 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <HardDrive size={12} className="text-neutral-500" />
              <span>Storage</span>
            </span>
            <span className="font-mono font-semibold text-neutral-700">{kpis.total_storage_formatted}</span>
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            PAINEL DIREITO: TABELA PRINCIPAL DE FICHEIROS (Image 1 Style)
           ----------------------------------------------------------------------- */}
        <div className="lg:col-span-9 xl:col-span-9 bg-white border border-[#E2E2DE] rounded-lg shadow-2xs flex flex-col h-full min-h-0 overflow-hidden">
          
          {/* Quick Filter Search Input */}
          <div className="px-3 py-1.5 bg-[#FAFAF9] border-b border-[#E2E2DE] flex items-center justify-between gap-2 shrink-0">
            <div className="text-[12px] text-neutral-700 font-semibold truncate flex items-center gap-1.5">
              <span className="text-neutral-400 font-mono">Diretório:</span>
              <span className="font-mono text-sky-800 font-bold">
                {currentPath === '/' ? '/ (Raiz)' : currentPath}
              </span>
            </div>

            <div className="relative w-48 sm:w-60 shrink-0">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar ficheiros..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 bg-white border border-[#E2E2DE] rounded text-[11px] text-[#101010] placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto relative">
            <table className="w-full text-left border-collapse select-none">
              
              {/* Header: Nome | Tamanho | Last Modified | Digitar | Permissões (Image 1) */}
              <thead className="sticky top-0 bg-[#F4F8FA] border-b border-[#CCE2F0] z-10 text-[12px] font-semibold text-sky-800">
                <tr>
                  <th className="py-2 px-3">Nome</th>
                  <th className="py-2 px-3 w-32">Tamanho</th>
                  <th className="py-2 px-3 w-48">Last Modified</th>
                  <th className="py-2 px-3 w-44">Digitar</th>
                  <th className="py-2 px-3 w-28 text-right">Permissões</th>
                </tr>
              </thead>

              <tbody className="text-[12px] text-neutral-700 divide-y divide-[#F0F4F8]">
                
                {/* 1. UP ONE LEVEL ROW (.. diretório anterior) */}
                {currentPath !== '/' && currentPath !== '/trash' && currentPath !== '/google-drive' && currentPath !== '/onedrive' && !searchTerm && (
                  <tr
                    onDoubleClick={handleUpLevel}
                    onClick={handleUpLevel}
                    className="hover:bg-[#EBF5FB] transition-colors cursor-pointer group"
                    title="Duplo clique para subir"
                  >
                    <td className="py-1.5 px-3 flex items-center gap-2">
                      <Folder className="w-4 h-4 text-amber-500 fill-amber-400/20 shrink-0" />
                      <span className="font-semibold text-neutral-800 group-hover:text-sky-700">.. (Diretório Anterior)</span>
                    </td>
                    <td className="py-1.5 px-3 font-mono text-[11px] text-neutral-400">—</td>
                    <td className="py-1.5 px-3 text-[11px] text-neutral-400">—</td>
                    <td className="py-1.5 px-3 text-[11px] text-neutral-400">httpd/unix-directory</td>
                    <td className="py-1.5 px-3 text-right font-mono text-[11px] text-neutral-400">0755</td>
                  </tr>
                )}

                {/* 2. GOOGLE DRIVE IN-PLACE VIEW */}
                {currentPath === '/google-drive' && (
                  <>
                    {!googleToken ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
                            <svg className="w-12 h-12" viewBox="0 0 87.3 78" fill="none">
                              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.9 2.5 3.2 3.3l16.3-28.2H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/>
                              <path d="M43.65 25 29.8 1c-1.3.8-2.4 1.9-3.2 3.3L1.2 48.2c-.8 1.4-1.2 2.95-1.2 4.5h29.95z" fill="#00AC47"/>
                              <path d="m73.55 76.8c1.3-.8 2.4-1.9 3.2-3.3l1.6-2.75 7.75-13.45c.8-1.4 1.2-2.95 1.2-4.5H57.35l6.55 11.35z" fill="#EA4335"/>
                              <path d="M43.65 25 57.5 1c-1.3-.8-2.4-1.9-3.2-3.3H33c-1.55 0-3.1.4-4.5 1.2z" fill="#00832D"/>
                              <path d="M87.3 48.2 72.8 23.05c-.8-1.4-1.9-2.5-3.2-3.3L57.5 44.9h29.8z" fill="#FFBA00"/>
                              <path d="M57.35 44.9H27.45L13.65 68.8c.8 1.4 1.9 2.5 3.2 3.3h53.7c1.55 0 3.1-.4 4.5-1.2z" fill="#2684FC"/>
                            </svg>
                            <h4 className="text-sm font-bold text-neutral-800">Conectar Google Drive</h4>
                            <p className="text-xs text-neutral-500">
                              Inicie sessão com a sua conta Google para listar e importar ficheiros diretamente para a tabela.
                            </p>
                            <button
                              type="button"
                              onClick={handleConnectGoogleInPlace}
                              disabled={isGdriveAuthenticating}
                              className="px-4 py-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white font-semibold rounded-lg text-xs flex items-center gap-2 shadow-xs cursor-pointer"
                            >
                              {isGdriveAuthenticating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud size={14} />}
                              <span>Iniciar Sessão Google</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : isGdriveLoading ? (
                      <tr>
                        <td colSpan={5} className="py-14 text-center text-neutral-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 text-sky-600 animate-spin" />
                            <span className="text-xs">A carregar ficheiros do Google Drive...</span>
                          </div>
                        </td>
                      </tr>
                    ) : gdriveFiles.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-14 text-center text-neutral-400">
                          <p className="text-xs">Nenhum ficheiro encontrado no Google Drive.</p>
                        </td>
                      </tr>
                    ) : (
                      gdriveFiles.map((gf) => {
                        const isSelected = selectedGDriveFileIds.includes(gf.id);
                        return (
                          <tr
                            key={gf.id}
                            onClick={() => toggleSelectGDriveFile(gf.id)}
                            onDoubleClick={() => handleImportGDriveFile(gf)}
                            className={`transition-colors cursor-pointer ${
                              isSelected ? 'bg-[#D9EDF7] font-semibold text-sky-900' : 'hover:bg-[#EBF5FB]'
                            }`}
                          >
                            <td className="py-1.5 px-3 flex items-center gap-2">
                              {getFileRowIcon(gf.name, gf.mimeType)}
                              <span className="truncate max-w-sm">{gf.name}</span>
                              {gdriveImportingId === gf.id && (
                                <Loader2 className="w-3.5 h-3.5 text-sky-600 animate-spin ml-2" />
                              )}
                            </td>
                            <td className="py-1.5 px-3 font-mono text-[11px] text-neutral-600">
                              {gf.size ? formatCPanelSize(parseInt(gf.size, 10)) : '—'}
                            </td>
                            <td className="py-1.5 px-3 text-[11px] text-neutral-600">
                              {formatCPanelDate(gf.modifiedTime)}
                            </td>
                            <td className="py-1.5 px-3 text-[11px] text-neutral-600 font-mono truncate max-w-xs">
                              {gf.mimeType}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono text-[11px] text-neutral-600">
                              0644
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </>
                )}

                {/* 3. ONEDRIVE IN-PLACE VIEW */}
                {currentPath === '/onedrive' && (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                        <svg className="w-12 h-12 text-[#0078D4]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"/>
                        </svg>
                        <h4 className="text-sm font-bold text-neutral-800">Microsoft OneDrive</h4>
                        <p className="text-xs text-neutral-500">
                          Integração via Microsoft Graph API configurada no servidor backend.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}

                {/* 4. LIST FOLDERS IF IN ROOT (/) - Image 1 Style */}
                {currentPath === '/' && !searchTerm && activeFolders.map((folder) => {
                  const isFolderSelected = selectedFolderIds.includes(folder.id);
                  return (
                    <tr
                      key={folder.id}
                      onClick={() => toggleSelectFolder(folder.id)}
                      onDoubleClick={() => navigateTo(folder.path)}
                      className={`transition-colors cursor-pointer group ${
                        isFolderSelected ? 'bg-[#D9EDF7] font-semibold text-sky-900' : 'hover:bg-[#EBF5FB]'
                      }`}
                    >
                      <td className="py-1.5 px-3 flex items-center gap-2">
                        {renderFolderIcon(folder.iconType)}
                        <span className="text-neutral-900 font-medium group-hover:text-sky-800 capitalize">
                          {folder.name}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 font-mono text-[11px] text-neutral-600">
                        4 KB
                      </td>
                      <td className="py-1.5 px-3 text-[11px] text-neutral-600">
                        {formatCPanelDate(folder.createdAt)}
                      </td>
                      <td className="py-1.5 px-3 text-[11px] text-neutral-600 font-mono">
                        {folder.iconType === 'mail' ? 'mail' : folder.iconType === 'web' ? 'publichtml' : 'httpd/unix-directory'}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-[11px] text-neutral-600">
                        {folder.permissions || '0755'}
                      </td>
                    </tr>
                  );
                })}

                {/* 5. LIST TRASHED FOLDERS IF IN TRASH */}
                {currentPath === '/trash' && trashedFolders.map((tf) => {
                  const isFolderSelected = selectedFolderIds.includes(tf.id);
                  return (
                    <tr
                      key={tf.id}
                      onClick={() => toggleSelectFolder(tf.id)}
                      className={`transition-colors cursor-pointer ${
                        isFolderSelected ? 'bg-rose-100 font-semibold text-rose-900' : 'hover:bg-rose-50/50'
                      }`}
                    >
                      <td className="py-1.5 px-3 flex items-center gap-2">
                        <Folder className="w-4 h-4 text-rose-500 fill-rose-400/20 shrink-0" />
                        <span className="text-rose-900 font-medium capitalize">{tf.name} (Pasta Eliminada)</span>
                      </td>
                      <td className="py-1.5 px-3 font-mono text-[11px] text-neutral-600">4 KB</td>
                      <td className="py-1.5 px-3 text-[11px] text-neutral-600">{formatCPanelDate(tf.createdAt)}</td>
                      <td className="py-1.5 px-3 text-[11px] text-rose-600 font-mono">httpd/unix-directory</td>
                      <td className="py-1.5 px-3 text-right font-mono text-[11px] text-neutral-600">{tf.permissions || '0755'}</td>
                    </tr>
                  );
                })}

                {/* 6. LIST FILES */}
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-14 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 text-sky-600 animate-spin" />
                        <span className="text-xs">A sincronizar ficheiros...</span>
                      </div>
                    </td>
                  </tr>
                ) : currentFolderDocuments.length === 0 && (currentPath !== '/' || searchTerm) && currentPath !== '/google-drive' && currentPath !== '/onedrive' ? (
                  <tr>
                    <td colSpan={5} className="py-14 text-center text-neutral-400">
                      <p className="text-xs">
                        {currentPath === '/trash' ? 'A lixeira está vazia.' : 'Esta pasta não contém ficheiros.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  currentFolderDocuments.map((doc) => {
                    const isSelected = selectedDocIds.includes(doc.id);
                    return (
                      <tr
                        key={doc.id}
                        onClick={() => toggleSelectDoc(doc.id)}
                        onDoubleClick={() => downloadDocument(doc.id, doc.file_name)}
                        className={`transition-colors cursor-pointer group ${
                          isSelected ? 'bg-[#D9EDF7] font-semibold text-sky-900' : 'hover:bg-[#EBF5FB]'
                        }`}
                      >
                        {/* Nome (Only Clean Title / Name) */}
                        <td className="py-1.5 px-3 flex items-center gap-2">
                          {getFileRowIcon(doc.file_name, doc.mime_type)}
                          <span className="text-neutral-900 group-hover:text-sky-800 truncate max-w-md">
                            {doc.title}
                          </span>
                        </td>

                        {/* Tamanho */}
                        <td className="py-1.5 px-3 font-mono text-[11px] text-neutral-600">
                          {formatCPanelSize(doc.file_size_bytes)}
                        </td>

                        {/* Last Modified */}
                        <td className="py-1.5 px-3 text-[11px] text-neutral-600">
                          {formatCPanelDate(doc.created_at)}
                        </td>

                        {/* Digitar (MIME / Type) */}
                        <td className="py-1.5 px-3 text-[11px] text-neutral-600 font-mono truncate max-w-xs">
                          {getCPanelType(doc.file_name, doc.mime_type)}
                        </td>

                        {/* Permissões */}
                        <td className="py-1.5 px-3 text-right font-mono text-[11px] text-neutral-600">
                          0644
                        </td>
                      </tr>
                    );
                  })
                )}

              </tbody>
            </table>
          </div>

          {/* Footer Summary (Image 1 Bottom Status Bar) */}
          <div className="px-3 py-1.5 bg-[#FAFAF9] border-t border-[#E2E2DE] flex items-center justify-between text-[11px] text-neutral-500 shrink-0 font-sans">
            <div className="flex items-center gap-3">
              <span>
                <strong>{currentFolderDocuments.length + (currentPath === '/' ? activeFolders.length : 0)}</strong> elementos no diretório
              </span>
              {hasSelection && (
                <span className="text-sky-700 font-bold">
                  ({selectedDocIds.length + selectedFolderIds.length + selectedGDriveFileIds.length} selecionado(s))
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <ShieldCheck size={13} className="text-emerald-600" />
              <span>Storage Neon S3</span>
            </div>
          </div>

        </div>
      </div>

      {/* =========================================================================
          4. MODAL: NOVA PASTA
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
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">Criar Nova Pasta</h3>
                  <p className="text-[11px] text-slate-500">Organize os ficheiros por categoria</p>
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
                  placeholder="ex: Orcamentos, Projetos_Estruturais"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAFAF9] border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categoria
                </label>
                <select
                  value={newFolderCategory}
                  onChange={(e) => setNewFolderCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAFAF9] border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
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
                  className="btn-primary btn-sm bg-sky-600 hover:bg-sky-700 text-white"
                >
                  Criar Pasta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          5. MODAL: RENOMEAR
         ========================================================================= */}
      {isRenameModalOpen && renameTarget && (
        <div className="modal-overlay-erp animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Renomear {renameTarget.type === 'file' ? 'Ficheiro' : 'Pasta'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Altere o título do elemento</p>
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
                  Novo Título / Nome <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAFAF9] border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
                  className="btn-primary btn-sm bg-sky-600 hover:bg-sky-700 text-white"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. MODAL: PERMISSÕES (chmod 0755 / 0644)
         ========================================================================= */}
      {isPermissionsModalOpen && permissionsTarget && (
        <div className="modal-overlay-erp animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  Permissões de {permissionsTarget.name}
                </h3>
              </div>
              <button
                onClick={() => setIsPermissionsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <table className="w-full text-center border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-700">
                  <tr>
                    <th className="py-1.5">Permissão</th>
                    <th>User</th>
                    <th>Group</th>
                    <th>World</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="py-1.5 font-medium text-left px-2">Read (4)</td>
                    <td><input type="checkbox" defaultChecked className="accent-sky-600" /></td>
                    <td><input type="checkbox" defaultChecked className="accent-sky-600" /></td>
                    <td><input type="checkbox" defaultChecked className="accent-sky-600" /></td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-medium text-left px-2">Write (2)</td>
                    <td><input type="checkbox" defaultChecked className="accent-sky-600" /></td>
                    <td><input type="checkbox" className="accent-sky-600" /></td>
                    <td><input type="checkbox" className="accent-sky-600" /></td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-medium text-left px-2">Execute (1)</td>
                    <td><input type="checkbox" defaultChecked className="accent-sky-600" /></td>
                    <td><input type="checkbox" defaultChecked className="accent-sky-600" /></td>
                    <td><input type="checkbox" defaultChecked className="accent-sky-600" /></td>
                  </tr>
                </tbody>
              </table>

              <div className="flex items-center justify-between font-mono bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-slate-500 font-sans">Permissão Unix:</span>
                <span className="font-bold text-sky-800 text-sm">{permissionsTarget.permissions}</span>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPermissionsModalOpen(false)}
                  className="btn-secondary btn-sm"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    showToast('success', 'Permissões Atualizadas', `Permissões de ${permissionsTarget.name} definidas.`);
                    setIsPermissionsModalOpen(false);
                  }}
                  className="btn-primary btn-sm bg-sky-600 hover:bg-sky-700 text-white"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. MODAL: NOVO ARQUIVO / UPLOAD
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
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Carregar Arquivo</h3>
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
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-sky-500 transition-colors cursor-pointer bg-slate-50/50">
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
                          {formatCPanelSize(selectedFile.size)}
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
                  className="w-full px-3 py-2 bg-[#FAFAF9] border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
                    className="w-full px-3 py-2 bg-[#FAFAF9] border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
                    className="w-full px-3 py-2 bg-[#FAFAF9] border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
                    className="w-full px-3 py-2 bg-[#FAFAF9] border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
                    className="w-full px-3 py-2 bg-[#FAFAF9] border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">Nenhum Cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id.toString()}>{c.name}</option>
                    ))}
                  </select>
                </div>
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
                  className="btn-primary btn-sm bg-sky-600 hover:bg-sky-700 text-white flex items-center space-x-1.5"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>A Enviar...</span>
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
          8. MODAIS DE CONFIRMAÇÃO
         ========================================================================= */}
      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmMoveToTrash}
        title="Mover para a Lixeira?"
        description={`Tem a certeza de que deseja enviar "${itemToDelete?.name}" para a lixeira?`}
        confirmText="Mover para Lixeira"
        cancelText="Cancelar"
        variant="warning"
      />

      <ConfirmationModal
        isOpen={!!itemToPermanentDelete}
        onClose={() => setItemToPermanentDelete(null)}
        onConfirm={handleConfirmPermanentDelete}
        title="Eliminar Definitivamente?"
        description={`Esta ação apagará permanentemente "${itemToPermanentDelete?.name}" do S3 e da base de dados.`}
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
