<script lang="ts">
  import { onMount } from 'svelte';
  import {
    createHead,
    createPartner,
    createManager,
    createSupervisor,
    createHostel,
    fetchRoleDashboard,
    fetchHeads,
    fetchPartners,
    fetchManagers,
    fetchSupervisors,
    fetchHostels,
    fetchAssignments,
    assignHeadPartner,
    assignPartnerManager,
    assignPartnerHostel,
    assignManagerHostel,
    assignSupervisorHostel,
    type DashboardResponse
  } from '$lib/services/hierarchyService';

  let dashboardData = $state<DashboardResponse | null>(null);
  let heads = $state<any[]>([]);
  let partners = $state<any[]>([]);
  let managers = $state<any[]>([]);
  let supervisors = $state<any[]>([]);
  let hostels = $state<any[]>([]);
  let assignments = $state<{
    head_partner: any[];
    partner_manager: any[];
    partner_hostel: any[];
    manager_hostel: any[];
    hostel_supervisor: any[];
  }>({
    head_partner: [],
    partner_manager: [],
    partner_hostel: [],
    manager_hostel: [],
    hostel_supervisor: []
  });

  let loading = $state(true);
  let errorMsg = $state('');
  let successMsg = $state('');

  let userRole = $derived(
    dashboardData?.role ||
    (dashboardData as any)?.data?.role ||
    'SUPERADMIN'
  );

  // Active modal state
  let activeModal = $state<'head' | 'partner' | 'manager' | 'supervisor' | 'hostel' | 'assignment' | null>(null);

  // Form states - Account / Hostel Creation
  let name = $state('');
  let email = $state('');
  let password = $state('');
  let phone = $state('');
  let address = $state('');
  let contactNumber = $state('');
  let hostelCode = $state('');

  // Assignment selection states
  let assignType = $state<'head_partner' | 'partner_manager' | 'partner_hostel' | 'manager_hostel' | 'hostel_supervisor'>('head_partner');
  let selectedHeadId = $state<number | undefined>(undefined);
  let selectedPartnerId = $state<number | undefined>(undefined);
  let selectedManagerId = $state<number | undefined>(undefined);
  let selectedSupervisorId = $state<number | undefined>(undefined);
  let selectedHostelId = $state<number | undefined>(undefined);
  let assignmentRole = $state<'TENANT_ADMIN' | 'MAINTENANCE'>('TENANT_ADMIN');

  let isSubmitting = $state(false);

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    loading = true;
    errorMsg = '';
    try {
      const res = await fetchRoleDashboard();
      dashboardData = res;

      const results = await Promise.allSettled([
        fetchHeads(),
        fetchPartners(),
        fetchManagers(),
        fetchSupervisors(),
        fetchHostels(),
        fetchAssignments()
      ]);

      if (results[0].status === 'fulfilled') heads = results[0].value;
      if (results[1].status === 'fulfilled') partners = results[1].value;
      if (results[2].status === 'fulfilled') managers = results[2].value;
      if (results[3].status === 'fulfilled') supervisors = results[3].value;
      if (results[4].status === 'fulfilled') hostels = results[4].value;
      if (results[5].status === 'fulfilled') assignments = results[5].value;
    } catch (err: any) {
      errorMsg = err.message || 'Failed to load hierarchy data';
    } finally {
      loading = false;
    }
  }

  function openModal(type: 'head' | 'partner' | 'manager' | 'supervisor' | 'hostel' | 'assignment') {
    activeModal = type;
    name = '';
    email = '';
    password = '';
    phone = '';
    address = '';
    contactNumber = '';
    hostelCode = '';
    errorMsg = '';
    successMsg = '';

    // Default selection IDs if available
    selectedHeadId = heads.length > 0 ? heads[0].head_id : undefined;
    selectedPartnerId = partners.length > 0 ? partners[0].partner_id : undefined;
    selectedManagerId = managers.length > 0 ? managers[0].manager_id : undefined;
    selectedSupervisorId = supervisors.length > 0 ? supervisors[0].supervisor_id : undefined;
    selectedHostelId = hostels.length > 0 ? (hostels[0].hostel_id || hostels[0].id) : undefined;
  }

  function closeModal() {
    activeModal = null;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    isSubmitting = true;
    errorMsg = '';
    successMsg = '';

    try {
      if (activeModal === 'head') {
        await createHead({ name, email, password, phone });
        successMsg = `Head account created for ${name}!`;
      } else if (activeModal === 'partner') {
        await createPartner({ name, email, password, phone, head_id: selectedHeadId });
        successMsg = `Partner account created for ${name}!`;
      } else if (activeModal === 'manager') {
        await createManager({ name, email, password, phone, partner_id: selectedPartnerId || dashboardData?.partner_id });
        successMsg = `Manager account created for ${name}!`;
      } else if (activeModal === 'supervisor') {
        await createSupervisor({
          name,
          email,
          password,
          phone,
          manager_id: selectedManagerId || dashboardData?.manager_id,
          hostel_id: selectedHostelId,
          assignment_role: assignmentRole
        });
        successMsg = `Supervisor account created for ${name}!`;
      } else if (activeModal === 'hostel') {
        await createHostel({
          name,
          address,
          contact_number: contactNumber,
          hostel_code: hostelCode,
          partner_id: selectedPartnerId ? Number(selectedPartnerId) : undefined
        });
        successMsg = `Hostel property "${name}" created successfully!`;
      } else if (activeModal === 'assignment') {
        if (assignType === 'head_partner') {
          if (!selectedHeadId || !selectedPartnerId) throw new Error('Head and Partner selection required');
          await assignHeadPartner({ head_id: Number(selectedHeadId), partner_id: Number(selectedPartnerId) });
          successMsg = 'Head assigned to Partner successfully!';
        } else if (assignType === 'partner_manager') {
          if (!selectedPartnerId || !selectedManagerId) throw new Error('Partner and Manager selection required');
          await assignPartnerManager({ partner_id: Number(selectedPartnerId), manager_id: Number(selectedManagerId) });
          successMsg = 'Partner assigned to Manager successfully!';
        } else if (assignType === 'partner_hostel') {
          if (!selectedPartnerId || !selectedHostelId) throw new Error('Partner and Hostel selection required');
          await assignPartnerHostel({ partner_id: Number(selectedPartnerId), hostel_id: Number(selectedHostelId) });
          successMsg = 'Partner assigned to Hostel successfully!';
        } else if (assignType === 'manager_hostel') {
          if (!selectedManagerId || !selectedHostelId) throw new Error('Manager and Hostel selection required');
          await assignManagerHostel({ manager_id: Number(selectedManagerId), hostel_id: Number(selectedHostelId) });
          successMsg = 'Manager assigned to Hostel successfully!';
        } else if (assignType === 'hostel_supervisor') {
          if (!selectedSupervisorId || !selectedHostelId) throw new Error('Supervisor and Hostel selection required');
          await assignSupervisorHostel({
            supervisor_id: Number(selectedSupervisorId),
            hostel_id: Number(selectedHostelId),
            assignment_role: assignmentRole
          });
          successMsg = `Supervisor assigned to Hostel as ${assignmentRole} successfully!`;
        }
      }

      closeModal();
      await loadData();
    } catch (err: any) {
      errorMsg = err.message || 'Operation failed';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<svelte:head><title>System Admin &amp; Hierarchy Management — EasyPG</title></svelte:head>

<div class="hierarchy-container">
  <header class="page-header">
    <div>
      <span class="eyebrow">System Admin &amp; Scoped Roles</span>
      <h1 class="title">Organization &amp; Staff Management</h1>
      <p class="description">Create Staff, Register Hostels, and Manage Schema-Based Hierarchy Assignments</p>
    </div>
    <div class="header-actions">
      {#if ['SUPERADMIN', 'ADMIN'].includes(userRole)}
        <button class="btn btn-primary" onclick={() => openModal('head')}>+ Add Head</button>
        <button class="btn btn-secondary" onclick={() => openModal('partner')}>+ Add Partner</button>
      {/if}

      {#if ['SUPERADMIN', 'ADMIN', 'HEAD', 'PARTNER'].includes(userRole)}
        <button class="btn btn-primary" onclick={() => openModal('manager')}>+ Add Manager</button>
      {/if}

      {#if ['SUPERADMIN', 'ADMIN', 'HEAD', 'PARTNER', 'MANAGER'].includes(userRole)}
        <button class="btn btn-accent" onclick={() => openModal('supervisor')}>+ Add Supervisor</button>
        <button class="btn btn-dark" onclick={() => openModal('hostel')}>+ Add Hostel</button>
      {/if}

      {#if ['SUPERADMIN', 'ADMIN', 'HEAD'].includes(userRole)}
        <button class="btn btn-outline" onclick={() => openModal('assignment')}>🔗 Manage Assignment</button>
      {/if}
    </div>
  </header>

  {#if successMsg}
    <div class="alert alert-success">{successMsg}</div>
  {/if}
  {#if errorMsg}
    <div class="alert alert-error">{errorMsg}</div>
  {/if}

  {#if loading}
    <div class="loading-state">Loading organization hierarchy details...</div>
  {:else if dashboardData}
    <div class="role-badge-row">
      <span class="role-chip">Authenticated Role: <strong>{dashboardData.role}</strong></span>
    </div>

    <!-- Summary Metrics -->
    <div class="metrics-grid">
      <div class="metric-card">
        <span class="metric-label">Total Heads</span>
        <span class="metric-value">{heads.length || dashboardData.metrics.total_heads || 0}</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Total Partners</span>
        <span class="metric-value">{partners.length || dashboardData.metrics.total_partners || 0}</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Total Managers</span>
        <span class="metric-value">{managers.length || dashboardData.metrics.total_managers || 0}</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Total Supervisors</span>
        <span class="metric-value">{supervisors.length || dashboardData.metrics.total_supervisors || 0}</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Managed Hostels</span>
        <span class="metric-value">{hostels.length || dashboardData.metrics.total_hostels || 0}</span>
      </div>
    </div>

    <!-- Registered Staff & Entities -->
    <section class="section-card">
      <h2>Registered System Staff</h2>
      <div class="tables-grid">
        <div>
          <h3>Heads ({heads.length})</h3>
          <table class="data-table">
            <thead>
              <tr><th>Head ID</th><th>Name</th><th>Email</th><th>Phone</th></tr>
            </thead>
            <tbody>
              {#if heads.length === 0}
                <tr><td colspan="4" class="empty-cell">No Heads registered</td></tr>
              {:else}
                {#each heads as h}
                  <tr><td>{h.head_id}</td><td><strong>{h.name}</strong></td><td>{h.email}</td><td>{h.phone || '-'}</td></tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>

        <div>
          <h3>Partners ({partners.length})</h3>
          <table class="data-table">
            <thead>
              <tr><th>Partner ID</th><th>Name</th><th>Email</th><th>Phone</th></tr>
            </thead>
            <tbody>
              {#if partners.length === 0}
                <tr><td colspan="4" class="empty-cell">No Partners registered</td></tr>
              {:else}
                {#each partners as p}
                  <tr><td>{p.partner_id}</td><td><strong>{p.name}</strong></td><td>{p.email}</td><td>{p.phone || '-'}</td></tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>

      <div class="tables-grid" style="margin-top: 1.5rem;">
        <div>
          <h3>Managers ({managers.length})</h3>
          <table class="data-table">
            <thead>
              <tr><th>Manager ID</th><th>Name</th><th>Email</th><th>Phone</th></tr>
            </thead>
            <tbody>
              {#if managers.length === 0}
                <tr><td colspan="4" class="empty-cell">No Managers registered</td></tr>
              {:else}
                {#each managers as m}
                  <tr><td>{m.manager_id}</td><td><strong>{m.name}</strong></td><td>{m.email}</td><td>{m.phone || '-'}</td></tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>

        <div>
          <h3>Supervisors ({supervisors.length})</h3>
          <table class="data-table">
            <thead>
              <tr><th>Supervisor ID</th><th>Name</th><th>Email</th><th>Phone</th></tr>
            </thead>
            <tbody>
              {#if supervisors.length === 0}
                <tr><td colspan="4" class="empty-cell">No Supervisors registered</td></tr>
              {:else}
                {#each supervisors as s}
                  <tr><td>{s.supervisor_id}</td><td><strong>{s.name}</strong></td><td>{s.email}</td><td>{s.phone || '-'}</td></tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Hostels List -->
    <section class="section-card">
      <h2>Registered Hostels ({hostels.length})</h2>
      <table class="data-table">
        <thead>
          <tr><th>Hostel ID</th><th>Code</th><th>Name</th><th>Address</th><th>Contact</th><th>Status</th></tr>
        </thead>
        <tbody>
          {#if hostels.length === 0}
            <tr><td colspan="6" class="empty-cell">No Hostels created yet</td></tr>
          {:else}
            {#each hostels as h}
              <tr>
                <td>{h.hostel_id || h.id}</td>
                <td><span class="badge">{h.hostel_code || h.code}</span></td>
                <td><strong>{h.name}</strong></td>
                <td>{h.address || h.addressLine1 || '-'}</td>
                <td>{h.contact_number || '-'}</td>
                <td><span class="status-tag active">{h.status || 'ACTIVE'}</span></td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </section>

    <!-- Schema Assignments Section -->
    <section class="section-card">
      <h2>Active Schema Assignments (Database-Backed)</h2>

      <div class="assignment-block">
        <h3>1. Head ➔ Partner Assignments (head_partner_assignment)</h3>
        <table class="data-table">
          <thead>
            <tr><th>Assignment ID</th><th>Head</th><th>Partner</th><th>Start Date</th></tr>
          </thead>
          <tbody>
            {#if assignments.head_partner.length === 0}
              <tr><td colspan="4" class="empty-cell">No active Head-Partner assignments</td></tr>
            {:else}
              {#each assignments.head_partner as a}
                <tr>
                  <td>{a.assignment_id}</td>
                  <td><strong>{a.head_name}</strong> (Head ID: {a.head_id})</td>
                  <td><strong>{a.partner_name}</strong> (Partner ID: {a.partner_id})</td>
                  <td>{a.start_date ? new Date(a.start_date).toLocaleDateString() : '-'}</td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>

      <div class="assignment-block">
        <h3>2. Partner ➔ Manager Assignments (partner_manager_assignment)</h3>
        <table class="data-table">
          <thead>
            <tr><th>Assignment ID</th><th>Partner</th><th>Manager</th><th>Start Date</th></tr>
          </thead>
          <tbody>
            {#if assignments.partner_manager.length === 0}
              <tr><td colspan="4" class="empty-cell">No active Partner-Manager assignments</td></tr>
            {:else}
              {#each assignments.partner_manager as a}
                <tr>
                  <td>{a.assignment_id}</td>
                  <td><strong>{a.partner_name}</strong> (Partner ID: {a.partner_id})</td>
                  <td><strong>{a.manager_name}</strong> (Manager ID: {a.manager_id})</td>
                  <td>{a.start_date ? new Date(a.start_date).toLocaleDateString() : '-'}</td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>

      <div class="assignment-block">
        <h3>3. Partner ➔ Hostel Assignments (partner_hostel_assignment)</h3>
        <table class="data-table">
          <thead>
            <tr><th>Assignment ID</th><th>Partner</th><th>Hostel</th><th>Start Date</th></tr>
          </thead>
          <tbody>
            {#if assignments.partner_hostel.length === 0}
              <tr><td colspan="4" class="empty-cell">No active Partner-Hostel assignments</td></tr>
            {:else}
              {#each assignments.partner_hostel as a}
                <tr>
                  <td>{a.assignment_id}</td>
                  <td><strong>{a.partner_name}</strong> (Partner ID: {a.partner_id})</td>
                  <td><strong>{a.hostel_name}</strong> (Hostel ID: {a.hostel_id})</td>
                  <td>{a.start_date ? new Date(a.start_date).toLocaleDateString() : '-'}</td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>

      <div class="assignment-block">
        <h3>4. Manager ➔ Hostel Assignments (manager_hostel_assignment)</h3>
        <table class="data-table">
          <thead>
            <tr><th>Assignment ID</th><th>Manager</th><th>Hostel</th><th>Start Date</th></tr>
          </thead>
          <tbody>
            {#if assignments.manager_hostel.length === 0}
              <tr><td colspan="4" class="empty-cell">No active Manager-Hostel assignments</td></tr>
            {:else}
              {#each assignments.manager_hostel as a}
                <tr>
                  <td>{a.assignment_id}</td>
                  <td><strong>{a.manager_name}</strong> (Manager ID: {a.manager_id})</td>
                  <td><strong>{a.hostel_name}</strong> (Hostel ID: {a.hostel_id})</td>
                  <td>{a.start_date ? new Date(a.start_date).toLocaleDateString() : '-'}</td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>

      <div class="assignment-block">
        <h3>5. Hostel ➔ Supervisor Assignments (hostel_supervisor_assignment)</h3>
        <table class="data-table">
          <thead>
            <tr><th>Assignment ID</th><th>Hostel</th><th>Supervisor</th><th>Assignment Role</th><th>Start Date</th></tr>
          </thead>
          <tbody>
            {#if assignments.hostel_supervisor.length === 0}
              <tr><td colspan="5" class="empty-cell">No active Hostel-Supervisor assignments</td></tr>
            {:else}
              {#each assignments.hostel_supervisor as a}
                <tr>
                  <td>{a.assignment_id}</td>
                  <td><strong>{a.hostel_name}</strong> (Hostel ID: {a.hostel_id})</td>
                  <td><strong>{a.supervisor_name}</strong> (Supervisor ID: {a.supervisor_id})</td>
                  <td><span class="role-chip">{a.assignment_role}</span></td>
                  <td>{a.start_date ? new Date(a.start_date).toLocaleDateString() : '-'}</td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  <!-- Modal Overlay -->
  {#if activeModal}
    <div class="modal-backdrop" onclick={closeModal} role="presentation">
      <div class="modal-content" onclick={(e) => e.stopPropagation()} role="presentation">
        <h2>
          {#if activeModal === 'head'}Create Head User
          {:else if activeModal === 'partner'}Create Partner User
          {:else if activeModal === 'manager'}Create Manager User
          {:else if activeModal === 'supervisor'}Create Supervisor User
          {:else if activeModal === 'hostel'}Create Hostel Property
          {:else if activeModal === 'assignment'}Manage Schema Assignment
          {/if}
        </h2>

        <form onsubmit={handleSubmit}>
          {#if activeModal === 'hostel'}
            <div class="form-group">
              <label for="hname">Hostel Name</label>
              <input type="text" id="hname" bind:value={name} required placeholder="e.g. Royal Living Hostel" />
            </div>
            <div class="form-group">
              <label for="haddress">Address</label>
              <input type="text" id="haddress" bind:value={address} required placeholder="123 Main Street, City" />
            </div>
            <div class="form-group">
              <label for="hcontact">Contact Number</label>
              <input type="tel" id="hcontact" bind:value={contactNumber} placeholder="9876543210" />
            </div>
            <div class="form-group">
              <label for="hcode">Hostel Code (Optional)</label>
              <input type="text" id="hcode" bind:value={hostelCode} placeholder="HSTL-101" />
            </div>
            {#if partners.length > 0}
              <div class="form-group">
                <label for="hpartner">Assign to Partner (Optional)</label>
                <select id="hpartner" bind:value={selectedPartnerId}>
                  <option value={undefined}>-- Auto-assign (Least-loaded Balanced Distribution) --</option>
                  {#each partners as p}
                    <option value={p.partner_id}>{p.name} (Partner ID: {p.partner_id})</option>
                  {/each}
                </select>
                <small style="color: #6b7280; display: block; margin-top: 0.25rem;">
                  Leaving this unselected will automatically assign the active Partner with the fewest hostels.
                </small>
              </div>
            {/if}
          {:else if activeModal === 'assignment'}
            <div class="form-group">
              <label for="assignTypeSelect">Assignment Relationship</label>
              <select id="assignTypeSelect" bind:value={assignType}>
                <option value="head_partner">Head ➔ Partner (head_partner_assignment)</option>
                <option value="partner_manager">Partner ➔ Manager (partner_manager_assignment)</option>
                <option value="partner_hostel">Partner ➔ Hostel (partner_hostel_assignment)</option>
                <option value="manager_hostel">Manager ➔ Hostel (manager_hostel_assignment)</option>
                <option value="hostel_supervisor">Hostel ➔ Supervisor (hostel_supervisor_assignment)</option>
              </select>
            </div>

            {#if assignType === 'head_partner'}
              <div class="form-group">
                <label for="headSelect">Select Head</label>
                <select id="headSelect" bind:value={selectedHeadId} required>
                  {#each heads as h}
                    <option value={h.head_id}>{h.name} (Head ID: {h.head_id})</option>
                  {/each}
                </select>
              </div>
              <div class="form-group">
                <label for="partnerSelect">Select Partner</label>
                <select id="partnerSelect" bind:value={selectedPartnerId} required>
                  {#each partners as p}
                    <option value={p.partner_id}>{p.name} (Partner ID: {p.partner_id})</option>
                  {/each}
                </select>
              </div>
            {:else if assignType === 'partner_manager'}
              <div class="form-group">
                <label for="partnerSelect">Select Partner</label>
                <select id="partnerSelect" bind:value={selectedPartnerId} required>
                  {#each partners as p}
                    <option value={p.partner_id}>{p.name} (Partner ID: {p.partner_id})</option>
                  {/each}
                </select>
              </div>
              <div class="form-group">
                <label for="managerSelect">Select Manager</label>
                <select id="managerSelect" bind:value={selectedManagerId} required>
                  {#each managers as m}
                    <option value={m.manager_id}>{m.name} (Manager ID: {m.manager_id})</option>
                  {/each}
                </select>
              </div>
            {:else if assignType === 'partner_hostel'}
              <div class="form-group">
                <label for="partnerSelect">Select Partner</label>
                <select id="partnerSelect" bind:value={selectedPartnerId} required>
                  {#each partners as p}
                    <option value={p.partner_id}>{p.name} (Partner ID: {p.partner_id})</option>
                  {/each}
                </select>
              </div>
              <div class="form-group">
                <label for="hostelSelect">Select Hostel</label>
                <select id="hostelSelect" bind:value={selectedHostelId} required>
                  {#each hostels as h}
                    <option value={h.hostel_id || h.id}>{h.name} (Hostel ID: {h.hostel_id || h.id})</option>
                  {/each}
                </select>
              </div>
            {:else if assignType === 'manager_hostel'}
              <div class="form-group">
                <label for="managerSelect">Select Manager</label>
                <select id="managerSelect" bind:value={selectedManagerId} required>
                  {#each managers as m}
                    <option value={m.manager_id}>{m.name} (Manager ID: {m.manager_id})</option>
                  {/each}
                </select>
              </div>
              <div class="form-group">
                <label for="hostelSelect">Select Hostel</label>
                <select id="hostelSelect" bind:value={selectedHostelId} required>
                  {#each hostels as h}
                    <option value={h.hostel_id || h.id}>{h.name} (Hostel ID: {h.hostel_id || h.id})</option>
                  {/each}
                </select>
              </div>
            {:else if assignType === 'hostel_supervisor'}
              <div class="form-group">
                <label for="supervisorSelect">Select Supervisor</label>
                <select id="supervisorSelect" bind:value={selectedSupervisorId} required>
                  {#each supervisors as s}
                    <option value={s.supervisor_id}>{s.name} (Supervisor ID: {s.supervisor_id})</option>
                  {/each}
                </select>
              </div>
              <div class="form-group">
                <label for="hostelSelect">Select Hostel</label>
                <select id="hostelSelect" bind:value={selectedHostelId} required>
                  {#each hostels as h}
                    <option value={h.hostel_id || h.id}>{h.name} (Hostel ID: {h.hostel_id || h.id})</option>
                  {/each}
                </select>
              </div>
              <div class="form-group">
                <label for="roleType">Assignment Role</label>
                <select id="roleType" bind:value={assignmentRole}>
                  <option value="TENANT_ADMIN">Tenant Admin</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>
            {/if}
          {:else}
            <div class="form-group">
              <label for="name">Full Name</label>
              <input type="text" id="name" bind:value={name} required placeholder="e.g. John Doe" />
            </div>

            <div class="form-group">
              <label for="email">Email Address</label>
              <input type="email" id="email" bind:value={email} required placeholder="user@domain.com" />
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" bind:value={password} required placeholder="••••••••" />
            </div>

            <div class="form-group">
              <label for="phone">Phone Number</label>
              <input type="tel" id="phone" bind:value={phone} placeholder="9876543210" />
            </div>

            {#if activeModal === 'partner' && heads.length > 0}
              <div class="form-group">
                <label for="headId">Select Head (Optional)</label>
                <select id="headId" bind:value={selectedHeadId}>
                  <option value={undefined}>-- None --</option>
                  {#each heads as h}
                    <option value={h.head_id}>{h.name} (ID: {h.head_id})</option>
                  {/each}
                </select>
              </div>
            {/if}

            {#if activeModal === 'manager' && partners.length > 0}
              <div class="form-group">
                <label for="partnerId">Select Parent Partner (partner_id)</label>
                <select id="partnerId" bind:value={selectedPartnerId} required>
                  {#each partners as p}
                    <option value={p.partner_id}>{p.name} (ID: {p.partner_id})</option>
                  {/each}
                </select>
              </div>
            {/if}

            {#if activeModal === 'supervisor'}
              {#if managers.length > 0}
                <div class="form-group">
                  <label for="managerId">Select Parent Manager (Optional)</label>
                  <select id="managerId" bind:value={selectedManagerId}>
                    <option value={undefined}>-- None --</option>
                    {#each managers as m}
                      <option value={m.manager_id}>{m.name} (ID: {m.manager_id})</option>
                    {/each}
                  </select>
                </div>
              {/if}
              {#if hostels.length > 0}
                <div class="form-group">
                  <label for="hostelId">Select Hostel (Optional)</label>
                  <select id="hostelId" bind:value={selectedHostelId}>
                    <option value={undefined}>-- None --</option>
                    {#each hostels as h}
                      <option value={h.hostel_id || h.id}>{h.name} (ID: {h.hostel_id || h.id})</option>
                    {/each}
                  </select>
                </div>
              {/if}
              <div class="form-group">
                <label for="roleType">Assignment Role</label>
                <select id="roleType" bind:value={assignmentRole}>
                  <option value="TENANT_ADMIN">Tenant Admin</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>
            {/if}
          {/if}

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick={closeModal}>Cancel</button>
            <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>

<style>
  .hierarchy-container {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    font-family: system-ui, -apple-system, sans-serif;
  }
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
  }
  .eyebrow {
    font-size: 0.85rem;
    color: #4f46e5;
    font-weight: 600;
    text-transform: uppercase;
  }
  .title {
    font-size: 2rem;
    margin: 0.2rem 0;
    color: #111827;
  }
  .description {
    color: #6b7280;
    margin: 0;
  }
  .header-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .btn {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    font-size: 0.9rem;
    transition: background 0.2s;
  }
  .btn-primary {
    background: #2563eb;
    color: white;
  }
  .btn-primary:hover {
    background: #1d4ed8;
  }
  .btn-secondary {
    background: #e5e7eb;
    color: #374151;
  }
  .btn-accent {
    background: #059669;
    color: white;
  }
  .btn-dark {
    background: #4b5563;
    color: white;
  }
  .btn-outline {
    background: transparent;
    border: 1px solid #2563eb;
    color: #2563eb;
  }
  .alert {
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
  }
  .alert-success {
    background: #d1fae5;
    color: #065f46;
  }
  .alert-error {
    background: #fee2e2;
    color: #991b1b;
  }
  .role-badge-row {
    margin-bottom: 1rem;
  }
  .role-chip {
    display: inline-block;
    background: #eff6ff;
    color: #1e40af;
    padding: 0.4rem 0.8rem;
    border-radius: 12px;
    font-size: 0.9rem;
  }
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .metric-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.2rem;
    display: flex;
    flex-direction: column;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  .metric-label {
    font-size: 0.85rem;
    color: #6b7280;
  }
  .metric-value {
    font-size: 1.8rem;
    font-weight: 700;
    color: #111827;
    margin-top: 0.3rem;
  }
  .section-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  .section-card h2 {
    font-size: 1.25rem;
    margin-top: 0;
    margin-bottom: 1rem;
    color: #111827;
  }
  .section-card h3 {
    font-size: 1rem;
    color: #374151;
    margin-bottom: 0.5rem;
  }
  .tables-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
  .assignment-block {
    margin-bottom: 1.5rem;
    border-top: 1px solid #f3f4f6;
    padding-top: 1rem;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 0.5rem;
  }
  .data-table th, .data-table td {
    padding: 0.6rem 0.8rem;
    text-align: left;
    border-bottom: 1px solid #f3f4f6;
    font-size: 0.9rem;
  }
  .data-table th {
    background: #f9fafb;
    color: #4b5563;
    font-weight: 600;
  }
  .empty-cell {
    text-align: center;
    color: #9ca3af;
    padding: 1rem;
  }
  .badge {
    background: #e0e7ff;
    color: #3730a3;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
  }
  .status-tag.active {
    background: #d1fae5;
    color: #065f46;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
  }
  .modal-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .modal-content {
    background: white;
    border-radius: 8px;
    width: 100%;
    max-width: 520px;
    padding: 2rem;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
  }
  .form-group {
    margin-bottom: 1.2rem;
  }
  .form-group label {
    display: block;
    margin-bottom: 0.4rem;
    font-weight: 500;
    font-size: 0.9rem;
    color: #374151;
  }
  .form-group input, .form-group select {
    width: 100%;
    padding: 0.6rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.95rem;
    box-sizing: border-box;
  }
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.8rem;
    margin-top: 1.5rem;
  }
</style>
