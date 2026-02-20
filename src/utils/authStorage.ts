/**
 * ─── authStorage.ts ──────────────────────────────────────────────────────────
 *
 * Centralised accessor for Whistler auth/sync credentials stored in
 * `localStorage`. Consolidates scattered `localStorage.getItem/setItem/
 * removeItem` calls for the five credential keys:
 *
 *   - `whistler_account_id`     — server-side account identifier
 *   - `whistler_session_token`  — JWT / session bearer token
 *   - `whistler_last_sync`      — ISO timestamp of last successful sync
 *   - `whistler_display_name`   — user-chosen display name
 *   - `whistler_totp_enabled`   — whether 2FA (TOTP) is active ("true"/"false")
 *
 * Usage
 * ─────
 *   import { authStorage } from "@/utils/authStorage";
 *
 *   const creds = authStorage.getCredentials();
 *   authStorage.setCredentials({ accountId: "...", token: "..." });
 *   authStorage.clearCredentials();
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Key Constants ────────────────────────────────────────────────────────────

const KEYS = {
    accountId: "whistler_account_id",
    token: "whistler_session_token",
    lastSync: "whistler_last_sync",
    displayName: "whistler_display_name",
    totpEnabled: "whistler_totp_enabled",
} as const;

// ── Types ────────────────────────────────────────────────────────────────────

export interface AuthCredentials {
    accountId: string | null;
    token: string | null;
    lastSync: string | null;
    displayName: string | null;
    totpEnabled: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function get(key: string): string | null {
    return localStorage.getItem(key);
}

function set(key: string, value: string): void {
    localStorage.setItem(key, value);
}

function remove(key: string): void {
    localStorage.removeItem(key);
}

// ── Public API ───────────────────────────────────────────────────────────────

export const authStorage = {
    /** Read all auth/sync credentials at once. */
    getCredentials(): AuthCredentials {
        return {
            accountId: get(KEYS.accountId),
            token: get(KEYS.token),
            lastSync: get(KEYS.lastSync),
            displayName: get(KEYS.displayName),
            totpEnabled: get(KEYS.totpEnabled) === "true",
        };
    },

    // ── Individual getters ───────────────────────────────────────────────

    getAccountId(): string | null {
        return get(KEYS.accountId);
    },

    getToken(): string | null {
        return get(KEYS.token);
    },

    getLastSync(): string | null {
        return get(KEYS.lastSync);
    },

    getDisplayName(): string | null {
        return get(KEYS.displayName);
    },

    isTotpEnabled(): boolean {
        return get(KEYS.totpEnabled) === "true";
    },

    // ── Individual setters ───────────────────────────────────────────────

    setAccountId(value: string): void {
        set(KEYS.accountId, value);
    },

    setToken(value: string): void {
        set(KEYS.token, value);
    },

    setLastSync(value: string): void {
        set(KEYS.lastSync, value);
    },

    setDisplayName(value: string): void {
        if (value) {
            set(KEYS.displayName, value);
        } else {
            remove(KEYS.displayName);
        }
    },

    setTotpEnabled(value: boolean): void {
        if (value) {
            set(KEYS.totpEnabled, "true");
        } else {
            remove(KEYS.totpEnabled);
        }
    },

    // ── Batch operations ─────────────────────────────────────────────────

    /** Set account + token + optional display name after login/register. */
    setCredentials(creds: {
        accountId: string;
        token: string;
        displayName?: string;
    }): void {
        set(KEYS.accountId, creds.accountId);
        set(KEYS.token, creds.token);
        if (creds.displayName) {
            set(KEYS.displayName, creds.displayName);
        }
    },

    /** Clear all auth credentials (logout). Leaves `lastSync` intact. */
    clearCredentials(): void {
        remove(KEYS.accountId);
        remove(KEYS.token);
        remove(KEYS.displayName);
        remove(KEYS.totpEnabled);
    },
} as const;
