/**
 * ─── FileCards.tsx ──────────────────────────────────────────────────
 *
 * Card/list/grid item components for StorageView. Each view mode
 * (grid, list, cards) has both an "Inner" presentational component
 * and an outer wrapper that integrates dnd-kit sortable/droppable
 * behaviors, context menus, and selection logic.
 *
 * Exports: FileCardGrid, FileCardList, FileCardCards,
 *          FileCardGridInner, FileCardListInner, FileCardCardsInner,
 *          FileCardProps, FileCardInnerProps
 * Related: StorageView, FileThumbnail, FileContextMenu
 * ───────────────────────────────────────────────────────────────────
 */
import { memo, type MouseEvent, type ReactNode, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { type File as AppFile } from "@/types";
import { useStableRef } from "@/hooks/useStableRef";
import { cn } from "@/lib/utils";
import { playSfx } from "@/utils/sound";
import {
    CheckSquare, Square, FolderOpen
} from "@phosphor-icons/react";
import {
    useSortable,
} from '@dnd-kit/sortable';
import {
    useDroppable,
} from '@dnd-kit/core';
import {
    ContextMenu,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { FileThumbnail } from "@/components/storage/FileThumbnail";
import { FileContextMenu } from "@/components/storage/FileContextMenu";

/* ═══════════════════════════════════════════════════════
   INTERFACES
   ═══════════════════════════════════════════════════════ */

export interface FileCardProps {
    file: AppFile;
    onNavigate: (id: string) => void;
    selectionMode: boolean;
    isSelected: boolean;
    isFocused?: boolean;
    onToggleSelect: (id: string) => void;
    onRename: (file: AppFile) => void;
    onMove: (file: AppFile) => void;
    onColorChange: (file: AppFile, color: string) => void;
    onIconChange: (file: AppFile, icon: string) => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    sortOption?: string;
}

export interface FileCardInnerProps {
    file: AppFile;
    isSelected: boolean;
    isFocused?: boolean;
    isOver: boolean;
    selectionMode: boolean;
    onClick?: (e: MouseEvent) => void;
    linkTo?: string;
    domRef?: (element: HTMLElement | null) => void;
    children?: ReactNode;
    style?: CSSProperties;
    className?: string;
    showSelection?: boolean;
}

/* ═══════════════════════════════════════════════════════
   INNER (PRESENTATIONAL) COMPONENTS
   ═══════════════════════════════════════════════════════ */

export const FileCardGridInner = memo(function FileCardGridInner({ file, isSelected, isFocused, isOver, selectionMode, onClick, linkTo, domRef, children, style, className, showSelection = true }: FileCardInnerProps) {
    const c = file.color;
    return (
        <div
            ref={domRef}
            id={`file-card-${file.id}`}
            onClick={onClick}
            data-sound-cursor
            className={cn(
                "flex flex-col gap-2 p-3 rounded-none border border-border bg-card transition-all duration-200 aspect-[4/3] relative group cursor-pointer select-none",
                isOver && "ring-2 ring-primary bg-primary/20 shadow-xl scale-[1.02]",
                isSelected && "ring-2 ring-primary bg-primary/10 border-primary",
                isFocused && !isSelected && !c && "border-muted-foreground/30 bg-muted/20 shadow-md",
                className
            )}
            style={{
                ...style,
                ...(c ? {
                    borderColor: c,
                    ...(isFocused && !isSelected ? { backgroundColor: c + '18', boxShadow: `0 0 12px ${c}30` } : {})
                } : undefined)
            }}
        >
            {/* Selection checkbox */}
            {selectionMode && showSelection && (
                <div className="absolute top-2 left-2 z-10">
                    {isSelected ? (
                        <CheckSquare weight="fill" size={20} className="text-primary" />
                    ) : (
                        <Square weight="regular" size={20} className="text-muted-foreground" />
                    )}
                </div>
            )}

            {!selectionMode && linkTo && (file.type === 'video' || file.type === 'pdf' || file.type === 'audio' || file.type === 'image') ? (
                <Link to={linkTo} className="absolute inset-0 z-0" onClick={(e: MouseEvent) => { e.stopPropagation(); playSfx('cursor'); }} />
            ) : null}

            <div className="flex-1 flex items-center justify-center overflow-hidden w-full h-full pointer-events-none">
                <FileThumbnail file={file} iconSize={44} />
            </div>
            <div className="text-xs font-medium truncate px-1 text-center pointer-events-none">{file.name}</div>

            {/* Drop Target Overlay */}
            {isOver && file.type === 'folder' && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px] z-20 rounded-none">
                    <div className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-none shadow-lg border border-primary/20 flex items-center gap-2">
                        <FolderOpen weight="fill" className="text-primary animate-bounce" size={16} />
                        <span className="text-xs font-semibold text-primary">Drop to move</span>
                    </div>
                </div>
            )}

            {children}
        </div>
    );
});

