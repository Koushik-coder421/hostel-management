<script lang="ts">
  import { enhance } from '$lib/api/forms';
  import { TopNav, Selector, DropdownMenu, Avatar } from '@astryx-svelte/core';
  import { tick } from 'svelte';
  import { goto } from '$app/navigation';
  import ThemeToggle from './ThemeToggle.svelte';
  import { sx } from '$lib/design/attrs';
  import { shell } from './shell.stylex';

  interface HostelOption {
    id: string;
    name: string;
    code: string;
  }
  let {
    title = 'Dashboard',
    hostels = [],
    activeHostelId = '',
    showSelector = true,
    user = null,
    role = 'resident'
  }: {
    title?: string;
    hostels?: HostelOption[];
    activeHostelId?: string;
    showSelector?: boolean;
    user?: { id?: string; name?: string; email?: string } | null;
    role?: string;
  } = $props();
  let selectedHostelId = $state('');
  let formEl: HTMLFormElement | null = $state(null);
  let logoutForm: HTMLFormElement | null = $state(null);
  $effect(() => {
    selectedHostelId = activeHostelId || hostels[0]?.id || '';
  });
  let options = $derived(hostels.map((h) => ({ value: h.id, label: h.name, description: h.code })));
  async function changeHostel(value: string) {
    selectedHostelId = value;
    await tick();
    formEl?.requestSubmit();
  }

  function submitLogout() {
    logoutForm?.requestSubmit();
  }
</script>

<form bind:this={logoutForm} method="POST" data-operation="signOut" use:enhance {...sx(shell.hidden)}></form>
<TopNav label="Workspace controls" xstyle={shell.header}>
  {#snippet startContent()}
    <div {...sx(shell.heading)}>
      <span {...sx(shell.breadcrumb)}>Workspace /</span><span {...sx(shell.title)}>{title}</span>
    </div>
  {/snippet}
  {#snippet endContent()}
    <div {...sx(shell.headerActions)}>
      {#if showSelector && hostels.length > 0}
        <form
          method="POST"
          data-operation="switchHostel" use:enhance
          bind:this={formEl}
          {...sx(shell.hidden)}
        >
          <input type="hidden" name="hostelId" value={selectedHostelId} />
        </form>
        <div {...sx(shell.property)}>
          <Selector
            label="Switch property"
            isLabelHidden
            {options}
            value={selectedHostelId}
            onChange={changeHostel}
            size="lg"
            width="100%"
          />
        </div>
      {/if}
      <ThemeToggle />
      <DropdownMenu
        button={{
          label: 'User account menu',
          isIconOnly: true,
          variant: 'ghost',
          size: 'lg',
          icon: accountIcon,
          xstyle: shell.themeControl
        }}
        hasChevron={false}
        alignment="end"
        menuWidth={240}
        items={[
          {
            type: 'section',
            title: user?.name || role,
            items: [
              {
                label: 'Settings',
                onClick: () => {
                  void goto('/settings');
                }
              },
              {
                label: 'Log out',
                variant: 'destructive',
                onClick: submitLogout
              }
            ]
          }
        ]}
      />
    </div>
  {/snippet}
</TopNav>
{#snippet accountIcon()}<Avatar
    name={user?.name || user?.email || 'User'}
    size={32}
    tooltip={false}
  />{/snippet}
