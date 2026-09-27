<script lang="ts">
  import { enhance, feedback } from '$lib/api/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    Avatar,
    Badge,
    Button,
    Card,
    Dialog,
    DialogHeader,
    Heading,
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableHeaderCell,
    TableRow,
    Text,
    TextInput
  } from '@astryx-svelte/core';
  import { sx } from '$lib/design/attrs';
  import { formatDate } from '$lib/formatters/date.js';
  import { formatPaiseCompact } from '$lib/formatters/money.js';
  import type { PageData } from './$types';
  import type { ResidentListItem } from '$lib/api/contracts';
  import { styles } from './page.stylex';
  import AlertCircle from '@lucide/svelte/icons/alert-circle';

  let { data }: { data: PageData } = $props();
  let form = $derived($feedback);
  let searchInput = $state('');
  let searchTimeout: ReturnType<typeof setTimeout>;
  let checkOutResident = $state<ResidentListItem | null>(null);
  let isCheckOutOpen = $state(false);
  let checkOutDate = $state(new Date().toISOString().split('T')[0]);
  let checkOutNotes = $state('');

  $effect(() => {
    searchInput = data.filters.search;
  });

  function updateFilters(newStatus?: string, newSearch?: string) {
    const url = new URL($page.url);
    if (newStatus !== undefined)
      newStatus === 'all'
        ? url.searchParams.delete('status')
        : url.searchParams.set('status', newStatus);
    if (newSearch !== undefined)
      newSearch ? url.searchParams.set('q', newSearch) : url.searchParams.delete('q');
    goto(url.toString(), { keepFocus: true, noScroll: true });
  }

  function updateSearch(value: string) {
    searchInput = value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => updateFilters(undefined, value), 300);
  }

  function openCheckOutDialog(resident: ResidentListItem) {
    checkOutResident = resident;
    checkOutDate = new Date().toISOString().split('T')[0];
    checkOutNotes = '';
    isCheckOutOpen = true;
  }
</script>

<svelte:head><title>Residents — {data.hostel?.name ?? 'EasyPG'}</title></svelte:head>

