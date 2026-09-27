<script lang="ts">
  import { IconButton } from '@astryx-svelte/core';
  import Sun from '@lucide/svelte/icons/sun';
  import Moon from '@lucide/svelte/icons/moon';
  import { onMount } from 'svelte';
  import { appearance, setAppearance } from '$lib/design/appearance.svelte';
  import { sx } from '$lib/design/attrs';
  import { shell } from './shell.stylex';

  let deviceDark = $state(false);
  let dark = $derived(appearance.mode === 'dark' || (appearance.mode === 'system' && deviceDark));
  onMount(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    deviceDark = media.matches;
    const update = () => {
      deviceDark = media.matches;
    };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  });
</script>

<IconButton
  label={dark ? 'Use light appearance' : 'Use dark appearance'}
  variant="ghost"
  size="lg"
  xstyle={shell.themeControl}
  onclick={() => setAppearance(dark ? 'light' : 'dark')}
>
  {#snippet icon()}{#if dark}<Sun {...sx(shell.icon)} />{:else}<Moon
        {...sx(shell.icon)}
      />{/if}{/snippet}
</IconButton>
