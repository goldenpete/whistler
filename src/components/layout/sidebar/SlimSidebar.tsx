/**
 * SlimSidebar.tsx
 *
 * Collapsed icon-only sidebar mode. Renders a vertical strip of icon buttons
 * for quick navigation to Home, Storage, Docs, Graphs, Collections, and
 * utility views (Sync, History, Trash, Settings).
 *
 * Also shows bucket icons from the active project's collection tree.
 *
 * All buttons use squared styling with border/shadow matching the expanded
 * sidebar's search and collapse buttons.
 */

import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    SidebarSimple,
    HardDrives,
    NotePencil,
    Graph,
    FolderOpen,
    Folder,
    Trash,
    MagnifyingGlass,
    ArrowsClockwise,
    PencilSimple,
    ClockCounterClockwise,
    Gear,
    House,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import { getIcon } from "@/utils/iconMap";
import { playSfx } from "@/utils/sound";
import type { Collection } from "@/types";

import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PiPPlayer } from "@/components/player/PiPPlayer";

const BTN = "h-8 w-8 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200";
const BTN_ACTIVE = "h-8 w-8 flex items-center justify-center rounded-none border shadow-sm transition-all duration-200 bg-primary/20 text-primary border-primary/30";
const NAV_BTN = "h-9 w-9 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200";
const NAV_BTN_ACTIVE = "h-9 w-9 flex items-center justify-center rounded-none border shadow-sm transition-all duration-200 bg-primary/20 text-primary border-primary/30";

interface SlimSidebarProps {
    handleSelectCollection: (id: string) => void;
    onEditCollection: (collection: Collection) => void;
    onCreateStorage: () => void;
    onCreateDoc: () => void;
    onCreateGraph: () => void;
    onCreateBucket: () => void;
}

interface SidebarIconButtonProps {
    tooltip: string;
    buttonClassName: string;
    onClick: () => void;
    menuItems: ReactNode;
    children: ReactNode;
}

function SidebarIconButton({ tooltip, buttonClassName, onClick, menuItems, children }: SidebarIconButtonProps) {
    return (
        <ContextMenu>
            <ContextMenuTrigger className="flex w-full justify-center">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button type="button" onClick={onClick} className={buttonClassName}>
                            {children}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{tooltip}</TooltipContent>
                </Tooltip>
            </ContextMenuTrigger>
            <ContextMenuContent side="right" align="start" sideOffset={8} className="min-w-[10rem]">
                {menuItems}
            </ContextMenuContent>
        </ContextMenu>
    );
}

