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

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };
  if (typeof localStorage !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

const BASE_URL = "http://localhost:5000/api";

export async function createHead(data: HierarchyUser) {
  const response = await fetch(`${BASE_URL}/hierarchy/head`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to create Head");
  }
  return json;
}

export async function createPartner(data: HierarchyUser) {
  const response = await fetch(`${BASE_URL}/hierarchy/partner`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to create Partner");
  }
  return json;
}

export async function createManager(data: HierarchyUser) {
  const response = await fetch(`${BASE_URL}/hierarchy/manager`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to create Manager");
  }
  return json;
}

export async function createSupervisor(data: HierarchyUser) {
  const response = await fetch(`${BASE_URL}/hierarchy/supervisor`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to create Supervisor");
  }
  return json;
}

export async function fetchRoleDashboard(): Promise<DashboardResponse> {
  const response = await fetch(`${BASE_URL}/hierarchy/dashboard`, {
    method: "GET",
    headers: getAuthHeaders()
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to fetch dashboard data");
  }
  return json.data || json;
}

export async function fetchPartners() {
  const response = await fetch(`${BASE_URL}/hierarchy/partners`, {
    method: "GET",
    headers: getAuthHeaders()
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to fetch partners");
  }
  return json.data || [];
}

export async function fetchManagers(partnerId?: number) {
  const url = partnerId ? `${BASE_URL}/hierarchy/managers?partner_id=${partnerId}` : `${BASE_URL}/hierarchy/managers`;
  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders()
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to fetch managers");
  }
  return json.data || [];
}

export async function fetchHeads() {
  const response = await fetch(`${BASE_URL}/hierarchy/heads`, {
    method: "GET",
    headers: getAuthHeaders()
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to fetch heads");
  }
  return json.data || [];
}

export async function fetchSupervisors() {
  const response = await fetch(`${BASE_URL}/hierarchy/supervisors`, {
    method: "GET",
    headers: getAuthHeaders()
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to fetch supervisors");
  }
  return json.data || [];
}

export async function fetchAssignments() {
  const response = await fetch(`${BASE_URL}/hierarchy/assignments`, {
    method: "GET",
    headers: getAuthHeaders()
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to fetch assignments");
  }
  return json.data || {
    head_partner: [],
    partner_manager: [],
    partner_hostel: [],
    manager_hostel: [],
    hostel_supervisor: []
  };
}

export async function fetchHostels() {
  const response = await fetch(`${BASE_URL}/hostels`, {
    method: "GET",
    headers: getAuthHeaders()
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to fetch hostels");
  }
  return json.data || json || [];
}

export async function createHostel(data: { name: string; address?: string; contact_number?: string; hostel_code?: string; partner_id?: number }) {
  const response = await fetch(`${BASE_URL}/hostels`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to create hostel");
  }
  return json;
}

export async function assignHeadPartner(payload: { head_id: number; partner_id: number }) {
  const response = await fetch(`${BASE_URL}/hierarchy/assign/head-partner`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to assign Head to Partner");
  }
  return json;
}

export async function assignPartnerManager(payload: { partner_id: number; manager_id: number }) {
  const response = await fetch(`${BASE_URL}/hierarchy/assign/partner-manager`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to assign Partner to Manager");
  }
  return json;
}

export async function assignPartnerHostel(payload: { partner_id: number; hostel_id: number }) {
  const response = await fetch(`${BASE_URL}/hierarchy/assign/partner-hostel`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to assign Partner to Hostel");
  }
  return json;
}

export async function assignManagerHostel(payload: { manager_id: number; hostel_id: number }) {
  const response = await fetch(`${BASE_URL}/hierarchy/assign/manager-hostel`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to assign Manager to Hostel");
  }
  return json;
}

export async function assignSupervisorHostel(payload: { supervisor_id: number; hostel_id: number; assignment_role: "TENANT_ADMIN" | "MAINTENANCE" }) {
  const response = await fetch(`${BASE_URL}/hierarchy/assign/supervisor-hostel`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to assign Supervisor to Hostel");
  }
  return json;
}
