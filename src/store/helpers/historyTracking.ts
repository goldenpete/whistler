import type { AppStore } from "../types";
import type {
  Collection,
  Doc,
  File,
  Graph,
  GraphEdge,
  GraphNode,
  Highlight,
  HistoryEntry,
  Project,
  Storage,
} from "@/types";

export const MAX_HISTORY_ENTRIES = 5000;

export type HistoryDraft = Omit<HistoryEntry, "id" | "timestamp">;

type TrackedEntity =
  | Project
  | Storage
  | File
  | Collection
  | Highlight
  | Doc
  | Graph
  | GraphNode
  | GraphEdge;

type TrackedArrayKey =
  | "projects"
  | "storages"
  | "files"
  | "collections"
  | "highlights"
  | "docs"
  | "graphs"
  | "graphNodes"
  | "graphEdges";

type SettingKey =
  | "user"
  | "syncOptions"
  | "historyEnabled"
  | "accentTheme"
  | "accentThemeMode"
  | "customAccentThemes"
  | "baseTheme"
  | "baseThemeMode"
  | "customBaseThemes"
  | "enableDefaultColorControls"
  | "defaultColors"
  | "backgroundImageUrl"
  | "backgroundImageOpacity"
  | "backgroundColor"
  | "backgroundGradient"
  | "backgroundIsGradient"
  | "backgroundOverlayOpacity"
  | "ambientMusicName"
  | "ambientMusicType"
  | "ambientMusicPaused"
  | "ambientMusicVolume"
  | "ambientMusicStorageKey"
  | "windowOutlineEnabled"
  | "toggleThemingEnabled"
  | "largeTogglesThemingEnabled"
  | "tooltipsEnabled"
  | "hideSeekbarProgressTrail"
  | "videoZoomByFile"
  | "videoZoomManualByFile"
  | "muteNewVideosUntilUnmuted"
  | "muteHighlightsUntilUnmuted"
  | "alwaysShowMuteOverlay"
  | "googleDriveApiKey"
  | "googleDriveCacheEnabled"
  | "rememberMediaVolume"
  | "disableMediaAutoplay"
  | "videoVolumeByFile"
  | "audioVolumeByFile"
  | "videoUnmutedByFile"
  | "useMiddleFrameForPreviews"
  | "highlightViewerListMode"
  | "cacheFiles"
  | "cacheCollections"
  | "cacheHighlights"
  | "sfxEnabled"
  | "enabledSounds"
  | "replaceSearchWithConfirm"
  | "replaceAllSoundsWithCursor"
  | "soundConfigs"
  | "customKeybinds"
  | "disabledKeybinds"
  | "docViewMode"
  | "storageViewMode"
  | "collectionViewMode";

interface ArrayTracker<T extends TrackedEntity> {
  key: TrackedArrayKey;
  entityType: HistoryEntry["entityType"];
  getName: (item: T) => string | undefined;
  getProjectId: (item: T, state: AppStore) => string;
}

interface SettingTracker {
  key: SettingKey;
  entityName: string;
  label: string;
}

const ARRAY_TRACKERS: ArrayTracker<TrackedEntity>[] = [
  {
    key: "projects",
    entityType: "project",
    getName: (item) => (item as Project).name,
    getProjectId: (item) => (item as Project).id,
  },
  {
    key: "storages",
    entityType: "storage",
    getName: (item) => (item as Storage).name,
    getProjectId: (item) => (item as Storage).projectId,
  },
  {
    key: "files",
    entityType: "file",
    getName: (item) => (item as File).name,
    getProjectId: (item) => (item as File).projectId,
  },
  {
    key: "collections",
    entityType: "collection",
    getName: (item) => (item as Collection).name,
    getProjectId: (item) => (item as Collection).projectId,
  },
  {
    key: "highlights",
    entityType: "highlight",
    getName: (item) => {
      const highlight = item as Highlight;
      return highlight.note || highlight.text || "Highlight";
    },
    getProjectId: (item, state) => {
      const highlight = item as Highlight;
      return (
        state.files.find((file) => file.id === highlight.fileId)?.projectId ||
        state.activeProjectId ||
        "global"
      );
    },
  },
  {
    key: "docs",
    entityType: "doc",
    getName: (item) => (item as Doc).name,
    getProjectId: (item) => (item as Doc).projectId,
  },
  {
    key: "graphs",
    entityType: "graph",
    getName: (item) => (item as Graph).name,
    getProjectId: (item) => (item as Graph).projectId,
  },
  {
    key: "graphNodes",
    entityType: "node",
    getName: (item) => (item as GraphNode).title || "Node",
    getProjectId: (item, state) => {
      const node = item as GraphNode;
      return (
        state.graphs.find((graph) => graph.id === node.graphId)?.projectId ||
        state.activeProjectId ||
        "global"
      );
    },
  },
  {
    key: "graphEdges",
    entityType: "edge",
    getName: () => "Connection",
    getProjectId: (item, state) => {
      const edge = item as GraphEdge;
      return (
        state.graphs.find((graph) => graph.id === edge.graphId)?.projectId ||
        state.activeProjectId ||
        "global"
      );
    },
  },
];

