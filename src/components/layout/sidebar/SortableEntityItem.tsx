/**
 * ============================================================================
 * SORTABLE ENTITY ITEM — Generic drag-sortable sidebar list item
 * ============================================================================
 *
 * A reusable sortable list item used for Storages, Docs, and Graphs in the
 * sidebar sub-views. Each entity type uses the same draggable layout pattern
 * with an icon, name, and hover-reveal edit/delete action buttons.
 *
 * Props:
 *  - entity:    The data object (must have id, name; optionally icon, color)
 *  - isActive:  Whether this item is the currently selected entity
 *  - onSelect:  Called when the item row is clicked
 *  - onEdit:    Called when the pencil button is clicked (receives MouseEvent)
 *  - onDelete:  Called when the trash button is clicked (receives MouseEvent)
 *  - dataAttrs: Optional data attributes to spread on the root element
 *
 * Used by: SidebarStorageView, SidebarDocView, SidebarGraphView
 * ============================================================================
 */

import type { MouseEvent as ReactMouseEvent } from "react";
import { PencilSimple, Trash } from "@phosphor-icons/react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from "@/lib/utils";
import { getIcon } from "@/utils/iconMap";

/** Props for the generic sortable entity item */
interface SortableEntityItemProps {
    /** The entity data (storage, doc, or graph) */
    entity: {
        id: string;
        name: string;
        icon?: string;
        color?: string;
    };
    /** Whether this entity is currently active/selected */
    isActive: boolean;
    /** Called when the item row is clicked to select it */
    onSelect: () => void;
    /** Called when the edit (pencil) button is clicked */
    onEdit: (e: ReactMouseEvent) => void;
    /** Called when the delete (trash) button is clicked */
    onDelete: (e: ReactMouseEvent) => void;
    /** Optional data attributes to attach to the root element (e.g. data-doc-id) */
    dataAttrs?: Record<string, string>;
}

export function SortableEntityItem({
    entity,
    isActive,
    onSelect,
    onEdit,
    onDelete,
    dataAttrs = {},
}: SortableEntityItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: entity.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const Icon = getIcon(entity.icon);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            {...dataAttrs}
            onClick={onSelect}
            className={cn(
                "w-full flex items-center gap-2 pl-2 pr-0 py-0 text-[11px] font-semibold tracking-wider rounded-none transition-all group border shadow-sm relative h-7 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-ring",
                isActive
                    ? "bg-primary/20 border-primary/30 text-primary"
                    : "bg-secondary/40 border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            )}
        >
            {/* Entity icon — filled when active, colored when inactive */}
            <Icon
                weight="fill"
                className="flex-shrink-0 size-4 transition-colors"
                style={{ color: isActive ? undefined : entity.color }}
            />

            {/* Entity name */}
            <span title={entity.name} className="truncate w-0 flex-1 min-w-0 text-left py-0.5">
                {entity.name}
            </span>

            {/* Hover-reveal action buttons */}
            <div className="h-full flex-shrink-0 flex items-center transition-opacity opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                <button
                    onPointerDown={(e: ReactMouseEvent) => e.stopPropagation()}
                    onClick={(e: ReactMouseEvent) => { e.stopPropagation(); onEdit(e); }}
                    className="h-6 w-6 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
                    title="Edit"
                >
                    <PencilSimple weight="bold" size={14} />
                </button>
                <button
                    onPointerDown={(e: ReactMouseEvent) => e.stopPropagation()}
                    onClick={(e: ReactMouseEvent) => { e.stopPropagation(); onDelete(e); }}
                    className="h-6 w-6 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
                    title="Delete"
                >
                    <Trash weight="bold" size={14} />
                </button>
            </div>
        </div>
    );
}
