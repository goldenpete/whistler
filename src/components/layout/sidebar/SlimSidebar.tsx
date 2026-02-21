/**
 * ─── SlimSidebar.tsx ─────────────────────────────────────────────────────────
 *
 * Collapsed icon-only sidebar mode. Renders a vertical strip of icon buttons
 * for quick navigation to Home, Storage, Docs, Graphs, Collections, and
 * utility views (Sync, History, Trash, Settings).
 *
 * Also shows bucket icons from the active project's collection tree.
 *
 * All buttons use squared styling with border/shadow matching the expanded
 * sidebar's search and collapse buttons.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { MouseEvent as ReactMouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    SidebarSimple,
    HardDrives,
    NotePencil,
    Graph,
    FolderOpen,
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
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PiPPlayer } from "@/components/player/PiPPlayer";

// Consistent squared button style used throughout
const BTN = "h-8 w-8 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200";
const BTN_ACTIVE = "h-8 w-8 flex items-center justify-center rounded-none border shadow-sm transition-all duration-200 bg-primary/20 text-primary border-primary/30";
const NAV_BTN = "h-9 w-9 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200";
const NAV_BTN_ACTIVE = "h-9 w-9 flex items-center justify-center rounded-none border shadow-sm transition-all duration-200 bg-primary/20 text-primary border-primary/30";

interface SlimSidebarProps {
    handleSelectCollection: (id: string) => void;
    onEditCollection: (collection: Collection) => void;
}

export function SlimSidebar({ handleSelectCollection, onEditCollection }: SlimSidebarProps) {
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

    const isHome = location.pathname === '/';
    const isStorage = location.pathname === '/storage';
    const isDocs = location.pathname.startsWith('/docs');
    const isGraphs = location.pathname.startsWith('/graphs');
    const isCollections = location.pathname.startsWith('/collections') || location.pathname.startsWith('/collection/');
    const isSettings = location.pathname === '/settings';

    return (
        <div className="flex flex-col h-full min-h-0 items-center py-2 gap-1.5 w-full">
            {/* ── Top controls ── */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={() => { playSfx('cursor'); toggleSidebarCollapse(); }}
                        className={BTN}
                    >
                        <SidebarSimple weight="bold" size={18} />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right">Expand Sidebar</TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={() => { playSfx('cursor'); navigate('/'); setSidebarView('main'); }}
                        className={isHome ? NAV_BTN_ACTIVE : NAV_BTN}
                    >
                        <House weight={isHome ? "fill" : "bold"} size={20} />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right">Home</TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={() => { playSfx('cursor'); useStore.getState().setSpotlightOpen(true); }}
                        className={BTN}
                    >
                        <MagnifyingGlass weight="bold" size={18} />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right">Search</TooltipContent>
            </Tooltip>

            {/* ── Divider ── */}
            <div className="w-6 h-px bg-border/40 my-0.5" />

            {/* ── Navigation ── */}
            <div className="flex flex-col gap-1.5 w-full items-center">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => {
                                playSfx('cursor');
                                if (isStorage) { toggleSidebarCollapse(); setSidebarView('storage'); }
                                else navigate('/storage');
                            }}
                            className={isStorage ? NAV_BTN_ACTIVE : NAV_BTN}
                        >
                            <HardDrives weight={isStorage ? "fill" : "bold"} size={20} />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Storage</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => {
                                playSfx('cursor');
                                if (isDocs) { toggleSidebarCollapse(); setSidebarView('docs'); }
                                else navigate('/docs');
                            }}
                            className={isDocs ? NAV_BTN_ACTIVE : NAV_BTN}
                        >
                            <NotePencil weight={isDocs ? "fill" : "bold"} size={20} />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Docs</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => {
                                playSfx('cursor');
                                if (isGraphs) { toggleSidebarCollapse(); setSidebarView('graphs'); }
                                else navigate('/graphs');
                            }}
                            className={isGraphs ? NAV_BTN_ACTIVE : NAV_BTN}
                        >
                            <Graph weight={isGraphs ? "fill" : "bold"} size={20} />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Graphs</TooltipContent>
                </Tooltip>
            </div>

            {/* ── Divider ── */}
            <div className="w-6 h-px bg-border/40 my-0.5" />

            {/* ── Collections (scrollable) ── */}
            <ScrollArea className="flex-1 min-h-0 w-full px-1">
                <div className="flex flex-col gap-1.5 w-full items-center py-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => { playSfx('cursor'); navigate('/collections'); }}
                                className={cn(
                                    isCollections && !activeCollectionId ? NAV_BTN_ACTIVE : NAV_BTN
                                )}
                            >
                                <FolderOpen weight={isCollections ? "fill" : "bold"} size={20} />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Collections</TooltipContent>
                    </Tooltip>

                    {collections
                        .filter((c: Collection) => c.projectId === activeProjectId && c.parentId === null && c.type === 'bucket' && !c.deleted)
                        .map((collection: Collection) => {
                            const Icon = getIcon(collection.icon);
                            const isActive = isCollections && activeCollectionId === collection.id;
                            return (
                                <ContextMenu key={collection.id}>
                                    <ContextMenuTrigger className="flex justify-center w-full">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Link
                                                    to="/collections"
                                                    onClick={() => { playSfx('cursor'); handleSelectCollection(collection.id); }}
                                                    className={cn(
                                                        isActive ? NAV_BTN_ACTIVE : NAV_BTN,
                                                        "relative"
                                                    )}
                                                    title={collection.name}
                                                >
                                                    <div style={{ color: collection.color }}>
                                                        <Icon className="text-lg" weight="fill" />
                                                    </div>
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent side="right">{collection.name}</TooltipContent>
                                        </Tooltip>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent side="bottom" align="start" sideOffset={4} className="min-w-[8rem]">
                                        <ContextMenuItem onClick={(e: ReactMouseEvent) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onEditCollection(collection);
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

            {/* ── Divider ── */}
            <div className="w-6 h-px bg-border/40 my-0.5" />

            {/* ── PiP player ── */}
            {isPipOpen && pipFileId && (
                <div className="w-full px-1 pb-1">
                    <PiPPlayer isCollapsed={true} />
                </div>
            )}

            {/* ── Bottom utilities ── */}
            <div className="flex flex-col gap-1.5 w-full items-center pb-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => { playSfx('cursor'); setSidebarView('sync'); toggleSidebarCollapse(); }}
                            className={BTN}
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
                            onClick={() => { playSfx('cursor'); setSidebarView('history'); toggleSidebarCollapse(); }}
                            className={BTN}
                        >
                            <ClockCounterClockwise weight="bold" size={18} />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">History</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => { playSfx('cursor'); setSidebarView('trash'); toggleSidebarCollapse(); }}
                            className={BTN}
                        >
                            <Trash weight="bold" size={18} />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Trash</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => { playSfx('cursor'); navigate('/settings'); }}
                            className={isSettings ? BTN_ACTIVE : BTN}
                        >
                            <Gear weight="fill" size={18} />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Settings</TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}
