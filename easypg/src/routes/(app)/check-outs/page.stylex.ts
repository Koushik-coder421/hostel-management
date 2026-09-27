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
    maxWidth: 1180,
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
    maxWidth: 680,
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
  cardHeader: { display: 'flex', flexDirection: 'column', gap: 8 },
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
  tableWrap: { width: '100%', overflowX: 'auto' },
  cellStack: { display: 'flex', flexDirection: 'column', gap: 3 },
  cellPrimary: { color: 'var(--color-text-primary)', fontWeight: 650 },
  cellSecondary: { color: 'var(--color-text-secondary)', fontSize: 12 },
  mono: { color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    paddingBlock: 36,
    color: 'var(--color-text-secondary)',
    fontSize: 14
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
  },
  feedbackSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--color-border-green)',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--color-success-muted)',
    color: 'var(--color-text-green)',
    fontSize: 14
  },
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
  dialogTitle: { margin: 0, color: 'var(--color-text-red)', fontSize: 18, fontWeight: 700 },
  dialogForm: { display: 'flex', flexDirection: 'column', gap: 16 },
  summary: {
    display: 'flex',
    flexDirection: 'column',
    gap: 9,
    padding: 14,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--color-background-muted)',
    fontSize: 14
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 'var(--spacing-2)'
  },
  dialogActions: {
    display: 'flex',
    justifyContent: { default: 'flex-end', '@media (max-width: 680px)': 'stretch' },
    flexWrap: 'wrap',
    gap: 10,
    paddingBlockStart: 4
  }
});
