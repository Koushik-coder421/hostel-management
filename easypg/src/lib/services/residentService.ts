import { apiFetch } from "$lib/api/http";

export interface CreateComplaintInput {
  tenant_id: number;
  target_type: "ROOM" | "BED" | "FACILITY";
  target_id: number;
  description: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}

export async function fetchMyStayDetails() {
  return apiFetch<any>("/hierarchy/me/stay");
}

export async function submitResidentComplaint(data: CreateComplaintInput) {
  return apiFetch("/maintenance/complaints", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function fetchResidentComplaints(tenantId: number) {
  return apiFetch<any>(`/maintenance/complaints?tenant_id=${tenantId}`);
}
