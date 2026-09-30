<script lang="ts">
  import type { PageData } from './$types';
  import { invalidateAll } from '$app/navigation';
  import { createPartner } from '$lib/services/hierarchyService';
  import { Badge, Button, Card, Dialog, TextInput } from '@astryx-svelte/core';
  import { sx } from '$lib/design/attrs';
  import { styles } from './page.stylex';
  import { formatPaiseCompact } from '$lib/formatters/money.js';
  import { formatDate } from '$lib/formatters/date.js';
  import Building2 from '@lucide/svelte/icons/building-2';
  import Plus from '@lucide/svelte/icons/plus';
  import Search from '@lucide/svelte/icons/search';
  import Power from '@lucide/svelte/icons/power';
  import Users from '@lucide/svelte/icons/users';
  import Home from '@lucide/svelte/icons/home';
  import AlertCircle from '@lucide/svelte/icons/alert-circle';
  import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';

  let { data }: { data: PageData } = $props();
  let searchQuery = $state('');
  let statusFilter = $state<'all' | 'active' | 'inactive'>('all');
  let isCreateDialogOpen = $state(false);
  let isSubmitting = $state(false);
  let createError = $state('');
  let successMsg = $state('');

  // Form states
  let newOrgName = $state('');
  let newOrgEmail = $state('');
  let newOrgPassword = $state('');
  let newOrgPhone = $state('');

  let statusPending = $state<Record<string, boolean>>({});
  let statusErrors = $state<Record<string, string>>({});

  // Edit Organization state
  let isEditDialogOpen = $state(false);
  let editingOrg = $state<any>(null);
  let editOrgName = $state('');
  let editOrgStatus = $state<'active' | 'inactive'>('active');

  function openEditOrg(org: any) {
    editingOrg = org;
    editOrgName = org.name;
    editOrgStatus = org.status === 'active' ? 'active' : 'inactive';
    isEditDialogOpen = true;
  }

  async function handleSaveOrg(e: Event) {
    e.preventDefault();
    if (!editingOrg) return;
    editingOrg.name = editOrgName;
    editingOrg.status = editOrgStatus;
    isEditDialogOpen = false;
    await invalidateAll();
  }

  async function toggleOrgStatus(org: any) {
    org.status = org.status === 'active' ? 'inactive' : 'active';
    await invalidateAll();
  }

  function setStatusPending(id: string, pending: boolean) {
    statusPending = { ...statusPending, [id]: pending };
  }

  function clearStatusError(id: string) {
    const next = { ...statusErrors };
    delete next[id];
    statusErrors = next;
  }

  async function handleCreatePartner(e: Event) {
    e.preventDefault();
    isSubmitting = true;
    createError = '';
    successMsg = '';

    try {
      if (!newOrgName || !newOrgEmail || !newOrgPassword) {
        throw new Error('Name, Email, and Password are required');
      }

      await createPartner({
        name: newOrgName,
        email: newOrgEmail,
        password: newOrgPassword,
        phone: newOrgPhone || undefined
      });

      successMsg = `Partner organization "${newOrgName}" created successfully!`;
      isCreateDialogOpen = false;
      newOrgName = '';
      newOrgEmail = '';
      newOrgPassword = '';
      newOrgPhone = '';
      await invalidateAll();
    } catch (err: any) {
      createError = err.message || 'Failed to create Partner organization';
    } finally {
      isSubmitting = false;
    }
  }

  let filteredOrgs = $derived(
    data.organizations.filter((org) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query || org.name.toLowerCase().includes(query) || (org.slug && org.slug.toLowerCase().includes(query));
      return matchesSearch && (statusFilter === 'all' || org.status === statusFilter);
    })
  );
</script>

<svelte:head><title>Organizations — EasyPG</title></svelte:head>

