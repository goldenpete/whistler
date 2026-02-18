/**
 * ─── ProjectSidebar.tsx ──────────────────────────────────────────────────────
 *
 * Main sidebar navigation component for the Whistler app.
 *
 * This is the second-largest component (~2,400 lines). It renders the
 * left-hand sidebar with two modes:
 *   - Expanded: full navigation with project selector, entity lists, folders
 *   - Slim: icon-only navigation strip
 *
 * Main sections (top to bottom):
 *   1. Logo + sidebar toggle button
 *   2. Project dropdown selector + edit/import/export
 *   3. Navigation links: Home, Storages, Docs, Graphs, Collections, Trash
 *   4. Entity lists: storages, docs, graphs under the active project
 *   5. Collection tree: folder/bucket hierarchy with drag-and-drop
 *   6. Sync status footer (extracted to sidebar/SyncStatusFooter.tsx)
 *
 * Drag-and-drop:
 *   Uses @dnd-kit for:
 *     - Reordering storages, docs, graphs within their lists
 *     - Reordering collections within folders
 *     - Moving collections between folders (nested drop targets)
 *     - DragOverlay for visual feedback during drag
 *
 * Sub-components (extracted to src/components/layout/sidebar/):
 *   - SortableEntityItem: generic drag-sortable list item (storage/doc/graph)
 *   - SidebarFolderItem: collapsible folder with nested collections
 *   - SortableCollectionItem: drag-sortable collection within a folder
 *   - SyncStatusFooter: sync status display in sidebar footer
 *
 * Key state:
 *   - expandedSections: which nav sections are collapsed/expanded
 *   - isSlim: slim vs expanded sidebar mode
 *   - openFolders: which folders in the collection tree are expanded
 *   - editingStates: inline rename state for entities
 *   - collectionDragActiveId: currently dragged collection ID
 *
 * If this file is still too large to edit, consider extracting:
 *   - ProjectSelector (project dropdown + import/export)
 *   - NavSection (individual nav link rows)
 *   - EntityListSection (storage/doc/graph list with drag context)
 *   - CollectionTreeSection (folder tree with nested DnD)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useMemo } from "react";
import type { MouseEvent as ReactMouseEvent, ChangeEvent as ReactChangeEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    SidebarSimple,
    HardDrives,
    NotePencil,
    Graph,
    FolderOpen,
    Folder,
    FolderPlus,
    Plus,
    Trash,
    MagnifyingGlass,
    ArrowsClockwise,
    PencilSimple,
    CaretDown,
    CaretLeft,
    Gear,
    Share,
    Sparkle,
    UploadSimple,
    DownloadSimple,
    ClockCounterClockwise,
} from "@phosphor-icons/react";
import {
    DndContext, 
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    pointerWithin,
    rectIntersection,
    type DragStartEvent,
    DragOverlay
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import { useKeybind } from "@/hooks/use-keybind";
import { findRootBucketId } from "@/utils/collectionUtils";

import type { Collection, Storage, AccentTheme, BaseTheme, Doc, Graph as GraphType, Project } from "@/types";
import { getIcon } from "@/utils/iconMap";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubTrigger,
    ContextMenuSubContent,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CreateCollectionDialog, EditCollectionDialog, CreateFolderDialog } from "@/components/dialogs/CollectionDialogs";
import { CreateStorageDialog, EditStorageDialog, EditGraphDialog, EditDocDialog } from "@/components/dialogs/StorageDialogs";
import { NewDocDialog, NewGraphDialog } from "@/components/dialogs/CreationDialogs";
import { EditProjectDialog } from "@/components/dialogs/EditProjectDialog";
import { SidebarHistory } from "@/components/layout/SidebarHistory";
import { SidebarTrash } from "@/components/layout/SidebarTrash";
import { SidebarSync } from "@/components/layout/SidebarSync";
import { PiPPlayer } from "@/components/player/PiPPlayer";
import { exportProject, importProject, type ProjectExportData } from "@/utils/projectData";
import { playSfx } from "@/utils/sound";
import { WhistlerLogo } from "@/components/ui/WhistlerLogo";

// ── Extracted sidebar sub-components ─────────────────────────────────────────
// These components are in separate files for easier AI editing and readability.
// See src/components/layout/sidebar/ for individual component files.
import { SortableEntityItem } from "@/components/layout/sidebar/SortableEntityItem";
import { SidebarFolderItem } from "@/components/layout/sidebar/SidebarFolderItem";
import { SortableCollectionItem } from "@/components/layout/sidebar/SortableCollectionItem";
import { SyncStatusFooter } from "@/components/layout/sidebar/SyncStatusFooter";

/* NOTE: SortableStorageItem, SortableDocItem, SortableGraphItem have been
 * unified into the generic <SortableEntityItem> component. Each entity type
 * (storage, doc, graph) now uses the same component with different props. */

