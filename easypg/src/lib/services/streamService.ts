export interface CameraStream {
  stream_id: number;
  hostel_id: number;
  hostel_name?: string;
  camera_name: string;
  location_tag: string;
  stream_url: string;
  stream_type: 'HLS' | 'RTSP' | 'MP4' | 'WEBRTC';
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  created_at?: string;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };
  if (typeof localStorage !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

const BASE_URL = "/api";

export async function fetchLiveStreams(hostelId?: number): Promise<CameraStream[]> {
  const url = hostelId ? `${BASE_URL}/streams?hostel_id=${hostelId}` : `${BASE_URL}/streams`;
  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders()
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to fetch live camera streams");
  }
  return json.data || [];
}

export async function fetchStreamById(id: number): Promise<CameraStream> {
  const response = await fetch(`${BASE_URL}/streams/${id}`, {
    method: "GET",
    headers: getAuthHeaders()
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to fetch stream details");
  }
  return json.data;
}

export async function addLiveStream(data: {
  hostel_id: number;
  camera_name: string;
  location_tag: string;
  stream_url: string;
  stream_type?: string;
}) {
  const response = await fetch(`${BASE_URL}/streams`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to add camera stream");
  }
  return json;
}

export async function updateStreamStatus(
  id: number,
  data: { status?: string; camera_name?: string; location_tag?: string; stream_url?: string }
) {
  const response = await fetch(`${BASE_URL}/streams/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to update camera stream");
  }
  return json;
}

export async function deleteStream(id: number) {
  const response = await fetch(`${BASE_URL}/streams/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to delete camera stream");
  }
  return json;
}
