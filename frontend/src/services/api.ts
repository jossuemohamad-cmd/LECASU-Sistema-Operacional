import type { 
  Client, 
  ClientCreateInput, 
  Proposal, 
  ProposalCreateInput, 
  Project, 
  ProjectCreateInput, 
  Task, 
  TaskCreateInput, 
  TaskUpdateInput,
  DashboardOverview,
  Technician,
  TeamTask,
  TeamKPIs,
  Service,
  ServiceCreateInput,
  ServiceUpdateInput,
  ServiceKPIs,
  User,
  LoginCredentials,
  AuthResponse,
  UserCreateInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  AdminResetPasswordInput,
  GenericMessageResponse,
  Supplier,
  SupplierCreateInput,
  PurchaseOrder,
  PurchaseOrderCreateInput,
  SupplierOverviewKPIs,
  Employee,
  EmployeeCreateInput,
  EmployeeLeave,
  LeaveCreateInput,
  HROverviewKPIs,
  GEDDocument,
  GEDOverviewKPIs,
  Invoice,
  InvoiceCreateInput,
  FinanceOverviewKPIs
} from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

// Multi-Tier Persistent SWR Cache for Instant (0ms) UI Navigation
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const DEFAULT_CACHE_TTL = 45 * 1000; // 45 seconds fresh window

function getStoredCache<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(`lecasu_cache_${key}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignore parse error
  }
  return null;
}

function setStoredCache<T>(key: string, data: T, timestamp: number): void {
  try {
    localStorage.setItem(`lecasu_cache_${key}`, JSON.stringify({ data, timestamp }));
  } catch {
    // Ignore quota errors
  }
}

export function clearApiCache(prefix?: string): void {
  if (!prefix) {
    memoryCache.clear();
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('lecasu_cache_')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    return;
  }

  for (const key of Array.from(memoryCache.keys())) {
    if (key.includes(prefix)) {
      memoryCache.delete(key);
    }
  }

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('lecasu_cache_') && k.includes(prefix)) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

export function getAuthToken(): string | null {
  return localStorage.getItem('lecasu_auth_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('lecasu_auth_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('lecasu_auth_token');
  localStorage.removeItem('lecasu_auth_user');
  clearApiCache();
}

export function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...customHeaders
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Erro na requisição: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((err: any) => `${err.loc?.slice(1)?.join('.') || 'Campo'}: ${err.msg}`).join(', ');
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        }
      }
    } catch {
      // JSON parse failed, keep default message
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

async function cachedFetch<T>(url: string, headers: Record<string, string>, ttl = DEFAULT_CACHE_TTL): Promise<T> {
  const cacheKey = `GET:${url}`;
  const now = Date.now();

  // 1. Memória RAM (0ms)
  const memCached = memoryCache.get(cacheKey);
  if (memCached && (now - memCached.timestamp) < ttl) {
    return memCached.data as T;
  }

  // 2. LocalStorage Persistente (0ms)
  const storedCached = getStoredCache<T>(cacheKey);
  if (storedCached && (now - storedCached.timestamp) < ttl) {
    memoryCache.set(cacheKey, storedCached);
    return storedCached.data;
  }

  const staleData = memCached?.data ?? storedCached?.data;

  // 3. Network Fetch com atualização de cache SWR
  const networkPromise = (async () => {
    const res = await fetch(url, { headers });
    const data = await handleResponse<T>(res);
    memoryCache.set(cacheKey, { data, timestamp: Date.now() });
    setStoredCache(cacheKey, data, Date.now());
    return data;
  })();

  // Se já temos dados cacheados (mesmo que comecem a ficar antigos), devolvemos instantaneamente
  if (staleData !== undefined && staleData !== null) {
    networkPromise.catch(err => console.warn(`Revalidação em segundo plano falhou para ${url}:`, err));
    return staleData;
  }

  return networkPromise;
}

/** Pré-carrega todos os dados essenciais dos 10 módulos em segundo plano */
export function prefetchAllCoreData(): void {
  const token = getAuthToken();
  if (!token) return;

  Promise.allSettled([
    fetchDashboardOverview(),
    fetchClients(),
    fetchProposals(),
    fetchProjects(),
    fetchServices(),
    fetchTechnicians(),
    fetchTeamKPIs(),
    fetchFinanceOverviewKPIs(),
    fetchInvoices(),
    fetchSuppliers(),
    fetchEmployees(),
    fetchDocuments()
  ]).catch(() => {});
}

// ================= DASHBOARD =================
export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  return cachedFetch<DashboardOverview>(`${API_BASE_URL}/dashboard/overview`, getAuthHeaders(), 15 * 1000);
}

// ================= CLIENTS =================
export async function fetchClients(): Promise<Client[]> {
  return cachedFetch<Client[]>(`${API_BASE_URL}/clients`, getAuthHeaders());
}

export async function fetchClientById(id: number): Promise<Client> {
  return cachedFetch<Client>(`${API_BASE_URL}/clients/${id}`, getAuthHeaders());
}

export async function createClient(payload: ClientCreateInput): Promise<Client> {
  const res = await fetch(`${API_BASE_URL}/clients`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await handleResponse<Client>(res);
  clearApiCache('clients');
  clearApiCache('dashboard');
  return data;
}

// ================= PROPOSALS =================
export async function fetchProposals(): Promise<Proposal[]> {
  return cachedFetch<Proposal[]>(`${API_BASE_URL}/proposals`, getAuthHeaders());
}

export async function createProposal(payload: ProposalCreateInput): Promise<Proposal> {
  const res = await fetch(`${API_BASE_URL}/proposals`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await handleResponse<Proposal>(res);
  clearApiCache('proposals');
  clearApiCache('clients');
  clearApiCache('dashboard');
  return data;
}

export async function convertProposalToProject(proposalId: number): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/proposals/${proposalId}/convert-to-project`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  const data = await handleResponse<Project>(res);
  clearApiCache('proposals');
  clearApiCache('projects');
  clearApiCache('dashboard');
  clearApiCache('team');
  return data;
}

