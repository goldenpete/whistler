/**
 * ─── QuickAccessDialog.tsx ──────────────────────────────────────────
 *
 * A searchable quick-access dialog that surfaces project entities
 * (files, highlights, collections, docs, graphs, storages, and
 * projects) in a filterable, sortable list.
 *
 * Features / Responsibilities:
 *   - Type-scoped browsing with a dedicated QuickAccessType filter
 *   - Real-time fuzzy search across entity names
 *   - Ascending / descending sort by last-modified date
 *   - Single-click navigation: sets the active entity and routes to
 *     the appropriate view
 * ───────────────────────────────────────────────────────────────────
 */
import { useState, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  File,
  FileText,
  Tag,
  Folder,
  Graph,
  HardDrives,
  Clock,
  ProjectorScreenChart,
  MagnifyingGlass,
  SortAscending,
  SortDescending,
  CaretRight,
} from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { findRootBucketId } from "@/utils/collectionUtils";
import type { Collection, File as AppFile } from "@/types";

export type QuickAccessType =
  | "file"
  | "highlight"
  | "collection"
  | "bucket"
  | "doc"
  | "graph"
  | "storage"
  | "project";

interface QuickAccessItem {
  id: string;
  name?: string;
  title?: string;
  text?: string | null;
  note?: string;
  created?: number;
  lastModified?: number;
  fileId?: string;
  fileName?: string;
  type?: Collection["type"] | AppFile["type"];
}

interface QuickAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: QuickAccessType | null;
}

