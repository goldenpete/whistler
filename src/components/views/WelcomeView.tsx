import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useStore } from "@/store/useStore";
import type { Project, File } from "@/types";
import { Plus, DownloadSimple, Lightning } from "@phosphor-icons/react";
import { importProject, type ProjectExportData } from "@/utils/projectData";

const SYNC_API_URL = "https://whistler-sync.peteawesome.workers.dev";
const TURNSTILE_SITE_KEY = "0x4AAAAAACL9Ojn2jXAFNaw_";

export function WelcomeView() {
    const { addProject, setProjects, setFiles, setActiveProject, login, setLastSyncTime, setState } = useStore();

    const [signInOpen, setSignInOpen] = useState(false);
    const [syncId, setSyncId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [turnstileWidgetId, setTurnstileWidgetId] = useState<string | null>(null);
    const [newProjectOpen, setNewProjectOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [importError, setImportError] = useState<string | null>(null);

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
        if (!signInOpen || turnstileWidgetId) return;
        const interval = setInterval(() => {
            if (window.turnstile) {
                const container = document.getElementById("welcome-turnstile-container");
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
    }, [signInOpen, turnstileWidgetId]);

    const formatAccountId = (id: string) => {
        const clean = id.replace(/\D/g, "").slice(0, 16);
        const parts = [];
        for (let i = 0; i < clean.length; i += 4) {
            parts.push(clean.slice(i, i + 4));
        }
        return parts.join("-");
    };

    const getCleanAccountId = (value: string) => value.replace(/\D/g, "").slice(0, 16);

    const handleWelcomeSignIn = async (e: React.FormEvent) => {
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
            if (data.requires_totp) {
                setError("This account requires 2FA. Use Sync Access inside the app.");
                return;
            }
            const token: string = data.token;
            const displayName: string | undefined = data.display_name;
            localStorage.setItem("whistler_account_id", cleanId);
            localStorage.setItem("whistler_session_token", token);
            if (displayName) {
                localStorage.setItem("whistler_display_name", displayName);
            }
            login({ id: cleanId, email: displayName || cleanId });

            const pullResponse = await fetch(`${SYNC_API_URL}/data`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!pullResponse.ok) {
                const body = await pullResponse.json().catch(() => null);
                setError(body?.error || "Failed to load data");
                return;
            }
            const result = await pullResponse.json();
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
            const now = Date.now();
            setLastSyncTime(now);
            localStorage.setItem("whistler_last_sync", String(now));
            setSignInOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewProject = () => {
        setNewProjectName("");
        setNewProjectOpen(true);
    };

    const handleImportProject = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const text = await file.text();
            try {
                const data = JSON.parse(text) as ProjectExportData;
                if (!data.version || !data.project) throw new Error("Invalid project file");

                const importedData = importProject(data);

                useStore.setState(state => ({
                    projects: [...state.projects, importedData.project],
                    files: [...state.files, ...importedData.files],
                    collections: [...state.collections, ...importedData.collections],
                    timestamps: [...state.timestamps, ...importedData.timestamps],
                    graphs: [...state.graphs, ...importedData.graphs],
                    graphNodes: [...state.graphNodes, ...importedData.graphNodes],
                    graphEdges: [...state.graphEdges, ...importedData.graphEdges],
                    docs: [...state.docs, ...importedData.docs],
                    storages: [...state.storages, ...importedData.storages],
                    activeProjectId: importedData.project.id
                }));
            } catch (err) {
                console.error(err);
                setImportError("Failed to import project.");
            }
        };
        input.click();
    };

    const handleLoadDemo = () => {
        const p1: Project = {
            id: crypto.randomUUID(),
            name: 'Demo Project',
            created: Date.now(),
            lastModified: Date.now()
        };

        const s1 = {
            id: crypto.randomUUID(),
            projectId: p1.id,
            name: 'Main Storage',
            created: Date.now(),
            lastModified: Date.now()
        };

        const f1: File = {
            id: crypto.randomUUID(),
            projectId: p1.id,
            storageId: s1.id,
            parentId: null,
            name: 'Getting Started.mp4',
            url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
            type: 'video',
            order: 0,
            created: Date.now(),
            lastModified: Date.now()
        };

        const f2: File = {
            id: crypto.randomUUID(),
            projectId: p1.id,
            storageId: s1.id,
            parentId: null,
            name: 'Project Documentation.pdf',
            url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            type: 'pdf',
            order: 1,
            created: Date.now(),
            lastModified: Date.now()
        };

        useStore.setState(state => ({
            projects: [...state.projects, p1],
            storages: [...state.storages, s1],
            files: [...state.files, f1, f2],
            activeProjectId: p1.id,
            activeStorageId: s1.id
        }));
    };

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-white p-4">
            <div className="max-w-md w-full space-y-8 text-center">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tighter">Welcome to Whistlerbox</h1>
                    <p className="text-zinc-400">Your creative media organizer.</p>
                </div>

                <div className="grid gap-4">
                    <Button
                        onClick={() => setSignInOpen(true)}
                        variant="outline"
                        className="h-12 text-lg border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 text-zinc-100"
                    >
                        Sync Access Sign In
                    </Button>

                    <Button
                        onClick={handleNewProject}
                        className="h-12 text-lg bg-primary hover:bg-primary/90"
                    >
                        <Plus size={20} weight="bold" className="mr-2" />
                        Create New Project
                    </Button>

                    <Button
                        onClick={handleImportProject}
                        variant="secondary"
                        className="h-12 text-lg"
                    >
                        <DownloadSimple size={20} weight="bold" className="mr-2" />
                        Import Project JSON
                    </Button>

                    {importError && (
                        <div className="text-xs text-red-400 text-center px-2 -mt-2">
                            {importError}
                        </div>
                    )}

                    <Button
                        onClick={handleLoadDemo}
                        variant="outline"
                        className="h-12 text-lg border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white"
                    >
                        <Lightning size={20} weight="bold" className="mr-2" />
                        Load Demo Data
                    </Button>
                </div>
            </div>

            <Dialog open={signInOpen} onOpenChange={setSignInOpen}>
                <DialogContent className="sm:max-w-sm bg-zinc-950 border-zinc-800">
                    <DialogHeader>
                        <DialogTitle>Sync Access</DialogTitle>
                        <DialogDescription>
                            Sign in with your 16-digit Sync ID to load existing Whistlerbox data.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleWelcomeSignIn} className="space-y-4">
                        <div className="space-y-1">
                            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                Sync ID
                            </div>
                            <Input
                                type="text"
                                placeholder="16-digit ID"
                                value={syncId}
                                onChange={(e) => setSyncId(formatAccountId(e.target.value))}
                                className="h-9 font-mono text-sm bg-zinc-900 border-zinc-700"
                                maxLength={19}
                                minLength={16}
                                required
                            />
                        </div>
                        <div className="flex justify-center">
                            <div
                                id="welcome-turnstile-container"
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
                            className="w-full h-9"
                            disabled={isLoading || getCleanAccountId(syncId).length < 16}
                        >
                            {isLoading ? "Connecting..." : "Connect & Load"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
                <DialogContent className="sm:max-w-sm bg-zinc-950 border-zinc-800">
                    <DialogHeader>
                        <DialogTitle>New Project</DialogTitle>
                        <DialogDescription>
                            Enter a name for your new project.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1 text-left">
                            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                Project Name
                            </div>
                            <Input
                                type="text"
                                placeholder="My Project"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                className="h-9 bg-zinc-900 border-zinc-700"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-9"
                                onClick={() => setNewProjectOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                className="h-9 bg-primary hover:bg-primary/90"
                                disabled={!newProjectName.trim()}
                                onClick={() => {
                                    const name = newProjectName.trim();
                                    if (!name) return;
                                    const project = addProject(name);
                                    setActiveProject(project.id);
                                    setNewProjectOpen(false);
                                    setNewProjectName("");
                                }}
                            >
                                Create
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
