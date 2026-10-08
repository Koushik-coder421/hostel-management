<script lang="ts">
  import type { PageData } from './$types';
  import { Badge, Card, Table, Button, Dialog, TextInput, proportional, pixel } from '@astryx-svelte/core';
  import UserCheck from '@lucide/svelte/icons/user-check';
  import Clock from '@lucide/svelte/icons/clock';
  import Home from '@lucide/svelte/icons/home';
  import Plus from '@lucide/svelte/icons/plus';
  import LogOut from '@lucide/svelte/icons/log-out';
  import { invalidateAll } from '$app/navigation';
  import { logVisitorArrival, checkoutVisitor } from '$lib/services/visitorService';

  let { data }: { data: any } = $props();

  type Visitor = {
    id: string;
    visitorName: string;
    phone: string;
    purpose: string;
    relation: string;
    residentName: string;
    roomNumber: string;
    hostelName: string;
    entryTime: Date | string;
    exitTime: Date | string | null;
    status: 'IN_HOUSE' | 'DEPARTED';
  } & Record<string, unknown>;

  let isLogOpen = $state(false);
  let selectedTenantId = $state('');
  let visitorName = $state('');
  let phone = $state('');
  let relation = $state('Father');
  let purpose = $state('Personal Visit');
  let isSubmitting = $state(false);

  let selectedResidentDetails = $derived(
    data?.residents?.find((r: any) => String(r.tenantId) === String(selectedTenantId))
  );

  function formatDate(value: Date | string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  }

  async function handleLogArrival(e: Event) {
    e.preventDefault();
    if (!visitorName.trim() || !selectedTenantId) return;
    isSubmitting = true;
    try {
      await logVisitorArrival({
        visitorName,
        phone,
        relation,
        purpose,
        tenantId: selectedTenantId
      });
      isLogOpen = false;
      visitorName = '';
      phone = '';
      selectedTenantId = '';
      await invalidateAll();
    } catch (err) {
      console.error("Failed to log visitor arrival:", err);
    } finally {
      isSubmitting = false;
    }
  }

  async function handleCheckoutVisitor(visitorId: string) {
    try {
      await checkoutVisitor(visitorId);
      await invalidateAll();
    } catch (err) {
      console.error("Failed to check out visitor:", err);
    }
  }
</script>

