import * as stylex from '@stylexjs/stylex';

export const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    width: '100%',
    maxWidth: 1220,
    marginInline: 'auto',
    paddingBlock: { default: 28, '@media (max-width: 720px)': 20 },
    paddingInline: { default: 20, '@media (max-width: 720px)': 14 }
  },
  heading: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 18,
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
  filters: {
    display: 'flex',
    alignItems: { default: 'center', '@media (max-width: 720px)': 'stretch' },
    flexDirection: { default: 'row', '@media (max-width: 720px)': 'column' },
    gap: 12,
    flexWrap: 'wrap'
  },
  searchWrap: {
    position: 'relative',
    flex: 1,
    minWidth: { default: 240, '@media (max-width: 720px)': 0 },
    width: { default: 'auto', '@media (max-width: 720px)': '100%' }
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
  filterGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    padding: 4,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--color-background-muted)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'repeat(2, minmax(0, 1fr))',
      '@media (max-width: 720px)': 'minmax(0, 1fr)'
    },
    gap: 18
  },
  orgCard: { display: 'flex', flexDirection: 'column', gap: 20, padding: 22 },
  cardHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14
  },
  orgIdentity: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 },
  orgMark: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: 42,
    height: 42,
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--color-background-muted)',
    color: 'var(--color-text-primary)',
    fontSize: 14,
    fontWeight: 700
  },
  orgNames: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  orgName: {
    margin: 0,
    overflow: 'hidden',
    color: 'var(--color-text-primary)',
    fontSize: 18,
    fontWeight: 700,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  slug: {
    overflow: 'hidden',
    color: 'var(--color-text-secondary)',
    fontSize: 12,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'repeat(4, minmax(0, 1fr))',
      '@media (max-width: 480px)': 'repeat(2, minmax(0, 1fr))'
    },
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
    marginBlockEnd: 6,
    color: 'var(--color-text-secondary)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase'
  },
  statValue: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    color: 'var(--color-text-primary)',
    fontSize: 13,
    fontWeight: 650,
    fontVariantNumeric: 'tabular-nums'
  },
  warningValue: {
    color: 'var(--color-text-yellow)',
    fontSize: 13,
    fontWeight: 650,
    fontVariantNumeric: 'tabular-nums'
  },
  orgMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    color: 'var(--color-text-secondary)',
    fontSize: 12
  },
  cardFooter: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingBlockStart: 4,
    borderBlockStartWidth: 1,
    borderBlockStartStyle: 'solid',
    borderBlockStartColor: 'var(--color-border)'
  },
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
  emptyDescription: { margin: 0, color: 'var(--color-text-secondary)', fontSize: 14 },
  dialog: { display: 'flex', flexDirection: 'column', gap: 20 },
  dialogHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingBlockEnd: 16,
    borderBlockEndWidth: 1,
    borderBlockEndStyle: 'solid',
    borderBlockEndColor: 'var(--color-border)'
  },
  dialogTitle: { margin: 0, color: 'var(--color-text-primary)', fontSize: 20, fontWeight: 700 },
  dialogDescription: {
    margin: 0,
    color: 'var(--color-text-secondary)',
    fontSize: 14,
    lineHeight: 1.45
  },
  dialogForm: { display: 'flex', flexDirection: 'column', gap: 16 },
  dialogActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 10,
    paddingBlockStart: 4
  },
  feedbackError: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--color-border-red)',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--color-error-muted)',
    color: 'var(--color-text-red)',
    fontSize: 13
  }
});
