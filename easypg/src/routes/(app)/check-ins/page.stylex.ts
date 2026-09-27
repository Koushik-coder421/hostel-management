import * as stylex from '@stylexjs/stylex';

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
    gap: 24,
    width: '100%',
    maxWidth: 1120,
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
    maxWidth: 620,
    color: 'var(--color-text-secondary)',
    fontSize: 15,
    lineHeight: 1.5
  },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
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
  stepLine: { display: 'flex', alignItems: 'center', gap: 10 },
  step: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--color-background-muted)',
    color: 'var(--color-text-secondary)',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.04em'
  },
  cardTitle: { margin: 0, color: 'var(--color-text-primary)', fontSize: 17, fontWeight: 650 },
  cardDescription: {
    margin: 0,
    color: 'var(--color-text-secondary)',
    fontSize: 14,
    lineHeight: 1.45
  },
  fieldGrid: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'repeat(2, minmax(0, 1fr))',
      '@media (max-width: 680px)': '1fr'
    },
    gap: 18
  },
  fullField: { gridColumn: { default: '1 / -1', '@media (max-width: 680px)': 'auto' } },
  nativeField: { display: 'flex', flexDirection: 'column', gap: 7 },
  nativeLabel: { color: 'var(--color-text-primary)', fontSize: 14, fontWeight: 600 },
  nativeInput: {
    boxSizing: 'border-box',
    width: '100%',
    minHeight: 44,
    paddingInline: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--color-background-card)',
    color: 'var(--color-text-primary)',
    font: 'inherit',
    fontSize: 15,
    outlineWidth: 0,
    outlineStyle: 'none',
    outlineColor: 'transparent',
    ':focus-visible': {
      borderColor: 'var(--color-accent)',
      boxShadow: '0 0 0 3px var(--color-accent)'
    }
  },
  actions: {
    display: 'flex',
    justifyContent: { default: 'flex-end', '@media (max-width: 680px)': 'stretch' },
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--color-background-card)'
  },
  feedbackError: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--color-border-red)',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--color-error-muted)',
    color: 'var(--color-text-red)',
    fontSize: 14
  }
});
