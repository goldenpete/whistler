import { useEffect, useState } from "react";
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
    CheckCircle,
    Shuffle
} from "@phosphor-icons/react";
import { Separator } from "@/components/ui/separator";

declare global {
    interface Window {
        onTurnstileSuccess?: (token: string) => void;
        onTurnstileExpired?: () => void;
        turnstile?: {
            reset: (container?: string | HTMLElement) => void;
            render: (container: string | HTMLElement, options: any) => string;
        };
    }
}

const SYNC_API_URL = "https://whistler-sync.peteawesome.workers.dev";
const TURNSTILE_SITE_KEY = "0x4AAAAAACL9Ojn2jXAFNaw_";

interface SidebarSyncProps {
    onBack: () => void;
}

export function SidebarSync({ onBack }: SidebarSyncProps) {
    const { 
        user, 
        login, 
        logout, 
        lastSyncTime, 
        setLastSyncTime, 
        setState,
        autoSyncEnabled,
        setAutoSyncEnabled,
        syncStatus,
        setSyncStatus
    } = useStore();
    const [syncId, setSyncId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [accountId, setAccountId] = useState<string | null>(null);
    const [sessionToken, setSessionToken] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [phase, setPhase] = useState<'login' | 'totp'>('login');
    const [pendingToken, setPendingToken] = useState<string | null>(null);
    const [totpCode, setTotpCode] = useState("");
    const [turnstileWidgetId, setTurnstileWidgetId] = useState<string | null>(null);

    useEffect(() => {
        window.onTurnstileSuccess = (token: string) => {
            setCaptchaToken(token);
            setError(null);
        };
        window.onTurnstileExpired = () => {
            setCaptchaToken(null);
        };
    }, []);

    useEffect(() => {
        if (turnstileWidgetId) return;
        const interval = setInterval(() => {
            if (window.turnstile) {
                const container = document.getElementById("turnstile-container");
                if (container) {
                    const id = window.turnstile.render(container, {
                        sitekey: TURNSTILE_SITE_KEY,
                        theme: "dark",
                        callback: (token: string) => window.onTurnstileSuccess?.(token),
                        "expired-callback": () => window.onTurnstileExpired?.(),
                    });
                    setTurnstileWidgetId(id);
                    clearInterval(interval);
                }
            }
        }, 500);
        return () => clearInterval(interval);
    }, [turnstileWidgetId]);

    useEffect(() => {
        const storedAccount = localStorage.getItem("whistler_account_id");
        const storedToken = localStorage.getItem("whistler_session_token");
        const storedLastSync = localStorage.getItem("whistler_last_sync");
        const storedDisplayName = localStorage.getItem("whistler_display_name");
        if (storedAccount && storedToken) {
            setAccountId(storedAccount);
            setSessionToken(storedToken);
            login({ id: storedAccount, email: storedDisplayName || storedAccount });
            if (storedLastSync) {
                const asNumber = Number(storedLastSync);
                if (!Number.isNaN(asNumber)) {
                    setLastSyncTime(asNumber);
                }
            }
        }
    }, [login, setLastSyncTime]);

    const formatAccountId = (id: string) => {
        const clean = id.replace(/\D/g, "").slice(0, 16);
        const parts = [];
        for (let i = 0; i < clean.length; i += 4) {
            parts.push(clean.slice(i, i + 4));
        }
        return parts.join("-");
    };

    const getCleanAccountId = (value: string) => value.replace(/\D/g, "").slice(0, 16);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanId = getCleanAccountId(syncId);
        if (cleanId.length !== 16) {
            setError("Sync ID must be 16 digits");
            return;
        }
        if (!captchaToken) {
            setError("Complete the captcha to continue");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${SYNC_API_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    account_id: cleanId,
                    captcha_token: captchaToken,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || "Login failed");
                if (window.turnstile) {
                    window.turnstile.reset();
                }
                return;
            }
            setCaptchaToken(null);
            if (data.requires_totp) {
                setPendingToken(data.pending_token);
                setPhase("totp");
                setAccountId(cleanId);
                return;
            }
            const token: string = data.token;
            const displayName: string | undefined = data.display_name;
            setAccountId(cleanId);
            setSessionToken(token);
            localStorage.setItem("whistler_account_id", cleanId);
            localStorage.setItem("whistler_session_token", token);
            if (displayName) {
                localStorage.setItem("whistler_display_name", displayName);
            }
            login({ id: cleanId, email: displayName || cleanId });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateId = () => {
        const array = new Uint8Array(8);
        crypto.getRandomValues(array);
        let id = "";
        for (let i = 0; i < array.length; i++) {
            const digits = (array[i] % 100).toString().padStart(2, "0");
            id += digits;
        }
        setSyncId(formatAccountId(id));
    };

    const handleVerifyTotp = async () => {
        if (!pendingToken) {
            setError("No pending verification");
            return;
        }
        if (totpCode.replace(/\s/g, "").length !== 6) {
            setError("Enter a 6-digit code");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${SYNC_API_URL}/login/totp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pending_token: pendingToken,
                    totp_code: totpCode.replace(/\s/g, ""),
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || "Verification failed");
                return;
            }
            const token: string = data.token;
            const account = data.account_id as string;
            const displayName: string | undefined = data.display_name;
            setAccountId(account);
            setSessionToken(token);
            localStorage.setItem("whistler_account_id", account);
            localStorage.setItem("whistler_session_token", token);
            if (displayName) {
                localStorage.setItem("whistler_display_name", displayName);
            }
            login({ id: account, email: displayName || account });
            setPhase("login");
            setPendingToken(null);
            setTotpCode("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Verification error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async (type: 'push' | 'pull') => {
        if (!accountId || !sessionToken) {
            setError("Connect with your Sync ID first");
            return;
        }
        setSyncStatus("syncing");
        setError(null);
        try {
            if (type === "push") {
                const state = useStore.getState();
                const data = {
                    projects: state.projects,
                    files: state.files,
                    collections: state.collections,
                    timestamps: state.timestamps,
                    graphs: state.graphs,
                    graphNodes: state.graphNodes,
                    graphEdges: state.graphEdges,
                    docs: state.docs,
                    storages: state.storages,
                    lastModified: Date.now(),
                };
                const response = await fetch(`${SYNC_API_URL}/data`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${sessionToken}`,
                    },
                    body: JSON.stringify({
                        key: "whistler_data",
                        value: data,
                    }),
                });
                if (!response.ok) {
                    const body = await response.json().catch(() => null);
                    setError(body?.error || "Push failed");
                    setSyncStatus("error");
                    return;
                }
            } else {
                const response = await fetch(`${SYNC_API_URL}/data`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${sessionToken}`,
                    },
                });
                if (!response.ok) {
                    const body = await response.json().catch(() => null);
                    setError(body?.error || "Pull failed");
                    setSyncStatus("error");
                    return;
                }
                const result = await response.json();
                const dataRow = Array.isArray(result.data)
                    ? result.data.find((d: any) => d.key === "whistler_data")
                    : null;
                if (dataRow && dataRow.value) {
                    const cloudData = typeof dataRow.value === "string" ? JSON.parse(dataRow.value) : dataRow.value;
                    setState({
                        projects: cloudData.projects || [],
                        files: cloudData.files || [],
                        collections: cloudData.collections || [],
                        timestamps: cloudData.timestamps || [],
                        graphs: cloudData.graphs || [],
                        graphNodes: cloudData.graphNodes || [],
                        graphEdges: cloudData.graphEdges || [],
                        docs: cloudData.docs || [],
                        storages: cloudData.storages || [],
                        history: cloudData.history || [],
                    });
                }
            }
            const now = Date.now();
            setLastSyncTime(now);
            localStorage.setItem("whistler_last_sync", String(now));
            setSyncStatus("success");
            setTimeout(() => setSyncStatus("idle"), 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Sync error");
            setSyncStatus("error");
        }
    };

    const handleLogout = () => {
        setAccountId(null);
        setSessionToken(null);
        setCaptchaToken(null);
        setPendingToken(null);
        setTotpCode("");
        localStorage.removeItem("whistler_account_id");
        localStorage.removeItem("whistler_session_token");
        localStorage.removeItem("whistler_display_name");
        logout();
    };

    if (!user) {
        if (phase === "totp") {
            return (
                <div className="flex flex-col h-full bg-sidebar-background">
                    <div className="p-3 border-b border-sidebar-border flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6 -ml-1" onClick={onBack}>
                            <CaretLeft className="text-muted-foreground" />
                        </Button>
                        <div className="flex items-center gap-2 text-sm font-semibold text-sidebar-foreground">
                            <SignIn weight="bold" />
                            Sync 2FA
                        </div>
                    </div>
                    <div className="flex-1 p-4 flex flex-col justify-center items-center gap-4">
                        <div className="text-center space-y-2 mb-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                                <Cloud weight="fill" size={24} />
                            </div>
                            <h3 className="font-semibold text-foreground">Two-Factor Authentication</h3>
                            <p className="text-xs text-muted-foreground max-w-[220px]">
                                Enter the 6-digit code from your authenticator app to finish login.
                            </p>
                        </div>
                        <div className="w-full space-y-3">
                            <Input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={totpCode}
                                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                className="h-10 text-center tracking-[0.5em] text-lg font-mono"
                                placeholder="000000"
                            />
                            {error && (
                                <div className="text-xs text-red-400 text-center px-2">
                                    {error}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    className="flex-1 h-8"
                                    onClick={handleVerifyTotp}
                                    disabled={isLoading}
                                >
                                    Verify
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 h-8"
                                    onClick={() => {
                                        setPhase("login");
                                        setPendingToken(null);
                                        setTotpCode("");
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
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
                        <h3 className="font-semibold text-foreground">Sync Access</h3>
                        <p className="text-xs text-muted-foreground max-w-[200px]">
                            Enter your 16-digit Sync ID to access your data.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="w-full space-y-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sync ID</label>
                            <Input 
                                type="text" 
                                placeholder="16-digit ID" 
                                value={syncId}
                                onChange={(e) => setSyncId(formatAccountId(e.target.value))}
                                className="h-8 text-sm font-mono"
                                maxLength={19}
                                minLength={16}
                                required
                            />
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-8 mt-1 text-xs gap-2"
                                onClick={handleGenerateId}
                                title="Generate New Account ID"
                            >
                                <Shuffle weight="bold" className="size-4" />
                                <span>Generate New Account ID</span>
                            </Button>
                        </div>
                        <div className="flex justify-center">
                            <div
                                id="turnstile-container"
                                className="cf-turnstile min-h-[65px]"
                                data-sitekey={TURNSTILE_SITE_KEY}
                                data-theme="dark"
                                data-callback="onTurnstileSuccess"
                                data-expired-callback="onTurnstileExpired"
                            />
                        </div>
                        {error && (
                            <div className="text-xs text-red-400 text-center px-2">
                                {error}
                            </div>
                        )}
                        <Button
                            type="submit"
                            className="w-full h-8"
                            disabled={isLoading || getCleanAccountId(syncId).length < 16}
                        >
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
                                <div className="text-sm font-medium truncate">
                                    {user.email && user.email !== accountId ? user.email : "Anonymous"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {accountId ? formatAccountId(accountId) : formatAccountId(user.id)}
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleLogout} title="Sign Out">
                                <SignOut className="text-muted-foreground" />
                            </Button>
                        </div>
                    </div>

                    <Separator className="bg-sidebar-border" />

                    {/* Sync Settings */}
                    <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Configuration</div>
                        <div className="space-y-2">
                            <button
                                type="button"
                                className="flex w-full items-center justify-between p-2 rounded-md hover:bg-sidebar-accent transition-colors cursor-pointer"
                                onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                            >
                                <span className="text-sm text-muted-foreground">Auto-sync</span>
                                <span
                                    className={`w-8 h-4 rounded-full relative transition-colors ${
                                        autoSyncEnabled ? "bg-primary" : "bg-zinc-700"
                                    }`}
                                >
                                    <span
                                        className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                                            autoSyncEnabled ? "right-0.5" : "left-0.5"
                                        }`}
                                    />
                                </span>
                            </button>
                            <p className="text-[11px] text-muted-foreground px-2">
                                Auto-sync is enabled by default and saves changes automatically. Turn this off to require manual Push and Pull.
                            </p>
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
