<script lang="ts">
  import { enhance } from '$lib/api/forms';
  import { invalidateAll } from '$app/navigation';
  import {
    Badge,
    Button,
    Card,
    Heading,
    ProgressBar,
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableHeaderCell,
    TableRow,
    Text
  } from '@astryx-svelte/core';
  import MetricCard from '$lib/components/patterns/MetricCard.svelte';
  import { sx } from '$lib/design/attrs';
  import { tableLayout } from '$lib/design/table.stylex';
  import { formatDate, formatRelative } from '$lib/formatters/date.js';
  import { formatPaise, formatPaiseCompact } from '$lib/formatters/money.js';
  import type { PageData } from './$types';
  import { styles } from './page.stylex';
  import Activity from '@lucide/svelte/icons/activity';
  import AlertCircle from '@lucide/svelte/icons/alert-circle';
  import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import BedDouble from '@lucide/svelte/icons/bed-double';
  import Building2 from '@lucide/svelte/icons/building-2';
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';
  import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
  import Clock from '@lucide/svelte/icons/clock';
  import Home from '@lucide/svelte/icons/home';
  import IndianRupee from '@lucide/svelte/icons/indian-rupee';
  import Receipt from '@lucide/svelte/icons/receipt';
  import TrendingUp from '@lucide/svelte/icons/trending-up';
  import UserCheck from '@lucide/svelte/icons/user-check';
  import Users from '@lucide/svelte/icons/users';

  import { onMount } from 'svelte';
  import { fetchMyStayDetails, submitResidentComplaint, fetchResidentComplaints } from '$lib/services/residentService';
  import { updateStaffProfile } from '$lib/services/hierarchyService';

  let { data }: { data: PageData } = $props();
  let role = $derived(data.role);
  let platformData = $derived(data.platformData);
  let orgData = $derived(data.orgData);
  let managerData = $derived(data.managerData);
  let switchingHostelId = $state<string | null>(null);
  let switchError = $state('');

  // Resident State
  let residentStay = $state<any>(null);
  let residentComplaints = $state<any[]>([]);
  let complaintDescription = $state('');
  let complaintType = $state<'ROOM' | 'BED' | 'FACILITY'>('ROOM');
  let complaintPriority = $state<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  let isSubmittingComplaint = $state(false);
  let complaintMsg = $state('');
  let complaintErr = $state('');

  // Password change state
  let newPassword = $state('');
  let showNewPassword = $state(false);
  let passwordMsg = $state('');
  let passwordErr = $state('');

  onMount(async () => {
    if ((role as string) === 'TENANT' || (role as string) === 'tenant' || (role as string) === 'resident') {
      await loadResidentData();
    }
  });

  async function loadResidentData() {
    try {
      const stayRes = await fetchMyStayDetails();
      residentStay = stayRes.data || stayRes;
      if (residentStay?.resident?.tenant_id) {
        const compRes = await fetchResidentComplaints(residentStay.resident.tenant_id);
        residentComplaints = compRes.data || compRes;
      }
    } catch (err) {
      console.error("Failed to load resident stay data:", err);
    }
  }

  async function handleRaiseComplaint(e: Event) {
    e.preventDefault();
    if (!residentStay?.resident?.tenant_id || !residentStay?.stay) {
      complaintErr = 'No active stay allocation found to raise complaint.';
      return;
    }
    isSubmittingComplaint = true;
    complaintMsg = '';
    complaintErr = '';
    try {
      const targetId = complaintType === 'ROOM' ? residentStay.stay.room_id : (complaintType === 'BED' ? residentStay.stay.bed_id : residentStay.stay.hostel_id);
      await submitResidentComplaint({
        tenant_id: residentStay.resident.tenant_id,
        target_type: complaintType,
        target_id: targetId,
        description: complaintDescription,
        priority: complaintPriority
      });
      complaintMsg = 'Complaint submitted successfully! It has been routed to your Maintenance Supervisor.';
      complaintDescription = '';
      await loadResidentData();
    } catch (err: any) {
      complaintErr = err.message || 'Failed to submit complaint';
    } finally {
      isSubmittingComplaint = false;
    }
  }

  async function handleChangePassword(e: Event) {
    e.preventDefault();
    if (!newPassword.trim()) return;
    passwordMsg = '';
    passwordErr = '';
    try {
      const staffId = (data as any)?.user?.staff_id || (data as any)?.user?.id;
      if (staffId) {
        await updateStaffProfile(staffId, { password: newPassword });
      }
      passwordMsg = 'Password updated successfully!';
      newPassword = '';
    } catch (err: any) {
      passwordErr = err.message || 'Failed to update password';
    }
  }

  function actionError(result: unknown): string {
    if (typeof result === 'object' && result !== null && 'data' in result) {
      const data = (result as { data?: unknown }).data;
      if (typeof data === 'object' && data !== null && 'error' in data) {
        const error = (data as { error?: unknown }).error;
        if (typeof error === 'string') return error;
      }
    }
    if (typeof result === 'object' && result !== null && 'error' in result) {
      const error = (result as { error?: unknown }).error;
      if (typeof error === 'object' && error !== null && 'message' in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === 'string') return message;
      }
    }
    return 'Property could not be selected. Please try again.';
  }

  function getActivityIcon(action: string) {
    if (action.includes('check_in') || action.includes('resident')) return UserCheck;
    if (action.includes('payment')) return Receipt;
    if (action.includes('check_out')) return ArrowRight;
    return Activity;
  }

  function formatActivityAction(action: string): string {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
  }
