<script lang="ts">
  import Building2 from '@lucide/svelte/icons/building-2';
  import { sx } from '$lib/design/attrs';
  import { shell } from './shell.stylex';
</script>

<span {...sx(shell.brand)}>
  <span {...sx(shell.brandMark)}><Building2 {...sx(shell.brandIcon)} /></span>
  <span>EasyPG.</span>
</span>
