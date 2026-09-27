import * as stylex from '@stylexjs/stylex';

const medium = '@media (min-width: 42rem)';

export const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-6)',
    paddingBlockEnd: 'var(--spacing-8)'
  },
  pageHeader: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' },
  title: { margin: 0 },
  description: { margin: 0, maxWidth: '44rem' },
  metricGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
    gap: 'var(--spacing-3)',
    [medium]: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }
  },
  ledgerCard: { minWidth: 0 },
  cardHeader: {
    padding: 'var(--spacing-4)',
    borderBlockEndWidth: 'var(--border-width)',
    borderBlockEndStyle: 'solid',
    borderBlockEndColor: 'var(--color-border)'
  },
  headingRow: { display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' },
  headingIcon: {
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--color-background-muted)',
    color: 'var(--color-text-primary)'
  },
  ledgerTitle: { margin: 0 },
  emptyState: { margin: 0, padding: 'var(--spacing-8)', textAlign: 'center' },
  tableShell: { overflowX: 'auto' },
  table: { minWidth: '72rem' },
  invoiceNumber: { fontFamily: 'var(--font-family-code)' },
  residentCell: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' },
  paidValue: { color: 'var(--color-text-green)' },
  outstandingValue: { color: 'var(--color-text-yellow)' },
  mutedValue: { color: 'var(--color-text-secondary)' }
});
