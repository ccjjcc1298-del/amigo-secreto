import supabase from "./db.js";
import { hashCode } from "./crypto.js";

export async function getParticipantsByRoom(roomId) {
  const { data, error } = await supabase
    .from("participants")
    .select("id, name, created_at")
    .eq("room_id", roomId)
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function getParticipantCount(roomId) {
  const { count, error } = await supabase
    .from("participants")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);
  if (error) throw error;
  return count;
}

export async function findParticipantByName(roomId, name) {
  const { data, error } = await supabase
    .from("participants")
    .select("id, name, secret_code_hash")
    .eq("room_id", roomId)
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function addParticipant(roomId, name, secretCode) {
  const hash = await hashCode(secretCode);
  const { data, error } = await supabase
    .from("participants")
    .insert({
      room_id: roomId,
      name,
      secret_code_hash: hash,
    })
    .select("id, name, created_at")
    .single();
  if (error) throw error;
  return data;
}
