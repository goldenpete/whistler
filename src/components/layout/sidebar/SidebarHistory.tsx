import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  Article,
  Briefcase,
  CaretLeft,
  Circle,
  ClockCounterClockwise,
  File,
  Folder,
  Gear,
  HardDrives,
  LineSegment,
  NotePencil,
  Pause,
  Play,
  ShareNetwork,
  Trash,
  XCircle,
} from "@phosphor-icons/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useShallow } from "@/lib/zustand-shallow";
import { useStore, type AppStore } from "@/store/useStore";
import {
  ACTIVITY_CLEAR_RANGE_OPTIONS,
  getActivityClearRangeLabel,
  isTimestampInActivityRange,
} from "@/lib/activityRanges";
import type { ActivityClearRange, HistoryEntry } from "@/types";

interface SidebarHistoryProps {
  onBack: () => void;
  variant?: "sidebar" | "settings" | "settings-page";
}

const sidebarHeaderButtonClassName =
  "h-6 w-6 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200";

function getIcon(type: HistoryEntry["entityType"]) {
  switch (type) {
    case "file":
      return File;
    case "collection":
      return Folder;
    case "highlight":
      return NotePencil;
    case "project":
      return Briefcase;
    case "graph":
      return ShareNetwork;
    case "node":
      return Circle;
    case "edge":
      return LineSegment;
    case "doc":
      return Article;
    case "storage":
      return HardDrives;
    case "settings":
      return Gear;
    default:
      return File;
  }
}

function getActionColor(action: HistoryEntry["action"]) {
  switch (action) {
    case "create":
      return "text-green-400 bg-green-400/10";
    case "update":
      return "text-blue-400 bg-blue-400/10";
    case "delete":
      return "text-red-400 bg-red-400/10";
    case "restore":
      return "text-primary bg-primary/10";
    default:
      return "text-zinc-400 bg-zinc-400/10";
  }
}

function formatEntityLabel(entityType?: string) {
  return entityType
    ? entityType.charAt(0).toUpperCase() + entityType.slice(1)
    : "Unknown";
}

