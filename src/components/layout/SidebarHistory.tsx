import { ScrollArea } from "@/components/ui/scroll-area";
import { useStore } from "@/store/useStore";
import { format } from "date-fns";
import { ClockCounterClockwise, File, Folder, FilmStrip, NotePencil, Briefcase, ShareNetwork, Circle, LineSegment, Article } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

import { CaretLeft } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface SidebarHistoryProps {
    onBack: () => void;
}

// History sidebar component
export function SidebarHistory({ onBack }: SidebarHistoryProps) {
    const { history, clearHistory } = useStore();

    // Group history by date
    const groupedHistory = history.reduce((groups, entry) => {
        const date = format(entry.timestamp, 'yyyy-MM-dd');
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(entry);
        return groups;
    }, {} as Record<string, typeof history>);

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
        <div className="flex flex-col h-full min-h-0 bg-sidebar-background">
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

            <ScrollArea className="flex-1 p-2 overflow-y-auto">
                {history.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 text-xs italic">
                        No history records found.
                    </div>
                ) : (
                    Object.entries(groupedHistory).sort((a, b) => b[0].localeCompare(a[0])).map(([date, entries]) => (
                        <div key={date} className="mb-4 last:mb-0">
                            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 sticky top-0 bg-sidebar-background/95 backdrop-blur py-1 z-10">
                                {format(new Date(date), 'MMMM d, yyyy')}
                            </h3>
                            <div className="space-y-1">
                                {entries.map(entry => {
                                    const Icon = getIcon(entry.entityType);
                                    return (
                                        <div key={entry.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group">
                                            <div className={cn("p-1 rounded shrink-0", getActionColor(entry.action))}>
                                                <Icon size={12} weight="bold" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={cn("text-[10px] font-medium uppercase tracking-tight", getActionColor(entry.action).split(' ')[0])}>
                                                        {entry.action}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-mono">
                                                        {format(entry.timestamp, 'HH:mm')}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-sidebar-foreground truncate font-medium">
                                                    {entry.entityName || (entry.entityType ? entry.entityType.charAt(0).toUpperCase() + entry.entityType.slice(1) : "Unknown Entity")}
                                                </p>
                                                {entry.details && (
                                                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{entry.details}</p>
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
