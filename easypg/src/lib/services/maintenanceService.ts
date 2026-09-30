import { apiFetch } from '$lib/api/http';

export async function updateComplaintStatus(complaintId: number, status: string) {
  return await apiFetch(`/maintenance/complaints/${complaintId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}
