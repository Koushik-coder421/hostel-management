<script lang="ts">
  import { enhance, feedback } from '$lib/api/forms';
  import type { PageData } from './$types';
  import {
    Button,
    Card,
    NumberInput,
    Selector,
    Badge,
    TextInput
  } from '@astryx-svelte/core';
  import { sx } from '$lib/design/attrs';
  import { styles } from './page.stylex';
  import { paiseToRupees } from '$lib/formatters/money.js';
  import LogIn from '@lucide/svelte/icons/log-in';
  import AlertCircle from '@lucide/svelte/icons/alert-circle';

  let { data }: { data: PageData } = $props();
  let form = $derived($feedback);

  let selectedRoomId = $state('');
  $effect(() => {
    if (data.preselectedRoomId) selectedRoomId = data.preselectedRoomId;
  });
  let selectedBedId = $state('');
  let selectedRatePlanId = $state('');
  let fullName = $state('');
  let phone = $state('');
  let email = $state('');
  let gender = $state('male');
  let rentRupees = $state<number | null>(null);
  let depositRupees = $state<number | null>(null);
  let billingDay = $state<number | null>(1);
  function todayInAppTimezone() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
  }
  let checkInDate = $state(todayInAppTimezone());
  let isSubmitting = $state(false);

  let filteredBeds = $derived(
    data.availableBeds.filter((bed) => !selectedRoomId || bed.roomId === selectedRoomId)
  );
  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'undisclosed', label: 'Undisclosed' }
  ];
  let roomOptions = $derived(
    data.rooms.map((room) => ({
      value: room.id,
      label: `Room ${room.roomNumber} — ${room.roomTypeName} (${room.standardCapacity} beds)`
    }))
  );
  let bedOptions = $derived(filteredBeds.map((bed) => ({ value: bed.id, label: bed.bedLabel })));
  let ratePlanOptions = $derived(
    data.ratePlans
      .filter((plan) => {
        const selectedRoom = data.rooms.find((room) => room.id === selectedRoomId);
        return !selectedRoom || plan.roomTypeId === selectedRoom.roomTypeId;
      })
      .map((plan) => ({
        value: plan.id,
        label: `${plan.name} — ₹${paiseToRupees(plan.rentPaise)}/mo (Deposit: ₹${paiseToRupees(plan.depositPaise)})`
      }))
  );

  function handleRatePlanChange(ratePlanId: string) {
    selectedRatePlanId = ratePlanId;
    const plan = data.ratePlans.find((item) => item.id === ratePlanId);
    if (plan) {
      rentRupees = paiseToRupees(plan.rentPaise);
      depositRupees = paiseToRupees(plan.depositPaise);
    }
  }

  function handleRoomChange(roomId: string) {
    selectedRoomId = roomId;
    selectedBedId = '';
  }
</script>

<svelte:head><title>Check In Resident — EasyPG</title></svelte:head>

