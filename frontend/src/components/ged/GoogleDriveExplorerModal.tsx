import React, { useState, useEffect } from 'react';
import { 
  Search, 
  X, 
  Download, 
  RefreshCw, 
  FileText, 
  FileImage, 
  FileSpreadsheet, 
  FileArchive, 
  File as FileIcon, 
  Folder, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  HardDrive
} from 'lucide-react';
import { uploadDocument } from '../../services/api';

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  iconLink?: string;
}

interface GoogleDriveExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (fileName: string) => void;
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '317708028649-gl3gp5ejeft9gq9gn7piqsmole32v1p4.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

export const GoogleDriveExplorerModal: React.FC<GoogleDriveExplorerModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Authenticate with Google Identity Services (OAuth 2.0)
  const handleConnectGoogle = () => {
    setErrorMessage(null);
    if (!(window as any).google?.accounts?.oauth2) {
      setErrorMessage('O serviço de autenticação Google ainda está a carregar. Por favor, aguarde alguns segundos e tente novamente.');
      return;
    }

    try {
      setIsAuthenticating(true);
      const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: async (resp: any) => {
          setIsAuthenticating(false);
          if (resp.error) {
            console.error('Google OAuth Error:', resp);
            setErrorMessage('Não foi possível autenticar a conta Google.');
            return;
          }
          if (resp.access_token) {
            setAccessToken(resp.access_token);
            await fetchDriveFiles(resp.access_token);
          }
        },
        error_callback: (err: any) => {
          setIsAuthenticating(false);
          console.error('Google Token Client Error:', err);
          setErrorMessage('Erro ao abrir o ecrã de início de sessão da Google.');
        }
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      setIsAuthenticating(false);
      setErrorMessage(err.message || 'Erro ao inicializar o cliente Google.');
    }
  };

  // Fetch user's Google Drive files
  const fetchDriveFiles = async (token: string, search = '') => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let q = "trashed = false and mimeType != 'application/vnd.google-apps.folder'";
      if (search.trim()) {
        q += ` and name contains '${search.trim().replace(/'/g, "\\'")}'`;
      }

      const url = `https://www.googleapis.com/drive/v3/files?pageSize=50&fields=files(id,name,mimeType,size,modifiedTime,thumbnailLink,iconLink)&q=${encodeURIComponent(q)}&orderBy=modifiedTime desc`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        if (res.status === 401) {
          setAccessToken(null);
          setErrorMessage('A sua sessão Google expirou. Por favor, ligue novamente.');
          return;
        }
        throw new Error(`Erro Google API: ${res.statusText}`);
      }

      const data = await res.json();
      setFiles(data.files || []);
    } catch (err: any) {
      console.error('Erro ao listar arquivos do Google Drive:', err);
      setErrorMessage(err.message || 'Erro ao carregar arquivos do seu Google Drive.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !accessToken) {
      handleConnectGoogle();
    }
  }, [isOpen]);

  // Import file directly to Neon S3 Storage & GED
  const handleImportFile = async (driveFile: GoogleDriveFile) => {
    if (!accessToken) return;
    setImportingId(driveFile.id);
    try {
      // 1. Download file content from Google Drive
      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${driveFile.id}?alt=media`;
      const fileRes = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!fileRes.ok) {
        throw new Error('Não foi possível descarregar o ficheiro do Google Drive.');
      }

      const blob = await fileRes.blob();
      const fileObj = new File([blob], driveFile.name, { type: driveFile.mimeType });

      // 2. Upload to LECASU ERP (Neon S3 + Database)
      const data = new FormData();
      data.append('file', fileObj);
      data.append('title', driveFile.name.substring(0, driveFile.name.lastIndexOf('.')) || driveFile.name);
      data.append('category', 'Projetos Técnicos');
      data.append('version', 'v1.0');
      data.append('description', 'Ficheiro importado diretamente do Google Drive corporativo.');

      await uploadDocument(data);
      onSuccess(driveFile.name);
    } catch (err: any) {
      console.error('Erro ao importar do Google Drive:', err);
      setErrorMessage(err.message || 'Falha ao importar o documento para o repositório.');
    } finally {
      setImportingId(null);
    }
  };

  const formatBytes = (bytesStr?: string) => {
    if (!bytesStr) return '—';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileIcon = (mimeType: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (mimeType.includes('pdf') || ext === 'pdf') {
      return <FileText className="w-5 h-5 text-rose-500" />;
    }
    if (mimeType.includes('image') || ['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      return <FileImage className="w-5 h-5 text-blue-500" />;
    }
    if (mimeType.includes('spreadsheet') || ['xlsx', 'xls', 'csv'].includes(ext)) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    }
    if (mimeType.includes('zip') || ['zip', 'rar', '7z'].includes(ext)) {
      return <FileArchive className="w-5 h-5 text-amber-500" />;
    }
    return <FileIcon className="w-5 h-5 text-slate-500" />;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay-erp animate-in fade-in duration-200">
      <div className="bg-white border border-[#E2E2DE] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#EDEDEA] flex items-center justify-between bg-[#FAFAF9]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E2DE] shadow-2xs flex items-center justify-center p-2 flex-shrink-0">
              <svg className="w-6 h-6" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#101010] font-heading">
                Explorador do Google Drive
              </h3>
              <p className="text-xs text-[#737370]">
                Selecione documentos para sincronizar diretamente com o Neon S3
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-neutral-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-[#EDEDEA] flex items-center justify-between gap-3 bg-white">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar ficheiros no seu Google Drive..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (accessToken) fetchDriveFiles(accessToken, e.target.value);
              }}
              className="w-full pl-9 pr-3 py-2 bg-[#FAFAF9] border border-[#E2E2DE] rounded-xl text-xs text-[#101010] focus:outline-none focus:ring-1 focus:ring-[#1A73E8] focus:bg-white"
            />
          </div>

          {accessToken ? (
            <button
              onClick={() => fetchDriveFiles(accessToken, searchQuery)}
              disabled={isLoading}
              className="btn-secondary btn-md flex items-center gap-1.5"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          ) : (
            <button
              onClick={handleConnectGoogle}
              disabled={isAuthenticating}
              className="btn-primary btn-md flex items-center gap-2 bg-[#1A73E8] hover:bg-[#1557B0]"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>A conectar...</span>
                </>
              ) : (
                <span>Iniciar Sessão Google</span>
              )}
            </button>
          )}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Files List */}
        <div className="p-6 overflow-y-auto flex-1 divide-y divide-[#F0F0ED]">
          {!accessToken ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-[#FFF2E5] text-[#FF8000] flex items-center justify-center mx-auto mb-3">
                <HardDrive className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-[#101010] font-heading">
                Conta Google não vinculada
              </h4>
              <p className="text-xs text-[#737370] max-w-sm mx-auto mt-1 mb-5">
                Clique abaixo para autorizar o acesso seguro e navegar pelos seus documentos do Drive.
              </p>
              <button
                onClick={handleConnectGoogle}
                disabled={isAuthenticating}
                className="btn-primary btn-md bg-[#1A73E8] hover:bg-[#1557B0] inline-flex items-center gap-2"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>A abrir Google Login...</span>
                  </>
                ) : (
                  <span>Conectar Google Workspace</span>
                )}
              </button>
            </div>
          ) : isLoading ? (
            <div className="text-center py-16 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#1A73E8] mb-2" />
              <p className="text-xs">A carregar documentos do seu Google Drive...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Folder className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Nenhum ficheiro encontrado</p>
              <p className="text-xs text-slate-400 mt-0.5">Tente pesquisar com outro nome ou verificar a pasta.</p>
            </div>
          ) : (
            files.map((file) => (
              <div 
                key={file.id}
                className="py-3 px-2 flex items-center justify-between hover:bg-[#FAFAF9] rounded-xl transition group"
              >
                <div className="flex items-center space-x-3 min-w-0 pr-4">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                    {getFileIcon(file.mimeType, file.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#101010] font-heading truncate max-w-md">
                      {file.name}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                      <span>{formatBytes(file.size)}</span>
                      {file.modifiedTime && (
                        <>
                          <span>•</span>
                          <span>{new Date(file.modifiedTime).toLocaleDateString('pt-MZ')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleImportFile(file)}
                  disabled={importingId === file.id}
                  className="btn-secondary btn-sm flex items-center gap-1.5 shrink-0 hover:border-[#FF8000] hover:text-[#FF8000] cursor-pointer"
                  title="Importar para o Repositório LECASU"
                >
                  {importingId === file.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF8000]" />
                      <span className="text-[#FF8000]">A sincronizar...</span>
                    </>
                  ) : (
                    <>
                      <Download size={13} />
                      <span>Importar para GED</span>
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[#FAFAF9] border-t border-[#EDEDEA] flex items-center justify-between text-xs text-[#737370]">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-600" />
            Os ficheiros importados vão automaticamente para o Storage Neon S3
          </span>
          <button
            onClick={onClose}
            className="btn-secondary btn-sm"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
