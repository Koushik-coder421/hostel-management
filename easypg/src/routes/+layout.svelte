<script lang="ts">
  import '../app.css';
  import { navigating } from '$app/state';
  import { onMount } from 'svelte';
  import { config } from '$lib/api/config';
  import { feedback } from '$lib/api/forms';
  import { Theme, Banner } from '@astryx-svelte/core';
  import { neutralTheme } from '@astryx-svelte/theme-neutral';
  import { appearance } from '$lib/design/appearance.svelte';
  import favicon from '$lib/assets/favicon.svg';

  let { children } = $props();
  if (import.meta.env.DEV) {
    $effect(() => {
      void import('virtual:stylex:runtime');
    });
  }
  onMount(() => {
    try {
      const saved = localStorage.getItem('easypg-native-appearance');
      if (saved === 'dark' || saved === 'light') appearance.mode = saved;
    } catch {
      /* Follow the device if storage is unavailable. */
    }
  });
</script>

<svelte:head
  ><link rel="icon" href={favicon} />{#if import.meta.env.DEV}<link
      rel="stylesheet"
      href="/virtual:stylex.css"
    />{/if}</svelte:head
>
<Theme theme={neutralTheme} mode={appearance.mode}>
  <section aria-live="polite" aria-busy={Boolean(navigating.to)} aria-label="Workspace connection status">
  {#if config.mode === 'demo'}
    <Banner status="info" title="Demo mode" description={navigating.to ? 'Loading workspace…' : 'Synthetic sample data. Changes stay in this browser session and are not saved to a server.'} />
  {:else}
    <Banner status="info" title="Connected workspace" description={navigating.to ? 'Loading workspace…' : 'Live mode uses your configured EasyPG API.'} />
  {/if}
  </section>
  {#if $feedback?.error || ($feedback?.message && !$feedback?.success)}
    <section aria-live="assertive" aria-label="Request feedback">
      <Banner status="error" title="Request could not be completed" description={$feedback.error || $feedback.message || ''} />
    </section>
  {/if}
  {@render children()}
</Theme>
