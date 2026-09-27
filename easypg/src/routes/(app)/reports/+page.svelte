<script lang="ts">
  import {
    Badge,
    Card,
    Heading,
    ProgressBar,
    Tab,
    TabList,
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableHeaderCell,
    TableRow,
    Text
  } from '@astryx-svelte/core';
  import { sx } from '$lib/design/attrs';
  import { tableLayout } from '$lib/design/table.stylex';
  import { formatDate } from '$lib/formatters/date.js';
  import { formatPaise, formatPaiseCompact } from '$lib/formatters/money.js';
  import type { PageData } from './$types';
  import { styles } from './page.stylex';
  import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
  import BedDouble from '@lucide/svelte/icons/bed-double';
  import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
  import Clock from '@lucide/svelte/icons/clock';
  import Layers from '@lucide/svelte/icons/layers';
  import Receipt from '@lucide/svelte/icons/receipt';

  let { data }: { data: PageData } = $props();
  let activeTab = $state('occupancy');
</script>

<svelte:head><title>Reports & Analytics — {data.hostel?.name ?? 'EasyPG'}</title></svelte:head>

{#snippet occupancyIcon()}<Layers size={16} />{/snippet}
{#snippet agingIcon()}<Clock size={16} />{/snippet}

<div {...sx(styles.page)}>
  <header {...sx(styles.pageHeader)}>
    <Text type="label" color="accent" weight="semibold" display="block">Property insights</Text>
    <div {...sx(styles.titleRow)}>
      <Heading level={1} type="display-3" xstyle={styles.title}>Reports & analytics</Heading
      >{#if data.hostel}<Badge label={data.hostel.code} variant="neutral" />{/if}
    </div>
    <Text type="supporting" display="block" xstyle={styles.description}
      >Detailed breakdown of occupancy by floor and overdue invoice aging buckets.</Text
    >
  </header>

  <section {...sx(styles.metricGrid)} aria-label="Report summary">
    <Card padding={4} xstyle={styles.summaryCard}>
      <div {...sx(styles.metricHeader)}>
        <Text type="label" color="secondary" weight="semibold">Occupancy rate</Text><span
          {...sx(styles.neutralIcon)}><BedDouble size={16} /></span
        >
      </div>
      <div {...sx(styles.metricValueRow)}>
        <Text as="p" type="display-3" weight="semibold" xstyle={styles.metricValue}
          >{data.occupancySummary.occupancyRate}%</Text
        ><Text type="supporting"
          >({data.occupancySummary.occupiedBeds}/{data.occupancySummary.sellableBeds})</Text
        >
      </div>
      <ProgressBar
        label="Overall occupancy rate"
        value={data.occupancySummary.occupancyRate}
        isLabelHidden
        variant="accent"
      />
    </Card>
    <Card padding={4} xstyle={styles.summaryCard}>
      <div {...sx(styles.metricHeader)}>
        <Text type="label" weight="semibold" xstyle={styles.successText}>Available beds</Text><span
          {...sx(styles.successIcon)}><CheckCircle2 size={16} /></span
        >
      </div>
      <Text as="p" type="display-3" weight="semibold" xstyle={styles.successText}
        >{data.occupancySummary.availableBeds}</Text
      >
      <Text type="supporting" display="block"
        >Out of {data.occupancySummary.physicalBeds} physical beds</Text
      >
    </Card>
    <Card padding={4} xstyle={styles.summaryCard}>
      <div {...sx(styles.metricHeader)}>
        <Text type="label" color="secondary" weight="semibold">Collection rate</Text><span
          {...sx(styles.neutralIcon)}><Receipt size={16} /></span
        >
      </div>
      <div {...sx(styles.metricValueRow)}>
        <Text as="p" type="display-3" weight="semibold" xstyle={styles.metricValue}
          >{data.financialSummary.collectionRate}%</Text
        ><Text type="supporting">collected</Text>
      </div>
      <ProgressBar
        label="Collection rate"
        value={data.financialSummary.collectionRate}
        isLabelHidden
        variant="success"
      />
    </Card>
    <Card padding={4} xstyle={styles.summaryCard}>
      <div {...sx(styles.metricHeader)}>
        <Text type="label" weight="semibold" xstyle={styles.errorText}>Total outstanding</Text><span
          {...sx(styles.errorIcon)}><Clock size={16} /></span
        >
      </div>
      <Text as="p" type="display-3" weight="semibold" xstyle={styles.errorText}
        >{formatPaiseCompact(data.financialSummary.totalOutstandingPaise)}</Text
      >
      <Text type="supporting" display="block"
        >From {formatPaiseCompact(data.financialSummary.totalBilledPaise)} billed</Text
      >
    </Card>
  </section>

  <Card padding={4} xstyle={styles.inventoryCard}>
    <Heading level={2} xstyle={styles.inventoryHeading}>Bed inventory breakdown</Heading>
    <div {...sx(styles.inventoryGrid)}>
      <div {...sx(styles.inventoryNeutral)}>
        <Text type="supporting" display="block">Physical</Text><Text
          as="p"
          weight="semibold"
          xstyle={styles.inventoryValue}>{data.occupancySummary.physicalBeds}</Text
        >
      </div>
      <div {...sx(styles.inventoryNeutral)}>
        <Text type="supporting" display="block">Sellable</Text><Text
          as="p"
          weight="semibold"
          xstyle={styles.inventoryValue}>{data.occupancySummary.sellableBeds}</Text
        >
      </div>
      <div {...sx(styles.inventoryAccent)}>
        <Text type="supporting" display="block">Occupied</Text><Text
          as="p"
          weight="semibold"
          xstyle={styles.inventoryValue}>{data.occupancySummary.occupiedBeds}</Text
        >
      </div>
      <div {...sx(styles.inventoryWarning)}>
        <Text type="supporting" display="block">Blocked</Text><Text
          as="p"
          weight="semibold"
          xstyle={styles.warningText}>{data.occupancySummary.blockedBeds}</Text
        >
      </div>
      <div {...sx(styles.inventoryWarning)}>
        <Text type="supporting" display="block">Maintenance</Text><Text
          as="p"
          weight="semibold"
          xstyle={styles.warningText}>{data.occupancySummary.maintenanceBeds}</Text
        >
      </div>
      <div {...sx(styles.inventorySuccess)}>
        <Text type="supporting" display="block">Available</Text><Text
          as="p"
          weight="semibold"
          xstyle={styles.successText}>{data.occupancySummary.availableBeds}</Text
        >
      </div>
    </div>
  </Card>

  <section {...sx(styles.reportSection)} aria-label="Detailed reports">
    <TabList
      value={activeTab}
      onChange={(value) => (activeTab = value)}
      role="tablist"
      hasDivider
      xstyle={styles.tabList}
    >
      <Tab
        id="occupancy-tab"
        value="occupancy"
        label="Occupancy by floor"
        panelId="occupancy-panel"
        icon={occupancyIcon}
      />
      <Tab
        id="aging-tab"
        value="aging"
        label="Overdue aging breakdown"
        panelId="aging-panel"
        icon={agingIcon}
      />
    </TabList>

    <div
      id="occupancy-panel"
      role="tabpanel"
      aria-labelledby="occupancy-tab"
      hidden={activeTab !== 'occupancy'}
      {...sx(styles.panel)}
    >
      <div {...sx([styles.tableShell, tableLayout.inset])}>
        <Table density="compact" hasHover xstyle={styles.occupancyTable}>
          <TableHeader
            ><TableRow isHeaderRow
              ><TableHeaderCell scope="col">Floor / building</TableHeaderCell><TableHeaderCell
                scope="col">Rooms</TableHeaderCell
              ><TableHeaderCell scope="col">Total beds</TableHeaderCell><TableHeaderCell scope="col"
                >Sellable</TableHeaderCell
              ><TableHeaderCell scope="col">Occupied</TableHeaderCell><TableHeaderCell scope="col"
                >Blocked</TableHeaderCell
              ><TableHeaderCell scope="col">Maint.</TableHeaderCell><TableHeaderCell scope="col"
                >Available</TableHeaderCell
              ><TableHeaderCell scope="col">Occupancy rate</TableHeaderCell></TableRow
            ></TableHeader
          >
          <TableBody>
            {#each data.floorOccupancy as floor (floor.floorId)}
              <TableRow>
                <TableCell
                  ><Text weight="semibold">{floor.floorLabel}</Text><Text type="supporting">
                    ({floor.buildingName})</Text
                  ></TableCell
                >
                <TableCell>{floor.roomCount}</TableCell><TableCell>{floor.totalBeds}</TableCell
                ><TableCell>{floor.sellableBeds}</TableCell><TableCell
                  ><Text weight="semibold">{floor.occupiedBeds}</Text></TableCell
                ><TableCell><Text xstyle={styles.warningText}>{floor.blockedBeds}</Text></TableCell
                ><TableCell
                  ><Text xstyle={styles.warningText}>{floor.maintenanceBeds}</Text></TableCell
                ><TableCell
                  ><Text weight="semibold" xstyle={styles.successText}>{floor.availableBeds}</Text
                  ></TableCell
                >
                <TableCell
                  ><div {...sx(styles.rateCell)}>
                    <ProgressBar
                      label={`${floor.floorLabel} occupancy`}
                      value={floor.occupancyRate}
                      isLabelHidden
                      variant={floor.occupancyRate >= 90
                        ? 'error'
                        : floor.occupancyRate >= 70
                          ? 'accent'
                          : 'success'}
                      xstyle={styles.rateProgress}
                    /><Text weight="semibold" xstyle={styles.rateValue}>{floor.occupancyRate}%</Text
                    >
                  </div></TableCell
                >
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    </div>
    <div
      id="aging-panel"
      role="tabpanel"
      aria-labelledby="aging-tab"
      hidden={activeTab !== 'aging'}
      {...sx(styles.panel)}
    >
      <div {...sx(styles.agingGrid)}>
        {#each data.agingBuckets as bucket (bucket.bucket)}
          <Card
            padding={3}
            variant={bucket.count > 0 ? 'red' : 'default'}
            xstyle={styles.agingCard}
          >
            <Text type="label" weight="semibold" display="block">{bucket.bucket}</Text>
            <Text type="supporting" display="block"
              >{bucket.count} {bucket.count === 1 ? 'invoice' : 'invoices'}</Text
            >
            <Text
              as="p"
              weight="semibold"
              xstyle={bucket.totalOutstandingPaise > 0 ? styles.errorText : styles.mutedText}
              >{formatPaiseCompact(bucket.totalOutstandingPaise)}</Text
            >
          </Card>
        {/each}
      </div>
      <div {...sx(styles.agingDetails)}>
        <Heading level={2} xstyle={styles.detailHeading}>Detailed aging invoices</Heading>
        {#if data.agingBuckets.every((bucket) => bucket.invoices.length === 0)}
          <Card padding={5} xstyle={styles.emptyState}
            ><CheckCircle2 size={36} /><Heading level={3} xstyle={styles.emptyHeading}
              >Zero overdue invoices</Heading
            ><Text type="supporting" display="block"
              >All resident payments are up to date with no overdue balances.</Text
            ></Card
          >
        {:else}
          {#each data.agingBuckets as bucket (bucket.bucket)}
            {#if bucket.invoices.length > 0}
              <Card padding={0} xstyle={styles.invoiceCard}>
                <div {...sx(styles.bucketHeader)}>
                  <div {...sx(styles.bucketLabel)}>
                    <Badge label={`${bucket.bucket} overdue`} variant="error" /><Text
                      type="supporting">{bucket.count} invoices</Text
                    >
                  </div>
                  <Text weight="semibold" xstyle={styles.errorText}
                    >{formatPaise(bucket.totalOutstandingPaise)}</Text
                  >
                </div>
                <div {...sx([styles.tableShell, tableLayout.inset])}>
                  <Table density="compact" hasHover xstyle={styles.invoiceTable}>
                    <TableHeader
                      ><TableRow isHeaderRow
                        ><TableHeaderCell scope="col">Invoice #</TableHeaderCell><TableHeaderCell
                          scope="col">Resident</TableHeaderCell
                        ><TableHeaderCell scope="col">Due date</TableHeaderCell><TableHeaderCell
                          scope="col">Days past due</TableHeaderCell
                        ><TableHeaderCell scope="col">Outstanding amount</TableHeaderCell></TableRow
                      ></TableHeader
                    >
                    <TableBody
                      >{#each bucket.invoices as invoice (invoice.invoiceId)}<TableRow
                          ><TableCell
                            ><Text weight="semibold" xstyle={styles.invoiceNumber}
                              >{invoice.invoiceNumber}</Text
                            ></TableCell
                          ><TableCell><Text weight="medium">{invoice.residentName}</Text></TableCell
                          ><TableCell
                            ><Text type="supporting">{formatDate(invoice.dueDate)}</Text></TableCell
                          ><TableCell
                            ><Text weight="semibold" xstyle={styles.errorText}
                              >{invoice.daysOverdue} days</Text
                            ></TableCell
                          ><TableCell
                            ><Text weight="semibold">{formatPaise(invoice.outstandingPaise)}</Text
                            ></TableCell
                          ></TableRow
                        >{/each}</TableBody
                    >
                  </Table>
                </div>
              </Card>
            {/if}
          {/each}
        {/if}
      </div>
    </div>
  </section>
</div>