export const FileCardListInner = memo(function FileCardListInner({ file, isSelected, isFocused, isOver, selectionMode, onClick, linkTo, domRef, children, style, className, showSelection = true }: FileCardInnerProps) {
    const dateStr = new Date(file.created).toLocaleDateString();
    const typeLabel = file.type.toUpperCase();
    const c = file.color;

    return (
        <div
            ref={domRef}
            id={`file-card-${file.id}`}
            onClick={onClick}
            data-sound-cursor
            className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-none border border-border bg-card transition-all group cursor-pointer select-none relative",
                isOver && "ring-2 ring-primary bg-primary/20 shadow-xl scale-[1.01]",
                isSelected && "ring-2 ring-primary bg-primary/10 border-primary",
                isFocused && !isSelected && !c && "border-muted-foreground/30 bg-muted/20 shadow-md",
                className
            )}
            style={{
                ...style,
                ...(c ? {
                    borderColor: c,
                    ...(isFocused && !isSelected ? { backgroundColor: c + '18', boxShadow: `0 0 12px ${c}30` } : {})
                } : undefined)
            }}
        >
            {/* Drop Target Overlay */}
            {isOver && file.type === 'folder' && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px] z-20 rounded-none">
                    <div className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-none shadow-lg border border-primary/20 flex items-center gap-2">
                        <FolderOpen weight="fill" className="text-primary animate-bounce" size={16} />
                        <span className="text-xs font-semibold text-primary">Drop to move</span>
                    </div>
                </div>
            )}

            {/* Selection checkbox */}
            {selectionMode && showSelection && (
                <div className="mr-2">
                    {isSelected ? (
                        <CheckSquare weight="fill" size={20} className="text-primary" />
                    ) : (
                        <Square weight="regular" size={20} className="text-muted-foreground" />
                    )}
                </div>
            )}

            {!selectionMode && linkTo && (file.type === 'video' || file.type === 'pdf' || file.type === 'audio' || file.type === 'image') ? (
                <Link to={linkTo} className="absolute inset-0 z-0" onClick={(e: MouseEvent) => { e.stopPropagation(); playSfx('cursor'); }} />
            ) : null}

            {/* Thumbnail */}
            <div className="w-16 h-12 rounded-none bg-muted flex items-center justify-center shrink-0 overflow-hidden pointer-events-none">
                <FileThumbnail file={file} iconSize={28} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pointer-events-none">
                <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">{file.name}</div>
                {file.description && <div className="text-xs text-muted-foreground/70 truncate">{file.description}</div>}
            </div>

            {/* Type Badge */}
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide bg-primary/20 text-primary rounded-none pointer-events-none">
                {typeLabel}
            </div>

            {/* Date */}
            <div className="text-xs text-muted-foreground/60 w-24 text-right shrink-0 pointer-events-none">
                {dateStr}
            </div>
            {children}
        </div>
    );
});

