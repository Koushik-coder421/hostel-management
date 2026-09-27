<script lang="ts">
  import { enhance } from '$lib/api/forms';
  import {
    Badge,
    Button,
    Card,
    Dialog,
    DialogHeader,
    Heading,
    Text,
    TextInput
  } from '@astryx-svelte/core';
  import { sx } from '$lib/design/attrs';
  import type { PageData } from './$types';
  import type { RoomCardData } from '$lib/api/contracts';
  import { styles } from './page.stylex';

  let { data }: { data: PageData } = $props();
  let searchQuery = $state('');
  let selectedBuildingId = $state('all');
  let selectedFloorId = $state('all');
  let selectedType = $state('all');
  let selectedStatus = $state('all');
  let selectedRoomId = $state<string | null>(null);
  const selectedRoom = $derived<RoomCardData | null>(
    selectedRoomId ? data.floors.flatMap((floor) => floor.rooms).find((room) => room.id === selectedRoomId) ?? null : null
  );
  let isRoomDialogOpen = $state(false);

  const filteredFloors = $derived.by(() => {
    const query = searchQuery.toLowerCase().trim();
    return data.floors
      .map((floor) => {
        if (
          (selectedBuildingId !== 'all' && floor.buildingId !== selectedBuildingId) ||
          (selectedFloorId !== 'all' && floor.id !== selectedFloorId)
        )
          return null;
        const rooms = floor.rooms.filter((room) => {
          const queryMatch =
            !query ||
            room.roomNumber.toLowerCase().includes(query) ||
            room.sharingLabel.toLowerCase().includes(query) ||
            room.beds.some((bed) => bed.residentName?.toLowerCase().includes(query));
          const typeMatch =
            selectedType === 'all' ||
            (selectedType === 'store' && room.isStore) ||
            (selectedType === 'ac' && !room.isStore && room.acType === 'ac') ||
            (selectedType === 'non_ac' && !room.isStore && room.acType === 'non_ac');
          const statusMatch =
            selectedStatus === 'all' ||
            (selectedStatus === 'available' && !room.isStore && room.availableCount > 0) ||
            (selectedStatus === 'full' && !room.isStore && room.availableCount === 0);
          return queryMatch && typeMatch && statusMatch;
        });
        return rooms.length ? { ...floor, rooms } : null;
      })
      .filter((floor): floor is NonNullable<typeof floor> => floor !== null);
  });

  function openRoomDetails(room: RoomCardData) {
    selectedRoomId = room.id;
    isRoomDialogOpen = true;
  }

  function resetFilters() {
    searchQuery = '';
    selectedBuildingId = 'all';
    selectedFloorId = 'all';
    selectedType = 'all';
    selectedStatus = 'all';
  }

  function selectBuilding(buildingId: string) {
    selectedBuildingId = buildingId;
    selectedFloorId = 'all';
  }


</script>

<svelte:head><title>Rooms & Beds — {data.hostel?.name ?? 'EasyPG'}</title></svelte:head>