export default function ProjectSidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const currentFolderId = searchParams.get('folderId');

    const {
        projects,
        activeCollectionId,
        activeProjectId,
        collections,
        storages,
        activeStorageId,
        docs,
        activeDocId,
        graphs,
        activeGraphId,
        addProject,
        addStorage,
        updateStorage,
        deleteStorage,
        setActiveProject,
        updateCollection,
        updateGraph,
        trashGraph,
        updateDoc,
        trashDoc,
        updateProject,
        deleteProject,
        trashCollection,
        pipFileId,
        isPipOpen,
        isSidebarCollapsed,
        toggleSidebarCollapse,
        sidebarMode,
        setSidebarMode,
        syncStatus,
        sidebarView,
        setSidebarView,
        accentTheme,
    } = useStore(useShallow((state) => ({
        projects: state.projects,
        activeCollectionId: state.activeCollectionId,
        activeProjectId: state.activeProjectId,
        collections: state.collections,
        storages: state.storages,
        activeStorageId: state.activeStorageId,
        docs: state.docs,
        activeDocId: state.activeDocId,
        graphs: state.graphs,
        activeGraphId: state.activeGraphId,
        addProject: state.addProject,
        addStorage: state.addStorage,
        updateStorage: state.updateStorage,
        deleteStorage: state.deleteStorage,
        setActiveProject: state.setActiveProject,
        updateCollection: state.updateCollection,
        updateGraph: state.updateGraph,
        trashGraph: state.trashGraph,
        updateDoc: state.updateDoc,
        trashDoc: state.trashDoc,
        updateProject: state.updateProject,
        deleteProject: state.deleteProject,
        trashCollection: state.trashCollection,
        pipFileId: state.pipFileId,
        isPipOpen: state.isPipOpen,
        isSidebarCollapsed: state.isSidebarCollapsed,
        toggleSidebarCollapse: state.toggleSidebarCollapse,
        sidebarMode: state.sidebarMode,
        setSidebarMode: state.setSidebarMode,
        syncStatus: state.syncStatus,
        sidebarView: state.sidebarView,
        setSidebarView: state.setSidebarView,
        accentTheme: state.accentTheme,
    })));

    const activeCollection = collections.find((c: Collection) => c.id === activeCollectionId);

    // Slim mode is active when sidebar is collapsed and mode is set to 'slim'
    const isSlim = isSidebarCollapsed && sidebarMode === 'slim';

    const [projectsOpen, setProjectsOpen] = useState(true);
    const [assetsOpen, setAssetsOpen] = useState(true);
    const [rootCollectionsOpen, setRootCollectionsOpen] = useState(true);
    const [folderCollapsedById, setFolderCollapsedById] = useState<Record<string, boolean>>({});
    const [collectionsSectionOpen, setCollectionsSectionOpen] = useState(true);
    const [createCollectionOpen, setCreateCollectionOpen] = useState(false);
    const [createFolderOpen, setCreateFolderOpen] = useState(false);
    const [createStorageOpen, setCreateStorageOpen] = useState(false);
    // Edit State
    const [editCollectionOpen, setEditCollectionOpen] = useState(false);
    const [collectionToEdit, setCollectionToEdit] = useState<Collection | null>(null);
    const [editStorageOpen, setEditStorageOpen] = useState(false);
    const [storageToEdit, setStorageToEdit] = useState<Storage | null>(null);
    const [editGraphOpen, setEditGraphOpen] = useState(false);
    const [graphToEdit, setGraphToEdit] = useState<any | null>(null);
    const [renameDocOpen, setRenameDocOpen] = useState(false);
    const [docToRename, setDocToRename] = useState<any | null>(null);
    const [editProjectOpen, setEditProjectOpen] = useState(false);
    const [newDocOpen, setNewDocOpen] = useState(false);
    const [newGraphOpen, setNewGraphOpen] = useState(false);
    const [newProjectOpen, setNewProjectOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string);
    };

    const handleDragCancel = () => {
        setActiveDragId(null);
    };



    const handleEditGraph = (e: ReactMouseEvent, graph: any) => {
        e.stopPropagation();
        setGraphToEdit(graph);
        setEditGraphOpen(true);
    };

    const handleDeleteGraph = (e: ReactMouseEvent, id: string) => {
        e.stopPropagation();
        trashGraph(id);
    };

    const handleRenameDoc = (e: ReactMouseEvent, doc: any) => {
        e.stopPropagation();
        setDocToRename(doc);
        setRenameDocOpen(true);
    };

    const handleDeleteDoc = (e: ReactMouseEvent, id: string) => {
        e.stopPropagation();
        trashDoc(id);
    };

    const projectStorages = useMemo(() => storages.filter((s: Storage) => s.projectId === activeProjectId && !s.deleted), [storages, activeProjectId]);
    const projectDocs = useMemo(() => docs.filter((d: Doc) => d.projectId === activeProjectId && !d.deleted), [docs, activeProjectId]);
    const projectGraphs = useMemo(() => graphs.filter((g: GraphType) => g.projectId === activeProjectId && !g.deleted), [graphs, activeProjectId]);
    const projectCollections = useMemo(() => collections.filter((c: Collection) => c.projectId === activeProjectId && !c.deleted), [collections, activeProjectId]);

    // Sidebar Tab Navigation (Unifying Keybind)
    useKeybind("nav.nextItem", () => {
        playSfx('cursor');
        const sidebarEnabled = ['storage', 'docs', 'graphs'].includes(sidebarView);

        if (location.pathname === '/storage') {
            if (projectStorages.length > 0) {
                const currentIndex = projectStorages.findIndex(s => s.id === activeStorageId);
                const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % projectStorages.length;
                handleSelectStorage(projectStorages[nextIndex].id);
                if (sidebarEnabled) setSidebarView('storage');
            }
        } else if (location.pathname.startsWith('/docs')) {
            if (projectDocs.length > 0) {
                const currentIndex = projectDocs.findIndex(d => d.id === activeDocId);
                const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % projectDocs.length;
                handleSelectDoc(projectDocs[nextIndex].id);
                if (sidebarEnabled) setSidebarView('docs');
            }
        } else if (location.pathname.startsWith('/graphs')) {
            if (projectGraphs.length > 0) {
                const currentIndex = projectGraphs.findIndex(g => g.id === activeGraphId);
                const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % projectGraphs.length;
                handleSelectGraph(projectGraphs[nextIndex].id);
                if (sidebarEnabled) setSidebarView('graphs');
            }
        }
    }, { preventDefault: true });

    useKeybind("nav.prevItem", () => {
        playSfx('cursor');
        const sidebarEnabled = ['storage', 'docs', 'graphs'].includes(sidebarView);

        if (location.pathname === '/storage') {
             if (projectStorages.length > 0) {
                const currentIndex = projectStorages.findIndex(s => s.id === activeStorageId);
                const prevIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + projectStorages.length) % projectStorages.length;
                handleSelectStorage(projectStorages[prevIndex].id);
                if (sidebarEnabled) setSidebarView('storage');
            }
        } else if (location.pathname.startsWith('/docs')) {
            if (projectDocs.length > 0) {
                const currentIndex = projectDocs.findIndex(d => d.id === activeDocId);
                const prevIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + projectDocs.length) % projectDocs.length;
                handleSelectDoc(projectDocs[prevIndex].id);
                if (sidebarEnabled) setSidebarView('docs');
            }
        } else if (location.pathname.startsWith('/graphs')) {
            if (projectGraphs.length > 0) {
                const currentIndex = projectGraphs.findIndex(g => g.id === activeGraphId);
                const prevIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + projectGraphs.length) % projectGraphs.length;
                handleSelectGraph(projectGraphs[prevIndex].id);
                if (sidebarEnabled) setSidebarView('graphs');
            }
        }
    }, { preventDefault: true });

    // Doc Navigation
    useKeybind("docs.next", () => {
        if (!location.pathname.startsWith('/docs') || projectDocs.length === 0) return;
        const currentIndex = projectDocs.findIndex(d => d.id === activeDocId);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % projectDocs.length;
        handleSelectDoc(projectDocs[nextIndex].id);
    }, { preventDefault: true });

    // Doc Navigation in Sidebar
    useKeybind("nav.listDown", () => {
        if (!location.pathname.startsWith('/docs') || projectDocs.length === 0) return;
        
        // Only if sidebar is focused
        const inSidebar = document.activeElement?.closest('[data-component="project-sidebar"]');
        if (!inSidebar) return;

        const currentIndex = projectDocs.findIndex(d => d.id === activeDocId);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % projectDocs.length;
        handleSelectDoc(projectDocs[nextIndex].id);
        
        // Try to focus the new item after a short delay to ensure render
        setTimeout(() => {
             const selector = `[data-doc-id="${projectDocs[nextIndex].id}"]`;
             const el = document.querySelector(selector) as HTMLElement;
             if (el) el.focus();
        }, 50);

    }, { preventDefault: true });

    useKeybind("nav.listUp", () => {
        if (!location.pathname.startsWith('/docs') || projectDocs.length === 0) return;

        // Only if sidebar is focused
        const inSidebar = document.activeElement?.closest('[data-component="project-sidebar"]');
        if (!inSidebar) return;

        const currentIndex = projectDocs.findIndex(d => d.id === activeDocId);
        const prevIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + projectDocs.length) % projectDocs.length;
        handleSelectDoc(projectDocs[prevIndex].id);

        // Try to focus the new item
        setTimeout(() => {
             const selector = `[data-doc-id="${projectDocs[prevIndex].id}"]`;
             const el = document.querySelector(selector) as HTMLElement;
             if (el) el.focus();
        }, 50);

    }, { preventDefault: true });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

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
                 // If no bucket is active, we can't move items here
                 if (!activeCollectionId) return;
                 
                 // If the item itself is a bucket (parentId is null), we don't move it inside another bucket via this drop zone
                 if (activeCollection.parentId === null) return;

                 if (activeCollection.parentId !== activeCollectionId) {
                     // Remove from old parent list
                     const oldSiblings = projectCollections
                        .filter(c => c.parentId === activeCollection.parentId && c.id !== activeCollection.id)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));

                     // Insert into active bucket's root list (at end)
                     const rootSiblings = projectCollections
                        .filter(c => c.parentId === activeCollectionId)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));

                     const targetIndex = rootSiblings.length;

                     // Prepare updates
                     const updates: { id: string, changes: any }[] = [];

                     // Update old siblings order
                     oldSiblings.forEach((c, index) => {
                         updates.push({ id: c.id, changes: { order: index } });
                     });

                     // Update active collection
                     updates.push({ 
                         id: activeCollection.id, 
                         changes: { parentId: activeCollectionId, order: targetIndex, lastModified: Date.now() } 
                     });

                     // Apply updates
                     useStore.setState((state: any) => ({
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
                // If dropping on "root" in the context of the sidebar tree, it means the active bucket
                let effectiveParentId = newParentId === "root" ? activeCollectionId : newParentId;

                // If no active bucket and we are dropping on root, find the first bucket
                if (!effectiveParentId && newParentId === "root") {
                    const firstBucket = projectCollections.find(c => c.type === 'bucket' && !c.deleted);
                    if (firstBucket) {
                        effectiveParentId = firstBucket.id;
                        useStore.setState({ activeCollectionId: firstBucket.id });
                    }
                }

                // NEVER move a non-bucket item to parentId null (which would make it a bucket)
                if (!effectiveParentId) return;

                // Prevent nesting into self
                if (effectiveParentId !== activeCollection.id) {
                     // Get target folder's children to determine order (put at end)
                     const targetSiblings = projectCollections
                        .filter(c => c.parentId === effectiveParentId)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));
                     
                     const newOrder = targetSiblings.length;

                     useStore.setState((state: any) => ({
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
                    // Only allow reordering with other buckets
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
                            
                            useStore.setState((state: any) => ({
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
                    // Move inside the bucket
                    const targetSiblings = projectCollections
                        .filter(c => c.parentId === overCollection.id)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));
                    
                    useStore.setState((state: any) => ({
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
                        
                        // Update order for all affected siblings
                        const updates = newSiblings.map((c, index) => ({
                            id: c.id,
                            changes: { order: index }
                        }));
                        
                        useStore.setState((state: any) => ({
                            collections: state.collections.map((c: Collection) => {
                                const update = updates.find(u => u.id === c.id);
                                return update ? { ...c, ...update.changes } : c;
                            })
                        }));
                    }
                } else {
                    // Different parent: Move item to new list
                    // Remove from old parent list
                    const oldSiblings = projectCollections
                        .filter(c => c.parentId === activeCollection.parentId && c.id !== activeCollection.id)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));
                    
                    // Insert into new parent list
                    const newSiblings = projectCollections
                        .filter(c => c.parentId === overCollection.parentId)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));
                    
                    const targetIndex = newSiblings.findIndex(c => c.id === overCollection.id);
                    
                    // Insert before target
                    newSiblings.splice(targetIndex, 0, { ...activeCollection, parentId: overCollection.parentId });
                    
                    // Prepare updates
                    const updates: { id: string, changes: any }[] = [];
                    
                    // Update old siblings order
                    oldSiblings.forEach((c, index) => {
                        updates.push({ id: c.id, changes: { order: index } });
                    });
                    
                    // Update new siblings order
                    newSiblings.forEach((c, index) => {
                        updates.push({ id: c.id, changes: { order: index, parentId: overCollection.parentId } });
                    });
                    
                    // Apply all updates
                    useStore.setState((state: any) => ({
                        collections: state.collections.map((c: Collection) => {
                            const update = updates.find(u => u.id === c.id);
                            // Ensure we update activeCollection even if not in old/new lists (it's in newSiblings now)
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

    const handleCreateStorage = () => {
        if (!activeProjectId) return;
        setCreateStorageOpen(true);
    };

    const handleCreateStorageSubmit = (name: string, color: string, icon: string) => {
        if (activeProjectId) {
            addStorage(name, activeProjectId, color, icon);
        }
    };

    const handleEditStorageClick = (e: ReactMouseEvent, storage: Storage) => {
        e.preventDefault();
        e.stopPropagation();
        setStorageToEdit(storage);
        setEditStorageOpen(true);
    };

    const handleUpdateStorage = (name: string, color: string, icon: string) => {
        if (storageToEdit) {
            updateStorage(storageToEdit.id, { name, color, icon });
        }
    };

    const handleDeleteStorage = (e: ReactMouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        deleteStorage(id);
    };



    const handleUpdateGraph = (name: string, color: string, icon: string) => {
        if (graphToEdit) {
            updateGraph(graphToEdit.id, { name, color, icon });
        }
    };

    const handleUpdateDoc = (name: string, color: string, icon: string) => {
        if (docToRename) {
            updateDoc(docToRename.id, { name, color, icon });
        }
    };

    const handleEditProjectName = () => {
        if (!activeProjectId) return;
        setEditProjectOpen(true);
    };

    const handleCreateProjectSubmit = () => {
        const name = newProjectName.trim();
        if (!name) return;
        
        // Optimistically create
        useStore.getState().addProject(name);
        
        // We'll just close the dialog. The user can switch to the new project from the dropdown.
        setNewProjectOpen(false);
        setNewProjectName("");
    };

    const handleExportProject = () => {
        if (!activeProjectId) return;
        const data = exportProject(useStore.getState(), activeProjectId);
        if (data) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const project = projects.find((p: Project) => p.id === activeProjectId);
            a.download = `whistler_export_${project?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'project'}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    const handleImportProject = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";
        input.onchange = async (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const text = await file.text();
            try {
                const data = JSON.parse(text) as ProjectExportData;
                if (!data.version || !data.project) throw new Error("Invalid project file");

                const importedData = importProject(data);

                useStore.setState((state: any) => ({
                    projects: [...state.projects, importedData.project],
                    files: [...state.files, ...importedData.files],
                    collections: [...state.collections, ...importedData.collections],
                    highlights: [...state.highlights, ...importedData.highlights],
                    graphs: [...state.graphs, ...importedData.graphs],
                    graphNodes: [...state.graphNodes, ...importedData.graphNodes],
                    graphEdges: [...state.graphEdges, ...importedData.graphEdges],
                    docs: [...state.docs, ...importedData.docs],
                    storages: [...state.storages, ...importedData.storages],
                    activeProjectId: importedData.project.id
                }));

                setImportStatus({
                    type: "success",
                    message: `Imported project: ${importedData.project.name}`,
                });
            } catch (err) {
                console.error(err);
                setImportStatus({
                    type: "error",
                    message: "Failed to import project. Invalid file format.",
                });
            }
        };
        input.click();
    };

    const handleSelectStorage = (id: string | null) => {
        useStore.setState({ activeStorageId: id });
    };

    const handleCreateDoc = () => {
        if (!activeProjectId) return;
        setNewDocOpen(true);
    };

    const handleCreateDocSubmit = (name: string, color: string, icon: string) => {
        if (!activeProjectId) return;
        useStore.getState().addDoc(name, activeProjectId, color, icon);
        setNewDocOpen(false);
        navigate("/docs");
    };

    const handleSelectDoc = (id: string) => {
        useStore.setState({ activeDocId: id });
    };

    const handleCreateGraph = () => {
        if (!activeProjectId) return;
        setNewGraphOpen(true);
    };

    const handleCreateGraphSubmit = (name: string, color: string, icon: string) => {
        if (!activeProjectId) return;
        useStore.getState().addGraph(name, activeProjectId, color, icon);
        setNewGraphOpen(false);
        navigate("/graphs");
    };

    const handleSelectGraph = (id: string) => {
        useStore.setState({ activeGraphId: id });
    };

    // Ensure a valid storage is always selected
    useEffect(() => {
        if (activeProjectId && projectStorages.length > 0) {
            const isValid = projectStorages.some((s: Storage) => s.id === activeStorageId);
            if (!isValid) {
                const firstStorageId = projectStorages[0].id;
                if (activeStorageId !== firstStorageId) {
                    useStore.setState({ activeStorageId: firstStorageId });
                }
            }
        }
    }, [activeProjectId, activeStorageId, projectStorages.length]); // Use .length instead of array reference

    // Memoize buckets specifically to use in effects
    const projectBuckets = useMemo(() => projectCollections.filter((c: Collection) => 
        c.parentId === null && c.type === 'bucket'
    ), [projectCollections]);

    // Ensure a valid bucket is always selected
    useEffect(() => {
        if (!activeProjectId) return;
        
        // If no buckets exist, clear activeCollectionId
        if (projectBuckets.length === 0) {
            if (activeCollectionId !== null) {
                useStore.setState({ activeCollectionId: null });
            }
            return;
        }

        // Check if current activeCollectionId is valid for this project and IS a bucket
        const currentIsBucket = projectBuckets.some((b: Collection) => b.id === activeCollectionId);
        
        // Only update if current activeCollectionId is NOT a valid bucket
        if (!currentIsBucket) {
            const firstBucketId = projectBuckets[0].id;
            // IMPORTANT: Only call setState if the value is actually different to avoid loops
            if (activeCollectionId !== firstBucketId) {
                useStore.setState({ activeCollectionId: firstBucketId });
            }
        }
    }, [activeProjectId, activeCollectionId, projectBuckets.length]);

    const handleAddCollection = (e?: ReactMouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!activeProjectId) return;
        setCreateCollectionOpen(true);
    };

    const handleAddFolder = (e: ReactMouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setCreateFolderOpen(true);
    };

    const handleCreateCollection = (name: string, color: string, icon: string) => {
        if (!activeProjectId) return;
        if (name) {
            // Buckets are ONLY created in the management view (sidebarView === 'collections')
            // AND they must have no parentId.
            const isCreatingBucket = sidebarView === 'collections';
            let parentId = isCreatingBucket ? null : (currentFolderId || activeCollectionId);
            
            // SECURITY: If we are not in the buckets view, we MUST have a parentId.
            // If parentId is null here, it means activeCollectionId was null and currentFolderId was null.
            // We should default to the first available bucket instead of creating a new bucket.
            if (!isCreatingBucket && !parentId) {
                const firstBucket = collections.find((c: Collection) => 
                    c.projectId === activeProjectId && c.parentId === null && c.type === 'bucket' && !c.deleted
                );
                if (firstBucket) {
                    parentId = firstBucket.id;
                    useStore.setState({ activeCollectionId: firstBucket.id });
                } else {
                    // If no buckets exist at all, we HAVE to create one first, 
                    // but let's assume the user should have been in the bucket view.
                    // To be safe, if we are in main view, we force type: 'collection' 
                    // and if parentId is still null, we just don't create anything or we force a bucket.
                    // Actually, let's just ensure type is 'collection' if not in bucket view.
                }
            }

            const typeToCreate = isCreatingBucket ? 'bucket' : 'collection';
            
            // If we are creating a collection but parentId is STILL null, 
            // it means there are no buckets. We should probably not allow this 
            // or create a default bucket. The current logic returns early if no bucket.
            if (typeToCreate === 'collection' && !parentId) {
                console.error("Cannot create collection: No bucket found to house it.");
                return;
            }

            const sameParentCollections = collections.filter(c => c.parentId === parentId);
            const maxOrder = sameParentCollections.length > 0 
                ? Math.max(...sameParentCollections.map(c => c.order || 0)) 
                : -1;

            const newCollection: Collection = {
                id: crypto.randomUUID(),
                projectId: activeProjectId,
                parentId: parentId,
                name,
                color,
                icon,
                type: typeToCreate,
                order: maxOrder + 1,
                created: Date.now(),
                lastModified: Date.now()
            };

            useStore.setState((state: any) => ({
                collections: [...state.collections, newCollection],
                activeCollectionId: isCreatingBucket ? newCollection.id : state.activeCollectionId
            }));
            
            if (isCreatingBucket) {
                setSidebarView('main');
                navigate(`/collections`);
            } else {
                navigate(`/collection/${newCollection.id}`);
            }
        }
    };

    const handleCreateFolder = (name: string) => {
        if (!activeProjectId) return;
        if (name) {
            // Folders MUST be inside a bucket or another folder
            let parentId = currentFolderId || activeCollectionId;
            if (!parentId) {
                // Try to find the first bucket if none is active
                const firstBucket = collections.find((c: Collection) => 
                    c.projectId === activeProjectId && c.parentId === null && c.type === 'bucket' && !c.deleted
                );
                if (firstBucket) {
                    parentId = firstBucket.id;
                    useStore.setState({ activeCollectionId: firstBucket.id });
                } else {
                    return; // Cannot create folder without a bucket unit
                }
            }

            const sameParentItems = collections.filter(c => c.parentId === parentId);
            const maxOrder = sameParentItems.length > 0 
                ? Math.max(...sameParentItems.map(c => c.order || 0)) 
                : -1;

            const newFolder: Collection = {
                id: crypto.randomUUID(),
                projectId: activeProjectId,
                parentId: parentId,
                name,
                color: "#71717a", // Default zinc color for folders
                icon: "Folder",
                type: 'folder',
                order: maxOrder + 1,
                created: Date.now(),
                lastModified: Date.now()
            };
            
            useStore.setState((state: any) => ({
                collections: [...state.collections, newFolder]
            }));
            
            setCreateFolderOpen(false);
            // Navigate to the new folder
            navigate(`/collections?folderId=${newFolder.id}`);
        }
    };

    const handleEditCollectionClick = (e: ReactMouseEvent, collection: Collection) => {
        e.preventDefault();
        e.stopPropagation();
        setCollectionToEdit(collection);
        setEditCollectionOpen(true);
    };

    const handleDeleteCollection = (e: ReactMouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        trashCollection(id);
    };

    const handleUpdateCollection = (id: string, updates: { name: string, color: string, icon: string }) => {
        updateCollection(id, updates);
    };

    const handleSelectCollection = (id: string) => {
        const bucketId = findRootBucketId(collections, id);
        if (bucketId) {
            useStore.setState({ activeCollectionId: bucketId });
        }
    };

    const handleProjectChange = (value: string) => {
        if (value === "new") {
            setNewProjectName("");
            setNewProjectOpen(true);
        } else if (value.startsWith("export_") && activeProjectId) {
            // EXPORT
            const data = exportProject(useStore.getState(), activeProjectId);
            if (data) {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `whistler_export_${data.project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } else if (value === "import") {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "application/json";
            input.onchange = async (e: Event) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;

                const text = await file.text();
                try {
                    const data = JSON.parse(text) as ProjectExportData;
                    if (!data.version || !data.project) throw new Error("Invalid project file");

                    const importedData = importProject(data);

                    useStore.setState((state: any) => ({
                        projects: [...state.projects, importedData.project],
                        files: [...state.files, ...importedData.files],
                        collections: [...state.collections, ...importedData.collections],
                        highlights: [...state.highlights, ...importedData.highlights],
                        graphs: [...state.graphs, ...importedData.graphs],
                        graphNodes: [...state.graphNodes, ...importedData.graphNodes],
                        graphEdges: [...state.graphEdges, ...importedData.graphEdges],
                        docs: [...state.docs, ...importedData.docs],
                        storages: [...state.storages, ...importedData.storages],
                        activeProjectId: importedData.project.id
                    }));

                    setImportStatus({
                        type: "success",
                        message: `Imported project: ${importedData.project.name}`,
                    });
                } catch (err) {
                    console.error(err);
                    setImportStatus({
                        type: "error",
                        message: "Failed to import project. Invalid file format.",
                    });
                }
            };
            input.click();
        } else {
            setActiveProject(value);
        }
    };

    const createMenuContent = (
        <>
            <ContextMenuItem onClick={() => setCreateCollectionOpen(true)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                New Collection
            </ContextMenuItem>
            <ContextMenuItem onClick={() => setCreateFolderOpen(true)}>
                <Folder className="mr-2 h-4 w-4" />
                New Folder
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleCreateDoc}>
                <NotePencil className="mr-2 h-4 w-4" />
                New Doc
            </ContextMenuItem>
            <ContextMenuItem onClick={handleCreateGraph}>
                <Graph className="mr-2 h-4 w-4" />
                New Graph
            </ContextMenuItem>
            <ContextMenuItem onClick={handleCreateStorage}>
                <HardDrives className="mr-2 h-4 w-4" />
                New Storage
            </ContextMenuItem>
        </>
    );


    return (
        <>
            <motion.aside
                data-component="project-sidebar"
                initial={{ width: isSidebarCollapsed ? (sidebarMode === 'slim' ? 60 : 0) : 280 }}
                animate={{ width: isSidebarCollapsed ? (sidebarMode === 'slim' ? 60 : 0) : 280 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={cn(
                    "flex flex-col border-r border-border bg-sidebar h-full overflow-hidden shrink-0 z-20 relative",
                    // Only disable pointer events if collapsed AND NOT in slim mode (i.e. hidden)
                    isSidebarCollapsed && sidebarMode !== 'slim' && "pointer-events-none"
                )}
            >
                {isSlim ? (
                    <div className="flex flex-col h-full min-h-0 items-center py-3 gap-2 w-full">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => {
                                        playSfx('cursor');
                                        toggleSidebarCollapse();
                                    }}
                                    className="h-8 w-8 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
                                >
                                    <SidebarSimple weight="bold" size={18} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="right">Expand Sidebar</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => {
                                        playSfx('cursor');
                                        navigate('/');
                                        setSidebarView('main');
                                    }}
                                    className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent hover:opacity-80 transition-colors"
                                >
                                    <WhistlerLogo
                                        className="rounded-md"
                                        width={22}
                                        height={22}
                                    />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="right">Whistlerbox</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => {
                                        playSfx('cursor');
                                        useStore.getState().setSpotlightOpen(true);
                                    }}
                                    className="h-8 w-8 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
                                >
                                    <MagnifyingGlass weight="bold" size={18} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="right">Search</TooltipContent>
                        </Tooltip>

                        <Separator className="w-8 bg-border/40 my-1" />

                        <div className="flex flex-col gap-2 w-full items-center">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => {
                                            playSfx('cursor');
                                            if (location.pathname === '/storage') {
                                                toggleSidebarCollapse && toggleSidebarCollapse();
                                                setSidebarView('storage');
                                            } else {
                                                navigate('/storage');
                                            }
                                        }}
                                        className={cn(
                                            "h-9 w-9 flex items-center justify-center rounded-none transition-colors border border-border/60 shadow-sm",
                                            location.pathname === '/storage' 
                                                ? "bg-primary/20 text-primary border-primary/30" 
                                                : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                                        )}
                                    >
                                        <HardDrives weight={location.pathname === '/storage' ? "fill" : "bold"} size={20} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">Storage</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => {
                                            playSfx('cursor');
                                            if (location.pathname.startsWith('/docs')) {
                                                toggleSidebarCollapse && toggleSidebarCollapse();
                                                setSidebarView('docs');
                                            } else {
                                                navigate('/docs');
                                            }
                                        }}
                                        className={cn(
                                            "h-9 w-9 flex items-center justify-center rounded-none transition-colors border border-border/60 shadow-sm",
                                            location.pathname.startsWith('/docs')
                                                ? "bg-primary/20 text-primary border-primary/30" 
                                                : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                                        )}
                                    >
                                        <NotePencil weight={location.pathname.startsWith('/docs') ? "fill" : "bold"} size={20} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">Docs</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => {
                                            playSfx('cursor');
                                            if (location.pathname.startsWith('/graphs')) {
                                                toggleSidebarCollapse && toggleSidebarCollapse();
                                                setSidebarView('graphs');
                                            } else {
                                                navigate('/graphs');
                                            }
                                        }}
                                        className={cn(
                                            "h-9 w-9 flex items-center justify-center rounded-none transition-colors border border-border/60 shadow-sm",
                                            location.pathname.startsWith('/graphs')
                                                ? "bg-primary/20 text-primary border-primary/30" 
                                                : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                                        )}
                                    >
                                        <Graph weight={location.pathname.startsWith('/graphs') ? "fill" : "bold"} size={20} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">Graphs</TooltipContent>
                            </Tooltip>
                        </div>

                        <Separator className="w-8 bg-border/40 my-1" />

                        <ScrollArea className="flex-1 min-h-0 w-full px-1">
                            <div className="flex flex-col gap-2 w-full items-center pb-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => {
                                                playSfx('cursor');
                                                navigate('/collections');
                                            }}
                                            className={cn(
                                                "h-9 w-9 flex items-center justify-center rounded-none transition-colors border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                                                (location.pathname.startsWith('/collections') || location.pathname.startsWith('/collection/')) && "bg-primary/20 text-primary border-primary/30"
                                            )}
                                        >
                                            <FolderOpen weight={(location.pathname.startsWith('/collections') || location.pathname.startsWith('/collection/')) ? "fill" : "bold"} size={20} />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">Collections</TooltipContent>
                                </Tooltip>

                                {collections.filter((c: Collection) => c.projectId === activeProjectId && c.parentId === null && c.type === 'bucket' && !c.deleted).map((collection: Collection) => {
                                    const Icon = getIcon(collection.icon);
                                    return (
                                        <ContextMenu key={collection.id}>
                                            <ContextMenuTrigger className="flex justify-center w-full">
                                                <Link
                                                    to={`/collections`}
                                                    onClick={() => {
                                                        playSfx('cursor');
                                                        handleSelectCollection(collection.id);
                                                    }}
                                                    className={cn(
                                                        "flex items-center justify-center w-9 h-9 rounded-none transition-colors relative border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                                                        (location.pathname === `/collections` && activeCollectionId === collection.id)
                                                            ? "bg-primary/20 text-primary border-primary/30"
                                                            : ""
                                                    )}
                                                    title={collection.name}
                                                >
                                                    <div style={{ color: collection.color }}>
                                                        <Icon
                                                            className="text-lg transition-colors"
                                                            weight="fill"
                                                        />
                                                    </div>
                                                </Link>
                                            </ContextMenuTrigger>
                                            <ContextMenuContent side="bottom" align="start" sideOffset={4} className="w-48">
                                                <ContextMenuItem onClick={(e: ReactMouseEvent) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setCollectionToEdit(collection);
                                                    setEditCollectionOpen(true);
                                                }}>
                                                    <PencilSimple className="mr-2 h-4 w-4" />
                                                    Rename Bucket
                                                </ContextMenuItem>
                                                <ContextMenuItem onClick={(e: ReactMouseEvent) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    trashCollection(collection.id);
                                                }} className="text-red-500 focus:text-red-500">
                                                    <Trash className="mr-2 h-4 w-4" />
                                                    Delete Bucket
                                                </ContextMenuItem>
                                            </ContextMenuContent>
                                        </ContextMenu>
                                    );
                                })}
                            </div>
                        </ScrollArea>

                        <div className="flex flex-col gap-2 w-full items-center pb-2">
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => { setSidebarView('sync'); toggleSidebarCollapse && toggleSidebarCollapse(); }}
                                        className="h-8 w-8 flex items-center justify-center rounded-none text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                    >
                                        <ArrowsClockwise 
                                            weight="bold" 
                                            size={18} 
                                            className={cn(syncStatus === 'syncing' && "animate-spin text-primary")} 
                                        />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">Sync Status</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => { setSidebarView('history'); toggleSidebarCollapse && toggleSidebarCollapse(); }}
                                        className="h-8 w-8 flex items-center justify-center rounded-none text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                    >
                                        <ClockCounterClockwise weight="bold" size={18} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">History</TooltipContent>
                            </Tooltip>

                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => { setSidebarView('trash'); toggleSidebarCollapse && toggleSidebarCollapse(); }}
                                        className="h-8 w-8 flex items-center justify-center rounded-none text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                    >
                                        <Trash weight="bold" size={18} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">Trash</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => navigate('/settings')}
                                        className={cn(
                                            "h-8 w-8 flex items-center justify-center rounded-md transition-colors",
                                            location.pathname === '/settings' ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                        )}
                                    >
                                         <Gear weight="fill" size={18} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">Settings</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                ) : (
                    <>
                {/* Header */}
                <div className="flex items-center justify-between px-3 h-12 border-b border-border/40 shrink-0 relative">
                    <button
                        onClick={() => {
                            playSfx('cursor');
                            toggleSidebarCollapse();
                        }}
                        className="h-8 w-8 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200 shrink-0 z-10"
                        title="Collapse sidebar"
                    >
                        <SidebarSimple weight="bold" size={18} />
                    </button>

                    {!isSidebarCollapsed && !isSlim && (
                        <motion.button
                            onClick={() => {
                                playSfx('cursor');
                                navigate('/');
                                setSidebarView('main');
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 overflow-hidden hover:opacity-80 transition-opacity max-w-[160px]"
                        >
                            <WhistlerLogo
                                className="rounded-none mt-[1px] shrink-0"
                                width={22}
                                height={22}
                            />
                            <span className="font-bold text-xl tracking-tight truncate">
                                Whistlerbox
                            </span>
                        </motion.button>
                    )}

                    {!isSidebarCollapsed && (
                        <div className="flex items-center shrink-0 z-10">
                            <button
                                onClick={() => {
                                    playSfx('cursor');
                                    useStore.getState().setSpotlightOpen(true);
                                }}
                                className="h-8 w-8 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
                                title="Search"
                            >
                                <MagnifyingGlass weight="bold" size={18} />
                            </button>
                        </div>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {sidebarView === 'main' ? (
                        <motion.div
                            key="main"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            {/* Project Switcher */}
                            {!isSidebarCollapsed && (
                                <div className="p-3 pb-0 animate-in fade-in duration-300 shrink-0">
                                    <button
                                        onClick={() => {
                                            playSfx('cursor');
                                            setProjectsOpen(!projectsOpen);
                                        }}
                                        className={cn("flex items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full text-left relative", isSlim && "justify-center")}
                                    >
                                        <CaretDown weight="bold" className={cn("transition-transform text-xs mr-1", !projectsOpen && "-rotate-90")} />
                                        {!isSlim && <span>Project</span>}
                                        <div className="flex-grow border-t border-border/40 ml-1"></div>
                                    </button>
                                    
                                    <AnimatePresence initial={false}>
                                        {projectsOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className={cn("flex gap-1 items-center pt-1", isSlim && "flex-col")}>
                                                    {projects.length > 0 ? (
                                                        <>
                                                            <Select value={activeProjectId || ""} onValueChange={handleProjectChange}>
                                                                <SelectTrigger className={cn("flex-1 h-8 bg-card border-border/60 shadow-sm group [&_svg]:text-muted-foreground [&_svg]:group-hover:text-foreground [&_svg]:transition-colors", isSlim && "px-1 justify-center")}>
                                                                    {isSlim ? <FolderOpen weight="bold" className="text-muted-foreground group-hover:text-foreground transition-colors" /> : <SelectValue placeholder="Select Project" />}
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {projects.map((p: Project) => (
                                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                                    ))}
                                                                    <Separator className="my-1" />
                                                                    <SelectItem value="new"><span className="text-primary flex items-center gap-2"><Plus className="size-3" /> New Project</span></SelectItem>
                                                                </SelectContent>
                                                            </Select>

                                                            <Button 
                                                                variant="outline" 
                                                                size="icon" 
                                                                className="h-8 w-8 shrink-0 bg-card border-border/60 group"
                                                                onClick={() => {
                                                                    playSfx('cursor');
                                                                    handleEditProjectName();
                                                                }}
                                                                title="Edit Project Name"
                                                            >
                                                                <PencilSimple className="text-muted-foreground group-hover:text-foreground transition-colors" />
                                                            </Button>

                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 bg-card border-border/60 group" title="Share">
                                                                        <Share className="text-muted-foreground group-hover:text-foreground transition-colors" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={handleExportProject} disabled={!activeProjectId}>
                                                                        <UploadSimple className="mr-2" /> Export Project
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={handleImportProject}>
                                                                        <DownloadSimple className="mr-2" /> Import Project
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </>
                                                    ) : (
                                                        <div className={cn("flex gap-1 items-center w-full", isSlim && "flex-col")}>
                                                            <Button 
                                                                variant="outline" 
                                                                className={cn("flex-1 h-8 bg-card border-border/60 shadow-sm text-[10px] text-muted-foreground uppercase tracking-wider", isSlim && "px-0 w-8 flex-none justify-center")}
                                                                onClick={() => {
                                                                    playSfx('cursor');
                                                                    setNewProjectOpen(true);
                                                                }}
                                                            >
                                                                {isSlim ? <Plus weight="bold" /> : "Create Project"}
                                                            </Button>
                                                            {!isSlim && (
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="icon"
                                                                    className="h-8 w-8 shrink-0 bg-card border-border/60 shadow-sm group"
                                                                    onClick={() => {
                                                                        playSfx('cursor');
                                                                        const p1: Project = { id: crypto.randomUUID(), name: 'Demo Project', created: Date.now(), lastModified: Date.now() };
                                                                        const s1 = { id: crypto.randomUUID(), projectId: p1.id, name: 'Main Storage', created: Date.now(), lastModified: Date.now() };
                                                                        const f1: any = { id: crypto.randomUUID(), projectId: p1.id, storageId: s1.id, parentId: null, name: 'Getting Started.mp4', url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4', type: 'video', order: 0, created: Date.now(), lastModified: Date.now() };
                                                                        useStore.setState((state: any) => ({ 
                                                                            projects: [...state.projects, p1], 
                                                                            storages: [...state.storages, s1], 
                                                                            files: [...state.files, f1], 
                                                                            activeProjectId: p1.id, 
                                                                            activeStorageId: s1.id 
                                                                        }));
                                                                    }}
                                                                    title="Load Demo"
                                                                >
                                                                    <Sparkle weight="bold" className="size-4 text-primary group-hover:scale-110 transition-transform" />
                                                                </Button>
                                                            )}
                                                            {!isSlim && (
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="icon"
                                                                    className="h-8 w-8 shrink-0 bg-card border-border/60 shadow-sm group"
                                                                    onClick={() => {
                                                                        playSfx('cursor');
                                                                        handleImportProject();
                                                                    }}
                                                                    title="Import Project"
                                                                >
                                                                    <DownloadSimple weight="bold" className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                    {importStatus && (
                                        <div
                                            className={cn(
                                                "mt-2 text-[11px] px-2 py-1 rounded-md border",
                                                importStatus.type === "success"
                                                    ? "bg-emerald-500/10 border-emerald-700/60 text-emerald-300"
                                                    : "bg-red-500/10 border-red-700/60 text-red-300"
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="truncate">{importStatus.message}</span>
                                                <button
                                                    onClick={() => {
                                                        playSfx('cursor');
                                                        setImportStatus(null);
                                                    }}
                                                    className="text-xs text-zinc-400 hover:text-zinc-200"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Scrollable Content */}
                            <ScrollArea className="flex-1 px-3 py-2">
                                {/* Assets Section */}
                                <div className="mb-2">
                                    {!isSidebarCollapsed && (
                                        <div className="flex items-center">
                                            <button
                                                onClick={() => {
                                                    playSfx('cursor');
                                                    setAssetsOpen(!assetsOpen);
                                                }}
                                                className="flex items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full text-left relative"
                                            >
                                                <CaretDown weight="bold" className={cn("transition-transform text-xs mr-1", !assetsOpen && "-rotate-90")} />
                                                <span>Assets</span>
                                                <div className="flex-grow border-t border-border/40 ml-1"></div>
                                            </button>
                                        </div>
                                    )}
                                    
                                    <AnimatePresence initial={false}>
                                        {(assetsOpen || isSidebarCollapsed || isSlim) && (
                                            <motion.div
                                                initial={!isSidebarCollapsed ? { height: 0, opacity: 0 } : undefined}
                                                animate={!isSidebarCollapsed ? { height: "auto", opacity: 1 } : undefined}
                                                exit={!isSidebarCollapsed ? { height: 0, opacity: 0 } : undefined}
                                                className={cn("flex gap-1 overflow-hidden mt-1", (isSidebarCollapsed || isSlim) ? "flex-col space-y-2" : "flex-row")}
                                            >
                                                <ContextMenu>
                                                    <ContextMenuTrigger className={cn("flex-1", (isSidebarCollapsed || isSlim) && "w-full flex justify-center")}>
                                                        <button
                                                            onClick={() => {
                                                                playSfx('cursor');
                                                                if (isSidebarCollapsed) {
                                                                    toggleSidebarCollapse && toggleSidebarCollapse();
                                                                    return;
                                                                }
                                                                if (location.pathname === '/storage') {
                                                                    setSidebarView('storage');
                                                                } else {
                                                                    navigate('/storage');
                                                                    setSidebarView('main');
                                                                }
                                                            }}
                                                            title="Storage"
                                                            className={cn(
                                                                "flex items-center justify-center rounded-none transition-all duration-200 group relative cursor-pointer px-2 w-full border border-border/60 shadow-sm",
                                                                (isSidebarCollapsed || isSlim)
                                                                    ? "w-10 h-10 mx-auto"
                                                                    : "h-9",
                                                                (location.pathname === "/storage")
                                                                    ? "bg-primary/20 text-primary border-primary/30"
                                                                    : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                                                            )}
                                                        >
                                                            <HardDrives
                                                                weight={(location.pathname === "/storage") ? "fill" : "regular"}
                                                                size={18}
                                                                className="transition-transform group-hover:scale-110"
                                                            />
                                                            {!isSidebarCollapsed && !isSlim && (
                                                                <span className="ml-2 text-xs font-medium tracking-tight">
                                                                    Storage
                                                                </span>
                                                            )}
                                                        </button>
                                                    </ContextMenuTrigger>
                                                    <ContextMenuContent side="bottom" align="start" sideOffset={4} className="w-48">
                                                        {createMenuContent}
                                                    </ContextMenuContent>
                                                </ContextMenu>

                                                <ContextMenu>
                                                    <ContextMenuTrigger className={cn("flex-1", (isSidebarCollapsed || isSlim) && "w-full flex justify-center")}>
                                                        <button
                                                            onClick={() => {
                                                                playSfx('cursor');
                                                                if (isSidebarCollapsed) {
                                                                    toggleSidebarCollapse && toggleSidebarCollapse();
                                                                    return;
                                                                }
                                                                if (location.pathname.startsWith('/docs')) {
                                                                    setSidebarView('docs');
                                                                } else {
                                                                    navigate('/docs');
                                                                    setSidebarView('main');
                                                                }
                                                            }}
                                                            title="Docs"
                                                            className={cn(
                                                                "flex items-center justify-center rounded-none transition-all duration-200 group relative cursor-pointer px-2 w-full border border-border/60 shadow-sm",
                                                                (isSidebarCollapsed || isSlim)
                                                                    ? "w-10 h-10 mx-auto"
                                                                    : "h-9",
                                                                location.pathname.startsWith("/docs")
                                                                    ? "bg-primary/20 text-primary border-primary/30"
                                                                    : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                                                            )}
                                                        >
                                                            <NotePencil
                                                                weight={location.pathname.startsWith("/docs") ? "fill" : "regular"}
                                                                size={18}
                                                                className="transition-transform group-hover:scale-110"
                                                            />
                                                            {!isSidebarCollapsed && !isSlim && (
                                                                <span className="ml-2 text-xs font-medium tracking-tight">
                                                                    Docs
                                                                </span>
                                                            )}
                                                        </button>
                                                    </ContextMenuTrigger>
                                                    <ContextMenuContent side="bottom" align="start" sideOffset={4} className="w-48">
                                                        {createMenuContent}
                                                    </ContextMenuContent>
                                                </ContextMenu>

                                                <ContextMenu>
                                                    <ContextMenuTrigger className={cn("flex-1", (isSidebarCollapsed || isSlim) && "w-full flex justify-center")}>
                                                        <button
                                                            onClick={() => {
                                                                playSfx('cursor');
                                                                if (isSidebarCollapsed) {
                                                                    toggleSidebarCollapse && toggleSidebarCollapse();
                                                                    return;
                                                                }
                                                                if (location.pathname.startsWith('/graphs')) {
                                                                    setSidebarView('graphs');
                                                                } else {
                                                                    navigate('/graphs');
                                                                    setSidebarView('main');
                                                                }
                                                            }}
                                                            title="Graphs"
                                                            className={cn(
                                                                "flex items-center justify-center rounded-none transition-all duration-200 group relative cursor-pointer px-2 w-full border border-border/60 shadow-sm",
                                                                (isSidebarCollapsed || isSlim)
                                                                    ? "w-10 h-10 mx-auto"
                                                                    : "h-9",
                                                                location.pathname.startsWith("/graphs")
                                                                    ? "bg-primary/20 text-primary border-primary/30"
                                                                    : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                                                            )}
                                                        >
                                                            <Graph
                                                                weight={location.pathname.startsWith("/graphs") ? "fill" : "regular"}
                                                                size={18}
                                                                className="transition-transform group-hover:scale-110"
                                                            />
                                                            {!isSidebarCollapsed && !isSlim && (
                                                                <span className="ml-2 text-xs font-medium tracking-tight">
                                                                    Graphs
                                                                </span>
                                                            )}
                                                        </button>
                                                    </ContextMenuTrigger>
                                                    <ContextMenuContent side="bottom" align="start" sideOffset={4} className="w-48">
                                                        {createMenuContent}
                                                    </ContextMenuContent>
                                                </ContextMenu>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>


                                <button
                                    onClick={() => {
                                        playSfx('cursor');
                                        setCollectionsSectionOpen(!collectionsSectionOpen);
                                    }}
                                    className="flex items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full text-left my-1 relative"
                                >
                                    <div className={cn(
                                        "transition-transform duration-200 mr-1",
                                        !collectionsSectionOpen ? "-rotate-90" : "rotate-0"
                                    )}>
                                        <CaretDown weight="bold" className="text-xs transition-colors" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider transition-colors">
                                        Collections
                                    </span>
                                    <div className="flex-grow border-t border-border/40 ml-1"></div>
                                </button>

                                {/* Collections Section */}
                                <div className="mb-4 mt-1">
                                    <AnimatePresence initial={false}>
                                        {collectionsSectionOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                                className="overflow-hidden"
                                            >
                                                <DndContext
                                        sensors={sensors}
                                        collisionDetection={(args) => {
                                            // 1. Check for all Folder Nesting targets (including root)
                                            // We use rectIntersection to make them easier targets than individual sortable items
                                            const folderCollisions = rectIntersection({
                                                ...args,
                                                droppableContainers: args.droppableContainers.filter(c => 
                                                    c.id.toString().startsWith("folder-nest-")
                                                )
                                            });
                                            if (folderCollisions.length > 0) return folderCollisions;

                                            // 2. Fallback to pointer for sortable reordering
                                            const pointerCollisions = pointerWithin(args);
                                            if (pointerCollisions.length > 0) return pointerCollisions;
                                            
                                            return closestCenter(args);
                                        }}
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleDragEnd}
                                        onDragCancel={handleDragCancel}
                                    >
                                        <SidebarFolderItem
                                             isRoot
                                             folder={{ 
                                                 id: activeCollectionId || 'root',
                                                 name: activeCollection ? activeCollection.name : "Collections" 
                                             }}
                                             isSlim={isSlim}
                                             isCollapsed={!rootCollectionsOpen}
                                             onToggleCollapse={() => {
                                                  setRootCollectionsOpen(!rootCollectionsOpen);
                                              }}
                                             collapsedById={folderCollapsedById}
                                             setCollapsedById={setFolderCollapsedById}
                                             handleAddCollection={handleAddCollection}
                                             handleAddFolder={handleAddFolder}
                                             currentFolderId={currentFolderId}
                                          >
                                              <div className="space-y-0.5">
                                                  {!activeCollectionId ? (
                                                      <div className="px-3 py-4 text-center">
                                                          <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-tighter">No bucket selected</p>
                                                          <Button 
                                                              variant="outline" 
                                                              size="sm" 
                                                              className="h-7 text-[10px] w-full rounded-none border-border/60 bg-secondary/20"
                                                              onClick={() => setSidebarView('collections')}
                                                          >
                                                              Open Buckets
                                                          </Button>
                                                      </div>
                                                  ) : (() => {
                                                      const renderCollectionTree = (parentId: string | null = null, depth = 0) => {
                                                            const items = collections
                                                                .filter(c => c.projectId === activeProjectId && !c.deleted && c.parentId === parentId)
                                                                .sort((a, b) => (a.order || 0) - (b.order || 0));

                                                            const itemIds = items.map(c => c.id);

                                                            return (
                                                                <SortableContext 
                                                                    items={itemIds} 
                                                                    strategy={verticalListSortingStrategy}
                                                                >
                                                                    {items.map(item => {
                                                                        if (item.type === 'folder') {
                                                                            return (
                                                                                <SidebarFolderItem
                                                                                    key={item.id}
                                                                                    folder={item}
                                                                                    isSlim={isSlim}
                                                                                    depth={depth}
                                                                                    folders={projectCollections.filter(f => f.type === 'folder' && f.id !== item.id)}
                                                                                    handleAddCollection={handleAddCollection}
                                                                                    handleAddFolder={handleAddFolder}
                                                                                    collapsedById={folderCollapsedById}
                                                                                    setCollapsedById={setFolderCollapsedById}
                                                                                    currentFolderId={currentFolderId}
                                                                                    onRename={() => {
                                                                                        setCollectionToEdit(item);
                                                                                        setEditCollectionOpen(true);
                                                                                    }}
                                                                                    onDelete={() => trashCollection(item.id)}
                                                                                    onMove={(newParentId: string | null) => {
                                                                                        useStore.setState((state: any) => ({
                                                                                            collections: state.collections.map((c: Collection) => 
                                                                                                c.id === item.id ? { ...c, parentId: newParentId, lastModified: Date.now() } : c
                                                                                            )
                                                                                        }));
                                                                                    }}
                                                                                >
                                                                                    {renderCollectionTree(item.id, depth + 1)}
                                                                                </SidebarFolderItem>
                                                                            );
                                                                        }
                                                                        return (
                                                                            <SortableCollectionItem
                                                                                key={item.id}
                                                                                collection={item}
                                                                                location={location}
                                                                                isSlim={isSlim}
                                                                                handleSelectCollection={handleSelectCollection}
                                                                                handleEditCollectionClick={handleEditCollectionClick}
                                                                                handleDeleteCollection={handleDeleteCollection}
                                                                                setCollectionToEdit={setCollectionToEdit}
                                                                                setEditCollectionOpen={setEditCollectionOpen}
                                                                                trashCollection={trashCollection}
                                                                                createMenuContent={createMenuContent}
                                                                                currentFolderId={currentFolderId}
                                                                            />
                                                                        );
                                                                    })}
                                                                </SortableContext>
                                                            );
                                                        };
                                                        return renderCollectionTree(activeCollectionId);
                                                  })()}
                                              </div>
                                              {activeCollectionId && collections.filter((c: Collection) => c.projectId === activeProjectId && !c.deleted && c.parentId === activeCollectionId).length === 0 && (
                                                  <div className={cn("px-3 py-4 text-xs text-muted-foreground/60 italic text-center border-2 border-dashed border-border/30 rounded-md", isSlim && "px-1 text-[10px]")}>
                                                      {isSlim ? "Empty" : "Bucket is empty"}
                                                  </div>
                                              )}
                                          </SidebarFolderItem>
                                        <DragOverlay dropAnimation={null}>
                                            {activeDragId ? (() => {
                                                const item = collections.find(c => c.id === activeDragId);
                                                if (!item) return null;
                                                const Icon = getIcon(item.icon);
                                                return (
                                                     <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm bg-zinc-900 border border-zinc-800 shadow-xl opacity-90 w-48 pointer-events-none">
                                                        <Icon className="text-lg shrink-0" weight="fill" style={{ color: item.color }} />
                                                        <span className="truncate font-medium">{item.name}</span>
                                                     </div>
                                                );
                                            })() : null}
                                        </DragOverlay>
                                    </DndContext>
                                             </motion.div>
                                         )}
                                     </AnimatePresence>
                                </div>
                            </ScrollArea>
                        </motion.div>
                    ) : sidebarView === 'docs' ? (
                        <motion.div
                            key="docs"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            <div className="px-3 py-2 border-b border-border/40 bg-card/20 shrink-0">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            playSfx('cursor');
                                            setSidebarView('main');
                                        }}
                                        className="h-6 w-6 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
                                    >
                                        <CaretLeft weight="bold" size={14} />
                                    </button>
                                    <div className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
                                        <NotePencil weight="bold" />
                                        Documents
                                    </div>
                                    <button
                                        onClick={() => {
                                            playSfx('cursor');
                                            handleCreateDoc();
                                        }}
                                        className="h-6 w-6 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
                                    >
                                        <Plus weight="bold" size={14} />
                                    </button>
                                </div>
                            </div>
                            
                            <ScrollArea className="flex-1 px-3 py-2">
                                <div className="space-y-1">
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <SortableContext items={projectDocs.map((d: Doc) => d.id)} strategy={verticalListSortingStrategy}>
                                            {projectDocs.map((doc: Doc) => (
                                                <SortableEntityItem 
                                                    key={doc.id}
                                                    entity={doc}
                                                    isActive={activeDocId === doc.id}
                                                    onSelect={() => handleSelectDoc(doc.id)}
                                                    onEdit={(e) => handleRenameDoc(e, doc)}
                                                    onDelete={(e) => handleDeleteDoc(e, doc.id)}
                                                    dataAttrs={{ 'data-doc-id': doc.id }}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>

                                    {projectDocs.length === 0 && (
                                        <div className="p-4 text-center text-xs text-muted-foreground/60 italic border-2 border-dashed border-border/30 rounded-md m-2">
                                            No documents yet
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </motion.div>
                    ) : sidebarView === 'graphs' ? (
                        <motion.div
                            key="graphs"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            <div className="px-3 py-2 border-b border-border/40 bg-card/20 shrink-0">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSidebarView('main')}
                                        className="h-6 w-6 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
                                    >
                                        <CaretLeft weight="bold" size={14} />
                                    </button>
                                    <div className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
                                        <Graph weight="bold" />
                                        Graphs
                                    </div>
                                    <button onClick={handleCreateGraph} className="h-6 w-6 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200">
                                        <Plus weight="bold" size={14} />
                                    </button>
                                </div>
                            </div>
                            
                            <ScrollArea className="flex-1 px-3 py-2">
                                <div className="space-y-1">
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <SortableContext items={projectGraphs.map((g: GraphType) => g.id)} strategy={verticalListSortingStrategy}>
                                            {projectGraphs.map((graph: GraphType) => (
                                                <SortableEntityItem
                                                    key={graph.id}
                                                    entity={graph}
                                                    isActive={activeGraphId === graph.id}
                                                    onSelect={() => handleSelectGraph(graph.id)}
                                                    onEdit={(e) => handleEditGraph(e, graph)}
                                                    onDelete={(e) => handleDeleteGraph(e, graph.id)}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>

                                    {projectGraphs.length === 0 && (
                                        <div className="p-4 text-center text-xs text-muted-foreground/60 italic border-2 border-dashed border-border/30 rounded-md m-2">
                                            No graphs yet
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </motion.div>
                    ) : sidebarView === 'history' ? (
                        <motion.div
                            key="history"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            <SidebarHistory onBack={() => setSidebarView('main')} />
                        </motion.div>
                    ) : sidebarView === 'trash' ? (
                        <motion.div
                            key="trash"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            <SidebarTrash onBack={() => setSidebarView('main')} />
                        </motion.div>
                    ) : sidebarView === 'sync' ? (
                        <motion.div
                            key="sync"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            <SidebarSync onBack={() => setSidebarView('main')} />
                        </motion.div>
                    ) : sidebarView === 'collections' ? (
                        <motion.div
                            key="collections"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            <div className="px-3 py-2 border-b border-border/40 bg-card/20 shrink-0">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            playSfx('cursor');
                                            setSidebarView('main');
                                        }}
                                        className="h-6 w-6 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
                                    >
                                        <CaretLeft weight="bold" size={14} />
                                    </button>
                                    <div className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
                                        <Folder weight="bold" />
                                        Buckets
                                    </div>
                                    <button 
                                        onClick={() => { 
                                            playSfx('cursor'); 
                                            handleAddCollection();
                                        }} 
                                        className="h-6 w-6 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
                                    >
                                        <Plus weight="bold" size={14} />
                                    </button>
                                </div>
                            </div>
                            
                            <ScrollArea className="flex-1 px-3 py-2">
                                <div className="space-y-1">
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <SortableContext items={collections.filter((c: Collection) => c.projectId === activeProjectId && c.parentId === null && c.type === 'bucket' && !c.deleted).map((c: Collection) => c.id)} strategy={verticalListSortingStrategy}>
                                            {collections
                                                .filter((c: Collection) => c.projectId === activeProjectId && c.parentId === null && c.type === 'bucket' && !c.deleted)
                                                .sort((a, b) => (a.order || 0) - (b.order || 0))
                                                .map((collection: Collection) => (
                                                    <SortableCollectionItem
                                                        key={collection.id}
                                                        collection={collection}
                                                        location={location}
                                                        isSlim={false}
                                                        handleSelectCollection={(id: string) => {
                                                            handleSelectCollection(id);
                                                            setSidebarView('main');
                                                        }}
                                                        handleEditCollectionClick={handleEditCollectionClick}
                                                        handleDeleteCollection={handleDeleteCollection}
                                                        setCollectionToEdit={setCollectionToEdit}
                                                        setEditCollectionOpen={setEditCollectionOpen}
                                                        trashCollection={trashCollection}
                                                        createMenuContent={createMenuContent}
                                                        currentFolderId={currentFolderId}
                                                    />
                                                ))}
                                        </SortableContext>
                                    </DndContext>

                                    {collections.filter((c: Collection) => c.projectId === activeProjectId && c.parentId === null && c.type === 'bucket' && !c.deleted).length === 0 && (
                                        <div className="p-4 text-center text-xs text-muted-foreground/60 italic border-2 border-dashed border-border/30 rounded-md m-2">
                                            No buckets created yet
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="storage"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            <div className="px-3 py-2 border-b border-border/40 bg-card/20 shrink-0">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            playSfx('cursor');
                                            setSidebarView('main');
                                        }}
                                        data-sound-back
                                        className="h-6 w-6 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
                                    >
                                        <CaretLeft weight="bold" size={14} />
                                    </button>
                                    <div className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
                                        <HardDrives weight="bold" />
                                        Storages
                                    </div>
                                    <button
                                        onClick={() => {
                                            playSfx('cursor');
                                            handleCreateStorage();
                                        }}
                                        className="h-6 w-6 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
                                    >
                                        <Plus weight="bold" size={14} />
                                    </button>
                                </div>
                            </div>

                            <ScrollArea className="flex-1 px-3 py-2">
                                <div className="space-y-1">
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <SortableContext items={projectStorages.map((s: Storage) => s.id)} strategy={verticalListSortingStrategy}>
                                            {projectStorages.map((storage: Storage) => (
                                                <SortableEntityItem
                                                    key={storage.id}
                                                    entity={storage}
                                                    isActive={activeStorageId === storage.id}
                                                    onSelect={() => handleSelectStorage(storage.id)}
                                                    onEdit={(e) => handleEditStorageClick(e, storage)}
                                                    onDelete={(e) => handleDeleteStorage(e, storage.id)}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>

                                    {projectStorages.length === 0 && (
                                        <div
                                            className={cn(
                                                "text-muted-foreground/60 italic border-2 border-dashed border-border/30 rounded-md m-2 flex items-center justify-center",
                                                isSlim ? "p-2 h-10" : "p-4 text-center text-xs"
                                            )}
                                        >
                                            {isSlim ? <HardDrives className="opacity-50" /> : "No storages created yet"}
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer / PiP Placeholder */}
                <div className="p-3 border-t border-border/40 bg-card/30 min-h-[50px] flex flex-col justify-center">
                    {isPipOpen && pipFileId ? (
                        <PiPPlayer isCollapsed={isSidebarCollapsed} />
                    ) : (
                        <>
                            <div className={cn("flex items-center gap-1", isSidebarCollapsed || isSlim ? "flex-col justify-center" : "justify-between w-full")}>
                                {!isSidebarCollapsed && !isSlim ? (
                                    <div className="flex-1 min-w-0 mr-2">
                                        <SyncStatusFooter />
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => {
                                            playSfx('cursor');
                                            setSidebarView('sync');
                                        }}
                                        className="w-8 h-8 mx-auto flex items-center justify-center rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                                        title="Sync Status"
                                    >
                                        <ArrowsClockwise weight="bold" size={18} className={cn(syncStatus === 'syncing' && "animate-spin text-primary")} />
                                    </button>
                                )}

                                <div className={cn("flex items-center gap-1", (isSidebarCollapsed || isSlim) ? "flex-col w-full" : "shrink-0")}>
                                    <button
                                        onClick={() => {
                                            playSfx('cursor');
                                            setSidebarView('history');
                                        }}
                                        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                                        title="History"
                                    >
                                        <ClockCounterClockwise weight="bold" size={18} />
                                    </button>

                                    <button
                                        onClick={() => {
                                            playSfx('cursor');
                                            setSidebarView('trash');
                                        }}
                                        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 text-zinc-400 hover:text-red-400 transition-colors"
                                        title="Trash"
                                    >
                                        <Trash weight="bold" size={18} />
                                    </button>
                                    
                                    {/* Separator - Only in vertical mode */}
                                    {(isSidebarCollapsed || isSlim) && (
                                        <div className="bg-border/40 h-px w-4 mx-auto" />
                                    )}

                                    <button
                                        onClick={() => {
                                            playSfx('cursor');
                                            navigate('/settings');
                                        }}
                                        className={cn(
                                            "w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors",
                                            location.pathname === '/settings' ? "bg-white/10 text-primary" : "text-primary"
                                        )}
                                        title="Settings"
                                    >
                                        <Gear weight="fill" size={18} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                </>
            )}
            </motion.aside>

            {isSidebarCollapsed && !isSlim && (
                <button
                    onClick={() => {
                        playSfx('cursor');
                        toggleSidebarCollapse();
                    }}
                    className="fixed top-1/2 -translate-y-1/2 left-4 z-30 h-10 w-8 rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-200 flex items-center justify-center"
                    title="Show sidebar"
                >
                    <SidebarSimple weight="bold" size={18} />
                </button>
            )}

            <CreateCollectionDialog
                open={createCollectionOpen}
                onOpenChange={setCreateCollectionOpen}
                onSubmit={handleCreateCollection}
                title={sidebarView === 'collections' ? "New Bucket" : "New Collection"}
            />
            <CreateFolderDialog
                open={createFolderOpen}
                onOpenChange={setCreateFolderOpen}
                onSubmit={handleCreateFolder}
            />
            <EditCollectionDialog
                open={editCollectionOpen}
                onOpenChange={setEditCollectionOpen}
                collection={collectionToEdit}
                onSubmit={handleUpdateCollection}
            />

            <CreateStorageDialog
                open={createStorageOpen}
                onOpenChange={setCreateStorageOpen}
                onSubmit={handleCreateStorageSubmit}
            />
            <EditStorageDialog
                open={editStorageOpen}
                onOpenChange={setEditStorageOpen}
                onSubmit={handleUpdateStorage}
                initialName={storageToEdit?.name || ""}
                initialColor={storageToEdit?.color}
                initialIcon={storageToEdit?.icon}
            />
            <EditGraphDialog
                open={editGraphOpen}
                onOpenChange={setEditGraphOpen}
                onSubmit={handleUpdateGraph}
                initialName={graphToEdit?.name || ""}
                initialColor={graphToEdit?.color}
                initialIcon={graphToEdit?.icon}
            />
            <EditDocDialog
                open={renameDocOpen}
                onOpenChange={setRenameDocOpen}
                onSubmit={handleUpdateDoc}
                initialName={docToRename?.name || ""}
                initialColor={docToRename?.color}
                initialIcon={docToRename?.icon}
            />
            <EditProjectDialog
                open={editProjectOpen}
                onOpenChange={setEditProjectOpen}
                currentName={projects.find((p: Project) => p.id === activeProjectId)?.name || ""}
                onSave={(newName) => {
                    if (activeProjectId) {
                        updateProject(activeProjectId, { name: newName });
                    }
                }}
                onDelete={() => {
                    if (activeProjectId) {
                        deleteProject(activeProjectId);
                    }
                }}
            />




            <NewDocDialog
                open={newDocOpen}
                onOpenChange={setNewDocOpen}
                onSubmit={handleCreateDocSubmit}
            />

            <NewGraphDialog
                open={newGraphOpen}
                onOpenChange={setNewGraphOpen}
                onSubmit={handleCreateGraphSubmit}
            />

            <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
                <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>New Project</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Enter a name for your new archive.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-project-name" className="text-zinc-400">Project Name</Label>
                            <Input
                                id="new-project-name"
                                placeholder="E.g. My Creative Work"
                                value={newProjectName}
                                onChange={(e: ReactChangeEvent<HTMLInputElement>) => setNewProjectName(e.target.value)}
                                autoFocus
                                className="bg-zinc-900 border-border/60 text-white placeholder:text-zinc-500 focus-visible:ring-primary/20"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="ghost" 
                            onClick={() => setNewProjectOpen(false)}
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleCreateProjectSubmit} 
                            disabled={!newProjectName.trim()}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            Create Project
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
