import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useShallow } from "@/lib/zustand-shallow";
import { useStore, type AppStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowsCounterClockwise,
  CaretLeft,
  FileText,
  Folder,
  Gear,
  HardDrives,
  Trash,
  XCircle,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { getIcon } from "@/utils/iconMap";
import { cn } from "@/lib/utils";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import type {
  ActivityClearRange,
  Collection,
  Doc,
  File,
  Graph as GraphType,
  Storage,
} from "@/types";
import {
  ACTIVITY_CLEAR_RANGE_OPTIONS,
  getActivityClearRangeLabel,
  isTimestampInActivityRange,
} from "@/lib/activityRanges";

interface SidebarTrashProps {
  onBack: () => void;
  variant?: "sidebar" | "settings" | "settings-page";
}

const sidebarHeaderButtonClassName =
  "h-6 w-6 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200";

function getDeletedTimestamp(item: { created: number; lastModified?: number }) {
  return item.lastModified ?? item.created;
}

function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function RangeField({
  value,
  onChange,
}: {
  value: ActivityClearRange;
  onChange: (value: ActivityClearRange) => void;
}) {
  const selectedOption = ACTIVITY_CLEAR_RANGE_OPTIONS.find(
    (option) => option.value === value,
  );

  return (
    <div className="space-y-2">
      <Label className="text-zinc-400">Time Range</Label>
      <Select
        value={value}
        onValueChange={(nextValue: string) =>
          onChange(nextValue as ActivityClearRange)
        }
      >
        <SelectTrigger className="w-full border-zinc-800 bg-zinc-900 text-zinc-100 hover:bg-zinc-900">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
          {ACTIVITY_CLEAR_RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedOption && (
        <p className="text-[11px] text-zinc-500">
          {selectedOption.description}
        </p>
      )}
    </div>
  );
}

interface TrashItemRowProps {
  icon: Icon;
  name: string;
  date: number;
  entityLabel: string;
  color?: string;
  variant: "sidebar" | "settings" | "settings-page";
  onRestore: () => void;
  onDelete: () => void;
}

function TrashItemRow({
  icon: Icon,
  name,
  date,
  entityLabel,
  color,
  variant,
  onRestore,
  onDelete,
}: TrashItemRowProps) {
  const isSidebar = variant === "sidebar";
  const isSettingsPage = variant === "settings-page";
  const deletedLabel = `Deleted ${formatRelativeTime(date)}`;

  const deleteDialog = (
    <DestructiveConfirmDialog
      title="Delete permanently?"
      description={`"${name}" will be permanently deleted. This cannot be undone.`}
      subjectLabel={entityLabel}
      subjectContent={name}
      onConfirm={onDelete}
      trigger={
        <Button
          variant="ghost"
          size={isSidebar ? "xs" : "icon-sm"}
          className={cn(
            "text-destructive hover:text-destructive hover:bg-destructive/10",
            isSidebar && "w-full min-w-0 justify-center",
          )}
          title="Delete permanently"
          onClick={(event) => event.stopPropagation()}
        >
          <XCircle />
          {isSidebar && <span>Delete</span>}
        </Button>
      }
    />
  );

  if (isSidebar) {
    return (
      <div className="w-full min-w-0 overflow-hidden rounded-none border border-border/60 bg-background/40 p-2.5">
        <div className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-x-3 gap-y-2">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-none border border-border bg-muted/30",
              color ? "" : "text-muted-foreground",
            )}
          >
            <Icon
              weight="fill"
              size={14}
              style={color ? { color } : undefined}
            />
          </div>

          <div className="min-w-0 overflow-hidden">
            <p className="line-clamp-2 break-all text-[13px] font-semibold leading-snug text-foreground">
              {name}
            </p>

            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="inline-flex h-5 max-w-full items-center justify-center rounded-none bg-primary/10 px-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-primary">
                {entityLabel}
              </span>
              <span className="min-w-0 truncate text-[11px] text-muted-foreground">
                {deletedLabel}
              </span>
            </div>
          </div>

          <div className="col-span-2 grid min-w-0 grid-cols-2 gap-1.5 border-t border-border/40 pt-2">
            <Button
              variant="ghost"
              size="xs"
              className="w-full min-w-0 justify-center text-primary hover:text-primary hover:bg-primary/10"
              onClick={(event) => {
                event.stopPropagation();
                onRestore();
              }}
            >
              <ArrowsCounterClockwise />
              Restore
            </Button>
            {deleteDialog}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-none border border-border/60 bg-background/40",
        isSettingsPage ? "px-4 py-3" : "px-3 py-3",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-none border border-border bg-muted/30",
            color ? "" : "text-muted-foreground",
            isSettingsPage ? "h-10 w-10" : "h-9 w-9",
          )}
        >
          <Icon
            weight="fill"
            size={isSettingsPage ? 16 : 15}
            style={color ? { color } : undefined}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={cn(
                  "truncate font-medium text-foreground",
                  isSettingsPage ? "text-sm" : "text-[13px]",
                )}
              >
                {name}
              </p>
              <div className="mt-1 flex min-w-0 items-center gap-1.5">
                <span className="flex h-5 w-20 shrink-0 items-center justify-center rounded-none bg-primary/10 px-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-primary">
                  {entityLabel}
                </span>
                <p className="min-w-0 truncate text-xs text-muted-foreground">
                  {deletedLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary hover:bg-primary/10"
                onClick={(event) => {
                  event.stopPropagation();
                  onRestore();
                }}
              >
                <ArrowsCounterClockwise />
                Restore
              </Button>
              {deleteDialog}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SidebarTrash({
  onBack,
  variant = "sidebar",
}: SidebarTrashProps) {
  const {
    files,
    collections,
    graphs,
    docs,
    storages,
    activeProjectId,
    trashClearRange,
    restoreFile,
    permanentDeleteFile,
    restoreCollection,
    permanentDeleteCollection,
    restoreGraph,
    permanentDeleteGraph,
    restoreDoc,
    permanentDeleteDoc,
    restoreStorage,
    permanentDeleteStorage,
    emptyTrash,
    setTrashClearRange,
  } = useStore(
    useShallow((state: AppStore) => ({
      files: state.files,
      collections: state.collections,
      graphs: state.graphs,
      docs: state.docs,
      storages: state.storages,
      activeProjectId: state.activeProjectId,
      trashClearRange: state.trashClearRange ?? "all-time",
      restoreFile: state.restoreFile,
      permanentDeleteFile: state.permanentDeleteFile,
      restoreCollection: state.restoreCollection,
      permanentDeleteCollection: state.permanentDeleteCollection,
      restoreGraph: state.restoreGraph,
      permanentDeleteGraph: state.permanentDeleteGraph,
      restoreDoc: state.restoreDoc,
      permanentDeleteDoc: state.permanentDeleteDoc,
      restoreStorage: state.restoreStorage,
      permanentDeleteStorage: state.permanentDeleteStorage,
      emptyTrash: state.emptyTrash,
      setTrashClearRange: state.setTrashClearRange,
    })),
  );
  const navigate = useNavigate();
  const [trashRangeEvaluationTime, setTrashRangeEvaluationTime] = useState(0);

  const isSidebar = variant === "sidebar";
  const isSettingsPage = variant === "settings-page";
  const isSettingsShell = variant === "settings";

  const trashedFiles = useMemo(
    () =>
      files.filter(
        (file) => file.projectId === activeProjectId && file.deleted,
      ),
    [files, activeProjectId],
  );
  const trashedCollections = useMemo(
    () =>
      collections.filter(
        (collection) =>
          collection.projectId === activeProjectId && collection.deleted,
      ),
    [collections, activeProjectId],
  );
  const trashedStorages = useMemo(
    () =>
      storages.filter(
        (storage) => storage.projectId === activeProjectId && storage.deleted,
      ),
    [storages, activeProjectId],
  );
  const trashedGraphs = useMemo(
    () =>
      graphs.filter(
        (graph) => graph.projectId === activeProjectId && graph.deleted,
      ),
    [graphs, activeProjectId],
  );
  const trashedDocs = useMemo(
    () =>
      docs.filter((doc) => doc.projectId === activeProjectId && doc.deleted),
    [docs, activeProjectId],
  );

  const totalTrashCount =
    trashedStorages.length +
    trashedCollections.length +
    trashedFiles.length +
    trashedDocs.length +
    trashedGraphs.length;

  const deleteRangeCount = useMemo(() => {
    const now = trashRangeEvaluationTime;
    return [
      ...trashedStorages.filter((item) =>
        isTimestampInActivityRange(
          getDeletedTimestamp(item),
          trashClearRange,
          now,
        ),
      ),
      ...trashedCollections.filter((item) =>
        isTimestampInActivityRange(
          getDeletedTimestamp(item),
          trashClearRange,
          now,
        ),
      ),
      ...trashedFiles.filter((item) =>
        isTimestampInActivityRange(
          getDeletedTimestamp(item),
          trashClearRange,
          now,
        ),
      ),
      ...trashedDocs.filter((item) =>
        isTimestampInActivityRange(
          getDeletedTimestamp(item),
          trashClearRange,
          now,
        ),
      ),
      ...trashedGraphs.filter((item) =>
        isTimestampInActivityRange(
          getDeletedTimestamp(item),
          trashClearRange,
          now,
        ),
      ),
    ].length;
  }, [
    trashedStorages,
    trashedCollections,
    trashedFiles,
    trashedDocs,
    trashedGraphs,
    trashClearRange,
    trashRangeEvaluationTime,
  ]);

  const hasTrash = totalTrashCount > 0;
  const rangeLabel = getActivityClearRangeLabel(trashClearRange);
  const clearDescription =
    trashClearRange === "all-time"
      ? "This will permanently delete all items in the trash. This action cannot be undone."
      : `This will permanently delete trash items from ${rangeLabel.toLowerCase()}. This action cannot be undone.`;

  const emptyTrashDialog = hasTrash ? (
    <DestructiveConfirmDialog
      title="Empty trash?"
      description={clearDescription}
      subjectLabel="Delete"
      subjectContent={
        deleteRangeCount > 0
          ? `${deleteRangeCount} ${deleteRangeCount === 1 ? "trashed item" : "trashed items"}`
          : "No trashed items in this range"
      }
      extraContent={
        <RangeField value={trashClearRange} onChange={setTrashClearRange} />
      }
      confirmLabel={
        trashClearRange === "all-time" ? "Delete All" : "Delete Selected"
      }
      confirmDisabled={deleteRangeCount === 0}
      onConfirm={() =>
        emptyTrash({ projectId: activeProjectId, range: trashClearRange })
      }
      trigger={
        isSidebar ? (
          <button
            type="button"
            className={cn(
              sidebarHeaderButtonClassName,
              "text-red-400 hover:text-red-300",
            )}
            title="Empty trash"
            onClick={() => setTrashRangeEvaluationTime(Date.now())}
          >
            <Trash weight="fill" size={14} />
          </button>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setTrashRangeEvaluationTime(Date.now())}
          >
            Empty Trash
          </Button>
        )
      }
    />
  ) : null;

  const openTrashSettings = () => navigate("/settings?tab=trash");

  const renderHeader = () => {
    if (isSidebar) {
      return (
        <div className="px-3 py-2 border-b border-border/40 bg-card/20 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className={sidebarHeaderButtonClassName}
              data-sound-back
              title="Back to sidebar"
            >
              <CaretLeft weight="bold" size={14} />
            </button>
            <div className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
              <Trash weight="fill" size={14} className="text-red-400" />
              Trash
            </div>
            <div className="flex items-center gap-1">
              {emptyTrashDialog}
              <button
                type="button"
                onClick={openTrashSettings}
                className={sidebarHeaderButtonClassName}
                title="Trash settings"
              >
                <Gear weight="bold" size={14} />
              </button>
            </div>
          </div>
        </div>
      );
    }

    const content = (
      <>
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trash className="text-primary" size={24} />
            Trash
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Review deleted items, restore them, or permanently remove recent
            trash in bulk.
          </p>
        </div>
        {emptyTrashDialog}
      </>
    );

    if (isSettingsShell) {
      return (
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          {content}
        </div>
      );
    }

    return (
      <div className="mb-4 flex items-start justify-between gap-3">
        {content}
      </div>
    );
  };

  const Wrapper = isSettingsPage ? "div" : ScrollArea;
  const wrapperClass = isSettingsPage
    ? ""
    : isSidebar
      ? "flex-1 min-h-0 px-3 py-3 overflow-y-auto"
      : "flex-1 min-h-0 p-4 overflow-y-auto";
  const containerClass = cn(
    isSettingsPage ? "space-y-4" : "flex flex-col h-full min-h-0",
    isSidebar ? "bg-sidebar-background" : "bg-transparent",
  );

  const Section = ({
    title,
    count,
    children,
  }: {
    title: string;
    count: number;
    children: ReactNode;
  }) => (
    <section
      className={cn(
        "w-full min-w-0 overflow-hidden rounded-none border border-border bg-card/50",
        isSidebar ? "p-2.5" : "p-5",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3
          className={cn(
            "font-semibold text-foreground",
            isSidebar ? "text-xs" : "text-sm",
          )}
        >
          {title}
        </h3>
        <span className="rounded-none border border-border bg-background/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {count}
        </span>
      </div>
      <div className={isSidebar ? "space-y-1.5" : "space-y-2"}>{children}</div>
    </section>
  );

  return (
    <div className={containerClass}>
      {renderHeader()}

      <Wrapper className={wrapperClass}>
        <div
          className={cn(
            "w-full min-w-0 space-y-4",
            !isSettingsPage && "min-h-full",
          )}
        >
          {!hasTrash ? (
            <div
              className={cn(
                "rounded-none border text-center text-muted-foreground",
                isSidebar
                  ? "border-border bg-card/40 p-4"
                  : "border-dashed border-border bg-card/30 p-8",
              )}
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-none bg-muted/50 mb-4">
                <Trash size={24} className="opacity-50" />
              </div>
              <p className="text-sm font-medium">Trash is empty</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Deleted items will appear here until they are restored or
                permanently removed.
              </p>
            </div>
          ) : (
            <div className={isSidebar ? "space-y-3" : "space-y-4"}>
              {trashedStorages.length > 0 && (
                <Section title="Storages" count={trashedStorages.length}>
                  {trashedStorages.map((storage: Storage) => (
                    <TrashItemRow
                      key={storage.id}
                      icon={HardDrives}
                      name={storage.name}
                      date={getDeletedTimestamp(storage)}
                      color={storage.color}
                      entityLabel="Storage"
                      variant={variant}
                      onRestore={() => restoreStorage(storage.id)}
                      onDelete={() => permanentDeleteStorage(storage.id)}
                    />
                  ))}
                </Section>
              )}

              {trashedCollections.length > 0 && (
                <Section title="Collections" count={trashedCollections.length}>
                  {trashedCollections.map((collection: Collection) => (
                    <TrashItemRow
                      key={collection.id}
                      icon={Folder}
                      name={collection.name}
                      date={getDeletedTimestamp(collection)}
                      color={collection.color}
                      entityLabel={
                        collection.type === "bucket"
                          ? "Bucket"
                          : collection.type === "folder"
                            ? "Folder"
                            : "Collection"
                      }
                      variant={variant}
                      onRestore={() => restoreCollection(collection.id)}
                      onDelete={() => permanentDeleteCollection(collection.id)}
                    />
                  ))}
                </Section>
              )}

              {trashedFiles.length > 0 && (
                <Section title="Files" count={trashedFiles.length}>
                  {trashedFiles.map((file: File) => (
                    <TrashItemRow
                      key={file.id}
                      icon={FileText}
                      name={file.name}
                      date={getDeletedTimestamp(file)}
                      entityLabel="File"
                      variant={variant}
                      onRestore={() => restoreFile(file.id)}
                      onDelete={() => permanentDeleteFile(file.id)}
                    />
                  ))}
                </Section>
              )}

              {trashedDocs.length > 0 && (
                <Section title="Docs" count={trashedDocs.length}>
                  {trashedDocs.map((doc: Doc) => (
                    <TrashItemRow
                      key={doc.id}
                      icon={getIcon(doc.icon)}
                      name={doc.name}
                      date={getDeletedTimestamp(doc)}
                      color={doc.color}
                      entityLabel="Document"
                      variant={variant}
                      onRestore={() => restoreDoc(doc.id)}
                      onDelete={() => permanentDeleteDoc(doc.id)}
                    />
                  ))}
                </Section>
              )}

              {trashedGraphs.length > 0 && (
                <Section title="Graphs" count={trashedGraphs.length}>
                  {trashedGraphs.map((graph: GraphType) => (
                    <TrashItemRow
                      key={graph.id}
                      icon={getIcon(graph.icon)}
                      name={graph.name}
                      date={getDeletedTimestamp(graph)}
                      color={graph.color}
                      entityLabel="Graph"
                      variant={variant}
                      onRestore={() => restoreGraph(graph.id)}
                      onDelete={() => permanentDeleteGraph(graph.id)}
                    />
                  ))}
                </Section>
              )}
            </div>
          )}
        </div>
      </Wrapper>
    </div>
  );
}