export const FileCardCardsInner = memo(function FileCardCardsInner({ file, isSelected, isFocused, isOver, selectionMode, onClick, linkTo, domRef, children, style, className, showSelection = true }: FileCardInnerProps) {
    const dateStr = new Date(file.created).toLocaleDateString();
    const c = file.color;

    return (
        <div
            id={`file-card-${file.id}`}
            onClick={onClick}
            data-sound-cursor
            className={cn(
                "flex flex-col rounded-none border border-border bg-card overflow-hidden transition-all group cursor-pointer select-none relative h-full",
                isOver && "ring-2 ring-primary bg-primary/20 shadow-xl scale-[1.02]",
                isSelected && "ring-2 ring-primary bg-primary/10 border-primary",
                isFocused && !isSelected && !c && "border-muted-foreground/30 bg-muted/20 shadow-xl",
                className
            )}
            style={{
                ...style,
                ...(c ? {
                    borderColor: c,
                    ...(isFocused && !isSelected ? { backgroundColor: c + '18', boxShadow: `0 0 12px ${c}30` } : {})
                } : undefined)
            }}
        >
            {/* Selection checkbox */}
            {selectionMode && showSelection && (
                <div className="absolute top-3 left-3 z-10">
                    {isSelected ? (
                        <CheckSquare weight="fill" size={20} className="text-primary shadow-sm" />
                    ) : (
                        <Square weight="regular" size={20} className="text-white drop-shadow-md" />
                    )}
                </div>
            )}

            {!selectionMode && linkTo && (file.type === 'video' || file.type === 'pdf' || file.type === 'audio' || file.type === 'image') ? (
                <Link to={linkTo} className="absolute inset-0 z-0" onClick={(e: MouseEvent) => { e.stopPropagation(); playSfx('cursor'); }} />
            ) : null}

            {/* Content Area (Top) */}
            <div
                ref={domRef}
                className="h-[160px] flex-none bg-muted/30 flex items-center justify-center overflow-hidden pointer-events-none relative group-hover:bg-muted/10 transition-colors"
            >
                <FileThumbnail file={file} iconSize={48} />

                {/* Type Overlay */}
                <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-none bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wide pointer-events-none">
                    {file.type}
                </div>

                {/* Drop Target Overlay */}
                {isOver && file.type === 'folder' && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px] z-20">
                        <div className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-none shadow-lg border border-primary/20 flex items-center gap-2">
                            <FolderOpen weight="fill" className="text-primary animate-bounce" size={16} />
                            <span className="text-xs font-semibold text-primary">Drop to move</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Details Area (Bottom) */}
            <div className="p-4 flex flex-col gap-1.5 border-t border-border/50 bg-card/50 pointer-events-none">
                <div className="font-bold text-sm truncate group-hover:text-primary transition-colors leading-tight">
                    {file.name}
                </div>

                <div className="flex items-center justify-between mt-1">
                    <div className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-tighter">
                        {dateStr}
                    </div>
                    {file.description && (
                        <div className="text-[10px] text-muted-foreground/40 italic truncate max-w-[60%]">
                            {file.description}
                        </div>
                    )}
                </div>
            </div>
            {children}
        </div>
    );
});

/* ═══════════════════════════════════════════════════════
   OUTER (DnD + CONTEXT MENU) WRAPPERS
   ═══════════════════════════════════════════════════════ */

export function FileCardCards({ file, onNavigate, selectionMode, isSelected, isFocused, onToggleSelect, onRename, onMove, onColorChange, onIconChange, onMouseEnter, onMouseLeave, sortOption }: FileCardProps) {
    const linkTo = file.type === 'video' || file.type === 'pdf' || file.type === 'audio' || file.type === 'image' ? `/file/${file.id}` : '#';

    // Use sortable for reordering
    const {
        attributes,
        listeners,
        setNodeRef: setSortableRef,
        transition,
        isDragging,
        isOver: isSortableOver,
        active,
        over,
        index
    } = useSortable({
        id: file.id,
        data: file,
        disabled: selectionMode
    });

    // Also use droppable for folder nesting
    // "Bullseye" strategy:
    // If Custom Sort: Inset drop zone to allow edge dragging for reorder.
    // If Other Sort: Full drop zone.
    const { setNodeRef: setDroppableRef, isOver: isFolderOver } = useDroppable({
        id: `folder-nest-${file.id}`,
        disabled: selectionMode || file.type !== 'folder',
        data: { type: 'folder', folderId: file.id }
    });

    // Stable ref to prevent React 19 detach/reattach infinite loop with dnd-kit setState
    const setNodeRef = useStableRef(setSortableRef);

    const style = {
        transition,
        zIndex: isDragging ? 999 : undefined,
    };

    const handleClick = (e: MouseEvent) => {
        if (selectionMode) {
            e.preventDefault();
            onToggleSelect(file.id);
            return;
        }
        if (file.type === 'folder') {
            e.preventDefault();
            onNavigate(file.id);
        }
    };

    // Calculate where the insertion line should be
    // Only show line if we are over the Sortable (outer) but NOT the Nest (inner)
    const showLine = isSortableOver && !isFolderOver && !isDragging && sortOption === "custom";
    let linePosition: 'left' | 'right' | null = null;

    if (showLine && active && over) {
        const activeIndex = active.data.current?.sortable?.index ?? -1;
        const overIndex = over.data.current?.sortable?.index ?? index;

        if (activeIndex !== -1) {
            linePosition = activeIndex > overIndex ? 'left' : 'right';
        } else {
            // If dragging from outside or something
            linePosition = 'left';
        }
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild disabled={selectionMode}>
                <div
                    ref={setNodeRef}
                    style={style}
                    {...(selectionMode ? {} : listeners)}
                    {...(selectionMode ? {} : attributes)}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    className="h-full touch-none relative"
                >
                    {/* Folder Nesting Bullseye */}
                    {file.type === 'folder' && (
                        <div
                            ref={setDroppableRef}
                            onClick={handleClick}
                            className={cn(
                                "absolute z-30 cursor-pointer",
                                sortOption === "custom" ? "inset-4 rounded-none" : "inset-0 rounded-none"
                            )}
                        />
                    )}

                    {/* Visual line indicator for insertion */}
                    {linePosition === 'left' && (
                        <div className="absolute -left-3 top-0 bottom-0 w-1 bg-primary z-50 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />
                    )}
                    {linePosition === 'right' && (
                        <div className="absolute -right-3 top-0 bottom-0 w-1 bg-primary z-50 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />
                    )}

                    <FileCardCardsInner
                        file={file}
                        isSelected={isSelected}
                        isFocused={isFocused}
                        isOver={isFolderOver}
                        selectionMode={selectionMode}
                        onClick={handleClick}
                        linkTo={linkTo}
                        className={cn(
                            isDragging && "opacity-0"
                        )}
                    />
                </div>
            </ContextMenuTrigger>
            <FileContextMenu
                file={file}
                onRename={() => onRename(file)}
                onMove={() => onMove(file)}
                onSelect={() => onToggleSelect(file.id)}
                onColorChange={(color) => onColorChange(file, color)}
                onIconChange={(icon) => onIconChange(file, icon)}
            />
        </ContextMenu>
    );
}

