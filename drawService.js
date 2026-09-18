import supabase from "../db.js";

export async function hasDrawBeenCompleted(roomId) {
  const { count, error } = await supabase
    .from("assignments")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);
  if (error) throw error;
  return count > 0;
}

export async function performDraw(roomId) {
  const { data, error } = await supabase.rpc("perform_draw", {
    room_id_param: roomId,
  });
  if (error) throw error;
  return data;
}

export async function getReceiverName(roomId, giverParticipantId) {
  const { data, error } = await supabase
    .from("assignments")
    .select("receiver_participant_id")
    .eq("room_id", roomId)
    .eq("giver_participant_id", giverParticipantId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: receiver, error: rErr } = await supabase
    .from("participants")
    .select("name")
    .eq("id", data.receiver_participant_id)
    .maybeSingle();
  if (rErr) throw rErr;
  return receiver?.name || null;
}
