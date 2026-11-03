-- audit_events is the permanent history (FEATURES.md F13). A trigger rejects
-- every UPDATE and DELETE, whichever database user the app connects as.
-- Production should also REVOKE UPDATE, DELETE on this table from the app role
-- (see docs/decisions/0005-audit-events-append-only.md).
CREATE FUNCTION reject_audit_event_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION reject_audit_event_change();
