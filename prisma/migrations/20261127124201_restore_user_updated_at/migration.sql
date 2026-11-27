-- Restore the database-owned timestamp invariant after the owner init baseline.
-- The init migration is deliberately not edited, preserving its applied checksum.
BEGIN;
DO $$ BEGIN
  IF current_setting('server_version_num')::integer < 180000 THEN
    RAISE EXCEPTION 'Skyinnk requires PostgreSQL 18 or newer (native uuidv7)';
  END IF;
END $$;
CREATE FUNCTION set_user_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = clock_timestamp();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER user_updated_at_trigger
BEFORE UPDATE ON "User"
FOR EACH ROW EXECUTE FUNCTION set_user_updated_at();
COMMIT;
