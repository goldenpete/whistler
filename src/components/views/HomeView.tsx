/**
 * ─── HomeView.tsx ──────────────────────────────────────────────────
 *
 * Project dashboard and overview page serving as the landing view
 * after selecting a project, with quick access to recent content.
 *
 * Features:
 *   - Recent files, docs, collections, and graphs overview
 *   - Quick-action buttons for creating new content
 *   - Activity feed with recently modified items
 *   - Content type filtering and search
 *   - Breadcrumb navigation and context menus
 *   - Dialogs for adding/renaming files, docs, graphs, and storage
 *
 * Exports: default HomeView component
 * Related: StorageDialogs, CollectionDialogs, useStore
 * ───────────────────────────────────────────────────────────────────
 */
import { useState, useRef, useEffect, useMemo, memo, type MouseEvent, type SyntheticEvent } from "react";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import { findRootBucketId } from "@/utils/collectionUtils";
import type { AccentTheme, File as AppFile, Doc, Collection, Highlight, Graph, Storage, Project } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { formatTime } from "@/lib/utils";
import { 
    FileText, 
    Folder, 
    File as FileIcon, 
    FilmStrip, 
    Image as ImageIcon,
    MusicNote,
    FilePdf,
    Clock,
    Plus,
    Graph as GraphIcon,
    HardDrives,
    Tag,
    NotePencil,
    ProjectorScreenChart,
    FunnelSimple,
    Check,
    MagnifyingGlass
} from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { AddFileDialog, RenameFileDialog, EditDocDialog, EditFolderDialog, EditGraphDialog, CreateStorageDialog, ICONS } from "@/components/dialogs/StorageDialogs";
import { CreateCollectionDialog } from "@/components/dialogs/CollectionDialogs";
import { NewDocDialog, NewGraphDialog, NewProjectDialog } from "@/components/dialogs/CreationDialogs";
import { MoveFileDialog } from "@/components/dialogs/MoveFileDialog";
import { QuickAccessDialog } from "@/components/dialogs/QuickAccessDialog";
import type { QuickAccessType } from "@/components/dialogs/QuickAccessDialog";
import { FileContextMenu } from "@/components/storage/FileContextMenu";
import { Copy, Trash, ArrowSquareOut, PencilSimple, Lightning } from "@phosphor-icons/react";
import { getYouTubeId } from "@/components/player/YouTubePlayer";
import { getYouTubeThumbnailUrl } from "@/constants";
import { CollectionGridPreview } from "@/components/previews/CollectionPreviews";
import { PdfThumbnail } from "@/components/ui/pdf-thumbnail";
import { WhistlerLogo } from "@/components/ui/WhistlerLogo";
import { isValidUrl } from "@/utils/security";
import { createCloudFileSource, detectCloudProvider, getCloudProviderLabel, inferCloudFileType, isCloudFile, type CloudFileDraft } from "@/utils/cloudFiles";
import {
    createLocalFileSource,
    getDisplaySourceLabel,
    inferFileTypeFromUrl,
    isLocalFile,
    resolveLocalFileSource,
    saveLocalFileHandle,
    type PickedLocalFile,
} from "@/utils/localFiles";
import { useResolvedFileUrl } from "@/hooks/useResolvedFileUrl";
import { useCachedThumbnail } from "@/hooks/useCachedThumbnail";

function getGreeting(username: string) {
    const hour = new Date().getHours();
    let greeting = "";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 17) greeting = "Good afternoon";
    else if (hour < 22) greeting = "Good evening";
    else greeting = "Good night";
    
    return `${greeting}, ${username}`;
}

/** Shape of items in the allItems array used by the home view grid. */
type HomeViewItem =
    | {
        id: string;
        type: 'file';
        subType: AppFile['type'];
        name: string;
        timestamp: number;
        data: AppFile;
    }
    | {
        id: string;
        type: 'doc';
        name: string;
        timestamp: number;
        data: Doc;
    }
    | {
        id: string;
        type: 'collection';
        subType?: Collection['type'];
        name: string;
        timestamp: number;
        data: Collection;
    }
    | {
        id: string;
        type: 'bucket';
        name: string;
        timestamp: number;
        data: Collection;
    }
    | {
        id: string;
        type: 'graph';
        name: string;
        timestamp: number;
        data: Graph;
    }
    | {
        id: string;
        type: 'highlight';
        name: string;
        timestamp: number;
        data: Highlight & { file?: AppFile };
    }
    | {
        id: string;
        type: 'storage';
        name: string;
        timestamp: number;
        data: Storage;
    }
    | {
        id: string;
        type: 'project';
        name: string;
        timestamp: number;
        data: Project;
    };

