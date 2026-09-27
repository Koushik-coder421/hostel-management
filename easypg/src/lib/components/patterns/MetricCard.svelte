<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Card, ProgressBar, Text } from '@astryx-svelte/core';
  import { styles } from './MetricCard.stylex';
  import { sx } from '$lib/design/attrs';

  let {
    label,
    value,
    description,
    tone = 'neutral',
    progress,
    icon
  }: {
    label: string;
    value: string | number;
    description: string;
    tone?: 'neutral' | 'success' | 'warning' | 'destructive' | 'info';
    progress?: number;
    icon?: Snippet;
  } = $props();
  const toneStyles = {
    neutral: styles.iconNeutral,
    success: styles.iconSuccess,
    warning: styles.iconWarning,
    destructive: styles.iconDestructive,
    info: styles.iconInfo
  };

  const progressVariants = {
    neutral: 'neutral',
    success: 'success',
    warning: 'warning',
    destructive: 'error',
    info: 'accent'
  } as const;
</script>

<Card padding={4} xstyle={styles.root}>
  <div {...sx(styles.header)}>
    <Text type="supporting" weight="medium" display="block">{label}</Text>
    {#if icon}
      <span {...sx([styles.icon, toneStyles[tone]])}>{@render icon()}</span>
    {/if}
  </div>
  <Text as="p" type="display-3" weight="semibold" xstyle={styles.value}>{value}</Text>
  <div {...sx(styles.footer)}>
    {#if progress !== undefined}
      <ProgressBar
        label={`${label} progress`}
        value={progress}
        isLabelHidden
        variant={progressVariants[tone]}
        xstyle={styles.progress}
      />
    {/if}
    <Text as="p" type="supporting" display="block" xstyle={styles.description}>{description}</Text>
  </div>
</Card>
