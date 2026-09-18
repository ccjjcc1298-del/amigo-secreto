-- ============================================================
--  Amigo Secreto - Esquema de Base de Datos
-- ============================================================
--  Ejecutar este archivo en cualquier base de datos PostgreSQL.
--  En Supabase: SQL Editor > pegar y ejecutar.
-- ============================================================

-- Tabla de salas
CREATE TABLE IF NOT EXISTS rooms (
    id              SERIAL PRIMARY KEY,
    room_code       VARCHAR(10) UNIQUE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closes_at       TIMESTAMPTZ NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'registration_open',
    draw_completed_at TIMESTAMPTZ
);

-- Tabla de participantes
CREATE TABLE IF NOT EXISTS participants (
    id                SERIAL PRIMARY KEY,
    room_id           INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name              VARCHAR(100) NOT NULL,
    secret_code_hash  VARCHAR(255) NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(room_id, name)
);

-- Tabla de asignaciones (resultados del sorteo)
CREATE TABLE IF NOT EXISTS assignments (
    id                    SERIAL PRIMARY KEY,
    room_id               INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    giver_participant_id  INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    receiver_participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(room_id, giver_participant_id)
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_participants_room_id ON participants(room_id);
CREATE INDEX IF NOT EXISTS idx_assignments_room_id ON assignments(room_id);
CREATE INDEX IF NOT EXISTS idx_assignments_giver ON assignments(giver_participant_id);
