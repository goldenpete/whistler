/**
 * ─── collectionUtils.ts ────────────────────────────────────────────
 *
 * Utility helpers for working with the nested collection/bucket
 * hierarchy used to organize media files within projects.
 *
 * Exports:
 *   - findRootBucketId() – Recursively climbs the collection tree
 *     to find the root bucket ancestor of a given collection.
 * ───────────────────────────────────────────────────────────────────
 */
import { type Collection, type Highlight } from "@/types";

/**
 * Returns true when a collection node is a leaf collection that can hold highlights.
 * Buckets and folders are structural nodes only.
 */
export const isLeafCollection = (collection: Collection): boolean => {
    return collection.type !== 'bucket' && collection.type !== 'folder';
};

/**
 * Normalizes a highlight collection target to a valid leaf collection id.
 * Returns null for buckets, folders, deleted collections, or missing ids.
 */
export const normalizeLeafCollectionId = (
    collections: Collection[],
    collectionId: string | null | undefined
): string | null => {
    if (!collectionId) return null;

    const collection = collections.find((item) => item.id === collectionId && !item.deleted);
    return collection && isLeafCollection(collection) ? collection.id : null;
};

/**
 * Repairs highlight collection references so they only point to leaf collections.
 * Invalid assignments are cleared to null.
 */
export const sanitizeHighlightCollectionIds = (
    collections: Collection[],
    highlights: Highlight[]
): Highlight[] => {
    let changed = false;

    const sanitized = highlights.map((highlight) => {
        const collectionId = normalizeLeafCollectionId(collections, highlight.collectionId);
        if (collectionId === highlight.collectionId) {
            return highlight;
        }

        changed = true;
        return {
            ...highlight,
            collectionId,
        };
    });

    return changed ? sanitized : highlights;
};

/**
 * Finds the root bucket ID for a given collection item.
 * A bucket is a root-level item (parentId: null) with type 'bucket'.
 */
export const findRootBucketId = (collections: Collection[], collectionId: string | null): string | null => {
    if (!collectionId) return null;
    
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return null;
    
    // If it's a bucket, it's the root
    if (collection.type === 'bucket') return collection.id;
    
    // If it has no parent but isn't a bucket, it's an orphan or root-level item that shouldn't exist in the new hierarchy
    // but for safety we return null
    if (!collection.parentId) return null;
    
    // Recursive climb
    return findRootBucketId(collections, collection.parentId);
};
