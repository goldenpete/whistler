import type { ActivityClearRange } from "@/types";

export interface ActivityClearRangeOption {
  value: ActivityClearRange;
  label: string;
  description: string;
}

export const ACTIVITY_CLEAR_RANGE_OPTIONS: ActivityClearRangeOption[] = [
  {
    value: "all-time",
    label: "All time",
    description: "Delete everything currently shown.",
  },
  {
    value: "last-hour",
    label: "Last hour",
    description: "Only delete items from the past hour.",
  },
  {
    value: "last-5-hours",
    label: "Last 5 hours",
    description: "Only delete items from the past five hours.",
  },
  {
    value: "last-day",
    label: "Last day",
    description: "Only delete items from the past 24 hours.",
  },
  {
    value: "last-week",
    label: "Last week",
    description: "Only delete items from the past 7 days.",
  },
  {
    value: "last-month",
    label: "Last month",
    description: "Only delete items from the past 30 days.",
  },
];

const RANGE_DURATIONS: Record<Exclude<ActivityClearRange, "all-time">, number> = {
  "last-hour": 60 * 60 * 1000,
  "last-5-hours": 5 * 60 * 60 * 1000,
  "last-day": 24 * 60 * 60 * 1000,
  "last-week": 7 * 24 * 60 * 60 * 1000,
  "last-month": 30 * 24 * 60 * 60 * 1000,
};

export function getActivityClearRangeLabel(range: ActivityClearRange): string {
  return ACTIVITY_CLEAR_RANGE_OPTIONS.find((option) => option.value === range)?.label ?? "All time";
}

export function getActivityRangeCutoff(
  range: ActivityClearRange,
  now = Date.now()
): number | null {
  if (range === "all-time") {
    return null;
  }

  return now - RANGE_DURATIONS[range];
}

export function isTimestampInActivityRange(
  timestamp: number | null | undefined,
  range: ActivityClearRange,
  now = Date.now()
): boolean {
  if (range === "all-time") {
    return true;
  }

  if (typeof timestamp !== "number") {
    return false;
  }

  const cutoff = getActivityRangeCutoff(range, now);
  return cutoff === null ? true : timestamp >= cutoff;
}