// ================= PROJECTS =================
export async function fetchProjects(): Promise<Project[]> {
  return cachedFetch<Project[]>(`${API_BASE_URL}/projects`, getAuthHeaders());
}

export async function fetchProjectById(id: number): Promise<Project> {
  return cachedFetch<Project>(`${API_BASE_URL}/projects/${id}`, getAuthHeaders());
}

export async function createProject(payload: ProjectCreateInput): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/projects`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await handleResponse<Project>(res);
  clearApiCache('projects');
  clearApiCache('dashboard');
  return data;
}

// ================= TASKS =================
export async function createProjectTask(projectId: number, payload: TaskCreateInput): Promise<Task> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await handleResponse<Task>(res);
  clearApiCache('projects');
  clearApiCache('team');
  clearApiCache('dashboard');
  return data;
}

export async function updateTask(taskId: number, payload: TaskUpdateInput): Promise<Task> {
  const res = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await handleResponse<Task>(res);
  clearApiCache('projects');
  clearApiCache('team');
  clearApiCache('dashboard');
  return data;
}

export async function deleteTask(taskId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Falha ao remover tarefa (${res.status})`);
  }
  clearApiCache('projects');
  clearApiCache('team');
  clearApiCache('dashboard');
}

// ================= TEAM & TECHNICIANS =================
export async function fetchTechnicians(): Promise<Technician[]> {
  return cachedFetch<Technician[]>(`${API_BASE_URL}/team/technicians`, getAuthHeaders());
}

export async function fetchTeamKPIs(): Promise<TeamKPIs> {
  return cachedFetch<TeamKPIs>(`${API_BASE_URL}/team/overview`, getAuthHeaders(), 15 * 1000);
}

export async function fetchTeamTasks(params?: {
  technicianId?: number;
  projectId?: number;
  status?: string;
}): Promise<TeamTask[]> {
  const searchParams = new URLSearchParams();
  if (params?.technicianId !== undefined && params.technicianId !== null) {
    searchParams.append('technician_id', params.technicianId.toString());
  }
  if (params?.projectId !== undefined && params.projectId !== null) {
    searchParams.append('project_id', params.projectId.toString());
  }
  if (params?.status) {
    searchParams.append('status', params.status);
  }

  const query = searchParams.toString();
  const url = `${API_BASE_URL}/team/tasks${query ? `?${query}` : ''}`;
  return cachedFetch<TeamTask[]>(url, getAuthHeaders(), 10 * 1000);
}

