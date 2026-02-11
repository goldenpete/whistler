import { useEffect, useState, useRef, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useShallow } from "@/lib/zustand-shallow";
import { useStore, type AppStore } from "@/store/useStore";
import type { Project, File } from "@/types";
import { 
    Plus, 
    DownloadSimple, 
    Lightning, 
    Shuffle, 
    SignIn, 
    Info, 
    FolderPlus, 
    Database, 
    Sparkle,
    CaretRight
} from "@phosphor-icons/react";
import { importProject, type ProjectExportData } from "@/utils/projectData";

const SYNC_API_URL = "https://whistler-sync.peteawesome.workers.dev";
const TURNSTILE_SITE_KEY = "0x4AAAAAACL9Ojn2jXAFNaw_";

declare global {
    interface Window {
        turnstile?: {
            reset: (container?: string | HTMLElement) => void;
            render: (container: string | HTMLElement, options: any) => string;
            remove: (widgetId: string) => void;
        };
    }
}

export function WelcomeView() {
    const { addProject, setActiveProject, login, setLastSyncTime, setState } = useStore(useShallow((state: AppStore) => ({
        addProject: state.addProject,
        setActiveProject: state.setActiveProject,
        login: state.login,
        setLastSyncTime: state.setLastSyncTime,
        setState: state.setState,
    })));

    const [signInOpen, setSignInOpen] = useState(false);
    const [phase, setPhase] = useState<'login' | 'totp'>('login');
    const [pendingToken, setPendingToken] = useState<string | null>(null);
    const [totpCode, setTotpCode] = useState("");
    
    const [syncId, setSyncId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [turnstileWidgetId, setTurnstileWidgetId] = useState<string | null>(null);
    const [newProjectOpen, setNewProjectOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [importError, setImportError] = useState<string | null>(null);
    
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!signInOpen) return;

        let widgetId: string | null = null;
        const interval = setInterval(() => {
            if (window.turnstile && !widgetId) {
                const container = containerRef.current;
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
                } catch (e) {
                }
            }
            setTurnstileWidgetId(null);
            setCaptchaToken(null);
        };
    }, [signInOpen]);

    const formatAccountId = (id: string) => {
        const clean = id.replace(/\D/g, "").slice(0, 16);
        const parts = [];
        for (let i = 0; i < clean.length; i += 4) {
            parts.push(clean.slice(i, i + 4));
        }
        return parts.join("-");
    };

    const getCleanAccountId = (value: string) => value.replace(/\D/g, "").slice(0, 16);

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

    const handleLoginSuccess = async (token: string, displayName?: string) => {
        try {
            const cleanId = getCleanAccountId(syncId);
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
                    highlights: cloudData.highlights || [],
                    graphs: cloudData.graphs || [],
                    graphNodes: cloudData.graphNodes || [],
                    graphEdges: cloudData.graphEdges || [],
                    docs: cloudData.docs || [],
                    storages: cloudData.storages || [],
                    history: cloudData.history || [],
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
            const now = Date.now();
            setLastSyncTime(now);
            localStorage.setItem("whistler_last_sync", String(now));
            setSignInOpen(false);
            setPhase('login');
            setPendingToken(null);
            setTotpCode("");
            setSyncId("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        }
    };

    const handleTotpVerify = async (e: FormEvent) => {
        e.preventDefault();
        if (totpCode.length !== 6) {
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
                    totp_code: totpCode,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || "Verification failed");
                return;
            }
            await handleLoginSuccess(data.token, data.display_name);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Verification error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleWelcomeSignIn = async (e: FormEvent) => {
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
                setPendingToken(data.pending_token);
                setPhase('totp');
                setError(null);
                return;
            }
            await handleLoginSuccess(data.token, data.display_name);
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

    const handleCreateProject = (e: FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;
        
        const project: Project = {
            id: crypto.randomUUID(),
            name: newProjectName.trim(),
            created: Date.now(),
            lastModified: Date.now()
        };
        
        addProject(project);
        setActiveProject(project.id);
        setNewProjectOpen(false);
    };

    const handleImportProject = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = async (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const text = await file.text();
            try {
                const data = JSON.parse(text) as ProjectExportData;
                if (!data.version || !data.project) throw new Error("Invalid project file");

                const importedData = importProject(data);

                useStore.setState((state: AppStore) => ({
                    projects: [...state.projects, importedData.project],
                    files: [...state.files, ...importedData.files],
                    collections: [...state.collections, ...importedData.collections],
                    highlights: [...state.highlights, ...importedData.highlights],
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
            name: 'Project Manual.pdf',
            url: 'https://pdfobject.com/pdf/sample.pdf',
            type: 'pdf',
            order: 1,
            created: Date.now(),
            lastModified: Date.now()
        };

        const f3: File = {
            id: crypto.randomUUID(),
            projectId: p1.id,
            storageId: s1.id,
            parentId: null,
            name: 'Inspiration.jpg',
            url: 'https://images.unsplash.com/photo-1707343843437-caacff5cfa74?q=80&w=1000&auto=format&fit=crop',
            type: 'image',
            order: 2,
            created: Date.now(),
            lastModified: Date.now()
        };

        const f4: File = {
            id: crypto.randomUUID(),
            projectId: p1.id,
            storageId: s1.id,
            parentId: null,
            name: 'Soundtrack.mp3',
            url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            type: 'audio',
            order: 3,
            created: Date.now(),
            lastModified: Date.now()
        };

        useStore.setState((state: AppStore) => ({
            projects: [...state.projects, p1],
            storages: [...state.storages, s1],
            files: [...state.files, f1, f2, f3, f4],
            activeProjectId: p1.id,
            activeStorageId: s1.id
        }));
    };

    return (
        <div className="h-screen bg-black text-foreground font-mono flex flex-col border-[4px] md:border-[8px] border-black overflow-hidden select-none">
            <header className="bg-background border-b-[4px] md:border-b-[8px] border-black p-4 md:p-6 lg:p-8 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 shrink-0 transition-all duration-300">
                <div className="max-w-4xl flex-shrink">
                    <h1 className="text-4xl md:text-7xl lg:text-9xl font-black uppercase tracking-tighter leading-[0.8] text-black dark:text-white transition-all">
                        Whistler<span className="text-primary italic">box</span>
                    </h1>
                    <p className="text-sm md:text-xl lg:text-2xl mt-2 md:mt-4 font-bold uppercase italic bg-primary text-primary-foreground inline-block px-2 md:px-3 py-1">
                        Your creative media organizer.
                    </p>
                </div>
                <div className="flex gap-4 w-full lg:w-auto shrink-0">
                    <Button 
                        onClick={() => setSignInOpen(true)}
                        className="w-full lg:w-auto bg-black text-white dark:bg-white dark:text-black hover:bg-primary hover:text-primary-foreground border-[4px] border-black text-base md:text-xl lg:text-2xl px-4 md:px-10 py-4 md:py-8 rounded-none border-black font-black uppercase shadow-[6px_6px_0px_0px_rgba(var(--primary-rgb),0.5)] hover:shadow-[10px_10px_0px_0px_rgba(var(--primary-rgb),0.7)] hover:-translate-x-1 hover:-translate-y-1 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all group"
                    >
                        <SignIn weight="fill" className="mr-2 md:mr-3 size-5 md:size-8 group-hover:rotate-12 transition-transform" /> Sync Access
                    </Button>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-12 gap-0 flex-grow bg-black min-h-0 overflow-hidden">
                {/* Primary Action Card */}
                <section className="lg:col-span-7 bg-background border-r-0 lg:border-r-[8px] md:border-r-[12px] border-black p-4 md:p-8 lg:p-12 flex flex-col justify-between group hover:bg-primary/5 transition-colors relative overflow-hidden min-h-0 shrink">
                    <div className="absolute top-[-5%] right-[-5%] opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                        <FolderPlus weight="fill" className="size-[250px] md:size-[500px] -rotate-12" />
                    </div>
                    
                    <div className="relative z-10 flex-shrink">
                        <div className="flex items-center gap-3 md:gap-4 mb-2 md:mb-6">
                            <div className="bg-black text-white p-2 md:p-3">
                                <Plus weight="bold" className="size-6 md:size-10" />
                            </div>
                            <h2 className="text-2xl md:text-5xl lg:text-7xl font-black uppercase leading-none tracking-tight">
                                Start Fresh
                            </h2>
                        </div>
                        <p className="text-base md:text-xl lg:text-3xl leading-tight mb-4 md:mb-8 font-bold max-w-2xl opacity-90">
                            Create a new project and start organizing your files, highlights, and thoughts in a brutalist environment.
                        </p>
                    </div>

                    <Button 
                        onClick={handleNewProject}
                        className="w-full lg:w-fit bg-black text-white dark:bg-white dark:text-black hover:bg-primary hover:text-primary-foreground border-[4px] md:border-[6px] border-black text-lg md:text-2xl lg:text-4xl py-6 md:py-10 lg:py-14 px-8 md:px-16 lg:px-20 rounded-none font-black uppercase shadow-[8px_8px_0px_0px_rgba(var(--primary-rgb),0.5)] hover:shadow-[12px_12px_0px_0px_rgba(var(--primary-rgb),0.8)] hover:-translate-x-1 hover:-translate-y-1 active:translate-x-[6px] active:translate-y-[6px] active:shadow-none transition-all flex items-center gap-3 md:gap-6 group/btn"
                    >
                        Create Project <CaretRight weight="bold" className="size-6 md:size-10 group-hover/btn:translate-x-2 transition-transform" />
                    </Button>
                </section>

                {/* Secondary Action Cards */}
                <div className="lg:col-span-5 grid grid-rows-2 min-h-0 shrink">
                    <section className="bg-secondary border-b-[4px] md:border-b-[8px] border-black p-4 md:p-6 lg:p-8 flex flex-col justify-between group hover:bg-secondary/80 transition-colors relative overflow-hidden min-h-0 shrink">
                        <div className="absolute bottom-[-10%] right-[-5%] opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                            <Database weight="fill" className="size-[150px] md:size-[300px]" />
                        </div>

                        <div className="relative z-10 flex-shrink">
                            <h2 className="text-xl md:text-3xl lg:text-5xl font-black uppercase mb-2 md:mb-4 bg-black text-white inline-block px-2 md:px-3 py-1">
                                Import
                            </h2>
                            <p className="text-sm md:text-lg lg:text-2xl leading-tight mb-2 md:mb-4 font-bold max-w-md">
                                Have an existing project? Import your JSON archive here.
                            </p>
                        </div>
                        <Button 
                            onClick={handleImportProject}
                            className="w-full lg:w-fit bg-black text-white dark:bg-white dark:text-black hover:bg-primary hover:text-primary-foreground border-[4px] border-black text-base md:text-xl lg:text-2xl py-3 md:py-5 lg:py-6 px-5 md:px-8 lg:px-12 rounded-none font-black uppercase shadow-[6px_6px_0px_0px_rgba(var(--primary-rgb),0.4)] hover:shadow-[10px_10px_0px_0px_rgba(var(--primary-rgb),0.6)] hover:-translate-x-1 hover:-translate-y-1 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center gap-2 md:gap-4"
                        >
                            <DownloadSimple weight="bold" className="size-5 md:size-8" /> Import JSON
                        </Button>
                        {importError && (
                            <div className="text-[10px] md:text-sm bg-red-500 text-white font-black p-2 mt-2 uppercase inline-block border-2 border-black">
                                {importError}
                            </div>
                        )}
                    </section>

                    <section className="bg-accent border-black p-4 md:p-6 lg:p-8 flex flex-col justify-between group hover:bg-accent/80 transition-colors relative overflow-hidden min-h-0 shrink">
                        <div className="absolute top-[-10%] right-[-5%] opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                            <Sparkle weight="fill" className="size-[150px] md:size-[300px] animate-pulse" />
                        </div>

                        <div className="relative z-10 flex-shrink">
                            <h2 className="text-xl md:text-3xl lg:text-5xl font-black uppercase mb-2 md:mb-4 bg-black text-white inline-block px-2 md:px-3 py-1">
                                Demo
                            </h2>
                            <p className="text-sm md:text-lg lg:text-2xl leading-tight mb-2 md:mb-4 font-bold max-w-md text-black/80">
                                Just looking around? Load some sample data to see how it works.
                            </p>
                        </div>
                        <Button 
                            onClick={handleLoadDemo}
                            className="w-full lg:w-fit bg-black text-white dark:bg-white dark:text-black hover:bg-primary hover:text-primary-foreground border-[4px] border-black text-base md:text-xl lg:text-2xl py-3 md:py-5 lg:py-6 px-5 md:px-8 lg:px-12 rounded-none font-black uppercase shadow-[6px_6px_0px_0px_rgba(var(--primary-rgb),0.4)] hover:shadow-[10px_10px_0px_0px_rgba(var(--primary-rgb),0.6)] hover:-translate-x-1 hover:-translate-y-1 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center gap-2 md:gap-4"
                        >
                            <Lightning weight="fill" className="size-5 md:size-8" /> Load Demo
                        </Button>
                    </section>
                </div>
            </main>

            <footer className="bg-black text-white p-4 md:p-6 lg:p-8 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-8 font-black uppercase text-base md:text-xl lg:text-2xl tracking-tight shrink-0 transition-all duration-300">
                <div className="flex items-center gap-4">
                    <span className="bg-white text-black px-3 py-1">&copy; {new Date().getFullYear()}</span>
                    <span>WHISTLERBOX</span>
                </div>
                <div className="flex flex-wrap justify-center gap-x-12 gap-y-4">
                    <Link to="/legal/terms" state={{ from: 'welcome' }} className="hover:text-primary hover:line-through transition-colors">Terms</Link>
                    <Link to="/legal/privacy" state={{ from: 'welcome' }} className="hover:text-primary hover:line-through transition-colors">Privacy</Link>
                    <Link to="/legal/license" state={{ from: 'welcome' }} className="hover:text-primary hover:line-through transition-colors">License</Link>
                </div>
            </footer>

            {/* Dialogs */}
            <Dialog open={signInOpen} onOpenChange={(open: boolean) => {
                setSignInOpen(open);
                if (!open) {
                    setPhase('login');
                    setPendingToken(null);
                    setTotpCode("");
                }
            }}>
                <DialogContent className="sm:max-w-md bg-background border-[6px] md:border-[10px] border-black rounded-none shadow-[12px_12px_0px_0px_rgba(var(--primary-rgb),1)] p-6 md:p-10 gap-0">
                    <DialogHeader className="mb-6 md:mb-10">
                        <DialogTitle className="text-4xl md:text-5xl font-black uppercase leading-none tracking-tighter">
                            {phase === 'totp' ? 'Security Check' : 'Sync Access'}
                        </DialogTitle>
                        <DialogDescription className="text-lg font-bold uppercase italic mt-3 text-foreground/80">
                            {phase === 'totp' 
                                ? 'Enter the code from your authenticator app.' 
                                : 'Sign in with your 16-digit Sync ID.'}
                        </DialogDescription>
                    </DialogHeader>
                    {phase === 'login' ? (
                        <form onSubmit={handleWelcomeSignIn} className="space-y-6 md:space-y-8">
                            <div className="space-y-3 md:space-y-4">
                                <div className="text-xs md:text-sm font-black uppercase tracking-[0.2em] bg-black text-white inline-block px-3 py-1">
                                    Sync ID
                                </div>
                                <Input
                                    type="text"
                                    placeholder="0000-0000-0000-0000"
                                    value={syncId}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSyncId(formatAccountId(e.target.value))}
                                    className="h-14 md:h-20 font-mono text-xl md:text-3xl bg-white border-[4px] md:border-[6px] border-black rounded-none focus-visible:ring-0 text-black placeholder:text-black/20 font-black shadow-inner"
                                    maxLength={19}
                                    minLength={16}
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-12 md:h-14 mt-2 text-xs md:text-sm gap-2 border-[3px] md:border-[4px] border-black rounded-none font-black uppercase hover:bg-primary hover:text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                                    onClick={handleGenerateId}
                                >
                                    <Shuffle weight="bold" className="size-4 md:size-5" />
                                    <span>Generate New ID</span>
                                </Button>
                            </div>
                            <div className="flex justify-center bg-zinc-100 dark:bg-zinc-900 p-4 md:p-6 border-[4px] md:border-[6px] border-black shadow-inner">
                                <div
                                    ref={containerRef}
                                    className="min-h-[65px]"
                                />
                            </div>
                            {error && (
                                <div className="text-xs md:text-sm bg-red-500 text-white font-black p-4 uppercase border-[4px] border-black text-center animate-shake">
                                    {error}
                                </div>
                            )}
                            <Button 
                                type="submit" 
                                disabled={isLoading || !captchaToken} 
                                className="w-full h-16 md:h-24 bg-black text-white font-black text-xl md:text-3xl uppercase rounded-none border-[4px] md:border-[6px] border-black hover:bg-primary hover:text-primary-foreground disabled:opacity-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
                            >
                                {isLoading ? "Verifying..." : "Continue"}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleTotpVerify} className="space-y-6 md:space-y-8">
                            <div className="space-y-3 md:space-y-4">
                                <div className="text-xs md:text-sm font-black uppercase tracking-[0.2em] bg-black text-white inline-block px-3 py-1">
                                    6-Digit Code
                                </div>
                                <Input
                                    type="text"
                                    placeholder="000000"
                                    value={totpCode}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    className="h-16 md:h-24 font-mono text-center text-3xl md:text-5xl tracking-[0.3em] md:tracking-[0.5em] bg-white border-[4px] md:border-[6px] border-black rounded-none focus-visible:ring-0 text-black font-black shadow-inner"
                                    required
                                />
                            </div>
                            {error && (
                                <div className="text-xs md:text-sm bg-red-500 text-white font-black p-4 uppercase border-[4px] border-black text-center animate-shake">
                                    {error}
                                </div>
                            )}
                            <Button 
                                type="submit" 
                                disabled={isLoading} 
                                className="w-full h-16 md:h-24 bg-black text-white font-black text-xl md:text-3xl uppercase rounded-none border-[4px] md:border-[6px] border-black hover:bg-primary hover:text-primary-foreground disabled:opacity-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
                            >
                                {isLoading ? "Checking..." : "Verify"}
                            </Button>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
                <DialogContent className="sm:max-w-md bg-background border-[6px] md:border-[10px] border-black rounded-none shadow-[12px_12px_0px_0px_rgba(var(--primary-rgb),1)] p-6 md:p-10 gap-0">
                    <DialogHeader className="mb-6 md:mb-10">
                        <DialogTitle className="text-4xl md:text-5xl font-black uppercase leading-none tracking-tighter">New Project</DialogTitle>
                        <DialogDescription className="text-lg font-bold uppercase italic mt-3 text-foreground/80">
                            Enter a name for your new archive.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateProject} className="space-y-6 md:space-y-8">
                        <div className="space-y-3 md:space-y-4">
                            <div className="text-xs md:text-sm font-black uppercase tracking-[0.2em] bg-black text-white inline-block px-3 py-1">
                                Project Name
                            </div>
                            <Input
                                placeholder="E.g. My Creative Work"
                                value={newProjectName}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewProjectName(e.target.value)}
                                className="h-14 md:h-20 text-xl md:text-3xl bg-white border-[4px] md:border-[6px] border-black rounded-none focus-visible:ring-0 font-black text-black placeholder:text-black/20 shadow-inner"
                                autoFocus
                            />
                        </div>
                        <Button 
                            type="submit"
                            className="w-full h-16 md:h-24 bg-primary text-primary-foreground font-black text-xl md:text-3xl uppercase rounded-none border-[4px] md:border-[6px] border-black hover:bg-black hover:text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
                        >
                            Create Project
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