export function FileCardGrid({ file, onNavigate, selectionMode, isSelected, isFocused, onToggleSelect, onRename, onMove, onColorChange, onIconChange, onMouseEnter, onMouseLeave, sortOption }: FileCardProps) {
    const linkTo = file.type === 'video' || file.type === 'pdf' || file.type === 'audio' || file.type === 'image' ? `/file/${file.id}` : '#';

    // Use sortable for reordering
    const {
        attributes,
        listeners,
        setNodeRef: setSortableRef,
        transition,
        isDragging,
        isOver: isSortableOver,
        active,
        over,
        index
    } = useSortable({
        id: file.id,
        data: file,
        disabled: selectionMode
    });

    // Also use droppable for folder nesting
    const { setNodeRef: setDroppableRef, isOver: isFolderOver } = useDroppable({
        id: `folder-nest-${file.id}`,
        disabled: selectionMode || file.type !== 'folder',
        data: { type: 'folder', folderId: file.id }
    });

    // Stable ref to prevent React 19 detach/reattach infinite loop with dnd-kit setState
    const setNodeRef = useStableRef(setSortableRef);

    const style = {
        transition,
        zIndex: isDragging ? 999 : undefined,
    };

    const handleClick = (e: MouseEvent) => {
        if (selectionMode) {
            e.preventDefault();
            onToggleSelect(file.id);
            return;
        }
        if (file.type === 'folder') {
            e.preventDefault();
            onNavigate(file.id);
        }
    };

    // Calculate where the insertion line should be
    const showLine = isSortableOver && !isFolderOver && !isDragging && sortOption === "custom";
    let linePosition: 'left' | 'right' | null = null;

    if (showLine && active && over) {
        const activeIndex = active.data.current?.sortable?.index ?? -1;
        const overIndex = over.data.current?.sortable?.index ?? index;

        if (activeIndex !== -1) {
            linePosition = activeIndex > overIndex ? 'left' : 'right';
        } else {
            linePosition = 'left';
        }
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild disabled={selectionMode}>
                <div
                    ref={setNodeRef}
                    style={style}
                    {...(selectionMode ? {} : listeners)}
                    {...(selectionMode ? {} : attributes)}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    className="touch-none relative h-full"
                >
                    {/* Folder Nesting Bullseye */}
                    {file.type === 'folder' && (
                        <div
                            ref={setDroppableRef}
                            onClick={handleClick}
                            className={cn(
                                "absolute z-30 cursor-pointer",
                                sortOption === "custom" ? "inset-3 rounded-none" : "inset-0 rounded-none"
                            )}
                        />
                    )}

                    {/* Visual line indicator for insertion */}
                    {linePosition === 'left' && (
                        <div className="absolute -left-3 top-0 bottom-0 w-1 bg-primary z-50 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />
                    )}
                    {linePosition === 'right' && (
                        <div className="absolute -right-3 top-0 bottom-0 w-1 bg-primary z-50 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />
                    )}

                    <FileCardGridInner
                        file={file}
                        isSelected={isSelected}
                        isFocused={isFocused}
                        isOver={isFolderOver}
                        selectionMode={selectionMode}
                        onClick={handleClick}
                        linkTo={linkTo}
                        className={cn(
                            isDragging && "opacity-0"
                        )}
                    />
                </div>
            </ContextMenuTrigger>
            <FileContextMenu
                file={file}
                onRename={() => onRename(file)}
                onMove={() => onMove(file)}
                onSelect={() => onToggleSelect(file.id)}
                onColorChange={(color) => onColorChange(file, color)}
                onIconChange={(icon) => onIconChange(file, icon)}
            />
        </ContextMenu>
    );
}

