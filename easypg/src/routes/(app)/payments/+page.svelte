<script lang="ts">
  import {
    Badge,
    Button,
    Card,
    Heading,
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
  import { formatDate } from '$lib/formatters/date.js';
  import { formatPaise } from '$lib/formatters/money.js';
  import type { PageData } from './$types';
  import { styles } from './page.stylex';
  import CreditCard from '@lucide/svelte/icons/credit-card';
  import Receipt from '@lucide/svelte/icons/receipt';

  let { data }: { data: PageData } = $props();
  let invoiceList = $derived(data.invoices ?? []);
  let totals = $derived(
    invoiceList.reduce(
      (sum, invoice) => ({
        billed: sum.billed + invoice.totalPaise,
        paid: sum.paid + invoice.paidPaise,
        outstanding: sum.outstanding + invoice.outstandingPaise
      }),
      { billed: 0, paid: 0, outstanding: 0 }
    )
  );

  function invoiceVariant(status: string): 'success' | 'error' | 'neutral' {
    if (status === 'paid') return 'success';
    if (status === 'overdue') return 'error';
    return 'neutral';
  }
</script>

<svelte:head><title>Payments & Invoices — EasyPG</title></svelte:head>

<div {...sx(styles.page)}>
  <header {...sx(styles.pageHeader)}>
    <Text type="label" color="accent" weight="semibold" display="block"
      >Billing and collections</Text
    >
    <Heading level={1} type="display-3" xstyle={styles.title}>Payments & invoices</Heading>
    <Text type="supporting" display="block" xstyle={styles.description}
      >Track invoices, recorded payments, and outstanding balances.</Text
    >
  </header>
  <section {...sx(styles.metricGrid)} aria-label="Invoice ledger summary">
    <MetricCard
      label="Total invoiced"
      value={formatPaise(totals.billed)}
      description={`${invoiceList.length} invoices in this ledger`}
    />
    <MetricCard
      label="Collected"
      value={formatPaise(totals.paid)}
      description="Payments recorded against these invoices"
      tone="success">{#snippet icon()}<CreditCard size={16} />{/snippet}</MetricCard
    >
    <MetricCard
      label="Outstanding"
      value={formatPaise(totals.outstanding)}
      description="Remaining balance across these invoices"
      tone="warning">{#snippet icon()}<Receipt size={16} />{/snippet}</MetricCard
    >
  </section>
  <Card padding={0} xstyle={styles.ledgerCard}>
    <div {...sx(styles.cardHeader)}>
      <div {...sx(styles.headingRow)}>
        <span {...sx(styles.headingIcon)}><Receipt size={18} /></span>
        <div>
          <Heading level={2} xstyle={styles.ledgerTitle}>Invoice ledger</Heading><Text
            type="supporting"
            display="block">All billing records for the active property.</Text
          >
        </div>
      </div>
    </div>
    {#if invoiceList.length === 0}
      <Text as="p" type="supporting" xstyle={styles.emptyState}
        >No invoices found for this hostel.</Text
      >
    {:else}
      <div {...sx([styles.tableShell, tableLayout.inset])}>
        <Table density="compact" hasHover data-testid="invoices-table" xstyle={styles.table}>
          <TableHeader
            ><TableRow isHeaderRow
              ><TableHeaderCell scope="col">Invoice #</TableHeaderCell><TableHeaderCell scope="col"
                >Resident</TableHeaderCell
              ><TableHeaderCell scope="col">Total</TableHeaderCell><TableHeaderCell scope="col"
                >Paid</TableHeaderCell
              ><TableHeaderCell scope="col">Outstanding</TableHeaderCell><TableHeaderCell
                scope="col">Due date</TableHeaderCell
              ><TableHeaderCell scope="col">Status</TableHeaderCell><TableHeaderCell scope="col"
                >Actions</TableHeaderCell
              ></TableRow
            ></TableHeader
          >
          <TableBody>
            {#each invoiceList as invoice (invoice.id)}
              <TableRow>
                <TableCell
                  ><Text weight="semibold" xstyle={styles.invoiceNumber}
                    >{invoice.invoiceNumber}</Text
                  ></TableCell
                >
                <TableCell
                  ><div {...sx(styles.residentCell)}>
                    <Text weight="medium" display="block">{invoice.residentName}</Text><Text
                      type="supporting"
                      display="block">{invoice.residentPhone}</Text
                    >
                  </div></TableCell
                >
                <TableCell><Text weight="medium">{formatPaise(invoice.totalPaise)}</Text></TableCell
                >
                <TableCell
                  ><Text weight="medium" xstyle={styles.paidValue}
                    >{formatPaise(invoice.paidPaise)}</Text
                  ></TableCell
                >
                <TableCell
                  ><Text
                    weight="semibold"
                    xstyle={invoice.outstandingPaise > 0
                      ? styles.outstandingValue
                      : styles.mutedValue}>{formatPaise(invoice.outstandingPaise)}</Text
                  ></TableCell
                >
                <TableCell><Text type="supporting">{formatDate(invoice.dueDate)}</Text></TableCell>
                <TableCell
                  ><Badge
                    label={invoice.status.replace('_', ' ')}
                    variant={invoiceVariant(invoice.status)}
                  /></TableCell
                >
                <TableCell
                  ><Button
                    label="View"
                    href={`/residents/${invoice.residentId}`}
                    variant="ghost"
                    size="sm"
                  /></TableCell
                >
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    {/if}
  </Card>
</div>