export function SlimSidebar({
    handleSelectCollection,
    onEditCollection,
    onCreateStorage,
    onCreateDoc,
    onCreateGraph,
    onCreateBucket,
}: SlimSidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();

    const {
        collections,
        activeCollectionId,
        activeProjectId,
        toggleSidebarCollapse,
        setSidebarView,
        syncStatus,
        trashCollection,
        isPipOpen,
        pipFileId,
    } = useStore(useShallow((state) => ({
        collections: state.collections,
        activeCollectionId: state.activeCollectionId,
        activeProjectId: state.activeProjectId,
        toggleSidebarCollapse: state.toggleSidebarCollapse,
        setSidebarView: state.setSidebarView,
        syncStatus: state.syncStatus,
        trashCollection: state.trashCollection,
        isPipOpen: state.isPipOpen,
        pipFileId: state.pipFileId,
    })));

    const isHome = location.pathname === "/";
    const isStorage = location.pathname === "/storage";
    const isDocs = location.pathname.startsWith("/docs");
    const isGraphs = location.pathname.startsWith("/graphs");
    const isCollectionsRoot = location.pathname.startsWith("/collections");
    const isSettings = location.pathname === "/settings";
    const projectBuckets = collections.filter(
        (c: Collection) => c.projectId === activeProjectId && c.parentId === null && c.type === "bucket" && !c.deleted
    );
    const activeBucket = projectBuckets.find((b) => b.id === activeCollectionId) || projectBuckets[0] || null;
    const ActiveBucketIcon = activeBucket?.icon ? getIcon(activeBucket.icon) : Folder;
    const recentCollections = collections
        .filter((c: Collection) => c.projectId === activeProjectId && c.type === "collection" && !c.deleted)
        .sort((a: Collection, b: Collection) => {
            const aTime = Math.max(a.lastViewed || 0, a.lastModified || 0, a.created || 0);
            const bTime = Math.max(b.lastViewed || 0, b.lastModified || 0, b.created || 0);
            return bTime - aTime;
        })
        .slice(0, 12);

    const handleOpenCollections = () => {
        if (isCollectionsRoot) {
            toggleSidebarCollapse();
            setSidebarView("collections");
            return;
        }

        if (!activeCollectionId && projectBuckets.length > 0) {
            handleSelectCollection(projectBuckets[0].id);
        }
        navigate("/collections");
    };

    const handleExpandSidebar = () => {
        playSfx("cursor");
        toggleSidebarCollapse();
    };

    const handleCreateStorageAction = () => {
        playSfx("cursor");
        onCreateStorage();
    };

    const handleCreateDocAction = () => {
        playSfx("cursor");
        onCreateDoc();
    };

    const handleCreateGraphAction = () => {
        playSfx("cursor");
        onCreateGraph();
    };

    const handleCreateBucketAction = () => {
        playSfx("cursor");
        onCreateBucket();
    };

    const handleOpenHome = () => {
        playSfx("cursor");
        navigate("/");
        setSidebarView("main");
    };

    const handleOpenSearch = () => {
        playSfx("cursor");
        useStore.getState().setSpotlightOpen(true);
    };

    const handleOpenStorage = () => {
        playSfx("cursor");
        if (isStorage) {
            toggleSidebarCollapse();
            setSidebarView("storage");
            return;
        }
        navigate("/storage");
    };

    const handleOpenDocs = () => {
        playSfx("cursor");
        if (isDocs) {
            toggleSidebarCollapse();
            setSidebarView("docs");
            return;
        }
        navigate("/docs");
    };

    const handleOpenGraphs = () => {
        playSfx("cursor");
        if (isGraphs) {
            toggleSidebarCollapse();
            setSidebarView("graphs");
            return;
        }
        navigate("/graphs");
    };

    const handleOpenCollectionsAction = () => {
        playSfx("cursor");
        handleOpenCollections();
    };

    const handleOpenBucketManager = () => {
        playSfx("cursor");
        setSidebarView("collections");
        toggleSidebarCollapse();
    };

    const handleOpenSync = () => {
        playSfx("cursor");
        setSidebarView("sync");
        toggleSidebarCollapse();
    };

    const handleOpenHistory = () => {
        playSfx("cursor");
        setSidebarView("history");
        toggleSidebarCollapse();
    };

    const handleOpenTrash = () => {
        playSfx("cursor");
        setSidebarView("trash");
        toggleSidebarCollapse();
    };

    const handleOpenSettings = () => {
        playSfx("cursor");
        navigate("/settings");
    };

    return (
        <div className="flex h-full min-h-0 w-full flex-col items-center gap-1.5 py-2">
            <SidebarIconButton
                tooltip="Expand Sidebar"
                buttonClassName={BTN}
                onClick={handleExpandSidebar}
                menuItems={
                    <ContextMenuItem onClick={handleExpandSidebar}>
                        <SidebarSimple weight="bold" size={16} />
                        Expand Sidebar
                    </ContextMenuItem>
                }
            >
                <SidebarSimple weight="bold" size={18} />
            </SidebarIconButton>

            <SidebarIconButton
                tooltip="Home"
                buttonClassName={isHome ? NAV_BTN_ACTIVE : NAV_BTN}
                onClick={handleOpenHome}
                menuItems={
                    <>
                        <ContextMenuItem onClick={handleOpenHome}>
                            <House weight="bold" size={16} />
                            Go Home
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={handleExpandSidebar}>
                            <SidebarSimple weight="bold" size={16} />
                            Expand Sidebar
                        </ContextMenuItem>
                    </>
                }
            >
                <House weight={isHome ? "fill" : "bold"} size={20} />
            </SidebarIconButton>

            <SidebarIconButton
                tooltip="Search"
                buttonClassName={BTN}
                onClick={handleOpenSearch}
                menuItems={
                    <>
                        <ContextMenuItem onClick={handleOpenSearch}>
                            <MagnifyingGlass weight="bold" size={16} />
                            Open Search
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={handleExpandSidebar}>
                            <SidebarSimple weight="bold" size={16} />
                            Expand Sidebar
                        </ContextMenuItem>
                    </>
                }
            >
                <MagnifyingGlass weight="bold" size={18} />
            </SidebarIconButton>

            <div className="my-0.5 h-px w-6 bg-border/40" />

            <div className="flex w-full flex-col items-center gap-1.5">
                <SidebarIconButton
                    tooltip="Storage"
                    buttonClassName={isStorage ? NAV_BTN_ACTIVE : NAV_BTN}
                    onClick={handleOpenStorage}
                    menuItems={
                        <>
                            <ContextMenuItem onClick={handleOpenStorage}>
                                <HardDrives weight="bold" size={16} />
                                Open Storage
                            </ContextMenuItem>
                            <ContextMenuItem onClick={handleCreateStorageAction} disabled={!activeProjectId}>
                                <HardDrives weight="bold" size={16} />
                                Create Storage
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={handleExpandSidebar}>
                                <SidebarSimple weight="bold" size={16} />
                                Expand Sidebar
                            </ContextMenuItem>
                        </>
                    }
                >
                    <HardDrives weight={isStorage ? "fill" : "bold"} size={20} />
                </SidebarIconButton>

                <SidebarIconButton
                    tooltip="Docs"
                    buttonClassName={isDocs ? NAV_BTN_ACTIVE : NAV_BTN}
                    onClick={handleOpenDocs}
                    menuItems={
                        <>
                            <ContextMenuItem onClick={handleOpenDocs}>
                                <NotePencil weight="bold" size={16} />
                                Open Docs
                            </ContextMenuItem>
                            <ContextMenuItem onClick={handleCreateDocAction} disabled={!activeProjectId}>
                                <NotePencil weight="bold" size={16} />
                                Create Document
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={handleExpandSidebar}>
                                <SidebarSimple weight="bold" size={16} />
                                Expand Sidebar
                            </ContextMenuItem>
                        </>
                    }
                >
                    <NotePencil weight={isDocs ? "fill" : "bold"} size={20} />
                </SidebarIconButton>

                <SidebarIconButton
                    tooltip="Graphs"
                    buttonClassName={isGraphs ? NAV_BTN_ACTIVE : NAV_BTN}
                    onClick={handleOpenGraphs}
                    menuItems={
                        <>
                            <ContextMenuItem onClick={handleOpenGraphs}>
                                <Graph weight="bold" size={16} />
                                Open Graphs
                            </ContextMenuItem>
                            <ContextMenuItem onClick={handleCreateGraphAction} disabled={!activeProjectId}>
                                <Graph weight="bold" size={16} />
                                Create Graph
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={handleExpandSidebar}>
                                <SidebarSimple weight="bold" size={16} />
                                Expand Sidebar
                            </ContextMenuItem>
                        </>
                    }
                >
                    <Graph weight={isGraphs ? "fill" : "bold"} size={20} />
                </SidebarIconButton>
            </div>

            <div className="my-0.5 h-px w-6 bg-border/40" />

            <ScrollArea className="flex-1 min-h-0 w-full px-1">
                <div className="flex w-full flex-col items-center gap-1.5 py-1">
                    <SidebarIconButton
                        tooltip={activeBucket ? activeBucket.name : "Collections Root"}
                        buttonClassName={isCollectionsRoot ? NAV_BTN_ACTIVE : NAV_BTN}
                        onClick={handleOpenCollectionsAction}
                        menuItems={
                            <>
                                <ContextMenuItem onClick={handleOpenCollectionsAction}>
                                    <FolderOpen weight="bold" size={16} />
                                    Open Collections
                                </ContextMenuItem>
                                <ContextMenuItem onClick={handleOpenBucketManager}>
                                    <Folder weight="bold" size={16} />
                                    Manage Buckets
                                </ContextMenuItem>
                                <ContextMenuItem onClick={handleCreateBucketAction} disabled={!activeProjectId}>
                                    <FolderOpen weight="bold" size={16} />
                                    Create Bucket
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem onClick={handleExpandSidebar}>
                                    <SidebarSimple weight="bold" size={16} />
                                    Expand Sidebar
                                </ContextMenuItem>
                            </>
                        }
                    >
                        {activeBucket ? (
                            <div style={{ color: activeBucket.color }}>
                                <ActiveBucketIcon weight="fill" size={20} />
                            </div>
                        ) : (
                            <FolderOpen weight={isCollectionsRoot ? "fill" : "bold"} size={20} />
                        )}
                    </SidebarIconButton>

                    {recentCollections.map((collection: Collection) => {
                        const Icon = getIcon(collection.icon);
                        const isActive = location.pathname === `/collection/${collection.id}`;

                        return (
                            <ContextMenu key={collection.id}>
                                <ContextMenuTrigger className="flex w-full justify-center">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    playSfx("cursor");
                                                    handleSelectCollection(collection.id);
                                                    navigate(`/collection/${collection.id}`);
                                                }}
                                                className={cn(
                                                    isActive ? NAV_BTN_ACTIVE : NAV_BTN,
                                                    "relative"
                                                )}
                                            >
                                                <div style={{ color: collection.color }}>
                                                    <Icon className="text-lg" weight="fill" />
                                                </div>
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="right">{collection.name}</TooltipContent>
                                    </Tooltip>
                                </ContextMenuTrigger>
                                <ContextMenuContent side="bottom" align="start" sideOffset={4} className="min-w-[8rem]">
                                    <ContextMenuItem
                                        onClick={(e: ReactMouseEvent) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onEditCollection(collection);
                                        }}
                                    >
                                        <PencilSimple className="mr-2 h-4 w-4" />
                                        Rename Collection
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                        onClick={(e: ReactMouseEvent) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            trashCollection(collection.id);
                                        }}
                                        className="text-red-500 focus:text-red-500"
                                    >
                                        <Trash className="mr-2 h-4 w-4" />
                                        Delete Collection
                                    </ContextMenuItem>
                                </ContextMenuContent>
                            </ContextMenu>
                        );
                    })}
                </div>
            </ScrollArea>

            <div className="my-0.5 h-px w-6 bg-border/40" />

            {isPipOpen && pipFileId && (
                <div className="w-full px-1 pb-1">
                    <PiPPlayer isCollapsed={true} />
                </div>
            )}

            <div className="flex w-full flex-col items-center gap-1.5 pb-1">
                <SidebarIconButton
                    tooltip="Sync Status"
                    buttonClassName={BTN}
                    onClick={handleOpenSync}
                    menuItems={
                        <>
                            <ContextMenuItem onClick={handleOpenSync}>
                                <ArrowsClockwise weight="bold" size={16} className={cn(syncStatus === "syncing" && "animate-spin text-primary")} />
                                Open Sync
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={handleExpandSidebar}>
                                <SidebarSimple weight="bold" size={16} />
                                Expand Sidebar
                            </ContextMenuItem>
                        </>
                    }
                >
                    <ArrowsClockwise
                        weight="bold"
                        size={18}
                        className={cn(syncStatus === "syncing" && "animate-spin text-primary")}
                    />
                </SidebarIconButton>

                <SidebarIconButton
                    tooltip="History"
                    buttonClassName={BTN}
                    onClick={handleOpenHistory}
                    menuItems={
                        <>
                            <ContextMenuItem onClick={handleOpenHistory}>
                                <ClockCounterClockwise weight="bold" size={16} />
                                Open History
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={handleExpandSidebar}>
                                <SidebarSimple weight="bold" size={16} />
                                Expand Sidebar
                            </ContextMenuItem>
                        </>
                    }
                >
                    <ClockCounterClockwise weight="bold" size={18} />
                </SidebarIconButton>

                <SidebarIconButton
                    tooltip="Trash"
                    buttonClassName={BTN}
                    onClick={handleOpenTrash}
                    menuItems={
                        <>
                            <ContextMenuItem onClick={handleOpenTrash}>
                                <Trash weight="bold" size={16} />
                                Open Trash
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={handleExpandSidebar}>
                                <SidebarSimple weight="bold" size={16} />
                                Expand Sidebar
                            </ContextMenuItem>
                        </>
                    }
                >
                    <Trash weight="bold" size={18} />
                </SidebarIconButton>

                <SidebarIconButton
                    tooltip="Settings"
                    buttonClassName={isSettings ? BTN_ACTIVE : BTN}
                    onClick={handleOpenSettings}
                    menuItems={
                        <>
                            <ContextMenuItem onClick={handleOpenSettings}>
                                <Gear weight="bold" size={16} />
                                Open Settings
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={handleExpandSidebar}>
                                <SidebarSimple weight="bold" size={16} />
                                Expand Sidebar
                            </ContextMenuItem>
                        </>
                    }
                >
                    <Gear weight="fill" size={18} />
                </SidebarIconButton>
            </div>
        </div>
    );
}
