<script lang="ts">
  import { enhance, feedback } from '$lib/api/forms';
  import type { PageData } from './$types';
  import {
    Badge,
    Button,
    Card,
    Dialog,
    Table,
    TextArea,
    pixel,
    proportional
  } from '@astryx-svelte/core';
  import { sx } from '$lib/design/attrs';
  import { tableLayout } from '$lib/design/table.stylex';
  import { styles } from './page.stylex';
  import { formatPaise } from '$lib/formatters/money';
  import { formatDate } from '$lib/formatters/date';
  import LogOut from '@lucide/svelte/icons/log-out';
  import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
  import AlertCircle from '@lucide/svelte/icons/alert-circle';
  import History from '@lucide/svelte/icons/history';
  import BedDouble from '@lucide/svelte/icons/bed-double';

  type ActiveResident = PageData['activeResidents'][number] & Record<string, unknown>;
  type RecentCheckout = PageData['recentCheckouts'][number] & Record<string, unknown>;

  let { data }: { data: PageData } = $props();
  let form = $derived($feedback);
  let selectedResident = $state<ActiveResident | null>(null);
  let isCheckoutDialogOpen = $state(false);
  let checkoutNotes = $state('');
  let isSubmitting = $state(false);

  function todayInAppTimezone() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  let checkoutDate = $state(todayInAppTimezone());

  function openCheckout(resident: ActiveResident) {
    selectedResident = resident;
    checkoutDate = todayInAppTimezone();
    checkoutNotes = '';
    isCheckoutDialogOpen = true;
  }
</script>

