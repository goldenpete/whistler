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
export interface SortableEntityItemProps {
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
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-sm text-left transition-colors group cursor-pointer relative",
                isActive
                    ? "bg-primary/20 text-primary font-medium"
                    : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
            )}
        >
            {/* Entity icon — filled when active, colored when inactive */}
            <Icon
                weight={isActive ? "fill" : "regular"}
                className="text-lg shrink-0 transition-colors"
                style={{ color: isActive ? undefined : entity.color }}
            />

            {/* Entity name */}
            <span title={entity.name} className="truncate flex-1 min-w-0">
                {entity.name}
            </span>

            {/* Hover-reveal action buttons */}
            <div className="absolute inset-y-0 right-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-secondary/50">
                <button
                    onPointerDown={(e: ReactMouseEvent) => e.stopPropagation()}
                    onClick={(e: ReactMouseEvent) => onEdit(e)}
                    className="p-1 h-full px-2 rounded-none hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                    <PencilSimple weight="bold" />
                </button>
                <button
                    onPointerDown={(e: ReactMouseEvent) => e.stopPropagation()}
                    onClick={(e: ReactMouseEvent) => onDelete(e)}
                    className="p-1 h-full px-2 rounded-none hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                >
                    <Trash weight="bold" />
                </button>
            </div>
        </div>
    );
}
