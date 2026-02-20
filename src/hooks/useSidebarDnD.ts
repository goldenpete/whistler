/**
 * ─── useSidebarDnD.ts ────────────────────────────────────────────────────────
 *
 * Custom hook encapsulating all drag-and-drop reorder logic for the
 * ProjectSidebar. Handles:
 *   - Collection reordering within same parent
 *   - Collection moving between different parents / buckets
 *   - Collection nesting into folders
 *   - Storage, Doc, and Graph list reordering
 *
 * Returns dnd-kit `sensors`, event handlers, and the current `activeDragId`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import {
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useStore } from "@/store/useStore";
import type { Collection, Storage, Doc, Graph as GraphType } from "@/types";

interface UseSidebarDnDParams {
    collections: Collection[];
    storages: Storage[];
    docs: Doc[];
    graphs: GraphType[];
    activeProjectId: string | null;
    activeCollectionId: string | null;
}

export function useSidebarDnD({
    collections,
    storages,
    docs,
    graphs,
    activeProjectId,
    activeCollectionId,
}: UseSidebarDnDParams) {
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string);
    };

    const handleDragCancel = () => {
        setActiveDragId(null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id || !activeProjectId) return;

        // Try Collections
        const projectCollections = collections.filter((c: Collection) => c.projectId === activeProjectId && !c.deleted);
        const activeCollection = projectCollections.find((c: Collection) => c.id === active.id);
        
        if (activeCollection) {
            // Check for root drop zone or dropping on header
            if (over.id === "folder-nest-root" || over.id === "collections-root-header") {
                 // Move to current bucket root if not already there
                 if (!activeCollectionId) return;
                 if (activeCollection.parentId === null) return;

                 if (activeCollection.parentId !== activeCollectionId) {
                     const oldSiblings = projectCollections
                        .filter(c => c.parentId === activeCollection.parentId && c.id !== activeCollection.id)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));

                     const rootSiblings = projectCollections
                        .filter(c => c.parentId === activeCollectionId)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));

                     const targetIndex = rootSiblings.length;
                     const updates: { id: string, changes: Partial<Collection> }[] = [];

                     oldSiblings.forEach((c, index) => {
                         updates.push({ id: c.id, changes: { order: index } });
                     });

                     updates.push({ 
                         id: activeCollection.id, 
                         changes: { parentId: activeCollectionId, order: targetIndex, lastModified: Date.now() } 
                     });

                     useStore.setState((state) => ({
                         collections: state.collections.map((c: Collection) => {
                             const update = updates.find(u => u.id === c.id);
                             return update ? { ...c, ...update.changes } : c;
                         })
                     }));
                 }
                 return;
            }

            // Check for nesting
            if (over.id.toString().startsWith("folder-nest-")) {
                const newParentId = over.id.toString().replace("folder-nest-", "");
                let effectiveParentId = newParentId === "root" ? activeCollectionId : newParentId;

                if (!effectiveParentId && newParentId === "root") {
                    const firstBucket = projectCollections.find(c => c.type === 'bucket' && !c.deleted);
                    if (firstBucket) {
                        effectiveParentId = firstBucket.id;
                        useStore.setState({ activeCollectionId: firstBucket.id });
                    }
                }

                if (!effectiveParentId) return;

                if (effectiveParentId !== activeCollection.id) {
                     const targetSiblings = projectCollections
                        .filter(c => c.parentId === effectiveParentId)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));
                     
                     const newOrder = targetSiblings.length;

                     useStore.setState((state) => ({
                        collections: state.collections.map((c: Collection) => 
                            c.id === activeCollection.id 
                                ? { 
                                    ...c, 
                                    parentId: effectiveParentId, 
                                    order: newOrder, 
                                    lastModified: Date.now() 
                                  } 
                                : c
                        )
                    }));
                }
                return;
            }

            const overCollection = projectCollections.find((c: Collection) => c.id === over.id);
            if (overCollection) {
                // NEVER move a bucket inside another item
                if (activeCollection.type === 'bucket') {
                    if (overCollection.type === 'bucket') {
                        const siblings = projectCollections
                            .filter(c => c.type === 'bucket')
                            .sort((a, b) => (a.order || 0) - (b.order || 0));
                        
                        const oldIndex = siblings.findIndex(c => c.id === activeCollection.id);
                        const newIndex = siblings.findIndex(c => c.id === overCollection.id);
                        
                        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                            const newSiblings = arrayMove(siblings, oldIndex, newIndex);
                            const updates = newSiblings.map((c, index) => ({
                                id: c.id,
                                changes: { order: index }
                            }));
                            
                            useStore.setState((state) => ({
                                collections: state.collections.map((c: Collection) => {
                                    const update = updates.find(u => u.id === c.id);
                                    return update ? { ...c, ...update.changes } : c;
                                })
                            }));
                        }
                    }
                    return;
                }

                // If dropping on a bucket, move inside it
                if (overCollection.type === 'bucket') {
                    const targetSiblings = projectCollections
                        .filter(c => c.parentId === overCollection.id)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));
                    
                    useStore.setState((state) => ({
                        collections: state.collections.map((c: Collection) => 
                            c.id === activeCollection.id 
                                ? { ...c, parentId: overCollection.id, order: targetSiblings.length, lastModified: Date.now() } 
                                : c
                        )
                    }));
                    return;
                }

                // Reordering or Moving between lists
                if (activeCollection.parentId === overCollection.parentId) {
                    // Same parent: Reorder
                    const siblings = projectCollections
                        .filter(c => c.parentId === activeCollection.parentId)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));
                    
                    const oldIndex = siblings.findIndex(c => c.id === activeCollection.id);
                    const newIndex = siblings.findIndex(c => c.id === overCollection.id);
                    
                    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                        const newSiblings = arrayMove(siblings, oldIndex, newIndex);
                        const updates = newSiblings.map((c, index) => ({
                            id: c.id,
                            changes: { order: index }
                        }));
                        
                        useStore.setState((state) => ({
                            collections: state.collections.map((c: Collection) => {
                                const update = updates.find(u => u.id === c.id);
                                return update ? { ...c, ...update.changes } : c;
                            })
                        }));
                    }
                } else {
                    // Different parent: Move item to new list
                    const oldSiblings = projectCollections
                        .filter(c => c.parentId === activeCollection.parentId && c.id !== activeCollection.id)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));
                    
                    const newSiblings = projectCollections
                        .filter(c => c.parentId === overCollection.parentId)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));
                    
                    const targetIndex = newSiblings.findIndex(c => c.id === overCollection.id);
                    newSiblings.splice(targetIndex, 0, { ...activeCollection, parentId: overCollection.parentId });
                    
                    const updates: { id: string, changes: Partial<Collection> }[] = [];
                    
                    oldSiblings.forEach((c, index) => {
                        updates.push({ id: c.id, changes: { order: index } });
                    });
                    
                    newSiblings.forEach((c, index) => {
                        updates.push({ id: c.id, changes: { order: index, parentId: overCollection.parentId } });
                    });
                    
                    useStore.setState((state) => ({
                        collections: state.collections.map((c: Collection) => {
                            const update = updates.find(u => u.id === c.id);
                            if (c.id === activeCollection.id) {
                                return { ...c, parentId: overCollection.parentId, order: targetIndex, lastModified: Date.now() };
                            }
                            return update ? { ...c, ...update.changes } : c;
                        })
                    }));
                }
                return;
            }
        }

        // Try Storages
        const projectStoragesList = storages.filter((s: Storage) => s.projectId === activeProjectId && !s.deleted);
        const storageOldIndex = projectStoragesList.findIndex((s: Storage) => s.id === active.id);

        if (storageOldIndex !== -1) {
             const storageNewIndex = projectStoragesList.findIndex((s: Storage) => s.id === over.id);
             if (storageNewIndex !== -1) {
                 const reordered = arrayMove(projectStoragesList, storageOldIndex, storageNewIndex);
                 const otherStorages = storages.filter((s: Storage) => !(s.projectId === activeProjectId && !s.deleted));
                 useStore.setState({ storages: [...otherStorages, ...reordered] });
                 return;
             }
        }

        // Try Docs
        const projectDocsList = docs.filter((d: Doc) => d.projectId === activeProjectId && !d.deleted);
        const docOldIndex = projectDocsList.findIndex((d: Doc) => d.id === active.id);

        if (docOldIndex !== -1) {
            const docNewIndex = projectDocsList.findIndex((d: Doc) => d.id === over.id);
            if (docNewIndex !== -1) {
                const reordered = arrayMove(projectDocsList, docOldIndex, docNewIndex);
                const otherDocs = docs.filter((d: Doc) => !(d.projectId === activeProjectId && !d.deleted));
                useStore.setState({ docs: [...otherDocs, ...reordered] });
                return;
            }
        }

        // Try Graphs
        const projectGraphsList = graphs.filter((g: GraphType) => g.projectId === activeProjectId && !g.deleted);
        const graphOldIndex = projectGraphsList.findIndex((g: GraphType) => g.id === active.id);
        
        if (graphOldIndex !== -1) {
            const graphNewIndex = projectGraphsList.findIndex((g: GraphType) => g.id === over.id);
            if (graphNewIndex !== -1) {
                const reordered = arrayMove(projectGraphsList, graphOldIndex, graphNewIndex);
                const otherGraphs = graphs.filter((g: GraphType) => !(g.projectId === activeProjectId && !g.deleted));
                useStore.setState({ graphs: [...otherGraphs, ...reordered] });
                return;
            }
        }
        setActiveDragId(null);
    };

    return { sensors, handleDragStart, handleDragEnd, handleDragCancel, activeDragId };
}
