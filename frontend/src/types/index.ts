export interface Proposal {
  id: number;
  client_id: number;
  title: string;
  scope?: string | null;
  total_amount: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | string;
  created_at?: string;
}

export interface Client {
  id: number;
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  nuit?: string | null;
  address?: string | null;
  created_at?: string;
  proposals?: Proposal[];
}

export interface ClientCreateInput {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  nuit?: string;
  address?: string;
}

export interface ProposalCreateInput {
  client_id: number;
  title: string;
  scope?: string;
  total_amount: number;
  status?: string;
}

export interface Task {
  id: number;
  project_id: number;
  title: string;
  description?: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | string;
  due_date?: string | null;
  assigned_to?: number | null;
  created_at?: string;
}

export interface TaskCreateInput {
  title: string;
  description?: string;
  status?: string;
  due_date?: string;
  assigned_to?: number;
}

export interface TaskUpdateInput {
  title?: string;
  description?: string;
  status?: string;
  due_date?: string | null;
  assigned_to?: number | null;
}

export interface Project {
  id: number;
  client_id: number;
  proposal_id?: number | null;
  code?: string | null;
  name: string;
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | string;
  created_at?: string;
  client_name?: string | null;
  tasks?: Task[];
  total_tasks: number;
  completed_tasks: number;
  progress_percent: number;
}

export interface ProjectCreateInput {
  client_id: number;
  proposal_id?: number;
  name: string;
  code?: string;
  status?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

export interface Invoice {
  id: number;
  project_id?: number | null;
  client_id: number;
  invoice_number?: string | null;
  amount: number;
  status: 'ISSUED' | 'PAID' | 'CANCELLED' | string;
  due_date?: string | null;
  created_at?: string;
  client_name?: string | null;
  project_code?: string | null;
}

export interface DashboardKPIs {
  active_clients_count: number;
  active_projects_count: number;
  open_proposals_count: number;
  total_invoiced: number;
  total_received: number;
  pending_amount: number;
  average_project_progress: number;
}

export interface DashboardRecentProject {
  id: number;
  code?: string | null;
  name: string;
  client_name?: string | null;
  status: string;
  progress_percent: number;
  total_tasks: number;
  completed_tasks: number;
  created_at?: string | null;
}

export interface DashboardRecentInvoice {
  id: number;
  invoice_number?: string | null;
  client_name?: string | null;
  project_code?: string | null;
  amount: number;
  status: string;
  due_date?: string | null;
  created_at?: string | null;
}

export interface DashboardPendingTask {
  id: number;
  project_id: number;
  project_name?: string | null;
  project_code?: string | null;
  title: string;
  description?: string | null;
  status: string;
  due_date?: string | null;
  assigned_to?: number | null;
  created_at?: string | null;
}

export interface DashboardOverview {
  kpis: DashboardKPIs;
  recent_projects: DashboardRecentProject[];
  recent_invoices: DashboardRecentInvoice[];
  pending_tasks: DashboardPendingTask[];
}

export interface Technician {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  is_active: boolean;
  active_tasks_count: number;
  completed_tasks_count: number;
  created_at?: string;
}

export interface TaskAssignInput {
  assigned_to_user_id: number;
}

export interface TeamTask {
  id: number;
  project_id: number;
  project_name?: string | null;
  project_code?: string | null;
  title: string;
  description?: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | string;
  due_date?: string | null;
  assigned_to?: number | null;
  assigned_technician_name?: string | null;
  created_at?: string | null;
}

export interface TeamKPIs {
  total_technicians: number;
  in_progress_tasks: number;
  completed_tasks_this_month: number;
}

export interface Service {
  id: number;
  code?: string | null;
  name: string;
  category: string;
  description?: string | null;
  unit: string;
  base_price: number;
  is_active: boolean;
  created_at?: string;
}

export interface ServiceCreateInput {
  code?: string;
  name: string;
  category?: string;
  description?: string;
  unit?: string;
  base_price: number;
  is_active?: boolean;
}

export interface ServiceUpdateInput {
  code?: string;
  name?: string;
  category?: string;
  description?: string;
  unit?: string;
  base_price?: number;
  is_active?: boolean;
}

export interface ServiceKPIs {
  total_services: number;
  active_categories_count: number;
  average_base_price: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'direcao' | 'financeiro' | 'tecnico' | 'engenheiro' | string;
  phone?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface UserCreateInput {
  name: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
  is_active?: boolean;
}




