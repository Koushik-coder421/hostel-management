import { apiFetch, ApiError } from "$lib/api/http";

export { ApiError };

export interface HierarchyUser {
  name: string;
  email: string;
  password: string;
  phone?: string;
  head_id?: number;
  partner_id?: number;
  manager_id?: number;
  hostel_id?: number;
  assignment_role?: string;
}

export interface DashboardResponse {
  status: string;
  role: string;
  partner_id?: number;
  manager_id?: number;
  supervisor_id?: number;
  parent_partner?: any;
  parent_manager?: any;
  metrics: {
    total_heads?: number;
    total_partners?: number;
    total_managers?: number;
    total_supervisors?: number;
    total_hostels?: number;
    assigned_hostels_count?: number;
    total_beds?: number;
    occupied_beds?: number;
    occupancy_rate?: string;
    total_tenants?: number;
    total_revenue?: number;
  };
  partners?: any[];
  managers?: any[];
  supervisors?: any[];
  hostels?: any[];
}

export async function createHead(data: HierarchyUser) {
  return apiFetch("/hierarchy/head", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function createPartner(data: HierarchyUser) {
  return apiFetch("/hierarchy/partner", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function createManager(data: HierarchyUser) {
  return apiFetch("/hierarchy/manager", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function createSupervisor(data: HierarchyUser) {
  return apiFetch("/hierarchy/supervisor", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function fetchRoleDashboard(): Promise<DashboardResponse> {
  const json = await apiFetch<any>("/hierarchy/dashboard");
  return json.data || json;
}

export async function fetchPartners() {
  const json = await apiFetch<any>("/hierarchy/partners");
  return json.data || [];
}

export async function fetchManagers(partnerId?: number) {
  const endpoint = partnerId ? `/hierarchy/managers?partner_id=${partnerId}` : "/hierarchy/managers";
  const json = await apiFetch<any>(endpoint);
  return json.data || [];
}

export async function fetchHeads() {
  const json = await apiFetch<any>("/hierarchy/heads");
  return json.data || [];
}

export async function fetchSupervisors() {
  const json = await apiFetch<any>("/hierarchy/supervisors");
  return json.data || [];
}

export async function fetchAssignments() {
  const json = await apiFetch<any>("/hierarchy/assignments");
  return json.data || {
    head_partner: [],
    partner_manager: [],
    partner_hostel: [],
    manager_hostel: [],
    hostel_supervisor: []
  };
}

export async function fetchHostels() {
  const json = await apiFetch<any>("/hostels");
  return json.data || json || [];
}

export async function createHostel(data: { name: string; address?: string; contact_number?: string; hostel_code?: string; partner_id?: number }) {
  return apiFetch("/hostels", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function assignHeadPartner(payload: { head_id: number; partner_id: number }) {
  return apiFetch("/hierarchy/assign/head-partner", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function assignPartnerManager(payload: { partner_id: number; manager_id: number }) {
  return apiFetch("/hierarchy/assign/partner-manager", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function assignPartnerHostel(payload: { partner_id: number; hostel_id: number }) {
  return apiFetch("/hierarchy/assign/partner-hostel", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function assignManagerHostel(payload: { manager_id: number; hostel_id: number }) {
  return apiFetch("/hierarchy/assign/manager-hostel", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function assignSupervisorHostel(payload: { supervisor_id: number; hostel_id: number; assignment_role: "TENANT_ADMIN" | "MAINTENANCE" }) {
  return apiFetch("/hierarchy/assign/supervisor-hostel", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateStaffProfile(staffId: number, payload: { name?: string; email?: string; phone?: string; status?: "ACTIVE" | "INACTIVE"; password?: string }) {
  return apiFetch(`/hierarchy/staff/${staffId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function elevateStaffRole(staffId: number, payload: { targetRole: "MANAGER" | "PARTNER" | "HEAD"; partner_id?: number; head_id?: number }) {
  return apiFetch(`/hierarchy/staff/${staffId}/elevate`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchStaffHistory(staffId: number) {
  const json = await apiFetch<any>(`/hierarchy/staff/${staffId}/history`);
  return json.data || json;
}
