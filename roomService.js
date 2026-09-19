import supabase from "./db.js";
import { generateRoomCode } from "./roomCode.js";

export async function createRoom() {
  let code;
  let attempts = 0;
  while (attempts < 10) {
    code = generateRoomCode();
    const { count } = await supabase
      .from("rooms")
      .select("room_code", { count: "exact", head: true })
      .eq("room_code", code);
    if (count === 0) break;
    attempts++;
  }

  const { data, error } = await supabase
    .from("rooms")
    .insert({
      room_code: code,
      closes_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      status: "registration_open",
    })
    .select("id, room_code, created_at, closes_at, status")
    .single();

  if (error) throw error;
  return data;
}

export async function getRoomByCode(roomCode) {
  const { data, error } = await supabase
    .from("rooms")
    .select("id, room_code, created_at, closes_at, status, draw_completed_at")
    .eq("room_code", roomCode)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function checkAndExpireRoom(roomId) {
  const { data, error } = await supabase
    .from("rooms")
    .update({ status: "closed" })
    .eq("id", roomId)
    .eq("status", "registration_open")
    .lte("closes_at", new Date().toISOString())
    .select("id, room_code, created_at, closes_at, status, draw_completed_at")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateRoomStatus(roomId, status) {
  const update = { status };
  if (status === "draw_completed") {
    update.draw_completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("rooms")
    .update(update)
    .eq("id", roomId)
    .select("id, room_code, created_at, closes_at, status, draw_completed_at")
    .maybeSingle();

  if (error) throw error;
  return data;
}
