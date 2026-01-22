/**
 * @deprecated This component has been replaced by SidebarHistory.tsx and is no longer used.
 */
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStore } from "@/store/useStore";
import { format } from "date-fns";
import { ClockCounterClockwise, File, Folder, FilmStrip, NotePencil, Briefcase, Trash } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface HistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function HistoryDialog({ open, onOpenChange }: HistoryDialogProps) {
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
            case 'timestamp': return FilmStrip; // Or Tag
            case 'project': return Briefcase;
            case 'note': return NotePencil;
            default: return File;
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'create': return 'text-green-400 bg-green-400/10';
            case 'update': return 'text-blue-400 bg-blue-400/10';
            case 'delete': return 'text-red-400 bg-red-400/10';
            case 'restore': return 'text-amber-400 bg-amber-400/10';
            default: return 'text-zinc-400 bg-zinc-400/10';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 gap-0 bg-zinc-900 border-zinc-800">
                <DialogHeader className="p-4 border-b border-white/10 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="flex items-center gap-2 text-lg font-medium">
                        <ClockCounterClockwise weight="bold" />
                        History
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        View your recent activity history.
                    </DialogDescription>
                    {history.length > 0 && (
                        <button
                            onClick={clearHistory}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                            Clear History
                        </button>
                    )}
                </DialogHeader>

                <ScrollArea className="flex-1 p-4">
                    {history.length === 0 ? (
                        <div className="text-center text-zinc-500 py-8 text-sm italic">
                            No history records found.
                        </div>
                    ) : (
                        Object.entries(groupedHistory).sort((a, b) => b[0].localeCompare(a[0])).map(([date, entries]) => (
                            <div key={date} className="mb-6 last:mb-0">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 sticky top-0 bg-zinc-900/95 backdrop-blur py-1 z-10">
                                    {format(new Date(date), 'MMMM d, yyyy')}
                                </h3>
                                <div className="space-y-2">
                                    {entries.map(entry => {
                                        const Icon = getIcon(entry.entityType);
                                        return (
                                            <div key={entry.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-white/5 transition-colors group">
                                                <div className={cn("p-1.5 rounded shrink-0", getActionColor(entry.action))}>
                                                    <Icon size={14} weight="bold" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className={cn("text-xs font-medium uppercase tracking-tight", getActionColor(entry.action).split(' ')[0])}>
                                                            {entry.action}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-500 font-mono">
                                                            {format(entry.timestamp, 'HH:mm')}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-zinc-300 truncate">
                                                        {entry.entityName || "Unknown Entity"}
                                                    </p>
                                                    {entry.details && (
                                                        <p className="text-xs text-zinc-500 mt-0.5">{entry.details}</p>
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
            </DialogContent>
        </Dialog>
    );
}
