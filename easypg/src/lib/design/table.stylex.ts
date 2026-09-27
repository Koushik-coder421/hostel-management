import * as stylex from '@stylexjs/stylex';

export const tableLayout = stylex.create({
  // These tables already sit inside an inset region. Reset the inherited Card
  // padding contract so Astryx's negative edge margins cannot clip their rows.
  inset: {
    '--container-padding-inline-start': '0px',
    '--container-padding-inline-end': '0px',
    '--container-padding-block-start': '0px',
    '--container-padding-block-end': '0px',
    minWidth: 0,
    maxWidth: '100%'
  }
});
