<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$lib/api/forms';
  import { Badge, Button, Card, Dialog, TextInput } from '@astryx-svelte/core';
  import { invalidateAll, goto } from '$app/navigation';
  import { sx } from '$lib/design/attrs';
  import { styles } from './page.stylex';
  import Home from '@lucide/svelte/icons/home';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Check from '@lucide/svelte/icons/check';
  import BedDouble from '@lucide/svelte/icons/bed-double';
  import Users from '@lucide/svelte/icons/users';
  import Search from '@lucide/svelte/icons/search';
  import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';

  import { updateHostelStatus, updateHostelDetails } from '$lib/services/hostelService';

  let { data }: { data: PageData } = $props();
  let searchQuery = $state('');

  // Edit Hostel State
  let isEditDialogOpen = $state(false);
  let editingHostel = $state<any>(null);
  let editHostelName = $state('');
  let editHostelCode = $state('');

  function openEditHostel(hostel: any) {
    editingHostel = hostel;
    editHostelName = hostel.name;
    editHostelCode = hostel.code;
    isEditDialogOpen = true;
  }

  async function handleSaveHostel(e: Event) {
    e.preventDefault();
    if (!editingHostel) return;
    try {
      await updateHostelDetails(editingHostel.id || editingHostel.hostel_id, editHostelName, editHostelCode);
      editingHostel.name = editHostelName;
      editingHostel.code = editHostelCode;
      isEditDialogOpen = false;
      await invalidateAll();
    } catch (err) {
      console.error("Failed to update hostel details:", err);
    }
  }

  // Deactivate Hostel Reason State
  let isDeactivateDialogOpen = $state(false);
  let deactivatingHostel = $state<any>(null);
  let deactivationReason = $state('');

  function openDeactivateDialog(hostel: any) {
    deactivatingHostel = hostel;
    deactivationReason = '';
    isDeactivateDialogOpen = true;
  }

  async function handleConfirmDeactivation(e: Event) {
    e.preventDefault();
    if (!deactivatingHostel) return;
    try {
      await updateHostelStatus(deactivatingHostel.id || deactivatingHostel.hostel_id, 'INACTIVE', deactivationReason);
      deactivatingHostel.status = 'inactive';
      deactivatingHostel.deactivation_reason = deactivationReason;
      isDeactivateDialogOpen = false;
      await invalidateAll();
    } catch (err) {
      console.error("Failed to deactivate hostel:", err);
    }
  }

  async function activateHostel(hostel: any) {
    try {
      await updateHostelStatus(hostel.id || hostel.hostel_id, 'ACTIVE');
      hostel.status = 'active';
      hostel.deactivation_reason = null;
      await invalidateAll();
    } catch (err) {
      console.error("Failed to activate hostel:", err);
    }
  }
  let filteredHostels = $derived(
    data.hostels.filter((hostel) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      return (
        hostel.name.toLowerCase().includes(query) ||
        hostel.code.toLowerCase().includes(query) ||
        hostel.city.toLowerCase().includes(query) ||
        (hostel.addressLine1?.toLowerCase().includes(query) ?? false)
      );
    })
  );
</script>

<svelte:head><title>Hostels — EasyPG</title></svelte:head>