function getEntryDescription(entry: HistoryEntry) {
  return entry.details || `${formatEntityLabel(entry.entityType)} activity`;
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

export function SidebarHistory({
  onBack,
  variant = "sidebar",
}: SidebarHistoryProps) {
  const {
    history,
    historyEnabled,
    historyClearRange,
    clearHistory,
    removeHistoryEntry,
    setHistoryEnabled,
    setHistoryClearRange,
  } = useStore(
    useShallow((state: AppStore) => ({
      history: state.history,
      historyEnabled: state.historyEnabled ?? true,
      historyClearRange: state.historyClearRange ?? "all-time",
      clearHistory: state.clearHistory,
      removeHistoryEntry: state.removeHistoryEntry,
      setHistoryEnabled: state.setHistoryEnabled,
      setHistoryClearRange: state.setHistoryClearRange,
    })),
  );
  const navigate = useNavigate();
  const [historyRangeEvaluationTime, setHistoryRangeEvaluationTime] =
    useState(0);

  const isSidebar = variant === "sidebar";
  const isSettingsPage = variant === "settings-page";
  const isSettingsShell = variant === "settings";

  const groupedHistory = useMemo(() => {
    return history.reduce<Record<string, HistoryEntry[]>>((groups, entry) => {
      const date = format(entry.timestamp, "yyyy-MM-dd");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
      return groups;
    }, {});
  }, [history]);

  const entriesInSelectedRange = useMemo(() => {
    const now = historyRangeEvaluationTime;
    return history.filter((entry) =>
      isTimestampInActivityRange(entry.timestamp, historyClearRange, now),
    );
  }, [history, historyClearRange, historyRangeEvaluationTime]);

  const openHistorySettings = () => navigate("/settings?tab=history");
  const rangeLabel = getActivityClearRangeLabel(historyClearRange);
  const deleteCount = entriesInSelectedRange.length;
  const deleteCountLabel = `${deleteCount} ${deleteCount === 1 ? "history entry" : "history entries"}`;
  const clearDescription =
    historyClearRange === "all-time"
      ? "This will permanently delete all history records. This action cannot be undone."
      : `This will permanently delete history records from ${rangeLabel.toLowerCase()}. This action cannot be undone.`;

  const clearDialog =
    history.length > 0 ? (
      <DestructiveConfirmDialog
        title="Clear history?"
        description={clearDescription}
        subjectLabel="Delete"
        subjectContent={
          deleteCount > 0
            ? deleteCountLabel
            : "No history entries in this range"
        }
        extraContent={
          <RangeField
            value={historyClearRange}
            onChange={setHistoryClearRange}
          />
        }
        confirmLabel={
          historyClearRange === "all-time" ? "Delete All" : "Delete Selected"
        }
        confirmDisabled={deleteCount === 0}
        onConfirm={() => clearHistory(historyClearRange)}
        trigger={
          isSidebar ? (
            <button
              className={cn(
                sidebarHeaderButtonClassName,
                "text-red-400 hover:text-red-300",
              )}
              title="Clear history"
              type="button"
              onClick={() => setHistoryRangeEvaluationTime(Date.now())}
            >
              <Trash weight="fill" size={14} />
            </button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setHistoryRangeEvaluationTime(Date.now())}
            >
              Clear History
            </Button>
          )
        }
      />
    ) : null;

  const historyToggle = isSidebar ? (
    <button
      type="button"
      onClick={() => setHistoryEnabled(!historyEnabled)}
      className={cn(
        sidebarHeaderButtonClassName,
        historyEnabled
          ? "text-amber-300 hover:text-amber-200"
          : "text-emerald-300 hover:text-emerald-200",
      )}
      title={historyEnabled ? "Pause history" : "Resume history"}
    >
      {historyEnabled ? (
        <Pause weight="fill" size={14} />
      ) : (
        <Play weight="fill" size={14} />
      )}
    </button>
  ) : (
    <Button
      variant={historyEnabled ? "outline" : "secondary"}
      size="sm"
      onClick={() => setHistoryEnabled(!historyEnabled)}
    >
      {historyEnabled ? <Pause weight="fill" /> : <Play weight="fill" />}
      {historyEnabled ? "Pause Logging" : "Resume Logging"}
    </Button>
  );

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
              <ClockCounterClockwise weight="bold" size={14} />
              History
            </div>
            <div className="flex items-center gap-1">
              {historyToggle}
              {clearDialog}
              <button
                type="button"
                onClick={openHistorySettings}
                className={sidebarHeaderButtonClassName}
                title="History settings"
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
            <ClockCounterClockwise className="text-primary" size={24} />
            History Log
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Review changes, delete single entries, or clear recent history in
            bulk.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {historyToggle}
          {clearDialog}
        </div>
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
      ? "flex-1 min-h-0 overflow-x-hidden px-3 py-3 overflow-y-auto"
      : "flex-1 min-h-0 p-4 overflow-y-auto";
  const containerClass = cn(
    isSettingsPage ? "space-y-4" : "flex flex-col h-full min-h-0",
    isSidebar ? "bg-sidebar-background" : "bg-transparent",
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
          {history.length === 0 ? (
            <div
              className={cn(
                "rounded-none border text-center text-muted-foreground",
                isSidebar
                  ? "border-border bg-card/40 p-4"
                  : "border-dashed border-border bg-card/30 p-8",
              )}
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-none bg-muted/50 mb-4">
                <ClockCounterClockwise size={24} className="opacity-50" />
              </div>
              <p className="text-sm font-medium">No history yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Recent changes will appear here as you work.
              </p>
            </div>
          ) : (
            (Object.entries(groupedHistory) as [string, HistoryEntry[]][])
              .sort((left, right) => right[0].localeCompare(left[0]))
              .map(([date, entries]) => (
                <section
                  key={date}
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
                      {format(new Date(date), "MMMM d, yyyy")}
                    </h3>
                    <span className="rounded-none border border-border bg-background/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                      {entries.length}
                    </span>
                  </div>

                  <div className={isSidebar ? "space-y-1.5" : "space-y-2"}>
                    {entries.map((entry) => {
                      const Icon = getIcon(entry.entityType);
                      const entryName =
                        entry.entityName || formatEntityLabel(entry.entityType);
                      const entryDescription = getEntryDescription(entry);
                      const deleteTrigger = (
                        <Button
                          variant="ghost"
                          size={isSidebar ? "icon-xs" : "icon-sm"}
                          className={cn(
                            "text-muted-foreground hover:text-destructive",
                            isSidebar
                              ? "absolute right-2 top-2 z-10 opacity-40 transition-opacity hover:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
                              : "opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
                          )}
                          title="Delete history entry"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <XCircle />
                        </Button>
                      );

                      return (
                        <div
                          key={entry.id}
                          className={cn(
                            "group relative w-full overflow-hidden rounded-none border border-border/60 bg-background/40",
                            isSidebar ? "px-2.5 py-2.5" : "px-3 py-3",
                          )}
                        >
                          {isSidebar && (
                            <DestructiveConfirmDialog
                              title="Delete this history entry?"
                              description="This will permanently remove this history record. This action cannot be undone."
                              subjectLabel="History Entry"
                              subjectContent={entryName}
                              confirmLabel="Delete"
                              onConfirm={() => removeHistoryEntry(entry.id)}
                              trigger={deleteTrigger}
                            />
                          )}
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "flex shrink-0 items-center justify-center rounded-none",
                                getActionColor(entry.action),
                                isSidebar ? "h-7 w-7" : "h-9 w-9",
                              )}
                            >
                              <Icon size={isSidebar ? 13 : 16} weight="fill" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  "truncate font-medium text-foreground",
                                  isSidebar ? "pr-7 text-[13px]" : "text-sm",
                                )}
                              >
                                {entryName}
                              </p>

                              {isSidebar ? (
                                <>
                                  <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
                                    <span
                                      className={cn(
                                        "inline-flex h-5 max-w-full items-center justify-center rounded-none px-1.5 text-[9px] font-bold uppercase tracking-[0.12em]",
                                        getActionColor(entry.action),
                                      )}
                                    >
                                      {entry.action}
                                    </span>
                                    <span className="min-w-0 truncate text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                                      {formatEntityLabel(entry.entityType)}
                                    </span>
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                      {format(entry.timestamp, "HH:mm")}
                                    </span>
                                  </div>
                                  <p className="mt-1.5 line-clamp-2 wrap-break-word border-t border-border/30 pt-1.5 text-[11px] leading-snug text-muted-foreground">
                                    {entryDescription}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <div className="mt-1 flex min-w-0 items-center gap-1.5">
                                    <span
                                      className={cn(
                                        "flex h-5 w-20 shrink-0 items-center justify-center rounded-none px-1.5 text-[9px] font-bold uppercase tracking-[0.12em]",
                                        getActionColor(entry.action),
                                      )}
                                    >
                                      {entry.action}
                                    </span>
                                    <p className="min-w-0 truncate text-[11px] text-muted-foreground">
                                      {entryDescription}
                                    </p>
                                  </div>

                                  <div className="mt-1.5 flex min-w-0 items-center justify-between gap-2">
                                    <span className="min-w-0 flex-1 truncate text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                                      {formatEntityLabel(entry.entityType)}
                                    </span>
                                    <div className="flex shrink-0 items-center gap-0.5">
                                      <span className="font-mono text-[10px] text-muted-foreground">
                                        {format(entry.timestamp, "HH:mm")}
                                      </span>
                                      <DestructiveConfirmDialog
                                        title="Delete this history entry?"
                                        description="This will permanently remove this history record. This action cannot be undone."
                                        subjectLabel="History Entry"
                                        subjectContent={entryName}
                                        confirmLabel="Delete"
                                        onConfirm={() =>
                                          removeHistoryEntry(entry.id)
                                        }
                                        trigger={deleteTrigger}
                                      />
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))
          )}
        </div>
      </Wrapper>
    </div>
  );
}