<div {...sx(styles.page)}>
  <div {...sx(styles.heading)}>
    <div>
      <p {...sx(styles.eyebrow)}>Arrivals</p>
      <h1 {...sx(styles.title)}>Check In Resident</h1>
      <p {...sx(styles.description)}>
        Welcome a new resident. Add their details, choose a space, and confirm their stay.
      </p>
    </div>
    {#if data.hostel}
      <Badge variant="neutral" label={`${data.hostel.name} (${data.hostel.code})`} />
    {/if}
  </div>

  {#if form?.message}
    <div {...sx(styles.feedbackError)} role="alert">
      <AlertCircle size={18} />
      <span>{form.message}</span>
    </div>
  {/if}

  <form
    method="POST"
    data-operation="checkIn"
    aria-label="Check-in form"
    {...sx(styles.form)}
    use:enhance={() => {
      isSubmitting = true;
      return async ({ update }) => {
        isSubmitting = false;
        await update();
      };
    }}
  >
    <Card xstyle={styles.card}>
      <div {...sx(styles.cardHeader)}>
        <div {...sx(styles.stepLine)}>
          <span {...sx(styles.step)}>01</span>
          <h2 {...sx(styles.cardTitle)}>Resident Information</h2>
        </div>
        <p {...sx(styles.cardDescription)}>Enter primary contact and identity details.</p>
      </div>
      <div {...sx(styles.fieldGrid)}>
        <TextInput
          label="Full Name"
          htmlName="fullName"
          placeholder="e.g. Rahul Sharma"
          value={fullName}
          onChange={(value) => (fullName = value)}
          isRequired
        />
        <!-- Phone uses a native telephone input because Astryx TextInput deliberately supports text, email, and password only. -->
        <div {...sx(styles.nativeField)}>
          <label for="phone" {...sx(styles.nativeLabel)}
            >Phone Number <span aria-hidden="true">*</span></label
          >
          <input
            id="phone"
            name="phone"
            type="tel"
            inputmode="tel"
            autocomplete="tel"
            placeholder="e.g. 9876543210"
            value={phone}
            oninput={(event) => (phone = (event.currentTarget as HTMLInputElement).value)}
            required
            {...sx(styles.nativeInput)}
          />
        </div>
        <TextInput
          label="Email Address"
          type="email"
          htmlName="email"
          placeholder="e.g. rahul@example.com"
          value={email}
          onChange={(value: string) => (email = value)}
        />
        <Selector
          label="Gender"
          options={genderOptions}
          htmlName="gender"
          value={gender}
          onChange={(value: string) => (gender = value)}
          isRequired
        />
      </div>
    </Card>

    <Card xstyle={styles.card}>
      <div {...sx(styles.cardHeader)}>
        <div {...sx(styles.stepLine)}>
          <span {...sx(styles.step)}>02</span>
          <h2 {...sx(styles.cardTitle)}>Room &amp; Bed Allocation</h2>
        </div>
        <p {...sx(styles.cardDescription)}>Select the target room and available bed.</p>
      </div>
      <div {...sx(styles.fieldGrid)}>
        <Selector
          label="Room"
          options={roomOptions}
          htmlName="roomId"
          value={selectedRoomId}
          onChange={handleRoomChange}
          isRequired
          placeholder="Select a room"
        />
        <Selector
          label="Bed"
          options={bedOptions}
          htmlName="bedId"
          value={selectedBedId}
          onChange={(value: string) => (selectedBedId = value)}
          isRequired
          placeholder="Select an available bed"
          isDisabled={!selectedRoomId}
        />
      </div>
    </Card>

    <Card xstyle={styles.card}>
      <div {...sx(styles.cardHeader)}>
        <div {...sx(styles.stepLine)}>
          <span {...sx(styles.step)}>03</span>
          <h2 {...sx(styles.cardTitle)}>Rate Plan &amp; Terms</h2>
        </div>
        <p {...sx(styles.cardDescription)}>Choose billing rate plan and agreement schedule.</p>
      </div>
      <div {...sx(styles.fieldGrid)}>
        <div {...sx(styles.fullField)}>
          <Selector
            label="Rate Plan"
            options={ratePlanOptions}
            htmlName="ratePlanId"
            value={selectedRatePlanId}
            onChange={handleRatePlanChange}
            isRequired
            placeholder="Select rate plan"
          />
        </div>
        <NumberInput
          label="Agreed Monthly Rent (₹)"
          htmlName="agreedRentRupees"
          value={rentRupees}
          onChange={(value: number | null) => (rentRupees = value)}
          min={0}
          step={1}
          isRequired
        />
        <NumberInput
          label="Security Deposit (₹)"
          htmlName="agreedDepositRupees"
          value={depositRupees}
          onChange={(value: number | null) => (depositRupees = value)}
          min={0}
          step={1}
        />
        <NumberInput
          label="Monthly Billing Day (1–28)"
          htmlName="billingDay"
          value={billingDay}
          onChange={(value: number | null) => (billingDay = value)}
          min={1}
          max={28}
          step={1}
          isRequired
          isIntegerOnly
        />
        <div>
          <label {...sx(styles.dateField)}>
            <span {...sx(styles.dateLabel)}>Check-In Date · Required</span>
            <input type="date" name="checkInDate" bind:value={checkInDate} required {...sx(styles.dateInput)} />
          </label>
        </div>
      </div>
    </Card>

    <div {...sx(styles.actions)}>
      <Button label="Cancel" href="/dashboard" variant="secondary" />
      <Button
        label={isSubmitting ? 'Checking In…' : 'Complete Check-In'}
        type="submit"
        variant="primary"
        isDisabled={isSubmitting}
      >
        {#snippet icon()}<LogIn size={17} />{/snippet}
      </Button>
    </div>
  </form>
</div>
