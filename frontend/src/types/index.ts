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
  // Clients & Commercial
  active_clients_count: number;
  total_proposals_count: number;
  open_proposals_count: number;
  accepted_proposals_count: number;
  proposals_total_amount: number;

  // Projects & Technical Operations
  total_projects_count: number;
  active_projects_count: number;
  completed_projects_count: number;
  average_project_progress: number;
  total_tasks_count: number;
  pending_tasks_count: number;
  completed_tasks_count: number;
  technicians_count: number;

  // Financial Performance
  total_invoiced: number;
  total_received: number;
  pending_amount: number;
  invoices_paid_count: number;
  invoices_pending_count: number;

  // Services Catalog
  total_services_count: number;
  active_services_count: number;

  // Suppliers & Procurement
  suppliers_count: number;
  purchase_orders_count: number;
  pending_purchase_orders_count: number;
  total_purchases_amount: number;
  pending_purchases_amount: number;

  // Human Resources (RH)
  employees_count: number;
  active_employees_count: number;
  total_payroll_monthly: number;
  active_leaves_count: number;

  // GED & Repositories
  documents_count: number;

  // System & Users
  system_users_count: number;
  active_users_count: number;
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

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  email: string;
  token: string;
  new_password: string;
}

export interface AdminResetPasswordInput {
  new_password: string;
}

export interface GenericMessageResponse {
  message: string;
  status: string;
  temp_code?: string | null;
}

export interface Supplier {
  id: number;
  name: string;
  nuit?: string | null;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  category: string;
  address?: string | null;
  is_active: boolean;
  created_at?: string;
  purchases_count: number;
  total_spent: number;
}

export interface SupplierCreateInput {
  name: string;
  nuit?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  category?: string;
  address?: string;
  is_active?: boolean;
}

export interface PurchaseOrder {
  id: number;
  supplier_id: number;
  project_id?: number | null;
  order_number: string;
  description: string;
  total_amount: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | string;
  due_date?: string | null;
  created_at?: string;
  paid_at?: string | null;
  supplier_name?: string | null;
  supplier_category?: string | null;
  project_name?: string | null;
  project_code?: string | null;
}

export interface PurchaseOrderCreateInput {
  supplier_id: number;
  project_id?: number | null;
  description: string;
  total_amount: number;
  due_date?: string | null;
}

export interface SupplierOverviewKPIs {
  total_suppliers: number;
  active_suppliers_count: number;
  pending_amount_mzn: number;
  paid_amount_mzn: number;
  total_purchases_count: number;
  pending_orders_count: number;
}

// ================= RECURSOS HUMANOS (HR) =================
export interface Employee {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  bi_number?: string | null;
  nuit?: string | null;
  department: string;
  position: string;
  contract_type: string;
  base_salary: number;
  hire_date?: string | null;
  is_active: boolean;
  created_at?: string;
  active_leaves_count: number;
}

export interface EmployeeCreateInput {
  name: string;
  email?: string;
  phone?: string;
  bi_number?: string;
  nuit?: string;
  department?: string;
  position?: string;
  contract_type?: string;
  base_salary: number;
  hire_date?: string;
  is_active?: boolean;
}

export interface EmployeeLeave {
  id: number;
  employee_id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  created_at?: string;
  employee_name?: string | null;
  employee_department?: string | null;
  employee_position?: string | null;
}

export interface LeaveCreateInput {
  employee_id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface HROverviewKPIs {
  total_employees: number;
  active_employees_count: number;
  active_departments_count: number;
  on_leave_count: number;
  monthly_payroll_mzn: number;
}

export interface GEDDocument {
  id: number;
  title: string;
  category: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  mime_type?: string | null;
  version: string;
  description?: string | null;
  project_id?: number | null;
  client_id?: number | null;
  uploaded_by_id?: number | null;
  created_at?: string;
  updated_at?: string;
  project_name?: string | null;
  project_code?: string | null;
  client_name?: string | null;
  uploaded_by_name?: string | null;
}

export interface GEDOverviewKPIs {
  total_documents: number;
  active_categories_count: number;
  total_storage_bytes: number;
  total_storage_formatted: string;
  monthly_uploads_count: number;
}

export interface InvoiceCreateInput {
  client_id: number;
  project_id?: number | null;
  invoice_number?: string;
  amount: number;
  due_date?: string | null;
  status?: string;
}

export interface FinanceOverviewKPIs {
  total_invoiced: number;
  total_received: number;
  pending_receivables: number;
  total_expenses: number;
  net_cashflow: number;
  issued_invoices_count: number;
  paid_invoices_count: number;
}

export interface EmailAccountConfig {
  provider: string;
  displayName: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: 'ssl' | 'tls' | 'none';
  incomingType: 'imap' | 'pop3';
  incomingHost: string;
  incomingPort: number;
  incomingSecure: 'ssl' | 'tls' | 'none';
  username: string;
  password?: string;
  isConnected: boolean;
  lastSync?: string;
}

export interface EmailAttachment {
  index?: number;
  filename: string;
  size_bytes?: number;
  content_type?: string;
  download_url?: string;
  data_url?: string;
}

export interface EmailMessage {
  id: string;
  clientId?: number;
  clientName?: string;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  date: string;
  isRead: boolean;
  hasAttachment: boolean;
  attachments?: EmailAttachment[];
  attachedProposalId?: number;
  attachedProposalTitle?: string;
  attachedProposalAmount?: number;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'archive' | string;
}




