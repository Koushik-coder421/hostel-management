<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import {
    fetchLiveStreams,
    addLiveStream,
    updateStreamStatus,
    deleteStream,
    type CameraStream
  } from '$lib/services/streamService';

  let streams = $state<CameraStream[]>([]);
  let selectedStream = $state<CameraStream | null>(null);
  let loading = $state(true);
  let errorMsg = $state('');
  let successMsg = $state('');

  // Add camera modal state
  let showAddModal = $state(false);
  let hostelIdInput = $state<number>(1);
  let cameraNameInput = $state('');
  let locationTagInput = $state('');
  let streamUrlInput = $state('');
  let streamTypeInput = $state<'HLS' | 'MP4' | 'WEBRTC' | 'RTSP'>('MP4');
  let isSubmitting = $state(false);

  onMount(async () => {
    await loadStreams();
  });

  async function loadStreams() {
    loading = true;
    errorMsg = '';
    try {
      const data = await fetchLiveStreams();
      streams = data;
      if (streams.length > 0 && !selectedStream) {
        selectedStream = streams[0];
      }
    } catch (err: any) {
      errorMsg = err.message || 'Failed to load camera streams';
      // Fallback sample streams if backend DB is empty
      streams = [
        {
          stream_id: 101,
          hostel_id: 1,
          hostel_name: "PG Hostel Block A",
          camera_name: "Cam 01 - Main Entrance",
          location_tag: "Reception / Gate 1",
          stream_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
          stream_type: "MP4",
          status: "ONLINE"
        },
        {
          stream_id: 102,
          hostel_id: 1,
          hostel_name: "PG Hostel Block A",
          camera_name: "Cam 02 - Dining & Mess Area",
          location_tag: "Ground Floor Mess",
          stream_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
          stream_type: "MP4",
          status: "ONLINE"
        },
        {
          stream_id: 103,
          hostel_id: 1,
          hostel_name: "PG Hostel Block A",
          camera_name: "Cam 03 - 1st Floor Corridor",
          location_tag: "Block A - Floor 1",
          stream_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          stream_type: "MP4",
          status: "ONLINE"
        },
        {
          stream_id: 104,
          hostel_id: 1,
          hostel_name: "PG Hostel Block A",
          camera_name: "Cam 04 - Parking & Perimeter",
          location_tag: "Outer Gate 2",
          stream_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
          stream_type: "MP4",
          status: "ONLINE"
        }
      ];
      if (!selectedStream) selectedStream = streams[0];
    } finally {
      loading = false;
    }
  }

  function selectCamera(stream: CameraStream) {
    selectedStream = stream;
  }

  async function handleAddCamera(e: Event) {
    e.preventDefault();
    isSubmitting = true;
    errorMsg = '';
    try {
      await addLiveStream({
        hostel_id: Number(hostelIdInput),
        camera_name: cameraNameInput,
        location_tag: locationTagInput,
        stream_url: streamUrlInput,
        stream_type: streamTypeInput
      });
      successMsg = `Camera "${cameraNameInput}" added successfully!`;
      showAddModal = false;
      cameraNameInput = '';
      locationTagInput = '';
      streamUrlInput = '';
      await loadStreams();
    } catch (err: any) {
      errorMsg = err.message || 'Failed to add camera stream';
    } finally {
      isSubmitting = false;
    }
  }

  // Redirection actions
  function redirectToAllocations() {
    goto('/check-ins');
  }

  function redirectToPayments() {
    goto('/payments');
  }

  function redirectToHostels() {
    goto('/hostels');
  }

  function redirectToHierarchy() {
    goto('/hierarchy');
  }
</script>

<svelte:head><title>Live Streaming &amp; Monitoring — EasyPG</title></svelte:head>