export async function assignTask(taskId: number, assignedToUserId: number): Promise<TeamTask> {
  const res = await fetch(`${API_BASE_URL}/tasks/${taskId}/assign`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ assigned_to_user_id: assignedToUserId })
  });
  const data = await handleResponse<TeamTask>(res);
  clearApiCache('team');
  clearApiCache('projects');
  clearApiCache('dashboard');
  return data;
}

// ================= SERVICES =================
export async function fetchServices(params?: {
  category?: string;
  isActive?: boolean;
  search?: string;
}): Promise<Service[]> {
  const searchParams = new URLSearchParams();
  if (params?.category && params.category !== 'ALL') {
    searchParams.append('category', params.category);
  }
  if (params?.isActive !== undefined && params.isActive !== null) {
    searchParams.append('is_active', params.isActive.toString());
  }
  if (params?.search && params.search.trim()) {
    searchParams.append('search', params.search.trim());
  }

  const query = searchParams.toString();
  const url = `${API_BASE_URL}/services${query ? `?${query}` : ''}`;
  return cachedFetch<Service[]>(url, getAuthHeaders());
}

export async function fetchServiceCategories(): Promise<string[]> {
  return cachedFetch<string[]>(`${API_BASE_URL}/services/categories`, getAuthHeaders(), 60 * 1000);
}

export async function fetchServiceKPIs(): Promise<ServiceKPIs> {
  return cachedFetch<ServiceKPIs>(`${API_BASE_URL}/services/overview`, getAuthHeaders(), 15 * 1000);
}

export async function createService(payload: ServiceCreateInput): Promise<Service> {
  const res = await fetch(`${API_BASE_URL}/services`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await handleResponse<Service>(res);
  clearApiCache('services');
  return data;
}

export async function updateService(serviceId: number, payload: ServiceUpdateInput): Promise<Service> {
  const res = await fetch(`${API_BASE_URL}/services/${serviceId}`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await handleResponse<Service>(res);
  clearApiCache('services');
  return data;
}

// ================= AUTHENTICATION & USERS =================
export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(credentials)
  });
  const data = await handleResponse<AuthResponse>(res);
  if (data.access_token) {
    setAuthToken(data.access_token);
    localStorage.setItem('lecasu_auth_user', JSON.stringify(data.user));
    clearApiCache();
  }
  return data;
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: getAuthHeaders()
  });
  return handleResponse<User>(res);
}

export async function fetchUsers(): Promise<User[]> {
  return cachedFetch<User[]>(`${API_BASE_URL}/users`, getAuthHeaders());
}

export async function createUser(payload: UserCreateInput): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await handleResponse<User>(res);
  clearApiCache('users');
  clearApiCache('team');
  return data;
}

export async function toggleUserStatus(userId: number, isActive: boolean): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ is_active: isActive })
  });
  const data = await handleResponse<User>(res);
  clearApiCache('users');
  clearApiCache('team');
  return data;
}

export async function forgotPassword(payload: ForgotPasswordInput): Promise<GenericMessageResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return handleResponse<GenericMessageResponse>(res);
}

export async function resetPassword(payload: ResetPasswordInput): Promise<GenericMessageResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return handleResponse<GenericMessageResponse>(res);
}