<div {...sx(styles.page)}>
  <header {...sx(styles.header)}>
    <div>
      <p {...sx(styles.eyebrow)}>Property inventory</p>
      <div {...sx(styles.titleRow)}>
        <Heading level={1}>Rooms & Beds</Heading>
        {#if data.hostel}<Badge label={data.hostel.code} xstyle={styles.codeBadge} />{/if}
      </div>
      <Text as="p" type="supporting" xstyle={styles.description}
        >A clear view of every floor, room, and available bed.</Text
      >
    </div>
    <div {...sx(styles.statGrid)}>
      <Card padding={3} xstyle={styles.stat}
        ><Text as="span" xstyle={styles.statLabel}>Rooms</Text><Text
          as="span"
          xstyle={styles.statValue}>{data.stats.totalRooms}</Text
        ></Card
      >
      <Card padding={3} xstyle={styles.stat}
        ><Text as="span" xstyle={styles.statLabel}>Beds</Text><Text
          as="span"
          xstyle={styles.statValue}>{data.stats.totalBeds}</Text
        ></Card
      >
      <Card padding={3} xstyle={styles.stat}
        ><Text as="span" xstyle={styles.statLabel}>Occupied</Text><Text
          as="span"
          xstyle={styles.statValue}>{data.stats.occupiedBeds}</Text
        ></Card
      >
      <Card padding={3} xstyle={styles.stat}
        ><Text as="span" xstyle={styles.statLabel}>Available</Text><Text
          as="span"
          xstyle={[styles.statValue, styles.successText]}>{data.stats.availableBeds}</Text
        ></Card
      >
    </div>
  </header>

  <Card padding={4} xstyle={styles.filterCard}>
    <div {...sx(styles.filterTop)}>
      <TextInput
        label="Search room, sharing, resident"
        isLabelHidden
        value={searchQuery}
        onChange={(value) => (searchQuery = value)}
        placeholder="Search room, sharing, resident…"
        hasClear
        xstyle={styles.search}
      />
      {#if data.buildings.length > 1}
        <div {...sx(styles.buildingTabs)} aria-label="Building filter">
          <Button
            label="All buildings"
            size="sm"
            variant={selectedBuildingId === 'all' ? 'primary' : 'secondary'}
            xstyle={styles.compactButton}
            aria-pressed={selectedBuildingId === 'all'}
            onclick={() => selectBuilding('all')}
          />
          {#each data.buildings as building (building.id)}
            <Button
              label={building.name}
              size="sm"
              variant={selectedBuildingId === building.id ? 'primary' : 'secondary'}
              xstyle={styles.compactButton}
              aria-pressed={selectedBuildingId === building.id}
              onclick={() => selectBuilding(building.id)}
            />
          {/each}
        </div>
      {/if}
    </div>
    <div {...sx(styles.filterRows)}>
      <div {...sx(styles.filterGroup)} role="group" aria-label="Floor">
        <Text as="span" xstyle={styles.filterLabel}>Floor</Text>
        <Button
          label="All floors"
          size="sm"
          variant="secondary"
          xstyle={[styles.compactButton, selectedFloorId === 'all' && styles.selectedFilter]}
          aria-pressed={selectedFloorId === 'all'}
          onclick={() => (selectedFloorId = 'all')}
        />
        {#each data.floors as floor (floor.id)}
          <Button
            label={floor.label}
            size="sm"
            variant="secondary"
            xstyle={[styles.compactButton, selectedFloorId === floor.id && styles.selectedFilter]}
            aria-pressed={selectedFloorId === floor.id}
            onclick={() => (selectedFloorId = floor.id)}
          />
        {/each}
      </div>
      <div {...sx(styles.filterGroup)} role="group" aria-label="Room type and occupancy">
        <Text as="span" xstyle={styles.filterLabel}>Room</Text>
        <Button
          label="All types"
          size="sm"
          variant="secondary"
          xstyle={[styles.compactButton, selectedType === 'all' && styles.selectedFilter]}
          aria-pressed={selectedType === 'all'}
          onclick={() => (selectedType = 'all')}
        />
        <Button
          label="AC only"
          size="sm"
          variant="secondary"
          xstyle={[styles.compactButton, selectedType === 'ac' && styles.selectedFilter]}
          aria-pressed={selectedType === 'ac'}
          onclick={() => (selectedType = 'ac')}
        />
        <Button
          label="Non-AC"
          size="sm"
          variant="secondary"
          xstyle={[styles.compactButton, selectedType === 'non_ac' && styles.selectedFilter]}
          aria-pressed={selectedType === 'non_ac'}
          onclick={() => (selectedType = 'non_ac')}
        />
        <Button
          label="Stores"
          size="sm"
          variant="secondary"
          xstyle={[styles.compactButton, selectedType === 'store' && styles.selectedFilter]}
          aria-pressed={selectedType === 'store'}
          onclick={() => (selectedType = 'store')}
        />
        <Button
          label="Has vacancy"
          size="sm"
          variant="secondary"
          xstyle={[styles.compactButton, selectedStatus === 'available' && styles.selectedFilter]}
          aria-pressed={selectedStatus === 'available'}
          onclick={() => (selectedStatus = selectedStatus === 'available' ? 'all' : 'available')}
        />
        <Button
          label="Fully occupied"
          size="sm"
          variant="secondary"
          xstyle={[styles.compactButton, selectedStatus === 'full' && styles.selectedFilter]}
          aria-pressed={selectedStatus === 'full'}
          onclick={() => (selectedStatus = selectedStatus === 'full' ? 'all' : 'full')}
        />
      </div>
    </div>
  </Card>

  <div {...sx(styles.legend)} aria-label="Room availability legend">
    <span {...sx(styles.legendItem)}
      ><i {...sx([styles.legendMark, styles.availableMark])}></i>Available · 2+ beds</span
    >
    <span {...sx(styles.legendItem)}
      ><i {...sx([styles.legendMark, styles.warningMark])}></i>Almost full · 1 bed</span
    >
    <span {...sx(styles.legendItem)}
      ><i {...sx([styles.legendMark, styles.dangerMark])}></i>Full · 0 beds</span
    >
    <span {...sx(styles.legendItem)}
      ><i {...sx([styles.legendMark, styles.mutedMark])}></i>Storage</span
    >
  </div>

  {#if filteredFloors.length === 0}
    <Card padding={6} xstyle={styles.empty}
      ><Heading level={2}>No rooms found</Heading><Text as="p" type="supporting"
        >No rooms match your current filters.</Text
      ><Button label="Reset filters" variant="secondary" onclick={resetFilters} /></Card
    >
  {:else}
    <div {...sx(styles.floorList)}>
      {#each filteredFloors as floor (floor.id)}
        <section {...sx(styles.floor)}>
          <header {...sx(styles.floorHeader)}>
            <div {...sx(styles.floorName)}>
              <Heading level={2}>{floor.label}</Heading>{#if floor.buildingName}<Text
                  as="span"
                  type="supporting">{floor.buildingName}</Text
                >{/if}
            </div>
            <Text as="span" xstyle={styles.floorMeta}
              >{floor.rooms.length} rooms · {floor.rooms.reduce(
                (sum, room) => sum + room.occupiedCount,
                0
              )}/{floor.rooms.reduce((sum, room) => sum + room.totalBeds, 0)} occupied</Text
            >
          </header>
          <div {...sx(styles.roomGrid)}>
            {#each floor.rooms as room (room.id)}
              <button
                type="button"
                {...sx([
                  styles.roomCard,
                  room.isStore
                    ? styles.roomCardStore
                    : room.statusColor === 'green'
                      ? styles.roomCardAvailable
                      : room.statusColor === 'amber'
                        ? styles.roomCardWarning
                        : styles.roomCardFull
                ])}
                onclick={() => openRoomDetails(room)}
                aria-label={`View room ${room.roomNumber} details`}
              >
                <span {...sx(styles.roomTop)}
                  ><span
                    ><strong {...sx(styles.roomNumber)}>{room.roomNumber}</strong><span
                      {...sx(styles.roomSharing)}>{room.sharingLabel}</span
                    ></span
                  ><Badge
                    label={room.isStore ? 'Store' : room.acType === 'ac' ? 'AC' : 'Non-AC'}
                    variant={room.isStore ? 'neutral' : room.acType === 'ac' ? 'info' : 'neutral'}
                  /></span
                >
                {#if room.isStore}
                  <Text as="span" type="supporting" xstyle={styles.storeText}
                    >Non-habitable storage</Text
                  >
                {:else}
                  <span {...sx(styles.roomBody)}>
                    <span {...sx(styles.occupancyLine)}
                      ><span>Occupancy</span><strong {...sx(styles.occupancyValue)}
                        >{room.occupiedCount}/{room.totalBeds}</strong
                      ></span
                    >
                    <span
                      {...sx(styles.bedStrip)}
                      aria-label={`${room.occupiedCount} of ${room.totalBeds} beds occupied`}
                    >
                      {#each room.beds as bed (bed.id)}<i
                          {...sx([
                            styles.bedMark,
                            bed.status === 'occupied'
                              ? styles.bedOccupied
                              : bed.status === 'available'
                                ? styles.bedAvailable
                                : styles.bedBlocked
                          ])}
                          title={`${bed.bedLabel}: ${bed.status}`}
                        ></i>{/each}
                    </span>
                    <span {...sx(styles.roomFooter)}
                      ><strong
                        {...sx(room.availableCount > 0 ? styles.successText : styles.floorMeta)}
                        >{room.status !== 'active'
                          ? room.status === 'maintenance' ? 'Maintenance' : 'Inactive'
                          : room.availableCount > 0
                          ? `${room.availableCount} ${room.availableCount === 1 ? 'bed' : 'beds'} free`
                          : 'Full'}</strong
                      >{#if room.blockedCount > 0}<span>{room.blockedCount} blocked</span
                        >{/if}</span
                    >
                  </span>
                {/if}
              </button>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  {/if}
</div>

<Dialog
  isOpen={isRoomDialogOpen}
  onOpenChange={(open) => (isRoomDialogOpen = open)}
  purpose="info"
  width="640px"
>
  {#if selectedRoom}
    <DialogHeader
      title={`Room ${selectedRoom.roomNumber}`}
      subtitle={`${selectedRoom.floorLabel} · ${selectedRoom.buildingName} · ${selectedRoom.sharingLabel}`}
      onOpenChange={(open) => (isRoomDialogOpen = open)}
    />
    <div {...sx(styles.dialogBody)}>
      <div {...sx(styles.dialogStats)}>
        <span {...sx(styles.dialogStat)}
          ><Text as="span" type="supporting">Capacity</Text><Text
            as="span"
            weight="bold"
            xstyle={styles.statValue}>{selectedRoom.totalBeds}</Text
          ></span
        >
        <span {...sx(styles.dialogStat)}
          ><Text as="span" type="supporting">Occupied</Text><Text
            as="span"
            weight="bold"
            xstyle={styles.statValue}>{selectedRoom.occupiedCount}</Text
          ></span
        >
        <span {...sx([styles.dialogStat, styles.dialogStatLast])}
          ><Text as="span" type="supporting">Available</Text><Text
            as="span"
            weight="bold"
            xstyle={[styles.statValue, styles.successText]}>{selectedRoom.availableCount}</Text
          ></span
        >
      </div>
      <div {...sx(styles.detailList)}>
        <Heading level={3}>Individual beds ({selectedRoom.beds.length})</Heading>
        {#if selectedRoom.beds.length === 0}
          <Text as="p" type="supporting">No bed records found for this room.</Text>
        {:else}
          {#each selectedRoom.beds as bed (bed.id)}
            <div {...sx(styles.bedRow)}>
              <div {...sx(styles.bedInfo)}>
                <div {...sx(styles.bedHeading)}>
                  <Text as="span" weight="bold">{bed.bedLabel}</Text><Badge
                    label={bed.status}
                    variant={bed.status === 'available'
                      ? 'success'
                      : bed.status === 'occupied'
                        ? 'neutral'
                        : 'warning'}
                  />
                </div>
                {#if bed.residentName}<a
                    href={`/residents/${bed.residentId}`}
                    {...sx(styles.residentLink)}>Resident: {bed.residentName}</a
                  >{:else if bed.status === 'available' && selectedRoom.status === 'active'}<Text
                    as="span"
                    type="supporting"
                    xstyle={styles.successText}>Ready for check-in</Text
                  >{:else if bed.status === 'blocked'}<Text as="span" type="supporting"
                    >Commercial single occupancy block</Text
                  >{:else if bed.status === 'inactive'}<Text as="span" type="supporting"
                    >Inactive bed</Text
                  >{/if}
              </div>
              {#if bed.status === 'available'}
                <form
                  method="POST"
                  data-operation="setBedStatus"
                  use:enhance={() => async ({ update }) => {
                    await update();
                  }}
                >
                  <input type="hidden" name="bedId" value={bed.id} /><input
                    type="hidden"
                    name="targetStatus"
                    value="maintenance"
                  /><Button label="Set maintenance" type="submit" size="sm" variant="secondary" />
                </form>
              {:else if bed.status === 'maintenance'}
                <form
                  method="POST"
                  data-operation="setBedStatus"
                  use:enhance={() => async ({ update }) => {
                    await update();
                  }}
                >
                  <input type="hidden" name="bedId" value={bed.id} /><input
                    type="hidden"
                    name="targetStatus"
                    value="in_service"
                  /><Button label="Set in service" type="submit" size="sm" variant="secondary" />
                </form>
              {:else if bed.status === 'occupied'}
                <Button
                  label="View resident"
                  href={`/residents/${bed.residentId}`}
                  size="sm"
                  variant="secondary"
                />
              {/if}
            </div>
          {/each}
        {/if}
      </div>
      <footer {...sx(styles.dialogFooter)}>
        {#if selectedRoom.status === 'active' && selectedRoom.availableCount > 0}<Button
            label="Check in to room"
            href={`/check-ins?roomId=${selectedRoom.id}`}
            variant="primary"
          />{:else}<span></span>{/if}<Button
          label="Close"
          variant="secondary"
          onclick={() => (isRoomDialogOpen = false)}
        />
      </footer>
    </div>
  {/if}
</Dialog>
