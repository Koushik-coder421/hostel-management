import * as stylex from '@stylexjs/stylex';

export const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    width: '100%',
    maxWidth: 1220,
    marginInline: 'auto',
    paddingBlock: { default: 28, '@media (max-width: 680px)': 20 },
    paddingInline: { default: 20, '@media (max-width: 680px)': 14 }
  },
  heading: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
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
    maxWidth: 650,
    color: 'var(--color-text-secondary)',
    fontSize: 15,
    lineHeight: 1.5
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
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
  cardTitle: { margin: 0, color: 'var(--color-text-primary)', fontSize: 17, fontWeight: 650 },
  cardDescription: {
    margin: 0,
    color: 'var(--color-text-secondary)',
    fontSize: 14,
    lineHeight: 1.45
  },
  tableWrap: { width: '100%', overflowX: 'auto' },
  property: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    color: 'var(--color-text-primary)'
  }
});
