<script lang="ts">
  import AppShell from '$lib/components/app-shell/AppShell.svelte';
  import { getNavItems, getMobileNavItems } from '$lib/constants/navigation.js';
  import { page } from '$app/stores';
  import { enhance } from '$lib/api/forms';

  let { data, children } = $props();

  let navItems = $derived(data.scope ? getNavItems(data.scope.role, (data.scope as any).responsibility) : []);
  let mobileNavItems = $derived(data.scope ? getMobileNavItems(data.scope.role, (data.scope as any).responsibility) : []);
</script>

<AppShell
  {navItems}
  {mobileNavItems}
  currentPath={$page.url.pathname}
  user={data.user}
  role={data.scope?.role ?? 'resident'}
  activeHostelId={data.scope?.activeHostelId ?? ''}
  hostels={data.hostels ?? []}
  title="Dashboard"
  enhanceAction={enhance}
>
  {@render children()}
</AppShell>
