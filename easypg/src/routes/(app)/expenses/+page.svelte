<script lang="ts">
  import type { PageData } from './$types';
  import { Badge, Card, Button, Table, Dialog, TextInput, proportional, pixel } from '@astryx-svelte/core';
  import Receipt from '@lucide/svelte/icons/receipt';
  import Plus from '@lucide/svelte/icons/plus';
  import { invalidateAll } from '$app/navigation';
  import { createExpense } from '$lib/services/expenseService';
  import { formatPaise } from '$lib/formatters/money';

  let { data }: { data: any } = $props();

  type Expense = {
    expense_id: number | string;
    category_name: string;
    description: string;
    expense_date: string;
    amount: number;
    status: string;
  } & Record<string, unknown>;

  let isCreateOpen = $state(false);
  let amountInput = $state('');
  let categoryId = $state('');
  let descriptionInput = $state('');
  let expenseDate = $state(new Date().toISOString().slice(0, 10));
  let isSubmitting = $state(false);

  $effect(() => {
    if (data?.categories?.length > 0 && !categoryId) {
      categoryId = String(data.categories[0].expense_category_id);
    }
  });

  function formatDate(value: Date | string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  }

  async function handleAddExpense(e: Event) {
    e.preventDefault();
    if (!amountInput || Number(amountInput) <= 0) return;
    isSubmitting = true;
    try {
      const hostelId = data?.activeHostel ? (data.activeHostel.id || data.activeHostel.hostel_id) : '1';
      await createExpense({
        hostel_id: Number(hostelId),
        expense_category_id: Number(categoryId || 1),
        amount: Number(amountInput),
        expense_date: expenseDate,
        description: descriptionInput
      });
      isCreateOpen = false;
      amountInput = '';
      descriptionInput = '';
      await invalidateAll();
    } catch (err) {
      console.error("Failed to add expense:", err);
    } finally {
      isSubmitting = false;
    }
  }
</script>

{#snippet amountCell(item: Expense)}
  <strong style="color: #f43f5e; font-size: 0.95rem;">
    {formatPaise(Math.round(Number(item.amount || 0) * 100))}
  </strong>
{/snippet}

{#snippet dateCell(item: Expense)}
  <span>{formatDate(item.expense_date)}</span>
{/snippet}

{#snippet statusCell(item: Expense)}
  <Badge
    variant={item.status === 'APPROVED' ? 'success' : item.status === 'PENDING' ? 'warning' : 'neutral'}
    label={String(item.status || 'APPROVED')}
  />
{/snippet}

<svelte:head><title>Expenses — EasyPG</title></svelte:head>

<div style="display: flex; flex-direction: column; gap: 1.5rem; padding: 1.5rem;">
  <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
    <div>
      <p style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted, #94a3b8); margin: 0;">
        Financial Tracking
      </p>
      <h1 style="font-size: 1.6rem; font-weight: 700; margin: 0.2rem 0; display: flex; align-items: center; gap: 0.5rem;">
        <Receipt size={24} /> Hostel Expenses Log
      </h1>
      <p style="font-size: 0.9rem; color: var(--color-text-secondary, #64748b); margin: 0;">
        Track operational costs, repair expenses, and utility payments for your hostel.
      </p>
    </div>
    <div style="display: flex; gap: 0.8rem; align-items: center;">
      <div style="background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.2); padding: 0.5rem 1rem; border-radius: 8px; color: #fb7185; font-weight: 700;">
        Total: {formatPaise(Math.round((data?.totalAmount || 0) * 100))}
      </div>
      <Button
        label="Record Expense"
        variant="primary"
        onclick={() => (isCreateOpen = true)}
      >
        {#snippet icon()}<Plus size={16} />{/snippet}
      </Button>
    </div>
  </div>

  <Card padding={4}>
    <div style="margin-bottom: 1rem;">
      <h2 style="font-size: 1.1rem; font-weight: 600; margin: 0;">Recorded Expenses</h2>
      <p style="font-size: 0.85rem; color: var(--color-text-secondary, #64748b); margin-top: 0.2rem;">
        Historical register of all maintenance and operational outflows.
      </p>
    </div>

    {#if !data?.expenses || data.expenses.length === 0}
      <div style="text-align: center; padding: 3rem 1rem; color: #94a3b8;">
        <Receipt size={36} style="margin-bottom: 0.5rem;" />
        <p style="font-size: 1rem; margin: 0;">No expense records found for this hostel.</p>
      </div>
    {:else}
      <Table
        data={data.expenses as Expense[]}
        density="compact"
        dividers="rows"
        hasHover
        columns={[
          { key: 'expense_id', header: 'ID', width: pixel(70) },
          { key: 'category_name', header: 'Category', width: proportional(1.5) },
          { key: 'description', header: 'Description / Purpose', width: proportional(2.5) },
          { key: 'expense_date', header: 'Date', width: proportional(1.2), renderCell: dateCell },
          { key: 'amount', header: 'Amount', width: proportional(1.2), renderCell: amountCell },
          { key: 'status', header: 'Status', width: pixel(110), renderCell: statusCell }
        ]}
      />
    {/if}
  </Card>
</div>

<Dialog
  isOpen={isCreateOpen}
  onOpenChange={(open) => (isCreateOpen = open)}
  width={460}
  purpose="form"
  aria-label="Record New Expense"
>
  <div style="padding: 1.5rem; background: var(--color-background-card, #1e293b); color: white; border-radius: 8px;">
    <h2 style="font-size: 1.2rem; margin-top: 0; margin-bottom: 0.5rem;">Record Hostel Expense</h2>
    <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 1.2rem;">
      Enter the operational expense details below.
    </p>

    <form onsubmit={handleAddExpense} style="display: flex; flex-direction: column; gap: 1rem;">
      <div>
        <label for="expenseCategorySelect" style="display: block; font-size: 0.8125rem; font-weight: 600; color: #cbd5e1; margin-bottom: 0.375rem;">Category</label>
        <select id="expenseCategorySelect" bind:value={categoryId} style="width: 100%; padding: 0.625rem; border-radius: 6px; background: #0f172a; border: 1px solid #334155; color: white;">
          {#each (data?.categories || []) as cat}
            <option value={String(cat.expense_category_id)}>{cat.category_name}</option>
          {/each}
        </select>
      </div>

      <TextInput
        label="Amount (₹)"
        htmlName="amount"
        type="text"
        placeholder="e.g. 1500"
        value={amountInput}
        onChange={(val) => (amountInput = val)}
        isRequired
      />

      <TextInput
        label="Description / Purpose"
        htmlName="description"
        placeholder="e.g. Water pump repair, Electrician bill..."
        value={descriptionInput}
        onChange={(val) => (descriptionInput = val)}
        isRequired
      />

      <div>
        <label for="expenseDateInput" style="display: block; font-size: 0.8125rem; font-weight: 600; color: #cbd5e1; margin-bottom: 0.375rem;">Expense Date</label>
        <input id="expenseDateInput" type="date" bind:value={expenseDate} required style="width: 100%; padding: 0.625rem; border-radius: 6px; background: #0f172a; border: 1px solid #334155; color: white;" />
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.8rem; margin-top: 1rem;">
        <Button
          label="Cancel"
          type="button"
          variant="secondary"
          onclick={() => (isCreateOpen = false)}
        />
        <Button
          label={isSubmitting ? 'Saving...' : 'Record Expense'}
          type="submit"
          variant="primary"
          isDisabled={isSubmitting}
        />
      </div>
    </form>
  </div>
</Dialog>
