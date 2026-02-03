import { ScrollArea } from "@/components/ui/scroll-area";
import { useShallow } from "@/lib/zustand-shallow";
import { useStore, type AppStore } from "@/store/useStore";
import { format } from "date-fns";
import { ClockCounterClockwise, File, Folder, FilmStrip, NotePencil, Briefcase, ShareNetwork, Circle, LineSegment, Article } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { HistoryEntry } from "@/types";

import { CaretLeft } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface SidebarHistoryProps {
    onBack: () => void;
    variant?: 'sidebar' | 'settings';
}

// History sidebar component
export function SidebarHistory({ onBack, variant = 'sidebar' }: SidebarHistoryProps) {
    const { history, clearHistory } = useStore(useShallow((state: AppStore) => ({
        history: state.history,
        clearHistory: state.clearHistory
    })));

    // Group history by date
    const groupedHistory = history.reduce((groups: Record<string, HistoryEntry[]>, entry: HistoryEntry) => {
        const date = format(entry.timestamp, 'yyyy-MM-dd');
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(entry);
        return groups;
    }, {} as Record<string, HistoryEntry[]>);

    const getIcon = (type: string) => {
        switch (type) {
            case 'file': return File;
            case 'collection': return Folder;
            case 'timestamp': return FilmStrip; // Legacy support
            case 'highlight': return NotePencil;
            case 'project': return Briefcase;
            case 'note': return NotePencil;
            case 'graph': return ShareNetwork;
            case 'node': return Circle;
            case 'edge': return LineSegment;
            case 'doc': return Article;
            default: return File;
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'create': return 'text-green-400 bg-green-400/10';
            case 'update': return 'text-blue-400 bg-blue-400/10';
            case 'delete': return 'text-red-400 bg-red-400/10';
            case 'restore': return 'text-primary bg-primary/10';
            default: return 'text-zinc-400 bg-zinc-400/10';
        }
    };

    return (
        <div className={cn(
            "flex flex-col h-full min-h-0", 
            variant === 'sidebar' ? "bg-sidebar-background" : "bg-transparent"
        )}>
            {variant === 'sidebar' ? (
                <div className="p-3 border-b border-sidebar-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6 -ml-1" onClick={onBack} data-sound-back>
                            <CaretLeft className="text-muted-foreground" />
                        </Button>
                        <div className="flex items-center gap-2 text-sm font-semibold text-sidebar-foreground">
                            <ClockCounterClockwise weight="bold" />
                            History
                        </div>
                    </div>
                    {history.length > 0 && (
                        <button
                            onClick={clearHistory}
                            className="text-[10px] text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider font-bold"
                        >
                            Clear
                        </button>
                    )}
                </div>
            ) : (
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <ClockCounterClockwise className="text-primary" size={24} />
                            History Log
                        </h2>
                    </div>
                    {history.length > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={clearHistory}
                            className="h-8 text-xs"
                        >
                            Clear History
                        </Button>
                    )}
                </div>
            )}

            <ScrollArea className="flex-1 p-2 overflow-y-auto">
                {history.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mb-4">
                            <ClockCounterClockwise size={24} className="opacity-50" />
                        </div>
                        <p className="text-sm font-medium">No history records found</p>
                        <p className="text-xs text-muted-foreground mt-1">Your recent actions will appear here</p>
                    </div>
                ) : (
                    (Object.entries(groupedHistory) as [string, HistoryEntry[]][])
                        .sort((a, b) => b[0].localeCompare(a[0]))
                        .map(([date, entries]) => (
                        <div key={date} className="mb-6 last:mb-0">
                            <h3 className={cn(
                                "text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 sticky top-0 backdrop-blur py-2 z-10 px-2",
                                variant === 'sidebar' ? "bg-sidebar-background/95" : "bg-background/95"
                            )}>
                                {format(new Date(date), 'MMMM d, yyyy')}
                            </h3>
                            <div className="space-y-1">
                                {entries.map((entry: HistoryEntry) => {
                                    const Icon = getIcon(entry.entityType);
                                    return (
                                        <div key={entry.id} className={cn(
                                            "flex items-start gap-3 p-3 rounded-lg transition-colors group border border-transparent",
                                            variant === 'sidebar' 
                                                ? "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground p-2 gap-2 rounded-md" 
                                                : "hover:bg-accent/50 hover:border-border/50"
                                        )}>
                                            <div className={cn("p-1.5 rounded-md shrink-0", getActionColor(entry.action), variant === 'sidebar' && "p-1 rounded")}>
                                                <Icon size={variant === 'sidebar' ? 12 : 16} weight="bold" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                    <span className={cn(
                                                        "font-medium uppercase tracking-tight", 
                                                        getActionColor(entry.action).split(' ')[0],
                                                        variant === 'sidebar' ? "text-[10px]" : "text-xs"
                                                    )}>
                                                        {entry.action}
                                                    </span>
                                                    <span className={cn(
                                                        "text-muted-foreground font-mono",
                                                        variant === 'sidebar' ? "text-[10px]" : "text-xs"
                                                    )}>
                                                        {format(entry.timestamp, 'HH:mm')}
                                                    </span>
                                                </div>
                                                <p className={cn(
                                                    "text-sidebar-foreground truncate font-medium",
                                                    variant === 'sidebar' ? "text-xs" : "text-sm text-foreground"
                                                )}>
                                                    {entry.entityName || (entry.entityType ? entry.entityType.charAt(0).toUpperCase() + entry.entityType.slice(1) : "Unknown Entity")}
                                                </p>
                                                {entry.details && (
                                                    <p className={cn(
                                                        "text-muted-foreground mt-0.5 truncate",
                                                        variant === 'sidebar' ? "text-[10px]" : "text-xs"
                                                    )}>{entry.details}</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </ScrollArea>
        </div>
    );
}
