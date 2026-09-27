import * as stylex from '@stylexjs/stylex';

const medium = '@media (min-width: 42rem)';
const large = '@media (min-width: 70rem)';

export const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-6)',
    paddingBlockEnd: 'var(--spacing-8)'
  },
  pageHeader: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' },
  titleRow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-2)' },
  title: { margin: 0 },
  description: { margin: 0, maxWidth: '50rem' },
  metricGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
    gap: 'var(--spacing-3)',
    [medium]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
    [large]: { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }
  },
  summaryCard: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', minWidth: 0 },
  metricHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--spacing-2)'
  },
  neutralIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2rem',
    height: '2rem',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--color-background-muted)',
    color: 'var(--color-text-primary)'
  },
  successIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2rem',
    height: '2rem',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--color-background-green)',
    color: 'var(--color-text-green)'
  },
  errorIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2rem',
    height: '2rem',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--color-background-red)',
    color: 'var(--color-text-red)'
  },
  metricValueRow: { display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-2)' },
  metricValue: { margin: 0 },
  successText: { color: 'var(--color-text-green)' },
  warningText: { color: 'var(--color-text-yellow)' },
  errorText: { color: 'var(--color-text-red)' },
  mutedText: { color: 'var(--color-text-secondary)' },
  inventoryCard: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' },
  inventoryHeading: { margin: 0 },
  inventoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 'var(--spacing-2)',
    [medium]: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
    [large]: { gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }
  },
  inventoryNeutral: {
    padding: 'var(--spacing-3)',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--color-background-muted)',
    textAlign: 'center'
  },
  inventoryAccent: {
    padding: 'var(--spacing-3)',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--color-background-blue)',
    textAlign: 'center'
  },
  inventoryWarning: {
    padding: 'var(--spacing-3)',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--color-background-yellow)',
    textAlign: 'center'
  },
  inventorySuccess: {
    padding: 'var(--spacing-3)',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--color-background-green)',
    textAlign: 'center'
  },
  inventoryValue: { margin: 0 },
  reportSection: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' },
  tabList: { width: '100%' },
  panel: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' },
  tableShell: { overflowX: 'auto' },
  occupancyTable: { minWidth: '56rem' },
  rateCell: { display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', minWidth: '10rem' },
  rateProgress: { width: '6rem', flexShrink: 0 },
  rateValue: { minWidth: '3rem', textAlign: 'end' },
  agingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 'var(--spacing-3)',
    [medium]: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
    [large]: { gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }
  },
  agingCard: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)', minWidth: 0 },
  agingDetails: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' },
  detailHeading: { margin: 0 },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--spacing-2)',
    textAlign: 'center',
    color: 'var(--color-text-green)'
  },
  emptyHeading: { margin: 0, color: 'var(--color-text-primary)' },
  invoiceCard: { minWidth: 0 },
  bucketHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--spacing-3)',
    padding: 'var(--spacing-4)',
    borderBlockEndWidth: 'var(--border-width)',
    borderBlockEndStyle: 'solid',
    borderBlockEndColor: 'var(--color-border)'
  },
  bucketLabel: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-2)' },
  invoiceTable: { minWidth: '44rem' },
  invoiceNumber: { fontFamily: 'var(--font-family-code)' }
});
