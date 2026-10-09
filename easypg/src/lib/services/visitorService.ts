import { apiFetch } from '$lib/api/http';

export async function logVisitorArrival(data: {
  visitorName: string;
  phone?: string;
  purpose?: string;
  relation?: string;
  tenantId: string;
}) {
  return await apiFetch('/views/visitors', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function checkoutVisitor(visitorId: string) {
  return await apiFetch(`/views/visitors/${visitorId}/checkout`, {
    method: 'POST'
  });
}
