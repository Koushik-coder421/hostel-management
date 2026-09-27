<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$lib/api/forms';
  import { Badge, Button, Card } from '@astryx-svelte/core';
  import { sx } from '$lib/design/attrs';
  import { styles } from './page.stylex';
  import Home from '@lucide/svelte/icons/home';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Check from '@lucide/svelte/icons/check';
  import BedDouble from '@lucide/svelte/icons/bed-double';
  import Users from '@lucide/svelte/icons/users';
  import Search from '@lucide/svelte/icons/search';
  import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';

  let { data }: { data: PageData } = $props();
  let searchQuery = $state('');
  let filteredHostels = $derived(
    data.hostels.filter((hostel) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      return (
        hostel.name.toLowerCase().includes(query) ||
        hostel.code.toLowerCase().includes(query) ||
        hostel.city.toLowerCase().includes(query) ||
        (hostel.addressLine1?.toLowerCase().includes(query) ?? false)
      );
    })
  );
</script>

<svelte:head><title>Hostels — EasyPG</title></svelte:head>

<div {...sx(styles.page)}>
  <div {...sx(styles.heading)}>
    <div>
      <p {...sx(styles.eyebrow)}>Your portfolio</p>
      <h1 {...sx(styles.title)}>Hostels</h1>
      <p {...sx(styles.description)}>
        Manage accessible hostel buildings, bed inventory, and active branches.
      </p>
    </div>
    <!-- Search is a native control because Astryx TextInput intentionally supports text, email, and password only. -->
    <div {...sx(styles.searchWrap)}>
      <Search size={17} {...sx(styles.searchIcon)} aria-hidden="true" />
      <input
        type="search"
        aria-label="Search hostels, city, code"
        placeholder="Search hostels, city, code…"
        value={searchQuery}
        oninput={(event) => (searchQuery = (event.currentTarget as HTMLInputElement).value)}
        {...sx(styles.searchInput)}
      />
    </div>
  </div>

  {#if filteredHostels.length === 0}
    <Card xstyle={styles.emptyCard}>
      <Home size={40} {...sx(styles.emptyIcon)} />
      <h2 {...sx(styles.emptyTitle)}>No hostels found</h2>
      <p {...sx(styles.emptyDescription)}>
        {searchQuery
          ? 'No hostels matched your search criteria.'
          : 'No hostels are assigned to your profile.'}
      </p>
      {#if searchQuery}<Button
          label="Clear Search"
          variant="secondary"
          onclick={() => (searchQuery = '')}
        />{/if}
    </Card>
  {:else}
    <div {...sx(styles.grid)}>
      {#each filteredHostels as hostel (hostel.id)}
        <Card xstyle={hostel.isActive ? [styles.hostelCard, styles.activeCard] : styles.hostelCard}>
          <div {...sx(styles.cardHeader)}>
            <div {...sx(styles.headerRow)}>
              <div {...sx(styles.hostelIdentity)}>
                <div {...sx(styles.badgeRow)}>
                  <Badge variant="neutral" label={hostel.code} />
                  {#if hostel.isActive}<Badge variant="success" label="Active" />{/if}
                  <Badge
                    variant={hostel.status === 'active' ? 'success' : 'neutral'}
                    label={hostel.status === 'active' ? 'Operational' : hostel.status}
                  />
                </div>
                <h2 {...sx(styles.hostelName)}>{hostel.name}</h2>
                <div {...sx(styles.location)}>
                  <MapPin size={14} /><span
                    >{hostel.city}{hostel.addressLine1 ? ` · ${hostel.addressLine1}` : ''}</span
                  >
                </div>
              </div>
            </div>
          </div>

          <div {...sx(styles.cardBody)}>
            <div {...sx(styles.occupancy)}>
              <div {...sx(styles.statLine)}>
                <span>Occupancy</span><strong>{hostel.occupancyRate}%</strong>
              </div>
              <div {...sx(styles.progressTrack)}>
                <div
                  {...sx(
                    styles.progressFill,
                    styles.progressWidth(Math.min(100, Math.max(0, hostel.occupancyRate)))
                  )}
                ></div>
              </div>
              <div {...sx(styles.statLine)}>
                <span>{hostel.occupiedBeds} occupied</span><span
                  >{hostel.sellableBeds} sellable beds</span
                >
              </div>
            </div>
            <div {...sx(styles.statsGrid)}>
              <div>
                <span {...sx(styles.statLabel)}>Available</span><strong {...sx(styles.successValue)}
                  >{hostel.availableBeds}</strong
                >
              </div>
              <div>
                <span {...sx(styles.statLabel)}>Residents</span><strong
                  >{hostel.residentCount}</strong
                >
              </div>
              <div>
                <span {...sx(styles.statLabel)}>Physical</span><strong>{hostel.physicalBeds}</strong
                >
              </div>
            </div>
          </div>

          <div {...sx(styles.cardFooter)}>
            {#if hostel.isActive}
              <div {...sx(styles.currentProperty)}>
                <CheckCircle2 size={16} /><span>Currently Active Property</span>
              </div>
            {:else}
              <form method="POST" data-operation="switchHostel" use:enhance {...sx(styles.fullWidth)}>
                <input type="hidden" name="hostelId" value={hostel.id} />
                <Button
                  label="Make Active"
                  type="submit"
                  variant="primary"
                  xstyle={styles.fullButton}>{#snippet icon()}<Check size={16} />{/snippet}</Button
                >
              </form>
            {/if}
            <div {...sx(styles.linkGrid)}>
              <Button
                label="View Rooms"
                href="/rooms"
                variant="secondary"
                size="sm"
                xstyle={styles.fullButton}>{#snippet icon()}<BedDouble size={15} />{/snippet}</Button
              >
              <Button
                label="Residents"
                href="/residents"
                variant="secondary"
                size="sm"
                xstyle={styles.fullButton}>{#snippet icon()}<Users size={15} />{/snippet}</Button
              >
            </div>
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</div>
