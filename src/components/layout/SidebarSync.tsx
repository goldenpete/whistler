import { useState } from "react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    CaretLeft,
    CloudArrowUp,
    CloudArrowDown,
    Gear,
    Cloud,
    SignIn,
    SignOut,
    User,
    CheckCircle
} from "@phosphor-icons/react";
import { Separator } from "@/components/ui/separator";

interface SidebarSyncProps {
    onBack: () => void;
}

export function SidebarSync({ onBack }: SidebarSyncProps) {
    const { user, login, logout, lastSyncTime, setLastSyncTime } = useStore();
    const [syncId, setSyncId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (syncId.length < 16) return;
        
        setIsLoading(true);
        // Simulate login
        setTimeout(() => {
            login({ email: syncId, id: "user_" + syncId.slice(0, 8) }); // Use syncId as "email" for display
            setIsLoading(false);
        }, 1000);
    };

    const handleGenerateId = () => {
        // Generate 16 digit hex
        const array = new Uint8Array(8);
        crypto.getRandomValues(array);
        const id = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        setSyncId(id);
    };

    const handleSync = (type: 'push' | 'pull') => {
        setSyncStatus('syncing');
        // Simulate sync
        setTimeout(() => {
            setSyncStatus('success');
            setLastSyncTime(Date.now());
            setTimeout(() => setSyncStatus('idle'), 2000);
        }, 1500);
    };

    if (!user) {
        return (
            <div className="flex flex-col h-full bg-sidebar-background">
                <div className="p-3 border-b border-sidebar-border flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6 -ml-1" onClick={onBack}>
                        <CaretLeft className="text-muted-foreground" />
                    </Button>
                    <div className="flex items-center gap-2 text-sm font-semibold text-sidebar-foreground">
                        <SignIn weight="bold" />
                        Sync Access
                    </div>
                </div>

                <div className="flex-1 p-4 flex flex-col justify-center items-center gap-4">
                    <div className="text-center space-y-2 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                            <Cloud weight="fill" size={24} />
                        </div>
                        <h3 className="font-semibold text-foreground">Legacy Sync</h3>
                        <p className="text-xs text-muted-foreground max-w-[200px]">
                            Enter your 16-digit Sync ID to access your data.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="w-full space-y-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sync ID</label>
                            <div className="flex gap-2">
                                <Input 
                                    type="text" 
                                    placeholder="16-digit ID" 
                                    value={syncId}
                                    onChange={(e) => setSyncId(e.target.value)}
                                    className="h-8 text-sm font-mono"
                                    maxLength={16}
                                    minLength={16}
                                    required
                                />
                                <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleGenerateId} title="Generate New ID">
                                    <Gear weight="bold" className="size-4" />
                                </Button>
                            </div>
                        </div>
                        <Button type="submit" className="w-full h-8" disabled={isLoading || syncId.length < 16}>
                            {isLoading ? "Connecting..." : "Connect"}
                        </Button>
                    </form>
                    
                    <div className="text-center mt-4">
                        <p className="text-[10px] text-muted-foreground">
                            Use the same ID on all devices to sync.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-sidebar-background">
            <div className="p-3 border-b border-sidebar-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6 -ml-1" onClick={onBack}>
                        <CaretLeft className="text-muted-foreground" />
                    </Button>
                    <div className="flex items-center gap-2 text-sm font-semibold text-sidebar-foreground">
                        <Cloud weight="fill" className="text-primary" />
                        Sync
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" title="Settings">
                    <Gear weight="bold" className="text-muted-foreground" />
                </Button>
            </div>

            <ScrollArea className="flex-1 p-3">
                <div className="space-y-6">
                    {/* Status Card */}
                    <div className="bg-sidebar-accent/50 rounded-lg p-3 border border-sidebar-border">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="size-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                                <CheckCircle weight="fill" size={16} />
                            </div>
                            <div>
                                <div className="text-sm font-medium">Sync Active</div>
                                <div className="text-xs text-muted-foreground">
                                    Last synced: {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Never'}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-2 mt-3">
                            <Button 
                                variant="outline" 
                                className="flex-1 h-8 text-xs gap-1.5 border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                onClick={() => handleSync('push')}
                                disabled={syncStatus === 'syncing'}
                            >
                                <CloudArrowUp size={14} />
                                Push
                            </Button>
                            <Button 
                                variant="outline" 
                                className="flex-1 h-8 text-xs gap-1.5 border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                onClick={() => handleSync('pull')}
                                disabled={syncStatus === 'syncing'}
                            >
                                <CloudArrowDown size={14} />
                                Pull
                            </Button>
                        </div>
                    </div>

                    {/* Account Info */}
                    <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Account</div>
                        <div className="flex items-center gap-3 p-2 rounded-md hover:bg-sidebar-accent transition-colors">
                            <div className="size-8 rounded-full bg-secondary flex items-center justify-center">
                                <User weight="bold" className="text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{user.email}</div>
                                <div className="text-xs text-muted-foreground">Free Plan</div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={logout} title="Sign Out">
                                <SignOut className="text-muted-foreground" />
                            </Button>
                        </div>
                    </div>

                    <Separator className="bg-sidebar-border" />

                    {/* Sync Settings Placeholder */}
                    <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Configuration</div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-between p-2 rounded-md hover:bg-sidebar-accent transition-colors cursor-pointer">
                                <span className="text-sm text-muted-foreground">Auto-sync</span>
                                <div className="w-8 h-4 bg-primary rounded-full relative">
                                    <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-md hover:bg-sidebar-accent transition-colors cursor-pointer">
                                <span className="text-sm text-muted-foreground">Sync media files</span>
                                <div className="w-8 h-4 bg-zinc-700 rounded-full relative">
                                    <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-zinc-400 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
