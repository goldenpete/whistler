/**
 * Normalizes a server response into a flat data payload.
 *
 * Handles backward-compatible envelope formats:
 *   - `{ value: <data> }`
 *   - `{ value: { value: <data> } }` (double-nested legacy)
 *   - `{ value: "<json-string>" }`
 *
 * Returns `null` when the response cannot be parsed.
 */
export function normalizeServerDataPayload(json: unknown): Record<string, any> | null {
    if (!json || typeof json !== 'object') return null;

    let value: unknown = (json as { value?: unknown }).value;

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
