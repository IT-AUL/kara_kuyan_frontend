# Change: durable-outbox

- **ID:** durable-outbox
- **Status:** active
- **Created:** 2026-09-19
- **Owner (lead):** Claude
- **One-line goal:** Saved sheet results survive app restarts and reach the backend reliably: an atomic "result + outbox row" write in SQLite, a recoverable sync state machine with backoff, and idempotent sending — verified with an offline class batch and a process kill.
- **Blocker (if parked):** —
