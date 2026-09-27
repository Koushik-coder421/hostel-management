import * as stylex from '@stylexjs/stylex';

export const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    width: '100%',
    maxWidth: 1220,
    marginInline: 'auto',
    paddingBlock: { default: 28, '@media (max-width: 640px)': 20 },
    paddingInline: { default: 20, '@media (max-width: 640px)': 14 }
  },
  heading: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 20,
    flexWrap: 'wrap'
  },
  eyebrow: {
    margin: 0,
    color: 'var(--color-text-secondary)',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase'
  },
  title: {
    margin: '6px 0 0',
    color: 'var(--color-text-primary)',
    fontSize: 'clamp(1.65rem, 3vw, 2.25rem)',
    lineHeight: 1.1,
    letterSpacing: '-0.025em'
  },
  description: {
    margin: '8px 0 0',
    maxWidth: 620,
    color: 'var(--color-text-secondary)',
    fontSize: 15,
    lineHeight: 1.5
  },
  searchWrap: {
    position: 'relative',
    width: { default: 'min(100%, 310px)', '@media (max-width: 640px)': '100%' }
  },
  searchIcon: {
    position: 'absolute',
    insetInlineStart: 13,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--color-text-secondary)',
    pointerEvents: 'none'
  },
  searchInput: {
    boxSizing: 'border-box',
    width: '100%',
    minHeight: 44,
    paddingInline: 40,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--color-background-card)',
    color: 'var(--color-text-primary)',
    font: 'inherit',
    fontSize: 14,
    outlineWidth: 0,
    outlineStyle: 'none',
    outlineColor: 'transparent',
    ':focus-visible': {
      borderColor: 'var(--color-accent)',
      boxShadow: '0 0 0 3px var(--color-accent)'
    }
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'repeat(3, minmax(0, 1fr))',
      '@media (max-width: 960px)': 'repeat(2, minmax(0, 1fr))',
      '@media (max-width: 640px)': '1fr'
    },
    gap: 18
  },
  hostelCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    padding: 0,
    minWidth: 0,
    overflow: 'hidden'
  },
  activeCard: { borderColor: 'var(--color-accent)', boxShadow: '0 0 0 2px var(--color-accent)' },
  cardHeader: { padding: 22, paddingBlockEnd: 14 },
  headerRow: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  hostelIdentity: { minWidth: 0 },
  badgeRow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginBlockEnd: 12 },
  hostelName: {
    margin: 0,
    overflow: 'hidden',
    color: 'var(--color-text-primary)',
    fontSize: 18,
    fontWeight: 700,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  location: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    marginBlockStart: 7,
    overflow: 'hidden',
    color: 'var(--color-text-secondary)',
    fontSize: 12
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    paddingInline: 22,
    paddingBlock: 8,
    flex: 1
  },
  occupancy: { display: 'flex', flexDirection: 'column', gap: 8 },
  statLine: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    color: 'var(--color-text-secondary)',
    fontSize: 12
  },
  progressTrack: {
    width: '100%',
    height: 8,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'var(--color-background-muted)'
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: 'var(--color-success-muted)'
  },
  progressWidth: (width: number) => ({ width: `${width}%` }),
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 8,
    paddingBlock: 14,
    borderBlockWidth: 1,
    borderBlockStyle: 'solid',
    borderBlockColor: 'var(--color-border)',
    textAlign: 'center',
    backgroundColor: 'var(--color-background-muted)'
  },
  statLabel: {
    display: 'block',
    marginBlockEnd: 5,
    color: 'var(--color-text-secondary)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase'
  },
  successValue: { color: 'var(--color-text-green)' },
  cardFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 22,
    paddingBlockStart: 14
  },
  currentProperty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 42,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius-element)',
    color: 'var(--color-text-primary)',
    fontSize: 12,
    fontWeight: 650
  },
  fullWidth: { width: '100%' },
  fullButton: { width: '100%' },
  linkGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 },
  emptyCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    padding: 42,
    textAlign: 'center',
    backgroundColor: 'var(--color-background-muted)'
  },
  emptyIcon: { color: 'var(--color-text-secondary)' },
  emptyTitle: { margin: 0, color: 'var(--color-text-primary)', fontSize: 18 },
  emptyDescription: { margin: 0, color: 'var(--color-text-secondary)', fontSize: 14 }
});