export function QuickAccessDialog({
  open,
  onOpenChange,
  type,
}: QuickAccessDialogProps) {
  const {
    files,
    highlights,
    collections,
    docs,
    graphs,
    storages,
    projects,
    activeProjectId,
    setActiveFile,
    setActiveDoc,
    setActiveCollection,
    setActiveGraph,
    setActiveProject,
  } = useStore(
    useShallow((state) => ({
      files: state.files,
      highlights: state.highlights,
      collections: state.collections,
      docs: state.docs,
      graphs: state.graphs,
      storages: state.storages,
      projects: state.projects,
      activeProjectId: state.activeProjectId,
      setActiveFile: state.setActiveFile,
      setActiveDoc: state.setActiveDoc,
      setActiveCollection: state.setActiveCollection,
      setActiveGraph: state.setActiveGraph,
      setActiveProject: state.setActiveProject,
    })),
  );

  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const items = useMemo(() => {
    if (!type) return [];

    let rawItems: QuickAccessItem[] = [];

    switch (type) {
      case "file":
        rawItems = files.filter(
          (f) => f.projectId === activeProjectId && !f.deleted,
        );
        break;
      case "highlight":
        {
          // Join highlights with files to filter by project
          const projectFileIds = new Set(
            files
              .filter((f) => f.projectId === activeProjectId)
              .map((f) => f.id),
          );
          rawItems = highlights
            .filter((h) => projectFileIds.has(h.fileId))
            .map((h) => {
              const file = files.find((f) => f.id === h.fileId);
              return {
                ...h,
                name: h.note || h.text || "Untitled Highlight",
                fileName: file?.name,
              };
            });
        }
        break;
      case "collection":
        rawItems = collections.filter(
          (c) =>
            c.projectId === activeProjectId &&
            !c.deleted &&
            c.type !== "bucket",
        );
        break;
      case "bucket":
        rawItems = collections.filter(
          (c) =>
            c.projectId === activeProjectId &&
            !c.deleted &&
            c.type === "bucket",
        );
        break;
      case "doc":
        rawItems = docs.filter(
          (d) => d.projectId === activeProjectId && !d.deleted,
        );
        break;
      case "graph":
        rawItems = graphs.filter((g) => g.projectId === activeProjectId); // graphs don't have deleted flag yet?
        break;
      case "storage":
        rawItems = storages.filter(
          (s) => s.projectId === activeProjectId && !s.deleted,
        );
        break;
      case "project":
        rawItems = projects; // Show all projects
        break;
    }

    return rawItems
      .filter((item) => {
        const name = item.name || item.title || item.text || "";
        return name.toLowerCase().includes(search.toLowerCase());
      })
      .sort((a, b) => {
        const dateA = a.lastModified || a.created || 0;
        const dateB = b.lastModified || b.created || 0;
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      });
  }, [
    type,
    files,
    highlights,
    collections,
    docs,
    graphs,
    storages,
    projects,
    activeProjectId,
    search,
    sortOrder,
  ]);

  const handleItemClick = (item: QuickAccessItem) => {
    switch (type) {
      case "file":
        setActiveFile(item.id);
        navigate(`/file/${item.id}`);
        break;
      case "highlight":
        if (item.fileId) {
          setActiveFile(item.fileId);
          navigate(`/file/${item.fileId}`);
        }
        break;
      case "collection":
        {
          const bucketId = findRootBucketId(collections, item.id);
          if (bucketId) {
            setActiveCollection(bucketId);
          }
          if (item.type === "folder") {
            navigate(`/collections?folderId=${item.id}`);
          } else {
            navigate(`/collection/${item.id}`);
          }
        }
        break;
      case "bucket":
        setActiveCollection(item.id);
        navigate("/collections");
        break;
      case "doc":
        setActiveDoc(item.id);
        navigate("/docs");
        break;
      case "graph":
        setActiveGraph(item.id);
        navigate("/graphs");
        break;
      case "storage":
        // Navigate to storage view
        navigate(`/storage?storageId=${item.id}`);
        break;
      case "project":
        setActiveProject(item.id);
        navigate("/");
        break;
    }
    onOpenChange(false);
  };

  const getIcon = () => {
    switch (type) {
      case "file":
        return File;
      case "highlight":
        return Clock;
      case "collection":
        return Tag;
      case "bucket":
        return Folder;
      case "doc":
        return FileText;
      case "graph":
        return Graph;
      case "storage":
        return HardDrives;
      case "project":
        return ProjectorScreenChart;
      default:
        return File;
    }
  };

  const Icon = getIcon();

  const getTitle = () => {
    switch (type) {
      case "file":
        return "All Files";
      case "highlight":
        return "All Highlights";
      case "collection":
        return "All Collections";
      case "bucket":
        return "All Buckets";
      case "doc":
        return "All Documents";
      case "graph":
        return "All Graphs";
      case "storage":
        return "All Storages";
      case "project":
        return "All Projects";
      default:
        return "Items";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50">
        <DialogHeader className="p-4 border-b border-border/10">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Icon weight="duotone" className="w-5 h-5" />
            <span className="text-xs uppercase tracking-wider font-medium">
              Quick Access
            </span>
          </div>
          <DialogTitle className="text-xl">{getTitle()}</DialogTitle>
        </DialogHeader>

        <div className="p-4 border-b border-border/10 flex items-center gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
            }
            title={`Sort by Date (${sortOrder === "asc" ? "Oldest" : "Newest"})`}
          >
            {sortOrder === "asc" ? (
              <SortAscending size={20} />
            ) : (
              <SortDescending size={20} />
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {items.length > 0 ? (
            <div className="flex flex-col gap-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="p-2 rounded-md bg-background border border-border/40 text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-colors">
                    <Icon weight="duotone" className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">
                      {item.name || item.title || item.text}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/60 mt-0.5">
                      <span>
                        {formatDistanceToNow(
                          item.lastModified || item.created || 0,
                          { addSuffix: true },
                        )}
                      </span>
                      {type === "highlight" && item.fileName && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[150px]">
                            {item.fileName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <CaretRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-muted-foreground/50" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
              <Icon weight="duotone" className="w-12 h-12 mb-2 opacity-20" />
              <p className="text-sm">No items found</p>
            </div>
          )}
        </div>

        <div className="p-2 border-t border-border/10 bg-muted/20 text-[10px] text-muted-foreground text-center">
          {items.length} {items.length === 1 ? "item" : "items"} found
        </div>
      </DialogContent>
    </Dialog>
  );
}
