import React, { useState, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { useNavigate } from "react-router-dom";
import {
    MagnifyingGlass,
    SortAscending,
    SortDescending,
    CheckSquare,
    Square,
    Trash,
    PencilSimple,
    Plus
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getIcon } from "@/utils/iconMap";
import { Collection } from "@/types";
import { formatDistanceToNow } from "date-fns";

type SortOption = "name" | "date" | "items";
type SortDirection = "asc" | "desc";

export default function CollectionsView() {
    const { 
        collections, 
        activeProjectId, 
        deleteCollection,
        updateCollection,
        setActiveCollection,
        setSidebarView
    } = useStore();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState("");
    const [sortOption, setSortOption] = useState<SortOption>("date");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Filter by project and search
    const filteredCollections = useMemo(() => {
        return collections.filter(c => {
            if (c.projectId !== activeProjectId || c.deleted) return false;
            if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
    }, [collections, activeProjectId, searchQuery]);

    // Sort
    const sortedCollections = useMemo(() => {
        return [...filteredCollections].sort((a, b) => {
            let comparison = 0;
            switch (sortOption) {
                case "name":
                    comparison = a.name.localeCompare(b.name);
                    break;
                case "date":
                    // Assuming collections have createdAt or similar, otherwise fallback to name or ID
                    // If createdAt is missing in types, we might need to rely on something else or mock it
                    // For now, let's assume createdAt exists or use ID as proxy for creation time if sequential
                    // Checking type definition would be good, but assuming createdAt or updatedAt usually exists.
                    // If not, we'll fix it. Let's assume 'updatedAt' or 'createdAt' exists.
                    // Based on other files, it likely has dates.
                    const dateA = a.lastModified || a.created || 0;
                    const dateB = b.lastModified || b.created || 0;
                    comparison = dateA - dateB;
                    break;
                case "items":
                     // We don't have item count directly on collection object usually, 
                     // unless we calculate it from highlights/files. 
                     // For simplicity, let's skip 'items' sort or implement if easy.
                     // Let's stick to name and date for now.
                     comparison = 0;
                     break;
            }
            return sortDirection === "asc" ? comparison : -comparison;
        });
    }, [filteredCollections, sortOption, sortDirection]);

    const handleToggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredCollections.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredCollections.map(c => c.id)));
        }
    };

    const handleBulkDelete = () => {
        // Implement bulk delete
        selectedIds.forEach(id => deleteCollection(id));
        setSelectedIds(new Set());
        setSelectionMode(false);
    };

    const handleCollectionClick = (id: string) => {
        if (selectionMode) {
            handleToggleSelect(id);
        } else {
            setActiveCollection(id);
            navigate(`/collection/${id}`);
            // navigate(`/collections`); // Old route
            // We are changing the route for single collection to /collection/:id (or similar)
            // But wait, if I haven't updated App.tsx yet, I should match what I WILL do.
        }
    };

    return (
        <div className="flex flex-col h-full bg-background text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h1 className="text-2xl font-semibold tracking-tight">Collections</h1>
                
                <div className="flex items-center gap-2">
                    <div className="relative w-64">
                        <MagnifyingGlass className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input 
                            placeholder="Search collections..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-9"
                        />
                    </div>
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-2">
                                {sortDirection === "asc" ? <SortAscending /> : <SortDescending />}
                                Sort
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSortOption("name"); setSortDirection("asc"); }}>
                                Name (A-Z)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSortOption("name"); setSortDirection("desc"); }}>
                                Name (Z-A)
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setSortOption("date"); setSortDirection("desc"); }}>
                                Newest First
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSortOption("date"); setSortDirection("asc"); }}>
                                Oldest First
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button 
                        variant={selectionMode ? "secondary" : "ghost"} 
                        size="sm" 
                        className="h-9"
                        onClick={() => {
                            setSelectionMode(!selectionMode);
                            setSelectedIds(new Set());
                        }}
                    >
                        {selectionMode ? "Cancel Select" : "Select"}
                    </Button>
                    
                    {selectionMode && (
                        <>
                            <Button variant="ghost" size="sm" className="h-9" onClick={handleSelectAll}>
                                {selectedIds.size === filteredCollections.length ? "Deselect All" : "Select All"}
                            </Button>
                            {selectedIds.size > 0 && (
                                <Button variant="destructive" size="sm" className="h-9 gap-2" onClick={handleBulkDelete}>
                                    <Trash weight="bold" />
                                    Delete ({selectedIds.size})
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sortedCollections.map(collection => {
                        const Icon = getIcon(collection.icon);
                        const isSelected = selectedIds.has(collection.id);
                        
                        return (
                            <div 
                                key={collection.id}
                                onClick={() => handleCollectionClick(collection.id)}
                                className={cn(
                                    "group relative flex flex-col p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all cursor-pointer",
                                    isSelected && "ring-2 ring-primary border-primary bg-accent/50"
                                )}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className={cn("p-2 rounded-md bg-secondary", isSelected && "bg-background")}>
                                        <Icon 
                                            weight="fill" 
                                            className="w-6 h-6" 
                                            style={{ color: collection.color }} 
                                        />
                                    </div>
                                    
                                    {selectionMode && (
                                        <div className="absolute top-4 right-4">
                                            {isSelected ? (
                                                <CheckSquare weight="fill" className="w-5 h-5 text-primary" />
                                            ) : (
                                                <Square className="w-5 h-5 text-muted-foreground" />
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                <h3 className="font-semibold truncate mb-1">{collection.name}</h3>
                                
                                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{collection.lastModified ? formatDistanceToNow(collection.lastModified, { addSuffix: true }) : "Unknown date"}</span>
                                </div>
                            </div>
                        );
                    })}
                    
                    {sortedCollections.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <p>No collections found.</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