export async function adminResetPassword(userId: number, payload: AdminResetPasswordInput): Promise<GenericMessageResponse> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/admin-reset-password`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  return handleResponse<GenericMessageResponse>(res);
}

// ================= GESTÃO FINANCEIRA (FINANCE & INVOICES) =================
export async function fetchInvoices(params?: {
  status?: string;
  clientId?: number;
  projectId?: number;
  search?: string;
}): Promise<Invoice[]> {
  const searchParams = new URLSearchParams();
  if (params?.status && params.status !== 'ALL') {
    searchParams.append('status', params.status);
  }
  if (params?.clientId) {
    searchParams.append('client_id', params.clientId.toString());
  }
  if (params?.projectId) {
    searchParams.append('project_id', params.projectId.toString());
  }
  if (params?.search && params.search.trim()) {
    searchParams.append('search', params.search.trim());
  }
  const query = searchParams.toString();
  return cachedFetch<Invoice[]>(`${API_BASE_URL}/finance/invoices${query ? `?${query}` : ''}`, getAuthHeaders());
}

export async function createInvoice(payload: InvoiceCreateInput): Promise<Invoice> {
  const res = await fetch(`${API_BASE_URL}/finance/invoices`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await handleResponse<Invoice>(res);
  clearApiCache('finance');
  clearApiCache('dashboard');
  return data;
}

export async function payInvoice(invoiceId: number): Promise<Invoice> {
  const res = await fetch(`${API_BASE_URL}/finance/invoices/${invoiceId}/pay`, {
    method: 'PATCH',
    headers: getAuthHeaders()
  });
  const data = await handleResponse<Invoice>(res);
  clearApiCache('finance');
  clearApiCache('dashboard');
  return data;
}

export async function cancelInvoice(invoiceId: number): Promise<Invoice> {
  const res = await fetch(`${API_BASE_URL}/finance/invoices/${invoiceId}/cancel`, {
    method: 'PATCH',
    headers: getAuthHeaders()
  });
  const data = await handleResponse<Invoice>(res);
  clearApiCache('finance');
  clearApiCache('dashboard');
  return data;
}

export async function fetchFinanceOverviewKPIs(): Promise<FinanceOverviewKPIs> {
  return cachedFetch<FinanceOverviewKPIs>(`${API_BASE_URL}/finance/overview`, getAuthHeaders(), 15 * 1000);
}

// ================= SUPPLIERS & PURCHASES =================
export async function fetchSuppliers(params?: { category?: string; activeOnly?: boolean }): Promise<Supplier[]> {
  const searchParams = new URLSearchParams();
  if (params?.category) {
    searchParams.append('category', params.category);
  }
  if (params?.activeOnly) {
    searchParams.append('active_only', 'true');
  }
  const query = searchParams.toString();
  return cachedFetch<Supplier[]>(`${API_BASE_URL}/suppliers${query ? `?${query}` : ''}`, getAuthHeaders());
}

export async function createSupplier(payload: SupplierCreateInput): Promise<Supplier> {
  const res = await fetch(`${API_BASE_URL}/suppliers`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await handleResponse<Supplier>(res);
  clearApiCache('suppliers');
  return data;
}

export async function toggleSupplierStatus(supplierId: number, isActive: boolean): Promise<Supplier> {
  const res = await fetch(`${API_BASE_URL}/suppliers/${supplierId}/status?is_active=${isActive}`, {
    method: 'PATCH',
    headers: getAuthHeaders()
  });
  const data = await handleResponse<Supplier>(res);
  clearApiCache('suppliers');
  return data;
}

export async function fetchSupplierOverviewKPIs(): Promise<SupplierOverviewKPIs> {
  return cachedFetch<SupplierOverviewKPIs>(`${API_BASE_URL}/suppliers/overview`, getAuthHeaders(), 15 * 1000);
}

export async function fetchPurchaseOrders(params?: {
  supplierId?: number;
  projectId?: number;
  statusFilter?: string;
}): Promise<PurchaseOrder[]> {
  const searchParams = new URLSearchParams();
  if (params?.supplierId) {
    searchParams.append('supplier_id', params.supplierId.toString());
  }
  if (params?.projectId) {
    searchParams.append('project_id', params.projectId.toString());
  }
  if (params?.statusFilter) {
    searchParams.append('status_filter', params.statusFilter);
  }
  const query = searchParams.toString();
  return cachedFetch<PurchaseOrder[]>(`${API_BASE_URL}/purchases${query ? `?${query}` : ''}`, getAuthHeaders());
}

export async function createPurchaseOrder(payload: PurchaseOrderCreateInput): Promise<PurchaseOrder> {
  const res = await fetch(`${API_BASE_URL}/purchases`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await handleResponse<PurchaseOrder>(res);
  clearApiCache('purchases');
  clearApiCache('suppliers');
  clearApiCache('finance');
  return data;
}

export async function payPurchaseOrder(purchaseId: number): Promise<PurchaseOrder> {
  const res = await fetch(`${API_BASE_URL}/purchases/${purchaseId}/pay`, {
    method: 'PATCH',
    headers: getAuthHeaders()
  });
  const data = await handleResponse<PurchaseOrder>(res);
  clearApiCache('purchases');
  clearApiCache('suppliers');
  clearApiCache('finance');
  return data;
}

// ================= RECURSOS HUMANOS (HR) =================
export async function fetchEmployees(params?: { department?: string; activeOnly?: boolean }): Promise<Employee[]> {
  const searchParams = new URLSearchParams();
  if (params?.department) {
    searchParams.append('department', params.department);
  }
  if (params?.activeOnly) {
    searchParams.append('active_only', 'true');
  }
  const query = searchParams.toString();
  return cachedFetch<Employee[]>(`${API_BASE_URL}/hr/employees${query ? `?${query}` : ''}`, getAuthHeaders());
}

export async function createEmployee(payload: EmployeeCreateInput): Promise<Employee> {
  const res = await fetch(`${API_BASE_URL}/hr/employees`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await handleResponse<Employee>(res);
  clearApiCache('hr');
  return data;
}

export async function toggleEmployeeStatus(employeeId: number, isActive: boolean): Promise<Employee> {
  const res = await fetch(`${API_BASE_URL}/hr/employees/${employeeId}/status?is_active=${isActive}`, {
    method: 'PATCH',
    headers: getAuthHeaders()
  });
  const data = await handleResponse<Employee>(res);
  clearApiCache('hr');
  return data;
}

export async function fetchLeaves(params?: { employeeId?: number; statusFilter?: string }): Promise<EmployeeLeave[]> {
  const searchParams = new URLSearchParams();
  if (params?.employeeId) {
    searchParams.append('employee_id', params.employeeId.toString());
  }
  if (params?.statusFilter) {
    searchParams.append('status_filter', params.statusFilter);
  }
  const query = searchParams.toString();
  return cachedFetch<EmployeeLeave[]>(`${API_BASE_URL}/hr/leaves${query ? `?${query}` : ''}`, getAuthHeaders());
}

export async function createLeave(payload: LeaveCreateInput): Promise<EmployeeLeave> {
  const res = await fetch(`${API_BASE_URL}/hr/leaves`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const data = await handleResponse<EmployeeLeave>(res);
  clearApiCache('hr');
  return data;
}

export async function approveLeave(leaveId: number, status: 'APPROVED' | 'REJECTED'): Promise<EmployeeLeave> {
  const res = await fetch(`${API_BASE_URL}/hr/leaves/${leaveId}/approve`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status })
  });
  const data = await handleResponse<EmployeeLeave>(res);
  clearApiCache('hr');
  return data;
}

export async function fetchHROverviewKPIs(): Promise<HROverviewKPIs> {
  return cachedFetch<HROverviewKPIs>(`${API_BASE_URL}/hr/overview`, getAuthHeaders(), 15 * 1000);
}

// ================= GESTÃO ELETRÓNICA DE DOCUMENTOS (GED) =================
export async function fetchDocuments(params?: {
  category?: string;
  projectId?: number;
  clientId?: number;
  search?: string;
}): Promise<GEDDocument[]> {
  const searchParams = new URLSearchParams();
  if (params?.category) {
    searchParams.append('category', params.category);
  }
  if (params?.projectId) {
    searchParams.append('project_id', params.projectId.toString());
  }
  if (params?.clientId) {
    searchParams.append('client_id', params.clientId.toString());
  }
  if (params?.search) {
    searchParams.append('search', params.search);
  }
  const query = searchParams.toString();
  return cachedFetch<GEDDocument[]>(`${API_BASE_URL}/ged/documents${query ? `?${query}` : ''}`, getAuthHeaders());
}

export async function uploadDocument(formData: FormData): Promise<GEDDocument> {
  const token = getAuthToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE_URL}/ged/upload`, {
    method: 'POST',
    headers,
    body: formData
  });
  const data = await handleResponse<GEDDocument>(res);
  clearApiCache('ged');
  return data;
}

export function getDocumentDownloadUrl(documentId: number): string {
  return `${API_BASE_URL}/ged/documents/${documentId}/download`;
}

export async function downloadDocument(documentId: number, fileName: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/ged/documents/${documentId}/download`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    throw new Error('Falha ao descarregar documento');
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function deleteDocument(documentId: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/ged/documents/${documentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const data = await handleResponse<{ message: string }>(res);
  clearApiCache('ged');
  return data;
}

export async function fetchGEDOverviewKPIs(): Promise<GEDOverviewKPIs> {
  return cachedFetch<GEDOverviewKPIs>(`${API_BASE_URL}/ged/overview`, getAuthHeaders(), 15 * 1000);
}
