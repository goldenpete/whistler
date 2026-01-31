
/**
 * Basic HTML Sanitizer
 * 
 * Removes dangerous tags and attributes to prevent XSS.
 * Note: For production use with high-risk input, consider using a library like DOMPurify.
 */
export function sanitizeHTML(html: string): string {
    if (!html) return "";

    // Parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // List of tags to remove entirely
    const dangerousTags = [
        'script', 'iframe', 'object', 'embed', 'link', 'style', 'meta', 'base', 'form', 'input', 'button'
    ];

    // Remove dangerous tags
    dangerousTags.forEach(tag => {
        const elements = doc.querySelectorAll(tag);
        elements.forEach(el => el.remove());
    });

    // Walk all elements to check attributes
    const allElements = doc.body.querySelectorAll('*');
    allElements.forEach(el => {
        // Check all attributes
        const attributes = Array.from(el.attributes);
        attributes.forEach(attr => {
            const name = attr.name.toLowerCase();
            const value = attr.value.toLowerCase();

            // Remove event handlers (on*)
            if (name.startsWith('on')) {
                el.removeAttribute(name);
            }

            // Remove javascript: protocol in href/src
            if ((name === 'href' || name === 'src') && value.trim().startsWith('javascript:')) {
                el.removeAttribute(name);
            }
        });
    });

    return doc.body.innerHTML;
}
