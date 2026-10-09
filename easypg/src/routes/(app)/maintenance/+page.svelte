<script lang="ts">
  import type { PageData } from './$types';
  import { Badge, Card, Button, Table, proportional, pixel } from '@astryx-svelte/core';
  import Wrench from '@lucide/svelte/icons/wrench';
  import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
  import { invalidateAll } from '$app/navigation';
  import { updateComplaintStatus } from '$lib/services/maintenanceService';

  let { data }: { data: any } = $props();

  type Complaint = {
    complaint_id: number | string;
    tenant_name: string;
    target_type: string;
    description: string;
    priority: string;
    status: string;
  } & Record<string, unknown>;

  function formatDate(value: Date | string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  }

  async function handleStatusChange(complaintId: number, status: string) {
    try {
      await updateComplaintStatus(complaintId, status);
      await invalidateAll();
    } catch (err) {
      console.error("Failed to update complaint status:", err);
    }
  }
</script>

{#snippet priorityCell(item: Complaint)}
  <span style={`padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; ${
    item.priority === 'URGENT' ? 'background: #991b1b; color: #fca5a5;' :
    item.priority === 'HIGH' ? 'background: #9a3412; color: #fdba74;' :
    item.priority === 'MEDIUM' ? 'background: #854d0e; color: #fef08a;' :
    'background: #1e3a8a; color: #93c5fd;'
  }`}>
    {item.priority || 'MEDIUM'}
  </span>
{/snippet}

{#snippet statusCell(item: Complaint)}
  <div style="display: flex; align-items: center; gap: 0.5rem;">
    <Badge
      variant={item.status === 'CLOSED' || item.status === 'RESOLVED' ? 'success' : item.status === 'OPEN' ? 'error' : 'info'}
      label={String(item.status || 'OPEN')}
    />
  </div>
{/snippet}

{#snippet actionCell(item: Complaint)}
  <div style="display: flex; gap: 0.4rem; align-items: center;">
    {#if item.status !== 'CLOSED'}
      <Button
        label="Resolve"
        variant="primary"
        size="sm"
        onclick={() => handleStatusChange(Number(item.complaint_id), 'CLOSED')}
      />
    {/if}
    <Button
      label="Record Expense"
      href="/expenses"
      variant="secondary"
      size="sm"
    />
  </div>
{/snippet}

<svelte:head><title>Maintenance & Complaints — EasyPG</title></svelte:head>

<div style="display: flex; flex-direction: column; gap: 1.5rem; padding: 1.5rem;">
  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
    <div>
      <p style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted, #94a3b8); margin: 0;">
        Maintenance Operations
      </p>
      <h1 style="font-size: 1.6rem; font-weight: 700; margin: 0.2rem 0; display: flex; align-items: center; gap: 0.5rem;">
        <Wrench size={24} /> Maintenance Complaints & Work Orders
      </h1>
      <p style="font-size: 0.9rem; color: var(--color-text-secondary, #64748b); margin: 0;">
        Inspect resident complaints, manage property maintenance requests, and log repair updates.
      </p>
    </div>
    <div style="display: flex; gap: 0.8rem;">
      <Badge
        variant="error"
        label={`${data?.metrics?.totalOpen ?? 0} Open Tickets`}
      />
      <Badge
        variant="neutral"
        label={`${data?.metrics?.totalCount ?? 0} Total Reported`}
      />
    </div>
  </div>

  <Card padding={4}>
    <div style="margin-bottom: 1rem;">
      <h2 style="font-size: 1.1rem; font-weight: 600; margin: 0;">Assigned Maintenance Complaints</h2>
      <p style="font-size: 0.85rem; color: var(--color-text-secondary, #64748b); margin-top: 0.2rem;">
        Resident maintenance tickets routed to your maintenance scope.
      </p>
    </div>

    {#if !data?.complaints || data.complaints.length === 0}
      <div style="text-align: center; padding: 3rem 1rem; color: #94a3b8;">
        <CheckCircle2 size={36} style="margin-bottom: 0.5rem;" />
        <p style="font-size: 1rem; margin: 0;">All clear! No active maintenance complaints in this hostel.</p>
      </div>
    {:else}
      <Table
        data={data.complaints as Complaint[]}
        density="compact"
        dividers="rows"
        hasHover
        columns={[
          { key: 'complaint_id', header: 'Ticket #', width: pixel(90) },
          { key: 'tenant_name', header: 'Resident', width: proportional(1.5) },
          { key: 'target_type', header: 'Category', width: proportional(1) },
          { key: 'description', header: 'Issue Description', width: proportional(2.5) },
          { key: 'priority', header: 'Priority', width: pixel(100), renderCell: priorityCell },
          { key: 'status', header: 'Status', width: pixel(110), renderCell: statusCell },
          { key: 'action', header: 'Actions', width: pixel(120), renderCell: actionCell }
        ]}
      />
    {/if}
  </Card>
</div>
