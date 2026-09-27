<script lang="ts">
  import { AppShell as AstryxAppShell } from '@astryx-svelte/core';
  import type { Snippet } from 'svelte';
  import type { NavItem } from '$lib/constants/navigation';
  import Sidebar from './Sidebar.svelte';
  import Header from './Header.svelte';
  import { sx } from '$lib/design/attrs';
  import { shell } from './shell.stylex';

  let {
    navItems = [],
    mobileNavItems = [],
    currentPath,
    user = null,
    role = 'resident',
    title = 'Dashboard',
    hostels = [],
    activeHostelId = '',
    showSelector = true,
    children
  }: {
    navItems?: NavItem[];
    mobileNavItems?: NavItem[];
    currentPath: string;
    user?: { id?: string; name?: string; email?: string } | null;
    role?: string;
    title?: string;
    hostels?: { id: string; name: string; code: string }[];
    activeHostelId?: string;
    showSelector?: boolean;
    children: Snippet;
  } = $props();
  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    organizations: 'Organizations',
    hostels: 'Hostels',
    managers: 'Staff & Managers',
    rooms: 'Rooms & Beds',
    residents: 'Residents',
    'check-ins': 'Check-In',
    'check-outs': 'Check-Out',
    payments: 'Payments',
    reports: 'Reports',
    settings: 'Settings'
  };
  let resolvedTitle = $derived(titles[currentPath.split('/')[1]] || title);
</script>

<AstryxAppShell variant="section" height="fill" mobileNav={{ breakpoint: 'lg' }}>
  {#snippet sideNav()}<Sidebar {navItems} {currentPath} {user} {role} />{/snippet}
  {#snippet topNav()}<Header
      title={resolvedTitle}
      {hostels}
      {activeHostelId}
      showSelector={showSelector && role !== 'platform_admin'}
      {user}
      {role}
    />{/snippet}
  <div {...sx(shell.content)}>{@render children()}</div>
</AstryxAppShell>