const SETTING_TRACKERS: SettingTracker[] = [
  { key: "user", entityName: "Sync Settings", label: "sync account" },
  {
    key: "syncOptions",
    entityName: "Sync Settings",
    label: "sync preferences",
  },
  {
    key: "historyEnabled",
    entityName: "History Settings",
    label: "history tracking",
  },
  {
    key: "accentTheme",
    entityName: "Appearance Settings",
    label: "accent theme",
  },
  {
    key: "accentThemeMode",
    entityName: "Appearance Settings",
    label: "accent theme mode",
  },
  {
    key: "customAccentThemes",
    entityName: "Appearance Settings",
    label: "custom accent theme",
  },
  { key: "baseTheme", entityName: "Appearance Settings", label: "base theme" },
  {
    key: "baseThemeMode",
    entityName: "Appearance Settings",
    label: "base theme mode",
  },
  {
    key: "customBaseThemes",
    entityName: "Appearance Settings",
    label: "custom base theme",
  },
  {
    key: "enableDefaultColorControls",
    entityName: "Appearance Settings",
    label: "default color controls",
  },
  {
    key: "defaultColors",
    entityName: "Appearance Settings",
    label: "default colors",
  },
  {
    key: "backgroundImageUrl",
    entityName: "Appearance Settings",
    label: "background image",
  },
  {
    key: "backgroundImageOpacity",
    entityName: "Appearance Settings",
    label: "background image opacity",
  },
  {
    key: "backgroundColor",
    entityName: "Appearance Settings",
    label: "background color",
  },
  {
    key: "backgroundGradient",
    entityName: "Appearance Settings",
    label: "background gradient",
  },
  {
    key: "backgroundIsGradient",
    entityName: "Appearance Settings",
    label: "background gradient mode",
  },
  {
    key: "backgroundOverlayOpacity",
    entityName: "Appearance Settings",
    label: "background overlay opacity",
  },
  {
    key: "ambientMusicName",
    entityName: "Music Settings",
    label: "ambient music track",
  },
  {
    key: "ambientMusicType",
    entityName: "Music Settings",
    label: "ambient music type",
  },
  {
    key: "ambientMusicPaused",
    entityName: "Music Settings",
    label: "ambient music",
  },
  {
    key: "ambientMusicVolume",
    entityName: "Music Settings",
    label: "ambient music volume",
  },
  {
    key: "ambientMusicStorageKey",
    entityName: "Music Settings",
    label: "ambient music library",
  },
  {
    key: "windowOutlineEnabled",
    entityName: "Appearance Settings",
    label: "window outline",
  },
  {
    key: "toggleThemingEnabled",
    entityName: "Appearance Settings",
    label: "toggle theming",
  },
  {
    key: "largeTogglesThemingEnabled",
    entityName: "Appearance Settings",
    label: "large toggle theming",
  },
  {
    key: "tooltipsEnabled",
    entityName: "Appearance Settings",
    label: "tooltips",
  },
  {
    key: "hideSeekbarProgressTrail",
    entityName: "Appearance Settings",
    label: "seekbar progress trail",
  },
  {
    key: "videoZoomByFile",
    entityName: "Playback Settings",
    label: "video zoom",
  },
  {
    key: "videoZoomManualByFile",
    entityName: "Playback Settings",
    label: "manual video zoom",
  },
  {
    key: "muteNewVideosUntilUnmuted",
    entityName: "Playback Settings",
    label: "mute new videos",
  },
  {
    key: "muteHighlightsUntilUnmuted",
    entityName: "Playback Settings",
    label: "mute highlights",
  },
  {
    key: "alwaysShowMuteOverlay",
    entityName: "Playback Settings",
    label: "mute overlay",
  },
  {
    key: "googleDriveApiKey",
    entityName: "Playback Settings",
    label: "Google Drive API key",
  },
  {
    key: "googleDriveCacheEnabled",
    entityName: "Playback Settings",
    label: "Google Drive cache",
  },
  {
    key: "rememberMediaVolume",
    entityName: "Playback Settings",
    label: "remember media volume",
  },
  {
    key: "disableMediaAutoplay",
    entityName: "Playback Settings",
    label: "media autoplay",
  },
  {
    key: "videoVolumeByFile",
    entityName: "Playback Settings",
    label: "video volume",
  },
  {
    key: "audioVolumeByFile",
    entityName: "Playback Settings",
    label: "audio volume",
  },
  {
    key: "videoUnmutedByFile",
    entityName: "Playback Settings",
    label: "video mute state",
  },
  {
    key: "useMiddleFrameForPreviews",
    entityName: "Playback Settings",
    label: "preview frame mode",
  },
  {
    key: "highlightViewerListMode",
    entityName: "Playback Settings",
    label: "highlight viewer mode",
  },
  { key: "cacheFiles", entityName: "Playback Settings", label: "file cache" },
  {
    key: "cacheCollections",
    entityName: "Playback Settings",
    label: "collection cache",
  },
  {
    key: "cacheHighlights",
    entityName: "Playback Settings",
    label: "highlight cache",
  },
  { key: "sfxEnabled", entityName: "Sound Settings", label: "sound effects" },
  {
    key: "enabledSounds",
    entityName: "Sound Settings",
    label: "enabled sounds",
  },
  {
    key: "replaceSearchWithConfirm",
    entityName: "Sound Settings",
    label: "search sound replacement",
  },
  {
    key: "replaceAllSoundsWithCursor",
    entityName: "Sound Settings",
    label: "global cursor sound replacement",
  },
  {
    key: "soundConfigs",
    entityName: "Sound Settings",
    label: "sound configuration",
  },
  { key: "customKeybinds", entityName: "Keybind Settings", label: "keybinds" },
  {
    key: "disabledKeybinds",
    entityName: "Keybind Settings",
    label: "disabled keybinds",
  },
  {
    key: "docViewMode",
    entityName: "View Settings",
    label: "document view mode",
  },
  {
    key: "storageViewMode",
    entityName: "View Settings",
    label: "storage view mode",
  },
  {
    key: "collectionViewMode",
    entityName: "View Settings",
    label: "collection view mode",
  },
];

