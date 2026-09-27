<script lang="ts">
  import { enhance } from '$lib/api/forms';
  import { SideNav, SideNavSection, SideNavItem, Avatar, Text, Button } from '@astryx-svelte/core';
  import type { NavItem } from '$lib/constants/navigation';
  import { getNavIcon } from './icons';
  import Brand from './Brand.svelte';
  import { sx } from '$lib/design/attrs';
  import { shell } from './shell.stylex';

  let {
    navItems = [],
    currentPath = '',
    user = null,
    role = 'resident'
  }: {
    navItems?: NavItem[];
    currentPath?: string;
    user?: { id?: string; name?: string; email?: string } | null;
    role?: string;
  } = $props();
  const roleLabels: Record<string, string> = {
    platform_admin: 'Platform Admin',
    organization_admin: 'Owner / Org Admin',
    manager: 'Manager',
    resident: 'Resident'
  };
</script>

<SideNav xstyle={shell.navigation} aria-label="Main navigation">
  {#snippet header()}<a href="/dashboard" aria-label="EasyPG dashboard" {...sx(shell.brandHeader)}
      ><Brand /></a
    >{/snippet}
  <SideNavSection title="Workspace">
    {#each navItems as item (item.href)}
      {@const Icon = getNavIcon(item.icon)}
      <SideNavItem
        label={item.label}
        href={item.href}
        isSelected={currentPath === item.href || currentPath.startsWith(item.href + '/')}
        size="lg"
      >
        {#snippet icon()}<Icon {...sx(shell.icon)} />{/snippet}
      </SideNavItem>
    {/each}
  </SideNavSection>
  {#snippet footer()}
    <div {...sx(shell.footer)}>
      <a href="/settings" {...sx(shell.identity)}>
        <Avatar name={user?.name || user?.email || 'EasyPG user'} size={40} tooltip={false} />
        <span {...sx(shell.identityText)}
          ><Text type="label">{user?.name || 'User'}</Text><Text type="supporting"
            >{roleLabels[role] || role}</Text
          ></span
        >
      </a>
      <form method="POST" data-operation="signOut" use:enhance>
        <Button
          label="Log out of workspace"
          variant="ghost"
          size="lg"
          type="submit"
          xstyle={shell.control}
        />
      </form>
    </div>
  {/snippet}
</SideNav>
