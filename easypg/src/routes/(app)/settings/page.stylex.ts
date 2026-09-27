import * as stylex from '@stylexjs/stylex';

export const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    width: '100%',
    maxWidth: 900,
    marginInline: 'auto',
    paddingBlock: { default: 28, '@media (max-width: 680px)': 20 },
    paddingInline: { default: 20, '@media (max-width: 680px)': 14 }
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
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    padding: { default: 24, '@media (max-width: 680px)': 18 }
  },
  cardHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingBlockEnd: 16,
    borderBlockEndWidth: 1,
    borderBlockEndStyle: 'solid',
    borderBlockEndColor: 'var(--color-border)'
  },
  cardTitleLine: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    color: 'var(--color-text-primary)'
  },
  cardTitle: { margin: 0, color: 'var(--color-text-primary)', fontSize: 17, fontWeight: 650 },
  cardDescription: {
    margin: 0,
    color: 'var(--color-text-secondary)',
    fontSize: 14,
    lineHeight: 1.45
  },
  profile: { display: 'flex', alignItems: 'center', gap: 16 },
  profileCopy: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
    minWidth: 0
  },
  profileName: { color: 'var(--color-text-primary)', fontSize: 18 },
  profileEmail: {
    overflow: 'hidden',
    maxWidth: '100%',
    color: 'var(--color-text-secondary)',
    fontSize: 14,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  details: { display: 'flex', flexDirection: 'column', gap: 0, margin: 0 },
  detailRow: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 1fr) minmax(0, 2fr)', '@media (max-width: 680px)': 'minmax(0, 1fr)' },
    gap: 'var(--spacing-2)',
    paddingBlock: 12,
    borderBlockEndWidth: 1,
    borderBlockEndStyle: 'solid',
    borderBlockEndColor: 'var(--color-border)',
    fontSize: 14
  },
  detailValue: {
    margin: 0,
    minWidth: 0,
    overflowWrap: 'anywhere',
    textAlign: { default: 'end', '@media (max-width: 680px)': 'start' }
  },
  cardFooter: {
    display: 'flex',
    alignItems: { default: 'center', '@media (max-width: 680px)': 'stretch' },
    flexDirection: { default: 'row', '@media (max-width: 680px)': 'column' },
    justifyContent: 'space-between',
    gap: 14,
    flexWrap: 'wrap',
    paddingBlockStart: 16,
    borderBlockStartWidth: 1,
    borderBlockStartStyle: 'solid',
    borderBlockStartColor: 'var(--color-border)'
  },
  footerNote: { color: 'var(--color-text-secondary)', fontSize: 12 }
});
