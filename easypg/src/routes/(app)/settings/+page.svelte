<script lang="ts">
  import { enhance } from '$lib/api/forms';
  import type { PageData } from './$types';
  import { Avatar, Badge, Button, Card } from '@astryx-svelte/core';
  import { sx } from '$lib/design/attrs';
  import { styles } from './page.stylex';
  import Shield from '@lucide/svelte/icons/shield';
  import User from '@lucide/svelte/icons/user';
  import Globe from '@lucide/svelte/icons/globe';
  import LogOut from '@lucide/svelte/icons/log-out';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Settings — EasyPG</title></svelte:head>

<div {...sx(styles.page)}>
  <div>
    <p {...sx(styles.eyebrow)}>Your workspace</p>
    <h1 {...sx(styles.title)}>Settings</h1>
    <p {...sx(styles.description)}>Your profile, property access, and workspace preferences.</p>
  </div>

  <Card xstyle={styles.card}>
    <div {...sx(styles.cardHeader)}>
      <div {...sx(styles.cardTitleLine)}>
        <User size={18} />
        <h2 {...sx(styles.cardTitle)}>Current Session Profile</h2>
      </div>
      <p {...sx(styles.cardDescription)}>Current workspace identity and assigned role.</p>
    </div>
    <div {...sx(styles.profile)}>
      <Avatar name={data.user?.name ?? 'User'} alt={data.user?.name ?? 'User'} size="lg" />
      <div {...sx(styles.profileCopy)}>
        <strong {...sx(styles.profileName)}>{data.user?.name}</strong>
        <span {...sx(styles.profileEmail)}>{data.user?.email}</span>
        <Badge variant="neutral" label={data.scope?.role ?? 'resident'} />
      </div>
    </div>
  </Card>

  <Card xstyle={styles.card}>
    <div {...sx(styles.cardHeader)}>
      <div {...sx(styles.cardTitleLine)}>
        <Shield size={18} />
        <h2 {...sx(styles.cardTitle)}>Access Boundaries &amp; Scopes</h2>
      </div>
      <p {...sx(styles.cardDescription)}>Permissions granted by your active role bindings.</p>
    </div>
    <dl {...sx(styles.details)}>
      <div {...sx(styles.detailRow)}>
        <dt>Active Role</dt>
        <dd {...sx(styles.detailValue)}>{data.scope?.role}</dd>
      </div>
      <div {...sx(styles.detailRow)}>
        <dt>Organization Scope</dt>
        <dd {...sx(styles.detailValue)}>{data.scope?.organizationId ?? 'Platform Root (Unrestricted)'}</dd>
      </div>
      <div {...sx(styles.detailRow)}>
        <dt>Active Property ID</dt>
        <dd {...sx(styles.detailValue)}>{data.scope?.activeHostelId ?? 'All Properties'}</dd>
      </div>
      <div {...sx(styles.detailRow)}>
        <dt>Assigned Property Count</dt>
        <dd {...sx(styles.detailValue)}>{data.scope?.allowedHostelIds?.length ?? 0} Properties</dd>
      </div>
    </dl>
  </Card>

  <Card xstyle={styles.card}>
    <div {...sx(styles.cardHeader)}>
      <div {...sx(styles.cardTitleLine)}>
        <Globe size={18} />
        <h2 {...sx(styles.cardTitle)}>Localization &amp; System Standards</h2>
      </div>
      <p {...sx(styles.cardDescription)}>
        Standard financial currency, timezones, and number formats.
      </p>
    </div>
    <dl {...sx(styles.details)}>
      <div {...sx(styles.detailRow)}>
        <dt>Primary Currency</dt>
        <dd {...sx(styles.detailValue)}>{data.systemInfo.currency}</dd>
      </div>
      <div {...sx(styles.detailRow)}>
        <dt>Application Timezone</dt>
        <dd {...sx(styles.detailValue)}>{data.systemInfo.timezone}</dd>
      </div>
      <div {...sx(styles.detailRow)}>
        <dt>Formatting Locale</dt>
        <dd {...sx(styles.detailValue)}>{data.systemInfo.locale} (Indian Grouping: ₹1,00,000.00)</dd>
      </div>
      <div {...sx(styles.detailRow)}>
        <dt>Frontend version</dt>
        <dd {...sx(styles.detailValue)}>{data.systemInfo.version}</dd>
      </div>
    </dl>
    <div {...sx(styles.cardFooter)}>
      <span {...sx(styles.footerNote)}>EasyPG · SvelteKit frontend</span>
      <form method="POST" data-operation="signOut" use:enhance>
        <Button label="Sign Out" variant="destructive" size="sm" type="submit"
          >{#snippet icon()}<LogOut size={15} />{/snippet}</Button
        >
      </form>
    </div>
  </Card>
</div>