const VideoCardPreview = ({ url, start = 0.1, overrideMiddleFrame = false }: { url: string, start?: number, overrideMiddleFrame?: boolean }) => {
    const { useMiddleFrameForPreviews, cacheFiles } = useStore(useShallow(state => ({
        useMiddleFrameForPreviews: state.useMiddleFrameForPreviews,
        cacheFiles: state.cacheFiles
    })));
    const videoRef = useRef<HTMLVideoElement>(null);
    const youtubeId = getYouTubeId(url);

    // Load cached thumbnail
    const thumbnailKey = (youtubeId || Number.isNaN(start))
        ? null
        : `${url}-${start}-${overrideMiddleFrame ? 'mid' : 'start'}`;
    const cachedThumbnail = useCachedThumbnail(thumbnailKey);

    useEffect(() => {
        if (youtubeId || cachedThumbnail) return;

        const video = videoRef.current;
        if (!video) return;

        const updateTime = () => {
            if (!overrideMiddleFrame && useMiddleFrameForPreviews && video.duration && isFinite(video.duration)) {
                video.currentTime = video.duration / 2;
            } else {
                video.currentTime = start;
            }
        };

        if (video.readyState >= 1) {
            updateTime();
        } else {
            const onLoadedMetadata = () => {
                updateTime();
                video.removeEventListener('loadedmetadata', onLoadedMetadata);
            };
            video.addEventListener('loadedmetadata', onLoadedMetadata);
        }
    }, [useMiddleFrameForPreviews, start, overrideMiddleFrame, youtubeId, cachedThumbnail]);

    if (youtubeId) {
        return (
            <div className="absolute inset-0 bg-black/20">
                <img
                    src={getYouTubeThumbnailUrl(youtubeId, 'hqdefault')}
                    className="w-full h-full object-cover opacity-60"
                    alt="YouTube Preview"
                    loading="lazy"
                    onContextMenu={(e) => e.preventDefault()}
                />
            </div>
        );
    }

    if (cachedThumbnail) {
        return (
             <div className="absolute inset-0 bg-black/20">
                <img
                    src={cachedThumbnail}
                    className="w-full h-full object-cover opacity-60"
                    alt="Video Preview"
                    loading="lazy"
                    onContextMenu={(e) => e.preventDefault()}
                />
            </div>
        );
    }

    return (
        <div className="absolute inset-0 bg-black/20">
            <video
                ref={videoRef}
                src={`${url}#t=${start}`}
                className="w-full h-full object-cover opacity-60"
                muted
                loop
                playsInline
                preload="metadata"
                crossOrigin="anonymous"
                onMouseOver={(e: MouseEvent<HTMLVideoElement>) => {
                    e.currentTarget.play().catch(() => {});
                }}
                onMouseOut={(e: MouseEvent<HTMLVideoElement>) => {
                    const video = e.currentTarget;
                    video.pause();
                    if (!overrideMiddleFrame && useMiddleFrameForPreviews && video.duration && isFinite(video.duration)) {
                        video.currentTime = video.duration / 2;
                    } else {
                        video.currentTime = start;
                    }
                }}
                onContextMenu={(e: MouseEvent<HTMLVideoElement>) => e.preventDefault()}
                onLoadedMetadata={(e: SyntheticEvent<HTMLVideoElement>) => {
                    const video = e.currentTarget;
                    if (!overrideMiddleFrame && useMiddleFrameForPreviews && video.duration && isFinite(video.duration)) {
                        video.currentTime = video.duration / 2;
                    } else {
                        video.currentTime = start;
                    }
                }}
                onSeeked={async (e: SyntheticEvent<HTMLVideoElement>) => {
                    const video = e.currentTarget;
                    if (video.readyState >= 2) {
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                                canvas.toBlob(async (blob) => {
                                    if (blob) {
                                        const key = `${url}-${start}-${overrideMiddleFrame ? 'mid' : 'start'}`;
                                        if (cacheFiles) {
                                            await thumbnailStorage.save(key, blob);
                                        }
                                    }
                                }, 'image/jpeg', 0.7);
                            }
                        } catch {
                            // SecurityError from tainted canvas on cross-origin videos - expected
                        }
                    }
                }}
            />
        </div>
    );
};

const CardPreview = memo(({ item }: { item: HomeViewItem }) => {
    const previewFile = item.type === 'file'
        ? item.data
        : (item.type === 'highlight' ? item.data.file : null);
    const { resolvedUrl } = useResolvedFileUrl(previewFile);

    // Image File
    if (item.type === 'file' && item.subType === 'image' && resolvedUrl) {
        return (
            <div className="absolute inset-0 bg-black/20">
                <img
                    src={resolvedUrl}
                    alt=""
                    className="w-full h-full object-cover opacity-60"
                    loading="lazy"
                    onContextMenu={(e) => e.preventDefault()}
                />
            </div>
        );
    }
    
    // Video File
    if (item.type === 'file' && item.subType === 'video' && resolvedUrl) {
        return <VideoCardPreview url={resolvedUrl} />;
    }

    // PDF File
    if (item.type === 'file' && item.subType === 'pdf' && resolvedUrl) {
        return (
            <div className="absolute inset-0">
                <PdfThumbnail 
                    url={resolvedUrl} 
                    onError={() => {}}
                    width={400}
                    className="w-full h-full object-cover opacity-60"
                />
            </div>
        );
    }

    // Audio File
    if (item.type === 'file' && item.subType === 'audio') {
        return (
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] scale-150 pointer-events-none">
                <MusicNote size={200} weight="fill" />
            </div>
        );
    }

    // Doc
    if (item.type === 'doc') {
        const text = item.data.content?.replace(/<[^>]*>/g, '') || '';
        return (
            <>
                {item.data.color && (
                    <div 
                        className="absolute inset-0 opacity-[0.08]"
                        style={{ backgroundColor: item.data.color as string }}
                    />
                )}
                <div 
                    className="absolute inset-0 flex items-center justify-center opacity-[0.06] scale-150 pointer-events-none"
                    style={item.data.color ? { color: item.data.color as string } : undefined}
                >
                    <NotePencil size={180} weight="fill" />
                </div>
                <div 
                    className="absolute inset-0 p-6 text-[10px] text-foreground/20 font-mono break-words leading-relaxed overflow-hidden select-none pointer-events-none"
                    style={{ maskImage: 'linear-gradient(to bottom, black 50%, transparent)' }}
                >
                    {text.slice(0, 1000)}
                </div>
            </>
        );
    }

    // Collection
    if (item.type === 'collection') {
        const { highlights, files } = useStore.getState();
        return (
            <>
                <CollectionGridPreview 
                    collectionId={item.data.id} 
                    highlights={highlights} 
                    files={files} 
                />
                <div 
                    className="absolute inset-0 opacity-[0.08]"
                    style={{ backgroundColor: item.data.color as string }}
                />
                {/* Only show icon if no grid preview (handled by checking if highlights exist for this collection? 
                    Actually CollectionGridPreview returns null if empty.
                    But we are inside the CardPreview. 
                    If CollectionGridPreview renders, it covers the background?
                    The user said: "if there is nothing to put in the grid because there are no highlights yet, just show the regular one we currently have."
                    
                    CollectionGridPreview uses absolute positioning.
                    We can check if it has items.
                */}
                {(!highlights.some((h) => h.collectionId === item.data.id)) && (
                    <div 
                        className="absolute inset-0 flex items-center justify-center opacity-[0.08] scale-150 pointer-events-none"
                        style={{ color: item.data.color as string }}
                    >
                        <Tag size={180} weight="fill" />
                    </div>
                )}
            </>
        );
    }

    // Bucket
    if (item.type === 'bucket') {
        return (
            <>
                <div
                    className="absolute inset-0 opacity-[0.08]"
                    style={{ backgroundColor: item.data.color as string }}
                />
                <div
                    className="absolute inset-0 flex items-center justify-center opacity-[0.08] scale-150 pointer-events-none"
                    style={{ color: item.data.color as string }}
                >
                    <Folder size={180} weight="fill" />
                </div>
            </>
        );
    }

    // Graph
    if (item.type === 'graph') {
        return (
            <>
                {item.data.color && (
                    <div 
                        className="absolute inset-0 opacity-[0.08]"
                        style={{ backgroundColor: item.data.color as string }}
                    />
                )}
                <div 
                    className="absolute inset-0 flex items-center justify-center opacity-[0.03] scale-150 pointer-events-none"
                    style={item.data.color ? { color: item.data.color as string, opacity: 0.05 } : undefined}
                >
                    <GraphIcon size={200} weight="fill" />
                </div>
            </>
        );
    }

    // Highlight
    if (item.type === 'highlight') {
        const file = item.data.file;
        
        if (file && resolvedUrl && (file.type === 'video' || file.type === 'image' || file.type === 'pdf')) {
            if (file.type === 'image') {
                return (
                    <div className="absolute inset-0 bg-black/20">
                        <img 
                            src={resolvedUrl} 
                            alt="" 
                            className="w-full h-full object-cover opacity-60" 
                            onContextMenu={(e) => e.preventDefault()}
                        />
                    </div>
                );
            }
            
            if (file.type === 'video') {
                return <VideoCardPreview url={resolvedUrl} start={item.data.start || 0.1} overrideMiddleFrame={true} />;
            }

            if (file.type === 'pdf') {
                return (
                    <div className="absolute inset-0">
                        <PdfThumbnail 
                            url={resolvedUrl} 
                            onError={() => {}}
                            width={400}
                            page={item.data.start || 1}
                            rect={item.data.rect || undefined}
                            className="w-full h-full object-cover opacity-60"
                        />
                    </div>
                );
            }
        }

        return (
            <div className="absolute -top-4 -left-4 text-[120px] leading-none opacity-[0.03] font-serif pointer-events-none">
                “
            </div>
        );
    }

    // Folder
    if (item.type === 'file' && item.subType === 'folder') {
        return (
            <>
                {item.data.color && (
                    <div 
                        className="absolute inset-0 opacity-[0.08]"
                        style={{ backgroundColor: item.data.color as string }}
                    />
                )}
                <div 
                    className="absolute inset-0 flex items-center justify-center opacity-[0.08] scale-150 pointer-events-none"
                    style={item.data.color ? { color: item.data.color as string } : undefined}
                >
                    <Folder size={180} weight="fill" />
                </div>
            </>
        );
    }

    return null;
}, (prev, next) => {
    // Custom comparison since 'item' is a new object on every render
    // We check if the ID, type, and underlying data reference are the same.
    // Also check timestamp which indicates modification.
    return prev.item.id === next.item.id && 
           prev.item.type === next.item.type &&
           prev.item.timestamp === next.item.timestamp &&
           prev.item.data === next.item.data;
});

