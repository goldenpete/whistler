import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    Shuffle,
    ShieldCheck,
    Copy,
    Warning,
    QrCode,
    PencilSimple,
    Check,
    X
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
        updateUser,
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
    
    // 2FA Management State
    const [totpEnabled, setTotpEnabled] = useState(false);
    const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
    const [setupMode, setSetupMode] = useState<'enable' | 'disable'>('enable');
    const [setupSecret, setSetupSecret] = useState<string | null>(null);
    const [setupStep, setSetupStep] = useState<'intro' | 'scan' | 'verify'>('intro');

    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState("");

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
        const storedTotpEnabled = localStorage.getItem("whistler_totp_enabled");
        
        if (storedAccount && storedToken) {
            setAccountId(storedAccount);
            setSessionToken(storedToken);
            login({ id: storedAccount, email: storedDisplayName || storedAccount });
            
            if (storedTotpEnabled === "true") {
                setTotpEnabled(true);
            }
            
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
            // If we logged in without 2FA challenge, it means 2FA is disabled
            setTotpEnabled(false);
            localStorage.removeItem("whistler_totp_enabled");
            
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
            // If we successfully verified TOTP, it means 2FA is enabled
            setTotpEnabled(true);
            localStorage.setItem("whistler_totp_enabled", "true");

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
                    highlights: state.highlights,
                    graphs: state.graphs,
                    graphNodes: state.graphNodes,
                    graphEdges: state.graphEdges,
                    docs: state.docs,
                    storages: state.storages,
                    // Theme Settings
                    accentTheme: state.accentTheme,
                    baseTheme: state.baseTheme,
                    enableDefaultColorControls: state.enableDefaultColorControls,
                    defaultColors: state.defaultColors,
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
                        highlights: cloudData.highlights || [],
                        graphs: cloudData.graphs || [],
                        graphNodes: cloudData.graphNodes || [],
                        graphEdges: cloudData.graphEdges || [],
                        docs: cloudData.docs || [],
                        storages: cloudData.storages || [],
                        history: cloudData.history || [],
                        // Theme Settings
                        accentTheme: cloudData.accentTheme || 'orange',
                        baseTheme: cloudData.baseTheme || 'zinc',
                        enableDefaultColorControls: cloudData.enableDefaultColorControls || false,
                        defaultColors: cloudData.defaultColors || {
                            file: '#f59e0b',
                            collection: '#f59e0b',
                            storage: '#f59e0b',
                            graph: '#f59e0b',
                            node: '#f59e0b',
                        },
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
        localStorage.removeItem("whistler_totp_enabled");
        logout();
    };

    const handleStartEditName = () => {
        setEditName(user?.email && user.email !== accountId ? user.email : "");
        setIsEditingName(true);
    };

    const handleSaveName = () => {
        if (!user) return;
        const newName = editName.trim();
        // If empty, revert to ID (effectively) by storing empty string, 
        // but let's keep it clean.
        updateUser({ email: newName || user.id });
        
        if (newName) {
            localStorage.setItem("whistler_display_name", newName);
        } else {
            localStorage.removeItem("whistler_display_name");
        }
        setIsEditingName(false);
    };

    const handleStart2FASetup = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${SYNC_API_URL}/2fa/setup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${sessionToken}`,
                },
            });
            const data = await response.json();
            if (!response.ok) {
                if (data.error === "2FA is already enabled") {
                    setTotpEnabled(true);
                    localStorage.setItem("whistler_totp_enabled", "true");
                }
                setError(data.error || "Setup failed");
                return;
            }
            setSetupSecret(data.secret);
            setSetupStep('scan');
        } catch (err) {
            setError(err instanceof Error ? err.message : "Setup error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnable2FA = async () => {
        if (totpCode.length !== 6) {
            setError("Enter a 6-digit code");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${SYNC_API_URL}/2fa/enable`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${sessionToken}`,
                },
                body: JSON.stringify({ totp_code: totpCode }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || "Failed to enable 2FA");
                return;
            }
            setTotpEnabled(true);
            localStorage.setItem("whistler_totp_enabled", "true");
            setSetupStep('intro');
            setShowTwoFactorSetup(false);
            setTotpCode("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error enabling 2FA");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisable2FA = async () => {
        if (totpCode.length !== 6) {
            setError("Enter a 6-digit code");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${SYNC_API_URL}/2fa/disable`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${sessionToken}`,
                },
                body: JSON.stringify({ totp_code: totpCode }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || "Failed to disable 2FA");
                return;
            }
            setTotpEnabled(false);
            localStorage.setItem("whistler_totp_enabled", "false");
            setTotpCode("");
            setShowTwoFactorSetup(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error disabling 2FA");
        } finally {
            setIsLoading(false);
        }
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

    if (showTwoFactorSetup) {
        return (
            <div className="flex flex-col h-full bg-sidebar-background">
                <div className="p-3 border-b border-sidebar-border flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 -ml-1" 
                        onClick={() => {
                            setShowTwoFactorSetup(false);
                            setSetupStep('intro');
                            setTotpCode("");
                            setError(null);
                        }}
                    >
                        <CaretLeft className="text-muted-foreground" />
                    </Button>
                    <div className="flex items-center gap-2 text-sm font-semibold text-sidebar-foreground">
                        <ShieldCheck weight="bold" />
                        {setupMode === 'enable' ? 'Setup 2FA' : 'Disable 2FA'}
                    </div>
                </div>

                <div className="flex-1 p-4 flex flex-col items-center gap-4 overflow-y-auto">
                    {setupMode === 'enable' && setupStep === 'intro' && (
                        <div className="text-center space-y-4 pt-8">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                                <ShieldCheck weight="fill" size={32} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-semibold text-foreground">Secure your account</h3>
                                <p className="text-sm text-muted-foreground max-w-[240px] mx-auto">
                                    Two-factor authentication adds an extra layer of security to your sync account.
                                </p>
                            </div>
                            <Button 
                                onClick={handleStart2FASetup} 
                                disabled={isLoading}
                                className="w-full"
                            >
                                {isLoading ? "Starting..." : "Start Setup"}
                            </Button>
                        </div>
                    )}

                    {setupMode === 'enable' && setupStep === 'scan' && (
                        <div className="w-full space-y-6">
                            <div className="space-y-2 text-center">
                                <p className="text-sm font-medium">1. Copy Secret Key</p>
                                <p className="text-xs text-muted-foreground">
                                    Enter this key into your authenticator app (Google Authenticator, Authy, etc).
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <code className="flex-1 bg-zinc-900 p-2 rounded text-xs font-mono break-all border border-zinc-800">
                                        {setupSecret}
                                    </code>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8 shrink-0"
                                        onClick={() => {
                                            if (setupSecret) navigator.clipboard.writeText(setupSecret);
                                        }}
                                        title="Copy Secret"
                                    >
                                        <Copy size={14} />
                                    </Button>
                                </div>
                            </div>

                            <Separator className="bg-sidebar-border" />

                            <div className="space-y-3 text-center">
                                <p className="text-sm font-medium">2. Enter Verification Code</p>
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
                                    <div className="text-xs text-red-400 px-2">{error}</div>
                                )}
                                <Button 
                                    onClick={handleEnable2FA} 
                                    disabled={isLoading || totpCode.length !== 6}
                                    className="w-full"
                                >
                                    {isLoading ? "Verifying..." : "Verify & Enable"}
                                </Button>
                            </div>
                        </div>
                    )}

                    {setupMode === 'disable' && (
                        <div className="w-full space-y-4 pt-4">
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3 items-start">
                                <Warning className="text-red-500 shrink-0 mt-0.5" weight="fill" size={16} />
                                <div className="text-xs text-red-200">
                                    Disabling 2FA will make your account less secure. You will need to enter a code one last time.
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-xs">Enter Code</Label>
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
                                    <div className="text-xs text-red-400 text-center px-2">{error}</div>
                                )}
                                <Button 
                                    onClick={handleDisable2FA} 
                                    disabled={isLoading || totpCode.length !== 6}
                                    className="w-full bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 border-red-500/20"
                                    variant="outline"
                                >
                                    {isLoading ? "Disabling..." : "Disable 2FA"}
                                </Button>
                            </div>
                        </div>
                    )}
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
                        <div className="flex items-center gap-3 p-2 rounded-md hover:bg-sidebar-accent transition-colors group">
                            <div className="size-8 rounded-full bg-secondary flex items-center justify-center">
                                <User weight="bold" className="text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                                {isEditingName ? (
                                    <div className="flex items-center gap-1">
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="h-6 text-sm px-1 py-0"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveName();
                                                if (e.key === 'Escape') setIsEditingName(false);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-green-500 hover:text-green-600 hover:bg-green-500/10" onClick={(e) => { e.stopPropagation(); handleSaveName(); }}>
                                            <Check size={14} />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-red-400 hover:text-red-500 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); setIsEditingName(false); }}>
                                            <X size={14} />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-sm font-medium truncate flex items-center gap-2 group-hover:text-foreground">
                                            {user.email && user.email !== accountId ? user.email : "Anonymous"}
                                            <button 
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-foreground/70 hover:text-foreground"
                                                onClick={(e) => { e.stopPropagation(); handleStartEditName(); }}
                                                title="Edit display name"
                                            >
                                                <PencilSimple size={12} />
                                            </button>
                                        </div>
                                        <div className="text-xs text-muted-foreground group-hover:text-foreground/80 transition-colors">
                                            {accountId ? formatAccountId(accountId) : formatAccountId(user.id)}
                                        </div>
                                    </>
                                )}
                            </div>
                            {!isEditingName && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground group-hover:text-foreground transition-colors" onClick={handleLogout} title="Sign Out">
                                    <SignOut />
                                </Button>
                            )}
                        </div>
                    </div>

                    <Separator className="bg-sidebar-border" />

                    {/* Security Settings */}
                    <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Security</div>
                        <div className="space-y-2">
                            <div className="flex w-full items-center justify-between p-2 rounded-md hover:bg-sidebar-accent transition-colors group">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck weight={totpEnabled ? "fill" : "regular"} className={totpEnabled ? "text-green-500 group-hover:text-green-400" : "text-muted-foreground group-hover:text-foreground"} size={18} />
                                    <span className="text-sm group-hover:text-foreground transition-colors">Two-Factor Auth</span>
                                </div>
                                {totpEnabled ? (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 group-hover:text-red-200"
                                        onClick={() => {
                                            setSetupMode('disable');
                                            setShowTwoFactorSetup(true);
                                            setError(null);
                                            setTotpCode("");
                                        }}
                                    >
                                        Disable
                                    </Button>
                                ) : (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 text-[10px] text-primary hover:text-primary hover:bg-primary/10 group-hover:text-foreground"
                                        onClick={() => {
                                            setSetupMode('enable');
                                            setSetupStep('intro');
                                            setShowTwoFactorSetup(true);
                                            setError(null);
                                            setTotpCode("");
                                        }}
                                    >
                                        Enable
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-sidebar-border" />

                    {/* Sync Settings */}
                    <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Configuration</div>
                        <div className="space-y-2">
                            <button
                                type="button"
                                className="flex w-full items-center justify-between p-2 rounded-md hover:bg-sidebar-accent transition-colors cursor-pointer group"
                                onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                            >
                                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Auto-sync</span>
                                <span
                                    className={`w-8 h-4 rounded-full relative transition-colors ${
                                        autoSyncEnabled ? "bg-primary group-hover:bg-primary/90" : "bg-zinc-700 group-hover:bg-zinc-600"
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
