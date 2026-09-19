import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const submissions = sqliteTable('submissions', {
  uuid: text('uuid').primaryKey(),
  assignmentId: text('assignment_id').notNull(),
  classId: text('class_id').notNull(),
  /** The documented submission JSON: characters, statuses, confidences, scores. Never image data. */
  payloadJson: text('payload_json').notNull(),
  savedAt: integer('saved_at').notNull(),
});

export const outbox = sqliteTable(
  'outbox',
  {
    submissionUuid: text('submission_uuid')
      .primaryKey()
      .references(() => submissions.uuid),
    status: text('status', { enum: ['pending', 'syncing', 'synced', 'failed'] }).notNull(),
    attempts: integer('attempts').notNull(),
    nextAttemptAt: integer('next_attempt_at').notNull(),
    lastError: text('last_error'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('outbox_due_idx').on(t.status, t.nextAttemptAt)],
);
