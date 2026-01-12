-- Whistler Sync Database Schema
-- Run this to initialize the D1 database

-- Accounts table: stores anonymous 16-digit account IDs
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL
);

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
