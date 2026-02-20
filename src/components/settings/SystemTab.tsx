/**
 * ─── SystemTab.tsx ─────────────────────────────────────────────────
 *
 * Settings tab for updates & maintenance, per-category data
 * management, and the danger-zone reset.
 *
 * Extracted from SettingsView.tsx for maintainability.
 *
 * Exports: SystemTab
 * Related: SettingsView, useStore
 * ───────────────────────────────────────────────────────────────────
 */
import { useState } from "react";
import { useStore, ambientMusicStorage } from "@/store/useStore";
import {
    ArrowCounterClockwise,
    Trash,
    File,
    Folder,
    FileText,
    Graph,
    HardDrives,
    PencilSimple,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DestructiveDeleteDialog } from "@/components/ui/destructive-delete-dialog";
import { useShallow } from "@/lib/zustand-shallow";

/* ═══════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════ */
export function SystemTab() {
    const { setState } = useStore(useShallow((state) => ({
        setState: state.setState,
    })));

    const [deleteLocalOpen, setDeleteLocalOpen] = useState(false);
    const [resetAllOpen, setResetAllOpen] = useState(false);
    const [localItemToDelete, setLocalItemToDelete] = useState<{id: string, label: string} | null>(null);
    const [isDeletingLocal, setIsDeletingLocal] = useState(false);
    const [isDeletingReset, setIsDeletingReset] = useState(false);

    const handleDeleteLocal = async () => {
        if (!localItemToDelete) return;
        setIsDeletingLocal(true);
        
        await new Promise(resolve => setTimeout(resolve, 500));

        switch (localItemToDelete.id) {
            case 'files':
                setState({ files: [], activeFileId: null });
                break;
            case 'collections':
                setState({ collections: [], activeCollectionId: null });
                break;
            case 'highlights':
                setState({ highlights: [], activeHighlightId: null });
                break;
            case 'docs':
                setState({ docs: [], activeDocId: null });
                break;
            case 'graphs':
                setState({ graphs: [], graphNodes: [], graphEdges: [], activeGraphId: null });
                break;
            case 'storages':
                setState({ storages: [], activeStorageId: null });
                break;
        }

        setIsDeletingLocal(false);
        setDeleteLocalOpen(false);
        setLocalItemToDelete(null);
    };

    const handleReload = async () => {
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
            }
            sessionStorage.clear();
        } catch (e) {
            console.error("Error clearing updates:", e);
        } finally {
            window.location.reload();
        }
    };

    const handleConfirmReset = async () => {
        setIsDeletingReset(true);
        try {
            await ambientMusicStorage.clear();
            localStorage.removeItem('whistler_v2_data');
            await new Promise(resolve => setTimeout(resolve, 500));
            window.location.reload();
        } catch (error) {
            console.error("Failed to reset:", error);
            setIsDeletingReset(false);
        }
    };

    return (
        <>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <ArrowCounterClockwise className="text-primary" size={24} />
                        Updates & Maintenance
                    </h2>
                    <div className="p-5 rounded-lg border border-border bg-card/50 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium">Reload Application</label>
                                <p className="text-xs text-muted-foreground">Reload the app and refresh cached assets.</p>
                            </div>
                            <Button variant="outline" onClick={handleReload}>
                                Reload for updates
                            </Button>
                        </div>
                    </div>
                </div>

                <Separator />

                <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <HardDrives className="text-primary" size={24} />
                        Data Management
                    </h2>
                    <div className="p-5 rounded-lg border border-border bg-card/50 space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Local Data</label>
                            <p className="text-xs text-muted-foreground">Manage and clear local data by category.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                                { id: 'files', label: 'Files', icon: File },
                                { id: 'collections', label: 'Collections', icon: Folder },
                                { id: 'highlights', label: 'Highlights', icon: PencilSimple },
                                { id: 'docs', label: 'Documents', icon: FileText },
                                { id: 'graphs', label: 'Graphs', icon: Graph },
                                { id: 'storages', label: 'Storage', icon: HardDrives },
                            ].map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3 rounded-md border border-border bg-background/50">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <item.icon size={16} weight="fill" />
                                        </div>
                                        <span className="text-sm font-medium">{item.label}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => {
                                            setLocalItemToDelete({ id: item.id, label: item.label });
                                            setDeleteLocalOpen(true);
                                        }}
                                    >
                                        <Trash size={16} />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <Separator />

                <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-500">
                        <Trash size={24} weight="fill" />
                        Danger Zone
                    </h2>
                    <div className="p-5 rounded-lg border border-red-900/20 bg-red-900/5 space-y-4">
                        <div className="space-y-0.5">
                            <label className="text-sm font-medium text-red-500">Clear All Data</label>
                            <p className="text-xs text-muted-foreground">Permanently removes all local data on this device. This action cannot be undone.</p>
                        </div>
                        <Button variant="destructive" onClick={() => setResetAllOpen(true)}>
                            Reset all data
                        </Button>
                    </div>
                </div>
            </div>

            <DestructiveDeleteDialog 
                open={deleteLocalOpen}
                onOpenChange={setDeleteLocalOpen}
                onConfirm={handleDeleteLocal}
                title={`Clear Local ${localItemToDelete?.label || ""}?`}
                description={`This will permanently delete all local ${localItemToDelete?.label.toLowerCase() || ""} data from this device. Sync data will not be affected.`}
                isDeleting={isDeletingLocal}
            />

            <DestructiveDeleteDialog 
                open={resetAllOpen}
                onOpenChange={setResetAllOpen}
                onConfirm={handleConfirmReset}
                title="Reset All Data?"
                description="This will permanently remove ALL local data, settings, and files from this device. This action cannot be undone."
                isDeleting={isDeletingReset}
            />
        </>
    );
}