const MANUAL_HISTORY_KEYS = new Set(
  [
    "action",
    "entityType",
    "entityId",
    "projectId",
    "details",
    "entityName",
  ].map((key) => key.toLowerCase()),
);

export function appendHistoryEntries(
  history: HistoryEntry[],
  entries: HistoryDraft[],
): HistoryEntry[] {
  if (entries.length === 0) {
    return history.slice(0, MAX_HISTORY_ENTRIES);
  }

  const stampedEntries = entries.map((entry) => ({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    ...entry,
  }));

  return [...stampedEntries, ...history].slice(0, MAX_HISTORY_ENTRIES);
}

export function appendHistoryEntriesIfEnabled(
  state: Pick<AppStore, "history" | "historyEnabled">,
  entries: HistoryDraft[],
): HistoryEntry[] {
  if (state.historyEnabled === false) {
    return state.history;
  }

  return appendHistoryEntries(state.history, entries);
}

export function insertHistoryEntries(
  history: HistoryEntry[],
  manualEntryCount: number,
  entries: HistoryDraft[],
): HistoryEntry[] {
  if (entries.length === 0) {
    return history.slice(0, MAX_HISTORY_ENTRIES);
  }

  const stampedEntries = entries.map((entry) => ({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    ...entry,
  }));

  const safeManualCount = Math.max(
    0,
    Math.min(manualEntryCount, history.length),
  );
  return [
    ...history.slice(0, safeManualCount),
    ...stampedEntries,
    ...history.slice(safeManualCount),
  ].slice(0, MAX_HISTORY_ENTRIES);
}

export function collectHistoryEntries(
  prevState: AppStore,
  nextState: AppStore,
): HistoryDraft[] {
  const entries: HistoryDraft[] = [];

  for (const tracker of ARRAY_TRACKERS) {
    if (prevState[tracker.key] !== nextState[tracker.key]) {
      entries.push(...collectArrayEntries(tracker, prevState, nextState));
    }
  }

  for (const tracker of SETTING_TRACKERS) {
    if (isEqualValue(prevState[tracker.key], nextState[tracker.key])) {
      continue;
    }

    entries.push({
      projectId:
        nextState.activeProjectId || prevState.activeProjectId || "global",
      action: "update",
      entityType: "settings",
      entityId: tracker.key,
      entityName: tracker.entityName,
      details: formatSettingDetails(
        tracker,
        prevState[tracker.key],
        nextState[tracker.key],
      ),
    });
  }

  return entries;
}

