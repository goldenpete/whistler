/**
 * ============================================================================
 * SYNC STATUS FOOTER
 * ============================================================================
 *
 * Displays the current sync status (idle, syncing, error, success) in the
 * sidebar footer. Shows the time since last sync and a clickable indicator
 * that opens the sync settings view.
 *
 * Used in: ProjectSidebar footer area (non-slim mode)
 * ============================================================================
 */

import { useState, useEffect } from "react";
import {
    ArrowsClockwise,
    WarningCircle,
    CheckCircle,
    CloudCheck,
    Cloud,
} from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";

export function SyncStatusFooter() {
    const { syncStatus, lastSyncTime, setSidebarView } = useStore(useShallow((state) => ({
        syncStatus: state.syncStatus,
        lastSyncTime: state.lastSyncTime,
        setSidebarView: state.setSidebarView,
    })));
    const [timeString, setTimeString] = useState("");

    // Update the relative time string every minute
    useEffect(() => {
        const updateTime = () => {
            if (lastSyncTime) {
                setTimeString(formatDistanceToNow(lastSyncTime, { addSuffix: true }));
            } else {
                setTimeString("Not synced");
            }
        };

        updateTime();
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, [lastSyncTime]);

    /** Color class based on current sync status */
    const getStatusColor = () => {
        switch (syncStatus) {
            case 'syncing': return 'text-blue-400';
            case 'error': return 'text-red-400';
            case 'success': return 'text-green-400';
            default: return lastSyncTime ? 'text-green-400' : 'text-zinc-500';
        }
    };

    /** Icon based on current sync status */
    const getStatusIcon = () => {
        switch (syncStatus) {
            case 'syncing': return <ArrowsClockwise className="animate-spin" weight="bold" />;
            case 'error': return <WarningCircle weight="fill" />;
            case 'success': return <CheckCircle weight="fill" />;
            default: return lastSyncTime ? <CloudCheck weight="fill" /> : <Cloud weight="regular" />;
        }
    };

    return (
        <button
            onClick={() => setSidebarView('sync')}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all group"
            title="Click to manage sync settings"
        >
            {/* Status icon */}
            <div className={cn("text-base shrink-0 transition-colors flex items-center justify-center", getStatusColor())}>
                {getStatusIcon()}
            </div>

            {/* Status text */}
            <div className="flex flex-col items-start min-w-0 flex-1 leading-none gap-1">
                <span className={cn("font-medium truncate w-full text-left transition-colors text-[10px] uppercase tracking-wider opacity-80",
                    syncStatus === 'error' ? "text-red-400" :
                    syncStatus === 'syncing' ? "text-blue-400" : "group-hover:text-primary"
                )}>
                    {syncStatus === 'syncing' ? "Syncing..." :
                     syncStatus === 'error' ? "Sync Error" :
                     "Last Sync"}
                </span>
                <span className="text-[11px] truncate w-full text-left font-medium">
                    {syncStatus === 'syncing' ? "Updating..." :
                     syncStatus === 'error' ? "Check connection" :
                     lastSyncTime ? timeString :
                     "Not connected"}
                </span>
            </div>
        </button>
    );
}
