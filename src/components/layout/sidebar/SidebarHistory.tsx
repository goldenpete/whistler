import { ScrollArea } from "@/components/ui/scroll-area";
import { useShallow } from "@/lib/zustand-shallow";
import { useStore, type AppStore } from "@/store/useStore";
import { format } from "date-fns";
import { ClockCounterClockwise, File, Folder, FilmStrip, NotePencil, Briefcase, ShareNetwork, Circle, LineSegment, Article, Trash, CaretLeft } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { HistoryEntry } from "@/types";
import { Button } from "@/components/ui/button";

interface SidebarHistoryProps {
    onBack: () => void;
    variant?: 'sidebar' | 'settings' | 'settings-page';
}

// History sidebar component
export function SidebarHistory({ onBack, variant = 'sidebar' }: SidebarHistoryProps) {
    const { history, clearHistory } = useStore(useShallow((state: AppStore) => ({
        history: state.history,
        clearHistory: state.clearHistory
    })));

    const isSettingsPage = variant === 'settings-page';

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

    const Header = () => {
        if (variant === 'sidebar') {
            return (
                <div className="px-3 py-2 border-b border-border/40 bg-card/20 flex items-center justify-between shrink-0">
                    <button
                        onClick={onBack}
                        className="h-5 w-5 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
                        data-sound-back
                    >
                        <CaretLeft weight="bold" size={12} />
                    </button>
                    <div className="flex-1 flex items-center justify-center gap-2 text-xs font-medium text-sidebar-foreground">
                        <ClockCounterClockwise weight="bold" size={12} />
                        History
                    </div>
                    {history.length > 0 && (
                        <button
                            onClick={clearHistory}
                            className="h-5 w-5 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-red-400 hover:bg-secondary/60 hover:text-red-300 transition-all duration-200"
                        >
                            <Trash weight="fill" size={12} />
                        </button>
                    )}
                </div>
            );
        }
        if (variant === 'settings') {
            return (
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
            );
        }
        return (
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <ClockCounterClockwise className="text-primary" size={24} />
                    History Log
                </h2>
                {history.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={clearHistory}>
                        Clear History
                    </Button>
                )}
            </div>
        );
    };

    const Wrapper = isSettingsPage ? 'div' : ScrollArea;
    const wrapperClass = isSettingsPage ? '' : 'flex-1 p-2 overflow-y-auto';
    const containerClass = cn(
        isSettingsPage ? "space-y-6" : "flex flex-col h-full min-h-0",
        variant === 'sidebar' ? "bg-sidebar-background" : "bg-transparent"
    );

    return (
        <div className={containerClass}>
            <Header />

            <Wrapper className={wrapperClass}>
                {history.length === 0 ? (
                    <div className={cn("text-center text-muted-foreground", isSettingsPage ? "p-8 border border-dashed border-border rounded-lg bg-card/30" : "py-12")}>
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
                        <div key={date} className={isSettingsPage ? "p-5 rounded-lg border border-border bg-card/50" : "mb-6 last:mb-0"}>
                            {isSettingsPage ? (
                                <h3 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
                                    <ClockCounterClockwise className="text-muted-foreground" size={16} />
                                    {format(new Date(date), 'MMMM d, yyyy')}
                                </h3>
                            ) : (
                                <h3 className={cn(
                                    "text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 sticky top-0 backdrop-blur py-2 z-10 px-2",
                                    variant === 'sidebar' ? "bg-sidebar-background/95" : "bg-background/95"
                                )}>
                                    {format(new Date(date), 'MMMM d, yyyy')}
                                </h3>
                            )}
                            
                            <div className={isSettingsPage ? "space-y-2" : "space-y-1"}>
                                {entries.map((entry: HistoryEntry) => {
                                    const Icon = getIcon(entry.entityType);
                                    
                                    if (isSettingsPage) {
                                        return (
                                            <div key={entry.id} className="flex items-center justify-between p-3 rounded-md border border-border bg-background/50">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", getActionColor(entry.action))}>
                                                        <Icon size={16} weight="fill" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-medium truncate">{entry.entityName || "Unknown Entity"}</p>
                                                            <span className={cn(
                                                                "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted",
                                                                getActionColor(entry.action).replace('bg-', 'text-').split(' ')[0]
                                                            )}>
                                                                {entry.action}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                                            <span className="font-mono">{format(entry.timestamp, 'HH:mm')}</span>
                                                            {entry.details && <>• {entry.details}</>}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

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
            </Wrapper>
        </div>
    );
}
