/**
 * Normalizes a server response into a flat data payload.
 *
 * Handles multiple envelope formats the Cloudflare Workers backend may return:
 *   - `{ value: <data> }`
 *   - `{ value: { value: <data> } }` (double-nested legacy)
 *   - `{ value: "<json-string>" }`
 *   - `{ key: "...", value: <data> }` (KV-style)
 *   - Raw data object (no envelope at all)
 *
 * Returns `null` when the response cannot be parsed.
 */
export function normalizeServerDataPayload(json: unknown): Record<string, any> | null {
    if (!json || typeof json !== 'object') return null;

    const obj = json as Record<string, unknown>;

    let value: unknown = obj.value;

    // If there is no `value` key but the object itself looks like sync data
    // (has known data fields), treat it as the payload directly.
    if (value === undefined) {
        if ('projects' in obj || 'files' in obj || 'collections' in obj || 'lastModified' in obj) {
            return obj as Record<string, any>;
        }
        return null;
    }

    // Backward compatibility: some responses may nest the payload one level deeper.
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
