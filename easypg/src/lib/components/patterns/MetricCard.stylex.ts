import * as stylex from '@stylexjs/stylex';

export const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-3)',
    minWidth: 0,
    minHeight: '10.5rem'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--spacing-3)'
  },
  icon: {
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.25rem',
    height: '2.25rem',
    borderRadius: 'var(--radius-element)'
  },
  iconNeutral: {
    backgroundColor: 'var(--color-background-muted)',
    color: 'var(--color-text-primary)'
  },
  iconSuccess: {
    backgroundColor: 'var(--color-background-green)',
    color: 'var(--color-text-green)'
  },
  iconWarning: {
    backgroundColor: 'var(--color-background-yellow)',
    color: 'var(--color-text-yellow)'
  },
  iconDestructive: {
    backgroundColor: 'var(--color-background-red)',
    color: 'var(--color-text-red)'
  },
  iconInfo: { backgroundColor: 'var(--color-background-blue)', color: 'var(--color-text-blue)' },
  value: {
    margin: 0,
    overflowWrap: 'anywhere'
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-2)',
    marginTop: 'auto'
  },
  progress: { width: '100%' },
  description: { margin: 0 }
});
