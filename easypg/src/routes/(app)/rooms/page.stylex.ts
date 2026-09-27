import * as stylex from '@stylexjs/stylex';

const tablet = '@media (min-width: 700px)';
const desktop = '@media (min-width: 1100px)';

export const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-6, 24px)',
    maxWidth: '1440px',
    marginInline: 'auto',
    padding: 'var(--spacing-4, 16px)'
  },
  header: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4, 16px)' },
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
    gap: 'var(--spacing-2, 8px)',
    flexWrap: 'wrap'
  },
  description: {
    margin: 'var(--spacing-1, 4px) 0 0',
    color: 'var(--color-text-secondary)',
    maxWidth: '680px'
  },
  codeBadge: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 'var(--spacing-2, 8px)',
    [tablet]: { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }
  },
  stat: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1, 4px)', minWidth: 0 },
  statLabel: { color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 600 },
  statValue: {
    color: 'var(--color-text-primary)',
    fontSize: '1.35rem',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums'
  },
  successText: { color: 'var(--color-success, var(--color-text-primary))' },
  filterCard: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3, 12px)' },
  filterTop: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-3, 12px)',
    [tablet]: { flexDirection: 'row', alignItems: 'end' }
  },
  search: { flex: 1, minWidth: '180px' },
  buildingTabs: {
    display: 'flex',
    gap: 'var(--spacing-2, 8px)',
    overflowX: 'auto',
    paddingBlockEnd: '2px'
  },
  filterRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-2, 8px)',
    [desktop]: { flexDirection: 'row', alignItems: 'center' }
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-2, 8px)',
    overflowX: 'auto',
    paddingBlockEnd: '2px'
  },
  filterLabel: {
    flex: '0 0 auto',
    color: 'var(--color-text-secondary)',
    fontSize: '0.8rem',
    fontWeight: 650
  },
  compactButton: { flex: '0 0 auto', minHeight: '36px' },
  selectedFilter: { boxShadow: 'inset 0 0 0 2px var(--color-text-primary)' },
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 'var(--spacing-4, 16px)',
    color: 'var(--color-text-secondary)',
    fontSize: '0.8rem'
  },
  legendItem: { display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-1, 4px)' },
  legendMark: {
    width: '0.75rem',
    height: '0.75rem',
    borderRadius: '3px',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--color-border)'
  },
  availableMark: { backgroundColor: 'var(--color-success-muted, var(--color-background-card))' },
  warningMark: { backgroundColor: 'var(--color-warning-muted, var(--color-background-card))' },
  dangerMark: { backgroundColor: 'var(--color-error-muted, var(--color-background-card))' },
  mutedMark: { backgroundColor: 'var(--color-background-muted, var(--color-background-card))' },
  empty: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--spacing-2, 8px)',
    paddingBlock: 'var(--spacing-8, 32px)'
  },
  floorList: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8, 32px)' },
  floor: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3, 12px)' },
  floorHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 'var(--spacing-3, 12px)',
    paddingBlockEnd: 'var(--spacing-2, 8px)',
    borderBlockEndWidth: 1,
    borderBlockEndStyle: 'solid',
    borderBlockEndColor: 'var(--color-border)'
  },
  floorName: {
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: 'var(--spacing-2, 8px)',
    flexWrap: 'wrap'
  },
  floorMeta: { color: 'var(--color-text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' },
  roomGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 'var(--spacing-3, 12px)',
    [tablet]: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
    [desktop]: { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }
  },
  roomCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 'var(--spacing-3, 12px)',
    width: '100%',
    minHeight: '156px',
    textAlign: 'start',
    cursor: 'pointer',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--color-background-card)',
    padding: 'var(--spacing-3, 12px)',
    color: 'var(--color-text-primary)',
    transitionProperty: 'transform, border-color, box-shadow',
    transitionDuration: '160ms',
    ':hover': {
      transform: 'translateY(-2px)',
      borderColor: 'var(--color-text-primary)',
      boxShadow: '0 8px 22px rgb(0 0 0 / 0.08)'
    },
    ':focus-visible': {
      outlineWidth: 2,
      outlineStyle: 'solid',
      outlineColor: 'var(--color-text-primary)',
      outlineOffset: '2px'
    }
  },
  roomCardAvailable: {
    borderBlockStartWidth: 3,
    borderBlockStartStyle: 'solid',
    borderBlockStartColor: 'var(--color-success, var(--color-text-primary))'
  },
  roomCardWarning: {
    borderBlockStartWidth: 3,
    borderBlockStartStyle: 'solid',
    borderBlockStartColor: 'var(--color-warning, var(--color-text-primary))'
  },
  roomCardFull: {
    borderBlockStartWidth: 3,
    borderBlockStartStyle: 'solid',
    borderBlockStartColor: 'var(--color-error, var(--color-text-primary))'
  },
  roomCardStore: {
    borderBlockStartWidth: 3,
    borderBlockStartStyle: 'solid',
    borderBlockStartColor: 'var(--color-border)',
    backgroundColor: 'var(--color-background-muted, var(--color-background-card))'
  },
  roomTop: {
    display: 'flex',
    alignItems: 'start',
    justifyContent: 'space-between',
    gap: 'var(--spacing-2, 8px)'
  },
  roomNumber: {
    fontSize: '1.45rem',
    fontWeight: 700,
    lineHeight: 1.1,
    color: 'var(--color-text-primary)'
  },
  roomSharing: {
    display: 'block',
    marginBlockStart: 'var(--spacing-1, 4px)',
    color: 'var(--color-text-secondary)',
    fontSize: '0.78rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  roomBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-2, 8px)',
    marginBlockStart: 'auto'
  },
  occupancyLine: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: 'var(--color-text-secondary)',
    fontSize: '0.78rem'
  },
  occupancyValue: {
    color: 'var(--color-text-primary)',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums'
  },
  bedStrip: { display: 'flex', gap: 'var(--spacing-1, 4px)' },
  bedMark: {
    flex: 1,
    minWidth: 0,
    minHeight: '24px',
    borderRadius: '4px',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--color-border)'
  },
  bedOccupied: { backgroundColor: 'var(--color-background-muted, var(--color-background-card))' },
  bedAvailable: { backgroundColor: 'var(--color-success-muted, var(--color-background-card))' },
  bedBlocked: { backgroundColor: 'var(--color-warning-muted, var(--color-background-card))' },
  roomFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 'var(--spacing-1, 4px)',
    color: 'var(--color-text-secondary)',
    fontSize: '0.76rem'
  },
  storeText: { color: 'var(--color-text-secondary)', fontSize: '0.8rem' },
  dialogBody: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4, 16px)' },
  dialogStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius-container)',
    overflow: 'hidden'
  },
  dialogStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--spacing-1, 4px)',
    padding: 'var(--spacing-3, 12px)',
    textAlign: 'center',
    borderInlineEndWidth: 1,
    borderInlineEndStyle: 'solid',
    borderInlineEndColor: 'var(--color-border)'
  },
  dialogStatLast: {
    borderInlineEndWidth: 0,
    borderInlineEndStyle: 'none',
    borderInlineEndColor: 'transparent'
  },
  detailList: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2, 8px)' },
  bedRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--spacing-3, 12px)',
    padding: 'var(--spacing-3, 12px)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius-container)'
  },
  bedInfo: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1, 4px)' },
  bedHeading: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 'var(--spacing-2, 8px)'
  },
  residentLink: {
    color: 'var(--color-text-primary)',
    fontSize: '0.8rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  dialogFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 'var(--spacing-2, 8px)',
    paddingBlockStart: 'var(--spacing-4, 16px)',
    borderBlockStartWidth: 1,
    borderBlockStartStyle: 'solid',
    borderBlockStartColor: 'var(--color-border)'
  }
});