{#snippet statusCell(item: Visitor)}
  <Badge
    variant={item.status === 'IN_HOUSE' ? 'success' : 'neutral'}
    label={item.status === 'IN_HOUSE' ? 'In House' : 'Departed'}
  />
{/snippet}

{#snippet timeCell(item: Visitor)}
  <span style="font-size: 0.85rem; color: var(--color-text-secondary, #9ca3af);">
    <Clock size={13} style="vertical-align: middle; margin-right: 4px;" />
    {formatDate(item.entryTime)}
  </span>
{/snippet}

{#snippet propertyCell(item: Visitor)}
  <span style="font-size: 0.85rem; display: flex; align-items: center; gap: 4px;">
    <Home size={13} />
    {item.hostelName} (Room {item.roomNumber})
  </span>
{/snippet}

{#snippet actionCell(item: Visitor)}
  {#if item.status === 'IN_HOUSE'}
    <Button
      label="Depart"
      variant="secondary"
      size="sm"
      onclick={() => handleCheckoutVisitor(item.id)}
    >
      {#snippet icon()}<LogOut size={13} />{/snippet}
    </Button>
  {:else}
    <span style="font-size: 0.8rem; color: #94a3b8;">Checked Out</span>
  {/if}
{/snippet}

<svelte:head><title>Visitor Management — EasyPG</title></svelte:head>

<div style="display: flex; flex-direction: column; gap: 1.5rem; padding: 1.5rem;">
  <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
    <div>
      <p style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted, #94a3b8); margin: 0;">
        Property Operations
      </p>
      <h1 style="font-size: 1.6rem; font-weight: 700; margin: 0.2rem 0;">Visitor Management</h1>
      <p style="font-size: 0.9rem; color: var(--color-text-secondary, #64748b); margin: 0;">
        Track active guest arrivals, resident visits, and entry/exit logs.
      </p>
    </div>
    <div style="display: flex; gap: 0.8rem; align-items: center;">
      <Badge
        variant="neutral"
        label={`${data?.metrics?.totalInHouse ?? 0} In House`}
        icon={inHouseIcon}
      />
      <Button
        label="Log Visitor Arrival"
        variant="primary"
        onclick={() => (isLogOpen = true)}
      >
        {#snippet icon()}<Plus size={16} />{/snippet}
      </Button>
    </div>
  </div>

  <Card padding={4}>
    <div style="margin-bottom: 1rem;">
      <h2 style="font-size: 1.1rem; font-weight: 600; margin: 0;">Active Visitor Log</h2>
      <p style="font-size: 0.85rem; color: var(--color-text-secondary, #64748b); margin-top: 0.2rem;">
        Real-time security register for hostel guests and visitors.
      </p>
    </div>

    <Table
      data={(data?.visitors || []) as Visitor[]}
      density="compact"
      dividers="rows"
      hasHover
      columns={[
        { key: 'visitorName', header: 'Visitor Name', width: proportional(1.5), sortable: true },
        { key: 'relation', header: 'Relation / Purpose', width: proportional(1.2) },
        { key: 'residentName', header: 'Visiting Resident', width: proportional(1.5) },
        { key: 'roomNumber', header: 'Property & Room', width: proportional(1.5), renderCell: propertyCell },
        { key: 'entryTime', header: 'Entry Time', width: proportional(1.2), renderCell: timeCell },
        { key: 'status', header: 'Status', width: pixel(110), renderCell: statusCell },
        { key: 'action', header: 'Action', width: pixel(110), renderCell: actionCell }
      ]}
    />
  </Card>
</div>

<Dialog
  isOpen={isLogOpen}
  onOpenChange={(open) => (isLogOpen = open)}
  width={480}
  purpose="form"
  aria-label="Log New Visitor Arrival"
>
  <div style="padding: 1.5rem; background: var(--color-background-card, #1e293b); color: white; border-radius: 8px;">
    <h2 style="font-size: 1.2rem; margin-top: 0; margin-bottom: 0.5rem;">Log Visitor Entry</h2>
    <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 1.2rem;">
      Select the resident being visited to resolve hostel and room location automatically.
    </p>

    <form onsubmit={handleLogArrival} style="display: flex; flex-direction: column; gap: 1rem;">
      <div>
        <label for="tenantSelect" style="display: block; font-size: 0.8125rem; font-weight: 600; color: #cbd5e1; margin-bottom: 0.375rem;">Visiting Resident</label>
        <select id="tenantSelect" bind:value={selectedTenantId} required style="width: 100%; padding: 0.625rem; border-radius: 6px; background: #0f172a; border: 1px solid #334155; color: white; font-size: 0.875rem;">
          <option value="">-- Select Resident --</option>
          {#each (data?.residents || []) as res}
            <option value={res.tenantId}>
              {res.residentName} — {res.hostelName} (Room {res.roomNumber} · Bed {res.bedLabel})
            </option>
          {/each}
        </select>
      </div>

      {#if selectedResidentDetails}
        <div style="background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.3); padding: 0.75rem; border-radius: 6px; font-size: 0.8125rem; color: #93c5fd;">
          <strong>🏠 Resolved Hostel Location:</strong> {selectedResidentDetails.hostelName}<br />
          <strong>🚪 Room & Bed:</strong> Room {selectedResidentDetails.roomNumber} (Bed {selectedResidentDetails.bedLabel})
        </div>
      {/if}

      <TextInput
        label="Visitor Full Name"
        htmlName="visitorName"
        placeholder="e.g. Ramesh Kumar"
        value={visitorName}
        onChange={(val) => (visitorName = val)}
        isRequired
      />

      <TextInput
        label="Visitor Phone Number"
        htmlName="phone"
        placeholder="e.g. 9876543210"
        value={phone}
        onChange={(val) => (phone = val)}
      />

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div>
          <label for="relationSelect" style="display: block; font-size: 0.8125rem; font-weight: 600; color: #cbd5e1; margin-bottom: 0.375rem;">Relationship</label>
          <select id="relationSelect" bind:value={relation} style="width: 100%; padding: 0.625rem; border-radius: 6px; background: #0f172a; border: 1px solid #334155; color: white; font-size: 0.875rem;">
            <option value="Father">Father</option>
            <option value="Mother">Mother</option>
            <option value="Friend">Friend</option>
            <option value="Sibling">Sibling</option>
            <option value="Relative">Relative</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label for="purposeSelect" style="display: block; font-size: 0.8125rem; font-weight: 600; color: #cbd5e1; margin-bottom: 0.375rem;">Purpose of Visit</label>
          <select id="purposeSelect" bind:value={purpose} style="width: 100%; padding: 0.625rem; border-radius: 6px; background: #0f172a; border: 1px solid #334155; color: white; font-size: 0.875rem;">
            <option value="Personal Visit">Personal Visit</option>
            <option value="Delivering Belongings">Delivering Belongings</option>
            <option value="Emergency Visit">Emergency Visit</option>
            <option value="Official Work">Official Work</option>
          </select>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.8rem; margin-top: 1rem;">
        <Button
          label="Cancel"
          type="button"
          variant="secondary"
          onclick={() => (isLogOpen = false)}
        />
        <Button
          label={isSubmitting ? 'Logging...' : 'Log Visitor Entry'}
          type="submit"
          variant="primary"
          isDisabled={isSubmitting}
        />
      </div>
    </form>
  </div>
</Dialog>

{#snippet inHouseIcon()}<UserCheck size={14} />{/snippet}
