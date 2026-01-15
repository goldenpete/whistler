-- Whistler Sync Database Schema
-- Run this to initialize the D1 database

-- Accounts table: stores anonymous 16-digit account IDs
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    totp_secret TEXT DEFAULT NULL,
    totp_enabled INTEGER DEFAULT 0,
    display_name TEXT DEFAULT NULL
);

-- Add display_name column if it doesn't exist (for existing tables)
ALTER TABLE accounts ADD COLUMN display_name TEXT DEFAULT NULL;

-- User data table: stores key-value pairs per account
CREATE TABLE IF NOT EXISTS user_data (
    account_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (account_id, key),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Index for faster lookups by account_id
CREATE INDEX IF NOT EXISTS idx_user_data_account ON user_data(account_id);

-- Rate limiting table: tracks requests per IP
CREATE TABLE IF NOT EXISTS rate_limits (
    ip TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    window_start INTEGER NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (ip, endpoint, window_start)
);

-- Index for cleanup of old rate limit entries
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