<div {...sx(styles.page)}>
  <header {...sx(styles.header)}>
    <div>
      <p {...sx(styles.eyebrow)}>People & stays</p>
      <div {...sx(styles.titleRow)}>
        <Heading level={1}>Residents</Heading>{#if data.hostel}<Badge
            label={data.hostel.code}
            xstyle={styles.codeBadge}
          />{/if}
      </div>
      <Text as="p" type="supporting" xstyle={styles.description}
        >Manage resident tenancies, contact details, room assignments, and check-outs.</Text
      >
    </div>
    <Button
      label="Check in resident"
      href="/check-ins"
      variant="primary"
      xstyle={styles.primaryAction}
    />
  </header>

  {#if form?.message && !form?.success}
    <div {...sx(styles.feedbackError)} role="alert">
      <AlertCircle size={17} /><span>{form.message}</span>
    </div>
  {/if}

  <Card padding={4} xstyle={styles.filterCard}>
    <TextInput
      label="Search by name or phone"
      isLabelHidden
      value={searchInput}
      onChange={updateSearch}
      placeholder="Search by name or phone…"
      hasClear
      xstyle={styles.search}
    />
    <div {...sx(styles.filterTabs)} aria-label="Resident status">
      <Button
        label={`All (${data.stats.total})`}
        size="sm"
        variant="secondary"
        xstyle={[styles.filterButton, data.filters.status === 'all' && styles.selectedFilter]}
        aria-pressed={data.filters.status === 'all'}
        onclick={() => updateFilters('all')}
      />
      <Button
        label={`Active (${data.stats.active})`}
        size="sm"
        variant="secondary"
        xstyle={[styles.filterButton, data.filters.status === 'active' && styles.selectedFilter]}
        aria-pressed={data.filters.status === 'active'}
        onclick={() => updateFilters('active')}
      />
      <Button
        label={`Checked out (${data.stats.checkedOut})`}
        size="sm"
        variant="secondary"
        xstyle={[
          styles.filterButton,
          data.filters.status === 'checked_out' && styles.selectedFilter
        ]}
        aria-pressed={data.filters.status === 'checked_out'}
        onclick={() => updateFilters('checked_out')}
      />
    </div>
  </Card>

  {#if data.residents.length === 0}
    <Card padding={6} xstyle={styles.empty}
      ><Heading level={2}>No residents found</Heading><Text as="p" type="supporting"
        >No resident records match your current search and filters.</Text
      >
      <div {...sx(styles.emptyActions)}>
        <Button
          label="Clear filters"
          variant="secondary"
          onclick={() => updateFilters('all', '')}
        /><Button label="Check in resident" href="/check-ins" variant="primary" />
      </div></Card
    >
  {:else}
    <div {...sx(styles.desktopTable)}>
      <Table density="balanced" dividers="rows" hasHover>
        <TableHeader
          ><TableRow isHeaderRow
            ><TableHeaderCell scope="col">Resident</TableHeaderCell><TableHeaderCell scope="col"
              >Phone</TableHeaderCell
            ><TableHeaderCell scope="col">Room / Bed</TableHeaderCell><TableHeaderCell scope="col"
              >Joined</TableHeaderCell
            ><TableHeaderCell scope="col">Rent</TableHeaderCell><TableHeaderCell scope="col"
              >Status</TableHeaderCell
            ><TableHeaderCell scope="col">Actions</TableHeaderCell></TableRow
          ></TableHeader
        >
        <TableBody>
          {#each data.residents as resident (resident.id)}
            <TableRow>
              <TableCell
                ><a href={`/residents/${resident.id}`} {...sx(styles.residentLink)}
                  ><Avatar
                    name={resident.fullName}
                    size="md"
                    tooltip={false}
                    xstyle={styles.avatar}
                  /><span {...sx(styles.residentIdentity)}
                    ><strong {...sx(styles.residentName)}>{resident.fullName}</strong
                    >{#if resident.email}<Text as="span" type="supporting" maxLines={1}
                        >{resident.email}</Text
                      >{/if}</span
                  ></a
                ></TableCell
              >
              <TableCell
                ><Text as="span" xstyle={[styles.secondary, styles.mono]}>{resident.phone}</Text
                ></TableCell
              >
              <TableCell
                >{#if resident.roomNumber}<Text as="span" xstyle={styles.number}
                    >Room {resident.roomNumber}{#if resident.bedLabel}<Text
                        as="span"
                        type="supporting"
                      >
                        ({resident.bedLabel})</Text
                      >{/if}</Text
                  >{:else}<Text as="span" type="supporting">No allocation</Text>{/if}</TableCell
              >
              <TableCell
                ><Text as="span" xstyle={styles.secondary}
                  >{formatDate(resident.startDate || resident.createdAt)}</Text
                ></TableCell
              >
              <TableCell
                >{#if resident.agreedRentPaise}<Text as="span" xstyle={styles.number}
                    >{formatPaiseCompact(resident.agreedRentPaise)}<Text as="span" type="supporting"
                      >/mo</Text
                    ></Text
                  >{:else}<Text as="span" type="supporting">—</Text>{/if}</TableCell
              >
              <TableCell
                ><Badge
                  label={resident.status === 'active' ? 'Active' : 'Checked out'}
                  variant={resident.status === 'active' ? 'success' : 'neutral'}
                /></TableCell
              >
              <TableCell
                ><div {...sx(styles.actions)}>
                  <Button
                    label="View"
                    href={`/residents/${resident.id}`}
                    size="sm"
                    variant="secondary"
                  />{#if resident.status === 'active'}<Button
                      label="Check out"
                      size="sm"
                      variant="ghost"
                      xstyle={styles.checkoutAction}
                      onclick={() => openCheckOutDialog(resident)}
                    />{/if}
                </div></TableCell
              >
            </TableRow>
          {/each}
        </TableBody>
      </Table>
    </div>

    <div {...sx(styles.mobileCards)}>
      {#each data.residents as resident (resident.id)}
        <Card padding={3} xstyle={styles.mobileCard}>
          <div {...sx(styles.mobileTop)}>
            <a href={`/residents/${resident.id}`} {...sx(styles.residentLink)}
              ><Avatar name={resident.fullName} size="md" tooltip={false} /><span
                {...sx(styles.residentIdentity)}
                ><strong {...sx(styles.residentName)}>{resident.fullName}</strong><Text
                  as="span"
                  xstyle={[styles.secondary, styles.mono]}>{resident.phone}</Text
                ></span
              ></a
            ><Badge
              label={resident.status === 'active' ? 'Active' : 'Checked out'}
              variant={resident.status === 'active' ? 'success' : 'neutral'}
            />
          </div>
          <div {...sx(styles.mobileMeta)}>
            <span {...sx(styles.metadata)}
              ><Text as="span" type="supporting">Room / Bed</Text><strong
                >{resident.roomNumber
                  ? `Room ${resident.roomNumber}${resident.bedLabel ? ` (${resident.bedLabel})` : ''}`
                  : '—'}</strong
              ></span
            ><span {...sx(styles.metadata)}
              ><Text as="span" type="supporting">Monthly rent</Text><strong
                >{resident.agreedRentPaise
                  ? formatPaiseCompact(resident.agreedRentPaise)
                  : '—'}</strong
              ></span
            >
          </div>
          <footer {...sx(styles.mobileFooter)}>
            <Text as="span" type="supporting"
              >Joined {formatDate(resident.startDate || resident.createdAt)}</Text
            >
            <div {...sx(styles.actions)}>
              <Button
                label="Details"
                href={`/residents/${resident.id}`}
                size="sm"
                variant="secondary"
              />{#if resident.status === 'active'}<Button
                  label="Check out"
                  size="sm"
                  variant="ghost"
                  xstyle={styles.checkoutAction}
                  onclick={() => openCheckOutDialog(resident)}
                />{/if}
            </div>
          </footer>
        </Card>
      {/each}
    </div>
  {/if}
</div>

<Dialog
  isOpen={isCheckOutOpen}
  onOpenChange={(open) => (isCheckOutOpen = open)}
  purpose="form"
  width="480px"
>
  <DialogHeader
    title="Check out resident"
    subtitle={checkOutResident
      ? `End tenancy for ${checkOutResident.fullName} and release their bed.`
      : undefined}
    onOpenChange={(open) => (isCheckOutOpen = open)}
  />
  {#if checkOutResident}
    <form
      method="POST"
      data-operation="checkOut"
      use:enhance={() =>
        async ({ result, update }) => {
          if (result.type === 'success') isCheckOutOpen = false;
          await update({ reset: false });
        }}
      {...sx(styles.dialogBody)}
    >
      <input type="hidden" name="residentId" value={checkOutResident.id} />
      {#if form?.message && !form?.success}
        <div {...sx(styles.feedbackError)} role="alert">
          <AlertCircle size={17} /><span>{form.message}</span>
        </div>
      {/if}
      <label {...sx(styles.dateField)}>
            <span {...sx(styles.dateLabel)}>Check-out date · Required</span>
            <input type="date" name="checkOutDate" bind:value={checkOutDate} required {...sx(styles.dateInput)} />
          </label>
      <TextInput
        label="Notes / reason"
        isOptional
        value={checkOutNotes}
        onChange={(value) => (checkOutNotes = value)}
        htmlName="notes"
        placeholder="Relocation, tenancy end…"
      />
      <footer {...sx(styles.dialogActions)}>
        <Button
          label="Cancel"
          variant="secondary"
          onclick={() => (isCheckOutOpen = false)}
        /><Button label="Confirm check-out" type="submit" variant="destructive" />
      </footer>
    </form>
  {/if}
</Dialog>
