/*
# Amigo Secreto - Schema

1. New Tables
- `rooms`: stores secret santa rooms with code, creation time, close time, and status
- `participants`: stores participants with their name and hashed secret code per room
- `assignments`: stores the draw results (giver -> receiver pairs)

2. Security
- RLS enabled on all tables
- The Express backend handles all authorization logic (secret code verification, result privacy)
- Policies allow anon/authenticated access since the API layer enforces security
- The frontend never accesses the database directly; all requests go through Express

3. Important Notes
- room_code is unique across all rooms
- participant name is unique per room (UNIQUE constraint)
- Foreign keys with ON DELETE CASCADE so deleting a room removes all related data
- closes_at is set to exactly 24 hours after created_at
- status transitions: registration_open -> closed -> draw_completed
*/

CREATE TABLE IF NOT EXISTS rooms (
    id                SERIAL PRIMARY KEY,
    room_code         VARCHAR(10) UNIQUE NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closes_at         TIMESTAMPTZ NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'registration_open',
    draw_completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS participants (
    id                SERIAL PRIMARY KEY,
    room_id           INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name              VARCHAR(100) NOT NULL,
    secret_code_hash  VARCHAR(255) NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(room_id, name)
);

CREATE TABLE IF NOT EXISTS assignments (
    id                      SERIAL PRIMARY KEY,
    room_id                 INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    giver_participant_id    INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    receiver_participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(room_id, giver_participant_id)
);

CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_participants_room_id ON participants(room_id);
CREATE INDEX IF NOT EXISTS idx_assignments_room_id ON assignments(room_id);
CREATE INDEX IF NOT EXISTS idx_assignments_giver ON assignments(giver_participant_id);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- The Express backend connects with a privileged role and handles all authorization.
-- These permissive policies are safe because the frontend never accesses the DB directly.

DROP POLICY IF EXISTS "anon_all_rooms" ON rooms;
CREATE POLICY "anon_all_rooms" ON rooms FOR SELECT
    TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_rooms" ON rooms;
CREATE POLICY "anon_insert_rooms" ON rooms FOR INSERT
    TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_rooms" ON rooms;
CREATE POLICY "anon_update_rooms" ON rooms FOR UPDATE
    TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_rooms" ON rooms;
CREATE POLICY "anon_delete_rooms" ON rooms FOR DELETE
    TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_all_participants" ON participants;
CREATE POLICY "anon_all_participants" ON participants FOR SELECT
    TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_participants" ON participants;
CREATE POLICY "anon_insert_participants" ON participants FOR INSERT
    TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_participants" ON participants;
CREATE POLICY "anon_delete_participants" ON participants FOR DELETE
    TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_all_assignments" ON assignments;
CREATE POLICY "anon_all_assignments" ON assignments FOR SELECT
    TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_assignments" ON assignments;
CREATE POLICY "anon_insert_assignments" ON assignments FOR INSERT
    TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_assignments" ON assignments;
CREATE POLICY "anon_delete_assignments" ON assignments FOR DELETE
    TO anon, authenticated USING (true);