{#snippet residentCell(item: ActiveResident)}
  <div {...sx(styles.cellStack)}>
    <strong {...sx(styles.cellPrimary)}>{item.residentName}</strong>
    <span {...sx(styles.cellSecondary)}>{item.email || 'No email'}</span>
  </div>
{/snippet}

{#snippet roomCell(item: ActiveResident)}
  <Badge variant="neutral" label={`Room ${item.roomNumber} · ${item.bedLabel}`} />
{/snippet}

{#snippet rentCell(item: ActiveResident)}
  <span {...sx(styles.mono)}>{formatPaise(item.agreedRentPaise)}/mo</span>
{/snippet}

{#snippet occupiedCell(item: ActiveResident)}
  <span>{formatDate(item.occupiedFrom)}</span>
{/snippet}

{#snippet actionCell(item: ActiveResident)}
  <Button label="Check Out" variant="destructive" size="sm" onclick={() => openCheckout(item)}>
    {#snippet icon()}<LogOut size={15} />{/snippet}
  </Button>
{/snippet}

{#snippet recentRoomCell(item: RecentCheckout)}
  <span>Room {item.roomNumber} · {item.bedLabel}</span>
{/snippet}

{#snippet stayCell(item: RecentCheckout)}
  <span
    >{formatDate(item.occupiedFrom)} – {item.occupiedUntil
      ? formatDate(item.occupiedUntil)
      : 'Present'}</span
  >
{/snippet}

{#snippet statusCell(_: RecentCheckout)}
  <Badge variant="neutral" label="Checked Out" />
{/snippet}

{#snippet activeCountIcon()}
  <CheckCircle2 size={14} />
{/snippet}

<svelte:head><title>Check-Out — EasyPG</title></svelte:head>

<div {...sx(styles.page)}>
  <div {...sx(styles.heading)}>
    <div>
      <p {...sx(styles.eyebrow)}>Departures</p>
      <h1 {...sx(styles.title)}>Check-Outs</h1>
      <p {...sx(styles.description)}>
        Manage departures, settle stays, and make room for new arrivals.
      </p>
    </div>
    <Badge
      variant="success"
      label={`${data.activeResidents.length} Active Occupants`}
      icon={activeCountIcon}
    />
  </div>

  {#if form?.error}
    <div {...sx(styles.feedbackError)} role="alert">
      <AlertCircle size={18} /><span>{form.error}</span>
    </div>
  {/if}
  {#if form?.success}
    <div {...sx(styles.feedbackSuccess)} role="status">
      <CheckCircle2 size={18} /><span
        >Resident checked out successfully. The bed has been returned to available inventory.</span
      >
    </div>
  {/if}

  <Card xstyle={styles.card}>
    <div {...sx(styles.cardHeader)}>
      <div {...sx(styles.cardTitleLine)}>
        <BedDouble size={19} />
        <h2 {...sx(styles.cardTitle)}>Current Residents Eligible for Check-Out</h2>
      </div>
      <p {...sx(styles.cardDescription)}>
        Select any active resident below to initiate departure settlement and vacate the assigned
        bed.
      </p>
    </div>
    {#if data.activeResidents.length === 0}
      <div {...sx(styles.empty)}>
        <BedDouble size={38} />
        <p>No active occupants in this hostel.</p>
      </div>
    {:else}
      <div {...sx([styles.tableWrap, tableLayout.inset])}>
        <Table
          data={data.activeResidents as ActiveResident[]}
          density="compact"
          dividers="rows"
          hasHover
          columns={[
            {
              key: 'residentName',
              header: 'Resident',
              width: proportional(2),
              renderCell: residentCell
            },
            {
              key: 'roomNumber',
              header: 'Room & Bed',
              width: proportional(1),
              renderCell: roomCell
            },
            { key: 'phone', header: 'Phone', width: proportional(1) },
            {
              key: 'occupiedFrom',
              header: 'Occupied Since',
              width: proportional(1),
              renderCell: occupiedCell
            },
            {
              key: 'agreedRentPaise',
              header: 'Agreed Rent',
              width: proportional(1),
              renderCell: rentCell
            },
            {
              key: 'action',
              header: '',
              width: pixel(130),
              align: 'end',
              resizable: false,
              renderCell: actionCell
            }
          ]}
        />
      </div>
    {/if}
  </Card>

  {#if data.recentCheckouts.length > 0}
    <Card xstyle={styles.card}>
      <div {...sx(styles.cardHeader)}>
        <div {...sx(styles.cardTitleLine)}>
          <History size={19} />
          <h2 {...sx(styles.cardTitle)}>Recent Check-Outs</h2>
        </div>
        <p {...sx(styles.cardDescription)}>
          History of completed resident check-outs and released beds.
        </p>
      </div>
      <div {...sx([styles.tableWrap, tableLayout.inset])}>
        <Table
          data={data.recentCheckouts as RecentCheckout[]}
          density="compact"
          dividers="rows"
          columns={[
            { key: 'residentName', header: 'Resident', width: proportional(2) },
            {
              key: 'bedLabel',
              header: 'Room & Bed',
              width: proportional(1),
              renderCell: recentRoomCell
            },
            { key: 'phone', header: 'Phone', width: proportional(1) },
            {
              key: 'occupiedFrom',
              header: 'Stay Period',
              width: proportional(2),
              renderCell: stayCell
            },
            { key: 'status', header: 'Status', width: proportional(1), renderCell: statusCell }
          ]}
        />
      </div>
    </Card>
  {/if}
</div>

<Dialog
  isOpen={isCheckoutDialogOpen}
  onOpenChange={(open) => (isCheckoutDialogOpen = open)}
  width={460}
  purpose="form"
  aria-label="Confirm Check-Out"
>
  <div {...sx(styles.dialog)}>
    <div {...sx(styles.dialogHeader)}>
      <div {...sx(styles.cardTitleLine)}>
        <LogOut size={19} />
        <h2 {...sx(styles.dialogTitle)}>Confirm Check-Out</h2>
      </div>
      <p {...sx(styles.cardDescription)}>
        This will immediately end the active agreement, release the bed back to inventory, and close
        all occupancy allocations.
      </p>
    </div>
    {#if form?.error}
      <div {...sx(styles.feedbackError)} role="alert">
        <AlertCircle size={18} /><span>{form.error}</span>
      </div>
    {/if}
    {#if selectedResident}
      <form
        method="POST"
        data-operation="checkOut"
        {...sx(styles.dialogForm)}
        use:enhance={() => {
          isSubmitting = true;
          return async ({ update, result }) => {
            isSubmitting = false;
            if (result.type === 'success') {
              isCheckoutDialogOpen = false;
            }
            await update();
          };
        }}
      >
        <input type="hidden" name="residentId" value={selectedResident.residentId} />
        <div {...sx(styles.summary)}>
          <div {...sx(styles.summaryRow)}><span>Resident</span><strong>{selectedResident.residentName}</strong></div>
          <div {...sx(styles.summaryRow)}>
            <span>Assigned Bed</span><strong
              >Room {selectedResident.roomNumber} · {selectedResident.bedLabel}</strong
            >
          </div>
          <div {...sx(styles.summaryRow)}>
            <span>Monthly Rent</span><strong>{formatPaise(selectedResident.agreedRentPaise)}</strong
            >
          </div>
        </div>
        <div>
          <label {...sx(styles.dateField)}>
            <span {...sx(styles.dateLabel)}>Check-Out Date · Required</span>
            <input type="date" name="checkOutDate" bind:value={checkoutDate} required {...sx(styles.dateInput)} />
          </label>
        </div>
        <TextArea
          label="Settlement Notes (Optional)"
          htmlName="notes"
          placeholder="Deposit refund, key return, or damage deduction notes…"
          value={checkoutNotes}
          onChange={(value) => (checkoutNotes = value)}
        />
        <div {...sx(styles.dialogActions)}>
          <Button
            label="Cancel"
            variant="secondary"
            type="button"
            onclick={() => (isCheckoutDialogOpen = false)}
          />
          <Button
            label={isSubmitting ? 'Processing…' : 'Confirm & Release Bed'}
            variant="destructive"
            type="submit"
            isDisabled={isSubmitting}
          >
            {#snippet icon()}{#if !isSubmitting}<LogOut size={15} />{/if}{/snippet}
          </Button>
        </div>
      </form>
    {/if}
  </div>
</Dialog>