export function FileCardList({ file, onNavigate, selectionMode, isSelected, isFocused, onToggleSelect, onRename, onMove, onColorChange, onIconChange, onMouseEnter, onMouseLeave, sortOption }: FileCardProps) {
    const linkTo = file.type === 'video' || file.type === 'pdf' || file.type === 'audio' || file.type === 'image' ? `/file/${file.id}` : '#';

    // Use sortable for reordering
    const {
        attributes,
        listeners,
        setNodeRef: setSortableRef,
        transition,
        isDragging,
        isOver: isSortableOver,
        active,
        over,
        index
    } = useSortable({
        id: file.id,
        data: file,
        disabled: selectionMode
    });

    // Also use droppable for folder nesting
    const { setNodeRef: setDroppableRef, isOver: isFolderOver } = useDroppable({
        id: `folder-nest-${file.id}`,
        disabled: selectionMode || file.type !== 'folder',
        data: { type: 'folder', folderId: file.id }
    });

    // Stable ref to prevent React 19 detach/reattach infinite loop with dnd-kit setState
    const setNodeRef = useStableRef(setSortableRef);

    const style = {
        transition,
        zIndex: isDragging ? 999 : undefined,
    };

    const handleClick = (e: MouseEvent) => {
        if (selectionMode) {
            e.preventDefault();
            onToggleSelect(file.id);
            return;
        }
        if (file.type === 'folder') {
            e.preventDefault();
            onNavigate(file.id);
        }
    };

    // Calculate where the insertion line should be
    const showLine = isSortableOver && !isFolderOver && !isDragging && sortOption === "custom";
    let linePosition: 'top' | 'bottom' | null = null;

    if (showLine && active && over) {
        const activeIndex = active.data.current?.sortable?.index ?? -1;
        const overIndex = over.data.current?.sortable?.index ?? index;

        if (activeIndex !== -1) {
            linePosition = activeIndex > overIndex ? 'top' : 'bottom';
        } else {
            linePosition = 'top';
        }
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild disabled={selectionMode}>
                <div
                    ref={setNodeRef}
                    style={style}
                    {...(selectionMode ? {} : listeners)}
                    {...(selectionMode ? {} : attributes)}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    className="touch-none relative"
                >
                    {/* Folder Nesting Bullseye */}
                    {file.type === 'folder' && (
                        <div
                            ref={setDroppableRef}
                            onClick={handleClick}
                            className={cn(
                                "absolute z-30 cursor-pointer",
                                sortOption === "custom" ? "inset-y-1 inset-x-4 rounded-md" : "inset-0 rounded-lg"
                            )}
                        />
                    )}

                    {/* Visual line indicator for insertion */}
                    {linePosition === 'top' && (
                        <div className="absolute -top-1 left-0 right-0 h-1 bg-primary z-50 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />
                    )}
                    {linePosition === 'bottom' && (
                        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-primary z-50 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />
                    )}

                    <FileCardListInner
                        file={file}
                        isSelected={isSelected}
                        isFocused={isFocused}
                        isOver={isFolderOver}
                        selectionMode={selectionMode}
                        onClick={handleClick}
                        linkTo={linkTo}
                        className={cn(
                            isDragging && "opacity-0"
                        )}
                    />
                </div>
            </ContextMenuTrigger>
            <FileContextMenu
                file={file}
                onRename={() => onRename(file)}
                onMove={() => onMove(file)}
                onSelect={() => onToggleSelect(file.id)}
                onColorChange={(color) => onColorChange(file, color)}
                onIconChange={(icon) => onIconChange(file, icon)}
            />
        </ContextMenu>
    );
}