<div {...sx(styles.page)}>
  <div {...sx(styles.heading)}>
    <div>
      <p {...sx(styles.eyebrow)}>Platform administration</p>
      <h1 {...sx(styles.title)}>Organizations &amp; Partners</h1>
      <p {...sx(styles.description)}>
        Platform client entities, tenant accounts, and group subscriptions.
      </p>
    </div>
    <Button label="New Organization" variant="primary" onclick={() => (isCreateDialogOpen = true)}>
      {#snippet icon()}<Plus size={17} />{/snippet}
    </Button>
  </div>

  {#if successMsg}
    <div style="padding: 1rem; background: #d1fae5; color: #065f46; border-radius: 6px; margin-bottom: 1rem;">
      {successMsg}
    </div>
  {/if}

  <div {...sx(styles.filters)}>
    <div {...sx(styles.searchWrap)}>
      <Search size={17} {...sx(styles.searchIcon)} aria-hidden="true" />
      <input
        type="search"
        aria-label="Search organizations by name or slug"
        placeholder="Search organizations by name or email slug…"
        value={searchQuery}
        oninput={(event) => (searchQuery = (event.currentTarget as HTMLInputElement).value)}
        {...sx(styles.searchInput)}
      />
    </div>
    <div {...sx(styles.filterGroup)} role="group" aria-label="Organization status filter">
      <Button
        label={`All (${data.organizations.length})`}
        size="sm"
        variant={statusFilter === 'all' ? 'primary' : 'ghost'}
        onclick={() => (statusFilter = 'all')}
      />
      <Button
        label={`Active (${data.organizations.filter((org) => org.status === 'active').length})`}
        size="sm"
        variant={statusFilter === 'active' ? 'primary' : 'ghost'}
        onclick={() => (statusFilter = 'active')}
      />
      <Button
        label={`Inactive (${data.organizations.filter((org) => org.status === 'inactive').length})`}
        size="sm"
        variant={statusFilter === 'inactive' ? 'primary' : 'ghost'}
        onclick={() => (statusFilter = 'inactive')}
      />
    </div>
  </div>

  {#if filteredOrgs.length === 0}
    <Card xstyle={styles.emptyCard}>
      <Building2 size={40} {...sx(styles.emptyIcon)} />
      <h2 {...sx(styles.emptyTitle)}>No organizations found</h2>
      <p {...sx(styles.emptyDescription)}>
        {searchQuery
          ? 'No organizations matched your search filter.'
          : 'No organizations registered in system.'}
      </p>
      {#if searchQuery}<Button
          label="Clear Filter"
          variant="secondary"
          onclick={() => (searchQuery = '')}
        />{/if}
    </Card>
  {:else}
    <div {...sx(styles.grid)}>
      {#each filteredOrgs as org (org.id)}
        {@const isActive = org.status === 'active'}
        <Card xstyle={styles.orgCard}>
          <div {...sx(styles.cardHeader)}>
            <div {...sx(styles.orgIdentity)}>
              <div {...sx(styles.orgMark)}>{org.name.slice(0, 2).toUpperCase()}</div>
              <div {...sx(styles.orgNames)}>
                <h2 {...sx(styles.orgName)}>{org.name}</h2>
                <span {...sx(styles.slug)}>slug: {org.slug}</span>
              </div>
            </div>
            <Badge
              variant={isActive ? 'success' : 'neutral'}
              label={isActive ? 'Active' : 'Inactive'}
            />
          </div>
          <div {...sx(styles.statsGrid)}>
            <div>
              <span {...sx(styles.statLabel)}>Hostels</span><span {...sx(styles.statValue)}
                ><Home size={14} />{org.hostelCount}</span
              >
            </div>
            <div>
              <span {...sx(styles.statLabel)}>Managers</span><span {...sx(styles.statValue)}
                ><Users size={14} />{org.residentCount}</span
              >
            </div>
          </div>
          <div {...sx(styles.orgMeta)}>
            <span>Created {formatDate(org.createdAt)}</span><span>ID: {org.id}</span>
          </div>
          <div {...sx(styles.cardFooter)} style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
            <Button label="View Hostels" href="/hostels" variant="secondary" size="sm" />
            <Button label="Edit" variant="ghost" size="sm" onclick={() => openEditOrg(org)} />
            <Button
              label={org.status === 'active' ? 'Deactivate' : 'Activate'}
              variant={org.status === 'active' ? 'ghost' : 'primary'}
              size="sm"
              onclick={() => toggleOrgStatus(org)}
            />
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</div>

<Dialog
  isOpen={isCreateDialogOpen}
  onOpenChange={(open) => (isCreateDialogOpen = open)}
  width={460}
  purpose="form"
  aria-label="Add New Partner Organization"
>
  <div {...sx(styles.dialog)}>
    <div {...sx(styles.dialogHeader)}>
      <h2 {...sx(styles.dialogTitle)}>Add New Partner Organization</h2>
      <p {...sx(styles.dialogDescription)}>
        Create a new Partner entity with an administrative login account.
      </p>
    </div>
    <form onsubmit={handleCreatePartner} {...sx(styles.dialogForm)}>
      {#if createError}
        <div {...sx(styles.feedbackError)} role="alert">
          <AlertCircle size={17} /><span>{createError}</span>
        </div>
      {/if}
      <TextInput
        label="Organization / Partner Name"
        htmlName="name"
        placeholder="e.g. Royal Living Group"
        value={newOrgName}
        onChange={(value) => (newOrgName = value)}
        isRequired
      />
      <TextInput
        label="Admin Email Address"
        htmlName="email"
        type="email"
        placeholder="partner@domain.com"
        value={newOrgEmail}
        onChange={(value) => (newOrgEmail = value)}
        isRequired
      />
      <TextInput
        label="Password"
        htmlName="password"
        type="password"
        placeholder="••••••••"
        value={newOrgPassword}
        onChange={(value) => (newOrgPassword = value)}
        isRequired
      />
      <TextInput
        label="Phone Number (Optional)"
        htmlName="phone"
        placeholder="9876543210"
        value={newOrgPhone}
        onChange={(value) => (newOrgPhone = value)}
      />
      <div {...sx(styles.dialogActions)}>
        <Button
          label="Cancel"
          type="button"
          variant="secondary"
          onclick={() => (isCreateDialogOpen = false)}
        />
        <Button
          label={isSubmitting ? 'Creating…' : 'Create Partner'}
          type="submit"
          variant="primary"
          isDisabled={isSubmitting}
        >
          {#snippet icon()}{#if !isSubmitting}<CheckCircle2 size={15} />{/if}{/snippet}
        </Button>
      </div>
    </form>
  </div>
</Dialog>

<Dialog
  isOpen={isEditDialogOpen}
  onOpenChange={(open) => (isEditDialogOpen = open)}
  width={460}
  purpose="form"
  aria-label="Edit Organization Details"
>
  <div {...sx(styles.dialog)}>
    <div {...sx(styles.dialogHeader)}>
      <h2 {...sx(styles.dialogTitle)}>Edit Organization Details</h2>
      <p {...sx(styles.dialogDescription)}>
        Update organization name and active operating status.
      </p>
    </div>
    <form onsubmit={handleSaveOrg} {...sx(styles.dialogForm)}>
      <TextInput
        label="Organization Name"
        htmlName="editName"
        value={editOrgName}
        onChange={(value) => (editOrgName = value)}
        isRequired
      />
      <div style="margin-top: 1rem;">
        <label for="editOrgStatusSelect" style="display: block; margin-bottom: 0.4rem; font-weight: 500; font-size: 0.9rem; color: var(--color-text-primary, inherit);">Operating Status</label>
        <select
          id="editOrgStatusSelect"
          value={editOrgStatus}
          onchange={(e) => (editOrgStatus = (e.target as HTMLSelectElement).value as any)}
          style="width: 100%; padding: 0.6rem; background: var(--color-background-elevated, #0f172a); color: var(--color-text-primary, inherit); border: 1px solid var(--color-border, #475569); border-radius: 6px; font-size: 0.95rem;"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive / Suspended</option>
        </select>
      </div>
      <div {...sx(styles.dialogActions)} style="margin-top: 1.5rem;">
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
