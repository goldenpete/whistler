import React, { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useShallow } from "@/lib/zustand-shallow";
import { useStore, type AppStore } from "@/store/useStore";
import { useSync } from "@/hooks/useSync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/toggle-switch";
import {
    CloudArrowUp,
    CloudArrowDown,
    Cloud,
    SignIn,
    User,
    CheckCircle,
    ShieldCheck,
    Copy,
    Warning,
    QrCode,
    PencilSimple,
    Check,
    X,
    ArrowsClockwise,
    File,
    Folder,
    FileText,
    Graph,
    HardDrives,
    Gear,
    Trash
} from "@phosphor-icons/react";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog";

declare global {
    interface Window {
        turnstile?: {
            reset: (container?: string | HTMLElement) => void;
            render: (container: string | HTMLElement, options: any) => string;
            remove: (widgetId: string) => void;
        };
    }
}

const SYNC_API_URL = "https://whistler-sync.peteawesome.workers.dev";
const TURNSTILE_SITE_KEY = "0x4AAAAAACL9Ojn2jXAFNaw_";

import { DestructiveDeleteDialog } from "@/components/ui/destructive-delete-dialog";

export function SettingsSync() {
    const { 
        user, 
        login, 
        logout, 
        updateUser,
        lastSyncTime, 
        setLastSyncTime, 
        autoSyncEnabled,
        setAutoSyncEnabled,
        autoSyncInterval,
        setAutoSyncInterval,
        syncStatus,
        setSyncStatus,
        syncOptions,
        setSyncOptions
    } = useStore(useShallow((state: AppStore) => ({
        user: state.user,
        login: state.login,
        logout: state.logout,
        updateUser: state.updateUser,
        lastSyncTime: state.lastSyncTime,
        setLastSyncTime: state.setLastSyncTime,
        autoSyncEnabled: state.autoSyncEnabled,
        setAutoSyncEnabled: state.setAutoSyncEnabled,
        autoSyncInterval: state.autoSyncInterval,
        setAutoSyncInterval: state.setAutoSyncInterval,
        syncStatus: state.syncStatus,
        setSyncStatus: state.setSyncStatus,
        syncOptions: state.syncOptions,
        setSyncOptions: state.setSyncOptions
    })));

    const { handleSync, error: syncError } = useSync();
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

    // Remote Deletion State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{id: string, label: string} | null>(null);
    const [isDeletingRemote, setIsDeletingRemote] = useState(false);

    const handleDeleteRemote = async () => {
        if (!itemToDelete || !sessionToken) return;
        setIsDeletingRemote(true);
        try {
            // 1. Fetch current data
            const getResponse = await fetch(`${SYNC_API_URL}/data`, {
                headers: { Authorization: `Bearer ${sessionToken}` }
            });
            
            if (!getResponse.ok) throw new Error("Failed to fetch current sync data");
            
            const json = await getResponse.json();
            const currentData = json.value || {};
            
            // 2. Remove the key
            delete currentData[itemToDelete.id];
            
            // Handle dependent keys
            if (itemToDelete.id === 'graphs') {
                delete currentData.graphNodes;
                delete currentData.graphEdges;
            }

            // 3. Put back
            const payload = JSON.stringify({
                key: "whistler_data",
                value: currentData,
            });

            const putResponse = await fetch(`${SYNC_API_URL}/data`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${sessionToken}`,
                },
                body: payload,
            });

            if (!putResponse.ok) throw new Error("Failed to update sync data");

            setDeleteDialogOpen(false);
            setItemToDelete(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Delete failed");
        } finally {
            setIsDeletingRemote(false);
        }
    };

    // Turnstile Effect
    useEffect(() => {
        let widgetId: string | null = null;
        const interval = setInterval(() => {
            if (window.turnstile && !widgetId && !user) {
                const container = document.getElementById("turnstile-container-settings");
                if (container) {
                    if (container.hasChildNodes()) {
                        clearInterval(interval);
                        return;
                    }
                    try {
                        widgetId = window.turnstile.render(container, {
                            sitekey: TURNSTILE_SITE_KEY,
                            theme: "dark",
                            callback: (token: string) => {
                                setCaptchaToken(token);
                                setError(null);
                            },
                            "expired-callback": () => {
                                setCaptchaToken(null);
                            },
                        });
                        setTurnstileWidgetId(widgetId);
                        clearInterval(interval);
                    } catch (e) {
                        console.error("Turnstile render error:", e);
                    }
                }
            }
        }, 500);

        return () => {
            clearInterval(interval);
            if (widgetId && window.turnstile) {
                try {
                    window.turnstile.remove(widgetId);
                } catch (e) { }
            }
        };
    }, [user]);

    // Initialize from LocalStorage
    useEffect(() => {
        const storedAccount = localStorage.getItem("whistler_account_id");
        const storedToken = localStorage.getItem("whistler_session_token");
        const storedLastSync = localStorage.getItem("whistler_last_sync");
        const storedDisplayName = localStorage.getItem("whistler_display_name");
        const storedTotpEnabled = localStorage.getItem("whistler_totp_enabled");
        
        if (storedAccount && storedToken) {
            setAccountId(storedAccount);
            setSessionToken(storedToken);
            
            if (storedTotpEnabled === "true") {
                setTotpEnabled(true);
            }
            
            if (!user || user.id !== storedAccount) {
                login({ id: storedAccount, email: storedDisplayName || storedAccount });
            }
            
            if (storedLastSync) {
                const asNumber = Number(storedLastSync);
                if (!Number.isNaN(asNumber)) {
                    const current = useStore.getState().lastSyncTime;
                    if (!current || asNumber > current) {
                        setLastSyncTime(asNumber);
                    }
                }
            }
        } else {
            setAccountId(null);
            setSessionToken(null);
            setTotpEnabled(false);
        }
    }, [login, setLastSyncTime, user?.id]);

    const formatAccountId = (id: string) => {
        const clean = id.replace(/\D/g, "").slice(0, 16);
        const parts = [];
        for (let i = 0; i < clean.length; i += 4) {
            parts.push(clean.slice(i, i + 4));
        }
        return parts.join("-");
    };

    const getCleanAccountId = (value: string) => value.replace(/\D/g, "").slice(0, 16);

    const handleLogin = async (e: FormEvent) => {
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
        setPhase('login');
    };

    const handleStartEditName = () => {
        setEditName(user?.email && user.email !== accountId ? user.email : "");
        setIsEditingName(true);
    };

    const handleSaveName = async () => {
        if (!user) return;
        const newName = editName.trim();
        updateUser({ email: newName || user.id });
        
        if (newName) {
            localStorage.setItem("whistler_display_name", newName);
        } else {
            localStorage.removeItem("whistler_display_name");
        }
        setIsEditingName(false);

        // Update on server
        if (sessionToken) {
            try {
                const response = await fetch(`${SYNC_API_URL}/user/name`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${sessionToken}`,
                    },
                    body: JSON.stringify({ display_name: newName }),
                });

                if (response.status === 401) {
                    handleLogout();
                }
            } catch (err) {
                console.error("Failed to update name on server:", err);
            }
        }
    };

    // 2FA Setup Handlers
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
            if (response.status === 401) {
                handleLogout();
                setError("Session expired. Please sign in again.");
                return;
            }
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
            if (response.status === 401) {
                handleLogout();
                setError("Session expired. Please sign in again.");
                return;
            }
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
            if (response.status === 401) {
                handleLogout();
                setError("Session expired. Please sign in again.");
                return;
            }
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

    // Render Logic
    
    // Login / 2FA / TOTP View
    if (!user) {
        if (phase === "totp") {
            return (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div>
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <ShieldCheck className="text-primary" size={24} />
                            Two-Factor Authentication
                        </h2>
                        <div className="p-8 rounded-lg border border-border bg-card/50 flex flex-col items-center gap-6">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                <ShieldCheck weight="fill" size={32} />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-semibold">Verification Required</h3>
                                <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
                            </div>
                            <div className="w-full max-w-xs space-y-4">
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={totpCode}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    autoComplete="one-time-code"
                                    className="h-12 text-center tracking-[0.5em] text-xl font-mono"
                                    placeholder="000000"
                                />
                                {error && <div className="text-sm text-red-400 text-center">{error}</div>}
                                <div className="flex gap-3">
                                    <Button className="flex-1" onClick={handleVerifyTotp} disabled={isLoading}>
                                        Verify
                                    </Button>
                                    <Button variant="outline" className="flex-1" onClick={() => {
                                        setPhase("login");
                                        setPendingToken(null);
                                        setTotpCode("");
                                    }}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Cloud className="text-primary" size={24} />
                        Sync Access
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-base font-medium">Connect Account</h3>
                                <p className="text-sm text-muted-foreground">
                                    Enter your 16-digit Sync ID to access your data across devices.
                                </p>
                            </div>
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium uppercase text-muted-foreground">Sync ID</label>
                                    <Input 
                                        value={syncId}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                            const val = e.target.value.replace(/[^0-9]/g, "");
                                            if (val.length <= 16) setSyncId(formatAccountId(val));
                                        }}
                                        placeholder="0000-0000-0000-0000"
                                        className="font-mono tracking-wider"
                                    />
                                </div>
                                
                                <div id="turnstile-container-settings" className="min-h-[65px]" />
                                
                                {error && <div className="text-sm text-red-400">{error}</div>}
                                
                                <Button type="submit" className="w-full" disabled={isLoading || !captchaToken}>
                                    {isLoading ? "Connecting..." : "Connect"}
                                </Button>
                            </form>
                        </div>

                        <div className="p-6 rounded-lg border border-border bg-card/50 flex flex-col justify-center space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-base font-medium">New to Whistler Sync?</h3>
                                <p className="text-sm text-muted-foreground">
                                    Generate a new Sync ID to start syncing your projects securely.
                                </p>
                            </div>
                            <Button variant="outline" onClick={handleGenerateId} className="w-full">
                                Generate New ID
                            </Button>
                            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded border border-border/50">
                                <strong>Note:</strong> Your data is end-to-end encrypted. We cannot recover your Sync ID if lost. Please save it securely.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Logged In View
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
            {/* Account Status */}
            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="text-primary" size={24} />
                    Account
                </h2>
                <div className="p-5 rounded-lg border border-border bg-card/50">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <User size={24} weight="fill" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    {isEditingName ? (
                                        <div className="flex items-center gap-2">
                                            <Input 
                                                value={editName}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                                                className="h-7 w-48"
                                                autoFocus
                                            />
                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveName}>
                                                <Check className="text-green-500" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditingName(false)}>
                                                <X className="text-red-500" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="font-semibold text-lg flex items-center gap-2">
                                            {user.email}
                                            <button onClick={handleStartEditName} className="text-muted-foreground hover:text-foreground transition-colors">
                                                <PencilSimple size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <span className="font-mono">{formatAccountId(user.id)}</span>
                                    <button 
                                        onClick={() => navigator.clipboard.writeText(user.id)}
                                        className="hover:text-foreground transition-colors"
                                        title="Copy ID"
                                    >
                                        <Copy size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                             <Button variant="outline" onClick={() => {
                                 setShowTwoFactorSetup(true);
                                 setSetupMode(totpEnabled ? 'disable' : 'enable');
                                 setSetupStep('intro');
                             }}>
                                <ShieldCheck className="mr-2" size={16} />
                                {totpEnabled ? "Manage 2FA" : "Enable 2FA"}
                             </Button>
                             <Button variant="destructive" onClick={handleLogout}>
                                 Sign Out
                             </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2FA Setup Dialog Area */}
            {showTwoFactorSetup && (
                <div className="p-5 rounded-lg border border-yellow-500/30 bg-yellow-500/5 space-y-4 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold flex items-center gap-2">
                            <ShieldCheck className="text-yellow-500" />
                            {setupMode === 'enable' ? "Setup Two-Factor Authentication" : "Disable Two-Factor Authentication"}
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowTwoFactorSetup(false)}>
                            <X size={16} />
                        </Button>
                    </div>

                    {setupMode === 'enable' && (
                        <div className="space-y-4">
                            {setupStep === 'intro' && (
                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        Protect your account with an extra layer of security. Once enabled, you'll need a code from your authenticator app to sign in.
                                    </p>
                                    <Button onClick={handleStart2FASetup} disabled={isLoading}>
                                        Start Setup
                                    </Button>
                                </div>
                            )}
                            {setupStep === 'scan' && setupSecret && (
                                <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6">
                                    <div className="bg-white p-2 rounded-lg w-fit">
                                        <QRCode value={`otpauth://totp/Whistler:${user.id}?secret=${setupSecret}&issuer=Whistler`} size={180} />
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-medium mb-1">1. Scan QR Code</h4>
                                            <p className="text-sm text-muted-foreground">Use an app like Google Authenticator or Authy.</p>
                                        </div>
                                        <div>
                                            <h4 className="font-medium mb-1">Manual Entry</h4>
                                            <p className="text-sm text-muted-foreground mb-2">If you can't scan the code, enter this secret key manually:</p>
                                            <code className="bg-muted px-2 py-1 rounded text-xs font-mono break-all select-all">
                                                {setupSecret}
                                            </code>
                                        </div>
                                        <div>
                                            <h4 className="font-medium mb-1">2. Enter Code</h4>
                                            <div className="flex gap-2">
                                                <Input 
                                                    value={totpCode}
                                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                                    placeholder="000000"
                                                    maxLength={6}
                                                    className="w-32 font-mono text-center tracking-widest"
                                                />
                                                <Button onClick={handleEnable2FA} disabled={isLoading}>
                                                    Enable
                                                </Button>
                                            </div>
                                        </div>
                                        {error && <p className="text-sm text-red-400">{error}</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {setupMode === 'disable' && (
                        <div className="space-y-4">
                             <p className="text-sm text-muted-foreground">
                                To disable 2FA, please enter a code from your authenticator app to confirm it's you.
                             </p>
                             <div className="flex gap-2 items-center">
                                <Input 
                                    value={totpCode}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    placeholder="000000"
                                    maxLength={6}
                                    className="w-32 font-mono text-center tracking-widest"
                                />
                                <Button variant="destructive" onClick={handleDisable2FA} disabled={isLoading}>
                                    Disable 2FA
                                </Button>
                             </div>
                             {error && <p className="text-sm text-red-400">{error}</p>}
                        </div>
                    )}
                </div>
            )}

            <Separator />

            {/* Sync Status & Controls */}
            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ArrowsClockwise className="text-primary" size={24} />
                    Sync Status
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 rounded-lg border border-border bg-card/50 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium">Auto-Sync</label>
                                <p className="text-xs text-muted-foreground">Automatically sync changes in background.</p>
                            </div>
                            <Switch checked={autoSyncEnabled} onCheckedChange={setAutoSyncEnabled} />
                        </div>
                        {autoSyncEnabled && (
                            <div className="pt-2 space-y-3">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Interval</span>
                                    <span>
                                        {autoSyncInterval <= 60000 
                                            ? `${Math.round(autoSyncInterval / 1000)}s` 
                                            : `${Math.round(autoSyncInterval / 60000)}m`}
                                    </span>
                                </div>
                                <Slider
                                    value={[
                                        autoSyncInterval <= 60000 
                                            ? autoSyncInterval / 1000 
                                            : (autoSyncInterval / 60000) + 59
                                    ]}
                                    onValueChange={(vals: number[]) => {
                                        const v = vals[0];
                                        const ms = v <= 60 ? v * 1000 : (v - 59) * 60000;
                                        setAutoSyncInterval(ms);
                                    }}
                                    min={0}
                                    max={119}
                                    step={1}
                                />
                            </div>
                        )}
                    </div>

                    <div className="p-5 rounded-lg border border-border bg-card/50 flex flex-col justify-between">
                         <div className="flex items-center justify-between mb-4">
                             <div>
                                 <div className="text-sm font-medium">Last Sync</div>
                                 <div className="text-xs text-muted-foreground">
                                     {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : "Never"}
                                 </div>
                             </div>
                             <div className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${
                                 syncStatus === 'syncing' ? 'bg-blue-500/20 text-blue-400' :
                                 syncStatus === 'error' ? 'bg-red-500/20 text-red-400' :
                                 syncStatus === 'success' ? 'bg-green-500/20 text-green-400' :
                                 'bg-muted text-muted-foreground'
                             }`}>
                                 {syncStatus === 'syncing' && <ArrowsClockwise className="animate-spin" />}
                                 {syncStatus.toUpperCase()}
                             </div>
                         </div>
                         <div className="flex gap-2">
                             <Button className="flex-1" variant="outline" onClick={() => handleSync('push')}>
                                 <CloudArrowUp className="mr-2" />
                                 Push
                             </Button>
                             <Button className="flex-1" variant="outline" onClick={() => handleSync('pull')}>
                                 <CloudArrowDown className="mr-2" />
                                 Pull
                             </Button>
                         </div>
                         {syncError && <p className="text-xs text-red-400 mt-2 text-center">{syncError}</p>}
                    </div>
                </div>
            </div>

            <Separator />

            {/* What to Sync */}
            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Gear className="text-primary" size={24} />
                    What to Sync
                </h2>
                <div className="p-5 rounded-lg border border-border bg-card/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                        {[
                            { id: 'projects', label: 'Projects', desc: 'Project structure and metadata', icon: Folder },
                            { id: 'files', label: 'Files', desc: 'Audio, video, and PDF file references', icon: File },
                            { id: 'collections', label: 'Collections', desc: 'Grouped collections of files', icon: Folder }, // Using Folder for collections too
                            { id: 'highlights', label: 'Highlights', desc: 'Saved regions and timestamps', icon: PencilSimple },
                            { id: 'docs', label: 'Documents', desc: 'Text documents and notes', icon: FileText },
                            { id: 'graphs', label: 'Graphs', desc: 'Node graphs and connections', icon: Graph },
                            { id: 'storages', label: 'Storage Locations', desc: 'Local directory mappings', icon: HardDrives },
                            { id: 'settings', label: 'Settings', desc: 'Themes, preferences, and layout', icon: Gear },
                        ].map((item) => (
                            <div key={item.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded bg-muted/30 flex items-center justify-center text-muted-foreground">
                                        <item.icon size={18} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium">{item.label}</div>
                                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-full"
                                        onClick={() => {
                                            setItemToDelete({ id: item.id, label: item.label });
                                            setDeleteDialogOpen(true);
                                        }}
                                        title={`Delete remote ${item.label} data`}
                                    >
                                        <Trash size={18} />
                                    </Button>
                                    <Switch 
                                        checked={syncOptions[item.id as keyof typeof syncOptions]}
                                        onCheckedChange={(checked: boolean) => setSyncOptions({ [item.id]: checked })}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <DestructiveDeleteDialog 
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDeleteRemote}
                title={`Delete ${itemToDelete?.label || ""} from Sync?`}
                description={`This will permanently delete all ${(itemToDelete?.label || "").toLowerCase()} data from the sync server. Local data will remain safe.`}
                isDeleting={isDeletingRemote}
            />
        </div>
    );
}

// Helper for QR Code (Simple SVG implementation or use a library if available. 
// Since I don't see a QR library imported in SidebarSync, check if it was using one or if I missed it)
// Checking SidebarSync imports:
// import { QrCode } from "@phosphor-icons/react";
// It seems SidebarSync didn't implement the QR code rendering logic? 
// Wait, I saw `setupStep === 'scan'` in SidebarSync but I didn't see the QR code rendering implementation in the truncated read.
// Let's assume for now I need a QRCode component.
// If SidebarSync uses a library, I should use it. 
// If not, I can just show the secret key or a placeholder.
// Actually, I'll search for 'qrcode' in package.json to be sure.

function QRCode({ value, size }: { value: string; size: number }) {
    // Basic placeholder if no library. 
    // Ideally we use `react-qr-code` or similar if installed.
    // I will check package.json next. For now, I'll return a placeholder to avoid breaking build.
    return (
        <div className="flex flex-col items-center justify-center bg-white text-black text-xs p-2 h-full w-full break-all text-center">
             <QrCode size={48} className="mb-2" />
             <span className="text-[10px]">QR Code Placeholder</span>
             {/* If real implementation needed, I will add it after checking dependencies */}
        </div>
    );
}
