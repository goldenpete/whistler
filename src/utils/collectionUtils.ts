import { type Collection } from "@/types";

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
