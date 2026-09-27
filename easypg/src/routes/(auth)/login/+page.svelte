<script lang="ts">
  import type { PageData } from './$types';
  import { enhance, applyAction, feedback } from '$lib/api/forms';
  import { DEMO_ACCOUNTS } from '$lib/api/demo-identities';
  import { tick, onMount } from 'svelte';
  import { Button, TextInput, Heading, Text, Card, Banner, Badge } from '@astryx-svelte/core';
  import Brand from '$lib/components/app-shell/Brand.svelte';
  import ThemeToggle from '$lib/components/app-shell/ThemeToggle.svelte';
  import BedDouble from '@lucide/svelte/icons/bed-double';
  import Users from '@lucide/svelte/icons/users';
  import Receipt from '@lucide/svelte/icons/receipt';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import { sx } from '$lib/design/attrs';
  import { login } from './page.stylex';

  let { data }: { data: PageData } = $props();
  let form = $derived($feedback);
  // The component forwards native attributes to its input; preserve browser validation.
  const emailAttributes = { required: true, autocomplete: 'email' };
  const passwordAttributes = { required: true, autocomplete: 'current-password' };
  let isInteractive = $state(false);
  onMount(() => {
    isInteractive = true;
  });
  let email = $state('');
  let password = $state('');
  let showPassword = $state(false);
  let isSubmitting = $state(false);
  let formElement: HTMLFormElement | null = $state(null);
  $effect(() => {
    if (form?.email) email = form.email;
  });


  async function fillAndSubmit(demoEmail: string) {
    email = demoEmail;
    password = 'demo-only';
    await tick();
    formElement?.requestSubmit();
  }
</script>

<svelte:head><title>Sign In — EasyPG Native Astryx</title></svelte:head>
<div {...sx(login.page)}>
  <header {...sx(login.header)}>
    <Brand />
    <div {...sx(login.headerActions)}>
      <span {...sx(login.tagline)}
        ><Text type="supporting">Your property. In good hands.</Text></span
      ><ThemeToggle />
    </div>
  </header>
  <main {...sx(login.columns)}>
    <section aria-label="Welcome to EasyPG" {...sx(login.intro)}>
      <p {...sx(login.eyebrow)}>A little more ease. Every day.</p>
      <p {...sx(login.hero)}>Good stays.<br /><span {...sx(login.subdued)}>Great days.</span></p>
      <Text as="p" color="secondary" xstyle={login.description}
        >Bring your spaces, people, and payments together. More clarity for you. A better place for
        everyone.</Text
      >
      <div {...sx(login.features)}>
        <Card variant="blue" padding={4}
          ><div {...sx(login.feature)}>
            <BedDouble {...sx(login.featureIcon)} /><Text type="label">Every space</Text><Text
              type="supporting">Rooms & beds</Text
            >
          </div></Card
        >
        <Card variant="green" padding={4}
          ><div {...sx(login.feature)}>
            <Users {...sx(login.featureIcon)} /><Text type="label">Every resident</Text><Text
              type="supporting">Arrivals & stays</Text
            >
          </div></Card
        >
        <Card variant="yellow" padding={4}
          ><div {...sx(login.feature)}>
            <Receipt {...sx(login.featureIcon)} /><Text type="label">Every payment</Text><Text
              type="supporting">Bills & balances</Text
            >
          </div></Card
        >
      </div>
      <Text type="supporting">One workspace for your day-to-day.</Text>
    </section>
    <Card xstyle={login.card}>
      <div {...sx(login.titleGroup)}>
        <p {...sx(login.eyebrow)}>Your workspace awaits</p>
        <Heading level={1} xstyle={login.title}>Welcome back.</Heading><Text color="secondary"
          >Sign in to take care of what matters.</Text
        >
      </div>
      {#if form?.error}<Banner
          status="error"
          title="Sign in failed"
          description={form.error}
        />{/if}
      <form
        bind:this={formElement}
        method="POST"
        data-operation="signIn"
        use:enhance={() => {
          isSubmitting = true;
          return async ({ result }) => {
            if (result.type === 'redirect') {
              await applyAction(result);
              return;
            }
            await applyAction(result);
            isSubmitting = false;
          };
        }}
        {...sx(login.form)}
      >
        <TextInput
          label="Email address"
          htmlName="email"
          type="email"
          value={email}
          onChange={(value) => (email = value)}
          isRequired
          {...emailAttributes}
          placeholder="name@example.com"
          width="100%"
          size="lg"
          xstyle={login.control}
        />
        <div {...sx(login.password)}>
          <TextInput
            label="Password"
            htmlName="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(value) => (password = value)}
            isRequired
            {...passwordAttributes}
            placeholder="Enter your password"
            width="100%"
            size="lg"
            xstyle={login.control}
          />
          <Button
            label={showPassword ? 'Hide password' : 'Show password'}
            variant="ghost"
            size="sm"
            onclick={() => (showPassword = !showPassword)}
            xstyle={login.reveal}
          />
        </div>
        <Button
          label={isSubmitting ? 'Signing in…' : 'Sign in'}
          type="submit"
          variant="primary"
          size="lg"
          isDisabled={isSubmitting}
          isLoading={isSubmitting}
          xstyle={login.submit}
        />
      </form>
      {#if data.mode === 'demo'}
      <Banner status="info" title="Demo workspace" description="Synthetic sample data only. Changes are temporary and are not saved to a server." />
      <div {...sx(login.demos)}>
        <div {...sx(login.demoHeading)}>
          <Text type="label">Explore a demo workspace</Text><Badge
            label="One-click access"
            variant="neutral"
          />
        </div>
        {#each DEMO_ACCOUNTS as acc}
          <Button
            label={acc.label}
            variant="ghost"
            isDisabled={isSubmitting || !isInteractive}
            onclick={() => fillAndSubmit(acc.email)}
            xstyle={login.demoButton}
          >
            <span {...sx(login.demoText)}
              ><span>{acc.label}</span><span {...sx(login.supporting)}>{acc.desc}</span></span
            >
            {#snippet endContent()}<ArrowRight {...sx(login.icon)} />{/snippet}
          </Button>
        {/each}
      </div>
      {/if}
    </Card>
  </main>
  <footer {...sx(login.footer)}>EasyPG · Hostel management, simplified.</footer>
</div>
