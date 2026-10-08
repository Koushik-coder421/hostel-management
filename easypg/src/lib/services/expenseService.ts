import { apiFetch } from '$lib/api/http';

export async function createExpense(data: {
  hostel_id: number;
  expense_category_id: number;
  amount: number;
  expense_date: string;
  description?: string;
}) {
  return await apiFetch('/expenses', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
