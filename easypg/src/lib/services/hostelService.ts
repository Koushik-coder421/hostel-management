import { apiFetch } from "$lib/api/http";

export async function updateHostelStatus(hostelId: string | number, status: "ACTIVE" | "INACTIVE", deactivation_reason?: string) {
  return apiFetch(`/hostels/${hostelId}`, {
    method: "PUT",
    body: JSON.stringify({ status, deactivation_reason })
  });
}

export async function updateHostelDetails(hostelId: string | number, name: string, hostel_code: string) {
  return apiFetch(`/hostels/${hostelId}`, {
    method: "PUT",
    body: JSON.stringify({ name, hostel_code })
  });
}