export function dedupeHistoryEntries(
  entries: HistoryDraft[],
  manualEntries: HistoryEntry[],
): HistoryDraft[] {
  if (manualEntries.length === 0) {
    return entries;
  }

  const manualEntryKeys = new Set(
    manualEntries.map((entry) =>
      getEntryKey(entry.action, entry.entityType, entry.entityId),
    ),
  );

  return entries.filter(
    (entry) =>
      !manualEntryKeys.has(
        getEntryKey(entry.action, entry.entityType, entry.entityId),
      ),
  );
}

function collectArrayEntries<T extends TrackedEntity>(
  tracker: ArrayTracker<T>,
  prevState: AppStore,
  nextState: AppStore,
): HistoryDraft[] {
  const prevItems = prevState[tracker.key] as T[];
  const nextItems = nextState[tracker.key] as T[];
  const prevMap = new Map(prevItems.map((item) => [item.id, item]));
  const nextMap = new Map(nextItems.map((item) => [item.id, item]));
  const orderedIds = [
    ...nextItems.map((item) => item.id),
    ...prevItems.map((item) => item.id).filter((id) => !nextMap.has(id)),
  ];

  const entries: HistoryDraft[] = [];

  for (const id of orderedIds) {
    const prevItem = prevMap.get(id);
    const nextItem = nextMap.get(id);

    if (!prevItem && nextItem) {
      entries.push({
        projectId: tracker.getProjectId(nextItem, nextState),
        action: "create",
        entityType: tracker.entityType,
        entityId: nextItem.id,
        entityName: tracker.getName(nextItem),
      });
      continue;
    }

    if (prevItem && !nextItem) {
      entries.push({
        projectId: tracker.getProjectId(prevItem, prevState),
        action: "delete",
        entityType: tracker.entityType,
        entityId: prevItem.id,
        entityName: tracker.getName(prevItem),
        details: "Permanent Delete",
      });
      continue;
    }

    if (!prevItem || !nextItem) {
      continue;
    }

    const prevDeleted = getDeletedValue(prevItem);
    const nextDeleted = getDeletedValue(nextItem);

    if (prevDeleted !== nextDeleted) {
      entries.push({
        projectId: tracker.getProjectId(nextItem, nextState),
        action: nextDeleted ? "delete" : "restore",
        entityType: tracker.entityType,
        entityId: nextItem.id,
        entityName: tracker.getName(nextItem),
        details: nextDeleted ? "Moved to Trash" : "Restored from Trash",
      });
      continue;
    }

    const changedKeys = getMeaningfulChangedKeys(
      tracker.entityType,
      prevItem,
      nextItem,
    );
    if (changedKeys.length === 0) {
      continue;
    }

    entries.push({
      projectId: tracker.getProjectId(nextItem, nextState),
      action: "update",
      entityType: tracker.entityType,
      entityId: nextItem.id,
      entityName: tracker.getName(nextItem),
      details: formatUpdateDetails(tracker.entityType, changedKeys),
    });
  }

  return entries;
}

function getDeletedValue(item: TrackedEntity): boolean {
  return typeof (item as { deleted?: boolean }).deleted === "boolean"
    ? Boolean((item as { deleted?: boolean }).deleted)
    : false;
}

function getDynamicValue(item: object, key: string): unknown {
  return Reflect.get(item, key);
}

function getMeaningfulChangedKeys(
  entityType: HistoryEntry["entityType"],
  prevItem: TrackedEntity,
  nextItem: TrackedEntity,
): string[] {
  const allKeys = new Set([...Object.keys(prevItem), ...Object.keys(nextItem)]);

  const changedKeys = Array.from(allKeys).filter(
    (key) =>
      !isEqualValue(
        getDynamicValue(prevItem, key),
        getDynamicValue(nextItem, key),
      ),
  );

  const filteredKeys = changedKeys.filter(
    (key) => key !== "lastModified" && key !== "lastViewed",
  );
  if (filteredKeys.length === 0) {
    return [];
  }

  if (
    entityType === "file" &&
    filteredKeys.length === 1 &&
    filteredKeys[0] === "url" &&
    (nextItem as File).sourceKind === "local"
  ) {
    return [];
  }

  if (
    entityType === "node" &&
    filteredKeys.every((key) => key === "x" || key === "y")
  ) {
    return [];
  }

  return filteredKeys;
}

