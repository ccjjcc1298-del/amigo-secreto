import { Router } from "express";
import {
  createRoom,
  getRoomByCode,
  checkAndExpireRoom,
} from "./roomService.js";
import {
  getParticipantsByRoom,
  getParticipantCount,
  findParticipantByName,
  addParticipant,
} from "./participantService.js";
import { performDraw, hasDrawBeenCompleted, getReceiverName } from "./drawService.js";
import { verifyCode } from "./crypto.js";
import supabase from "./db.js";

const router = Router();

// POST /api/rooms — Crear una sala nueva
router.post("/rooms", async (req, res) => {
  try {
    const room = await createRoom();
    res.status(201).json({
      room_code: room.room_code,
      created_at: room.created_at,
      closes_at: room.closes_at,
      status: room.status,
    });
  } catch (err) {
    console.error("Error creating room:", err);
    res.status(500).json({ error: "No se pudo crear la sala." });
  }
});

// GET /api/rooms/:code — Obtener info pública de la sala
router.get("/rooms/:code", async (req, res) => {
  try {
    const room = await getRoomByCode(req.params.code);
    if (!room) {
      return res.status(404).json({ error: "Esta sala no existe o el enlace no es válido." });
    }

    // Lazy expiration: si ya pasó closes_at, cerrar la sala
    if (room.status === "registration_open" && new Date(room.closes_at) <= new Date()) {
      await checkAndExpireRoom(room.id);
      room.status = "closed";
    }

    // Si la sala está cerrada pero el sorteo aún no se ha hecho, intentarlo
    if (room.status === "closed") {
      const drawn = await hasDrawBeenCompleted(room.id);
      if (!drawn) {
        const result = await performDraw(room.id);
        if (result === "ok") {
          room.status = "draw_completed";
        }
      } else {
        room.status = "draw_completed";
      }
    }

    const participantCount = await getParticipantCount(room.id);
    const participants = await getParticipantsByRoom(room.id);

    res.json({
      room_code: room.room_code,
      created_at: room.created_at,
      closes_at: room.closes_at,
      status: room.status,
      draw_completed_at: room.draw_completed_at,
      participant_count: participantCount,
      participant_names: participants.map((p) => p.name),
    });
  } catch (err) {
    console.error("Error getting room:", err);
    res.status(500).json({ error: "Error al obtener la sala." });
  }
});

// POST /api/rooms/:code/participants — Registrar un participante
router.post("/rooms/:code/participants", async (req, res) => {
  try {
    const { name, secret_code, confirm_code } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Debes completar todos los campos." });
    }
    if (!secret_code || !confirm_code) {
      return res.status(400).json({ error: "Debes completar todos los campos." });
    }
    if (secret_code.length < 4) {
      return res.status(400).json({ error: "El código debe tener al menos 4 caracteres." });
    }
    if (secret_code !== confirm_code) {
      return res.status(400).json({ error: "Los códigos no coinciden." });
    }

    const room = await getRoomByCode(req.params.code);
    if (!room) {
      return res.status(404).json({ error: "Esta sala no existe o el enlace no es válido." });
    }

    // Lazy expiration check
    if (room.status === "registration_open" && new Date(room.closes_at) <= new Date()) {
      await checkAndExpireRoom(room.id);
      room.status = "closed";
    }

    if (room.status !== "registration_open") {
      return res.status(403).json({ error: "Las inscripciones ya están cerradas." });
    }

    const trimmedName = name.trim();
    const existing = await findParticipantByName(room.id, trimmedName);
    if (existing) {
      return res.status(409).json({ error: "Ya existe un participante con ese nombre." });
    }

    const participant = await addParticipant(room.id, trimmedName, secret_code);
    res.status(201).json({ id: participant.id, name: participant.name });
  } catch (err) {
    console.error("Error adding participant:", err);
    res.status(500).json({ error: "No se pudo registrar el participante." });
  }
});

// POST /api/rooms/:code/draw — Procesar el sorteo
router.post("/rooms/:code/draw", async (req, res) => {
  try {
    const room = await getRoomByCode(req.params.code);
    if (!room) {
      return res.status(404).json({ error: "Esta sala no existe o el enlace no es válido." });
    }

    // Lazy expiration
    if (room.status === "registration_open" && new Date(room.closes_at) <= new Date()) {
      await checkAndExpireRoom(room.id);
      room.status = "closed";
    }

    if (room.status === "registration_open") {
      return res.status(403).json({ error: "Las inscripciones aún están abiertas." });
    }

    const drawn = await hasDrawBeenCompleted(room.id);
    if (drawn) {
      return res.json({ message: "El sorteo ya fue realizado.", status: "draw_completed" });
    }

    const result = await performDraw(room.id);
    if (result === "not_enough") {
      return res.status(400).json({ error: "No hay suficientes participantes para realizar el sorteo." });
    }

    res.json({ message: "Sorteo realizado correctamente." });
  } catch (err) {
    console.error("Error performing draw:", err);
    res.status(500).json({ error: "No se pudo realizar el sorteo." });
  }
});

// POST /api/rooms/:code/result — Consultar el resultado de un participante
router.post("/rooms/:code/result", async (req, res) => {
  try {
    const { name, secret_code } = req.body;

    if (!name || !secret_code) {
      return res.status(400).json({ error: "Debes completar todos los campos." });
    }

    const room = await getRoomByCode(req.params.code);
    if (!room) {
      return res.status(404).json({ error: "Esta sala no existe o el enlace no es válido." });
    }

    // Lazy expiration + auto-draw
    if (room.status === "registration_open" && new Date(room.closes_at) <= new Date()) {
      await checkAndExpireRoom(room.id);
      room.status = "closed";
    }
    if (room.status === "closed") {
      const drawn = await hasDrawBeenCompleted(room.id);
      if (!drawn) {
        const result = await performDraw(room.id);
        if (result === "ok") room.status = "draw_completed";
      } else {
        room.status = "draw_completed";
      }
    }

    if (room.status !== "draw_completed") {
      return res.status(403).json({ error: "El sorteo aún no está disponible." });
    }

    const participant = await findParticipantByName(room.id, name.trim());
    if (!participant) {
      return res.status(401).json({ error: "Nombre o código incorrectos." });
    }

    const codeMatches = await verifyCode(secret_code, participant.secret_code_hash);
    if (!codeMatches) {
      return res.status(401).json({ error: "Nombre o código incorrectos." });
    }

    const receiverName = await getReceiverName(room.id, participant.id);
    if (!receiverName) {
      return res.status(404).json({ error: "No se encontró tu resultado." });
    }

    res.json({ receiver_name: receiverName });
  } catch (err) {
    console.error("Error getting result:", err);
    res.status(500).json({ error: "No se pudo consultar el resultado." });
  }
});

// POST /api/cleanup — Eliminar salas antiguas (opcional, protegido por secreto)
router.post("/cleanup", async (req, res) => {
  try {
    const secret = process.env.CLEANUP_SECRET;
    if (secret && req.body.secret !== secret) {
      return res.status(403).json({ error: "No autorizado." });
    }

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("rooms")
      .delete()
      .not("draw_completed_at", "is", null)
      .lt("draw_completed_at", cutoff)
      .select("id");

    if (error) throw error;
    res.json({ deleted: data ? data.length : 0 });
  } catch (err) {
    console.error("Error during cleanup:", err);
    res.status(500).json({ error: "Error en la limpieza." });
  }
});

export default router;