<div {...sx(styles.page)}>
  <div {...sx(styles.heading)}>
    <div>
      <p {...sx(styles.eyebrow)}>Your portfolio</p>
      <h1 {...sx(styles.title)}>Hostels</h1>
      <p {...sx(styles.description)}>
        Manage accessible hostel buildings, bed inventory, and active branches.
      </p>
    </div>
    <!-- Search is a native control because Astryx TextInput intentionally supports text, email, and password only. -->
    <div {...sx(styles.searchWrap)}>
      <Search size={17} {...sx(styles.searchIcon)} aria-hidden="true" />
      <input
        type="search"
        aria-label="Search hostels, city, code"
        placeholder="Search hostels, city, code…"
        value={searchQuery}
        oninput={(event) => (searchQuery = (event.currentTarget as HTMLInputElement).value)}
        {...sx(styles.searchInput)}
      />
    </div>
  </div>

  {#if filteredHostels.length === 0}
    <Card xstyle={styles.emptyCard}>
      <Home size={40} {...sx(styles.emptyIcon)} />
      <h2 {...sx(styles.emptyTitle)}>No hostels found</h2>
      <p {...sx(styles.emptyDescription)}>
        {searchQuery
          ? 'No hostels matched your search criteria.'
          : 'No hostels are assigned to your profile.'}
      </p>
      {#if searchQuery}<Button
          label="Clear Search"
          variant="secondary"
          onclick={() => (searchQuery = '')}
        />{/if}
    </Card>
  {:else}
    <div {...sx(styles.grid)}>
      {#each filteredHostels as hostel (hostel.id)}
        <Card xstyle={hostel.isActive ? [styles.hostelCard, styles.activeCard] : styles.hostelCard}>
          <div {...sx(styles.cardHeader)}>
            <div {...sx(styles.headerRow)}>
              <div {...sx(styles.hostelIdentity)}>
                <div {...sx(styles.badgeRow)}>
                  <Badge variant="neutral" label={hostel.code} />
                  {#if hostel.isActive}<Badge variant="info" label="Active Hostel" />{/if}
                  <Badge
                    variant={(hostel.status as string)?.toLowerCase() === 'active' ? 'success' : 'error'}
                    label={(hostel.status as string)?.toLowerCase() === 'active' ? 'Operational' : 'INACTIVE'}
                  />
                </div>
                <h2 {...sx(styles.hostelName)}>{hostel.name}</h2>
                <div {...sx(styles.location)}>
                  <MapPin size={14} /><span
                    >{hostel.city}{hostel.addressLine1 ? ` · ${hostel.addressLine1}` : ''}</span
                  >
                </div>
              </div>
            </div>
          </div>

          <div {...sx(styles.cardBody)}>
            <div {...sx(styles.occupancy)}>
              <div {...sx(styles.statLine)}>
                <span>Occupancy</span><strong>{hostel.occupancyRate}%</strong>
              </div>
              <div {...sx(styles.progressTrack)}>
                <div
                  {...sx(
                    styles.progressFill,
                    styles.progressWidth(Math.min(100, Math.max(0, hostel.occupancyRate)))
                  )}
                ></div>
              </div>
              <div {...sx(styles.statLine)}>
                <span>{hostel.occupiedBeds} occupied</span><span
                  >{hostel.sellableBeds} sellable beds</span
                >
              </div>
            </div>
            <div {...sx(styles.statsGrid)}>
              <div>
                <span {...sx(styles.statLabel)}>Available</span><strong {...sx(styles.successValue)}
                  >{hostel.availableBeds}</strong
                >
              </div>
              <div>
                <span {...sx(styles.statLabel)}>Residents</span><strong
                  >{hostel.residentCount}</strong
                >
              </div>
              <div>
                <span {...sx(styles.statLabel)}>Physical</span><strong>{hostel.physicalBeds}</strong
                >
              </div>
            </div>
            {#if (hostel.status as string)?.toLowerCase() === 'inactive'}
              <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.5rem 0.75rem; border-radius: 6px; margin-top: 0.75rem; font-size: 0.8125rem; color: #fca5a5;">
                <strong>⚠️ Inactive Reason:</strong> {hostel.deactivation_reason || (hostel as any).deactivationReason || 'Deactivated by administrator'}
              </div>
            {/if}
          </div>

          <div {...sx(styles.cardFooter)}>
            {#if hostel.isActive}
              <div {...sx(styles.currentProperty)}>
                <CheckCircle2 size={16} /><span>Active Hostel</span>
              </div>
            {:else}
              <form method="POST" data-operation="switchHostel" use:enhance {...sx(styles.fullWidth)}>
                <input type="hidden" name="hostelId" value={hostel.id} />
                <Button
                  label="Switch to Hostel"
                  type="submit"
                  variant="secondary"
                  xstyle={styles.fullButton}>{#snippet icon()}<Check size={16} />{/snippet}</Button
                >
              </form>
            {/if}
            <div {...sx(styles.linkGrid)}>
              <Button
                label="View Rooms"
                href="/rooms"
                variant="secondary"
                size="sm"
                onclick={() => goto('/rooms')}
                xstyle={styles.fullButton}>{#snippet icon()}<BedDouble size={15} />{/snippet}</Button
              >
              <Button
                label="Residents"
                href={`/residents?hostelId=${hostel.id}`}
                variant="secondary"
                size="sm"
                onclick={() => goto(`/residents?hostelId=${hostel.id}`)}
                xstyle={styles.fullButton}>{#snippet icon()}<Users size={15} />{/snippet}</Button
              >
              <Button
                label="Edit"
                variant="ghost"
                size="sm"
                onclick={() => openEditHostel(hostel)}
              />
              {#if (hostel.status as string)?.toLowerCase() === 'inactive'}
                <Button
                  label="Reactivate"
                  variant="primary"
                  size="sm"
                  onclick={() => activateHostel(hostel)}
                />
              {:else}
                <Button
                  label="Deactivate"
                  variant="ghost"
                  size="sm"
                  onclick={() => openDeactivateDialog(hostel)}
                />
              {/if}
            </div>
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</div>

<Dialog
  isOpen={isEditDialogOpen}
  onOpenChange={(open) => (isEditDialogOpen = open)}
  width={460}
  purpose="form"
  aria-label="Edit Hostel Details"
>
  <div style="padding: 1.5rem; background: var(--color-background-card, #1e293b); color: var(--color-text-primary, inherit); border-radius: 8px;">
    <h2 style="font-size: 1.2rem; margin-top: 0; margin-bottom: 0.5rem;">Edit Hostel Details</h2>
    <p style="font-size: 0.85rem; color: var(--color-text-secondary, #9ca3af); margin-bottom: 1.2rem;">
      Update hostel branch name and code.
    </p>
    <form onsubmit={handleSaveHostel} style="display: flex; flex-direction: column; gap: 1rem;">
      <TextInput
        label="Hostel Name"
        htmlName="editHostelName"
        value={editHostelName}
        onChange={(value) => (editHostelName = value)}
        isRequired
      />
      <TextInput
        label="Hostel Code"
        htmlName="editHostelCode"
        value={editHostelCode}
        onChange={(value) => (editHostelCode = value)}
        isRequired
      />
      <div style="display: flex; justify-content: flex-end; gap: 0.8rem; margin-top: 1rem;">
        <Button
          label="Cancel"
          type="button"
          variant="secondary"
          onclick={() => (isEditDialogOpen = false)}
        />
        <Button
          label="Save Changes"
          type="submit"
          variant="primary"
        >
          {#snippet icon()}<CheckCircle2 size={15} />{/snippet}
        </Button>
      </div>
    </form>
  </div>
</Dialog>

<Dialog
  isOpen={isDeactivateDialogOpen}
  onOpenChange={(open) => (isDeactivateDialogOpen = open)}
  width={460}
  purpose="form"
  aria-label="Deactivate Hostel"
>
  <div style="padding: 1.5rem; background: var(--color-background-card, #1e293b); color: var(--color-text-primary, inherit); border-radius: 8px;">
    <h2 style="font-size: 1.2rem; margin-top: 0; margin-bottom: 0.5rem; color: #ef4444;">Deactivate Hostel: {deactivatingHostel?.name}</h2>
    <p style="font-size: 0.85rem; color: var(--color-text-secondary, #9ca3af); margin-bottom: 1.2rem;">
      Please specify the reason for deactivating this property. This reason will be preserved.
    </p>
    <form onsubmit={handleConfirmDeactivation} style="display: flex; flex-direction: column; gap: 1rem;">
      <TextInput
        label="Deactivation Reason"
        htmlName="deactivationReason"
        placeholder="e.g. Building renovation, maintenance, seasonal closure..."
        value={deactivationReason}
        onChange={(value) => (deactivationReason = value)}
        isRequired
      />
      <div style="display: flex; justify-content: flex-end; gap: 0.8rem; margin-top: 1rem;">
        <Button
          label="Cancel"
          type="button"
          variant="secondary"
          onclick={() => (isDeactivateDialogOpen = false)}
        />
        <Button
          label="Confirm Deactivation"
          type="submit"
          variant="primary"
        />
      </div>
    </form>
  </div>
</Dialog>
