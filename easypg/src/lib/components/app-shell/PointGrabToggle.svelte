<script lang="ts">
  import { IconButton } from '@astryx-svelte/core';
  import Crosshair from '@lucide/svelte/icons/crosshair';
  import { getPointGrabApi } from '@point-grab/svelte';
  import { sx } from '$lib/design/attrs';
  import { shell } from './shell.stylex';

  let active = $state(false);

  function toggleInspector() {
    const api = getPointGrabApi();
    if (api) {
      api.toggle();
      active = api.isActive();
    }
  }
</script>

<IconButton
  label={active ? 'Deactivate Point Grab Inspector' : 'Activate Point Grab Inspector'}
  variant={active ? 'primary' : 'ghost'}
  size="lg"
  xstyle={shell.themeControl}
  onclick={toggleInspector}
>
  {#snippet icon()}
    <Crosshair {...sx(shell.icon)} style={active ? 'color: var(--color-primary-500, #3b82f6);' : ''} />
  {/snippet}
</IconButton>
