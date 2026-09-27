import * as stylex from '@stylexjs/stylex';

export const login = stylex.create({
  page: {
    minHeight: '100dvh',
    maxWidth: 1600,
    marginInline: 'auto',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--color-background-body)'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: { default: '24px 48px', '@media (max-width: 767px)': '16px 20px' }
  },
  headerActions: { display: 'flex', alignItems: 'center', gap: 12 },
  tagline: { display: { default: 'block', '@media (max-width: 767px)': 'none' } },
  columns: {
    flex: 1,
    display: 'grid',
    alignItems: 'center',
    gridTemplateColumns: {
      default: 'minmax(0, 1fr) minmax(0, 440px)',
      '@media (max-width: 1023px)': '1fr'
    },
    gap: 64,
    padding: { default: '0 7% 40px', '@media (max-width: 767px)': '0 20px 24px' }
  },
  intro: {
    display: { default: 'flex', '@media (max-width: 1023px)': 'none' },
    flexDirection: 'column',
    gap: 24,
    maxWidth: 550
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--color-text-secondary)'
  },
  hero: {
    fontSize: { default: 68, '@media (max-width: 1279px)': 56 },
    lineHeight: 1.04,
    letterSpacing: '-0.045em',
    fontWeight: 600,
    margin: 0
  },
  subdued: { color: 'var(--color-text-secondary)' },
  description: { maxWidth: 380, fontSize: 16, lineHeight: 1.65 },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 12,
    marginTop: 12
  },
  feature: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    minWidth: 0
  },
  featureIcon: { width: 22, height: 22, marginBottom: 12 },
  card: {
    width: '100%',
    maxWidth: 440,
    marginInline: 'auto',
    borderRadius: 'var(--radius-page)',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    padding: { default: 32, '@media (max-width: 767px)': 24 }
  },
  titleGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  title: { fontSize: 32, fontWeight: 600, letterSpacing: '-0.035em' },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  control: { minHeight: 44 },
  submit: { width: '100%', minHeight: 48 },
  password: { display: 'flex', flexDirection: 'column', gap: 8 },
  reveal: { alignSelf: 'flex-end', minHeight: 32 },
  demos: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: 'var(--color-border)',
    paddingTop: 20
  },
  demoHeading: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  demoButton: { width: '100%', justifyContent: 'space-between', minHeight: 52, textAlign: 'start' },
  demoText: { display: 'flex', flexDirection: 'column', gap: 3 },
  supporting: { fontSize: 12, fontWeight: 400, color: 'var(--color-text-secondary)' },
  icon: { width: 16, height: 16 },
  footer: {
    padding: '20px 24px',
    textAlign: 'center',
    fontSize: 12,
    color: 'var(--color-text-secondary)'
  }
});