<div class="stream-container">
  <header class="page-header">
    <div>
      <span class="eyebrow">CCTV &amp; Security Surveillance</span>
      <h1 class="title">Live Property Streaming</h1>
      <p class="description">Real-time IP camera feeds, corridor monitoring, and security oversight across hostels.</p>
    </div>
    <div class="header-actions">
      <button class="btn btn-secondary" onclick={redirectToAllocations}>➔ Allocations &amp; Check-ins</button>
      <button class="btn btn-secondary" onclick={redirectToPayments}>➔ Payment Collections</button>
      <button class="btn btn-primary" onclick={() => (showAddModal = true)}>+ Add Camera Feed</button>
    </div>
  </header>

  {#if successMsg}
    <div class="alert alert-success">{successMsg}</div>
  {/if}
  {#if errorMsg}
    <div class="alert alert-error">{errorMsg}</div>
  {/if}

  <!-- Quick Redirect Navigation Cards -->
  <div class="redirect-banner">
    <div class="redirect-card" onclick={redirectToAllocations} role="button" tabindex="0" onkeypress={(e) => e.key === 'Enter' && redirectToAllocations()}>
      <div class="card-icon blue">🔑</div>
      <div>
        <h3>Resident Allocations</h3>
        <p>Manage check-ins, bed assignments &amp; stay status</p>
      </div>
    </div>

    <div class="redirect-card" onclick={redirectToPayments} role="button" tabindex="0" onkeypress={(e) => e.key === 'Enter' && redirectToPayments()}>
      <div class="card-icon green">💳</div>
      <div>
        <h3>Payments &amp; Billing</h3>
        <p>Record rent, deposits &amp; download receipts</p>
      </div>
    </div>

    <div class="redirect-card" onclick={redirectToHostels} role="button" tabindex="0" onkeypress={(e) => e.key === 'Enter' && redirectToHostels()}>
      <div class="card-icon orange">🏢</div>
      <div>
        <h3>Hostels &amp; Rooms</h3>
        <p>View property layouts, floors &amp; bed status</p>
      </div>
    </div>

    <div class="redirect-card" onclick={redirectToHierarchy} role="button" tabindex="0" onkeypress={(e) => e.key === 'Enter' && redirectToHierarchy()}>
      <div class="card-icon purple">🛡️</div>
      <div>
        <h3>Team Hierarchy</h3>
        <p>Superadmin ➔ Partner ➔ Manager ➔ Supervisor roles</p>
      </div>
    </div>
  </div>

  {#if loading}
    <div class="loading-state">Connecting to camera stream feeds...</div>
  {:else}
    <div class="streaming-workspace">
      <!-- Main Selected Camera Stream Window -->
      <main class="main-player-card">
        {#if selectedStream}
          <div class="video-header">
            <div>
              <h2>{selectedStream.camera_name}</h2>
              <span class="location-badge">📍 {selectedStream.location_tag}</span>
              {#if selectedStream.hostel_name}
                <span class="hostel-badge">🏢 {selectedStream.hostel_name}</span>
              {/if}
            </div>
            <div class="status-indicator online">
              <span class="live-dot"></span> LIVE
            </div>
          </div>

          <div class="video-wrapper">
            {#if selectedStream.stream_type === 'MP4'}
              <video
                src={selectedStream.stream_url}
                autoplay
                controls
                muted
                loop
                playsinline
                class="video-player"
              >
                <track kind="captions" />
              </video>
            {:else}
              <div class="stream-fallback">
                <p>Streaming <strong>{selectedStream.stream_type}</strong> feed...</p>
                <p class="sub-text">URL: {selectedStream.stream_url}</p>
              </div>
            {/if}
          </div>

          <div class="video-footer">
            <span class="stream-info">Format: <strong>{selectedStream.stream_type}</strong></span>
            <span class="stream-info">Resolution: <strong>1080p Full HD</strong></span>
            <span class="stream-info">Latency: <strong>&lt; 250ms</strong></span>
          </div>
        {:else}
          <div class="no-stream">No camera stream selected</div>
        {/if}
      </main>

      <!-- Camera Feed Selector List -->
      <aside class="camera-sidebar">
        <h3>Available Feeds ({streams.length})</h3>
        <div class="camera-grid">
          {#each streams as stream}
            <button
              class="camera-item {selectedStream?.stream_id === stream.stream_id ? 'active' : ''}"
              onclick={() => selectCamera(stream)}
            >
              <div class="cam-preview">
                <span class="cam-badge">{stream.status}</span>
                <span class="play-icon">▶</span>
              </div>
              <div class="cam-meta">
                <span class="cam-title">{stream.camera_name}</span>
                <span class="cam-loc">{stream.location_tag}</span>
              </div>
            </button>
          {/each}
        </div>
      </aside>
    </div>
  {/if}

  <!-- Add Camera Modal -->
  {#if showAddModal}
    <div class="modal-backdrop" onclick={() => (showAddModal = false)} role="presentation">
      <div class="modal-content" onclick={(e) => e.stopPropagation()} role="presentation">
        <h2>Add Live Camera Stream</h2>
        <form onsubmit={handleAddCamera}>
          <div class="form-group">
            <label for="hostelId">Hostel ID</label>
            <input type="number" id="hostelId" bind:value={hostelIdInput} required />
          </div>

          <div class="form-group">
            <label for="camName">Camera Name</label>
            <input type="text" id="camName" bind:value={cameraNameInput} required placeholder="e.g. Cam 05 - West Gate" />
          </div>

          <div class="form-group">
            <label for="locTag">Location / Area</label>
            <input type="text" id="locTag" bind:value={locationTagInput} required placeholder="e.g. 2nd Floor Corridor" />
          </div>

          <div class="form-group">
            <label for="streamUrl">Stream RTSP/HLS/MP4 URL</label>
            <input type="url" id="streamUrl" bind:value={streamUrlInput} required placeholder="https://..." />
          </div>

          <div class="form-group">
            <label for="streamType">Stream Format</label>
            <select id="streamType" bind:value={streamTypeInput}>
              <option value="HLS">HLS (HTTP Live Streaming)</option>
              <option value="MP4">MP4 Video Stream</option>
              <option value="WEBRTC">WebRTC Low Latency</option>
              <option value="RTSP">RTSP Over Web Sockets</option>
            </select>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick={() => (showAddModal = false)}>Cancel</button>
            <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add Camera'}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>

<style>
  .stream-container {
    padding: 2rem;
    max-width: 1300px;
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
    color: var(--color-text-primary, inherit);
  }
  .description {
    color: var(--color-text-secondary, #9ca3af);
    margin: 0;
  }
  .header-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .btn {
    padding: 0.6rem 1.2rem;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    border: none;
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
    background: var(--color-background-card, #334155);
    color: var(--color-text-primary, inherit);
    border: 1px solid var(--color-border, #475569);
  }
  .alert {
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
  }
  .alert-success {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
  .alert-error {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
  
  /* Redirect Banner */
  .redirect-banner {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .redirect-card {
    background: var(--color-background-card, #1e293b);
    border: 1px solid var(--color-border, #334155);
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .redirect-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
  .card-icon {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
  }
  .card-icon.blue { background: rgba(37, 99, 235, 0.15); }
  .card-icon.green { background: rgba(16, 185, 129, 0.15); }
  .card-icon.orange { background: rgba(245, 158, 11, 0.15); }
  .card-icon.purple { background: rgba(139, 92, 246, 0.15); }
  .redirect-card h3 {
    margin: 0;
    font-size: 0.95rem;
    color: var(--color-text-primary, inherit);
  }
  .redirect-card p {
    margin: 0.2rem 0 0 0;
    font-size: 0.8rem;
    color: var(--color-text-secondary, #9ca3af);
  }

  /* Streaming Workspace */
  .streaming-workspace {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 1.5rem;
  }
  @media (max-width: 900px) {
    .streaming-workspace {
      grid-template-columns: 1fr;
    }
  }
  .main-player-card {
    background: #0f172a;
    border-radius: 12px;
    overflow: hidden;
    color: white;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  }
  .video-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.2rem;
    background: #1e293b;
  }
  .video-header h2 {
    margin: 0;
    font-size: 1.2rem;
  }
  .location-badge, .hostel-badge {
    font-size: 0.8rem;
    background: #334155;
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    margin-right: 0.5rem;
  }
  .status-indicator {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: #991b1b;
    color: #fecaca;
    padding: 0.3rem 0.8rem;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 700;
  }
  .live-dot {
    width: 8px;
    height: 8px;
    background: #ef4444;
    border-radius: 50%;
    animation: blink 1s infinite alternate;
  }
  @keyframes blink {
    from { opacity: 1; }
    to { opacity: 0.3; }
  }
  .video-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    background: black;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .video-player {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .stream-fallback {
    text-align: center;
    color: #94a3b8;
  }
  .video-footer {
    display: flex;
    gap: 1.5rem;
    padding: 1rem 1.2rem;
    background: #1e293b;
    font-size: 0.85rem;
    color: #94a3b8;
  }
  .stream-info strong {
    color: #f8fafc;
  }

  /* Camera Sidebar */
  .camera-sidebar {
    background: var(--color-background-card, #1e293b);
    border: 1px solid var(--color-border, #334155);
    border-radius: 12px;
    padding: 1.2rem;
  }
  .camera-sidebar h3 {
    margin-top: 0;
    font-size: 1.1rem;
    color: var(--color-text-primary, inherit);
  }
  .camera-grid {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }
  .camera-item {
    display: flex;
    gap: 0.8rem;
    padding: 0.6rem;
    border: 1px solid var(--color-border, #334155);
    border-radius: 8px;
    background: var(--color-background-elevated, #0f172a);
    cursor: pointer;
    text-align: left;
    transition: background 0.2s, border-color 0.2s;
  }
  .camera-item:hover, .camera-item.active {
    background: rgba(37, 99, 235, 0.15);
    border-color: #2563eb;
  }
  .cam-preview {
    width: 80px;
    height: 50px;
    background: #1e293b;
    border-radius: 4px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }
  .cam-badge {
    position: absolute;
    top: 2px;
    left: 2px;
    font-size: 0.6rem;
    background: #059669;
    color: white;
    padding: 1px 3px;
    border-radius: 2px;
  }
  .play-icon {
    font-size: 0.8rem;
    opacity: 0.8;
  }
  .cam-meta {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .cam-title {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--color-text-primary, inherit);
  }
  .cam-loc {
    font-size: 0.75rem;
    color: var(--color-text-secondary, #9ca3af);
  }

  /* Modal */
  .modal-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .modal-content {
    background: var(--color-background-card, #1e293b);
    color: var(--color-text-primary, inherit);
    border: 1px solid var(--color-border, #334155);
    border-radius: 8px;
    width: 100%;
    max-width: 500px;
    padding: 2rem;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);
  }
  .form-group {
    margin-bottom: 1.2rem;
  }
  .form-group label {
    display: block;
    margin-bottom: 0.4rem;
    font-weight: 500;
    font-size: 0.9rem;
    color: var(--color-text-primary, inherit);
  }
  .form-group input, .form-group select {
    width: 100%;
    padding: 0.6rem;
    background: var(--color-background-elevated, #0f172a);
    color: var(--color-text-primary, inherit);
    border: 1px solid var(--color-border, #475569);
    border-radius: 6px;
    font-size: 1rem;
    box-sizing: border-box;
  }
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.8rem;
    margin-top: 1.5rem;
  }
</style>
