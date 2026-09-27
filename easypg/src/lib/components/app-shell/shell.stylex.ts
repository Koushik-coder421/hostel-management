import * as stylex from '@stylexjs/stylex';

export const shell = stylex.create({
  content: {
    maxWidth: 1440,
    width: '100%',
    minWidth: 0,
    marginInline: 'auto',
    padding: { default: 32, '@media (max-width: 767px)': 16 },
    paddingBottom: 'max(32px, env(safe-area-inset-bottom))'
  },
  navigation: { width: 240, height: '100%', backgroundColor: 'var(--color-background-card)' },
  brand: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    color: 'var(--color-text-primary)',
    textDecoration: 'none',
    fontSize: 21,
    fontWeight: 600,
    letterSpacing: '-0.03em'
  },
  brandMark: {
    display: 'grid',
    placeItems: 'center',
    width: 36,
    height: 36,
    borderRadius: 'var(--radius-container)',
    color: 'var(--color-on-accent)',
    backgroundColor: 'var(--color-accent)'
  },
  brandHeader: { display: 'flex', alignItems: 'center', minHeight: 64, paddingInline: 12 },
  icon: { width: 18, height: 18, flexShrink: 0 },
  brandIcon: { width: 20, height: 20 },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: 'var(--color-border)',
    paddingTop: 16
  },
  identity: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    textDecoration: 'none',
    color: 'var(--color-text-primary)'
  },
  identityText: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 },
  header: {
    minHeight: 72,
    paddingInline: { default: 24, '@media (max-width: 767px)': 12 },
    backgroundColor: 'var(--color-background-card)'
  },
  heading: { minWidth: 0, display: 'flex', alignItems: 'center', gap: 12 },
  breadcrumb: {
    display: { default: 'inline', '@media (max-width: 1023px)': 'none' },
    color: 'var(--color-text-secondary)',
    fontSize: 14
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap'
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: { default: 12, '@media (max-width: 767px)': 4 },
    minWidth: 0
  },
  property: { width: { default: 245, '@media (max-width: 767px)': 125 } },
  control: { minHeight: 44 },
  themeControl: { width: 44, minWidth: 44, minHeight: 44 },
  hidden: { display: 'none' }
});
