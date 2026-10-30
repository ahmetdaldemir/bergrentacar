-- Migration: Add deleted_at column to currencies table
-- This column is needed because Currency entity extends BaseEntity which includes deletedAt
-- Run this SQL manually in production if DB_SYNC is false

ALTER TABLE currencies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- Optional: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_currencies_deleted_at ON currencies(deleted_at) WHERE deleted_at IS NULL;
