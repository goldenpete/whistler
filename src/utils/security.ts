import DOMPurify from 'dompurify';

/**
 * Basic HTML Sanitizer
 * 
 * Removes dangerous tags and attributes to prevent XSS.
 * Uses DOMPurify for robust sanitization.
 */
export function sanitizeHTML(html: string): string {
    if (!html) return "";

    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
            'p', 'br', 'b', 'i', 'u', 'em', 'strong', 'a', 'ul', 'ol', 'li', 
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'span', 'div'
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
    });
}

/**
 * Validates a URL to ensure it uses safe protocols.
 * Prevents javascript: and other URI-based attacks.
 */
export function isValidUrl(url: string): boolean {
    if (!url) return false;
    try {
        const parsed = new URL(url);
        return ['http:', 'https:', 'blob:', 'data:'].includes(parsed.protocol);
    } catch {
        // Fallback for relative URLs or partial URLs
        return !url.toLowerCase().startsWith('javascript:');
    }
}