export default function HomeView() {
    const { 
        accentTheme, 
        user, 
        files, 
        docs, 
        collections, 
        highlights, 
        graphs,
        storages,
        projects,
        activeProjectId,
        activeStorageId,
        activeCollectionId
    } = useStore(useShallow((state) => ({
        accentTheme: state.accentTheme,
        user: state.user,
        files: state.files,
        docs: state.docs,
        collections: state.collections,
        highlights: state.highlights,
        graphs: state.graphs,
        storages: state.storages,
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        activeStorageId: state.activeStorageId,
        activeCollectionId: state.activeCollectionId,
    })));
    
    const navigate = useNavigate();

    const [addFileOpen, setAddFileOpen] = useState(false);
    const [addCollectionOpen, setAddCollectionOpen] = useState(false);
    const [addBucketOpen, setAddBucketOpen] = useState(false);
    const [addDocOpen, setAddDocOpen] = useState(false);
    const [addGraphOpen, setAddGraphOpen] = useState(false);
    const [addStorageOpen, setAddStorageOpen] = useState(false);
    const [addProjectOpen, setAddProjectOpen] = useState(false);
    
    // Filter State
    const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState<Set<string>>(() => {
        const saved = localStorage.getItem('home_view_filters');
        if (saved) {
            try {
                return new Set(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse filters", e);
            }
        }
        return new Set(['file', 'doc', 'collection', 'bucket', 'graph', 'highlight', 'storage', 'project']);
    });

    const toggleFilter = (type: string) => {
        const newFilters = new Set(activeFilters);
        if (newFilters.has(type)) {
            newFilters.delete(type);
        } else {
            newFilters.add(type);
        }
        setActiveFilters(newFilters);
        localStorage.setItem('home_view_filters', JSON.stringify(Array.from(newFilters)));
    };
    const [quickAccessOpen, setQuickAccessOpen] = useState(false);
    const [quickAccessType, setQuickAccessType] = useState<QuickAccessType | null>(null);
    const [quickAccessPopoverOpen, setQuickAccessPopoverOpen] = useState(false);
    
    // Rename/Edit Dialog States
    const [renameItem, setRenameItem] = useState<HomeViewItem | null>(null);
    const [renameFileOpen, setRenameFileOpen] = useState(false);
    const [renameDocOpen, setRenameDocOpen] = useState(false);
    const [editCollectionOpen, setEditCollectionOpen] = useState(false);
    const [renameGraphOpen, setRenameGraphOpen] = useState(false);

    // Storage Dialog States
    const [moveDialogOpen, setMoveDialogOpen] = useState(false);
    const [fileToMove, setFileToMove] = useState<AppFile | null>(null);

    const handleMoveInit = (file: AppFile) => {
        setFileToMove(file);
        setMoveDialogOpen(true);
    };

    const handleColorChange = (file: AppFile, color: string) => {
        useStore.setState((state) => ({
            files: state.files.map((f: AppFile) => f.id === file.id ? { ...f, color, lastModified: Date.now() } : f)
        }));
    };

    const handleIconChange = (file: AppFile, icon: string) => {
        useStore.setState((state) => ({
            files: state.files.map((f: AppFile) => f.id === file.id ? { ...f, icon, lastModified: Date.now() } : f)
        }));
    };

    const [popoverOpen, setPopoverOpen] = useState(false);

    const handleAddFile = (url: string, name: string) => {
        if (!activeProjectId) return;
        
        const trimmedUrl = url.trim();
        if (!trimmedUrl) return;

        if (!isValidUrl(trimmedUrl)) {
            alert("Invalid URL. Only http, https, blob, and data protocols are allowed.");
            return;
        }

        let targetStorageId = activeStorageId;
        if (!targetStorageId) {
            const projectStorages = storages.filter((s) => s.projectId === activeProjectId);
            if (projectStorages.length > 0) {
                targetStorageId = projectStorages[0].id;
            } else {
                const newStorage = {
                    id: crypto.randomUUID(),
                    projectId: activeProjectId,
                    name: "Main Storage",
                    created: Date.now(),
                    lastModified: Date.now()
                };
                useStore.setState((state) => ({ 
                    storages: [...state.storages, newStorage],
                    activeStorageId: newStorage.id 
                }));
                targetStorageId = newStorage.id;
            }
        }

        const type = inferFileTypeFromUrl(url);
        const newFile: AppFile = {
            id: crypto.randomUUID(),
            projectId: activeProjectId,
            storageId: targetStorageId,
            parentId: null,
            name,
            url,
            type,
            order: files.filter((f: AppFile) => f.projectId === activeProjectId && !f.parentId).length,
            created: Date.now(),
            lastModified: Date.now()
        };
        useStore.setState((state) => ({ files: [...state.files, newFile] }));
        setPopoverOpen(false);
        navigate(`/file/${newFile.id}`);
    };

    const handleAddLocalFile = async (selection: PickedLocalFile) => {
        if (!activeProjectId) return;

        let targetStorageId = activeStorageId;
        if (!targetStorageId) {
            const projectStorages = storages.filter((s) => s.projectId === activeProjectId);
            if (projectStorages.length > 0) {
                targetStorageId = projectStorages[0].id;
            } else {
                const newStorage = {
                    id: crypto.randomUUID(),
                    projectId: activeProjectId,
                    name: "Main Storage",
                    created: Date.now(),
                    lastModified: Date.now()
                };
                useStore.setState((state) => ({
                    storages: [...state.storages, newStorage],
                    activeStorageId: newStorage.id
                }));
                targetStorageId = newStorage.id;
            }
        }

        const bindingId = crypto.randomUUID();
        await saveLocalFileHandle(bindingId, selection.handle);

        const localSource = createLocalFileSource(bindingId, selection.browserFile);
        const newFile: AppFile = {
            id: crypto.randomUUID(),
            projectId: activeProjectId,
            storageId: targetStorageId,
            parentId: null,
            name: selection.browserFile.name,
            url: null,
            sourceKind: 'local',
            localSource,
            type: selection.inferredType,
            order: files.filter((f: AppFile) => f.projectId === activeProjectId && !f.parentId).length,
            created: Date.now(),
            lastModified: Date.now()
        };

        useStore.setState((state) => ({ files: [...state.files, newFile] }));

        const resolution = await resolveLocalFileSource(localSource);
        if (resolution.status === 'ready' && resolution.url) {
            useStore.setState((state) => ({
                files: state.files.map((candidate) => (
                    candidate.id === newFile.id
                        ? { ...candidate, url: resolution.url }
                        : candidate
                ))
            }));
        }

        setPopoverOpen(false);
        navigate(`/file/${newFile.id}`);
    };

    const handleAddCloudFile = (draft: CloudFileDraft) => {
        if (!activeProjectId) return;

        const cloudSource = createCloudFileSource(draft.provider, draft.shareUrl);
        if (!cloudSource) {
            alert(`Unsupported ${getCloudProviderLabel(draft.provider)} link. Use a public file share URL.`);
            return;
        }

        let targetStorageId = activeStorageId;
        if (!targetStorageId) {
            const projectStorages = storages.filter((s) => s.projectId === activeProjectId);
            if (projectStorages.length > 0) {
                targetStorageId = projectStorages[0].id;
            } else {
                const newStorage = {
                    id: crypto.randomUUID(),
                    projectId: activeProjectId,
                    name: "Main Storage",
                    created: Date.now(),
                    lastModified: Date.now()
                };
                useStore.setState((state) => ({ 
                    storages: [...state.storages, newStorage],
                    activeStorageId: newStorage.id 
                }));
                targetStorageId = newStorage.id;
            }
        }

        const newFile: AppFile = {
            id: crypto.randomUUID(),
            projectId: activeProjectId,
            storageId: targetStorageId,
            parentId: null,
            name: draft.name,
            url: cloudSource.shareUrl,
            sourceKind: 'cloud',
            cloudSource,
            type: inferCloudFileType(draft.name, cloudSource, 'file', draft.typeSelection),
            order: files.filter((f: AppFile) => f.projectId === activeProjectId && !f.parentId).length,
            created: Date.now(),
            lastModified: Date.now()
        };

        useStore.setState((state) => ({ files: [...state.files, newFile] }));
        setPopoverOpen(false);
        navigate(`/file/${newFile.id}`);
    };

    const handleCreateCollection = (name: string, color: string, icon: string) => {
        if (!activeProjectId) return;
        
        // Ensure we have a bucket to put this collection in
        let targetBucketId = activeCollectionId;
        
        // If no active bucket, find the first one for this project
        if (!targetBucketId) {
            const firstBucket = collections.find((c: Collection) => 
                c.projectId === activeProjectId && 
                c.parentId === null && 
                c.type === 'bucket' && 
                !c.deleted
            );
            if (firstBucket) {
                targetBucketId = firstBucket.id;
            }
        }

        // If still no bucket, we cannot create a collection
        if (!targetBucketId) {
            console.warn("No active bucket found for collection creation");
            return;
        }

        const sameParentItems = collections.filter(c => c.parentId === targetBucketId);
        const maxOrder = sameParentItems.length > 0 
            ? Math.max(...sameParentItems.map(c => c.order || 0)) 
            : -1;

        const newCollection: Collection = {
            id: crypto.randomUUID(),
            projectId: activeProjectId,
            parentId: targetBucketId,
            name,
            color,
            icon,
            type: 'collection',
            order: maxOrder + 1,
            created: Date.now(),
            lastModified: Date.now()
        };
        useStore.setState((state) => ({ 
            collections: [...state.collections, newCollection],
            activeCollectionId: targetBucketId // Keep the bucket active
        }));
        setPopoverOpen(false);
        navigate(`/collection/${newCollection.id}`);
    };

    const handleCreateBucket = (name: string, color: string, icon: string) => {
        if (!activeProjectId) return;

        const siblingBuckets = collections.filter((c: Collection) =>
            c.projectId === activeProjectId &&
            c.parentId === null &&
            c.type === 'bucket' &&
            !c.deleted
        );
        const maxOrder = siblingBuckets.length > 0
            ? Math.max(...siblingBuckets.map((c) => c.order || 0))
            : -1;

        const newBucket: Collection = {
            id: crypto.randomUUID(),
            projectId: activeProjectId,
            parentId: null,
            name,
            color,
            icon,
            type: 'bucket',
            order: maxOrder + 1,
            created: Date.now(),
            lastModified: Date.now()
        };

        useStore.setState((state) => ({
            collections: [...state.collections, newBucket],
            activeCollectionId: newBucket.id
        }));
        setPopoverOpen(false);
        navigate('/collections');
    };

    const handleCreateDoc = (name: string, color: string, icon: string) => {
        if (!activeProjectId) return;
        useStore.getState().addDoc(name, activeProjectId, color, icon);
        setPopoverOpen(false);
        navigate('/docs');
    };

    const handleCreateGraph = (name: string, color: string, icon: string) => {
        if (!activeProjectId) return;
        useStore.getState().addGraph(name, activeProjectId, color, icon);
        setPopoverOpen(false);
        navigate('/graphs');
    };

    const handleCreateStorage = (name: string, color: string, icon: string) => {
        if (!activeProjectId) return;
        useStore.getState().addStorage(name, activeProjectId, color, icon);
        setPopoverOpen(false);
        navigate('/storage');
    };

    const handleCreateProject = (name: string) => {
        const newProject = useStore.getState().addProject(name);
        const storages = useStore.getState().storages;
        const projectStorage = storages.find((s) => s.projectId === newProject.id);
        
        useStore.setState({ 
            activeProjectId: newProject.id,
            activeStorageId: projectStorage?.id || null 
        });
        setPopoverOpen(false);
    };

    const username = user?.email?.split('@')[0] || "User";

    // Filter items for current project
    const projectFiles = useMemo(() => files.filter((f: AppFile) => f.projectId === activeProjectId && !f.deleted), [files, activeProjectId]);
    const projectDocs = useMemo(() => docs.filter((d: Doc) => d.projectId === activeProjectId && !d.deleted), [docs, activeProjectId]);
    const projectCollections = useMemo(() => collections.filter((c: Collection) =>
        c.projectId === activeProjectId && !c.deleted && c.type !== 'bucket'
    ), [collections, activeProjectId]);
    const projectBuckets = useMemo(() => collections.filter((c: Collection) =>
        c.projectId === activeProjectId && !c.deleted && c.type === 'bucket'
    ), [collections, activeProjectId]);
    const projectGraphs = useMemo(() => (graphs || []).filter((g) => g.projectId === activeProjectId), [graphs, activeProjectId]);

    // Recent Highlights logic
    const projectFileIds = useMemo(() => new Set(projectFiles.map((f: AppFile) => f.id)), [projectFiles]);
    const projectHighlights = useMemo(() => highlights
        .filter((h) => projectFileIds.has(h.fileId)), [highlights, projectFileIds]);

    const formatHighlightLabel = (h: Highlight, file?: AppFile) => {
        if (file?.type === 'pdf') {
            return h.end && h.end !== h.start ? `Page ${h.start}-${h.end}` : `Page ${h.start}`;
        }
        return `${formatTime(h.start)} - ${formatTime(h.end || h.start)}`;
    };

    const getFileIcon = (type: AppFile['type']) => {
        switch (type) {
            case 'video': return FilmStrip;
            case 'image': return ImageIcon;
            case 'audio': return MusicNote;
            case 'pdf': return FilePdf;
            case 'folder': return Folder;
            default: return FileIcon;
        }
    };

    // Unify all items
    const allItems: HomeViewItem[] = useMemo(() => [
        ...projectFiles.map((f: AppFile) => ({
            id: f.id,
            type: 'file' as const,
            subType: f.type,
            name: f.name,
            timestamp: Math.max(f.lastModified, f.lastViewed || 0),
            data: f
        })),
        ...projectDocs.map((d: Doc) => ({
            id: d.id,
            type: 'doc' as const,
            name: d.name,
            timestamp: Math.max(d.lastModified || d.created, d.lastViewed || 0),
            data: d
        })),
        ...projectCollections.map((c: Collection) => ({
            id: c.id,
            type: 'collection' as const,
            subType: c.type,
            name: c.name,
            timestamp: Math.max(c.lastModified, c.lastViewed || 0),
            data: c
        })),
        ...projectBuckets.map((b: Collection) => ({
            id: b.id,
            type: 'bucket' as const,
            name: b.name,
            timestamp: Math.max(b.lastModified, b.lastViewed || 0),
            data: b
        })),
        ...projectGraphs.map((g) => ({
            id: g.id,
            type: 'graph' as const,
            name: g.name,
            timestamp: Math.max(g.lastModified || g.created, g.lastViewed || 0),
            data: g
        })),
        ...projectHighlights.map((h) => {
            const file = files.find((f: AppFile) => f.id === h.fileId);
            const label = formatHighlightLabel(h, file);
            return {
                id: h.id,
                type: 'highlight' as const,
                name: h.note || label,
                timestamp: h.created || 0,
                data: { ...h, file }
            };
        }),
        ...storages.filter((s) => s.projectId === activeProjectId).map((s) => ({
            id: s.id,
            type: 'storage' as const,
            name: s.name,
            timestamp: Math.max(s.lastModified || s.created, (s as Storage & { lastViewed?: number }).lastViewed || 0),
            data: s
        })),
        ...(projects || []).map((p) => ({
            id: p.id,
            type: 'project' as const,
            name: p.name,
            timestamp: Math.max(p.lastModified || p.created, (p as Project & { lastViewed?: number }).lastViewed || 0),
            data: p
        }))
    ].sort((a, b) => b.timestamp - a.timestamp), [projectFiles, projectDocs, projectCollections, projectBuckets, projectGraphs, projectHighlights, files, storages, activeProjectId, projects]);

    const filteredItems = useMemo(() => allItems.filter(item => activeFilters.has(item.type)), [allItems, activeFilters]);

    const getItemIcon = (item: typeof allItems[0]) => {
        if ((item.type === 'collection' || item.type === 'bucket' || item.type === 'doc' || item.type === 'graph' || item.type === 'storage') && item.data.icon) {
            const customIcon = ICONS.find(i => i.name === item.data.icon)?.icon;
            if (customIcon) return customIcon;
        }

        switch (item.type) {
            case 'file': return getFileIcon(item.subType as AppFile['type']);
            case 'doc': return FileText;
            case 'collection': return Tag;
            case 'bucket': return Folder;
            case 'graph': return GraphIcon;
            case 'highlight': return Clock;
            case 'storage': return HardDrives;
            case 'project': return ProjectorScreenChart;
        }
    };

    const getItemLabel = (item: typeof allItems[0]) => {
        switch (item.type) {
            case 'file':
                return item.subType === 'folder' ? 'Folder' : 'File';
            case 'doc':
                return 'Doc';
            case 'collection':
                return item.subType === 'folder' ? 'Folder' : 'Collection';
            case 'bucket':
                return 'Bucket';
            case 'graph':
                return 'Graph';
            case 'highlight':
                return 'Highlight';
            case 'storage':
                return 'Storage';
            case 'project':
                return 'Project';
            default:
                return 'Unknown';
        }
    };

    const getItemColor = (item: typeof allItems[0]): string | undefined => {
        switch (item.type) {
            case 'file':
            case 'doc':
            case 'collection':
            case 'bucket':
            case 'graph':
            case 'storage':
                return item.data.color;
            default:
                return undefined;
        }
    };

    const handleItemClick = (item: typeof allItems[0]) => {
        switch (item.type) {
            case 'file':
                if (item.subType === 'folder') {
                    navigate(`/storage/${item.data.storageId}?folderId=${item.id}`);
                } else {
                    useStore.getState().setActiveFile(item.id);
                    navigate(`/file/${item.id}`);
                }
                break;
            case 'doc':
                useStore.getState().setActiveDoc(item.id);
                navigate(`/docs/${item.id}`);
                break;
            case 'collection':
                {
                    const bucketId = findRootBucketId(useStore.getState().collections, item.id);
                    if (bucketId) {
                        useStore.getState().setActiveCollection(bucketId);
                    }
                    if (item.subType === 'folder') {
                        navigate(`/collections?folderId=${item.id}`);
                    } else {
                        navigate(`/collection/${item.id}`);
                    }
                }
                break;
            case 'bucket':
                useStore.getState().setActiveCollection(item.id);
                navigate('/collections');
                break;
            case 'graph':
                useStore.getState().setActiveGraph(item.id);
                navigate(`/graphs/${item.id}`);
                break;
            case 'highlight':
                if (item.data.file) {
                    useStore.getState().setActiveHighlight(item.id);
                    useStore.getState().setActiveFile(item.data.file.id);
                    navigate(`/file/${item.data.file.id}`);
                }
                break;
            case 'storage':
                useStore.setState({ activeStorageId: item.id });
                navigate(`/storage/${item.id}`);
                break;
            case 'project':
                useStore.setState({ activeProjectId: item.id });
                break;
        }
    };

    const handleRename = (name: string, description?: string, color?: string, icon?: string, url?: string) => {
        if (!renameItem) return;

        const { id, type } = renameItem;
        
        switch (type) {
            case 'file':
                if (!isLocalFile(renameItem.data) && url && !isValidUrl(url.trim())) {
                    alert("Invalid URL. Only http, https, blob, and data protocols are allowed.");
                    return;
                }

                if (isCloudFile(renameItem.data)) {
                    const nextUrl = url?.trim() || renameItem.data.cloudSource.shareUrl;
                    const provider = detectCloudProvider(nextUrl) || renameItem.data.cloudSource.provider;
                    const cloudSource = createCloudFileSource(provider, nextUrl);
                    if (!cloudSource) {
                        alert("Unsupported cloud share link. Use a public Google Drive, Dropbox, or OneDrive file link.");
                        return;
                    }

                    useStore.getState().updateFile(id, {
                        name,
                        description,
                        url: cloudSource.shareUrl,
                        cloudSource,
                        type: inferCloudFileType(name, cloudSource, renameItem.data.type),
                        color: color || undefined,
                        icon: icon || undefined,
                    });
                    break;
                }

                useStore.getState().updateFile(id, {
                    name,
                    description,
                    url: isLocalFile(renameItem.data) ? renameItem.data.url : url?.trim(),
                    color: color || undefined,
                    icon: icon || undefined,
                });
                break;
            case 'doc':
                if (color || icon) {
                    useStore.getState().updateDoc(id, { name, color, icon });
                } else {
                    useStore.getState().updateDoc(id, { name });
                }
                break;
            case 'collection':
            case 'bucket':
                if (color && icon) {
                    useStore.getState().updateCollection(id, { name, color, icon });
                }
                break;
            case 'graph':
                if (color || icon) {
                    useStore.getState().updateGraph(id, { name, color, icon });
                } else {
                    useStore.getState().updateGraph(id, { name });
                }
                break;
        }
        
        setRenameItem(null);
    };

    const handleDelete = (item: typeof allItems[0]) => {
        switch (item.type) {
            case 'file':
                useStore.getState().trashFile(item.id);
                break;
            case 'doc':
                useStore.getState().trashDoc(item.id);
                break;
            case 'collection':
            case 'bucket':
                useStore.getState().trashCollection(item.id);
                break;
            case 'graph':
                useStore.getState().trashGraph(item.id);
                break;
            case 'highlight':
                useStore.getState().removeHighlight(item.id);
                break;
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        // Toast logic here if we had toast
    };

    const openRenameDialog = (item: typeof allItems[0]) => {
        setRenameItem(item);
        switch (item.type) {
            case 'file':
                setRenameFileOpen(true);
                break;
            case 'doc':
                setRenameDocOpen(true);
                break;
            case 'collection':
            case 'bucket':
                setEditCollectionOpen(true);
                break;
            case 'graph':
                setRenameGraphOpen(true);
                break;
        }
    };



    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center gap-4 p-8 pb-4 shrink-0">
                <WhistlerLogo 
                    className="rounded-xl pointer-events-none select-none shadow-sm"
                    width={48}
                    height={48}
                />
                <h1 className="text-2xl font-semibold tracking-tight text-foreground flex-1">
                    {getGreeting(username)}
                </h1>
                
                <Button 
                    variant="outline" 
                    className="gap-2 text-muted-foreground hover:text-foreground w-64 justify-start px-3"
                    onClick={() => useStore.getState().setSpotlightOpen(true)}
                >
                    <MagnifyingGlass weight="bold" />
                    <span className="font-normal">Search...</span>
                    <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        <span className="text-xs">Ctrl</span>K
                    </kbd>
                </Button>

                <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <FunnelSimple weight="bold" />
                            Filter
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-1" align="end">
                        <div className="p-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Filter Items
                        </div>
                        {['file', 'doc', 'collection', 'bucket', 'graph', 'highlight', 'storage', 'project'].map((type) => (
                            <Button
                                key={type}
                                variant="ghost"
                                className="w-full justify-start gap-2 h-9 px-2 font-normal"
                                onClick={() => toggleFilter(type)}
                            >
                                <div className={`flex items-center justify-center w-4 h-4 rounded-sm border ${activeFilters.has(type) ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground opacity-50'}`}>
                                    {activeFilters.has(type) && <Check size={10} weight="bold" />}
                                </div>
                                <span className="capitalize">{type === 'file' ? 'Files' : type + 's'}</span>
                            </Button>
                        ))}
                    </PopoverContent>
                </Popover>
                
                <Popover open={quickAccessPopoverOpen} onOpenChange={setQuickAccessPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <Lightning weight="bold" />
                            Quick Access
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1" align="end">
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setQuickAccessType('file'); setQuickAccessOpen(true); setQuickAccessPopoverOpen(false); }}>
                            <FileIcon className="text-muted-foreground" size={16} /> Files
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setQuickAccessType('highlight'); setQuickAccessOpen(true); setQuickAccessPopoverOpen(false); }}>
                            <Clock className="text-muted-foreground" size={16} /> Highlights
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setQuickAccessType('collection'); setQuickAccessOpen(true); setQuickAccessPopoverOpen(false); }}>
                            <Tag className="text-muted-foreground" size={16} /> Collections
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setQuickAccessType('bucket'); setQuickAccessOpen(true); setQuickAccessPopoverOpen(false); }}>
                            <Folder className="text-muted-foreground" size={16} /> Buckets
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setQuickAccessType('doc'); setQuickAccessOpen(true); setQuickAccessPopoverOpen(false); }}>
                            <NotePencil className="text-muted-foreground" size={16} /> Docs
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setQuickAccessType('graph'); setQuickAccessOpen(true); setQuickAccessPopoverOpen(false); }}>
                            <GraphIcon className="text-muted-foreground" size={16} /> Graphs
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setQuickAccessType('storage'); setQuickAccessOpen(true); setQuickAccessPopoverOpen(false); }}>
                            <HardDrives className="text-muted-foreground" size={16} /> Storages
                        </Button>
                        <div className="h-px bg-border my-1" />
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setQuickAccessType('project'); setQuickAccessOpen(true); setQuickAccessPopoverOpen(false); }}>
                            <ProjectorScreenChart className="text-muted-foreground" size={16} /> Projects
                        </Button>
                    </PopoverContent>
                </Popover>
                
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button className="gap-2">
                            <Plus weight="bold" />
                            Add
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1" align="end">
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setAddFileOpen(true); setPopoverOpen(false); }}>
                            <FileIcon className="text-muted-foreground" size={16} /> Add File
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setAddCollectionOpen(true); setPopoverOpen(false); }}>
                            <Tag className="text-muted-foreground" size={16} /> Add Collection
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setAddBucketOpen(true); setPopoverOpen(false); }}>
                            <Folder className="text-muted-foreground" size={16} /> Add Bucket
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setAddDocOpen(true); setPopoverOpen(false); }}>
                            <NotePencil className="text-muted-foreground" size={16} /> Add Doc
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setAddGraphOpen(true); setPopoverOpen(false); }}>
                            <GraphIcon className="text-muted-foreground" size={16} /> Add Graph
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setAddStorageOpen(true); setPopoverOpen(false); }}>
                            <HardDrives className="text-muted-foreground" size={16} /> Add Storage
                        </Button>
                        <div className="h-px bg-border my-1" />
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setAddProjectOpen(true); setPopoverOpen(false); }}>
                            <ProjectorScreenChart className="text-muted-foreground" size={16} /> Add Project
                        </Button>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-auto p-8 pt-4" style={{ willChange: 'transform' }}>
                <div className="space-y-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-2 text-muted-foreground mb-4">
                        <Clock className="w-4 h-4" />
                        <h2 className="text-sm font-medium uppercase tracking-wider">Recent Activity</h2>
                    </div>
                    
                    {filteredItems.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredItems.slice(0, 50).map(item => {
                                const Icon = getItemIcon(item) || FileIcon;
                                const label = getItemLabel(item);
                                
                                return (
                                    <ContextMenu key={`${item.type}-${item.id}`}>
                                        <ContextMenuTrigger asChild>
                                            <button
                                                onClick={() => handleItemClick(item)}
                                                className="group relative flex flex-col items-start justify-end gap-3 p-4 rounded-none border border-border/40 bg-card/30 hover:bg-card/50 hover:border-accent/50 transition-colors text-left overflow-hidden h-48 shadow-sm"
                                                style={{ contentVisibility: 'auto', containIntrinsicBlockSize: '12rem' }}
                                            >
                                                {/* Background Preview */}
                                                <CardPreview item={item} />
                                                
                                                {/* Gradient Overlay for Text Readability */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent z-10" />

                                                {/* Content Layer */}
                                                <div className="relative z-20 w-full flex flex-col h-full">
                                                    <div className="flex items-center justify-between w-full gap-2 mb-auto">
                                                        <div className="p-2 shrink-0 rounded-none bg-background/80 text-muted-foreground group-hover:text-primary transition-colors shadow-sm">
                                                            <Icon weight="duotone" className="w-5 h-5" style={getItemColor(item) ? { color: getItemColor(item) } : undefined} />
                                                        </div>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-none bg-background/80 text-muted-foreground/80 shadow-sm border border-border/20">
                                                            {label}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="w-full min-w-0 flex flex-col gap-1 mt-4">
                                                        <div className="font-semibold text-sm truncate leading-tight group-hover:text-primary transition-colors" title={item.name}>
                                                            {item.name}
                                                        </div>
                                                        {item.type === 'highlight' && item.data.file && (
                                                            <div className="text-xs text-muted-foreground/80 truncate">
                                                                in {item.data.file.name}
                                                            </div>
                                                        )}
                                                        <div className="text-[11px] text-muted-foreground/60 truncate pt-2 mt-1 border-t border-border/10 w-full font-medium">
                                                            {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        </ContextMenuTrigger>
                                        {item.type === 'file' ? (
                                            <FileContextMenu 
                                                file={item.data}
                                                onRename={() => openRenameDialog(item)}
                                                onMove={() => handleMoveInit(item.data)}
                                                onSelect={() => {}} 
                                                onColorChange={(color) => handleColorChange(item.data, color)}
                                                onIconChange={(icon) => handleIconChange(item.data, icon)}
                                            />
                                        ) : (
                                            <ContextMenuContent>
                                                <ContextMenuItem onClick={() => handleItemClick(item)}>
                                                    <ArrowSquareOut className="mr-2 h-4 w-4" />
                                                    Open
                                                </ContextMenuItem>
                                                
                                                {item.type === 'highlight' ? (
                                                    <>
                                                        <ContextMenuItem onClick={() => handleCopy(item.data.text || item.data.note)}>
                                                            <Copy className="mr-2 h-4 w-4" />
                                                            Copy Text
                                                        </ContextMenuItem>
                                                    </>
                                                ) : (
                                                    <ContextMenuItem onClick={() => openRenameDialog(item)}>
                                                        <PencilSimple className="mr-2 h-4 w-4" />
                                                        Rename
                                                    </ContextMenuItem>
                                                )}
                                                
                                                <ContextMenuSeparator />
                                                
                                                <ContextMenuItem 
                                                    className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                                                    onClick={() => handleDelete(item)}
                                                >
                                                    <Trash className="mr-2 h-4 w-4" />
                                                    Move to Trash
                                                </ContextMenuItem>
                                            </ContextMenuContent>
                                        )}
                                    </ContextMenu>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-20 text-muted-foreground/50 italic">
                            No recent activity found
                        </div>
                    )}
                </div>

            </div>
            <AddFileDialog
                open={addFileOpen}
                onOpenChange={setAddFileOpen}
                onSubmitRemote={handleAddFile}
                onSubmitCloud={handleAddCloudFile}
                onSubmitLocal={handleAddLocalFile}
            />
            <CreateCollectionDialog
                open={addCollectionOpen}
                onOpenChange={setAddCollectionOpen}
                onSubmit={handleCreateCollection}
            />
            <CreateCollectionDialog
                open={addBucketOpen}
                onOpenChange={setAddBucketOpen}
                onSubmit={handleCreateBucket}
                title="New Bucket"
            />
            <NewDocDialog
                open={addDocOpen}
                onOpenChange={setAddDocOpen}
                onSubmit={handleCreateDoc}
            />
            <NewGraphDialog
                open={addGraphOpen}
                onOpenChange={setAddGraphOpen}
                onSubmit={handleCreateGraph}
            />
            <CreateStorageDialog
                open={addStorageOpen}
                onOpenChange={setAddStorageOpen}
                onSubmit={handleCreateStorage}
            />
            <NewProjectDialog
                open={addProjectOpen}
                onOpenChange={setAddProjectOpen}
                onSubmit={handleCreateProject}
            />

            <QuickAccessDialog
                open={quickAccessOpen}
                onOpenChange={setQuickAccessOpen}
                type={quickAccessType}
            />

            {/* Rename/Edit Dialogs */}
            {renameItem && (
                <>
                    <RenameFileDialog
                        open={renameFileOpen}
                        onOpenChange={setRenameFileOpen}
                        onSubmit={(name, description, url, color) => handleRename(name, description, color, undefined, url)}
                        initialName={renameItem.name}
                        initialDescription={renameItem.type === 'file' ? renameItem.data.description : undefined}
                        initialUrl={renameItem.type === 'file'
                            ? (isCloudFile(renameItem.data) ? renameItem.data.cloudSource.shareUrl : (renameItem.data.url || undefined))
                            : undefined}
                        initialColor={renameItem.type === 'file' ? renameItem.data.color : undefined}
                        isLocalFileSource={renameItem.type === 'file' ? isLocalFile(renameItem.data) : false}
                        localSourceLabel={renameItem.type === 'file' ? getDisplaySourceLabel(renameItem.data) : ''}
                    />
                    <EditDocDialog
                        open={renameDocOpen}
                        onOpenChange={setRenameDocOpen}
                        onSubmit={(name, color, icon) => handleRename(name, undefined, color, icon)}
                        initialName={renameItem.name}
                        initialColor={renameItem.type === 'doc' ? renameItem.data.color : undefined}
                        initialIcon={renameItem.type === 'doc' ? renameItem.data.icon : undefined}
                    />
                    <EditFolderDialog
                        open={editCollectionOpen}
                        onOpenChange={setEditCollectionOpen}
                        onSubmit={(name, description, color, icon) => handleRename(name, undefined, color, icon)}
                        initialName={renameItem.name}
                        initialColor={renameItem.type === 'collection' || renameItem.type === 'bucket' ? renameItem.data.color : undefined}
                        initialIcon={renameItem.type === 'collection' || renameItem.type === 'bucket' ? renameItem.data.icon : undefined}
                    />
                    <EditGraphDialog
                        open={renameGraphOpen}
                        onOpenChange={setRenameGraphOpen}
                        onSubmit={(name, color, icon) => handleRename(name, undefined, color, icon)}
                        initialName={renameItem.name}
                        initialColor={renameItem.type === 'graph' ? renameItem.data.color : undefined}
                        initialIcon={renameItem.type === 'graph' ? renameItem.data.icon : undefined}
                    />
                    <MoveFileDialog
                        open={moveDialogOpen}
                        onOpenChange={setMoveDialogOpen}
                        fileIds={fileToMove ? [fileToMove.id] : []}
                    />
                </>
            )}
        </div>
    );
}