</script>

<svelte:head><title>Dashboard — EasyPG</title></svelte:head>

{#snippet platformIcon()}<Building2 size={16} />{/snippet}
{#snippet hostelIcon()}<Home size={16} />{/snippet}
{#snippet residentIcon()}<Users size={16} />{/snippet}
{#snippet checkInIcon()}<UserCheck size={16} />{/snippet}
{#snippet paymentIcon()}<Receipt size={16} />{/snippet}
{#snippet arrowIcon()}<ArrowRight size={14} />{/snippet}

<div {...sx(styles.page)}>
  {#if (role as string) === 'TENANT' || (role as string) === 'tenant' || (role as string) === 'resident'}
    <header style="margin-bottom: 2rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
        <div>
          <span style="font-size: 0.875rem; font-weight: 600; color: var(--color-accent, #3b82f6); text-transform: uppercase; letter-spacing: 0.05em;">Resident Portal</span>
          <h1 style="font-size: 1.875rem; font-weight: 700; margin: 0.25rem 0 0.5rem 0;">Welcome, {residentStay?.resident?.name || 'Resident'}</h1>
          <p style="color: var(--color-text-secondary, #94a3b8); margin: 0;">Manage your stay details, raise maintenance complaints, and view complaint status.</p>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <span class="badge neutral" style="padding: 0.5rem 1rem; border-radius: 9999px; background: rgba(59, 130, 246, 0.1); color: #60a5fa; font-weight: 600;">
            Status: {residentStay?.resident?.status || 'ACTIVE'}
          </span>
        </div>
      </div>
    </header>

    <!-- Stay & Supervisor Info Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
      <!-- Active Stay Card -->
      <div style="background: var(--color-background-card, #1e293b); border: 1px solid var(--color-border, #334155); border-radius: 12px; padding: 1.5rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
          <h3 style="font-size: 1.125rem; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            🏠 Current Stay Allocation
          </h3>
          <span style="font-size: 0.75rem; padding: 0.25rem 0.625rem; border-radius: 4px; background: #059669; color: white; font-weight: 600;">
            Active Allocation
          </span>
        </div>

        {#if residentStay?.stay}
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9375rem;">
            <div>
              <span style="color: #94a3b8; font-size: 0.8125rem; display: block;">Hostel Name</span>
              <strong style="color: #f8fafc;">{residentStay.stay.hostel_name}</strong>
            </div>
            <div>
              <span style="color: #94a3b8; font-size: 0.8125rem; display: block;">Floor</span>
              <strong style="color: #f8fafc;">{residentStay.stay.floor_name || `Floor ${residentStay.stay.floor_number}`}</strong>
            </div>
            <div>
              <span style="color: #94a3b8; font-size: 0.8125rem; display: block;">Room Number</span>
              <strong style="color: #f8fafc;">Room {residentStay.stay.room_number} ({residentStay.stay.room_type || 'Standard'})</strong>
            </div>
            <div>
              <span style="color: #94a3b8; font-size: 0.8125rem; display: block;">Bed Assignment</span>
              <strong style="color: #38bdf8;">Bed {residentStay.stay.bed_number}</strong>
            </div>
            <div style="grid-column: span 2;">
              <span style="color: #94a3b8; font-size: 0.8125rem; display: block;">Hostel Address</span>
              <span style="color: #cbd5e1;">{residentStay.stay.hostel_address || 'Address not specified'}</span>
            </div>
            <div style="grid-column: span 2; border-top: 1px dashed #334155; padding-top: 0.75rem; margin-top: 0.25rem;">
              <span style="color: #94a3b8; font-size: 0.8125rem; display: block;">Check-in Date</span>
              <strong style="color: #f8fafc;">{residentStay.stay.start_date ? formatDate(residentStay.stay.start_date) : 'N/A'}</strong>
            </div>
          </div>
        {:else}
          <div style="padding: 1.5rem 0; text-align: center; color: #94a3b8;">
            <p>No active stay allocation recorded yet.</p>
          </div>
        {/if}
      </div>

      <!-- Maintenance Supervisor Card -->
      <div style="background: var(--color-background-card, #1e293b); border: 1px solid var(--color-border, #334155); border-radius: 12px; padding: 1.5rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
          <h3 style="font-size: 1.125rem; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            🛠️ Maintenance Supervisor Contact
          </h3>
          <span style="font-size: 0.75rem; padding: 0.25rem 0.625rem; border-radius: 4px; background: #2563eb; color: white; font-weight: 600;">
            Assigned Contact
          </span>
        </div>

        {#if residentStay?.maintenance_supervisor}
          <div style="display: flex; flex-direction: column; gap: 1rem; font-size: 0.9375rem;">
            <div>
              <span style="color: #94a3b8; font-size: 0.8125rem; display: block;">Supervisor Name</span>
              <strong style="color: #f8fafc; font-size: 1.125rem;">{residentStay.maintenance_supervisor.supervisor_name}</strong>
            </div>
            <div>
              <span style="color: #94a3b8; font-size: 0.8125rem; display: block;">Phone Number</span>
              <a href={`tel:${residentStay.maintenance_supervisor.supervisor_phone}`} style="color: #38bdf8; text-decoration: none; font-weight: 600;">
                📞 {residentStay.maintenance_supervisor.supervisor_phone || 'Not available'}
              </a>
            </div>
            <div>
              <span style="color: #94a3b8; font-size: 0.8125rem; display: block;">Email Address</span>
              <a href={`mailto:${residentStay.maintenance_supervisor.supervisor_email}`} style="color: #38bdf8; text-decoration: none;">
                ✉️ {residentStay.maintenance_supervisor.supervisor_email || 'Not available'}
              </a>
            </div>
            <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); padding: 0.75rem; border-radius: 6px; margin-top: 0.5rem;">
              <p style="margin: 0; font-size: 0.8125rem; color: #93c5fd;">
                ℹ️ Any complaints raised below will be automatically routed to {residentStay.maintenance_supervisor.supervisor_name}.
              </p>
            </div>
          </div>
        {:else}
          <div style="padding: 1.5rem 0; text-align: center; color: #94a3b8;">
            <p>No Maintenance Supervisor currently assigned to this property.</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Raise Complaint & Password Grid -->
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
      <!-- Raise Complaint Form -->
      <div style="background: var(--color-background-card, #1e293b); border: 1px solid var(--color-border, #334155); border-radius: 12px; padding: 1.5rem;">
        <h3 style="font-size: 1.125rem; font-weight: 600; margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.5rem;">
          📢 Submit a Maintenance Complaint / Issue
        </h3>

        {#if complaintMsg}
          <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #34d399; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.875rem;">
            {complaintMsg}
          </div>
        {/if}
        {#if complaintErr}
          <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #f87171; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.875rem;">
            {complaintErr}
          </div>
        {/if}

        <form onsubmit={handleRaiseComplaint} style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
              <label for="complaintTypeSelect" style="display: block; font-size: 0.8125rem; font-weight: 600; color: #cbd5e1; margin-bottom: 0.375rem;">Issue Category</label>
              <select id="complaintTypeSelect" bind:value={complaintType} style="width: 100%; padding: 0.625rem; border-radius: 6px; background: #0f172a; border: 1px solid #334155; color: white; font-size: 0.875rem;">
                <option value="ROOM">Room Issue (Plumbing, Electrical, Door, AC)</option>
                <option value="BED">Bed Issue (Mattress, Frame, Bedding)</option>
                <option value="FACILITY">Hostel Common Facility (Wifi, Water Heater, Mess)</option>
              </select>
            </div>
            <div>
              <label for="complaintPrioritySelect" style="display: block; font-size: 0.8125rem; font-weight: 600; color: #cbd5e1; margin-bottom: 0.375rem;">Priority Level</label>
              <select id="complaintPrioritySelect" bind:value={complaintPriority} style="width: 100%; padding: 0.625rem; border-radius: 6px; background: #0f172a; border: 1px solid #334155; color: white; font-size: 0.875rem;">
                <option value="LOW">Low (Minor request)</option>
                <option value="MEDIUM">Medium (Normal maintenance)</option>
                <option value="HIGH">High (Urgent attention needed)</option>
                <option value="URGENT">Urgent (Emergency / Severe hazard)</option>
              </select>
            </div>
          </div>

          <div>
            <label for="complaintDescriptionArea" style="display: block; font-size: 0.8125rem; font-weight: 600; color: #cbd5e1; margin-bottom: 0.375rem;">Problem Description</label>
            <textarea
              id="complaintDescriptionArea"
              bind:value={complaintDescription}
              required
              rows={4}
              placeholder="Describe the issue in detail (e.g. Tap leaking in bathroom, air conditioner not cooling)..."
              style="width: 100%; padding: 0.75rem; border-radius: 6px; background: #0f172a; border: 1px solid #334155; color: white; font-size: 0.875rem; resize: vertical;"
            ></textarea>
          </div>

          <div style="display: flex; justify-content: flex-end;">
            <button
              type="submit"
              disabled={isSubmittingComplaint}
              style="background: #2563eb; color: white; padding: 0.625rem 1.25rem; border-radius: 6px; font-weight: 600; border: none; cursor: pointer;"
            >
              {isSubmittingComplaint ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </div>
        </form>
      </div>

      <!-- Password Change Card -->
      <div style="background: var(--color-background-card, #1e293b); border: 1px solid var(--color-border, #334155); border-radius: 12px; padding: 1.5rem;">
        <h3 style="font-size: 1.125rem; font-weight: 600; margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.5rem;">
          🔑 Account Credentials
        </h3>
        <p style="font-size: 0.8125rem; color: #94a3b8; margin-bottom: 1rem;">
          Update your login password for secure portal access.
        </p>

        {#if passwordMsg}
          <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #34d399; padding: 0.625rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.8125rem;">
            {passwordMsg}
          </div>
        {/if}
        {#if passwordErr}
          <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #f87171; padding: 0.625rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.8125rem;">
            {passwordErr}
          </div>
        {/if}

        <form onsubmit={handleChangePassword} style="display: flex; flex-direction: column; gap: 0.875rem;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.375rem;">
              <label for="newPasswordInput" style="font-size: 0.8125rem; font-weight: 600; color: #cbd5e1; margin: 0;">New Password</label>
              <button
                type="button"
                style="background: transparent; border: none; color: #38bdf8; font-size: 0.75rem; cursor: pointer; padding: 0;"
                onclick={() => (showNewPassword = !showNewPassword)}
              >
                {showNewPassword ? '🔒 Hide Password' : '👁️ Show Password'}
              </button>
            </div>
            <input
              id="newPasswordInput"
              type={showNewPassword ? 'text' : 'password'}
              bind:value={newPassword}
              required
              placeholder="Enter new password"
              style="width: 100%; padding: 0.625rem; border-radius: 6px; background: #0f172a; border: 1px solid #334155; color: white; font-size: 0.875rem;"
            />
          </div>

          <button
            type="submit"
            style="background: #475569; color: white; padding: 0.625rem 1rem; border-radius: 6px; font-weight: 600; border: none; cursor: pointer;"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>

    <!-- Complaint History Section -->
    <div style="background: var(--color-background-card, #1e293b); border: 1px solid var(--color-border, #334155); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="font-size: 1.125rem; font-weight: 600; margin: 0;">
          📜 Submitted Complaints History
        </h3>
        <span style="font-size: 0.8125rem; color: #94a3b8;">{residentComplaints.length} Total Tickets</span>
      </div>

      {#if residentComplaints.length === 0}
        <div style="text-align: center; padding: 2rem 0; color: #94a3b8;">
          <p style="margin: 0;">No complaints have been submitted yet.</p>
        </div>
      {:else}
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem;">
            <thead>
              <tr style="border-bottom: 1px solid #334155; color: #94a3b8;">
                <th style="padding: 0.75rem;">Ticket ID</th>
                <th style="padding: 0.75rem;">Category</th>
                <th style="padding: 0.75rem;">Priority</th>
                <th style="padding: 0.75rem;">Description</th>
                <th style="padding: 0.75rem;">Status</th>
                <th style="padding: 0.75rem;">Date</th>
              </tr>
            </thead>
            <tbody>
              {#each residentComplaints as complaint}
                <tr style="border-bottom: 1px solid #1e293b; color: white;">
                  <td style="padding: 0.75rem; font-weight: 600; color: #38bdf8;">#{complaint.complaint_id || complaint.ticket_id || complaint.id}</td>
                  <td style="padding: 0.75rem;">{complaint.target_type || complaint.type}</td>
                  <td style="padding: 0.75rem;">
                    <span style={`padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; ${
                      complaint.priority === 'URGENT' ? 'background: #991b1b; color: #fca5a5;' :
                      complaint.priority === 'HIGH' ? 'background: #9a3412; color: #fdba74;' :
                      complaint.priority === 'MEDIUM' ? 'background: #854d0e; color: #fef08a;' :
                      'background: #1e3a8a; color: #93c5fd;'
                    }`}>
                      {complaint.priority || 'MEDIUM'}
                    </span>
                  </td>
                  <td style="padding: 0.75rem; max-width: 300px;">{complaint.description}</td>
                  <td style="padding: 0.75rem;">
                    <span style={`padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; ${
                      complaint.status === 'RESOLVED' || complaint.status === 'CLOSED' ? 'background: #065f46; color: #6ee7b7;' :
                      complaint.status === 'IN_PROGRESS' ? 'background: #1e40af; color: #93c5fd;' :
                      'background: #374151; color: #e5e7eb;'
                    }`}>
                      {complaint.status || 'OPEN'}
                    </span>
                  </td>
                  <td style="padding: 0.75rem; color: #94a3b8;">{complaint.created_at ? formatDate(complaint.created_at) : 'N/A'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {:else if (role === 'platform_admin' || role === 'SUPERADMIN' || role === 'ADMIN' || role === 'HEAD') && platformData}
    <header {...sx(styles.pageHeader)}>
      <div {...sx(styles.headerCopy)}>
        <Text type="label" color="accent" weight="semibold" display="block"
          >Platform operations</Text
        >
        <Heading level={1} type="display-3" xstyle={styles.title}>Platform overview</Heading>
        <Text type="supporting" display="block" xstyle={styles.description}
          >Global operational metrics across all registered tenant organizations.</Text
        >
      </div>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
        <Button
          label="Manage hierarchy & staff"
          href="/hierarchy"
          variant="primary"
          icon={platformIcon}
        />
        <Button
          label="Manage organizations"
          href="/organizations"
          variant="secondary"
          icon={platformIcon}
        />
      </div>
    </header>

    <section {...sx(styles.metricGrid)} aria-label="Platform metrics">
      <MetricCard
        label="Organizations"
        value={platformData.activeOrganizations}
        description="Registered operating entities"
        >{#snippet icon()}<Building2 size={16} />{/snippet}</MetricCard
      >
      <MetricCard
        label="Hostels"
        value={platformData.activeHostels}
        description="Properties across all cities"
        tone="info">{#snippet icon()}<Home size={16} />{/snippet}</MetricCard
      >
      <MetricCard
        label="Residents"
        value={platformData.activeResidents}
        description="Current verified occupants"
        tone="success">{#snippet icon()}<Users size={16} />{/snippet}</MetricCard
      >
      <MetricCard
        label="Outstanding"
        value={formatPaiseCompact(platformData.totalOutstandingPaise)}
        description="Platform-wide pending dues"
        tone="warning">{#snippet icon()}<AlertCircle size={16} />{/snippet}</MetricCard
      >
    </section>

    <section {...sx(styles.financeGrid)} aria-label="Platform financial summary">
      <Card padding={4} xstyle={styles.financeCard}
        ><Text type="label" color="secondary" weight="semibold" display="block"
          >This month billed</Text
        ><Text as="p" type="display-3" weight="semibold" xstyle={styles.financeValue}
          >{formatPaise(platformData.currentMonthBilledPaise)}</Text
        ><Text type="supporting" display="block">Total invoiced in the current cycle</Text></Card
      >
      <Card padding={4} xstyle={styles.financeCard}
        ><Text type="label" color="secondary" weight="semibold" display="block"
          >This month collected</Text
        ><Text as="p" type="display-3" weight="semibold" xstyle={styles.financeValueSuccess}
          >{formatPaise(platformData.currentMonthCollectedPaise)}</Text
        ><Text type="supporting" display="block">Successfully cleared payments</Text></Card
      >
      <Card padding={4} xstyle={styles.financeCard}
        ><Text type="label" color="secondary" weight="semibold" display="block">Total overdue</Text
        ><Text as="p" type="display-3" weight="semibold" xstyle={styles.financeValueError}
          >{formatPaise(platformData.totalOverduePaise)}</Text
        ><Text type="supporting" display="block"
          >{platformData.overdueInvoicesCount} invoices past grace period</Text
        ></Card
      >
    </section>

    <section {...sx(styles.contentSection)} aria-labelledby="organization-comparison-heading">
      <div {...sx(styles.sectionHeader)}>
        <Heading level={2} xstyle={styles.sectionTitle} id="organization-comparison-heading"
          >Organization comparison</Heading
        ><Text type="supporting">{platformData.organizations.length} organizations</Text>
      </div>
      <div {...sx(styles.comparisonGrid)}>
        {#each platformData.organizations as organization (organization.id)}
          <Card padding={4} xstyle={styles.comparisonCard}>
            <div {...sx(styles.identityRow)}>
              <div {...sx(styles.identityGroup)}>
                <span {...sx(styles.avatar)}>{organization.name.slice(0, 2).toUpperCase()}</span>
                <div {...sx(styles.identityCopy)}>
                  <Heading level={3} xstyle={styles.cardTitle}>{organization.name}</Heading><Text
                    type="supporting"
                    display="block"
                    xstyle={styles.code}>{organization.id.slice(0, 8)}</Text
                  >
                </div>
              </div>
              <Badge label="Active" variant="success" />
            </div>
            <div {...sx(styles.statGrid)}>
              <div>
                <Text type="supporting" display="block">Hostels</Text><Text
                  as="p"
                  weight="semibold"
                  xstyle={styles.statValue}>{organization.hostelCount}</Text
                >
              </div>
              <div>
                <Text type="supporting" display="block">Active residents</Text><Text
                  as="p"
                  weight="semibold"
                  xstyle={styles.statValue}>{organization.residentCount}</Text
                >
              </div>
              <div>
                <Text type="supporting" display="block">Total billed</Text><Text
                  as="p"
                  weight="semibold"
                  xstyle={styles.statValue}>{formatPaiseCompact(organization.billedPaise)}</Text
                >
              </div>
              <div>
                <Text type="supporting" display="block">Outstanding</Text><Text
                  as="p"
                  weight="semibold"
                  xstyle={organization.outstandingPaise > 0
                    ? styles.warningValue
                    : styles.statValue}>{formatPaiseCompact(organization.outstandingPaise)}</Text
                >
              </div>
            </div>
            <div {...sx(styles.cardFooter)}>
              <Text type="supporting">Overdue: {formatPaiseCompact(organization.overduePaise)}</Text
              ><Button
                label="View hostels"
                href="/hostels"
                variant="ghost"
                size="sm"
                endContent={arrowIcon}
              />
            </div>
          </Card>
        {/each}
      </div>
    </section>
  {:else if ((role as string) === 'organization_admin' || (role as string) === 'org_admin' || (role as string) === 'ORG_ADMIN' || (role as string) === 'partner' || role === 'PARTNER') && orgData}
    <div style="background: var(--color-background-card, #1e293b); border: 1px solid var(--color-border, #334155); border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
      <div>
        <Text type="label" color="accent" weight="semibold" display="block">Assigned Role & Organization Scope</Text>
        <Text type="body" weight="semibold" display="block">Role: Partner / Organization Admin</Text>
        <Text type="supporting" color="secondary" display="block">Organization: {orgData.organizationName} • {orgData.hostelCount} Suitable Hostels Assigned</Text>
      </div>
      <Badge label="Organization Admin" variant="info" />
    </div>

    <header {...sx(styles.pageHeader)}>
      <div {...sx(styles.headerCopy)}>
        <Text type="label" color="accent" weight="semibold" display="block"
          >Organization portfolio</Text
        ><Heading level={1} type="display-3" xstyle={styles.title}
          >{orgData.organizationName}</Heading
        ><Text type="supporting" display="block" xstyle={styles.description}
          >Portfolio across {orgData.hostelCount}
          {orgData.hostelCount === 1 ? 'hostel' : 'hostels'} and {orgData.totalResidents} active residents.</Text
        >
      </div>
      <Button label="All hostels" href="/hostels" variant="secondary" icon={hostelIcon} />
    </header>

    <section {...sx(styles.metricGrid)} aria-label="Organization metrics">
      <MetricCard
        label="Occupancy"
        value={`${orgData.occupancyRate}%`}
        description={`${orgData.occupiedBeds} of ${orgData.sellableBeds} sellable beds`}
        progress={orgData.occupancyRate}
        >{#snippet icon()}<TrendingUp size={16} />{/snippet}</MetricCard
      >
      <MetricCard
        label="Available beds"
        value={orgData.availableBeds}
        description="Ready for resident assignment"
        tone="success">{#snippet icon()}<BedDouble size={16} />{/snippet}</MetricCard
      >
      <MetricCard
        label="Physical beds"
        value={orgData.physicalBeds}
        description={`${orgData.sellableBeds} operational capacity`}
        tone="info">{#snippet icon()}<Home size={16} />{/snippet}</MetricCard
      >
      <MetricCard
        label="Active residents"
        value={orgData.totalResidents}
        description="With active lease agreements"
        >{#snippet icon()}<Users size={16} />{/snippet}</MetricCard
      >
    </section>

    <section {...sx(styles.financeGrid)} aria-label="Organization financial summary">
      <Card padding={4} xstyle={styles.financeCard}
        ><Text type="label" color="secondary" weight="semibold" display="block"
          >This month billed</Text
        ><Text as="p" type="display-3" weight="semibold" xstyle={styles.financeValue}
          >{formatPaise(orgData.currentMonthBilledPaise)}</Text
        ><Text type="supporting" display="block">Invoiced rent and utility fees</Text></Card
      >
      <Card padding={4} xstyle={styles.financeCard}
        ><Text type="label" color="secondary" weight="semibold" display="block"
          >Collected this month</Text
        ><Text as="p" type="display-3" weight="semibold" xstyle={styles.financeValueSuccess}
          >{formatPaise(orgData.currentMonthCollectedPaise)}</Text
        ><Text type="supporting" display="block">Payments deposited and verified</Text></Card
      >
      <Card padding={4} xstyle={styles.financeCard}
        ><Text type="label" color="secondary" weight="semibold" display="block"
          >Total outstanding</Text
        ><Text as="p" type="display-3" weight="semibold" xstyle={styles.financeValueWarning}
          >{formatPaise(orgData.totalOutstandingPaise)}</Text
        ><Text type="supporting" display="block"
          >Includes {formatPaiseCompact(orgData.totalOverduePaise)} overdue</Text
        ></Card
      >
    </section>

    <section {...sx(styles.contentSection)} aria-labelledby="hostel-performance-heading">
      <div {...sx(styles.sectionHeader)}>
        <Heading level={2} xstyle={styles.sectionTitle} id="hostel-performance-heading"
          >Hostel performance comparison</Heading
        ><Text type="supporting">{orgData.hostels.length} properties</Text>
      </div>
      {#if switchError}
        <Text as="p" type="supporting" color="secondary" role="alert">{switchError}</Text>
      {/if}
      <div {...sx(styles.hostelGrid)}>
        {#each orgData.hostels as hostel (hostel.id)}
          <Card padding={4} xstyle={styles.comparisonCard}>
            <div {...sx(styles.identityRow)}>
              <div {...sx(styles.identityCopy)}>
                <Heading level={3} xstyle={styles.cardTitle}>{hostel.name}</Heading><Text
                  type="supporting"
                  display="block">{hostel.city}</Text
                >
              </div>
              <Badge label={`${hostel.occupancyRate}%`} variant="neutral" />
            </div>
            <ProgressBar
              label={`${hostel.name} occupancy`}
              value={hostel.occupancyRate}
              hasValueLabel
              variant="accent"
            />
            <div {...sx(styles.thirdStatGrid)}>
              <div>
                <Text type="supporting" display="block">Available</Text><Text
                  as="p"
                  weight="semibold"
                  xstyle={styles.successValue}>{hostel.availableBeds}</Text
                >
              </div>
              <div>
                <Text type="supporting" display="block">Residents</Text><Text
                  as="p"
                  weight="semibold"
                  xstyle={styles.statValue}>{hostel.residentCount}</Text
                >
              </div>
              <div>
                <Text type="supporting" display="block">Outstanding</Text><Text
                  as="p"
                  weight="semibold"
                  xstyle={hostel.outstandingPaise > 0 ? styles.warningValue : styles.statValue}
                  >{formatPaiseCompact(hostel.outstandingPaise)}</Text
                >
              </div>
            </div>
            <form
              method="POST"
              data-operation="switchHostel"
              use:enhance={() => {
                switchingHostelId = hostel.id;
                switchError = '';
                return async ({ result }) => {
                  if (result.type === 'success') {
                    await invalidateAll();
                  } else if (result.type === 'failure' || result.type === 'error') {
                    switchError = actionError(result);
                  }
                  switchingHostelId = null;
                };
              }}
              {...sx(styles.formAction)}
            >
              <input type="hidden" name="hostelId" value={hostel.id} /><Button
                label={switchingHostelId === hostel.id ? 'Switching…' : 'Switch to this hostel'}
                type="submit"
                variant="secondary"
                icon={hostelIcon}
                xstyle={styles.fullWidthButton}
                isDisabled={switchingHostelId === hostel.id}
              />
            </form>
          </Card>
        {/each}
      </div>
    </section>
  {:else if managerData}
    <div style="background: var(--color-background-card, #1e293b); border: 1px solid var(--color-border, #334155); border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
      <div>
        <Text type="label" color="accent" weight="semibold" display="block">Assigned Role & Property Scope</Text>
        <Text type="body" weight="semibold" display="block">Role: {(role as string) === 'supervisor' || role === 'SUPERVISOR' ? 'Supervisor' : 'Property Manager'}</Text>
        <Text type="supporting" color="secondary" display="block">Assigned Property: {managerData.hostelName} (Suitable for operational management)</Text>
      </div>
      <Badge label={(role as string) === 'supervisor' || role === 'SUPERVISOR' ? 'Supervisor' : 'Property Manager'} variant="success" />
    </div>

    <header {...sx(styles.pageHeader)}>
      <div {...sx(styles.headerCopy)}>
        <Text type="label" color="accent" weight="semibold" display="block">Daily overview</Text>
        <div {...sx(styles.titleRow)}>
          <Heading level={1} type="display-3" xstyle={styles.title}
            >{managerData.hostelName}</Heading
          ><Badge label="Active property" variant="info" />
        </div>
        <Text type="supporting" display="block" xstyle={styles.description}
          >Real-time daily operations, resident occupancy, and collections.</Text
        >
      </div>
      <div {...sx(styles.headerActions)}>
        <Button
          label="Residents"
          href="/residents"
          variant="secondary"
          icon={residentIcon}
        /><Button label="Check in" href="/check-ins" variant="primary" icon={checkInIcon} /><Button
          label="Record payment"
          href="/payments"
          variant="secondary"
          icon={paymentIcon}
        />
      </div>
    </header>
    <section {...sx(styles.mobileActions)} aria-label="Quick actions">
      <Button
        label="Check in"
        href="/check-ins"
        variant="primary"
        icon={checkInIcon}
        xstyle={styles.fullWidthButton}
      /><Button
        label="Payments"
        href="/payments"
        variant="secondary"
        icon={paymentIcon}
        xstyle={styles.fullWidthButton}
      />
    </section>
    <section {...sx(styles.metricGrid)} aria-label="Property metrics">
      <MetricCard
        label="Occupancy"
        value={`${managerData.occupancyRate}%`}
        description={`${managerData.occupiedBeds} of ${managerData.sellableBeds} beds occupied`}
        progress={managerData.occupancyRate}
        >{#snippet icon()}<TrendingUp size={16} />{/snippet}</MetricCard
      >
      <MetricCard
        label="Available beds"
        value={managerData.availableBeds}
        description={managerData.blockedBeds > 0
          ? `${managerData.blockedBeds} blocked`
          : 'Ready for move-in'}
        tone="success">{#snippet icon()}<BedDouble size={16} />{/snippet}</MetricCard
      >
      <MetricCard
        label="Active residents"
        value={managerData.activeResidents}
        description="Registered occupants"
        tone="info">{#snippet icon()}<Users size={16} />{/snippet}</MetricCard
      >
      <MetricCard
        label="Overdue invoices"
        value={managerData.overdueInvoices}
        description={managerData.overdueInvoices > 0 ? 'Requires attention' : 'All clear'}
        tone={managerData.overdueInvoices > 0 ? 'destructive' : 'neutral'}
        >{#snippet icon()}<AlertCircle size={16} />{/snippet}</MetricCard
      >
    </section>
    <Card padding={4} xstyle={styles.operationsCard}
      ><div {...sx(styles.operationsGrid)}>
        <div {...sx(styles.operation)}>
          <span {...sx([styles.operationIcon, styles.operationSuccess])}
            ><IndianRupee size={18} /></span
          >
          <div>
            <Text type="supporting" display="block">Collections today</Text><Text
              as="p"
              weight="semibold"
              xstyle={styles.operationValue}>{formatPaise(managerData.collectionsTodayPaise)}</Text
            >
          </div>
        </div>
        <div {...sx(styles.operation)}>
          <span {...sx([styles.operationIcon, styles.operationInfo])}
            ><CalendarClock size={18} /></span
          >
          <div>
            <Text type="supporting" display="block">Payments due today</Text><Text
              as="p"
              weight="semibold"
              xstyle={styles.operationValue}>{managerData.paymentsDueToday}</Text
            >
          </div>
        </div>
        <div {...sx(styles.operation)}>
          <span {...sx([styles.operationIcon, styles.operationWarning])}><Clock size={18} /></span>
          <div>
            <Text type="supporting" display="block">Expected check-outs</Text><Text
              as="p"
              weight="semibold"
              xstyle={styles.operationValue}>{managerData.expectedCheckouts}</Text
            >
          </div>
        </div>
      </div></Card
    >
    <section {...sx(styles.dualColumn)}>
      <Card padding={0} xstyle={styles.listCard}
        ><div {...sx(styles.cardHeading)}>
          <div {...sx(styles.titleRow)}>
            <Activity size={16} /><Heading level={2} xstyle={styles.cardTitle}
              >Recent activity</Heading
            >
          </div>
          <Text type="supporting">Last 10 events</Text>
        </div>
        {#if managerData.recentActivity.length === 0}<Text
            as="p"
            type="supporting"
            xstyle={styles.emptyText}>No recent audit activity recorded yet.</Text
          >{:else}<div {...sx(styles.activityList)}>
            {#each managerData.recentActivity as event}{@const EventIcon = getActivityIcon(
                event.action
              )}
              <div {...sx(styles.activityItem)}>
                <span {...sx(styles.activityIcon)}><EventIcon size={16} /></span>
                <div {...sx(styles.activityCopy)}>
                  <Text as="p" weight="medium" maxLines={1} xstyle={styles.activityTitle}
                    >{formatActivityAction(event.action)}</Text
                  ><Text type="supporting" display="block" maxLines={1}
                    >{event.entityType} · {formatDate(event.createdAt)}</Text
                  >
                </div>
                <Text type="supporting" xstyle={styles.activityTime}
                  >{formatRelative(event.createdAt)}</Text
                >
              </div>{/each}
          </div>{/if}</Card
      >
      <Card padding={0} xstyle={styles.listCard}
        ><div {...sx(styles.cardHeading)}>
          <div {...sx(styles.titleRow)}>
            <AlertTriangle size={16} /><Heading level={2} xstyle={styles.cardTitle}
              >Overdue invoices</Heading
            >
          </div>
          <Button
            label="View all"
            href="/payments"
            variant="ghost"
            size="sm"
            endContent={arrowIcon}
          />
        </div>
        {#if managerData.overdueInvoicesList.length === 0}<div {...sx(styles.emptyState)}>
            <CheckCircle2 size={28} /><Heading level={3} xstyle={styles.emptyHeading}
              >No overdue invoices</Heading
            ><Text type="supporting" display="block"
              >All residents are currently up to date on payments.</Text
            >
          </div>{:else}<div {...sx([styles.tableShell, tableLayout.inset])}>
            <Table density="compact" hasHover xstyle={styles.table}
              ><TableHeader
                ><TableRow isHeaderRow
                  ><TableHeaderCell scope="col">Resident</TableHeaderCell><TableHeaderCell
                    scope="col">Amount</TableHeaderCell
                  ><TableHeaderCell scope="col">Days overdue</TableHeaderCell><TableHeaderCell
                    scope="col">Action</TableHeaderCell
                  ></TableRow
                ></TableHeader
              ><TableBody
                >{#each managerData.overdueInvoicesList as invoice}<TableRow
                    ><TableCell><Text weight="medium">{invoice.residentName}</Text></TableCell
                    ><TableCell
                      ><Text weight="semibold">{formatPaise(invoice.amountPaise)}</Text></TableCell
                    ><TableCell
                      ><Badge
                        label={`${invoice.daysOverdue} ${invoice.daysOverdue === 1 ? 'day' : 'days'}`}
                        variant="error"
                      /></TableCell
                    ><TableCell
                      ><Button
                        label="Collect"
                        href="/payments"
                        variant="ghost"
                        size="sm"
                      /></TableCell
                    ></TableRow
                  >{/each}</TableBody
              ></Table
            >
          </div>{/if}</Card
      >
    </section>
  {:else}
    <Card padding={5} xstyle={styles.emptyCard}
      ><Heading level={1}>Welcome to EasyPG</Heading><Text type="supporting" display="block"
        >No active property or scope is currently selected. Please select a hostel from the header
        menu or contact your administrator.</Text
      ><Button label="View available hostels" href="/hostels" variant="primary" /></Card
    >
  {/if}
</div>
