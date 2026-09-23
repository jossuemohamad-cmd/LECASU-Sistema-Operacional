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
  ServiceKPIs
} from '../types';



const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

// ================= DASHBOARD =================
export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const res = await fetch(`${API_BASE_URL}/dashboard/overview`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<DashboardOverview>(res);
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

// ================= CLIENTS =================
export async function fetchClients(): Promise<Client[]> {
  const res = await fetch(`${API_BASE_URL}/clients`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<Client[]>(res);
}

export async function fetchClientById(id: number): Promise<Client> {
  const res = await fetch(`${API_BASE_URL}/clients/${id}`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<Client>(res);
}

export async function createClient(payload: ClientCreateInput): Promise<Client> {
  const res = await fetch(`${API_BASE_URL}/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return handleResponse<Client>(res);
}

// ================= PROPOSALS =================
export async function fetchProposals(): Promise<Proposal[]> {
  const res = await fetch(`${API_BASE_URL}/proposals`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<Proposal[]>(res);
}

export async function createProposal(payload: ProposalCreateInput): Promise<Proposal> {
  const res = await fetch(`${API_BASE_URL}/proposals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return handleResponse<Proposal>(res);
}

export async function convertProposalToProject(proposalId: number): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/proposals/${proposalId}/convert-to-project`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json'
    }
  });
  return handleResponse<Project>(res);
}

// ================= PROJECTS =================
export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE_URL}/projects`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<Project[]>(res);
}

export async function fetchProjectById(id: number): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<Project>(res);
}

export async function createProject(payload: ProjectCreateInput): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return handleResponse<Project>(res);
}

// ================= TASKS =================
export async function createProjectTask(projectId: number, payload: TaskCreateInput): Promise<Task> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return handleResponse<Task>(res);
}

export async function updateTask(taskId: number, payload: TaskUpdateInput): Promise<Task> {
  const res = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return handleResponse<Task>(res);
}

export async function deleteTask(taskId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'DELETE'
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Falha ao remover tarefa (${res.status})`);
  }
}

// ================= TEAM & TECHNICIANS =================
export async function fetchTechnicians(): Promise<Technician[]> {
  const res = await fetch(`${API_BASE_URL}/team/technicians`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<Technician[]>(res);
}

export async function fetchTeamKPIs(): Promise<TeamKPIs> {
  const res = await fetch(`${API_BASE_URL}/team/overview`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<TeamKPIs>(res);
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
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<TeamTask[]>(res);
}

export async function assignTask(taskId: number, assignedToUserId: number): Promise<TeamTask> {
  const res = await fetch(`${API_BASE_URL}/tasks/${taskId}/assign`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ assigned_to_user_id: assignedToUserId })
  });
  return handleResponse<TeamTask>(res);
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
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<Service[]>(res);
}

export async function fetchServiceCategories(): Promise<string[]> {
  const res = await fetch(`${API_BASE_URL}/services/categories`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<string[]>(res);
}

export async function fetchServiceKPIs(): Promise<ServiceKPIs> {
  const res = await fetch(`${API_BASE_URL}/services/overview`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<ServiceKPIs>(res);
}

export async function createService(payload: ServiceCreateInput): Promise<Service> {
  const res = await fetch(`${API_BASE_URL}/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return handleResponse<Service>(res);
}

export async function updateService(serviceId: number, payload: ServiceUpdateInput): Promise<Service> {
  const res = await fetch(`${API_BASE_URL}/services/${serviceId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return handleResponse<Service>(res);
}


