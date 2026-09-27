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
  pageHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 'var(--spacing-4)',
    [medium]: { flexDirection: 'row', alignItems: 'center' }
  },
  headerCopy: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', minWidth: 0 },
  title: { margin: 0 },
  titleRow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-2)' },
  description: { margin: 0, maxWidth: '48rem' },
  headerActions: {
    display: 'none',
    gap: 'var(--spacing-2)',
    flexWrap: 'wrap',
    [medium]: { display: 'flex', justifyContent: 'flex-end' }
  },
  mobileActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 'var(--spacing-2)',
    [medium]: { display: 'none' }
  },
  fullWidthButton: { width: '100%' },
  metricGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 'var(--spacing-3)',
    [medium]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
    [large]: { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }
  },
  financeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
    gap: 'var(--spacing-3)',
    [medium]: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }
  },
  financeCard: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', minWidth: 0 },
  financeValue: { margin: 0 },
  financeValueSuccess: { margin: 0, color: 'var(--color-text-green)' },
  financeValueWarning: { margin: 0, color: 'var(--color-text-yellow)' },
  financeValueError: { margin: 0, color: 'var(--color-text-red)' },
  contentSection: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--spacing-3)'
  },
  sectionTitle: { margin: 0 },
  comparisonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
    gap: 'var(--spacing-3)',
    [medium]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }
  },
  hostelGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
    gap: 'var(--spacing-3)',
    [medium]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
    [large]: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }
  },
  comparisonCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-4)',
    minWidth: 0
  },
  identityRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 'var(--spacing-3)'
  },
  identityGroup: { display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', minWidth: 0 },
  avatar: {
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--color-background-muted)',
    color: 'var(--color-text-primary)',
    fontWeight: 'var(--font-weight-semibold)'
  },
  identityCopy: { minWidth: 0 },
  cardTitle: { margin: 0 },
  code: { fontFamily: 'var(--font-family-code)' },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 'var(--spacing-3)',
    paddingBlock: 'var(--spacing-3)',
    borderBlockWidth: 'var(--border-width)',
    borderBlockStyle: 'solid',
    borderBlockColor: 'var(--color-border)'
  },
  thirdStatGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 'var(--spacing-2)',
    paddingBlock: 'var(--spacing-3)',
    borderBlockWidth: 'var(--border-width)',
    borderBlockStyle: 'solid',
    borderBlockColor: 'var(--color-border)',
    textAlign: 'center'
  },
  statValue: { margin: 0 },
  warningValue: { margin: 0, color: 'var(--color-text-yellow)' },
  successValue: { margin: 0, color: 'var(--color-text-green)' },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--spacing-3)'
  },
  formAction: { width: '100%' },
  operationsCard: { minWidth: 0 },
  operationsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
    gap: 'var(--spacing-4)',
    [medium]: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }
  },
  operation: { display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', minWidth: 0 },
  operationIcon: {
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: 'var(--radius-element)'
  },
  operationSuccess: {
    backgroundColor: 'var(--color-background-green)',
    color: 'var(--color-text-green)'
  },
  operationInfo: {
    backgroundColor: 'var(--color-background-blue)',
    color: 'var(--color-text-blue)'
  },
  operationWarning: {
    backgroundColor: 'var(--color-background-yellow)',
    color: 'var(--color-text-yellow)'
  },
  operationValue: { margin: 0 },
  dualColumn: {
    display: 'grid',
    gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
    gap: 'var(--spacing-4)',
    [large]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }
  },
  listCard: { minWidth: 0 },
  cardHeading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--spacing-3)',
    padding: 'var(--spacing-4)',
    borderBlockEndWidth: 'var(--border-width)',
    borderBlockEndStyle: 'solid',
    borderBlockEndColor: 'var(--color-border)'
  },
  activityList: { display: 'flex', flexDirection: 'column' },
  activityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--spacing-3)',
    padding: 'var(--spacing-4)',
    borderBlockEndWidth: 'var(--border-width)',
    borderBlockEndStyle: 'solid',
    borderBlockEndColor: 'var(--color-border)'
  },
  activityIcon: {
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '2rem',
    height: '2rem',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--color-background-muted)',
    color: 'var(--color-text-primary)'
  },
  activityCopy: { flex: 1, minWidth: 0 },
  activityTitle: { margin: 0 },
  activityTime: { flexShrink: 0 },
  tableShell: { overflowX: 'auto' },
  table: { minWidth: '31rem' },
  emptyText: { margin: 0, padding: 'var(--spacing-6)', textAlign: 'center' },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--spacing-2)',
    padding: 'var(--spacing-6)',
    textAlign: 'center',
    color: 'var(--color-text-green)'
  },
  emptyHeading: { margin: 0, color: 'var(--color-text-primary)' },
  emptyCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--spacing-3)',
    maxWidth: '42rem',
    marginInline: 'auto',
    textAlign: 'center'
  }
});
