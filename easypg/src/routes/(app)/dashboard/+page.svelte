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

  let { data }: { data: PageData } = $props();
  let role = $derived(data.role);
  let platformData = $derived(data.platformData);
  let orgData = $derived(data.orgData);
  let managerData = $derived(data.managerData);
  let switchingHostelId = $state<string | null>(null);
  let switchError = $state('');

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
  {#if (role === 'platform_admin' || role === 'SUPERADMIN' || role === 'ADMIN' || role === 'HEAD') && platformData}
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
