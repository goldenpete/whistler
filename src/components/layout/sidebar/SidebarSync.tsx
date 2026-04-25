import {
  useEffect,
  useState,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { useShallow } from "@/lib/zustand-shallow";
import { useStore, type AppStore } from "@/store/useStore";
import { authStorage } from "@/utils/authStorage";
import { useSync } from "@/hooks/useSync";
import { SYNC_API_URL } from "@/constants";
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
  X,
  Eye,
  EyeSlash,
  Fingerprint,
} from "@phosphor-icons/react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { startAuthentication } from "@/utils/webauthn";

declare global {
  interface WhistlerTurnstileRenderOptions {
    sitekey: string;
    theme?: string;
    callback?: (token: string) => void;
    "error-callback"?: () => void;
    "expired-callback"?: () => void;
  }

  interface WhistlerTurnstile {
    reset: (container?: string | HTMLElement) => void;
    render: (
      container: string | HTMLElement,
      options: WhistlerTurnstileRenderOptions,
    ) => string;
    remove: (widgetId: string) => void;
  }

  interface Window {
    turnstile?: WhistlerTurnstile;
  }
}

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
    syncStatus,
  } = useStore(
    useShallow((state: AppStore) => ({
      user: state.user,
      login: state.login,
      logout: state.logout,
      updateUser: state.updateUser,
      lastSyncTime: state.lastSyncTime,
      setLastSyncTime: state.setLastSyncTime,
      syncStatus: state.syncStatus,
    })),
  );
  const { handleSync, error: syncError } = useSync();
  const [syncId, setSyncId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"login" | "totp">("login");
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");

  // 2FA Management State
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [setupMode, setSetupMode] = useState<"enable" | "disable">("enable");
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupStep, setSetupStep] = useState<"intro" | "scan" | "verify">(
    "intro",
  );

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSyncIdRevealed, setIsSyncIdRevealed] = useState(false);

  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarHeaderButtonClassName =
    "h-6 w-6 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground transition-all duration-200 hover:bg-secondary/60 hover:text-foreground";
  const sidebarHeaderTitleClassName =
    "flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-foreground";
  const sidebarSectionClassName =
    "rounded-none border border-border bg-card/50 p-3";
  const sidebarSectionEyebrowClassName =
    "text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70";
  const syncStatusBadgeClassName =
    syncStatus === "syncing"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
      : syncStatus === "error"
        ? "border-red-500/30 bg-red-500/10 text-red-400"
        : "border-green-500/30 bg-green-500/10 text-green-400";
  const syncStatusLabel =
    syncStatus === "syncing"
      ? "Syncing"
      : syncStatus === "error"
        ? "Attention"
        : lastSyncTime
          ? "Connected"
          : "Ready";
  const syncStatusIconToneClassName =
    syncStatus === "syncing"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
      : syncStatus === "error"
        ? "border-red-500/30 bg-red-500/10 text-red-400"
        : "border-green-500/30 bg-green-500/10 text-green-400";

  useEffect(() => {
    let widgetId: string | null = null;
    const interval = setInterval(() => {
      if (window.turnstile && !widgetId) {
        const container = containerRef.current;
        if (container) {
          // Check if container already has content to avoid double render
          if (container.hasChildNodes()) {
            clearInterval(interval);
            return;
          }

          try {
            widgetId = window.turnstile.render(container, {
              sitekey: TURNSTILE_SITE_KEY,
              theme: "auto",
              callback: (token: string) => {
                setCaptchaToken(token);
                setError(null);
              },
              "expired-callback": () => {
                setCaptchaToken(null);
              },
            });
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
        } catch {
          // Ignore removal errors
        }
      }
    };
  }, []);

  useEffect(() => {
    const {
      accountId: storedAccount,
      token: storedToken,
      lastSync: storedLastSync,
      displayName: storedDisplayName,
      totpEnabled,
    } = authStorage.getCredentials();

    if (storedAccount && storedToken) {
      setAccountId(storedAccount);
      setSessionToken(storedToken);

      if (totpEnabled) {
        setTotpEnabled(true);
      }

      // Only update store if not already logged in or ID mismatch
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
      // Clear local state if storage is empty
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

  const getCleanAccountId = (value: string) =>
    value.replace(/\D/g, "").slice(0, 16);

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
      authStorage.setCredentials({ accountId: cleanId, token, displayName });
      // If we logged in without 2FA challenge, it means 2FA is disabled
      setTotpEnabled(false);
      authStorage.setTotpEnabled(false);

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
      authStorage.setCredentials({ accountId: account, token, displayName });
      // If we successfully verified TOTP, it means 2FA is enabled
      setTotpEnabled(true);
      authStorage.setTotpEnabled(true);

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
    authStorage.clearCredentials();
    logout();
  };

  const handlePasskeyLogin = async () => {
    const cleanId = getCleanAccountId(syncId);
    if (cleanId.length !== 16) {
      setError("Sync ID must be 16 digits");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // 1. Get authentication options from server
      const optionsResponse = await fetch(
        `${SYNC_API_URL}/passkeys/login/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account_id: cleanId }),
        },
      );

      if (!optionsResponse.ok) {
        const errorData = await optionsResponse.json();
        throw new Error(errorData.error || "Failed to start passkey login");
      }

      const options = await optionsResponse.json();

      // 2. Get assertion using WebAuthn API
      const assertion = await startAuthentication(options);

      // 3. Send assertion to server to finish login
      let verifyResponse = await fetch(
        `${SYNC_API_URL}/passkeys/login/finish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account_id: cleanId,
            assertion,
          }),
        },
      );

      // Compatibility fallback: some backends expect assertion fields at top level.
      if (!verifyResponse.ok) {
        verifyResponse = await fetch(`${SYNC_API_URL}/passkeys/login/finish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account_id: cleanId,
            ...assertion,
          }),
        });
      }

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || "Passkey login failed");
      }

      const data = await verifyResponse.json();
      const token: string = data.token;
      const displayName: string | undefined = data.display_name;

      setAccountId(cleanId);
      setSessionToken(token);
      authStorage.setCredentials({ accountId: cleanId, token, displayName });

      setTotpEnabled(data.totp_enabled || false);
      authStorage.setTotpEnabled(data.totp_enabled || false);

      login({ id: cleanId, email: displayName || cleanId });
      setPhase("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey login error");
    } finally {
      setIsLoading(false);
    }
  };

  // handleSync is now provided by useSync hook

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
      authStorage.setDisplayName(newName);
    } else {
      authStorage.setDisplayName("");
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
      if (response.status === 401) {
        handleLogout();
        setError("Session expired. Please sign in again.");
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        if (data.error === "2FA is already enabled") {
          setTotpEnabled(true);
          authStorage.setTotpEnabled(true);
        }
        setError(data.error || "Setup failed");
        return;
      }
      setSetupSecret(data.secret);
      setSetupStep("scan");
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
      authStorage.setTotpEnabled(true);
      setSetupStep("intro");
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
      authStorage.setTotpEnabled(false);
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
          <div className="px-3 py-2 border-b border-border/40 bg-card/20 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={onBack}
                className={sidebarHeaderButtonClassName}
                title="Back to sidebar"
              >
                <CaretLeft weight="bold" size={14} />
              </button>
              <div className={sidebarHeaderTitleClassName}>
                <SignIn weight="bold" size={14} />
                Sync 2FA
              </div>
              <button
                title="Settings"
                onClick={() => navigate("/settings?tab=sync")}
                className={sidebarHeaderButtonClassName}
              >
                <Gear weight="bold" size={14} />
              </button>
            </div>
          </div>
          <div className="flex-1 p-3 flex flex-col justify-center items-center gap-3">
            <div className="text-center space-y-2 mb-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                <Cloud weight="fill" size={24} />
              </div>
              <h3 className="font-semibold text-foreground">
                Two-Factor Authentication
              </h3>
              <p className="text-xs text-muted-foreground max-w-[220px]">
                Enter the 6-digit code from your authenticator app to finish
                login.
              </p>
            </div>
            <div className="w-full space-y-3">
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                autoComplete="one-time-code"
                className="h-10 text-center tracking-[0.5em] text-lg font-mono bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
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
        <div className="px-3 py-2 border-b border-border/40 bg-card/20 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className={sidebarHeaderButtonClassName}
              title="Back to sidebar"
            >
              <CaretLeft weight="bold" size={14} />
            </button>
            <div className={sidebarHeaderTitleClassName}>
              <SignIn weight="bold" size={14} />
              Sync Access
            </div>
            <button
              title="Settings"
              onClick={() => navigate("/settings?tab=sync")}
              className={sidebarHeaderButtonClassName}
            >
              <Gear weight="bold" size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 p-3 flex flex-col justify-center items-center gap-3">
          <div className="text-center space-y-2 mb-2">
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
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Sync ID
              </label>
              <Input
                type="text"
                placeholder="16-digit ID"
                value={syncId}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setSyncId(formatAccountId(e.target.value))
                }
                className="h-8 text-sm font-mono bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                maxLength={19}
                minLength={16}
                required
              />
              <Button
                type="button"
                variant="outline"
                className="w-full h-8 mt-1 text-xs gap-2 border-sidebar-border bg-sidebar-background hover:bg-sidebar-accent"
                onClick={handleGenerateId}
                title="Generate New Account ID"
              >
                <Shuffle weight="bold" className="size-4" />
                <span>Generate New Account ID</span>
              </Button>
            </div>
            <div className="flex justify-center items-center relative min-h-[65px]">
              <div
                ref={containerRef}
                className="relative z-10 scale-[0.85] origin-center flex items-center justify-center"
              />
            </div>
            {error && (
              <div className="text-xs text-red-400 text-center px-2">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                className="w-full h-8"
                disabled={isLoading || getCleanAccountId(syncId).length < 16}
                data-sound-confirm
              >
                {isLoading ? "Connecting..." : "Connect"}
              </Button>
              <div className="flex items-center gap-2">
                <div className="h-[1px] flex-1 bg-border/40" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  or
                </span>
                <div className="h-[1px] flex-1 bg-border/40" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full h-8"
                onClick={handlePasskeyLogin}
                disabled={isLoading}
              >
                <Fingerprint className="mr-2" size={16} />
                Use Passkey
              </Button>
            </div>
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
        <div className="px-3 py-2 border-b border-border/40 bg-card/20 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowTwoFactorSetup(false);
                setSetupStep("intro");
                setTotpCode("");
                setError(null);
              }}
              data-sound-back
              className={sidebarHeaderButtonClassName}
              title="Back to sync"
            >
              <CaretLeft weight="bold" size={14} />
            </button>
            <div className={sidebarHeaderTitleClassName}>
              <ShieldCheck weight="bold" size={14} />
              {setupMode === "enable" ? "Setup 2FA" : "Disable 2FA"}
            </div>
            <div className="h-6 w-6 shrink-0" aria-hidden="true" />
          </div>
        </div>

        <div className="flex-1 px-3 py-3 flex flex-col items-center gap-3 overflow-y-auto">
          {setupMode === "enable" && setupStep === "intro" && (
            <div className="text-center space-y-4 pt-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                <ShieldCheck weight="fill" size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">
                  Secure your account
                </h3>
                <p className="text-sm text-muted-foreground max-w-[240px] mx-auto">
                  Two-factor authentication adds an extra layer of security to
                  your sync account.
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

          {setupMode === "enable" && setupStep === "scan" && (
            <div className="w-full space-y-6">
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                <QrCode
                  size={128}
                  className="bg-white p-2 rounded-lg text-black"
                />
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Scan with your authenticator app
                  </p>
                </div>
              </div>

              <Separator className="bg-sidebar-border" />

              <div className="space-y-2 text-center">
                <p className="text-sm font-medium">1. Copy Secret Key</p>
                <p className="text-xs text-muted-foreground">
                  Enter this key into your authenticator app (Google
                  Authenticator, Authy, etc).
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
                      if (setupSecret)
                        navigator.clipboard.writeText(setupSecret);
                    }}
                    title="Copy Secret"
                  >
                    <Copy size={14} />
                  </Button>
                </div>
              </div>

              <Separator className="bg-sidebar-border" />

              <div className="space-y-3 text-center">
                <p className="text-sm font-medium">
                  2. Enter Verification Code
                </p>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="h-10 text-center tracking-[0.5em] text-lg font-mono bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
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

          {setupMode === "disable" && (
            <div className="w-full space-y-4 pt-4">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3 items-start">
                <Warning
                  className="text-red-500 shrink-0 mt-0.5"
                  weight="fill"
                  size={16}
                />
                <div className="text-xs text-red-200">
                  Disabling 2FA will make your account less secure. You will
                  need to enter a code one last time.
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs">Enter Code</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="h-10 text-center tracking-[0.5em] text-lg font-mono bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                  placeholder="000000"
                />
                {error && (
                  <div className="text-xs text-red-400 text-center px-2">
                    {error}
                  </div>
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
      <div className="px-3 py-2 border-b border-border/40 bg-card/20 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className={sidebarHeaderButtonClassName}
            title="Back to sidebar"
          >
            <CaretLeft weight="bold" size={14} />
          </button>
          <div className={sidebarHeaderTitleClassName}>
            <Cloud weight="fill" size={14} className="text-primary" />
            Sync Access
          </div>
          <button
            title="Settings"
            onClick={() => navigate("/settings?tab=sync")}
            className={sidebarHeaderButtonClassName}
          >
            <Gear weight="bold" size={14} />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-3">
          <div className={sidebarSectionClassName}>
            <div className="mb-3 flex items-start gap-2.5">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-none border",
                  syncStatusIconToneClassName,
                )}
              >
                {syncStatus === "error" ? (
                  <Warning weight="fill" size={16} />
                ) : (
                  <CheckCircle weight="fill" size={16} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-foreground">
                    Sync Status
                  </h3>
                  <span
                    className={cn(
                      "rounded-none border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em]",
                      syncStatusBadgeClassName,
                    )}
                  >
                    {syncStatusLabel}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {lastSyncTime
                    ? `Last synced ${new Date(lastSyncTime).toLocaleString()}`
                    : "No sync has been completed on this device yet."}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-8 gap-1.5 rounded-none border-border bg-background/60 text-xs hover:bg-muted/50"
                onClick={() => handleSync("push")}
                disabled={syncStatus === "syncing"}
              >
                <CloudArrowUp size={14} />
                Push
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-8 gap-1.5 rounded-none border-border bg-background/60 text-xs hover:bg-muted/50"
                onClick={() => handleSync("pull")}
                disabled={syncStatus === "syncing"}
              >
                <CloudArrowDown size={14} />
                Pull
              </Button>
            </div>

            {(error || syncError) && (
              <div className="mt-2 flex items-start gap-2 border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                <Warning weight="fill" size={14} />
                <span className="min-w-0 break-words">
                  {error || syncError}
                </span>
              </div>
            )}
          </div>

          <div className={sidebarSectionClassName}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <div className={sidebarSectionEyebrowClassName}>Account</div>
                <h3 className="mt-1 text-sm font-semibold text-foreground">
                  Connected profile
                </h3>
              </div>
              {!isEditingName && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-none px-2 text-xs text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                  onClick={handleLogout}
                  title="Sign Out"
                >
                  <SignOut size={14} className="mr-1.5" />
                  Sign Out
                </Button>
              )}
            </div>
            <div className="group flex items-start gap-2.5 rounded-none border border-border bg-background/50 p-2.5 transition-colors hover:bg-accent/30">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none border border-border bg-muted/30 text-muted-foreground">
                <User weight="bold" size={16} />
              </div>
              <div className="flex-1 min-w-0">
                {isEditingName ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editName}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setEditName(e.target.value)
                      }
                      className="h-7 rounded-none border-border bg-background/70 text-sm"
                      autoFocus
                      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") setIsEditingName(false);
                      }}
                      onClick={(e: MouseEvent) => e.stopPropagation()}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 rounded-none text-green-500 hover:bg-green-500/10 hover:text-green-400"
                      onClick={(e: MouseEvent) => {
                        e.stopPropagation();
                        handleSaveName();
                      }}
                      data-sound-confirm
                      title="Save display name"
                    >
                      <Check size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 rounded-none text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      onClick={(e: MouseEvent) => {
                        e.stopPropagation();
                        setIsEditingName(false);
                      }}
                      title="Cancel editing"
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate text-foreground">
                        {user.email && user.email !== accountId
                          ? user.email
                          : "Anonymous"}
                      </span>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0">
                        <button
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e: MouseEvent) => {
                            e.stopPropagation();
                            handleStartEditName();
                          }}
                          title="Edit display name"
                        >
                          <PencilSimple size={13} />
                        </button>

                        <div className="w-[1px] h-3 bg-border/40 mx-0.5" />

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsSyncIdRevealed(!isSyncIdRevealed);
                          }}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title={isSyncIdRevealed ? "Hide ID" : "Reveal ID"}
                        >
                          {isSyncIdRevealed ? (
                            <EyeSlash size={13} />
                          ) : (
                            <Eye size={13} />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(accountId || user.id);
                          }}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Copy ID"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 min-w-0">
                      <div className="truncate text-[11px] text-muted-foreground group-hover:text-foreground/80 transition-colors font-mono">
                        {isSyncIdRevealed
                          ? accountId
                            ? formatAccountId(accountId)
                            : formatAccountId(user.id)
                          : "••••-••••-••••-••••"}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className={sidebarSectionClassName}>
            <div className="mb-2">
              <div className={sidebarSectionEyebrowClassName}>Security</div>
              <h3 className="mt-1 text-sm font-semibold text-foreground">
                Two-factor authentication
              </h3>
            </div>
            <div className="flex items-start justify-between gap-2.5 rounded-none border border-border bg-background/50 p-2.5 transition-colors hover:bg-accent/30">
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-none border",
                    totpEnabled
                      ? "border-green-500/30 bg-green-500/10 text-green-400"
                      : "border-border bg-muted/30 text-muted-foreground",
                  )}
                >
                  <ShieldCheck
                    weight={totpEnabled ? "fill" : "regular"}
                    size={16}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    Two-Factor Auth
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {totpEnabled
                      ? "Extra verification is enabled."
                      : "Add another layer of account security."}
                  </div>
                </div>
              </div>
              {totpEnabled ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 rounded-none px-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  onClick={() => {
                    setSetupMode("disable");
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
                  className="h-7 shrink-0 rounded-none px-2 text-xs text-primary hover:bg-primary/10 hover:text-primary"
                  onClick={() => {
                    setSetupMode("enable");
                    setSetupStep("intro");
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
      </ScrollArea>
    </div>
  );
}
