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
  header: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 'var(--spacing-4, 16px)',
    [tablet]: { flexDirection: 'row', alignItems: 'end' }
  },
  eyebrow: {
    margin: 0,
    color: 'var(--color-text-secondary)',
    fontSize: '0.75rem',
    fontWeight: 650,
    letterSpacing: '0.08em',
    textTransform: 'uppercase'
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 'var(--spacing-2)'
  },
  description: {
    margin: 'var(--spacing-1, 4px) 0 0',
    color: 'var(--color-text-secondary)',
    maxWidth: '700px'
  },
  codeBadge: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  primaryAction: { width: '100%', [tablet]: { width: 'auto' } },
  filterCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-3)',
    [tablet]: { flexDirection: 'row', alignItems: 'end', justifyContent: 'space-between' }
  },
  search: { width: '100%', [tablet]: { maxWidth: '420px' } },
  filterTabs: {
    display: 'flex',
    gap: 'var(--spacing-2)',
    overflowX: 'auto',
    paddingBlockEnd: '2px'
  },
  filterButton: { flex: '0 0 auto', minHeight: '36px' },
  selectedFilter: { boxShadow: 'inset 0 0 0 2px var(--color-text-primary)' },
  count: { minWidth: '1.3rem', textAlign: 'center', fontVariantNumeric: 'tabular-nums' },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 'var(--spacing-2)',
    paddingBlock: 'var(--spacing-8, 32px)'
  },
  emptyActions: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 'var(--spacing-2)',
    marginBlockStart: 'var(--spacing-2)'
  },
  desktopTable: { display: 'none', [tablet]: { display: 'block' } },
  mobileCards: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: 'var(--spacing-3)',
    [tablet]: { display: 'none' }
  },
  residentLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-3)',
    color: 'var(--color-text-primary)',
    textDecoration: 'none',
    minWidth: 0,
    ':hover': { textDecoration: 'underline' }
  },
  avatar: { flex: '0 0 auto' },
  residentIdentity: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-1, 4px)'
  },
  residentName: {
    color: 'var(--color-text-primary)',
    fontWeight: 700,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  secondary: { color: 'var(--color-text-secondary)', fontSize: '0.8rem' },
  mono: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontVariantNumeric: 'tabular-nums'
  },
  number: {
    color: 'var(--color-text-primary)',
    fontWeight: 650,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap'
  },
  actions: {
    display: 'flex',
    justifyContent: 'end',
    gap: 'var(--spacing-2)',
    flexWrap: 'wrap'
  },
  checkoutAction: { color: 'var(--color-error, var(--color-text-primary))' },
  mobileCard: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' },
  mobileTop: {
    display: 'flex',
    alignItems: 'start',
    justifyContent: 'space-between',
    gap: 'var(--spacing-2)'
  },
  mobileMeta: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 'var(--spacing-2)',
    padding: 'var(--spacing-3)',
    backgroundColor: 'var(--color-background-muted, var(--color-background-card))',
    borderRadius: 'var(--radius-container)'
  },
  metadata: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1, 4px)', minWidth: 0 },
  mobileFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--spacing-2)',
    paddingBlockStart: 'var(--spacing-2)',
    borderBlockStartWidth: 1,
    borderBlockStartStyle: 'solid',
    borderBlockStartColor: 'var(--color-border)'
  },
  dialogBody: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4, 16px)' },
  dialogActions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--spacing-2)',
    flexWrap: 'wrap',
    paddingBlockStart: 'var(--spacing-4, 16px)',
    borderBlockStartWidth: 1,
    borderBlockStartStyle: 'solid',
    borderBlockStartColor: 'var(--color-border)'
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
