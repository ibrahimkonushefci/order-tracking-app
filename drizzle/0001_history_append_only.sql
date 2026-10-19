-- Historiku is append-only (spec: Quality requirements). Records can be edited or deleted;
-- the history itself never changes.
CREATE OR REPLACE FUNCTION history_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'history is append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER history_no_update_delete
  BEFORE UPDATE OR DELETE ON "history"
  FOR EACH ROW EXECUTE FUNCTION history_append_only();
