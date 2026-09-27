<script lang="ts">
  import { enhance, feedback } from '$lib/api/forms';
  import type { PageData } from './$types';
  import { Badge, Button, Card, Table, pixel, proportional } from '@astryx-svelte/core';
  import { sx } from '$lib/design/attrs';
  import { tableLayout } from '$lib/design/table.stylex';
  import { styles } from './page.stylex';
  import Shield from '@lucide/svelte/icons/shield';
  import Home from '@lucide/svelte/icons/home';
  import AlertCircle from '@lucide/svelte/icons/alert-circle';

  type Manager = PageData['managers'][number] & Record<string, unknown>;
  let { data }: { data: PageData } = $props();
  let form = $derived($feedback);
  let statusPending = $state<Record<string, boolean>>({});
  let statusErrors = $state<Record<string, string>>({});

  function actionError(result: unknown): string {
    if (typeof result === 'object' && result !== null && 'data' in result) {
      const data = (result as { data?: unknown }).data;
      if (typeof data === 'object' && data !== null && 'error' in data) {
        const error = (data as { error?: unknown }).error;
        if (typeof error === 'string') return error;
      }
    }
    return 'Role status could not be updated.';
  }

  function setStatusPending(id: string, pending: boolean) {
    statusPending = { ...statusPending, [id]: pending };
  }

  function clearStatusError(id: string) {
    const next = { ...statusErrors };
    delete next[id];
    statusErrors = next;
  }

  function formatRole(role: string): string {
    switch (role) {
      case 'platform_admin':
        return 'Platform Admin';
      case 'organization_admin':
        return 'Organization Admin';
      case 'manager':
        return 'Hostel Manager';
      case 'resident':
        return 'Resident';
      default:
        return role;
    }
  }
</script>

{#snippet roleCell(item: Manager)}<Badge
    variant="neutral"
    label={formatRole(item.role)}
  />{/snippet}
{#snippet propertyCell(item: Manager)}<span {...sx(styles.property)}
    ><Home size={14} />{item.hostelName}</span
  >{/snippet}
{#snippet statusCell(item: Manager)}<Badge
    variant={item.isActive ? 'success' : 'neutral'}
    label={item.isActive ? 'Active' : 'Inactive'}
  />{/snippet}
{#snippet actionCell(item: Manager)}
  {#if item.canManage}
  {@const bindingId = String(item.bindingId)}
  {#if statusErrors[bindingId]}
    <span {...sx(styles.cardDescription)} role="alert">
      <AlertCircle size={14} /> {statusErrors[bindingId]}
    </span>
  {/if}
    <form
      method="POST"
      data-operation="toggleManager"
      use:enhance={() => {
        setStatusPending(bindingId, true);
        clearStatusError(bindingId);
        return async ({ result, update }) => {
          if (result.type === 'failure' || result.type === 'error') {
            statusErrors = { ...statusErrors, [bindingId]: actionError(result) };
          }
          setStatusPending(bindingId, false);
          await update({ reset: false });
        };
      }}
    >
    <input type="hidden" name="bindingId" value={item.bindingId} />
    <input type="hidden" name="isActive" value={item.isActive ? 'true' : 'false'} />
    <Button
      label={statusPending[bindingId] ? 'Updating…' : item.isActive ? 'Deactivate' : 'Activate'}
      variant="ghost"
      size="sm"
      type="submit"
      isDisabled={statusPending[bindingId]}
    />
    </form>
  {/if}
{/snippet}
{#snippet managerCountIcon()}<Shield size={14} />{/snippet}

<svelte:head><title>Managers &amp; Roles — EasyPG</title></svelte:head>

<div {...sx(styles.page)}>
  <div {...sx(styles.heading)}>
    <div>
      <p {...sx(styles.eyebrow)}>Team &amp; access</p>
      <h1 {...sx(styles.title)}>Staff &amp; Managers</h1>
      <p {...sx(styles.description)}>
        Manage administrative users, role assignments, and property access boundaries.
      </p>
    </div>
    <Badge
      variant="neutral"
      label={`${data.managers.length} Active Role Bindings`}
      icon={managerCountIcon}
    />
  </div>

  <Card xstyle={styles.card}>
    <div {...sx(styles.cardHeader)}>
      <h2 {...sx(styles.cardTitle)}>Assigned Personnel</h2>
      <p {...sx(styles.cardDescription)}>
        Authorized accounts with scoped access to organizations and hostels.
      </p>
    </div>
    {#if form?.error}
      <div {...sx(styles.cardDescription)} role="alert">
        <AlertCircle size={17} /><span>{form.error}</span>
      </div>
    {/if}
    <div {...sx([styles.tableWrap, tableLayout.inset])}>
      <Table
        data={data.managers as Manager[]}
        density="compact"
        dividers="rows"
        hasHover
        columns={[
          { key: 'name', header: 'Name', width: proportional(1), sortable: true },
          { key: 'email', header: 'Email', width: proportional(2) },
          { key: 'role', header: 'Role', width: proportional(1.3, { minWidth: 160 }), renderCell: roleCell },
          { key: 'orgName', header: 'Organization', width: proportional(1) },
          {
            key: 'hostelName',
            header: 'Assigned Property',
            width: proportional(1.5, { minWidth: 170 }),
            renderCell: propertyCell
          },
          { key: 'isActive', header: 'Status', width: proportional(1), renderCell: statusCell },
          {
            key: 'action',
            header: '',
            width: pixel(120),
            align: 'end',
            resizable: false,
            renderCell: actionCell
          }
        ]}
      />
    </div>
  </Card>
</div>
