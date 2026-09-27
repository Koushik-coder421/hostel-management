import * as stylex from '@stylexjs/stylex';

const tablet = '@media (min-width: 700px)';

export const styles = stylex.create({
  dateField: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' },
  dateLabel: { color: 'var(--color-text-primary)', fontWeight: 600 },
  dateInput: {
    boxSizing: 'border-box',
    width: '100%',
    minWidth: 0,
    minHeight: 'var(--size-element-md)',
    paddingInline: 'var(--spacing-3)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--color-background-card)',
    color: 'var(--color-text-primary)',
    font: 'inherit'
  },
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-6, 24px)',
    maxWidth: '1440px',
    marginInline: 'auto',
    padding: 'var(--spacing-4, 16px)'
  },
  breadcrumb: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-2)',
    color: 'var(--color-text-secondary)',
    fontSize: '0.82rem',
    textDecoration: 'none',
    ':hover': { color: 'var(--color-text-primary)', textDecoration: 'underline' }
  },
  profile: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-4, 16px)',
    [tablet]: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }
  },
  profileIdentity: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-4, 16px)',
    minWidth: 0
  },
  profileCopy: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-2)',
    minWidth: 0
  },
  profileTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-2)',
    flexWrap: 'wrap'
  },
  profileDetails: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--spacing-2) var(--spacing-4, 16px)',
    color: 'var(--color-text-secondary)',
    fontSize: '0.82rem'
  },
  profileActions: { display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-2)' },
  checkoutAction: { color: 'var(--color-error, var(--color-text-primary))' },
  tabs: { width: '100%' },
  tabPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-5, 20px)',
    paddingBlockStart: 'var(--spacing-4, 16px)'
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: 'var(--spacing-4, 16px)',
    [tablet]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }
  },
  cardStack: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4, 16px)' },
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--spacing-2)',
    paddingBlockEnd: 'var(--spacing-3)',
    borderBlockEndWidth: 1,
    borderBlockEndStyle: 'solid',
    borderBlockEndColor: 'var(--color-border)'
  },
  terms: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 'var(--spacing-3)'
  },
  term: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1, 4px)', minWidth: 0 },
  termLabel: { color: 'var(--color-text-secondary)', fontSize: '0.78rem' },
  termValue: {
    color: 'var(--color-text-primary)',
    fontWeight: 650,
    fontVariantNumeric: 'tabular-nums'
  },
  financeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 'var(--spacing-2)'
  },
  financeMetric: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-1, 4px)',
    minWidth: 0,
    padding: 'var(--spacing-3)',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--color-background-muted, var(--color-background-card))'
  },
  metricValue: {
    color: 'var(--color-text-primary)',
    fontSize: '1.05rem',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  success: { color: 'var(--color-success, var(--color-text-primary))' },
  warning: { color: 'var(--color-warning, var(--color-text-primary))' },
  notice: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--spacing-3)',
    padding: 'var(--spacing-3)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--color-background-muted, var(--color-background-card))'
  },
  noticeCopy: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1, 4px)' },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-2)',
    alignItems: 'center',
    textAlign: 'center',
    paddingBlock: 'var(--spacing-8, 32px)'
  },
  tableWrap: { overflowX: 'auto' },
  invoiceTable: { minWidth: '72rem' },
  paymentTable: { minWidth: '60rem' },
  mono: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontVariantNumeric: 'tabular-nums'
  },
  numeric: {
    color: 'var(--color-text-primary)',
    fontWeight: 650,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap'
  },
  right: { textAlign: 'end' },
  metadata: { color: 'var(--color-text-secondary)', fontSize: '0.82rem', whiteSpace: 'nowrap' },
  noteCell: { color: 'var(--color-text-secondary)', fontSize: '0.82rem', maxWidth: '240px' },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-5, 20px)',
    borderInlineStartWidth: 2,
    borderInlineStartStyle: 'solid',
    borderInlineStartColor: 'var(--color-border)',
    paddingInlineStart: 'var(--spacing-5, 20px)'
  },
  event: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-1, 4px)'
  },
  dot: {
    position: 'absolute',
    insetInlineStart: '-27px',
    insetBlockStart: '4px',
    width: '10px',
    height: '10px',
    borderRadius: '999px',
    backgroundColor: 'var(--color-text-primary)',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'var(--color-background-body)'
  },
  eventHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--spacing-2)',
    alignItems: 'baseline'
  },
  eventJson: {
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    margin: 0,
    overflowX: 'auto',
    padding: 'var(--spacing-2)',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--color-background-muted, var(--color-background-card))',
    color: 'var(--color-text-secondary)',
    fontSize: '0.75rem'
  },
  dialogBody: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4, 16px)' },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: 'var(--spacing-3)',
    [tablet]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }
  },
  fullField: { gridColumn: '1 / -1' },
  dialogActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 'var(--spacing-2)',
    paddingBlockStart: 'var(--spacing-4, 16px)',
    borderBlockStartWidth: 1,
    borderBlockStartStyle: 'solid',
    borderBlockStartColor: 'var(--color-border)'
  },
  pageFeedback: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-2)',
    padding: 'var(--spacing-3)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--color-border-red, var(--color-border))',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--color-error-muted, var(--color-background-muted))',
    color: 'var(--color-text-red, var(--color-text-primary))'
  },
  feedbackError: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-2)',
    padding: 'var(--spacing-3)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--color-border-red, var(--color-border))',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--color-error-muted, var(--color-background-muted))',
    color: 'var(--color-text-red, var(--color-text-primary))'
  }
});
