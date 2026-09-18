/*
# Create perform_draw function

1. New Functions
- `perform_draw(room_id_param int)`: Atomically performs the secret santa draw
  - Locks the room row to prevent concurrent draws
  - Checks if draw already exists (returns 'already_done')
  - Checks if enough participants (returns 'not_enough' if < 2)
  - Generates a valid derangement (no one gets themselves)
  - Inserts all assignments
  - Updates room status to 'draw_completed'
  - Returns 'ok' on success

2. Security
- Function is callable by anon and authenticated roles (the Express backend calls it)
- All authorization logic is in the Express API layer

3. Important Notes
- Uses a retry loop to find a valid derangement (up to 1000 attempts)
- Falls back to a rotation if no valid derangement is found (guaranteed valid for 2+ participants)
- The entire operation is atomic via BEGIN/COMMIT inside the function
*/

CREATE OR REPLACE FUNCTION perform_draw(room_id_param int)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    room_status varchar;
    participant_ids int[];
    n int;
    shuffled int[];
    i int;
    j int;
    temp int;
    valid boolean;
    attempt int;
    existing_count int;
BEGIN
    -- Lock the room row
    SELECT status INTO room_status FROM rooms WHERE id = room_id_param FOR UPDATE;
    IF NOT FOUND THEN
        RETURN 'room_not_found';
    END IF;

    -- Check if draw already exists
    SELECT count(*) INTO existing_count FROM assignments WHERE room_id = room_id_param;
    IF existing_count > 0 THEN
        RETURN 'already_done';
    END IF;

    -- Get participants
    SELECT array_agg(id ORDER BY id) INTO participant_ids
    FROM participants WHERE room_id = room_id_param;

    n := array_length(participant_ids, 1);
    IF n IS NULL OR n < 2 THEN
        RETURN 'not_enough';
    END IF;

    -- Try to find a valid derangement (no one gets themselves)
    valid := false;
    FOR attempt IN 1..1000 LOOP
        -- Shuffle
        shuffled := participant_ids;
        FOR i IN REVERSE n..2 LOOP
            j := floor(random() * i + 1)::int;
            temp := shuffled[i];
            shuffled[i] := shuffled[j];
            shuffled[j] := temp;
        END LOOP;

        -- Check validity
        valid := true;
        FOR i IN 1..n LOOP
            IF participant_ids[i] = shuffled[i] THEN
                valid := false;
                EXIT;
            END IF;
        END LOOP;

        IF valid THEN
            EXIT;
        END IF;
    END LOOP;

    -- Fallback: rotate by 1 (guaranteed valid for 2+ participants)
    IF NOT valid THEN
        shuffled := participant_ids;
        FOR i IN 1..n LOOP
            shuffled[i] := participant_ids[(i % n) + 1];
        END LOOP;
    END IF;

    -- Insert assignments
    FOR i IN 1..n LOOP
        INSERT INTO assignments (room_id, giver_participant_id, receiver_participant_id)
        VALUES (room_id_param, participant_ids[i], shuffled[i]);
    END LOOP;

    -- Update room status
    UPDATE rooms
    SET status = 'draw_completed', draw_completed_at = NOW()
    WHERE id = room_id_param;

    RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION perform_draw(int) TO anon, authenticated;
