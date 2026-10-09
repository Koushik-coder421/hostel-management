import { apiFetch } from "$lib/api/http";

export interface CreateFloorData {
  hostel_id: number;
  floor_number: number;
  name?: string;
}

export interface CreateRoomData {
  floor_id: number;
  room_number: string;
  room_type?: string;
  capacity: number;
  rent_amount?: number;
  status?: string;
}

export async function createFloor(data: CreateFloorData) {
  return apiFetch("/floors", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function createRoom(data: CreateRoomData) {
  return apiFetch("/rooms", {
    method: "POST",
    body: JSON.stringify(data)
  });
}