function formatSettingDetails(
  tracker: SettingTracker,
  prevValue: AppStore[SettingKey],
  nextValue: AppStore[SettingKey],
): string {
  if (tracker.key === "user") {
    return nextValue ? "Signed in to sync" : "Signed out of sync";
  }

  if (tracker.key === "backgroundImageUrl") {
    return nextValue ? "Background image updated" : "Background image cleared";
  }

  if (tracker.key === "ambientMusicStorageKey") {
    return nextValue
      ? "Ambient music library updated"
      : "Ambient music library cleared";
  }

  if (typeof prevValue === "boolean" && typeof nextValue === "boolean") {
    return `${nextValue ? "Enabled" : "Disabled"} ${tracker.label}`;
  }

  if (typeof nextValue === "string") {
    return nextValue
      ? `${capitalizeLabel(tracker.label)} set to ${formatDisplayValue(nextValue)}`
      : `${capitalizeLabel(tracker.label)} cleared`;
  }

  if (typeof nextValue === "number") {
    return `${capitalizeLabel(tracker.label)} changed`;
  }

  return `${capitalizeLabel(tracker.label)} updated`;
}

function formatUpdateDetails(
  entityType: HistoryEntry["entityType"],
  changedKeys: string[],
): string {
  if (changedKeys.length === 1) {
    const [key] = changedKeys;
    switch (key) {
      case "name":
      case "title":
        return "Renamed";
      case "content":
        return "Updated content";
      case "color":
        return "Changed color";
      case "icon":
        return "Changed icon";
      case "description":
        return "Updated description";
      case "note":
        return "Updated note";
      case "text":
        return "Updated text";
      case "collectionId":
      case "parentId":
        return "Moved";
      case "order":
        return "Reordered";
      case "start":
      case "end":
        return "Adjusted range";
      case "fromId":
      case "toId":
        return "Updated connection";
      case "url":
        return entityType === "file" ? "Updated source" : "Updated link";
      case "x":
      case "y":
        return "Moved";
      default:
        return `Updated ${humanizeKey(key)}`;
    }
  }

  if (changedKeys.every((key) => key === "parentId" || key === "order")) {
    return "Moved";
  }

  if (changedKeys.every((key) => key === "x" || key === "y")) {
    return "Moved";
  }

  return `Updated ${joinLabels(changedKeys.map(humanizeKey))}`;
}

function formatDisplayValue(value: string): string {
  if (!value) {
    return "None";
  }
  if (value.length > 24) {
    return "updated value";
  }
  return value.replace(/[-_]/g, " ").trim().replace(/\s+/g, " ");
}

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function capitalizeLabel(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) {
    return labels[0] || "details";
  }
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function getEntryKey(
  action: HistoryEntry["action"],
  entityType: HistoryEntry["entityType"],
  entityId: string,
): string {
  return `${action}:${entityType}:${entityId}`;
}

function isEqualValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (typeof left !== typeof right) {
    return false;
  }

  if (left === null || right === null) {
    return false;
  }

  if (typeof left === "object" && typeof right === "object") {
    try {
      return JSON.stringify(left) === JSON.stringify(right);
    } catch {
      return false;
    }
  }

  return false;
}

export function isHistoryOnlyUpdate(
  prevState: AppStore,
  nextState: AppStore,
): boolean {
  const changedKeys = new Set([
    ...Object.keys(prevState),
    ...Object.keys(nextState),
  ]);

  const meaningfulKeys = Array.from(changedKeys).filter(
    (key) =>
      !isEqualValue(
        getDynamicValue(prevState, key),
        getDynamicValue(nextState, key),
      ),
  );

  return (
    meaningfulKeys.length > 0 &&
    meaningfulKeys.every((key) => key === "history")
  );
}

export function getLeadingManualHistoryEntries(
  prevHistory: HistoryEntry[],
  nextHistory: HistoryEntry[],
): HistoryEntry[] {
  const addedCount = nextHistory.length - prevHistory.length;
  if (addedCount <= 0) {
    return [];
  }

  const leadingEntries = nextHistory.slice(0, addedCount);
  return leadingEntries.filter((entry) => {
    const keys = Object.keys(entry).map((key) => key.toLowerCase());
    return keys.some((key) => MANUAL_HISTORY_KEYS.has(key));
  });
}
