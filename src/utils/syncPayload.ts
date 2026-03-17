/**
 * Normalizes a server response into a flat data payload.
 *
 * The Cloudflare Workers backend returns:
 *   `{ success: true, data: [{ key: "whistler_data", value: "<json-string>" }] }`
 *
 * Also handles legacy/fallback formats:
 *   - `{ value: <data> }`
 *   - `{ value: { value: <data> } }` (double-nested)
 *   - `{ value: "<json-string>" }`
 *   - Raw data object (no envelope)
 *
 * Returns `null` when the response cannot be parsed.
 */
export function normalizeServerDataPayload(json: unknown): Record<string, any> | null {
    if (!json || typeof json !== 'object') return null;

    const obj = json as Record<string, unknown>;

    // ── Primary format: { success, data: [{ key, value }] } ──────────────
    if (Array.isArray(obj.data)) {
        const entry = obj.data.find(
            (item: any) => item && typeof item === 'object' && item.key === 'whistler_data'
        );
        if (entry) {
            let payload: unknown = (entry as Record<string, unknown>).value;
            if (typeof payload === 'string') {
                try {
                    payload = JSON.parse(payload);
                } catch {
                    return null;
                }
            }
            if (payload && typeof payload === 'object') {
                return payload as Record<string, any>;
            }
        }
        return null;
    }

    // ── Fallback: { value: <data> } envelope ─────────────────────────────
    let value: unknown = obj.value;

    // No `value` key — maybe the object itself is the raw data.
    if (value === undefined) {
        if ('projects' in obj || 'files' in obj || 'collections' in obj || 'lastModified' in obj) {
            return obj as Record<string, any>;
        }
        return null;
    }

    // Double-nested: { value: { value: <data> } }
    if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
        value = (value as { value?: unknown }).value;
    }

    if (typeof value === 'string') {
        try {
            value = JSON.parse(value);
        } catch {
            return null;
        }
    }

    if (!value || typeof value !== 'object') return null;
    return value as Record<string, any>;
}
