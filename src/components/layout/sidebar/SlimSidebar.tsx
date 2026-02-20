/**
 * ─── SlimSidebar.tsx ─────────────────────────────────────────────────────────
 *
 * Collapsed icon-only sidebar mode. Renders a vertical strip of icon buttons
 * for quick navigation to Storage, Docs, Graphs, Collections, and utility
 * views (Sync, History, Trash, Settings).
 *
 * Also shows bucket icons from the active project's collection tree.
 *
 * Extracted from ProjectSidebar.tsx to reduce its line count.
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
import { Separator } from "@/components/ui/separator";
import { WhistlerLogo } from "@/components/ui/WhistlerLogo";

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
    } = useStore(useShallow((state) => ({
        collections: state.collections,
        activeCollectionId: state.activeCollectionId,
        activeProjectId: state.activeProjectId,
        toggleSidebarCollapse: state.toggleSidebarCollapse,
        setSidebarView: state.setSidebarView,
        syncStatus: state.syncStatus,
        trashCollection: state.trashCollection,
    })));

    return (
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
    );
}
